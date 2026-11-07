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
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md max-h-[85vh] rounded-md border border-[#2C3E50]/40 dark:border-[#2E3F59] bg-[#D5DBDB] dark:bg-[#161F30] text-[#2E4053] dark:text-[#E2E8F0] relative flex flex-col overflow-hidden"
      >
        {/* Top Header (shrink-0) */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#2C3E50]/20 dark:border-[#2E3F59] bg-[#ECEFF1] dark:bg-[#0B0F19] shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded border border-[#2C3E50]/25 dark:border-[#2E3F59] bg-[#D5DBDB] dark:bg-[#161F30] flex items-center justify-center text-[#4A6572] dark:text-[#E2E8F0]">
              <Sparkles className="w-4 h-4 text-[#4A6572] dark:text-[#E2E8F0]" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-xs font-bold tracking-tight text-[#2E4053] dark:text-[#E2E8F0]">
                  Live Voice Coach
                </h3>
                <span className="text-[9px] uppercase font-mono font-semibold px-1.5 py-0.2 rounded border border-[#2C3E50]/20 dark:border-[#2E3F59] bg-[#ECEFF1] dark:bg-[#1B263B] text-[#546E7A] dark:text-[#94A3B8]">
                  Gemini 3.8
                </span>
              </div>
              <p className="text-[10px] text-[#546E7A] dark:text-[#94A3B8] font-sans">
                Real-time 2-way low latency audio
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-[#546E7A] dark:text-[#94A3B8] hover:text-[#2E4053] dark:hover:text-white transition-colors cursor-pointer"
            title="Close voice session"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Body Content (max-h constrained, never overflows window) */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0">
          {/* Active Context Banner */}
          {activeConceptTitle && (
            <div className="px-2.5 py-1.5 rounded border border-[#2C3E50]/20 dark:border-[#2E3F59] bg-[#ECEFF1] dark:bg-[#0B0F19] flex items-center justify-between text-[11px] font-mono">
              <span className="text-[#546E7A] dark:text-[#94A3B8]">Focus:</span>
              <span className="font-bold text-[#2E4053] dark:text-[#E2E8F0] truncate max-w-[220px]">
                {activeConceptTitle}
              </span>
            </div>
          )}

          {/* Compact Voice Visualizer Circle */}
          <div className="relative py-4 flex flex-col items-center justify-center bg-[#ECEFF1] dark:bg-[#0B0F19] rounded border border-[#2C3E50]/20 dark:border-[#2E3F59] overflow-hidden">
            <div className="relative flex items-center justify-center">
              {/* Dynamic volume ring */}
              {isRecording && !isCoachSpeaking && (
                <div 
                  className="absolute rounded-full border border-[#4A6572]/40 transition-all duration-75 pointer-events-none"
                  style={{
                    width: `${56 + volumeLevel * 0.7}px`,
                    height: `${56 + volumeLevel * 0.7}px`
                  }}
                />
              )}

              {/* Central Mic/Speaker Circle */}
              <div 
                className={`w-14 h-14 rounded-full flex flex-col items-center justify-center border transition-all duration-150 z-10 ${
                  isCoachSpeaking
                    ? 'bg-[#4A6572] text-white border-[#2C3E50]'
                    : isRecording
                    ? 'bg-[#D5DBDB] dark:bg-[#161F30] text-[#2E4053] dark:text-[#E2E8F0] border-[#4A6572]'
                    : 'bg-[#ECEFF1] dark:bg-[#0B0F19] text-[#78909C] border-[#2C3E50]/25 dark:border-[#2E3F59]'
                }`}
              >
                {isCoachSpeaking ? (
                  <>
                    <Volume2 className="w-5 h-5 animate-pulse" />
                    <span className="text-[8px] font-mono font-bold uppercase mt-0.5">Speaking</span>
                  </>
                ) : isRecording ? (
                  <>
                    <Mic className="w-5 h-5 text-[#4A6572] dark:text-[#94A3B8] animate-pulse" />
                    <span className="text-[8px] font-mono font-bold uppercase mt-0.5">Active</span>
                  </>
                ) : (
                  <>
                    <MicOff className="w-5 h-5" />
                    <span className="text-[8px] font-mono uppercase mt-0.5">Paused</span>
                  </>
                )}
              </div>
            </div>

            {/* Status Label */}
            <div className="mt-3 text-center px-3">
              <p className="text-xs font-mono font-semibold text-[#2E4053] dark:text-[#E2E8F0]">
                {statusText}
              </p>
              <p className="text-[10px] text-[#546E7A] dark:text-[#94A3B8] font-sans mt-0.5">
                {isCoachSpeaking 
                  ? 'Coach responding via Zephyr (interruption supported)' 
                  : isRecording 
                  ? 'Speak naturally — coach listens and responds in real time' 
                  : 'Session standby'}
              </p>
            </div>
          </div>

          {/* Error Notification */}
          {errorMessage && (
            <div className="p-2.5 rounded border border-[#C0392B]/40 bg-[#C0392B]/10 text-[#C0392B] dark:text-[#EF4444] text-xs flex items-start gap-2">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <div className="flex-1 text-[11px]">
                <span className="font-bold">Error:</span> {errorMessage}
              </div>
              <button
                onClick={startLiveSession}
                className="px-2 py-0.5 rounded border border-[#C0392B]/40 text-[10px] font-mono hover:bg-[#C0392B]/20 flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" /> Retry
              </button>
            </div>
          )}

          {/* Quick Suggestion Chips */}
          <div>
            <div className="flex items-center gap-1.5 text-[11px] font-mono text-[#546E7A] dark:text-[#94A3B8] mb-1.5">
              <MessageSquare className="w-3 h-3" />
              <span>Prompt suggestions:</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {[
                "Explain like I'm 10 years old",
                "Quiz me on edge-case interview pitfalls",
                "How does this relate to database indexes?",
                "What is the biggest common misconception?"
              ].map((seed, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendPrompt(seed)}
                  className="px-2.5 py-1 rounded border border-[#2C3E50]/20 dark:border-[#2E3F59] bg-[#ECEFF1] dark:bg-[#0B0F19] text-[#2E4053] dark:text-[#E2E8F0] hover:border-[#4A6572] text-[11px] transition-colors cursor-pointer text-left font-sans"
                >
                  "{seed}"
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Actions Footer (shrink-0) */}
        <div className="px-4 py-2.5 border-t border-[#2C3E50]/20 dark:border-[#2E3F59] bg-[#ECEFF1] dark:bg-[#0B0F19] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-1.5 text-[10px] font-mono text-[#546E7A] dark:text-[#94A3B8]">
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-[#27AE60] animate-pulse' : 'bg-[#D35400]'}`} />
            <span>{isConnected ? '24kHz Live' : 'Disconnected'}</span>
          </div>

          <div className="flex items-center gap-2">
            {errorMessage ? (
              <button
                onClick={startLiveSession}
                className="px-2.5 py-1 rounded border border-[#2C3E50]/20 dark:border-[#2E3F59] bg-[#D5DBDB] dark:bg-[#161F30] font-mono text-xs text-[#2E4053] dark:text-[#E2E8F0] cursor-pointer flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" /> Reconnect
              </button>
            ) : null}

            <button
              onClick={onClose}
              className="px-3 py-1 rounded border border-[#2C3E50] dark:border-[#415A77] bg-[#4A6572] dark:bg-[#2E3F59] hover:bg-[#3A4F59] dark:hover:bg-[#3E5478] text-white font-mono text-xs transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
