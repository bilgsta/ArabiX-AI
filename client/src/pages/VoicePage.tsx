import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Mic, MicOff, X, Volume2, RotateCcw, MessageSquare } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

type Message = { role: "user" | "assistant"; text: string };
type Status = "idle" | "listening" | "thinking" | "speaking";

const STATUS_TEXT: Record<Status, string> = {
  idle: "اضغط للتحدث",
  listening: "أنا أستمع...",
  thinking: "جاري التفكير...",
  speaking: "أبو اليزيد يتحدث...",
};

// Check if browser supports Web Speech API
const SpeechRecognition =
  (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

export default function VoicePage() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const [, setLocation] = useLocation();

  const [status, setStatus] = useState<Status>("idle");
  const [messages, setMessages] = useState<Message[]>([]);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState("");
  const [isSpeechSupported] = useState(() => !!SpeechRecognition);

  const recognitionRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Auth guard
  useEffect(() => {
    if (!isAuthLoading && !user) {
      window.location.href = "/api/login";
    }
  }, [user, isAuthLoading]);

  // Auto scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, transcript]);

  // Setup speech recognition
  const setupRecognition = useCallback(() => {
    if (!SpeechRecognition) return null;

    const rec = new SpeechRecognition();
    rec.lang = "ar-SA";
    rec.continuous = false;
    rec.interimResults = true;
    rec.maxAlternatives = 1;

    rec.onresult = (e: any) => {
      let interim = "";
      let final = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) {
          final += e.results[i][0].transcript;
        } else {
          interim += e.results[i][0].transcript;
        }
      }
      setTranscript(final || interim);
    };

    rec.onend = () => {
      // Recognition ended — if we have a final transcript, send it
      setTranscript((prev) => {
        if (prev.trim()) {
          sendToAI(prev.trim());
        } else {
          setStatus("idle");
        }
        return "";
      });
    };

    rec.onerror = (e: any) => {
      if (e.error === "not-allowed" || e.error === "denied") {
        setError("الميكروفون غير متاح. يرجى السماح بالوصول إليه.");
      } else if (e.error === "no-speech") {
        setStatus("idle");
      } else {
        setError("حدث خطأ في التعرف على الصوت.");
      }
      setStatus("idle");
    };

    return rec;
  }, []);

  const startListening = () => {
    if (status !== "idle") return;
    setError("");
    setTranscript("");

    const rec = setupRecognition();
    if (!rec) {
      setError("المتصفح لا يدعم التعرف على الصوت.");
      return;
    }

    recognitionRef.current = rec;
    try {
      rec.start();
      setStatus("listening");
    } catch (err) {
      setError("فشل بدء الميكروفون.");
      setStatus("idle");
    }
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
  };

  const stopSpeaking = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    window.speechSynthesis?.cancel();
    abortRef.current?.abort();
    setStatus("idle");
  };

  const sendToAI = async (text: string) => {
    setStatus("thinking");

    const newMessages: Message[] = [...messages, { role: "user", text }];
    setMessages(newMessages);

    try {
      abortRef.current = new AbortController();

      const res = await fetch("/api/voice/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          history: newMessages.slice(-10).map((m) => ({
            role: m.role,
            content: m.text,
          })),
        }),
        credentials: "include",
        signal: abortRef.current.signal,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || "فشل الاتصال بالمساعد");
      }

      const { reply } = await res.json();
      setMessages((prev) => [...prev, { role: "assistant", text: reply }]);
      await speakText(reply);
    } catch (err: any) {
      if (err.name === "AbortError") return;
      setError(err.message || "حدث خطأ. حاول مرة أخرى.");
      setStatus("idle");
    }
  };

  const speakText = async (text: string) => {
    setStatus("speaking");
    try {
      // Try server TTS first (better quality)
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
          setStatus("idle");
          URL.revokeObjectURL(url);
        };
        audio.onerror = () => {
          fallbackTTS(text);
        };
        await audio.play();
        return;
      }
    } catch {
      // Fall back to browser TTS
    }
    fallbackTTS(text);
  };

  const fallbackTTS = (text: string) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "ar-SA";
    utterance.rate = 0.95;
    utterance.onend = () => setStatus("idle");
    utterance.onerror = () => setStatus("idle");
    window.speechSynthesis.speak(utterance);
  };

  const handleMicToggle = () => {
    if (status === "listening") {
      stopListening();
    } else if (status === "speaking") {
      stopSpeaking();
    } else if (status === "idle") {
      startListening();
    }
  };

  const clearConversation = () => {
    stopSpeaking();
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
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
        <button
          onClick={() => setLocation("/c/new")}
          className="flex items-center gap-2 text-white/50 hover:text-white/80 transition-colors text-sm"
        >
          <MessageSquare className="w-4 h-4" />
          <span>الشات العادي</span>
        </button>
        <h1 className="text-lg font-semibold text-white/90">أبو اليزيد – وضع الصوت</h1>
        <div className="flex items-center gap-3">
          {messages.length > 0 && (
            <button
              onClick={clearConversation}
              className="text-white/40 hover:text-white/70 transition-colors"
              title="مسح المحادثة"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => setLocation("/c/new")}
            className="text-white/40 hover:text-white/70 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {messages.length === 0 && status === "idle" && (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-3 opacity-50">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center">
              <Volume2 className="w-8 h-8 text-white/40" />
            </div>
            <p className="text-white/50 text-sm max-w-[200px]">
              اضغط على الزر وتكلم بالعربي أو الإنجليزي
            </p>
          </div>
        )}

        {messages.map((msg, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              "flex gap-3 max-w-[85%]",
              msg.role === "user" ? "mr-auto flex-row-reverse" : "ml-0"
            )}
          >
            {msg.role === "assistant" && (
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-sm">🤖</span>
              </div>
            )}
            <div
              className={cn(
                "px-4 py-3 rounded-2xl text-sm leading-relaxed",
                msg.role === "user"
                  ? "bg-primary/80 text-white rounded-tr-sm"
                  : "bg-white/8 text-white/90 rounded-tl-sm border border-white/5"
              )}
            >
              {msg.text}
            </div>
          </motion.div>
        ))}

        {/* Live transcript */}
        {transcript && status === "listening" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex gap-3 max-w-[85%] mr-auto flex-row-reverse"
          >
            <div className="px-4 py-3 rounded-2xl text-sm bg-primary/40 text-white/70 border border-primary/30 rounded-tr-sm italic">
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
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mx-6 mb-2 px-4 py-2 bg-red-500/20 border border-red-500/30 rounded-xl text-red-300 text-sm text-center"
          >
            {error}
            <button onClick={() => setError("")} className="mr-3 text-red-400 hover:text-red-200">
              <X className="w-3.5 h-3.5 inline" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Status text */}
      <p className="text-center text-white/40 text-sm mb-4 h-5 transition-all">
        {STATUS_TEXT[status]}
      </p>

      {/* Central Mic Button */}
      <div className="flex flex-col items-center pb-12 pt-2">
        <div className="relative">
          {/* Ripple rings when listening or speaking */}
          {(status === "listening" || status === "speaking") && (
            <>
              <motion.div
                className="absolute inset-0 rounded-full border border-primary/30"
                animate={{ scale: [1, 1.6, 1.6], opacity: [0.6, 0, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut" }}
              />
              <motion.div
                className="absolute inset-0 rounded-full border border-primary/20"
                animate={{ scale: [1, 2, 2], opacity: [0.4, 0, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut", delay: 0.4 }}
              />
            </>
          )}

          {/* Main button */}
          <motion.button
            onClick={handleMicToggle}
            disabled={status === "thinking"}
            whileTap={{ scale: 0.95 }}
            className={cn(
              "relative w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 shadow-2xl",
              status === "idle" && "bg-white/10 hover:bg-white/15 border border-white/20",
              status === "listening" && "bg-primary shadow-primary/40",
              status === "thinking" && "bg-white/5 border border-white/10 cursor-not-allowed",
              status === "speaking" && "bg-emerald-500/80 hover:bg-red-500/80 shadow-emerald-500/30"
            )}
          >
            {status === "thinking" ? (
              <motion.div
                className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full"
                animate={{ rotate: 360 }}
                transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
              />
            ) : status === "speaking" ? (
              <Volume2 className="w-8 h-8 text-white" />
            ) : status === "listening" ? (
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 0.6, repeat: Infinity }}
              >
                <Mic className="w-8 h-8 text-white" />
              </motion.div>
            ) : (
              <Mic className="w-8 h-8 text-white/70" />
            )}
          </motion.button>
        </div>

        {/* Subtext for speaking mode */}
        {status === "speaking" && (
          <p className="text-white/30 text-xs mt-4">اضغط لإيقاف الكلام</p>
        )}
        {!isSpeechSupported && (
          <p className="text-red-400/70 text-xs mt-4 text-center px-8">
            متصفحك لا يدعم التعرف على الصوت. جرب Chrome أو Edge.
          </p>
        )}
      </div>
    </div>
  );
}
