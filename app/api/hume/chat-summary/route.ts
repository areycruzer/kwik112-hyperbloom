/**
 * @fileoverview API route for fetching recent Hume EVI chat metadata plus the latest transcript.
 * @description Mirrors the behaviour of the local `test-hume-config.js` helper by retrieving:
 *              1. The voice configuration details
 *              2. A paginated list of recent chat groups
 *              3. The full event log for the most recent chat group
 *
 *              The response is consumed by the emergency call modal to allow operators to
 *              review the latest transcript and emotion scores immediately after a call ends.
 */

import { NextRequest, NextResponse } from 'next/server';

/**
 * Fetch a resource from the Hume API with automatic header injection.
 * @param url Absolute URL for the Hume API endpoint.
 */
async function fetchFromHume(url: string) {
  const apiKey = process.env.HUME_API_KEY;

  if (!apiKey) {
    throw new Error('HUME_API_KEY is not configured in the environment');
  }

  const response = await fetch(url, {
    headers: {
      'X-Hume-Api-Key': apiKey,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Hume API error ${response.status}: ${errorBody}`);
  }

  return response.json();
}

/**
 * @description Extracts readable transcript text from heterogeneous Hume event payloads.
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
 * @returns Aggregated Hume chat data (config, chat groups, latest events).
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const configId =
      searchParams.get('config_id') ?? process.env.NEXT_PUBLIC_HUME_CONFIG_ID;

    if (!configId) {
      return NextResponse.json(
        { error: 'Missing Hume config id. Provide config_id query param or NEXT_PUBLIC_HUME_CONFIG_ID.' },
        { status: 400 },
      );
    }

    // Step 1: Retrieve configuration metadata for operator debugging insight.
    const configUrl = `https://api.hume.ai/v0/evi/configs/${configId}`;
    const configData = await fetchFromHume(configUrl).catch((error: Error) => {
      console.error('❌ Failed to fetch Hume config:', error);
      return null;
    });

    // Step 2: Retrieve recent chat groups tied to this configuration.
    const chatsUrl = `https://api.hume.ai/v0/evi/chat_groups?config_id=${encodeURIComponent(
      configId,
    )}&page_size=25`;
    const chatsData = await fetchFromHume(chatsUrl);
    const chatGroups: Array<any> = chatsData.chat_groups_page ?? [];

    // Allow caller to pin a specific chat group id, otherwise pick the freshest by timestamp.
    const requestedChatGroupId = searchParams.get('chat_group_id');
    let latestChat = chatGroups.find((group) => group.id === requestedChatGroupId) ?? null;

    if (!latestChat) {
      latestChat =
        chatGroups
          .filter((group) => typeof group?.most_recent_start_timestamp === 'number')
          .sort(
            (a, b) =>
              (b?.most_recent_start_timestamp ?? 0) - (a?.most_recent_start_timestamp ?? 0),
          )[0] ?? chatGroups[0] ?? null;
    }

    // Step 3: Retrieve full event stream for the most recent chat group (if any).
    let latestEvents: Array<any> = [];
    if (latestChat?.id) {
      const eventsUrl = `https://api.hume.ai/v0/evi/chat_groups/${latestChat.id}/events`;
      const eventsData = await fetchFromHume(eventsUrl);
      const rawEvents = eventsData.events_page ?? eventsData.events ?? [];

      latestEvents = rawEvents.map((event: any) => {
        const text = getEventText(event);

        if (text.length === 0) {
          return event;
        }

        return {
          ...event,
          text,
          message_text: text,
          transcript_line: text,
        };
      });
    }

    return NextResponse.json({
      success: true,
      configId,
      config: configData,
      chatGroups,
      latestChat,
      latestEvents,
      fetchedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ Error in /api/hume/chat-summary:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


