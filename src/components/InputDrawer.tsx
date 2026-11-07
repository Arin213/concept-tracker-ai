import React, { useState, useRef } from 'react';
import { Mic, Square, Send, Loader2, ChevronDown, PenTool } from 'lucide-react';

interface InputDrawerProps {
  userId?: string;
  onProcessed: () => void;
  onOpenFullModal: () => void;
}

export function InputDrawer({ userId = 'usr_current', onProcessed, onOpenFullModal }: InputDrawerProps) {
  const [text, setText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      audioChunksRef.current = [];
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64Audio = (reader.result as string)?.split(',')[1];
          if (base64Audio) {
            await submitInput('audio', base64Audio);
          }
        };
        reader.readAsDataURL(audioBlob);
        stream.getTracks().forEach((track) => track.stop());
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
    } catch (err) {
      console.warn('Microphone access denied or unsupported in this browser:', err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const submitInput = async (type: 'text' | 'audio', audioBase64?: string) => {
    setLoading(true);
    try {
      const payload: any = {
        userId,
        inputType: type,
        sessionType: 'dump'
      };

      if (type === 'text') {
        payload.rawText = text;
        payload.text = text;
      }

      if (type === 'audio' && audioBase64) {
        payload.audioBase64 = audioBase64;
        payload.mimeType = 'audio/webm';
        if (text.trim()) {
          payload.rawText = text;
          payload.text = text;
        }
      }

      const res = await fetch('/api/process-input', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setText('');
        onProcessed();
        setIsExpanded(false);
      } else {
        const err = await res.json();
        console.error('Process error:', err);
      }
    } catch (err) {
      console.error('Submission failed:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-3 sm:bottom-4 left-3 sm:left-4 z-30 select-none max-w-[calc(100vw-24px)]">
      {!isExpanded ? (
        <button
          onClick={() => setIsExpanded(true)}
          className="flex items-center gap-2 px-3 py-2 rounded-md bg-[#D5DBDB] dark:bg-[#161F30] text-[#2E4053] dark:text-[#E2E8F0] border border-[#2C3E50]/30 dark:border-[#2E3F59] hover:border-[#4A6572] transition-colors text-xs font-mono cursor-pointer"
        >
          <PenTool className="w-3.5 h-3.5 text-[#4A6572] dark:text-[#94A3B8]" />
          <span className="hidden sm:inline">Quick Note Drop</span>
          <span className="sm:hidden">Quick Note</span>
        </button>
      ) : (
        <div className="bg-[#D5DBDB] dark:bg-[#161F30] border border-[#2C3E50]/40 dark:border-[#2E3F59] p-3 rounded-md w-[calc(100vw-24px)] sm:w-80 max-w-sm text-[#2E4053] dark:text-[#E2E8F0]">
          {/* Header */}
          <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-[#2C3E50]/15 dark:border-[#2E3F59]">
            <span className="text-xs font-bold tracking-tight text-[#2E4053] dark:text-[#E2E8F0]">
              Quick Brain Dump
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={onOpenFullModal}
                className="text-[10px] text-[#4A6572] dark:text-[#94A3B8] hover:underline font-mono cursor-pointer"
              >
                Studio
              </button>
              <button
                type="button"
                onClick={() => setIsExpanded(false)}
                className="text-[#546E7A] hover:text-[#2E4053] dark:hover:text-white p-0.5 rounded cursor-pointer"
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Text input area */}
          <textarea
            className="w-full bg-[#ECEFF1] dark:bg-[#0B0F19] border border-[#2C3E50]/20 dark:border-[#2E3F59] rounded p-2 text-xs text-[#2E4053] dark:text-[#E2E8F0] placeholder-[#78909C] dark:placeholder-[#64748B] mb-2.5 focus:outline-none focus:border-[#4A6572] font-mono resize-none"
            rows={3}
            placeholder="Paste raw notes, code snippet, or error log..."
            value={text}
            onChange={(e) => setText(e.target.value)}
          />

          {/* Actions */}
          <div className="flex items-center justify-between gap-2">
            <button
              onClick={() => submitInput('text')}
              disabled={loading || !text.trim()}
              className="px-2.5 py-1 rounded border border-[#2C3E50] dark:border-[#415A77] bg-[#4A6572] dark:bg-[#2E3F59] hover:bg-[#3A4F59] dark:hover:bg-[#3E5478] text-white text-xs font-mono transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>Processing</span>
                </>
              ) : (
                <>
                  <Send className="w-3 h-3" />
                  <span>Submit</span>
                </>
              )}
            </button>

            <button
              onClick={isRecording ? stopRecording : startRecording}
              className={`px-2.5 py-1 rounded text-xs font-mono transition-colors flex items-center gap-1 cursor-pointer border ${
                isRecording
                  ? 'border-[#C0392B] bg-[#C0392B] text-white animate-pulse'
                  : 'border-[#2C3E50]/25 dark:border-[#2E3F59] bg-[#ECEFF1] dark:bg-[#0B0F19] text-[#2E4053] dark:text-[#E2E8F0] hover:bg-[#DFE4E6] dark:hover:bg-[#1B263B]'
              }`}
            >
              {isRecording ? (
                <>
                  <Square className="w-2.5 h-2.5 fill-current" />
                  <span>Stop</span>
                </>
              ) : (
                <>
                  <Mic className="w-3 h-3 text-[#C0392B] dark:text-[#EF4444]" />
                  <span>Record</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
