/**
 * Hume AI Chat Events API Route
 * Fetches conversation history and emotion data from Hume AI
 * 
 * @see https://dev.hume.ai/docs/empathic-voice-interface-evi/api-reference#get-chat-events
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  let chatGroupId: string | null = null;
  let configId: string | null = null;

  try {
    const { searchParams } = new URL(request.url);
    chatGroupId = searchParams.get('chat_group_id');
    configId = searchParams.get('config_id');

    if (!chatGroupId) {
      return NextResponse.json(
        { error: 'chat_group_id is required' },
        { status: 400 }
      );
    }

    const humeApiKey = process.env.HUME_API_KEY;

    if (!humeApiKey) {
      logger.warn('HUME_API_KEY not configured, returning mock data', { chatGroupId });
      return NextResponse.json({
        chat_group_id: chatGroupId,
        events: [],
        message: 'Mock data - configure HUME_API_KEY for real data'
      });
    }

    const eventsUrl = new URL(
      `https://api.hume.ai/v0/evi/chat_groups/${encodeURIComponent(chatGroupId)}/events`
    );

    logger.info('Fetching Hume chat events from new endpoint', {
      chatGroupId,
      url: eventsUrl.toString(),
    });

    const response = await fetch(eventsUrl.toString(), {
      headers: {
        'X-Hume-Api-Key': humeApiKey,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();

      if (response.status === 404) {
        logger.warn('Hume chat events endpoint returned 404', {
          chatGroupId,
          configId,
          error: errorText,
        });
        return NextResponse.json(
          {
            success: false,
            error: 'Chat events not found',
            details: errorText,
            chat_group_id: chatGroupId,
          },
          { status: 404 }
        );
      }

      logger.error('Hume API error fetching chat events', {
        status: response.status,
        chatGroupId,
        configId,
        error: errorText,
      });

      return NextResponse.json(
        {
          error: `Hume API error: ${response.status}`,
          details: errorText,
          chat_group_id: chatGroupId,
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    const events = data.events_page ?? data.events ?? [];

    logger.info('Hume chat events retrieved', {
      chatGroupId,
      eventCount: events.length,
    });

    // Transform Hume events into structured conversation data
    const transcript: Array<{
      role: 'user' | 'assistant';
      text: string;
      timestamp: string;
      emotions?: any;
      topEmotion?: string;
      emotionIntensity?: number;
    }> = [];

    const allEmotions: Array<any> = [];

    // Parse Hume events
    if (Array.isArray(events)) {
      events.forEach((event: any) => {
        const normalizedText = getEventText(event);

        if (event.type === 'USER_MESSAGE' || event.role === 'user') {
          transcript.push({
            role: 'user',
            text: normalizedText,
            timestamp: event.timestamp || new Date().toISOString(),
            emotions: event.models?.prosody?.scores || event.emotions,
            topEmotion: getTopEmotion(event.models?.prosody?.scores || event.emotions),
            emotionIntensity: getTopEmotionIntensity(event.models?.prosody?.scores || event.emotions),
          });

          if (event.models?.prosody?.scores || event.emotions) {
            allEmotions.push(event.models?.prosody?.scores || event.emotions);
          }
        }

        if (event.type === 'AGENT_MESSAGE' || event.role === 'assistant') {
          transcript.push({
            role: 'assistant',
            text: normalizedText,
            timestamp: event.timestamp || new Date().toISOString(),
          });
        }
      });
    }

    // Calculate emotion statistics
    const emotionStats = calculateEmotionStats(allEmotions);

    return NextResponse.json({
      success: true,
      chat_group_id: chatGroupId,
      config_id: configId,
      transcript,
      emotions: allEmotions,
      emotion_stats: emotionStats,
      event_count: events.length,
      raw_data: data,
    });

  } catch (error) {
    logger.error('Error fetching Hume chat events', {
      chatGroupId,
      configId,
      error: error instanceof Error ? error.message : error,
    });
    return NextResponse.json(
      { 
        error: 'Failed to fetch chat events',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * @description Normalize Hume event structures to extract spoken text safely.
 */
function getEventText(event: any): string {
  const rawText =
    event.transcript_line ||
    event.message_text ||
    event.text ||
    (event.message?.content ?? '') ||
    (Array.isArray(event.message?.segments)
      ? event.message.segments.map((segment: any) => segment?.text ?? '').join(' ')
      : '');

  return typeof rawText === 'string' ? rawText.trim() : '';
}

/**
 * Get the top emotion from Hume emotion scores
 */
function getTopEmotion(emotions: any): string | undefined {
  if (!emotions || typeof emotions !== 'object') return undefined;

  const entries = Object.entries(emotions as Record<string, number>);
  if (entries.length === 0) return undefined;

  const topEmotion = entries.reduce((prev, current) => 
    current[1] > prev[1] ? current : prev
  );

  return topEmotion[0];
}

/**
 * Get the intensity of the top emotion
 */
function getTopEmotionIntensity(emotions: any): number | undefined {
  if (!emotions || typeof emotions !== 'object') return undefined;

  const entries = Object.entries(emotions as Record<string, number>);
  if (entries.length === 0) return undefined;

  const topEmotion = entries.reduce((prev, current) => 
    current[1] > prev[1] ? current : prev
  );

  return topEmotion[1];
}

/**
 * Calculate emotion statistics across all emotions in conversation
 */
function calculateEmotionStats(allEmotions: any[]) {
  if (allEmotions.length === 0) {
    return {
      top_emotions: [],
      average_intensity: 0,
      distress_level: 0,
    };
  }

  // Aggregate all emotion scores
  const emotionTotals: Record<string, number> = {};
  const emotionCounts: Record<string, number> = {};

  allEmotions.forEach((emotionFrame) => {
    if (!emotionFrame || typeof emotionFrame !== 'object') return;

    Object.entries(emotionFrame).forEach(([emotion, score]) => {
      if (typeof score !== 'number') return;
      
      if (!emotionTotals[emotion]) {
        emotionTotals[emotion] = 0;
        emotionCounts[emotion] = 0;
      }
      emotionTotals[emotion] += score;
      emotionCounts[emotion]++;
    });
  });

  // Calculate averages and sort
  const topEmotions = Object.entries(emotionTotals)
    .map(([emotion, total]) => ({
      emotion,
      intensity: total / emotionCounts[emotion],
    }))
    .sort((a, b) => b.intensity - a.intensity)
    .slice(0, 10);

  // Calculate distress level based on high-stress emotions
  let distressLevel = 0;
  const stressEmotions = ['anxiety', 'fear', 'distress', 'panic', 'anger', 'sadness'];
  
  topEmotions.forEach(({ emotion, intensity }) => {
    if (stressEmotions.includes(emotion.toLowerCase())) {
      distressLevel += intensity * 20; // Weight stress emotions heavily
    }
  });

  distressLevel = Math.min(distressLevel, 100);

  return {
    top_emotions: topEmotions,
    average_intensity: topEmotions.length > 0 
      ? topEmotions.reduce((sum, e) => sum + e.intensity, 0) / topEmotions.length 
      : 0,
    distress_level: distressLevel,
  };
}

