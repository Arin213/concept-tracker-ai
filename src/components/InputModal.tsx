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
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-2xl bg-[#D5DBDB] dark:bg-[#161F30] border border-[#2C3E50]/40 dark:border-[#2E3F59] rounded-md overflow-hidden flex flex-col max-h-[85vh]"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#2C3E50]/20 dark:border-[#2E3F59] bg-[#ECEFF1] dark:bg-[#0B0F19] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded border border-[#2C3E50]/25 dark:border-[#2E3F59] bg-[#D5DBDB] dark:bg-[#161F30] flex items-center justify-center text-[#4A6572] dark:text-[#E2E8F0]">
              <Sparkles className="w-4 h-4 text-[#4A6572] dark:text-[#E2E8F0]" />
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-tight text-[#2E4053] dark:text-[#E2E8F0]">
                Ingest Study Notes &amp; Voice Memo
              </h2>
              <p className="text-[11px] text-[#546E7A] dark:text-[#94A3B8]">
                Drop raw notes, stack traces, or spoken audio. Auto-merges into continuous graph nodes.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-[#546E7A] dark:text-[#94A3B8] hover:text-[#2E4053] dark:hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-[#2C3E50]/20 dark:border-[#2E3F59] bg-[#ECEFF1] dark:bg-[#0B0F19] px-5 pt-2 gap-2 text-xs font-mono shrink-0">
          <button
            onClick={() => setActiveTab('text')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-t border-t border-l border-r text-xs transition-colors cursor-pointer ${
              activeTab === 'text'
                ? 'border-[#2C3E50]/30 dark:border-[#2E3F59] text-[#2E4053] dark:text-[#E2E8F0] bg-[#D5DBDB] dark:bg-[#161F30] font-bold'
                : 'border-transparent text-[#546E7A] dark:text-[#94A3B8] hover:text-[#2E4053] dark:hover:text-white'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            Text &amp; Code Excerpt
          </button>
          <button
            onClick={() => setActiveTab('voice')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-t border-t border-l border-r text-xs transition-colors cursor-pointer ${
              activeTab === 'voice'
                ? 'border-[#2C3E50]/30 dark:border-[#2E3F59] text-[#2E4053] dark:text-[#E2E8F0] bg-[#D5DBDB] dark:bg-[#161F30] font-bold'
                : 'border-transparent text-[#546E7A] dark:text-[#94A3B8] hover:text-[#2E4053] dark:hover:text-white'
            }`}
          >
            <Mic className="w-3.5 h-3.5" />
            Voice Memo
            {audioBlob && (
              <span className="w-2 h-2 rounded-full bg-[#27AE60]" />
            )}
          </button>
        </div>

        {/* Tab Body (scrollable) */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1 min-h-0">
          {error && (
            <div className="p-2.5 rounded border border-[#C0392B]/40 bg-[#C0392B]/10 text-[#C0392B] dark:text-[#EF4444] text-xs flex items-start gap-2">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <div>{error}</div>
            </div>
          )}

          {resultSummary ? (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="p-3.5 rounded border border-[#27AE60]/40 bg-[#27AE60]/10 text-[#27AE60] dark:text-[#10B981]">
                <div className="flex items-center gap-2 font-mono font-bold text-xs mb-1">
                  <CheckCircle2 className="w-4 h-4 text-[#27AE60] dark:text-[#10B981]" />
                  Knowledge Graph Updated Successfully
                </div>
                <p className="text-xs text-[#2E4053] dark:text-[#E2E8F0] leading-relaxed">
                  {resultSummary.ai_notes}
                </p>
                {resultSummary.transcription && (
                  <div className="mt-2 p-2 rounded border border-[#2C3E50]/20 dark:border-[#2E3F59] bg-[#ECEFF1] dark:bg-[#0B0F19] text-[11px] text-[#2E4053] dark:text-[#E2E8F0] font-mono">
                    <span className="font-bold block mb-0.5 text-[#4A6572] dark:text-[#94A3B8]">
                      Transcribed Audio:
                    </span>
                    &ldquo;{resultSummary.transcription}&rdquo;
                  </div>
                )}
              </div>

              {/* Created vs Merged breakdown */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded border border-[#2C3E50]/20 dark:border-[#2E3F59] bg-[#ECEFF1] dark:bg-[#0B0F19]">
                  <span className="font-mono font-bold text-[#4A6572] dark:text-[#94A3B8] block mb-1">
                    Auto-Merged Concepts ({resultSummary.updated_concepts.length})
                  </span>
                  {resultSummary.updated_concepts.length > 0 ? (
                    <ul className="list-disc list-inside text-[#2E4053] dark:text-[#E2E8F0] space-y-0.5">
                      {resultSummary.updated_concepts.map((c) => (
                        <li key={c.id} className="truncate">
                          {c.title} (Mastery: {c.mastery_score}/5)
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <span className="text-[#546E7A] dark:text-[#94A3B8] text-[11px]">
                      No existing concepts updated.
                    </span>
                  )}
                </div>

                <div className="p-3 rounded border border-[#2C3E50]/20 dark:border-[#2E3F59] bg-[#ECEFF1] dark:bg-[#0B0F19]">
                  <span className="font-mono font-bold text-[#27AE60] dark:text-[#10B981] block mb-1">
                    New Macro-Nodes Created ({resultSummary.new_concepts.length})
                  </span>
                  {resultSummary.new_concepts.length > 0 ? (
                    <ul className="list-disc list-inside text-[#2E4053] dark:text-[#E2E8F0] space-y-0.5">
                      {resultSummary.new_concepts.map((c) => (
                        <li key={c.id} className="truncate">
                          {c.title}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <span className="text-[#546E7A] dark:text-[#94A3B8] text-[11px]">
                      Anti-explosion: merged into existing nodes.
                    </span>
                  )}
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-1.5 rounded border border-[#2C3E50] dark:border-[#415A77] bg-[#4A6572] hover:bg-[#3A4F59] dark:bg-[#2E3F59] dark:hover:bg-[#3E5478] text-white text-xs font-mono transition-colors cursor-pointer"
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
                    <span className="text-[11px] font-mono font-semibold text-[#546E7A] dark:text-[#94A3B8] shrink-0">
                      Sample Dumps:
                    </span>
                    {TEMPLATES.map((tmpl, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setRawText(tmpl.content)}
                        className="px-2 py-0.5 rounded border border-[#2C3E50]/20 dark:border-[#2E3F59] bg-[#ECEFF1] dark:bg-[#0B0F19] hover:border-[#4A6572] text-[11px] font-mono text-[#2E4053] dark:text-[#E2E8F0] transition-colors whitespace-nowrap cursor-pointer"
                      >
                        {tmpl.title}
                      </button>
                    ))}
                  </div>

                  <textarea
                    rows={7}
                    placeholder="Paste notes, stack traces, code snippets, or book excerpts here..."
                    value={rawText}
                    onChange={(e) => setRawText(e.target.value)}
                    className="w-full p-3 text-xs font-mono bg-[#ECEFF1] dark:bg-[#0B0F19] border border-[#2C3E50]/25 dark:border-[#2E3F59] rounded text-[#2E4053] dark:text-[#E2E8F0] placeholder-[#78909C] dark:placeholder-[#64748B] focus:outline-none focus:border-[#4A6572] transition-colors leading-relaxed resize-none"
                  />

                  <div className="flex items-center gap-2 text-[11px] text-[#546E7A] dark:text-[#94A3B8]">
                    <HelpCircle className="w-3.5 h-3.5 text-[#4A6572] dark:text-[#94A3B8] shrink-0" />
                    <span>
                      <strong>Anti-Explosion Rule:</strong> The AI extracts macro-concepts and updates existing graph nodes rather than duplicating them.
                    </span>
                  </div>
                </div>
              )}

              {activeTab === 'voice' && (
                <div className="space-y-3">
                  {micPermissionError && (
                    <div className="p-2.5 rounded border border-[#D35400]/40 bg-[#D35400]/10 text-[#D35400] text-xs font-mono">
                      {micPermissionError}
                    </div>
                  )}

                  <div className="p-6 rounded border border-[#2C3E50]/20 dark:border-[#2E3F59] bg-[#ECEFF1] dark:bg-[#0B0F19] flex flex-col items-center justify-center text-center">
                    {isRecording ? (
                      <div className="space-y-3">
                        <div className="w-16 h-16 rounded-full border border-[#C0392B] bg-[#C0392B] flex items-center justify-center text-white animate-pulse mx-auto">
                          <Mic className="w-6 h-6" />
                        </div>

                        <div className="text-lg font-mono font-bold text-[#C0392B] dark:text-[#EF4444]">
                          {Math.floor(recordingDuration / 60)}:
                          {(recordingDuration % 60).toString().padStart(2, '0')}
                        </div>

                        <p className="text-xs text-[#546E7A] dark:text-[#94A3B8]">
                          Recording study notes... Describe what you learned and where you hit friction.
                        </p>

                        <button
                          type="button"
                          onClick={stopRecording}
                          className="px-4 py-1.5 rounded border border-[#C0392B] bg-[#D5DBDB] dark:bg-[#161F30] text-[#C0392B] dark:text-[#EF4444] font-mono text-xs flex items-center gap-1.5 transition-colors mx-auto cursor-pointer"
                        >
                          <Square className="w-3.5 h-3.5 fill-current" />
                          Stop Recording
                        </button>
                      </div>
                    ) : audioBlob ? (
                      <div className="space-y-3 w-full max-w-sm">
                        <div className="w-12 h-12 rounded-full border border-[#27AE60]/40 bg-[#27AE60]/15 flex items-center justify-center text-[#27AE60] dark:text-[#10B981] mx-auto">
                          <Volume2 className="w-6 h-6" />
                        </div>

                        <div>
                          <div className="text-xs font-mono font-bold text-[#2E4053] dark:text-[#E2E8F0]">
                            Voice Memo Recorded ({recordingDuration}s)
                          </div>
                          <p className="text-[11px] text-[#546E7A] dark:text-[#94A3B8] mt-0.5">
                            Ready to transcribe &amp; merge into your concept graph.
                          </p>
                        </div>

                        {audioUrl && (
                          <audio
                            ref={audioPlayerRef}
                            src={audioUrl}
                            controls
                            className="w-full h-8 rounded"
                          />
                        )}

                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={resetAudio}
                            className="px-3 py-1 rounded border border-[#2C3E50]/20 dark:border-[#2E3F59] bg-[#D5DBDB] dark:bg-[#161F30] text-[#2E4053] dark:text-[#E2E8F0] text-xs font-mono flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <RotateCcw className="w-3 h-3" />
                            Record Again
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <button
                          type="button"
                          onClick={startRecording}
                          className="w-14 h-14 rounded-full border border-[#2C3E50] dark:border-[#415A77] bg-[#4A6572] hover:bg-[#3A4F59] dark:bg-[#2E3F59] dark:hover:bg-[#3E5478] flex items-center justify-center text-white transition-colors mx-auto cursor-pointer"
                        >
                          <Mic className="w-6 h-6" />
                        </button>

                        <div>
                          <h4 className="text-xs font-mono font-bold text-[#2E4053] dark:text-[#E2E8F0]">
                            Record Voice Memo
                          </h4>
                          <p className="text-[11px] text-[#546E7A] dark:text-[#94A3B8] mt-0.5 max-w-sm">
                            Speak freely about what you just built or read.
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
                          className="text-[11px] font-mono text-[#4A6572] dark:text-[#94A3B8] hover:underline block mx-auto cursor-pointer"
                        >
                          Prefill sample audio transcription
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer (shrink-0) */}
        {!resultSummary && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-[#2C3E50]/20 dark:border-[#2E3F59] bg-[#ECEFF1] dark:bg-[#0B0F19] shrink-0">
            <div className="text-[11px] text-[#546E7A] dark:text-[#94A3B8] font-mono">
              {isSubmitting ? (
                <span className="flex items-center gap-2 text-[#4A6572] dark:text-[#94A3B8] font-bold">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  {statusMessage}
                </span>
              ) : (
                <span>Auto-resolves macro concepts &amp; prevents node explosion.</span>
              )}
            </div>

            <div className="flex items-center gap-2 font-mono">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-3 py-1 rounded text-xs text-[#546E7A] dark:text-[#94A3B8] hover:text-[#2E4053] dark:hover:text-white transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting || (!rawText.trim() && !audioBlob)}
                className="px-4 py-1.5 rounded border border-[#2C3E50] dark:border-[#415A77] bg-[#4A6572] hover:bg-[#3A4F59] dark:bg-[#2E3F59] dark:hover:bg-[#3E5478] disabled:opacity-40 text-white text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
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
