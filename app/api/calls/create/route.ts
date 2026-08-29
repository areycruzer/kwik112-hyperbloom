/**
 * Call Creation API Route
 * Turns a finished EVI conversation (transcript + prosody frames) into a
 * triaged EmergencyCall for the dispatch board.
 */

import { NextRequest, NextResponse } from 'next/server';
import { EmergencyCall, Location } from '@/lib/types';
import {
  EmotionFrame,
  distressLevel,
  rankEmotions,
  recommendUnits,
  scoreOf,
  severityFromScore,
  priorityFromSeverity,
  triageTranscript,
} from '@/lib/triage';
import { logger } from '@/lib/logger';

interface IncomingSegment {
  text?: string;
  role?: string;
  speaker?: string;
  timestamp?: string;
  emotions?: EmotionFrame;
}

/** @description Accept transcript as an array of segments or a newline string. */
function normalizeTranscript(input: unknown): Array<{
  text: string;
  role: string;
  timestamp: string;
  segment_index: number;
  emotions?: EmotionFrame;
}> {
  const rows: IncomingSegment[] = Array.isArray(input)
    ? (input as IncomingSegment[])
    : typeof input === 'string'
    ? input.split('\n').map((text) => ({ text }))
    : [];

  return rows
    .map((segment, index) => ({
      text: typeof segment?.text === 'string' ? segment.text.trim() : '',
      role: segment?.role === 'assistant' || segment?.speaker === 'assistant' ? 'assistant' : 'user',
      timestamp: segment?.timestamp ?? new Date().toISOString(),
      segment_index: index,
      emotions: segment?.emotions,
    }))
    .filter((segment) => segment.text.length > 0);
}

/**
 * @description Resolve a location without inventing one. When we cannot place
 *              the address we return it unplotted rather than dropping a pin on
 *              a coordinate nobody reported.
 */
const KNOWN_PLACES: Array<[RegExp, { latitude: number; longitude: number; city: string }]> = [
  [/\bgreater noida\b/i, { latitude: 28.4744, longitude: 77.503, city: 'Greater Noida' }],
  [/\bnoida\b/i, { latitude: 28.5355, longitude: 77.391, city: 'Noida' }],
  [/\brohini\b/i, { latitude: 28.7196, longitude: 77.1186, city: 'New Delhi' }],
  [/\bconnaught place\b/i, { latitude: 28.6304, longitude: 77.2177, city: 'New Delhi' }],
  [/\bnehru place\b/i, { latitude: 28.5492, longitude: 77.253, city: 'New Delhi' }],
  [/\bpitampura\b/i, { latitude: 28.7049, longitude: 77.1324, city: 'New Delhi' }],
  [/\bgurgaon|gurugram\b/i, { latitude: 28.4595, longitude: 77.0266, city: 'Gurugram' }],
  [/\bmumbai\b/i, { latitude: 19.076, longitude: 72.8777, city: 'Mumbai' }],
  [/\bbengaluru|bangalore\b/i, { latitude: 12.9716, longitude: 77.5946, city: 'Bengaluru' }],
  [/\bkolkata\b/i, { latitude: 22.5726, longitude: 88.3639, city: 'Kolkata' }],
  [/\bchennai\b/i, { latitude: 13.0827, longitude: 80.2707, city: 'Chennai' }],
  [/\bhyderabad\b/i, { latitude: 17.385, longitude: 78.4867, city: 'Hyderabad' }],
  [/\bpune\b/i, { latitude: 18.5204, longitude: 73.8567, city: 'Pune' }],
  [/\bnew delhi|\bdelhi\b/i, { latitude: 28.6139, longitude: 77.209, city: 'New Delhi' }],
];

/**
 * @description Pull a recognisable place out of what the caller actually said.
 *              Without this, keyword-only triage produces a call with no
 *              coordinates, which never reaches the map.
 */
function placeFromTranscript(text: string): { phrase: string; place: (typeof KNOWN_PLACES)[number][1] } | null {
  for (const [pattern, place] of KNOWN_PLACES) {
    const match = text.match(pattern);
    if (match) return { phrase: match[0], place };
  }
  return null;
}

function resolveLocation(
  address: string | undefined,
  reported: { latitude?: number; longitude?: number } | undefined,
  modelConfidence: number,
  transcriptText = ''
): Location {
  const trimmed = address?.trim();

  // A coordinate the caller's device actually reported always wins.
  if (typeof reported?.latitude === 'number' && typeof reported?.longitude === 'number') {
    return {
      address: trimmed || 'Device-reported position',
      latitude: reported.latitude,
      longitude: reported.longitude,
      confidence: 0.95,
      source: 'gps',
    };
  }

  if (trimmed) {
    for (const [pattern, place] of KNOWN_PLACES) {
      if (pattern.test(trimmed)) {
        return {
          address: trimmed,
          city: place.city,
          latitude: place.latitude,
          longitude: place.longitude,
          // The pin is a district centroid, not the doorway. A model that says
          // it is 100% sure of the address is still only telling us the
          // district it recognised, so the displayed confidence is capped to
          // reflect what the coordinate actually represents.
          confidence: Math.min(Math.max(modelConfidence, 0.55), 0.75),
          accuracy_radius: 1200,
          source: 'caller',
        };
      }
    }
    // Named but not placeable: keep the words, refuse to invent a pin.
    return { address: trimmed, confidence: Math.min(modelConfidence, 0.3), source: 'caller' };
  }

  // No structured address, so fall back to a place name spoken in the call.
  const spoken = placeFromTranscript(transcriptText);
  if (spoken) {
    return {
      address: `Near ${spoken.phrase} (from caller audio)`,
      city: spoken.place.city,
      latitude: spoken.place.latitude,
      longitude: spoken.place.longitude,
      confidence: 0.45,
      source: 'caller',
    };
  }

  return { address: 'Location not yet established', confidence: 0, source: 'caller' };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      phoneNumber,
      transcript,
      emotions,
      chatGroupId,
      conversationId,
      callDurationSeconds,
      reportedLocation,
    } = body ?? {};

    if (!phoneNumber || typeof phoneNumber !== 'string') {
      return NextResponse.json({ error: 'phoneNumber is required' }, { status: 400 });
    }

    const segments = normalizeTranscript(transcript);
    const callerText = segments
      .filter((s) => s.role === 'user')
      .map((s) => s.text)
      .join(' ');
    const fullText = segments.map((s) => `${s.role.toUpperCase()}: ${s.text}`).join('\n');

    // Emotion frames may arrive standalone or attached to segments.
    const frames: EmotionFrame[] = [
      ...(Array.isArray(emotions) ? emotions : []),
      ...segments.map((s) => s.emotions).filter(Boolean),
    ].filter((f): f is EmotionFrame => Boolean(f) && typeof f === 'object');

    const ranked = rankEmotions(frames);
    const distress = distressLevel(ranked);

    const triage = await triageTranscript(callerText || fullText);
    const baseScore = scoreOf(triage);

    // Emotion evidence can nudge severity up, never down.
    const severityScore = Math.min(100, Math.round(Math.max(baseScore, baseScore + distress * 0.2)));
    const severity = severityFromScore(severityScore);
    const top = ranked[0];

    const location = resolveLocation(
      triage.extraction.location?.address,
      reportedLocation,
      triage.extraction.location?.confidence ?? 0,
      callerText || fullText
    );

    const callId =
      typeof conversationId === 'string' && conversationId
        ? conversationId
        : `call_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

    const now = new Date().toISOString();

    const call: EmergencyCall = {
      id: callId,
      caller_number: phoneNumber,
      status: 'active',
      call_status: 'completed',
      language: 'English',
      call_duration: typeof callDurationSeconds === 'number' ? callDurationSeconds : undefined,

      caller_location: location,
      location_confidence: location.confidence,

      incident_type: triage.extraction.incident_type,
      incident_subtype: triage.extraction.incident_subtype,
      chief_complaint: triage.extraction.summary,
      severity,
      severity_score: severityScore,

      top_emotion: top?.emotion,
      emotion_intensity: top?.intensity,
      caller_condition: triage.extraction.caller_condition,
      emotion_data: frames,

      ai_summary: triage.extraction.summary,
      ai_confidence: triage.extraction.confidence_score,
      ai_triage: {
        severity,
        confidence: triage.extraction.confidence_score,
        summary: triage.extraction.summary,
        incident_type: triage.extraction.incident_type,
        priority_code: priorityFromSeverity(severity),
        persons_involved: triage.extraction.persons_involved.count,
        flags: triage.flags,
        emotion_analysis: {
          top_emotions: ranked.slice(0, 8),
          distress_level: distress,
        },
      },
      persons_involved: triage.extraction.persons_involved.count,
      immediate_threats: triage.extraction.immediate_threats,

      labels: triage.labels,
      flags: triage.flags,
      recommended_units: recommendUnits(triage.extraction.incident_type, severity),
      special_instructions: triage.extraction.recommended_questions.join(' '),

      transcript: segments,
      priority_code: priorityFromSeverity(severity),

      created_at: now,
      updated_at: now,
    };

    logger.info('Emergency call triaged', {
      id: callId,
      severity,
      severityScore,
      distress,
      method: triage.method,
      chatGroupId,
      segments: segments.length,
      emotionFrames: frames.length,
    });

    return NextResponse.json({
      success: true,
      call,
      triage_method: triage.method,
      missing_info: triage.extraction.missing_critical_info,
      recommended_questions: triage.extraction.recommended_questions,
    });
  } catch (error) {
    logger.error('Call creation failed', {
      error: error instanceof Error ? error.message : error,
    });
    return NextResponse.json({ error: 'Failed to create call' }, { status: 500 });
  }
}
