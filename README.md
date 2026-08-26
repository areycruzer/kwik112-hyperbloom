<p align="center">
  <img src="./app/favicon.ico" alt="Pulse112 Icon" width="96" />
</p>

# Pulse112 - Emergency Response Platform


**Demo Pitch Deck:** [Pulse112 Canva Presentation](https://www.canva.com/design/DAG4Lk5u0ks/47McT_9zrhAOyyPDFTwzRw/edit)  
**Product Demo Video:** [YouTube Walkthrough](https://youtu.be/dfOUkR4HiP4)

**AI-Powered Emergency Dispatch System** combining real-time voice triage, emotion detection, and carrier-grade location services.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Next.js](https://img.shields.io/badge/Next.js-14-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)
![Status](https://img.shields.io/badge/status-production--ready-green)

---

## 📖 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Screenshots](#-screenshots)
- [Architecture](#-architecture)
- [Tech Stack](#-tech-stack)
- [Quick Start](#-quick-start)
- [Database Schema](#-database-schema)
- [API Integrations](#-api-integrations)
- [Extracting Hume Conversation Data](#-extracting-hume-conversation-data)
- [Free Transcript Options](#-free-transcript-options)
- [Project Structure](#-project-structure)
- [Environment Variables](#-environment-variables)
- [Development](#-development)
- [Deployment](#-deployment)
- [Future Improvements](#-future-improvements)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🎯 Overview

Pulse112 is a next-generation emergency dispatch platform that leverages AI to improve emergency response times and accuracy. By combining voice emotion detection, AI-powered triage, and precise cellular network location data, Pulse112 helps dispatchers make faster, more informed decisions.

### Key Differentiators

- **🎭 Emotion-Aware Triage**: Detects caller stress, fear, and urgency in real-time using Hume AI
- **📍 Intelligent Location**: IP-based geolocation with browser location API support
- **🧠 AI-Powered Analysis**: GPT-4 extracts incident details, severity, and recommendations
- **🗺️ Visual Intelligence**: Interactive map shows all emergencies with caller locations
- **⚡ Real-Time Processing**: Instant call creation, triage, and dispatcher updates

---

## ✨ Features

### Core Features

- ✅ **Real-Time Voice Interface**: Integrated voice transcription with Deepgram or Web Speech API
- ✅ **Emotion Detection**: Hume AI WebSocket for real-time emotion tracking
- ✅ **AI Triage Engine**: GPT-4 extracts incident type, severity, location, and entities
- ✅ **Multiple Transcription Options**: Deepgram (free tier), AssemblyAI, or Web Speech API
- ✅ **Interactive Map**: Leaflet.js visualization with severity-coded markers
- ✅ **Call Queue Management**: Filter, sort, and manage emergency calls
- ✅ **Call Detail View**: Comprehensive call information with transcript and AI analysis
- ✅ **Status Workflow**: Pending → Approved → Dispatched → Resolved
- ✅ **Mock Data Mode**: Demo-ready with 11 realistic emergency scenarios

### Dashboard Features

- 📊 Active call count and severity indicators
- 🔍 Search and filter by status, incident type, severity
- 📍 Real-time map updates with caller locations
- 🎙️ Integrated voice call interface
- 📝 Full transcript and emotion timeline
- 🤖 AI recommendations for each call

---

## 📸 Screenshots

| Home Dashboard | Live Call Modal | Data Management Heatmap |
| --- | --- | --- |
| ![Dashboard overview](./public/screenshots/HomePage.png) | ![Emergency call workflow](./public/screenshots/EmergencyCall.png) | ![Data management heatmap](./public/screenshots/HeatMap.png) |

Each capture reflects the New Delhi–focused deployment:

- **Dashboard Overview** – Real-time incident list, AI summary panel, and Leaflet map centered on Rohini, Delhi.
- **Emergency Call Modal** – Emotion-aware triage with transcript, recommendations, and inline street-view mini map.
- **Data Management Heatmap** – Analytics overlay showing simulated incident intensity across Delhi sectors with morning/night data toggles.

---

## 🏗️ Architecture

### System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (Next.js)                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │  Dashboard   │  │  Call View   │  │  Emergency   │         │
│  │     Page     │  │     Page     │  │  Call Modal  │         │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘         │
│         │                  │                  │                 │
│         └──────────────────┼──────────────────┘                 │
│                            │                                    │
└────────────────────────────┼────────────────────────────────────┘
                             │
                ┌────────────┼──────────────┐
                │            │              │
        ┌───────▼──────┐ ┌──▼─────┐ ┌─────▼────────┐
        │  Deepgram    │ │ OpenAI │ │   Hume AI    │
        │ Transcribe   │ │ Triage │ │  WebSocket   │
        └──────────────┘ └────────┘ └──────────────┘
                             │
                    ┌────────▼────────┐
                    │   Supabase DB   │
                    │   (Optional)    │
                    └─────────────────┘
```

### Data Flow

1. **Call Initiation**: User clicks "Start Emergency Call" → Voice interface modal opens
2. **Voice Transcription**: Deepgram/Web Speech API converts speech to text in real-time
3. **Emotion Detection**: Hume AI WebSocket analyzes audio → tracks emotions (fear, distress, calm)
4. **AI Triage**: GPT-4 analyzes transcript → extracts entities, incident type, severity
5. **Severity Calculation**: Combines AI triage + emotion intensity → calculates priority score
6. **Call Creation**: Combined data creates `EmergencyCall` object → saved to localStorage/Supabase
7. **Dashboard Update**: New call appears in queue → dispatcher can view, approve, dispatch
8. **Map Visualization**: Call location displayed on interactive map with severity-coded marker

---

## 🛠️ Tech Stack

### Frontend
- **Framework**: Next.js 14.2 (App Router, React Server Components)
- **Language**: TypeScript 5.x
- **Styling**: Tailwind CSS 3.4
- **UI Components**: Shadcn/ui (Radix UI primitives)
- **Maps**: Leaflet.js 1.9 with React-Leaflet
- **Icons**: Lucide React

### Backend & APIs
- **AI Triage**: OpenAI GPT-4 Turbo (gpt-4-turbo-preview)
- **Voice & Emotion**: Hume AI EVI WebSocket (Empathic Voice Interface)
- **Transcription**: Deepgram API (free tier: 45hrs/month) or Web Speech API (free)
- **Database**: Supabase (PostgreSQL) or localStorage for demo

### Development
- **Package Manager**: npm
- **Linting**: ESLint
- **Type Checking**: TypeScript strict mode
- **Deployment**: Vercel (recommended)

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18.0 or higher
- **npm** 9.0 or higher
- **Git** (for cloning)
- **API Keys** (optional, works with mock data):
  - OpenAI API key (for AI triage)
  - Hume AI credentials (for emotion detection)
  - Deepgram API key (for transcription, or use free Web Speech API)

### Installation

1. **Clone the repository**:

```bash
git clone https://github.com/sudhansu-24/112-Emergency
cd 112-Emergency
```

2. **Install dependencies**:

```bash
npm install
```

3. **Set up environment variables**:

Create a `.env.local` file in the project root:

```bash
# OpenAI GPT-4 (Optional - uses mock AI if not provided)
OPENAI_API_KEY=sk-your_openai_key_here

# Hume AI EVI (Optional - for emotion detection)
NEXT_PUBLIC_HUME_CONFIG_ID=your_hume_config_id
HUME_API_KEY=your_hume_api_key
HUME_SECRET_KEY=your_hume_secret_key

# Deepgram (Optional - uses Web Speech API if not provided)
DEEPGRAM_API_KEY=your_deepgram_api_key

# Supabase (Optional - uses localStorage if not provided)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. **Run the development server**:

```bash
npm run dev
```

5. **Open your browser**:

Navigate to [http://localhost:3000](http://localhost:3000)

### First Use

The application works **out of the box** with mock data! You'll see:
- 11 pre-populated emergency calls on the dashboard
- Interactive map with markers
- Full call details and transcripts

To enable **real APIs**, add your API keys to `.env.local` and restart the server.

---

## 🗄️ Database Schema

Pulse112 uses Supabase (PostgreSQL) for production or localStorage for demos.

### `calls` Table

```sql
CREATE TABLE calls (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Caller Information
  caller_number VARCHAR(20) NOT NULL,
  caller_location JSONB, -- {address, coordinates: {lat, lng}, source}
  network_location JSONB, -- {coordinates: {lat, lng}, accuracy_radius, source}
  
  -- Call Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  call_status VARCHAR(20) DEFAULT 'active', -- active, ended
  status VARCHAR(20) DEFAULT 'pending', -- pending, approved, dispatched, resolved, cancelled
  
  -- Incident Details
  incident_type VARCHAR(50), -- fire, medical, crime, accident, complaint
  severity INTEGER CHECK (severity BETWEEN 1 AND 10),
  description TEXT,
  
  -- AI Analysis
  ai_summary TEXT,
  ai_recommendations TEXT[],
  entities JSONB, -- {people: [], vehicles: [], addresses: []}
  
  -- Emotion Detection
  top_emotion VARCHAR(50),
  emotion_data JSONB, -- [{emotion: string, intensity: number, timestamp: number}]
  
  -- Transcript
  transcript JSONB, -- [{speaker: string, text: string, timestamp: number, emotions: object}]
  
  -- Assignment
  assigned_to VARCHAR(100),
  priority_score DECIMAL(3,2), -- 0.00 to 10.00
  
  -- Indexes
  INDEX idx_status (status),
  INDEX idx_created_at (created_at DESC),
  INDEX idx_incident_type (incident_type),
  INDEX idx_severity (severity DESC)
);

-- Enable Real-time
ALTER PUBLICATION supabase_realtime ADD TABLE calls;

-- Row Level Security (Optional)
ALTER TABLE calls ENABLE ROW LEVEL SECURITY;

-- Example RLS Policy: Allow all operations (adjust for production)
CREATE POLICY "Allow all operations" ON calls
  FOR ALL USING (true) WITH CHECK (true);
```

### TypeScript Interface

```typescript
interface EmergencyCall {
  id: string;
  caller_number: string;
  caller_location?: LocationData;
  network_location?: NetworkLocationData;
  created_at: string;
  updated_at: string;
  call_status: 'active' | 'ended';
  status: 'pending' | 'approved' | 'dispatched' | 'resolved' | 'cancelled';
  incident_type?: IncidentType;
  severity?: number; // 1-10
  description?: string;
  ai_summary?: string;
  ai_recommendations?: string[];
  entities?: {
    people?: string[];
    vehicles?: string[];
    addresses?: string[];
  };
  top_emotion?: string;
  emotion_data?: EmotionData[];
  transcript?: TranscriptSegment[];
  assigned_to?: string;
  priority_score?: number;
}
```

---

## 🔌 API Integrations

### 1. Deepgram Transcription API

**Purpose**: Real-time speech-to-text transcription for emergency calls with high accuracy.

#### Setup

1. **Sign up** at [Deepgram](https://deepgram.com)
2. **Generate API key** from Dashboard → API Keys
3. **Add to `.env.local`**:
   ```bash
   DEEPGRAM_API_KEY=your_deepgram_api_key
   ```

#### Free Tier

- ✅ **45 hours/month free** for first month
- ✅ After free trial: $12/month for 9,000 minutes
- ✅ Real-time WebSocket streaming
- ✅ 99%+ accuracy

#### Usage in Code

```typescript
// app/api/transcribe/deepgram/route.ts
const response = await fetch(`https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true`, {
  method: 'POST',
  headers: {
    'Authorization': `Token ${process.env.DEEPGRAM_API_KEY}`,
    'Content-Type': 'audio/wav',
  },
  body: audioBuffer,
});

const data = await response.json();
// Returns: {transcript, confidence, words}
```

#### Real-time WebSocket

```typescript
const ws = new WebSocket(
  `wss://api.deepgram.com/v1/listen?model=nova-2&smart_format=true`,
  ['token', process.env.DEEPGRAM_API_KEY]
);

ws.send(audioChunk); // Send audio in real-time
```

### 2. OpenAI GPT-4 API

**Purpose**: AI-powered triage to extract incident details, entities, and severity from call transcripts.

#### Setup

1. **Create account** at [OpenAI Platform](https://platform.openai.com)
2. **Generate API key** from [API Keys page](https://platform.openai.com/api-keys)
3. **Add to `.env.local`**:
   ```bash
   OPENAI_API_KEY=sk-your_openai_key_here
   ```

#### Usage in Code

```typescript
// app/api/triage/extract/route.ts
const response = await openai.chat.completions.create({
  model: 'gpt-4-turbo-preview',
  messages: [
    {
      role: 'system',
      content: 'You are an emergency dispatch AI triage system...'
    },
    {
      role: 'user',
      content: `Analyze this emergency call transcript:\n${transcript}`
    }
  ],
  response_format: { type: 'json_object' }
});

const triageData = JSON.parse(response.choices[0].message.content);
```

#### Triage Response

```json
{
  "incident_type": "fire",
  "severity": 9,
  "description": "Apartment fire on 3rd floor, smoke visible",
  "entities": {
    "people": ["John Doe (caller)"],
    "addresses": ["123 Main St, Apt 302"],
    "vehicles": []
  },
  "ai_summary": "Critical apartment fire requiring immediate response...",
  "ai_recommendations": [
    "Dispatch fire trucks immediately",
    "Evacuate building",
    "Alert neighboring units"
  ]
}
```

### 3. Hume AI WebSocket (Empathic Voice Interface)

**Purpose**: Real-time emotion detection and analysis during emergency calls.

#### Setup

1. **Create account** at [Hume AI Platform](https://platform.hume.ai)
2. **Create EVI Configuration**:
   - Go to EVI Configurations
   - Create new config for "Emergency Triage"
   - Set system prompt: "You are an emergency dispatcher assistant. Listen carefully and ask clarifying questions."
3. **Generate API Keys**:
   - Copy Config ID
   - Generate API Key and Secret Key
4. **Add to `.env.local`**:
   ```bash
   NEXT_PUBLIC_HUME_CONFIG_ID=a324c92a-xxxx-xxxx-xxxx-xxxxxxxxxxxx
   HUME_API_KEY=your_hume_api_key
   HUME_SECRET_KEY=your_hume_secret_key
   ```

#### Current Implementation (Embedded Demo)

Currently, Pulse embeds the Hume EVI demo site as an iframe:

```typescript
// components/StartEmergencyCall.tsx
<iframe
  src="https://hume-evi-next-js-starter.vercel.app/"
  allow="microphone; autoplay"
  title="Hume EVI Emergency Call"
/>
```

**Limitations**:
- Cannot extract conversation data in real-time
- No direct emotion analysis
- Demo UI not customizable

---

## 🎤 Extracting Hume Conversation Data

To **extract real conversation data** from Hume AI (transcripts, emotions, timestamps), you need to integrate Hume's **WebSocket API** or **REST API** instead of the embedded demo.

### Option 1: WebSocket Integration (Real-Time)

**Best for**: Live emotion tracking during calls

#### Setup

1. **Install Hume SDK**:

```bash
npm install hume
```

2. **Create WebSocket connection**:

```typescript
import { HumeClient } from 'hume';

// Initialize Hume client
const hume = new HumeClient({
  apiKey: process.env.HUME_API_KEY!,
  secretKey: process.env.HUME_SECRET_KEY!
});

// Start EVI session
const socket = await hume.empathicVoice.chat.connectWithWebSocket({
  configId: process.env.NEXT_PUBLIC_HUME_CONFIG_ID!
});

// Listen for messages
socket.on('message', (message) => {
  if (message.type === 'user_message') {
    console.log('User said:', message.text);
    console.log('Emotions:', message.emotions);
  }
  
  if (message.type === 'assistant_message') {
    console.log('Assistant replied:', message.text);
  }
});

// Send audio
const audioStream = getUserMicrophone();
audioStream.on('data', (audioChunk) => {
  socket.sendAudio(audioChunk);
});
```

#### Extract Emotion Data

```typescript
interface EmotionFrame {
  timestamp: number;
  emotions: {
    [emotionName: string]: number; // 0.0 to 1.0
  };
}

const emotions: EmotionFrame[] = [];

socket.on('message', (message) => {
  if (message.emotions) {
    emotions.push({
      timestamp: Date.now(),
      emotions: message.emotions
    });
    
    // Get top emotion
    const topEmotion = Object.entries(message.emotions)
      .sort(([, a], [, b]) => b - a)[0];
    
    console.log(`Top emotion: ${topEmotion[0]} (${topEmotion[1]})`);
  }
});
```

### Option 2: REST API (Post-Call Analysis)

**Best for**: Analyzing recorded calls after they end

#### Get Chat History

```typescript
// After chat session ends
const chatHistory = await hume.empathicVoice.chats.listChatMessages({
  chatId: 'chat_xxxxx'
});

chatHistory.messages.forEach((msg) => {
  console.log(`[${msg.timestamp}] ${msg.role}: ${msg.text}`);
  console.log('Emotions:', msg.emotions);
});
```

#### Extract Full Transcript

```typescript
interface TranscriptSegment {
  speaker: 'user' | 'assistant';
  text: string;
  timestamp: number;
  emotions?: {
    [emotionName: string]: number;
  };
  top_emotion?: string;
}

function extractTranscript(chatHistory: any): TranscriptSegment[] {
  return chatHistory.messages.map((msg) => ({
    speaker: msg.role,
    text: msg.text,
    timestamp: new Date(msg.timestamp).getTime(),
    emotions: msg.emotions,
    top_emotion: msg.emotions 
      ? Object.entries(msg.emotions).sort(([, a], [, b]) => b - a)[0][0]
      : undefined
  }));
}
```

### Option 3: Hume Webhooks (Event-Driven)

**Best for**: Automatic flagging when high-emotion events occur

#### Setup Webhook Endpoint

```typescript
// app/api/hume/webhook/route.ts
export async function POST(req: Request) {
  const event = await req.json();
  
  if (event.type === 'chat.message') {
    const { chatId, message, emotions } = event.data;
    
    // Flag high-emotion messages
    const distressLevel = emotions.fear + emotions.anxiety + emotions.distress;
    
    if (distressLevel > 2.0) {
      await flagHighPriorityCall(chatId, {
        reason: 'High distress detected',
        emotions,
        message: message.text
      });
    }
  }
  
  return new Response('OK', { status: 200 });
}
```

#### Configure Webhook in Hume Dashboard

1. Go to Hume Platform → Settings → Webhooks
2. Add webhook URL: `https://yourdomain.com/api/hume/webhook`
3. Subscribe to events: `chat.message`, `chat.started`, `chat.ended`

### Emotion-Based Flagging Logic

```typescript
/**
 * AI-powered emotion flagging system
 * Analyzes emotion patterns to determine call priority
 */
function analyzeEmotionPriority(emotions: EmotionFrame[]): {
  priority: number; // 1-10
  flags: string[];
  reasoning: string;
} {
  const avgEmotions = calculateAverageEmotions(emotions);
  
  let priority = 5;
  const flags: string[] = [];
  
  // High fear/distress
  if (avgEmotions.fear > 0.7 || avgEmotions.distress > 0.7) {
    priority += 3;
    flags.push('HIGH_DISTRESS');
  }
  
  // Anger/aggression (potential violence)
  if (avgEmotions.anger > 0.6) {
    priority += 2;
    flags.push('POTENTIAL_VIOLENCE');
  }
  
  // Panic/anxiety
  if (avgEmotions.anxiety > 0.7) {
    priority += 2;
    flags.push('CALLER_PANIC');
  }
  
  // Sadness (potential mental health crisis)
  if (avgEmotions.sadness > 0.8) {
    priority += 1;
    flags.push('MENTAL_HEALTH_CONCERN');
  }
  
  // Calm/neutral (lower priority)
  if (avgEmotions.calm > 0.6) {
    priority -= 1;
  }
  
  return {
    priority: Math.min(Math.max(priority, 1), 10),
    flags,
    reasoning: generateReasoning(avgEmotions, flags)
  };
}
```

---

## 🆓 Free Transcript Options

If you want **free** or **low-cost** alternatives to Hume AI for transcription:

### 1. **Web Speech API** (100% Free)

**Best for**: Browser-based demos and MVPs

#### Pros
- ✅ Completely free
- ✅ No API keys needed
- ✅ Real-time transcription
- ✅ Works in Chrome, Edge, Safari

#### Cons
- ❌ No emotion detection
- ❌ Browser-dependent
- ❌ Privacy concerns (uses browser's cloud service)

#### Implementation

```typescript
'use client';

import { useEffect, useState } from 'react';

export function useSpeechRecognition() {
  const [transcript, setTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);

  useEffect(() => {
    // Check browser support
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      console.error('Speech Recognition not supported');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcriptPiece = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcriptPiece + ' ';
        } else {
          interimTranscript += transcriptPiece;
        }
      }

      setTranscript(finalTranscript + interimTranscript);
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
    };

    if (isListening) {
      recognition.start();
    }

    return () => recognition.stop();
  }, [isListening]);

  return { transcript, isListening, setIsListening };
}
```

### 2. **OpenAI Whisper API** (Paid, but cheap)

**Best for**: High-accuracy transcription with offline support

#### Pricing
- **$0.006 per minute** (very affordable)
- Example: 1-hour call = $0.36

#### Implementation

```typescript
// app/api/transcribe/route.ts
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export async function POST(req: Request) {
  const formData = await req.formData();
  const audioFile = formData.get('audio') as File;

  const transcription = await openai.audio.transcriptions.create({
    file: audioFile,
    model: 'whisper-1',
    language: 'en',
    response_format: 'verbose_json', // Includes timestamps
    timestamp_granularities: ['word']
  });

  return Response.json({
    text: transcription.text,
    segments: transcription.words // Word-level timestamps
  });
}
```

### 3. **AssemblyAI** (Free Tier Available)

**Best for**: Real-time transcription with speaker diarization

#### Free Tier
- ✅ 5 hours/month free
- ✅ Real-time transcription
- ✅ Speaker diarization (who spoke when)
- ✅ Sentiment analysis

#### Implementation

```bash
npm install assemblyai
```

```typescript
import { AssemblyAI } from 'assemblyai';

const client = new AssemblyAI({
  apiKey: process.env.ASSEMBLYAI_API_KEY
});

// Real-time transcription
const realtimeTranscriber = client.realtime.transcriber({
  sampleRate: 16000
});

realtimeTranscriber.on('transcript', (transcript) => {
  console.log('Transcript:', transcript.text);
});

realtimeTranscriber.on('error', (error) => {
  console.error('Error:', error);
});

// Connect microphone stream
const stream = getMicrophoneStream();
stream.on('data', (chunk) => {
  realtimeTranscriber.sendAudio(chunk);
});
```

### 4. **Deepgram** (Free Tier: 45 hours/month)

**Best for**: Production-ready real-time transcription

#### Free Tier
- ✅ 45 hours/month free (for first month)
- ✅ $12/month for 9,000 minutes after
- ✅ Real-time WebSocket API
- ✅ Multiple languages
- ✅ Punctuation and formatting

#### Implementation

```bash
npm install @deepgram/sdk
```

```typescript
import { createClient } from '@deepgram/sdk';

const deepgram = createClient(process.env.DEEPGRAM_API_KEY);

const connection = deepgram.listen.live({
  model: 'nova-2',
  language: 'en-US',
  smart_format: true,
  interim_results: true
});

connection.on('transcript', (data) => {
  console.log('Transcript:', data.channel.alternatives[0].transcript);
});

// Send audio
const microphone = getMicrophoneStream();
microphone.on('data', (chunk) => {
  connection.send(chunk);
});
```

### Comparison Table

| Service | Cost | Real-Time | Emotions | Accuracy | Setup Difficulty |
|---------|------|-----------|----------|----------|------------------|
| **Web Speech API** | Free | ✅ | ❌ | Medium | Easy |
| **Hume AI EVI** | Paid | ✅ | ✅ | High | Medium |
| **OpenAI Whisper** | $0.006/min | ❌ | ❌ | Very High | Easy |
| **AssemblyAI** | 5hrs free | ✅ | Sentiment | High | Easy |
| **Deepgram** | 45hrs free | ✅ | ❌ | High | Easy |

### Recommended Approach

For **production Pulse112**, I recommend:

1. **Use Deepgram or AssemblyAI** for transcription (free tier → paid as you scale)
2. **Use Hume AI** for emotion detection (pass Deepgram transcript to Hume's text analysis)
3. **Use OpenAI GPT-4** for triage and entity extraction

#### Hybrid Implementation

```typescript
// 1. Transcribe with Deepgram
const transcript = await deepgram.transcribe(audioFile);

// 2. Analyze emotions with Hume (text-based)
const emotions = await hume.analyzeText(transcript.text);

// 3. Extract incident details with GPT-4
const triage = await openai.chat.completions.create({
  model: 'gpt-4-turbo-preview',
  messages: [
    { role: 'system', content: 'Extract emergency details...' },
    { role: 'user', content: transcript.text }
  ]
});

// 4. Combine all data
const emergencyCall = {
  transcript: transcript.text,
  emotions: emotions.topEmotions,
  severity: triage.severity,
  incident_type: triage.incidentType
};
```

---

## 📁 Project Structure

```
112-Emergency/
├── app/
│   ├── layout.tsx                 # Root layout (metadata, fonts)
│   ├── page.tsx                   # Landing page (redirects to dashboard)
│   ├── globals.css                # Global Tailwind styles
│   │
│   ├── dashboard/
│   │   ├── page.tsx               # Main dispatcher dashboard
│   │   └── calls/
│   │       └── [id]/
│   │           └── page.tsx       # Individual call detail page
│   │
│   └── api/
│       ├── calls/
│       │   └── create/
│       │       └── route.ts       # Create emergency call (combines emotion + AI triage)
│       ├── transcribe/
│       │   └── deepgram/
│       │       └── route.ts       # Deepgram transcription API
│       ├── triage/
│       │   └── extract/
│       │       └── route.ts       # AI triage with GPT-4
│       └── hume/
│           └── webhook/
│               └── route.ts       # Hume webhook endpoint (future)
│
├── components/
│   ├── ui/                        # Shadcn UI components
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── input.tsx
│   │   ├── badge.tsx
│   │   ├── select.tsx
│   │   └── scroll-area.tsx
│   │
│   ├── EmergencyMap.tsx           # Leaflet map with markers
│   └── StartEmergencyCall.tsx     # Emergency call modal with Hume iframe
│
├── lib/
│   ├── types.ts                   # TypeScript interfaces
│   ├── mock-data.ts               # Demo emergency calls
│   ├── utils.ts                   # Utility functions (cn, etc.)
│   └── supabase.ts                # Supabase client (optional)
│
├── public/                        # Static assets
├── .env.local                     # Environment variables (gitignored)
├── .env.example                   # Example environment file
├── package.json                   # Dependencies
├── tsconfig.json                  # TypeScript config
├── tailwind.config.ts             # Tailwind configuration
├── next.config.js                 # Next.js configuration
├── components.json                # Shadcn UI config
└── README.md                      # This file
```

---

## 🔐 Environment Variables

Create a `.env.local` file in the project root with the following variables:

```bash
# ============================================
# OpenAI API (AI Triage)
# ============================================
# Get from: https://platform.openai.com/api-keys
# Optional: Uses mock AI triage if not provided
OPENAI_API_KEY=sk-your_openai_key_here

# ============================================
# Deepgram API (Speech-to-Text Transcription)
# ============================================
# Get from: https://deepgram.com
# Optional: Uses Web Speech API fallback if not provided
# Free tier: 45 hours/month
DEEPGRAM_API_KEY=your_deepgram_api_key

# ============================================
# Hume AI EVI (Emotion Detection)
# ============================================
# Get from: https://platform.hume.ai
# Optional: For real-time emotion analysis
NEXT_PUBLIC_HUME_CONFIG_ID=a324c92a-xxxx-xxxx-xxxx-xxxxxxxxxxxx
HUME_API_KEY=your_hume_api_key_here
HUME_SECRET_KEY=your_hume_secret_key_here

# ============================================
# Supabase (Database)
# ============================================
# Get from: https://supabase.com
# Optional: Uses localStorage if not provided
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here

# ============================================
# Alternative Transcription Services (Optional)
# ============================================
# AssemblyAI: https://www.assemblyai.com (5 hours/month free)
ASSEMBLYAI_API_KEY=your_assemblyai_key
```

### Variable Reference

| Variable | Required | Default Behavior | Description |
|----------|----------|------------------|-------------|
| `OPENAI_API_KEY` | ❌ | Mock triage | OpenAI API key for GPT-4 triage |
| `DEEPGRAM_API_KEY` | ❌ | Web Speech API | Deepgram API key for transcription (45hrs/mo free) |
| `NEXT_PUBLIC_HUME_CONFIG_ID` | ❌ | N/A | Hume EVI configuration ID for emotion detection |
| `HUME_API_KEY` | ❌ | N/A | Hume API key (for WebSocket integration) |
| `HUME_SECRET_KEY` | ❌ | N/A | Hume secret key (for WebSocket integration) |
| `NEXT_PUBLIC_SUPABASE_URL` | ❌ | localStorage | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ❌ | localStorage | Supabase anonymous key |
| `ASSEMBLYAI_API_KEY` | ❌ | N/A | Alternative transcription service (5hrs/mo free) |

---

## 🧑‍💻 Development

### Development Server

```bash
# Start dev server (http://localhost:3000)
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linter
npm run lint

# Type check
npx tsc --noEmit
```

### Adding New Features

#### 1. Add a New API Route

```typescript
// app/api/your-feature/route.ts
export async function POST(req: Request) {
  const data = await req.json();
  
  // Your logic here
  
  return Response.json({ success: true });
}
```

#### 2. Add a New Component

```bash
# Use Shadcn to add UI components
npx shadcn-ui@latest add dialog
npx shadcn-ui@latest add table
```

#### 3. Add a New Page

```typescript
// app/your-page/page.tsx
export default function YourPage() {
  return <div>Your content</div>;
}
```

### Debugging Tips

#### Enable Console Logs

The app includes extensive console logging for debugging:

- `🔘` User interactions (button clicks)
- `📞` API calls (Deepgram, OpenAI, Hume)
- `✅` Success states
- `❌` Errors
- `💾` Data persistence (localStorage)
- `🗺️` Map rendering

#### Check Network Tab

1. Open DevTools → Network
2. Filter by `Fetch/XHR`
3. Look for `/api/` calls
4. Check request/response payloads

#### Inspect localStorage

```javascript
// In browser console
localStorage.getItem('pulse112_emergency_calls');
```

---

## 🚀 Deployment

### Deploy to Vercel (Recommended)

Vercel provides the best experience for Next.js apps.

#### Steps

1. **Push to GitHub**:

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/sudhansu-24/112-Emergency
git push -u origin main
```

2. **Import to Vercel**:
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import your GitHub repository
   - Vercel auto-detects Next.js

3. **Add Environment Variables**:
   - In Vercel dashboard → Settings → Environment Variables
   - Add all variables from `.env.local`
   - Click "Deploy"

4. **Custom Domain** (Optional):
   - Settings → Domains
   - Add your custom domain
   - Update DNS records

### Deploy to Other Platforms

#### Netlify

```bash
npm run build
# Deploy the .next folder
```

#### AWS Amplify

```bash
# Add amplify.yml
version: 1
frontend:
  phases:
    build:
      commands:
        - npm ci
        - npm run build
  artifacts:
    baseDirectory: .next
    files:
      - '**/*'
```

#### Docker

```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]
```

```bash
docker build -t pulse112 .
docker run -p 3000:3000 pulse112
```

---

## 🔮 Future Improvements

### Immediate Enhancements

- [ ] **Full Hume SDK Integration**: Replace iframe with WebSocket API for real-time emotion extraction
- [ ] **Supabase Real-time**: Live dashboard updates when new calls arrive
- [ ] **Call Recording**: Store audio files for compliance and training
- [ ] **Dispatcher Authentication**: Role-based access control (admin, dispatcher, supervisor)
- [ ] **Advanced Filtering**: Search by address, phone number, date range
- [ ] **Call Assignment**: Automatically assign calls to available dispatchers
- [ ] **Notification System**: Push notifications for high-priority calls
- [ ] **Analytics Dashboard**: Call volume, response times, incident type breakdowns

### Advanced Features

- [ ] **Multi-language Support**: Transcription and triage in Spanish, French, etc.
- [ ] **Predictive Routing**: AI suggests best emergency service based on location and incident
- [ ] **Historical Analysis**: Identify high-risk areas and incident patterns
- [ ] **Integration with CAD Systems**: Export calls to Computer-Aided Dispatch systems
- [ ] **Mobile App**: Native iOS/Android app for field responders
- [ ] **Video Calls**: Add video support for visual assessment
- [ ] **Automated Follow-ups**: AI-powered follow-up calls for non-urgent cases
- [ ] **Public API**: Allow third-party integrations (smart home devices, wearables)

### Technical Debt

- [ ] **Unit Tests**: Add Jest/Vitest tests for API routes and components
- [ ] **E2E Tests**: Playwright tests for critical workflows
- [ ] **Error Boundaries**: Better error handling in React components
- [ ] **Rate Limiting**: Protect API routes from abuse
- [ ] **Caching**: Redis for API response caching (reduce costs)
- [ ] **Monitoring**: Sentry for error tracking, Vercel Analytics for performance
- [ ] **CI/CD Pipeline**: Automated testing and deployment
- [ ] **Documentation**: API docs with OpenAPI/Swagger

---

## 🤝 Contributing

Contributions are welcome! This project was built for a hackathon but is now open for community improvements.

### How to Contribute

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Commit your changes**: `git commit -m 'Add amazing feature'`
4. **Push to the branch**: `git push origin feature/amazing-feature`
5. **Open a Pull Request**

### Code Style

- Use **TypeScript** for all new code
- Follow **ESLint** rules (`npm run lint`)
- Use **JSDoc comments** for functions
- Write **meaningful commit messages**

### Reporting Bugs

Open an issue with:
- Clear title
- Steps to reproduce
- Expected vs actual behavior
- Screenshots (if applicable)
- Environment (OS, browser, Node version)

---

## 📄 License

MIT License

Copyright (c) 2024 Pulse112 Team

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

---

## 🙏 Acknowledgments

- **[Deepgram](https://deepgram.com/)** - Real-time speech-to-text transcription API
- **[Hume AI](https://hume.ai/)** - Empathic Voice Interface and emotion detection technology
- **[OpenAI](https://openai.com/)** - GPT-4 for AI-powered triage and analysis
- **[Supabase](https://supabase.com/)** - PostgreSQL database and real-time subscriptions
- **[Shadcn](https://ui.shadcn.com/)** - Beautiful UI component library
- **[Vercel](https://vercel.com/)** - Hosting and deployment platform
- **[Leaflet](https://leafletjs.com/)** - Interactive map library

---

## 📞 Support

For questions or support:

- **Issues**: [GitHub Issues](https://github.com/sudhansu-24/112-Emergencyissues)
- **Discussions**: [GitHub Discussions](https://github.com/sudhansu-24/112-Emergencydiscussions)
- **Email**: ssssprusty98@gmail.com

---

<div align="center">

**Built with ❤️ for emergency response innovation**

[⭐ Star this repo](https://github.com/sudhansu-24/112-Emergency) | [🐛 Report Bug](https://github.com/sudhansu-24/112-Emergency/issues) | [✨ Request Feature](https://github.com/sudhansu-24/112-Emergencyissues)

</div>
