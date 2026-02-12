import { Sidebar } from "@/components/Sidebar";
import { useConversation } from "@/hooks/use-conversations";
import { useSendMessage } from "@/hooks/use-messages";
import { useRoute } from "wouter";
import { ChatBubble } from "@/components/ChatBubble";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Loader2, StopCircle, ArrowRight, Menu, ImagePlus, X } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { EncryptionBadge } from "@/components/EncryptionBadge";
import { useAuth } from "@/hooks/use-auth";
import { redirectToLogin } from "@/lib/auth-utils";
import { useToast } from "@/hooks/use-toast";

export default function ChatPage() {
  const [match, params] = useRoute("/c/:id");
  const id = match && params.id !== "new" ? parseInt(params.id) : null;
  const { toast } = useToast();
  
  const { user, isLoading: isAuthLoading } = useAuth();
  const { data, isLoading: isChatLoading, isError } = useConversation(id);
  const { sendMessage, isStreaming, streamedContent, stopGeneration } = useSendMessage(id || 0);
  
  const [input, setInput] = useState("");
  const [attachments, setAttachments] = useState<{ url: string; name: string; type: 'image' }[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ... (auth and scroll effects)

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      setAttachments(prev => [...prev, { ...data, type: 'image' }]);
    } catch (err) {
      toast({ title: "فشل الرفع", description: "حدث خطأ أثناء رفع الصورة", variant: "destructive" });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSend = async () => {
    if (!input.trim() && attachments.length === 0) return;
    
    let currentId = id;
    if (!currentId) {
      // Logic from previous turn to create conversation
    }
    
    sendMessage.mutate({ 
      content: input,
      attachments: attachments.length > 0 ? attachments : undefined
    });
    setInput("");
    setAttachments([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (isError) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <p className="text-destructive font-medium">عذراً، لم نتمكن من تحميل المحادثة.</p>
          <Button variant="outline" onClick={() => window.location.href = "/"}>العودة للرئيسية</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar />
      
      {/* Main Content Area */}
      <main className="flex-1 flex flex-col md:mr-80 h-full relative">
        
        {/* Header */}
        <header className="h-16 border-b border-border/50 flex items-center justify-between px-4 md:px-8 bg-background/80 backdrop-blur-md z-10">
          <div className="flex items-center gap-3">
             {/* Mobile/Tablet placeholder for sidebar space is handled by margin-right logic */}
             {!id ? (
               <div className="text-lg font-semibold text-foreground">محادثة جديدة</div>
             ) : isChatLoading ? (
               <div className="w-32 h-6 bg-muted rounded animate-pulse" />
             ) : (
               <div className="flex flex-col">
                 <h2 className="font-semibold text-foreground">{data?.conversation.title || "محادثة"}</h2>
                 <span className="text-xs text-muted-foreground hidden md:block">آخر نشاط: {new Date().toLocaleDateString('ar-EG')}</span>
               </div>
             )}
          </div>
          <EncryptionBadge />
        </header>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
          {!id ? (
            // Empty State / New Chat
            <div className="h-full flex flex-col items-center justify-center text-center space-y-6 opacity-60">
              <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center">
                <Menu className="w-10 h-10 text-primary" />
              </div>
              <div className="max-w-md space-y-2">
                <h3 className="text-2xl font-bold">أهلاً بك يا {user?.firstName}</h3>
                <p className="text-muted-foreground">أنا أبو اليزيد، مساعدك الشخصي. كيف يمكنني مساعدتك اليوم؟</p>
              </div>
            </div>
          ) : (
            // Message List
            <>
              {data?.messages.map((msg) => (
                <ChatBubble
                  key={msg.id}
                  role={msg.role as "user" | "assistant"}
                  content={msg.content}
                  createdAt={msg.createdAt}
                />
              ))}
              
              {/* Streaming Message Bubble */}
              {isStreaming && (
                <ChatBubble
                  role="assistant"
                  content={streamedContent}
                  isStreaming={true}
                />
              )}
              
              <div ref={messagesEndRef} className="h-4" />
            </>
          )}
        </div>

        {/* Input Area */}
        <div className="p-4 md:p-6 border-t border-border/50 bg-background/50 backdrop-blur-sm">
          <div className="max-w-4xl mx-auto relative flex items-end gap-2 p-2 bg-card border border-border rounded-2xl shadow-sm focus-within:ring-2 focus-within:ring-primary/20 transition-all">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="اكتب رسالتك هنا..."
              className="min-h-[50px] max-h-[200px] border-none shadow-none resize-none bg-transparent py-3 px-4 focus-visible:ring-0 text-base"
              rows={1}
            />
            
            <div className="flex pb-2 pl-2">
              {isStreaming ? (
                <Button 
                  size="icon" 
                  variant="destructive" 
                  onClick={stopGeneration}
                  className="rounded-xl h-10 w-10 shrink-0"
                >
                  <StopCircle className="w-5 h-5" />
                </Button>
              ) : (
                <Button 
                  size="icon" 
                  className="rounded-xl h-10 w-10 shrink-0 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
                  onClick={handleSend}
                  disabled={!input.trim() || !id}
                >
                  <div className="rtl-flip"><Send className="w-5 h-5" /></div>
                </Button>
              )}
            </div>
          </div>
          <p className="text-center text-xs text-muted-foreground mt-3">
            قد يرتكب الذكاء الاصطناعي أخطاء. يرجى التحقق من المعلومات الهامة.
          </p>
        </div>
      </main>
    </div>
  );
}
