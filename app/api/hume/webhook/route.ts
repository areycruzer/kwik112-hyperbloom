/**
 * Hume EVI Webhook API Route
 * Receives conversation events from Hume EVI
 */

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, conversationId, callId } = body;

    console.log('Hume webhook received:', { type, conversationId, callId });

    // Handle different event types
    switch (type) {
      case 'evi:conversation:started':
        // Store conversation start in database
        console.log('Conversation started:', conversationId);
        break;

      case 'evi:message:user':
        // Store user message with emotions
        console.log('User message:', body.text, 'Emotions:', body.emotions);
        break;

      case 'evi:emotion:update':
        // Store real-time emotion update
        console.log('Emotion update:', body.topEmotion, body.intensity);
        break;

      case 'evi:conversation:ended':
        // Trigger AI triage pipeline
        console.log('Conversation ended. Triggering AI triage...');
        // TODO: Call AI extraction API with full transcript
        break;

      default:
        console.log('Unknown event type:', type);
    }

    return NextResponse.json({
      success: true,
      message: 'Webhook processed',
    });
  } catch (error) {
    console.error('Hume webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}


