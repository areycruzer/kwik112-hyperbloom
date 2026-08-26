/**
 * Call Creation API Route
 * Creates a new emergency call with AI triage and emotion analysis
 */

import { NextRequest, NextResponse } from 'next/server';
import { EmergencyCall } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phoneNumber, transcript, emotions, conversationId } = body;

    if (!phoneNumber) {
      return NextResponse.json(
        { error: 'Phone number is required' },
        { status: 400 }
      );
    }

    // Generate unique call ID
    const callId = conversationId || `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Step 1: Run AI triage on transcript (if provided)
    let triageData = null;
    if (transcript && transcript.length > 0) {
      try {
        const sanitizedTranscript = Array.isArray(transcript)
          ? transcript
              .map((segment) =>
                typeof segment?.text === 'string' ? segment.text.trim() : ''
              )
              .filter((text) => text.length > 0)
          : typeof transcript === 'string'
          ? transcript.split('\n').map((line) => line.trim()).filter(Boolean)
          : [];

        const fullTranscript = sanitizedTranscript.join(' ');

        const triageResponse = await fetch(`${request.nextUrl.origin}/api/triage/extract`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ transcript: fullTranscript }),
        });
        
        if (triageResponse.ok) {
          triageData = await triageResponse.json();
          console.log('✅ AI triage completed:', {
            incident: triageData.extraction?.incident_type,
            severity: triageData.extraction?.severity_score
          });
        }
      } catch (error) {
        console.warn('AI triage failed:', error);
      }
    }

    // Step 2: Process emotion data from Hume
    const topEmotion = emotions && emotions.length > 0 
      ? emotions.reduce((prev: any, current: any) => 
          (current.intensity > prev.intensity) ? current : prev
        )
      : null;

    const avgEmotionIntensity = emotions && emotions.length > 0
      ? emotions.reduce((sum: number, e: any) => sum + e.intensity, 0) / emotions.length
      : 0.5;

    // Step 3: Calculate severity based on emotions + AI triage
    let severityScore = triageData?.extraction?.severity_score || 50;
    
    // Boost severity based on distress emotions
    if (topEmotion) {
      const emotionBoost = {
        'fear': 20,
        'distress': 20,
        'panic': 25,
        'anxiety': 15,
        'anger': 15,
        'sadness': 10,
      };
      severityScore += (emotionBoost[topEmotion.emotion as keyof typeof emotionBoost] || 0) * topEmotion.intensity;
    }

    severityScore = Math.min(Math.max(severityScore, 0), 100);

    const severity = severityScore >= 80 ? 'critical' :
                    severityScore >= 60 ? 'high' :
                    severityScore >= 40 ? 'medium' : 'low';

    // Step 4: Create the emergency call object
      const newCall: EmergencyCall = {
        id: callId,
        caller_number: phoneNumber,
        status: 'active',
        call_status: 'in-progress',
      
      // Location: Use IP-based geolocation or browser location in production
      caller_location: buildCallerLocation(triageData?.extraction?.location),
      
      // Incident data from AI triage
      incident_type: triageData?.extraction?.incident_type || 'emergency',
      incident_subtype: triageData?.extraction?.incident_subtype || 'Unknown',
      severity,
      severity_score: severityScore,
      
      // Emotion data from Hume
      top_emotion: topEmotion?.emotion || 'distress',
      emotion_intensity: topEmotion?.intensity || avgEmotionIntensity,
      caller_condition: severityScore >= 70 ? 'panicked' :
                       severityScore >= 50 ? 'distressed' :
                       severityScore >= 30 ? 'unclear' : 'calm',
      emotion_data: emotions || [],
      
      // AI triage results
      ai_summary: triageData?.extraction?.summary || 'Emergency call received. Awaiting detailed analysis.',
      ai_confidence: triageData?.extraction?.confidence_score || 0.70,
      persons_involved: triageData?.extraction?.persons_involved || 1,
      immediate_threats: triageData?.extraction?.immediate_threats || [],
      
      // Transcript
      transcript: Array.isArray(transcript)
        ? transcript
            .map((segment: any, index: number) => ({
              text: typeof segment?.text === 'string' ? segment.text.trim() : '',
              role: segment?.role || segment?.speaker || 'user',
              timestamp: segment?.timestamp || new Date().toISOString(),
              segment_index: index,
            }))
            .filter((segment) => segment.text.length > 0)
        : typeof transcript === 'string'
        ? transcript
            .split('\n')
            .map((line, index) => ({
              text: line.trim(),
              role: 'user',
              timestamp: new Date().toISOString(),
              segment_index: index,
            }))
            .filter((segment) => segment.text.length > 0)
        : [],
      
      // Timestamps
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      
      // AI recommendation
      ai_recommendation: triageData?.extraction?.recommendations?.join('. ') || 
                        'Dispatch appropriate emergency services immediately.',
    };

    console.log('✅ Emergency call created:', {
      id: callId,
      severity,
      severityScore,
      emotion: topEmotion?.emotion,
      incident: newCall.incident_type
    });

    // In production, this would save to Supabase
    // For now, we return the call data and handle it client-side
    
    return NextResponse.json({
      success: true,
      call: newCall,
      message: 'Emergency call created successfully',
    });

  } catch (error) {
    console.error('Call creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create call' },
      { status: 500 }
    );
  }
}

function buildCallerLocation(locationText?: string) {
  if (typeof locationText === 'string' && locationText.trim().length > 0) {
    const normalized = locationText.trim();

    if (/india|delhi|noida|uttar pradesh/gi.test(normalized)) {
      const latLon = lookupIndianCoordinates(normalized);
      return {
        address: normalized,
        latitude: latLon.latitude,
        longitude: latLon.longitude,
        confidence: 0.85,
      };
    }

    return {
      address: normalized,
      latitude: 37.7749,
      longitude: -122.4194,
      confidence: 0.4,
    };
  }

  return {
    address: 'Location pending verification',
    latitude: 28.6139,
    longitude: 77.209,
    confidence: 0.25,
  };
}

function lookupIndianCoordinates(query: string) {
  const lookupTable: Record<string, { latitude: number; longitude: number }> = {
    noida: { latitude: 28.5355, longitude: 77.391 },
    'greater noida': { latitude: 28.4744, longitude: 77.503 },
    'uttar pradesh': { latitude: 26.8467, longitude: 80.9462 },
    delhi: { latitude: 28.6139, longitude: 77.209 },
    'new delhi': { latitude: 28.6139, longitude: 77.209 },
    'rohini sector 16': { latitude: 28.7196, longitude: 77.1186 },
  };

  const normalizedQuery = query.toLowerCase();
  for (const key of Object.keys(lookupTable)) {
    if (normalizedQuery.includes(key)) {
      return lookupTable[key];
    }
  }

  return { latitude: 28.6139, longitude: 77.209 };
}


