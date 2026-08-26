/**
 * Deepgram Real-time Transcription API Route
 * Provides WebSocket endpoint for real-time speech-to-text transcription
 */

import { NextRequest, NextResponse } from 'next/server';

/**
 * Initialize Deepgram WebSocket connection
 * This endpoint returns connection details for client-side WebSocket
 */
export async function POST(request: NextRequest) {
  try {
    const { language = 'en-US', model = 'nova-2' } = await request.json();

    // Validate Deepgram API key
    const apiKey = process.env.DEEPGRAM_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json({
        error: 'Deepgram API key not configured',
        fallback: 'web-speech-api',
        message: 'Using browser Web Speech API as fallback'
      }, { status: 200 });
    }

    // Return connection details for client-side WebSocket
    // Client will connect directly to Deepgram WebSocket API
    return NextResponse.json({
      success: true,
      wsUrl: `wss://api.deepgram.com/v1/listen?model=${model}&language=${language}&smart_format=true&interim_results=true`,
      apiKey: apiKey,
      config: {
        model,
        language,
        smart_format: true,
        interim_results: true,
        punctuate: true,
        utterance_end_ms: 1000,
      }
    });

  } catch (error) {
    console.error('Deepgram initialization error:', error);
    return NextResponse.json(
      { error: 'Failed to initialize Deepgram', fallback: 'web-speech-api' },
      { status: 500 }
    );
  }
}

/**
 * Transcribe audio file (for post-call analysis)
 */
export async function PUT(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;

    if (!audioFile) {
      return NextResponse.json(
        { error: 'No audio file provided' },
        { status: 400 }
      );
    }

    const apiKey = process.env.DEEPGRAM_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json({
        error: 'Deepgram API key not configured',
        transcript: '[Transcription unavailable - configure Deepgram API key]'
      }, { status: 200 });
    }

    // Convert File to Buffer
    const arrayBuffer = await audioFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Call Deepgram API for transcription
    const response = await fetch('https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${apiKey}`,
        'Content-Type': audioFile.type || 'audio/wav',
      },
      body: buffer,
    });

    if (!response.ok) {
      throw new Error(`Deepgram API error: ${response.statusText}`);
    }

    const data = await response.json();
    
    return NextResponse.json({
      success: true,
      transcript: data.results.channels[0].alternatives[0].transcript,
      confidence: data.results.channels[0].alternatives[0].confidence,
      words: data.results.channels[0].alternatives[0].words,
      metadata: {
        duration: data.metadata.duration,
        model: 'nova-2'
      }
    });

  } catch (error) {
    console.error('Deepgram transcription error:', error);
    return NextResponse.json(
      { error: 'Failed to transcribe audio' },
      { status: 500 }
    );
  }
}

