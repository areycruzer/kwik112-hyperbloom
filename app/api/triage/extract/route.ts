/**
 * AI Triage Extraction API Route
 * Extracts structured information from emergency call transcript using OpenAI GPT-4
 */

import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { AIExtraction } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { transcript, callId } = body;

    if (!transcript) {
      return NextResponse.json(
        { error: 'Transcript is required' },
        { status: 400 }
      );
    }

    // Check if OpenAI API key is configured
    const openaiApiKey = process.env.OPENAI_API_KEY;

    if (!openaiApiKey) {
      console.warn('OpenAI API key not configured, returning mock extraction');
      return returnMockExtraction(transcript);
    }

    // Initialize OpenAI client
    const openai = new OpenAI({ apiKey: openaiApiKey });

    // Create extraction prompt
    const prompt = createExtractionPrompt(transcript);

    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: 'You are an emergency dispatch AI system analyzing 112 call transcripts. Extract structured information to help dispatchers respond quickly. Always respond with valid JSON only.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.1,
        max_tokens: 1500,
        response_format: { type: 'json_object' },
      });

      const extractedData: AIExtraction = JSON.parse(
        completion.choices[0].message.content || '{}'
      );

      return NextResponse.json({
        success: true,
        extraction: extractedData,
        model: 'gpt-4-turbo-preview',
        tokens_used: completion.usage?.total_tokens || 0,
      });
    } catch (apiError) {
      console.error('OpenAI API call failed:', apiError);
      // Fallback to mock data
      return returnMockExtraction(transcript);
    }
  } catch (error) {
    console.error('Extraction error:', error);
    return NextResponse.json(
      { error: 'Failed to extract information' },
      { status: 500 }
    );
  }
}

/**
 * Create extraction prompt for OpenAI
 */
function createExtractionPrompt(transcript: string): string {
  return `You are an emergency dispatch AI system analyzing 911 call transcripts. Extract structured information to help dispatchers respond quickly.

## TRANSCRIPT:
${transcript}

## EXTRACTION TASKS:
Analyze the above transcript and extract the following in strict JSON format:

{
  "incident_type": "fire" | "medical_emergency" | "accident" | "crime" | "public_safety" | "other",
  "incident_subtype": "string (e.g., 'house fire', 'cardiac arrest', 'car accident', 'burglary')",
  "severity": "critical" | "high" | "medium" | "low",
  "location": {
    "address": "string (full street address if mentioned)",
    "cross_streets": ["string", "string"],
    "landmarks": ["string"],
    "city": "string",
    "state": "string",
    "zip_code": "string",
    "confidence": 0.0 to 1.0
  },
  "persons_involved": {
    "count": number,
    "injuries": boolean,
    "descriptions": ["string"]
  },
  "immediate_threats": ["string"],
  "time_sensitive_factors": ["string"],
  "vehicles_involved": ["string"],
  "weapons_mentioned": ["string"],
  "caller_condition": "calm" | "distressed" | "injured" | "panicked" | "unclear",
  "summary": "string (1-2 sentence summary for dispatcher)",
  "confidence_score": 0.0 to 1.0,
  "missing_critical_info": ["string"],
  "recommended_questions": ["string"]
}

## SEVERITY CLASSIFICATION RULES:
- CRITICAL: Life-threatening situation, active crime in progress, fire with trapped people, cardiac arrest, severe trauma, active shooter
- HIGH: Serious injury, fire without trapped people, assault, significant accident, medical emergency requiring ambulance
- MEDIUM: Minor injury, property crime, non-emergency fire, minor accident, welfare check
- LOW: Noise complaint, parking issue, information request, non-urgent assistance

Return ONLY the JSON object, no additional text.`;
}

/**
 * Return mock extraction for demo purposes
 */
function returnMockExtraction(transcript: string) {
  // Simple keyword-based mock extraction
  const lowerTranscript = transcript.toLowerCase();

  let incident_type: AIExtraction['incident_type'] = 'other';
  let severity: AIExtraction['severity'] = 'medium';
  let incident_subtype = 'emergency';

  if (lowerTranscript.includes('fire') || lowerTranscript.includes('burning')) {
    incident_type = 'fire';
    incident_subtype = 'house fire';
    severity = 'critical';
  } else if (
    lowerTranscript.includes('accident') ||
    lowerTranscript.includes('crash') ||
    lowerTranscript.includes('collision')
  ) {
    incident_type = 'accident';
    incident_subtype = 'car accident';
    severity = 'high';
  } else if (
    lowerTranscript.includes('medical') ||
    lowerTranscript.includes('heart') ||
    lowerTranscript.includes('injury')
  ) {
    incident_type = 'medical_emergency';
    incident_subtype = 'medical emergency';
    severity = 'high';
  } else if (
    lowerTranscript.includes('theft') ||
    lowerTranscript.includes('robbery') ||
    lowerTranscript.includes('burglary')
  ) {
    incident_type = 'crime';
    incident_subtype = 'theft';
    severity = 'medium';
  }

  const mockExtraction: AIExtraction = {
    incident_type,
    incident_subtype,
    severity,
    location: {
      address: 'Address extracted from transcript',
      city: 'San Francisco',
      state: 'CA',
      confidence: 0.85,
    },
    persons_involved: {
      count: 1,
      injuries: severity === 'critical' || severity === 'high',
      descriptions: [],
    },
    immediate_threats: severity === 'critical' ? ['active emergency'] : [],
    time_sensitive_factors: [],
    vehicles_involved: [],
    weapons_mentioned: [],
    caller_condition: severity === 'critical' ? 'panicked' : 'distressed',
    summary: `${incident_subtype} reported. ${severity} severity situation requiring immediate attention.`,
    confidence_score: 0.75,
    missing_critical_info: [],
    recommended_questions: ['Can you confirm the exact address?'],
  };

  return NextResponse.json({
    success: true,
    extraction: mockExtraction,
    model: 'mock_extraction',
    note: 'Using mock extraction - add OPENAI_API_KEY to environment variables for real AI analysis',
  });
}


