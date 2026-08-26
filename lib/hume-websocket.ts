/**
 * Hume AI WebSocket Integration
 * Real-time emotion detection and conversation tracking
 */

export interface HumeEmotionData {
  [emotion: string]: number; // 0.0 to 1.0
}

export interface HumeMessage {
  type: 'user_message' | 'assistant_message' | 'emotion_update' | 'conversation_start' | 'conversation_end';
  text?: string;
  emotions?: HumeEmotionData;
  timestamp: number;
  conversationId?: string;
  messageId?: string;
}

export interface HumeConversationData {
  conversationId: string;
  messages: HumeMessage[];
  emotions: HumeEmotionData[];
  startedAt: number;
  endedAt?: number;
}

/**
 * Hume WebSocket Client for Real-time Emotion Detection
 */
export class HumeWebSocketClient {
  private ws: WebSocket | null = null;
  private conversationId: string | null = null;
  private messages: HumeMessage[] = [];
  private emotions: HumeEmotionData[] = [];
  private startedAt: number = 0;

  constructor(
    private apiKey: string,
    private configId: string,
    private onMessage?: (message: HumeMessage) => void,
    private onEmotion?: (emotions: HumeEmotionData) => void,
    private onError?: (error: Error) => void
  ) {}

  /**
   * Connect to Hume WebSocket API
   */
  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Hume WebSocket endpoint
        const wsUrl = `wss://api.hume.ai/v0/assistant/chat`;

        this.ws = new WebSocket(wsUrl, {
          headers: {
            'X-Hume-Api-Key': this.apiKey,
            'X-Hume-Config-Id': this.configId,
          },
        } as any);

        this.ws.onopen = () => {
          console.log('🎙️ Hume WebSocket connected');
          this.startedAt = Date.now();
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            this.handleMessage(data);
          } catch (error) {
            console.error('Failed to parse Hume message:', error);
          }
        };

        this.ws.onerror = (error) => {
          console.error('Hume WebSocket error:', error);
          if (this.onError) {
            this.onError(new Error('WebSocket connection error'));
          }
          reject(error);
        };

        this.ws.onclose = () => {
          console.log('🔌 Hume WebSocket disconnected');
        };

      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(data: any): void {
    const message: HumeMessage = {
      type: data.type,
      text: data.message?.text || data.text,
      emotions: data.emotions,
      timestamp: Date.now(),
      conversationId: data.conversation_id || this.conversationId,
      messageId: data.message_id,
    };

    // Store conversation ID
    if (data.conversation_id && !this.conversationId) {
      this.conversationId = data.conversation_id;
    }

    // Store message
    this.messages.push(message);

    // Store emotions
    if (data.emotions) {
      this.emotions.push(data.emotions);
      
      // Call emotion callback
      if (this.onEmotion) {
        this.onEmotion(data.emotions);
      }
    }

    // Call message callback
    if (this.onMessage) {
      this.onMessage(message);
    }
  }

  /**
   * Send audio data to Hume for analysis
   */
  sendAudio(audioData: ArrayBuffer): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket not connected');
    }

    // Send binary audio data
    this.ws.send(audioData);
  }

  /**
   * Send text message (for testing or text-only analysis)
   */
  sendText(text: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket not connected');
    }

    this.ws.send(JSON.stringify({
      type: 'text_input',
      text,
    }));
  }

  /**
   * Get conversation data (transcript + emotions)
   */
  getConversationData(): HumeConversationData {
    return {
      conversationId: this.conversationId || `conv_${Date.now()}`,
      messages: this.messages,
      emotions: this.emotions,
      startedAt: this.startedAt,
      endedAt: Date.now(),
    };
  }

  /**
   * Get top emotions from conversation
   */
  getTopEmotions(limit: number = 5): Array<{ emotion: string; intensity: number }> {
    if (this.emotions.length === 0) return [];

    // Calculate average intensity for each emotion
    const emotionAverages: { [key: string]: number } = {};
    const emotionCounts: { [key: string]: number } = {};

    this.emotions.forEach((emotionFrame) => {
      Object.entries(emotionFrame).forEach(([emotion, intensity]) => {
        if (!emotionAverages[emotion]) {
          emotionAverages[emotion] = 0;
          emotionCounts[emotion] = 0;
        }
        emotionAverages[emotion] += intensity;
        emotionCounts[emotion]++;
      });
    });

    // Calculate averages and sort
    const topEmotions = Object.entries(emotionAverages)
      .map(([emotion, total]) => ({
        emotion,
        intensity: total / emotionCounts[emotion],
      }))
      .sort((a, b) => b.intensity - a.intensity)
      .slice(0, limit);

    return topEmotions;
  }

  /**
   * Analyze conversation for high-priority flags
   */
  analyzeForEmergencyFlags(): {
    isHighPriority: boolean;
    flags: string[];
    distressLevel: number;
  } {
    const topEmotions = this.getTopEmotions(10);
    const flags: string[] = [];
    let distressLevel = 0;

    // Check for high-distress emotions
    topEmotions.forEach(({ emotion, intensity }) => {
      if ((emotion === 'fear' || emotion === 'distress') && intensity > 0.7) {
        flags.push('HIGH_DISTRESS');
        distressLevel += intensity * 30;
      }
      if (emotion === 'anxiety' && intensity > 0.7) {
        flags.push('CALLER_PANIC');
        distressLevel += intensity * 20;
      }
      if (emotion === 'anger' && intensity > 0.6) {
        flags.push('POTENTIAL_VIOLENCE');
        distressLevel += intensity * 25;
      }
      if (emotion === 'sadness' && intensity > 0.8) {
        flags.push('MENTAL_HEALTH_CONCERN');
        distressLevel += intensity * 15;
      }
    });

    return {
      isHighPriority: distressLevel > 50,
      flags: [...new Set(flags)], // Remove duplicates
      distressLevel: Math.min(distressLevel, 100),
    };
  }

  /**
   * Close WebSocket connection
   */
  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

/**
 * Browser-compatible Web Speech API fallback
 * For when Hume or Deepgram are not available
 */
export class WebSpeechTranscriber {
  private recognition: any;
  private isListening: boolean = false;

  constructor(
    private onTranscript?: (text: string, isFinal: boolean) => void,
    private onError?: (error: Error) => void
  ) {
    // Check browser support
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      throw new Error('Web Speech API not supported in this browser');
    }

    this.recognition = new SpeechRecognition();
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = 'en-US';

    this.recognition.onresult = (event: any) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript + ' ';
          if (this.onTranscript) {
            this.onTranscript(transcript, true);
          }
        } else {
          interimTranscript += transcript;
          if (this.onTranscript) {
            this.onTranscript(transcript, false);
          }
        }
      }
    };

    this.recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      if (this.onError) {
        this.onError(new Error(event.error));
      }
    };
  }

  /**
   * Start listening
   */
  start(): void {
    if (!this.isListening) {
      this.recognition.start();
      this.isListening = true;
      console.log('🎤 Web Speech API started');
    }
  }

  /**
   * Stop listening
   */
  stop(): void {
    if (this.isListening) {
      this.recognition.stop();
      this.isListening = false;
      console.log('🎤 Web Speech API stopped');
    }
  }
}

