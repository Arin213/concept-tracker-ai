import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Volume2, X, Sparkles, MessageSquare, AlertCircle, RefreshCw } from 'lucide-react';

interface LiveVoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeConceptTitle?: string;
}

// Convert Float32Array (Web Audio API) to 16-bit PCM ArrayBuffer
function floatTo16BitPCM(input: Float32Array): ArrayBuffer {
  const output = new DataView(new ArrayBuffer(input.length * 2));
  for (let i = 0; i < input.length; i++) {
    const s = Math.max(-1, Math.min(1, input[i]));
    output.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return output.buffer;
}

// Convert ArrayBuffer to Base64
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Convert Base64 to 24kHz AudioBuffer for playback
function base64ToAudioBuffer(base64: string, ctx: AudioContext): AudioBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  const dataView = new DataView(bytes.buffer);
  const sampleCount = dataView.byteLength / 2;
  const audioBuffer = ctx.createBuffer(1, sampleCount, 24000);
  const channelData = audioBuffer.getChannelData(0);

  for (let i = 0; i < sampleCount; i++) {
    const int16 = dataView.getInt16(i * 2, true);
    channelData[i] = int16 < 0 ? int16 / 0x8000 : int16 / 0x7fff;
  }
  return audioBuffer;
}

export const LiveVoiceModal: React.FC<LiveVoiceModalProps> = ({
  isOpen,
  onClose,
  activeConceptTitle
}) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [statusText, setStatusText] = useState('Connecting to Gemini 3.8 Live Coach...');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isCoachSpeaking, setIsCoachSpeaking] = useState(false);
  const [volumeLevel, setVolumeLevel] = useState(0);

  const wsRef = useRef<WebSocket | null>(null);
  const inputAudioCtxRef = useRef<AudioContext | null>(null);
  const outputAudioCtxRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const scheduledSourcesRef = useRef<AudioBufferSourceNode[]>([]);
  const nextStartTimeRef = useRef<number>(0);
  const animFrameRef = useRef<number | null>(null);

  // Initialize and connect
  useEffect(() => {
    if (!isOpen) {
      cleanup();
      return;
    }

    startLiveSession();

    return () => {
      cleanup();
    };
  }, [isOpen]);

  const cleanup = () => {
    // Stop all scheduled playback
    scheduledSourcesRef.current.forEach(source => {
      try {
        source.stop();
      } catch (e) {
        // ignore
      }
    });
    scheduledSourcesRef.current = [];

    // Stop mic stream
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }

    // Disconnect processor
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }

    // Close Audio Contexts
    if (inputAudioCtxRef.current) {
      inputAudioCtxRef.current.close().catch(() => {});
      inputAudioCtxRef.current = null;
    }
    if (outputAudioCtxRef.current) {
      outputAudioCtxRef.current.close().catch(() => {});
      outputAudioCtxRef.current = null;
    }

    // Close WebSocket
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }

    setIsConnected(false);
    setIsRecording(false);
    setIsCoachSpeaking(false);
    setVolumeLevel(0);
  };

  const startLiveSession = async () => {
    setErrorMessage(null);
    setStatusText('Contacting Live Coach server...');

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/live`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      // Audio contexts: 16kHz for input mic, 24kHz for model output playback
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const inputCtx = new AudioCtx({ sampleRate: 16000 });
      const outputCtx = new AudioCtx({ sampleRate: 24000 });

      inputAudioCtxRef.current = inputCtx;
      outputAudioCtxRef.current = outputCtx;
      nextStartTimeRef.current = outputCtx.currentTime;

      ws.onopen = async () => {
        setIsConnected(true);
        setStatusText('Requesting microphone access...');

        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: {
              channelCount: 1,
              sampleRate: 16000,
              echoCancellation: true,
              noiseSuppression: true
            }
          });
          mediaStreamRef.current = stream;

          const source = inputCtx.createMediaStreamSource(stream);
          const processor = inputCtx.createScriptProcessor(2048, 1, 1);
          processorRef.current = processor;

          source.connect(processor);
          processor.connect(inputCtx.destination);

          setIsRecording(true);
          setStatusText('Coach listening... Speak anytime!');

          // Send initial prompt if active concept
          if (activeConceptTitle) {
            setTimeout(() => {
              if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({
                  text: `Hi Coach, I am currently studying and testing my understanding of "${activeConceptTitle}". Ask me a quick question or test my mental model.`
                }));
              }
            }, 600);
          }

          processor.onaudioprocess = (e) => {
            if (ws.readyState !== WebSocket.OPEN) return;

            const inputData = e.inputBuffer.getChannelData(0);
            
            // Compute simple volume meter
            let sum = 0;
            for (let i = 0; i < inputData.length; i++) {
              sum += inputData[i] * inputData[i];
            }
            const rms = Math.sqrt(sum / inputData.length);
            setVolumeLevel(Math.min(100, Math.round(rms * 400)));

            // Convert to 16-bit PCM and send to server
            const pcmBuffer = floatTo16BitPCM(inputData);
            const base64Audio = arrayBufferToBase64(pcmBuffer);

            ws.send(JSON.stringify({ audio: base64Audio }));
          };
        } catch (micErr: any) {
          console.error('Microphone access denied:', micErr);
          setErrorMessage('Microphone access denied. Please allow microphone permissions to speak with your voice coach.');
          setStatusText('Microphone blocked');
        }
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);

          if (msg.error) {
            setErrorMessage(msg.error);
            setStatusText('Connection error');
            return;
          }

          if (msg.interrupted) {
            // Stop current playback immediately if user speaks over coach
            scheduledSourcesRef.current.forEach(src => {
              try { src.stop(); } catch (e) {}
            });
            scheduledSourcesRef.current = [];
            if (outputAudioCtxRef.current) {
              nextStartTimeRef.current = outputAudioCtxRef.current.currentTime;
            }
            setIsCoachSpeaking(false);
          }

          if (msg.audio && outputAudioCtxRef.current) {
            const outCtx = outputAudioCtxRef.current;
            if (outCtx.state === 'suspended') {
              outCtx.resume();
            }

            const audioBuf = base64ToAudioBuffer(msg.audio, outCtx);
            const source = outCtx.createBufferSource();
            source.buffer = audioBuf;
            source.connect(outCtx.destination);

            const currentTime = outCtx.currentTime;
            if (nextStartTimeRef.current < currentTime) {
              nextStartTimeRef.current = currentTime;
            }

            source.start(nextStartTimeRef.current);
            nextStartTimeRef.current += audioBuf.duration;

            scheduledSourcesRef.current.push(source);
            setIsCoachSpeaking(true);

            source.onended = () => {
              const idx = scheduledSourcesRef.current.indexOf(source);
              if (idx > -1) {
                scheduledSourcesRef.current.splice(idx, 1);
              }
              if (scheduledSourcesRef.current.length === 0) {
                setIsCoachSpeaking(false);
              }
            };
          }
        } catch (e) {
          console.error('Error handling WebSocket message:', e);
        }
      };

      ws.onerror = (err) => {
        console.error('WebSocket error:', err);
        setErrorMessage('Failed to connect to the Live Voice Coach server.');
        setStatusText('Disconnected');
      };

      ws.onclose = () => {
        setIsConnected(false);
        setIsRecording(false);
        setIsCoachSpeaking(false);
        setStatusText('Session ended');
      };

    } catch (err: any) {
      console.error('Session startup failed:', err);
      setErrorMessage(err?.message || 'Could not initiate audio session');
      setStatusText('Initialization failed');
    }
  };

  const handleSendPrompt = (text: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ text }));
      setStatusText('Coach thinking & preparing response...');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="w-full max-w-lg rounded-2xl sketch-border sketch-shadow p-6 bg-paper text-ink relative flex flex-col gap-5 overflow-hidden"
        style={{
          boxShadow: '8px 8px 0px rgba(74, 55, 40, 0.25)'
        }}
      >
        {/* Top Header */}
        <div className="flex items-center justify-between border-b-2 border-border-sketch pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-full flex items-center justify-center bg-latte text-roast border border-border-sketch">
              <Sparkles className="w-5 h-5 text-caramel animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-hand text-2xl font-bold tracking-tight text-ink">
                  Gemini Live Voice Coach
                </h3>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-foam text-ink border border-border-sketch">
                  Gemini 3.8 Live
                </span>
              </div>
              <p className="text-xs text-muted font-sans">
                Real-time, two-way conversational tutor with ultra-low latency audio
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg border border-transparent hover:border-border-sketch hover:bg-latte transition-colors text-muted hover:text-ink cursor-pointer"
            title="Close voice session"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Active Context Banner */}
        {activeConceptTitle && (
          <div className="px-3.5 py-2 rounded-xl bg-latte/60 border border-border-sketch flex items-center justify-between text-xs font-sans">
            <span className="text-muted">Focused Concept:</span>
            <span className="font-bold text-ink underline decoration-wavy decoration-caramel">
              {activeConceptTitle}
            </span>
          </div>
        )}

        {/* Visualizer & Animated Wave Circle */}
        <div className="relative py-8 flex flex-col items-center justify-center bg-latte/30 rounded-2xl border-2 border-dashed border-border-sketch overflow-hidden">
          {/* Animated pulsing rings */}
          <div className="relative flex items-center justify-center">
            {isCoachSpeaking && (
              <>
                <div className="absolute w-36 h-36 rounded-full bg-caramel/20 animate-ping" />
                <div className="absolute w-48 h-48 rounded-full bg-foam/30 animate-pulse" />
              </>
            )}

            {isRecording && !isCoachSpeaking && (
              <div 
                className="absolute rounded-full bg-crema/40 transition-all duration-75"
                style={{
                  width: `${80 + volumeLevel * 1.2}px`,
                  height: `${80 + volumeLevel * 1.2}px`
                }}
              />
            )}

            {/* Central Icon Button */}
            <div 
              className={`w-24 h-24 rounded-full flex flex-col items-center justify-center border-3 transition-all duration-300 z-10 ${
                isCoachSpeaking
                  ? 'bg-caramel text-white border-roast shadow-lg scale-105'
                  : isRecording
                  ? 'bg-foam text-ink border-border-sketch shadow-md'
                  : 'bg-paper text-muted border-dashed border-border-sketch'
              }`}
            >
              {isCoachSpeaking ? (
                <>
                  <Volume2 className="w-8 h-8 animate-bounce" />
                  <span className="text-[10px] font-bold uppercase mt-1 tracking-wider">Speaking</span>
                </>
              ) : isRecording ? (
                <>
                  <Mic className="w-8 h-8 text-roast animate-pulse" />
                  <span className="text-[10px] font-bold uppercase mt-1 tracking-wider">Listening</span>
                </>
              ) : (
                <>
                  <MicOff className="w-8 h-8" />
                  <span className="text-[10px] font-bold uppercase mt-1 tracking-wider">Offline</span>
                </>
              )}
            </div>
          </div>

          {/* Status Label */}
          <div className="mt-5 text-center px-4">
            <p className="font-hand text-lg font-bold text-ink">
              {statusText}
            </p>
            <p className="text-xs text-muted font-sans mt-0.5">
              {isCoachSpeaking 
                ? 'Coach is answering with Zephyr neural voice (interruption supported)' 
                : isRecording 
                ? 'Speak naturally at any time — coach listens and responds in real time' 
                : 'Session paused'}
            </p>
          </div>
        </div>

        {/* Error Notification */}
        {errorMessage && (
          <div className="p-3 rounded-xl bg-red-100 dark:bg-red-950/60 border border-red-300 dark:border-red-800 text-red-800 dark:text-red-200 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
            <div className="flex-1">
              <span className="font-bold">Audio Connection Error:</span> {errorMessage}
            </div>
            <button
              onClick={startLiveSession}
              className="px-2 py-1 rounded bg-red-200 dark:bg-red-900 font-bold hover:bg-red-300 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" /> Retry
            </button>
          </div>
        )}

        {/* Quick Suggestion Chips */}
        <div>
          <div className="flex items-center gap-1.5 text-xs font-bold text-muted mb-2 font-hand">
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Quick Prompt Seeds (click to send or speak aloud):</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              "Explain like I'm 10 years old",
              "Quiz me on real-world interview pitfalls",
              "How does this relate to database transactions?",
              "What is the biggest common misconception?"
            ].map((seed, idx) => (
              <button
                key={idx}
                onClick={() => handleSendPrompt(seed)}
                className="px-3 py-1.5 rounded-lg bg-latte/70 hover:bg-foam border border-border-sketch text-xs text-ink transition-colors cursor-pointer text-left hover:scale-[1.02] active:scale-[0.98]"
              >
                "{seed}"
              </button>
            ))}
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="flex items-center justify-between border-t-2 border-border-sketch pt-4 mt-1">
          <div className="flex items-center gap-2 text-xs text-muted font-sans">
            <span className={`w-2.5 h-2.5 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
            <span>{isConnected ? 'Live WebSocket Active (24kHz Audio)' : 'Disconnected'}</span>
          </div>

          <div className="flex items-center gap-2">
            {errorMessage ? (
              <button
                onClick={startLiveSession}
                className="px-4 py-2 rounded-xl bg-latte hover:bg-foam border border-border-sketch font-bold text-xs text-ink transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Reconnect
              </button>
            ) : null}

            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-roast text-paper hover:opacity-90 font-hand font-bold text-sm tracking-wide transition-all cursor-pointer shadow-xs"
            >
              Done / Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
