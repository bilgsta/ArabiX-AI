import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { cn } from "@/lib/utils";
import { Bot, User, Copy, Check, Volume2, Loader2 as Spinner } from "lucide-react";
import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

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
    } catch (err) {
      console.error(err);
      setIsPlaying(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(
        "flex w-full gap-4 p-4 md:p-6 mb-2",
        isUser ? "flex-row-reverse" : "flex-row"
      )}
    >
      {/* Avatar */}
      <div className={cn(
        "flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center shadow-sm border",
        isUser ? "bg-primary text-primary-foreground border-primary" : "bg-card text-foreground border-border"
      )}>
        {isUser ? <User className="w-6 h-6" /> : <Bot className="w-6 h-6 text-primary" />}
      </div>

      {/* Message Content */}
      <div className={cn(
        "flex flex-col max-w-[85%] md:max-w-[75%]",
        isUser ? "items-end" : "items-start"
      )}>
        <div className="flex items-center gap-2 mb-1 opacity-70 text-xs">
          <span className="font-semibold">{isUser ? "أنت" : "أبو اليزيد"}</span>
          {createdAt && (
            <span className="text-[10px] text-muted-foreground">
              {format(new Date(createdAt), "p", { locale: ar })}
            </span>
          )}
        </div>

        <div className={cn(
          "rounded-2xl px-5 py-3 shadow-sm border text-sm md:text-base leading-relaxed overflow-hidden w-full",
          isUser 
            ? "bg-primary text-primary-foreground border-primary/20 rounded-tr-sm" 
            : "bg-card text-card-foreground border-border/50 rounded-tl-sm"
        )}>
          {/* Attachments */}
          {attachments && attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {attachments.map((file, i) => (
                <div key={i} className="max-w-[200px] rounded-lg overflow-hidden border border-border/20">
                  {file.type === 'image' ? (
                    <img src={file.url} alt={file.name} className="w-full h-auto object-cover max-h-60" />
                  ) : (
                    <div className="p-2 flex items-center gap-2 bg-muted/30">
                      <span className="text-xs truncate">{file.name}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Loading Indicator for empty AI response */}
          {!isUser && content === "" && isStreaming ? (
            <div className="flex items-center gap-1 h-6">
              <div className="w-2 h-2 bg-primary/50 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
              <div className="w-2 h-2 bg-primary/50 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
              <div className="w-2 h-2 bg-primary/50 rounded-full animate-bounce"></div>
            </div>
          ) : (
            <div className="markdown-content">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  code({ node, inline, className, children, ...props }: any) {
                    const match = /language-(\w+)/.exec(className || "");
                    return !inline && match ? (
                      <div className="relative my-4 rounded-md overflow-hidden" dir="ltr">
                        <div className="bg-[#282c34] text-xs text-gray-400 px-3 py-1 flex justify-between items-center border-b border-gray-700">
                          <span>{match[1]}</span>
                          <span className="text-[10px]">Terminal</span>
                        </div>
                        <SyntaxHighlighter
                          {...props}
                          style={oneDark}
                          language={match[1]}
                          PreTag="div"
                          customStyle={{ margin: 0, borderRadius: 0, fontSize: '0.85em' }}
                        >
                          {String(children).replace(/\n$/, "")}
                        </SyntaxHighlighter>
                      </div>
                    ) : (
                      <code {...props} className={cn("bg-muted/50 px-1.5 py-0.5 rounded font-mono text-xs md:text-sm", className)}>
                        {children}
                      </code>
                    );
                  },
                  ul: ({ children }) => <ul className="list-disc pr-5 my-2 space-y-1">{children}</ul>,
                  ol: ({ children }) => <ol className="list-decimal pr-5 my-2 space-y-1">{children}</ol>,
                  a: ({ href, children }) => (
                    <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-500 underline hover:text-blue-600">
                      {children}
                    </a>
                  ),
                  table: ({ children }) => <div className="overflow-x-auto my-4 border rounded-lg"><table className="w-full text-right border-collapse">{children}</table></div>,
                  th: ({ children }) => <th className="bg-muted p-2 border text-sm font-semibold whitespace-nowrap">{children}</th>,
                  td: ({ children }) => <td className="p-2 border text-sm">{children}</td>,
                  blockquote: ({ children }) => <blockquote className="border-r-4 border-primary/30 pr-4 py-1 my-2 bg-muted/20 text-muted-foreground italic rounded-r-sm">{children}</blockquote>
                }}
              >
                {content}
              </ReactMarkdown>
            </div>
          )}
        </div>

        {/* AI Action Buttons */}
        {!isStreaming && content && (
          <div className="flex items-center gap-2 mt-2 opacity-100 !visible !z-50 pointer-events-auto">
             {!isUser && (
               <button 
                onClick={(e) => {
                  e.stopPropagation();
                  handlePlayVoice();
                }}
                disabled={isPlaying && !audioRef.current}
                className={cn(
                  "p-1.5 hover:bg-muted rounded-md transition-colors",
                  isPlaying ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground"
                )}
                title="استماع"
               >
                 {isPlaying && !audioRef.current ? <Spinner className="w-4 h-4 animate-spin" /> : <Volume2 className="w-4 h-4" />}
               </button>
             )}
             <button 
              onClick={(e) => {
                e.stopPropagation();
                handleCopy();
              }}
              className="p-1.5 hover:bg-muted rounded-md text-muted-foreground hover:text-foreground transition-colors"
              title="نسخ النص"
             >
               {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
             </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}
