import React, { useState, useRef, useEffect } from 'react';
import {
  Mic,
  Square,
  Sparkles,
  FileCode,
  X,
  Loader2,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Volume2,
  RotateCcw
} from 'lucide-react';
import type { ProcessInputResponse } from '../types.js';

interface InputModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (data: ProcessInputResponse) => void;
}

const TEMPLATES = [
  {
    title: 'Debugging Friction',
    content: `Ran into a weird race condition in Kubernetes rolling update with our Node.js service.
The service was throwing 502 Bad Gateway during pod eviction.
Discovered that Kubernetes removes the pod from EndpointSlice asynchronously after sending SIGTERM to the container.
Because our container exited immediately on SIGTERM, in-flight requests that were routed by kube-proxy failed.
Friction: We need to figure out why preStop sleep hook solves this and how graceful shutdown intervals interact with terminationGracePeriodSeconds.`
  },
  {
    title: 'Distributed Systems Note',
    content: `Studying Raft Consensus and leader elections.
When candidate nodes don't receive heartbeats within electionTimeout, they increment currentTerm and request votes.
Hit a major stumbling block: what happens when two candidates get split votes (2 vs 2 in a 4-node cluster) repeatedly?
The paper uses randomized election timers (150-300ms) so one timeout fires first.
Need to solidify how logs are rolled back if an uncommitted leader was partitioned.`
  },
  {
    title: 'Code / Architecture Dump',
    content: `// React Fiber Scheduler snippet
function workLoopConcurrent() {
  // Perform work until Scheduler asks us to yield
  while (workInProgress !== null && !shouldYield()) {
    performUnitOfWork(workInProgress);
  }
}
Friction point: How does React preserve in-progress fiber state across browser paint frames when user clicks an urgent input? Need to understand Lane priority masking.`
  }
];

export const InputModal: React.FC<InputModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [activeTab, setActiveTab] = useState<'text' | 'voice'>('text');
  const [rawText, setRawText] = useState('');

  // Audio Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [micPermissionError, setMicPermissionError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<number | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  // Submission State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [resultSummary, setResultSummary] = useState<ProcessInputResponse | null>(null);

  useEffect(() => {
    if (!isOpen) {
      stopRecording();
      setRawText('');
      setAudioBlob(null);
      setAudioUrl(null);
      setError(null);
      setResultSummary(null);
      setMicPermissionError(null);
    }
  }, [isOpen]);

  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [audioUrl]);

  const startRecording = async () => {
    setMicPermissionError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];

      const mimeType = MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : MediaRecorder.isTypeSupported('audio/mp4')
        ? 'audio/mp4'
        : '';

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const fullBlob = new Blob(audioChunksRef.current, {
          type: recorder.mimeType || 'audio/webm',
        });
        setAudioBlob(fullBlob);
        const url = URL.createObjectURL(fullBlob);
        setAudioUrl(url);
        stream.getTracks().forEach((track) => track.stop());
      };

      recorder.start(250);
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setRecordingDuration(0);

      timerIntervalRef.current = window.setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Microphone access denied:', err);
      setMicPermissionError(
        'Microphone access denied. You can paste notes or simulate voice memo via the text option.'
      );
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    setIsRecording(false);
  };

  const resetAudio = () => {
    stopRecording();
    setAudioBlob(null);
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    setRecordingDuration(0);
  };

  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const res = reader.result as string;
        const base64 = res.split(',')[1] || '';
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const handleSubmit = async () => {
    setError(null);
    setIsSubmitting(true);
    setStatusMessage('Analyzing knowledge dump with AI...');

    try {
      let audioBase64: string | undefined = undefined;
      let mimeType: string | undefined = undefined;

      if (audioBlob) {
        setStatusMessage('Encoding voice memo & preparing transcription...');
        audioBase64 = await blobToBase64(audioBlob);
        mimeType = audioBlob.type || 'audio/webm';
      }

      if (!rawText.trim() && !audioBase64) {
        setError('Please enter some notes/code or record a voice memo first.');
        setIsSubmitting(false);
        return;
      }

      setStatusMessage('Extracting macro-concepts & evaluating auto-merge...');

      const response = await fetch('/api/process-input', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rawText: rawText.trim(),
          audioBase64,
          mimeType,
          sessionType: 'dump',
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || data.error || 'Failed to process input');
      }

      setResultSummary(data);
      onSuccess(data);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Failed to process input');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1C140F]/60 dark:bg-black/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-[#FAF5EE] dark:bg-[#1E1611] border border-[#C8B69F] dark:border-[#473527] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#C8B69F] dark:border-[#473527] bg-[#F4ECE1]/80 dark:bg-[#18110D]/80">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#EFE3D5] dark:bg-[#2C211A] border border-[#C8B69F] dark:border-[#473527] flex items-center justify-center text-[#7F5539] dark:text-[#E0A878]">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-sketch text-xl font-bold text-[#2C1E16] dark:text-[#F3E9DD]">
                Ingest Study Notes &amp; Voice Memo
              </h2>
              <p className="text-xs text-[#5D4636] dark:text-[#C5B3A1]">
                Drop raw notes, stack traces, or spoken audio. Auto-merges into continuous graph nodes.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#8C6D53] dark:text-[#CBB6A1] hover:text-[#2C1E16] dark:hover:text-white hover:bg-[#EFE3D5] dark:hover:bg-[#2C211A] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-[#C8B69F] dark:border-[#473527] bg-[#F4ECE1] dark:bg-[#18110D] px-6 pt-2.5 gap-2 font-sketch font-bold">
          <button
            onClick={() => setActiveTab('text')}
            className={`flex items-center gap-2 px-4 py-2 rounded-t-lg text-xs transition-all border-b-2 ${
              activeTab === 'text'
                ? 'border-[#7F5539] dark:border-[#E0A878] text-[#7F5539] dark:text-[#E0A878] bg-[#FAF5EE] dark:bg-[#1E1611]'
                : 'border-transparent text-[#8C6D53] dark:text-[#A7927F] hover:text-[#2C1E16] dark:hover:text-white'
            }`}
          >
            <FileCode className="w-4 h-4" />
            Text &amp; Code Excerpt
          </button>
          <button
            onClick={() => setActiveTab('voice')}
            className={`flex items-center gap-2 px-4 py-2 rounded-t-lg text-xs transition-all border-b-2 ${
              activeTab === 'voice'
                ? 'border-[#7F5539] dark:border-[#E0A878] text-[#7F5539] dark:text-[#E0A878] bg-[#FAF5EE] dark:bg-[#1E1611]'
                : 'border-transparent text-[#8C6D53] dark:text-[#A7927F] hover:text-[#2C1E16] dark:hover:text-white'
            }`}
          >
            <Mic className="w-4 h-4" />
            Voice Memo
            {audioBlob && (
              <span className="w-2 h-2 rounded-full bg-[#16A34A]" />
            )}
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {error && (
            <div className="p-3 rounded-lg bg-[#FFEDD5] border border-[#FDBA74] text-[#9A3412] dark:bg-[#431407] dark:border-[#991B1B] dark:text-[#FCA5A5] text-xs flex items-start gap-2.5 font-sketch">
              <AlertCircle className="w-4 h-4 shrink-0 text-[#EA580C] mt-0.5" />
              <div>{error}</div>
            </div>
          )}

          {resultSummary ? (
            <div className="space-y-4 animate-in fade-in duration-300">
              <div className="p-4 rounded-xl bg-[#DCFCE7] dark:bg-[#052E16] border border-[#86EFAC] dark:border-[#15803D] text-[#166534] dark:text-[#86EFAC]">
                <div className="flex items-center gap-2 font-sketch font-bold text-sm mb-1">
                  <CheckCircle2 className="w-5 h-5 text-[#16A34A]" />
                  Knowledge Graph Updated Successfully!
                </div>
                <p className="text-xs text-[#14532D] dark:text-[#BBF7D0] leading-relaxed">
                  {resultSummary.ai_notes}
                </p>
                {resultSummary.transcription && (
                  <div className="mt-2.5 p-2.5 rounded-lg bg-[#FAF5EE] dark:bg-[#1E1611] border border-[#C8B69F] dark:border-[#473527] text-[11px] text-[#2C1E16] dark:text-[#F3E9DD] font-mono">
                    <span className="font-bold block mb-0.5 text-[#7F5539] dark:text-[#E0A878]">
                      Transcribed Audio:
                    </span>
                    &ldquo;{resultSummary.transcription}&rdquo;
                  </div>
                )}
              </div>

              {/* Created vs Merged breakdown */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-[#F4ECE1] dark:bg-[#18110D] border border-[#D6C4B0] dark:border-[#473527]">
                  <span className="font-sketch font-bold text-[#7F5539] dark:text-[#E0A878] block mb-1">
                    Auto-Merged Concepts ({resultSummary.updated_concepts.length})
                  </span>
                  {resultSummary.updated_concepts.length > 0 ? (
                    <ul className="list-disc list-inside text-[#3E2C1E] dark:text-[#D1BEAB] space-y-0.5">
                      {resultSummary.updated_concepts.map((c) => (
                        <li key={c.id} className="truncate">
                          {c.title} (Mastery: {c.mastery_score}/5)
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <span className="text-[#8C6D53] dark:text-[#A7927F] text-[11px]">
                      No existing concepts updated.
                    </span>
                  )}
                </div>

                <div className="p-3 rounded-xl bg-[#F4ECE1] dark:bg-[#18110D] border border-[#D6C4B0] dark:border-[#473527]">
                  <span className="font-sketch font-bold text-[#15803D] dark:text-[#4ADE80] block mb-1">
                    New Macro-Nodes Created ({resultSummary.new_concepts.length})
                  </span>
                  {resultSummary.new_concepts.length > 0 ? (
                    <ul className="list-disc list-inside text-[#3E2C1E] dark:text-[#D1BEAB] space-y-0.5">
                      {resultSummary.new_concepts.map((c) => (
                        <li key={c.id} className="truncate">
                          {c.title}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <span className="text-[#8C6D53] dark:text-[#A7927F] text-[11px]">
                      Anti-explosion: merged into existing nodes.
                    </span>
                  )}
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2 rounded-xl text-xs font-sketch font-bold bg-[#7F5539] hover:bg-[#68442B] dark:bg-[#E0A878] dark:hover:bg-[#D49865] text-white dark:text-[#16100C] transition-all shadow-xs"
                >
                  View on Canvas
                </button>
              </div>
            </div>
          ) : (
            <>
              {activeTab === 'text' && (
                <div className="space-y-3">
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                    <span className="text-[11px] font-sketch font-bold text-[#8C6D53] dark:text-[#A7927F] shrink-0">
                      Sample Dumps:
                    </span>
                    {TEMPLATES.map((tmpl, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setRawText(tmpl.content)}
                        className="px-2.5 py-1 rounded-md text-[11px] font-sketch bg-[#EFE3D5] dark:bg-[#2C211A] hover:bg-[#E6D7C5] dark:hover:bg-[#382B20] text-[#5D4636] dark:text-[#D1BEAB] transition-colors whitespace-nowrap"
                      >
                        {tmpl.title}
                      </button>
                    ))}
                  </div>

                  <textarea
                    rows={8}
                    placeholder="Paste notes, stack traces, code snippets, or book excerpts here...
E.g., 'Spent 2 hours debugging PostgreSQL connection pooling. Found max_connections reached because workers held idle TCP connections...'"
                    value={rawText}
                    onChange={(e) => setRawText(e.target.value)}
                    className="w-full p-3.5 text-xs font-mono bg-[#F4ECE1] dark:bg-[#16100C] border border-[#C8B69F] dark:border-[#473527] rounded-xl text-[#2C1E16] dark:text-[#F3E9DD] placeholder-[#8E7662] dark:placeholder-[#8C7664] focus:outline-none focus:border-[#7F5539] dark:focus:border-[#E0A878] transition-all leading-relaxed"
                  />

                  <div className="flex items-center gap-2 text-[11px] text-[#8C6D53] dark:text-[#A7927F]">
                    <HelpCircle className="w-3.5 h-3.5 text-[#7F5539] dark:text-[#E0A878] shrink-0" />
                    <span>
                      <strong>Anti-Explosion Rule:</strong> The AI extracts macro-concepts and updates existing graph nodes rather than duplicating them.
                    </span>
                  </div>
                </div>
              )}

              {activeTab === 'voice' && (
                <div className="space-y-4">
                  {micPermissionError && (
                    <div className="p-3 rounded-lg bg-[#FEF3C7] border border-[#FDE68A] text-[#854D0E] dark:bg-[#451A03] dark:border-[#92400E] dark:text-[#FDE047] text-xs font-sketch">
                      {micPermissionError}
                    </div>
                  )}

                  <div className="p-8 rounded-xl bg-[#F4ECE1] dark:bg-[#18110D] border border-[#D6C4B0] dark:border-[#3E2D20] flex flex-col items-center justify-center text-center">
                    {isRecording ? (
                      <div className="space-y-4">
                        <div className="relative flex items-center justify-center">
                          <span className="absolute w-24 h-24 rounded-full bg-[#EA580C]/20 animate-ping" />
                          <div className="w-20 h-20 rounded-full bg-[#C2410C] flex items-center justify-center text-white shadow-md">
                            <Mic className="w-8 h-8 animate-pulse" />
                          </div>
                        </div>

                        <div className="text-xl font-mono font-bold text-[#C2410C] dark:text-[#FCA5A5]">
                          {Math.floor(recordingDuration / 60)}:
                          {(recordingDuration % 60).toString().padStart(2, '0')}
                        </div>

                        <p className="text-xs text-[#5D4636] dark:text-[#C5B3A1] max-w-sm font-hand text-base">
                          Speaking your study notes... Describe what you learned and where you hit friction.
                        </p>

                        <button
                          type="button"
                          onClick={stopRecording}
                          className="px-6 py-2.5 rounded-xl bg-[#FAF5EE] dark:bg-[#2C211A] border border-[#C8B69F] dark:border-[#473527] text-[#2C1E16] dark:text-[#F3E9DD] font-sketch font-bold text-xs flex items-center gap-2 transition-all mx-auto"
                        >
                          <Square className="w-4 h-4 text-[#C2410C] fill-current" />
                          Stop Recording
                        </button>
                      </div>
                    ) : audioBlob ? (
                      <div className="space-y-4 w-full max-w-md">
                        <div className="w-14 h-14 rounded-full bg-[#DCFCE7] dark:bg-[#052E16] border border-[#86EFAC] dark:border-[#15803D] flex items-center justify-center text-[#16A34A] mx-auto">
                          <Volume2 className="w-7 h-7" />
                        </div>

                        <div>
                          <div className="text-sm font-sketch font-bold text-[#2C1E16] dark:text-[#F3E9DD]">
                            Voice Memo Recorded ({recordingDuration}s)
                          </div>
                          <p className="text-xs text-[#8C6D53] dark:text-[#A7927F] mt-0.5">
                            Ready to transcribe &amp; merge into your sketch graph.
                          </p>
                        </div>

                        {audioUrl && (
                          <audio
                            ref={audioPlayerRef}
                            src={audioUrl}
                            controls
                            className="w-full h-10 rounded-lg filter sepia"
                          />
                        )}

                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={resetAudio}
                            className="px-4 py-2 rounded-xl bg-[#EFE3D5] dark:bg-[#2C211A] text-[#5D4636] dark:text-[#D1BEAB] text-xs font-sketch font-bold flex items-center gap-1.5 transition-all"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            Record Again
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <button
                          type="button"
                          onClick={startRecording}
                          className="w-20 h-20 rounded-full bg-[#7F5539] hover:bg-[#68442B] dark:bg-[#E0A878] dark:hover:bg-[#D49865] flex items-center justify-center text-white dark:text-[#16100C] shadow-md transition-transform hover:scale-105 mx-auto"
                        >
                          <Mic className="w-8 h-8" />
                        </button>

                        <div>
                          <h4 className="text-sm font-sketch font-bold text-[#2C1E16] dark:text-[#F3E9DD]">
                            Tap to Record Voice Memo
                          </h4>
                          <p className="text-xs text-[#8C6D53] dark:text-[#A7927F] mt-1 max-w-sm">
                            Speak freely about what you just built or read. Great for quick study recaps.
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setRawText(
                              `[Spoken Memo] "I was diving into Kafka partitions versus consumer groups. When we have 3 partitions and 4 consumers in the same group, one consumer sits idle. The stumbling block was figuring out how partition rebalancing works with eager versus cooperative rebalance protocols."`
                            );
                            setActiveTab('text');
                          }}
                          className="text-[11px] font-sketch font-bold text-[#7F5539] dark:text-[#E0A878] hover:underline block mx-auto"
                        >
                          Or simulate voice memo with prefilled text
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer */}
        {!resultSummary && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-[#C8B69F] dark:border-[#473527] bg-[#F4ECE1]/80 dark:bg-[#18110D]/80">
            <div className="text-xs text-[#8C6D53] dark:text-[#A7927F] font-sketch">
              {isSubmitting ? (
                <span className="flex items-center gap-2 text-[#7F5539] dark:text-[#E0A878] font-bold">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {statusMessage}
                </span>
              ) : (
                <span>Extracts macro-concepts &amp; preserves study history.</span>
              )}
            </div>

            <div className="flex items-center gap-2 font-sketch font-bold">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl text-xs text-[#8C6D53] dark:text-[#A7927F] hover:text-[#2C1E16] dark:hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting || (!rawText.trim() && !audioBlob)}
                className="px-5 py-2 rounded-xl text-xs bg-[#7F5539] hover:bg-[#68442B] dark:bg-[#E0A878] dark:hover:bg-[#D49865] disabled:opacity-50 text-white dark:text-[#16100C] transition-all shadow-xs flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Synthesize &amp; Merge
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
