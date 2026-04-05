import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Mic, X, Volume2, RotateCcw, MessageSquare, VolumeX, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { api } from "@shared/routes";

type Message = { role: "user" | "assistant"; text: string };
type Status = "idle" | "listening" | "thinking" | "speaking";

const STATUS_TEXT: Record<Status, string> = {
  idle: "اضغط للتحدث",
  listening: "أنا أستمع...",
  thinking: "جاري التفكير...",
  speaking: "أبو اليزيد يتحدث...",
};

const SpeechRecognition =
  (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

export default function VoicePage() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const [, setLocation] = useLocation();

  // Load user preferences
  const { data: prefs } = useQuery({
    queryKey: [api.user.getPreferences.path],
    queryFn: async () => {
      const res = await fetch(api.user.getPreferences.path, { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!user,
  });

  const autoPlay: boolean = prefs?.voiceAutoPlay ?? true;
  const [continuousMode, setContinuousMode] = useState(false);

  // Sync continuous mode from prefs once loaded
  useEffect(() => {
    if (prefs?.continuousVoice !== undefined) {
      setContinuousMode(prefs.continuousVoice);
    }
  }, [prefs]);

  const [status, setStatus] = useState<Status>("idle");
  const [messages, setMessages] = useState<Message[]>([]);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState("");
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeechSupported] = useState(() => !!SpeechRecognition);

  const recognitionRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const continuousRef = useRef(continuousMode);

  useEffect(() => {
    continuousRef.current = continuousMode;
  }, [continuousMode]);

  // Auth guard
  useEffect(() => {
    if (!isAuthLoading && !user) {
      window.location.href = "/api/login";
    }
  }, [user, isAuthLoading]);

  // Auto scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, transcript]);

  const stopAll = useCallback(() => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    window.speechSynthesis?.cancel();
    abortRef.current?.abort();
    abortRef.current = null;
  }, []);

  const startListening = useCallback(() => {
    if (!SpeechRecognition) {
      setError("المتصفح لا يدعم التعرف على الصوت. جرب Chrome أو Edge.");
      return;
    }
    setError("");
    setTranscript("");

    const rec = new SpeechRecognition();
    rec.lang = "ar-SA";
    rec.continuous = false;
    rec.interimResults = true;
    rec.maxAlternatives = 1;

    let finalTranscript = "";

    rec.onresult = (e: any) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) {
          finalTranscript += e.results[i][0].transcript;
        } else {
          interim += e.results[i][0].transcript;
        }
      }
      setTranscript(finalTranscript || interim);
    };

    rec.onend = () => {
      recognitionRef.current = null;
      const text = finalTranscript.trim();
      setTranscript("");
      if (text) {
        sendToAI(text);
      } else {
        setStatus("idle");
      }
    };

    rec.onerror = (e: any) => {
      recognitionRef.current = null;
      if (e.error === "not-allowed" || e.error === "permission-denied") {
        setError("الميكروفون غير متاح. يرجى السماح بالوصول إليه.");
      } else if (e.error === "no-speech") {
        setStatus("idle");
      } else if (e.error !== "aborted") {
        setError("حدث خطأ أثناء التعرف على الصوت.");
      }
      setStatus("idle");
    };

    try {
      recognitionRef.current = rec;
      rec.start();
      setStatus("listening");
    } catch {
      setError("فشل بدء الميكروفون.");
      setStatus("idle");
    }
  }, []);

  const speakText = useCallback(async (text: string, onDone: () => void) => {
    if (isMuted) { onDone(); return; }

    setStatus("speaking");
    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
        credentials: "include",
      });

      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audioRef.current = audio;
        audio.onended = () => {
          audioRef.current = null;
          URL.revokeObjectURL(url);
          onDone();
        };
        audio.onerror = () => {
          audioRef.current = null;
          URL.revokeObjectURL(url);
          fallbackTTS(text, onDone);
        };
        await audio.play();
        return;
      }
    } catch {}
    fallbackTTS(text, onDone);
  }, [isMuted]);

  const fallbackTTS = (text: string, onDone: () => void) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "ar-SA";
    utterance.rate = 0.95;
    utterance.onend = onDone;
    utterance.onerror = onDone;
    window.speechSynthesis.speak(utterance);
  };

  const sendToAI = useCallback(async (text: string) => {
    setStatus("thinking");

    setMessages(prev => {
      const next = [...prev, { role: "user" as const, text }];
      (async () => {
        try {
          abortRef.current = new AbortController();
          const res = await fetch("/api/voice/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              message: text,
              history: next.slice(-10).map(m => ({ role: m.role, content: m.text })),
            }),
            credentials: "include",
            signal: abortRef.current.signal,
          });

          if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error((err as any).message || "فشل الاتصال");
          }

          const { reply } = await res.json();
          setMessages(p => [...p, { role: "assistant", text: reply }]);

          if (autoPlay) {
            await new Promise<void>(resolve => speakText(reply, resolve));
          } else {
            setStatus("idle");
          }

          // Continuous mode: automatically restart listening after speaking
          if (continuousRef.current) {
            startListening();
          } else {
            setStatus("idle");
          }
        } catch (err: any) {
          if (err.name === "AbortError") return;
          setError(err.message || "حدث خطأ. حاول مرة أخرى.");
          setStatus("idle");
        }
      })();
      return next;
    });
  }, [autoPlay, speakText, startListening]);

  const handleMicToggle = () => {
    if (status === "listening") {
      stopAll();
      setStatus("idle");
    } else if (status === "speaking") {
      stopAll();
      setStatus("idle");
    } else if (status === "idle") {
      startListening();
    }
  };

  const clearConversation = () => {
    stopAll();
    setMessages([]);
    setTranscript("");
    setError("");
    setStatus("idle");
  };

  if (isAuthLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0a0a0f]">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-[#0a0a0f] text-white overflow-hidden select-none">

      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
        <button
          onClick={() => setLocation("/c/new")}
          className="flex items-center gap-1.5 text-white/50 hover:text-white/80 transition-colors text-sm"
        >
          <MessageSquare className="w-4 h-4" />
          <span>الشات</span>
        </button>
        <h1 className="text-base font-semibold text-white/90">وضع الصوت</h1>
        <div className="flex items-center gap-2">
          {/* Mute toggle */}
          <button
            onClick={() => setIsMuted(m => !m)}
            className={cn(
              "p-1.5 rounded-lg transition-colors",
              isMuted ? "text-red-400 bg-red-500/10" : "text-white/40 hover:text-white/70"
            )}
            title={isMuted ? "تشغيل الصوت" : "كتم الصوت"}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          {/* Clear */}
          {messages.length > 0 && (
            <button onClick={clearConversation} className="p-1.5 rounded-lg text-white/40 hover:text-white/70 transition-colors">
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
          <button onClick={() => setLocation("/c/new")} className="p-1.5 rounded-lg text-white/40 hover:text-white/70 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-3">
        {messages.length === 0 && status === "idle" && (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-3 opacity-40">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center">
              <Mic className="w-8 h-8 text-white/50" />
            </div>
            <p className="text-white/50 text-sm max-w-[220px] leading-relaxed">
              اضغط على الزر وتكلم — أبو اليزيد سيرد عليك بالصوت
            </p>
          </div>
        )}

        {messages.map((msg, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              "flex gap-2.5 max-w-[88%]",
              msg.role === "user" ? "mr-auto flex-row-reverse" : "ml-0"
            )}
          >
            {msg.role === "assistant" && (
              <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-0.5 text-sm">
                🤖
              </div>
            )}
            <div
              className={cn(
                "px-4 py-2.5 rounded-2xl text-sm leading-relaxed",
                msg.role === "user"
                  ? "bg-primary/80 text-white rounded-tr-sm"
                  : "bg-white/8 text-white/85 rounded-tl-sm border border-white/5"
              )}
            >
              {msg.text}
            </div>
          </motion.div>
        ))}

        {/* Live transcript */}
        {transcript && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex gap-2.5 max-w-[88%] mr-auto flex-row-reverse"
          >
            <div className="px-4 py-2.5 rounded-2xl text-sm bg-primary/30 text-white/60 border border-primary/25 rounded-tr-sm italic">
              {transcript}
            </div>
          </motion.div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mx-5 mb-2 px-4 py-2 bg-red-500/15 border border-red-500/25 rounded-xl text-red-300 text-sm text-center"
          >
            {error}
            <button onClick={() => setError("")} className="mr-2 opacity-60 hover:opacity-100">
              <X className="w-3.5 h-3.5 inline" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Status */}
      <p className="text-center text-white/35 text-xs mb-4 h-4 transition-all">
        {STATUS_TEXT[status]}
      </p>

      {/* Continuous mode toggle */}
      <div className="flex justify-center mb-4">
        <button
          onClick={() => setContinuousMode(m => !m)}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs transition-all border",
            continuousMode
              ? "bg-primary/20 border-primary/40 text-primary"
              : "bg-white/5 border-white/10 text-white/40 hover:text-white/60"
          )}
        >
          <RefreshCw className={cn("w-3 h-3", continuousMode && "animate-spin")} />
          {continuousMode ? "محادثة مستمرة" : "محادثة عادية"}
        </button>
      </div>

      {/* Mic Button */}
      <div className="flex flex-col items-center pb-10">
        <div className="relative">
          {(status === "listening" || status === "speaking") && (
            <>
              <motion.div
                className="absolute inset-0 rounded-full border border-primary/30"
                animate={{ scale: [1, 1.7], opacity: [0.5, 0] }}
                transition={{ duration: 1.4, repeat: Infinity, ease: "easeOut" }}
              />
              <motion.div
                className="absolute inset-0 rounded-full border border-primary/15"
                animate={{ scale: [1, 2.1], opacity: [0.3, 0] }}
                transition={{ duration: 1.4, repeat: Infinity, ease: "easeOut", delay: 0.45 }}
              />
            </>
          )}

          <motion.button
            onClick={handleMicToggle}
            disabled={status === "thinking"}
            whileTap={{ scale: 0.93 }}
            className={cn(
              "relative w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 shadow-2xl",
              status === "idle" && "bg-white/10 hover:bg-white/15 border border-white/20",
              status === "listening" && "bg-primary shadow-primary/40",
              status === "thinking" && "bg-white/5 border border-white/10 cursor-not-allowed",
              status === "speaking" && "bg-emerald-500/80 hover:bg-red-500/80 shadow-emerald-500/25"
            )}
          >
            {status === "thinking" ? (
              <motion.div
                className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                animate={{ rotate: 360 }}
                transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
              />
            ) : status === "speaking" ? (
              <Volume2 className="w-8 h-8 text-white" />
            ) : status === "listening" ? (
              <motion.div
                animate={{ scale: [1, 1.12, 1] }}
                transition={{ duration: 0.55, repeat: Infinity }}
              >
                <Mic className="w-8 h-8 text-white" />
              </motion.div>
            ) : (
              <Mic className="w-8 h-8 text-white/65" />
            )}
          </motion.button>
        </div>

        {status === "speaking" && (
          <p className="text-white/25 text-xs mt-3">اضغط لإيقاف الكلام</p>
        )}
        {status === "listening" && continuousMode && (
          <p className="text-primary/60 text-xs mt-3">وضع المحادثة المستمرة نشط</p>
        )}
        {!isSpeechSupported && (
          <p className="text-red-400/60 text-xs mt-3 text-center px-8">
            متصفحك لا يدعم التعرف على الصوت. جرب Chrome أو Edge.
          </p>
        )}
      </div>
    </div>
  );
}
