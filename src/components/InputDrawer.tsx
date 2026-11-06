import React, { useState, useRef } from 'react';
import { Mic, Square, Send, Loader2, Sparkles, ChevronUp, ChevronDown, PenTool } from 'lucide-react';

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
        // Convert to base64 for API
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
      console.error('Failed to start recording:', err);
      alert('Microphone access denied or unsupported in this browser.');
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
    <div className="fixed bottom-6 left-6 z-30 transition-all duration-300">
      {!isExpanded ? (
        <button
          onClick={() => setIsExpanded(true)}
          className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-[#FAF5EE]/95 dark:bg-[#1E1611]/95 text-[#2C1E16] dark:text-[#F3E9DD] border border-[#C8B69F] dark:border-[#473527] shadow-lg hover:shadow-xl hover:scale-105 transition-all text-xs font-sketch font-bold cursor-pointer backdrop-blur-md"
        >
          <PenTool className="w-4 h-4 text-[#7F5539] dark:text-[#E0A878]" />
          <span>Quick Brain Dump</span>
          <span className="w-2 h-2 rounded-full bg-[#C2410C] animate-pulse" />
        </button>
      ) : (
        <div className="bg-[#FAF5EE]/98 dark:bg-[#1E1611]/98 border border-[#C8B69F] dark:border-[#473527] p-4 rounded-2xl shadow-2xl w-88 sm:w-96 text-[#2C1E16] dark:text-[#F3E9DD] animate-in slide-in-from-bottom duration-200 backdrop-blur-md">
          {/* Header */}
          <div className="flex items-center justify-between mb-2 pb-2 border-b border-[#E8DCCF] dark:border-[#33241A]">
            <div className="flex items-center gap-2">
              <span className="text-sm">🧠</span>
              <h3 className="text-xs font-sketch font-bold tracking-tight text-[#2C1E16] dark:text-[#F3E9DD]">
                Quick Brain Dump & Voice Memo
              </h3>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={onOpenFullModal}
                className="text-[10px] text-[#7F5539] dark:text-[#E0A878] hover:underline font-sketch font-bold mr-1 cursor-pointer"
                title="Open Advanced Ingestion Studio"
              >
                Expand Studio
              </button>
              <button
                type="button"
                onClick={() => setIsExpanded(false)}
                className="text-[#8C6D53] hover:text-[#2C1E16] dark:hover:text-white p-0.5 rounded cursor-pointer"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Text input area */}
          <textarea
            className="w-full bg-[#F3EAE0] dark:bg-[#2A1E17] border border-[#D6C4B0] dark:border-[#473527] rounded-xl p-2.5 text-xs text-[#2C1E16] dark:text-[#F3E9DD] placeholder-[#8C6D53] dark:placeholder-[#9C826E] mb-3 focus:outline-none focus:ring-1 focus:ring-[#7F5539] font-mono resize-none"
            rows={3}
            placeholder="Paste code snippet, bug stack trace, or quick study note..."
            value={text}
            onChange={(e) => setText(e.target.value)}
          />

          {/* Actions */}
          <div className="flex items-center justify-between gap-2">
            <button
              onClick={() => submitInput('text')}
              disabled={loading || !text.trim()}
              className="px-3.5 py-1.5 rounded-xl bg-[#7F5539] hover:bg-[#68442B] dark:bg-[#E0A878] dark:hover:bg-[#D49865] text-white dark:text-[#16100C] text-xs font-sketch font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Submit Text</span>
                </>
              )}
            </button>

            <button
              onClick={isRecording ? stopRecording : startRecording}
              className={`px-3 py-1.5 rounded-xl text-xs font-sketch font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs ${
                isRecording
                  ? 'bg-[#C2410C] text-white animate-pulse'
                  : 'bg-[#EFE3D5] dark:bg-[#2C211A] text-[#7F5539] dark:text-[#E0A878] border border-[#D6C4B0] dark:border-[#473527] hover:bg-[#E5D7C7]'
              }`}
            >
              {isRecording ? (
                <>
                  <Square className="w-3 h-3 fill-current" />
                  <span>Stop & Process</span>
                </>
              ) : (
                <>
                  <Mic className="w-3.5 h-3.5 text-[#C2410C]" />
                  <span>Record Voice</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
