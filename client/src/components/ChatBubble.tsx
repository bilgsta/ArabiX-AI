import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { cn } from "@/lib/utils";
import { Copy, Check, Volume2, Loader2 as Spinner } from "lucide-react";
import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import logoImg from "@assets/generated_images/abu_alyazid_logo.png";

interface ChatBubbleProps {
  role: "user" | "assistant";
  content: string;
  createdAt?: Date | string;
  isStreaming?: boolean;
  attachments?: {
    type: 'image' | 'file' | 'audio';
    url: string;
    name: string;
    size?: number;
  }[];
}

export function ChatBubble({ role, content, createdAt, isStreaming, attachments }: ChatBubbleProps) {
  const isUser = role === "user";
  const [copied, setCopied] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePlayVoice = async () => {
    if (isPlaying) {
      audioRef.current?.pause();
      setIsPlaying(false);
      return;
    }
    try {
      setIsPlaying(true);
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: content }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("TTS failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      if (audioRef.current) {
        audioRef.current.src = url;
      } else {
        audioRef.current = new Audio(url);
      }
      audioRef.current.onended = () => setIsPlaying(false);
      audioRef.current.play();
    } catch {
      setIsPlaying(false);
    }
  };

  if (isUser) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="flex justify-start py-1 group"
      >
        <div className="flex flex-col items-start max-w-[80%] gap-1">
          {/* Attachments */}
          {attachments && attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-1">
              {attachments.map((file, i) => (
                <div key={i} className="rounded-xl overflow-hidden border border-border/30 shadow-sm">
                  {file.type === 'image' && (
                    <img src={file.url} alt={file.name} className="max-w-[220px] max-h-60 object-cover" />
                  )}
                </div>
              ))}
            </div>
          )}
          <div className="bg-muted/70 dark:bg-muted/40 text-foreground rounded-2xl rounded-tl-sm px-4 py-3 text-sm md:text-[15px] leading-relaxed shadow-sm">
            {content}
          </div>
          {createdAt && (
            <span className="text-[10px] text-muted-foreground/60 pr-1">
              {format(new Date(createdAt), "p", { locale: ar })}
            </span>
          )}
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={handleCopy}
              className="p-1.5 hover:bg-muted rounded-md text-muted-foreground hover:text-foreground transition-colors"
              title="نسخ"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  // AI Message (ChatGPT style: bot icon + full-width text)
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="flex gap-3 py-3 group"
    >
      {/* Bot avatar */}
      <img
        src={logoImg}
        alt="أبو اليزيد"
        className="w-8 h-8 rounded-full object-cover shrink-0 mt-0.5 shadow-sm ring-1 ring-primary/20"
      />


      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-xs font-semibold text-foreground/70">أبو اليزيد</span>
          {createdAt && (
            <span className="text-[10px] text-muted-foreground/50">
              {format(new Date(createdAt), "p", { locale: ar })}
            </span>
          )}
        </div>

        <div className="text-sm md:text-[15px] leading-relaxed text-foreground/90">
          {!content && isStreaming ? (
            <div className="flex items-center gap-1.5 h-6">
              <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce [animation-delay:-0.3s]" />
              <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce [animation-delay:-0.15s]" />
              <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" />
            </div>
          ) : (
            <div className="markdown-content prose-custom">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  code({ node, inline, className, children, ...props }: any) {
                    const match = /language-(\w+)/.exec(className || "");
                    return !inline && match ? (
                      <div className="relative my-4 rounded-xl overflow-hidden shadow-sm" dir="ltr">
                        <div className="bg-[#1e1e2e] text-xs text-slate-400 px-4 py-2 flex justify-between items-center border-b border-white/5">
                          <span className="font-mono">{match[1]}</span>
                          <button
                            onClick={() => navigator.clipboard.writeText(String(children))}
                            className="hover:text-white transition-colors text-[11px] flex items-center gap-1"
                          >
                            <Copy className="w-3 h-3" />
                            نسخ
                          </button>
                        </div>
                        <SyntaxHighlighter
                          {...props}
                          style={oneDark}
                          language={match[1]}
                          PreTag="div"
                          customStyle={{ margin: 0, borderRadius: 0, fontSize: '0.85em', background: '#1e1e2e' }}
                        >
                          {String(children).replace(/\n$/, "")}
                        </SyntaxHighlighter>
                      </div>
                    ) : (
                      <code {...props} className={cn("bg-muted px-1.5 py-0.5 rounded-md font-mono text-xs", className)}>
                        {children}
                      </code>
                    );
                  },
                  p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
                  ul: ({ children }) => <ul className="list-disc pr-5 my-2 space-y-1">{children}</ul>,
                  ol: ({ children }) => <ol className="list-decimal pr-5 my-2 space-y-1">{children}</ol>,
                  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                  h1: ({ children }) => <h1 className="text-xl font-bold mt-4 mb-2">{children}</h1>,
                  h2: ({ children }) => <h2 className="text-lg font-bold mt-4 mb-2">{children}</h2>,
                  h3: ({ children }) => <h3 className="text-base font-semibold mt-3 mb-1.5">{children}</h3>,
                  a: ({ href, children }) => (
                    <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary underline hover:opacity-80 transition-opacity">
                      {children}
                    </a>
                  ),
                  blockquote: ({ children }) => (
                    <blockquote className="border-r-4 border-primary/40 pr-4 py-1 my-3 bg-primary/5 text-muted-foreground italic rounded-r-lg">
                      {children}
                    </blockquote>
                  ),
                  table: ({ children }) => (
                    <div className="overflow-x-auto my-4 rounded-xl border border-border/50 shadow-sm">
                      <table className="w-full text-right border-collapse">{children}</table>
                    </div>
                  ),
                  th: ({ children }) => <th className="bg-muted/60 p-2.5 border-b border-border text-sm font-semibold">{children}</th>,
                  td: ({ children }) => <td className="p-2.5 border-b border-border/40 text-sm last:border-0">{children}</td>,
                }}
              >
                {content}
              </ReactMarkdown>
            </div>
          )}
        </div>

        {/* Action buttons */}
        {!isStreaming && content && (
          <div className="flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={handlePlayVoice}
              className={cn(
                "p-1.5 rounded-lg transition-colors text-muted-foreground hover:text-foreground hover:bg-muted",
                isPlaying && "text-primary bg-primary/10"
              )}
              title="استماع"
            >
              {isPlaying && !audioRef.current ? (
                <Spinner className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Volume2 className="w-3.5 h-3.5" />
              )}
            </button>
            <button
              onClick={handleCopy}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              title="نسخ"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}
