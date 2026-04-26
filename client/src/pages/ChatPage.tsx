import { Sidebar } from "@/components/Sidebar";
import { useConversation } from "@/hooks/use-conversations";
import { useSendMessage } from "@/hooks/use-messages";
import { useRoute } from "wouter";
import { ChatBubble } from "@/components/ChatBubble";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Loader2, StopCircle, ImagePlus, X, Sparkles, Wand2 } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { EncryptionBadge } from "@/components/EncryptionBadge";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { PasswordDialog } from "@/components/PasswordDialog";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import logoImg from "@assets/generated_images/abu_alyazid_logo.png";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

const SUGGESTIONS = [
  { text: "ساعدني في كتابة رسالة احترافية", emoji: "✍️" },
  { text: "اشرح لي مفهوماً معقداً ببساطة", emoji: "💡" },
  { text: "حلل هذه الصورة وأخبرني ما فيها", emoji: "🖼️" },
  { text: "اكتب كوداً وشرح طريقة عمله", emoji: "💻" },
];

interface ReactionStat {
  messageId: number;
  likes: number;
  dislikes: number;
  myReaction: string | null;
}

export default function ChatPage() {
  const [match, params] = useRoute("/c/:id");
  const id = match && params.id !== "new" ? parseInt(params.id) : null;
  const { toast } = useToast();
  const qc = useQueryClient();

  const { user, isLoading: isAuthLoading } = useAuth();
  const [chatPin, setChatPin] = useState<string | undefined>(() => {
    if (!id) return undefined;
    return sessionStorage.getItem(`chat_pin_${id}`) ?? undefined;
  });
  const [pinError, setPinError] = useState("");
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);

  const { data, isLoading: isChatLoading, isError, error, refetch } = useConversation(id, chatPin);
  const { sendMessage, isStreaming, streamedContent, stopGeneration } = useSendMessage(id || 0, chatPin);

  const [input, setInput] = useState("");
  const [attachments, setAttachments] = useState<{ url: string; name: string; type: 'image' }[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [pendingUserMessage, setPendingUserMessage] = useState<{
    content: string;
    attachments?: { url: string; name: string; type: 'image' }[];
  } | null>(null);

  // Image generation
  const [imgGenOpen, setImgGenOpen] = useState(false);
  const [imgPrompt, setImgPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auth guard
  useEffect(() => {
    if (!isAuthLoading && !user) {
      window.location.href = "/api/login";
    }
  }, [user, isAuthLoading]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [data?.messages, streamedContent, pendingUserMessage]);

  // Show password dialog if conversation is locked
  useEffect(() => {
    const isLockedError = (error as any)?.locked === true;
    if (isLockedError) {
      setPinError("");
      setShowPasswordDialog(true);
    }
  }, [error]);

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (ta) {
      ta.style.height = "auto";
      ta.style.height = Math.min(ta.scrollHeight, 200) + "px";
    }
  }, [input]);

  // Clear pending user message once it shows up in fetched messages OR streaming finished
  useEffect(() => {
    if (!pendingUserMessage) return;
    if (!isStreaming) {
      setPendingUserMessage(null);
    }
  }, [isStreaming, data?.messages, pendingUserMessage]);

  // ── Reactions ──
  const messageIds = (data?.messages?.map(m => m.id) || []).join(",");
  const { data: reactionStats } = useQuery<ReactionStat[]>({
    queryKey: ["/api/messages/reactions", messageIds],
    enabled: !!messageIds && !isStreaming,
    queryFn: async () => {
      if (!messageIds) return [];
      const res = await fetch(`/api/messages/reactions?ids=${messageIds}`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    staleTime: 5000,
  });

  const reactionMap = new Map<number, ReactionStat>();
  reactionStats?.forEach(r => reactionMap.set(r.messageId, r));

  const reactMutation = useMutation({
    mutationFn: async ({ messageId, type }: { messageId: number; type: 'like' | 'dislike' | null }) => {
      const res = await fetch(`/api/messages/${messageId}/react`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("فشل التفاعل");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/messages/reactions"] });
    },
    onError: (e: any) => {
      toast({ title: "خطأ", description: e.message, variant: "destructive" });
    },
  });

  const handleReact = (messageId: number, type: 'like' | 'dislike') => {
    const current = reactionMap.get(messageId)?.myReaction;
    // Toggle: clicking same reaction removes it
    const newType = current === type ? null : type;
    reactMutation.mutate({ messageId, type: newType });
  };

  const handlePinSubmit = async (pin: string) => {
    setPinError("");
    setChatPin(pin);
    if (id) sessionStorage.setItem(`chat_pin_${id}`, pin);
    setTimeout(() => {
      refetch().then((result) => {
        if (result.isError && (result.error as any)?.locked) {
          setPinError("كلمة السر غير صحيحة، حاول مرة أخرى");
          setChatPin(undefined);
          if (id) sessionStorage.removeItem(`chat_pin_${id}`);
        } else {
          setShowPasswordDialog(false);
        }
      });
    }, 50);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    if (!file.type.startsWith("image/")) {
      toast({ title: "نوع غير مدعوم", description: "ارفع صورة فقط (JPG, PNG, WebP, GIF)", variant: "destructive" });
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "حجم كبير", description: "أقصى حجم للصورة 10 ميجا", variant: "destructive" });
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!res.ok) {
        const errMsg = res.status === 401 ? "سجّل الدخول أولاً" : "حدث خطأ أثناء رفع الصورة";
        throw new Error(errMsg);
      }
      const uploadData = await res.json();
      setAttachments(prev => [...prev, { ...uploadData, type: 'image' as const }]);
      toast({ title: "تم رفع الصورة ✓", description: "اكتب سؤالك عنها واضغط إرسال" });
    } catch (err: any) {
      toast({ title: "فشل الرفع", description: err?.message || "حدث خطأ أثناء رفع الصورة", variant: "destructive" });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSend = async () => {
    if (!input.trim() && attachments.length === 0) return;
    const messageContent = input;
    const messageAttachments = [...attachments];
    let currentId = id;
    if (!currentId) {
      try {
        const res = await fetch("/api/conversations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: messageContent.slice(0, 40) + (messageContent.length > 40 ? "..." : "") }),
          credentials: "include",
        });
        if (!res.ok) throw new Error("Failed to create conversation");
        const newConv = await res.json();
        currentId = newConv.id;
        window.history.pushState({}, "", `/c/${currentId}`);
      } catch {
        toast({ title: "خطأ", description: "فشل بدء محادثة جديدة", variant: "destructive" });
        return;
      }
    }
    // Show optimistic user message immediately
    setPendingUserMessage({
      content: messageContent,
      attachments: messageAttachments.length > 0 ? messageAttachments : undefined,
    });
    sendMessage.mutate({
      content: messageContent,
      attachments: messageAttachments.length > 0 ? messageAttachments : undefined,
    });
    setInput("");
    setAttachments([]);
  };

  const handleGenerateImage = async () => {
    if (!imgPrompt.trim()) {
      toast({ title: "فاضي", description: "اكتب وصف الصورة", variant: "destructive" });
      return;
    }
    setIsGenerating(true);
    let currentId = id;
    try {
      // Create conversation if needed
      if (!currentId) {
        const cRes = await fetch("/api/conversations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: imgPrompt.slice(0, 40) }),
          credentials: "include",
        });
        if (!cRes.ok) throw new Error("Failed to create conversation");
        const newConv = await cRes.json();
        currentId = newConv.id;
        window.history.pushState({}, "", `/c/${currentId}`);
      }

      const res = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: imgPrompt, conversationId: currentId }),
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "فشل توليد الصورة");
      }
      toast({ title: "تم ✓", description: "تم توليد الصورة بنجاح" });
      setImgPrompt("");
      setImgGenOpen(false);
      // Refresh conversation messages
      qc.invalidateQueries({ queryKey: ["/api/conversations/:id", currentId] });
      qc.invalidateQueries({ queryKey: ["/api/conversations"] });
    } catch (e: any) {
      toast({ title: "فشل", description: e.message || "تعذر توليد الصورة", variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (isAuthLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  const isLockedError = (error as any)?.locked === true;
  if (isError && !isLockedError) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center space-y-4 px-4">
          <p className="text-destructive font-medium">عذراً، لم نتمكن من تحميل المحادثة.</p>
          <Button variant="outline" onClick={() => window.location.href = "/"}>العودة للرئيسية</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar />

      <PasswordDialog
        open={showPasswordDialog}
        onClose={() => { setShowPasswordDialog(false); window.history.back(); }}
        onSubmit={handlePinSubmit}
        error={pinError}
        isLoading={isChatLoading}
      />

      {/* Image generation dialog */}
      <Dialog open={imgGenOpen} onOpenChange={setImgGenOpen}>
        <DialogContent dir="rtl" className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wand2 className="w-5 h-5 text-primary" />
              توليد صورة بالذكاء الاصطناعي
            </DialogTitle>
            <DialogDescription>
              اكتب وصفًا تفصيليًا للصورة اللي عايز تولّدها.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <Textarea
              value={imgPrompt}
              onChange={(e) => setImgPrompt(e.target.value)}
              placeholder="مثال: قطة ترتدي زي رائد فضاء على سطح القمر، ألوان زاهية، جودة سينمائية"
              className="min-h-[120px] resize-none"
              data-testid="input-img-prompt"
              disabled={isGenerating}
            />
            <div className="flex flex-wrap gap-2">
              {[
                "منظر طبيعي خلاب وقت غروب الشمس",
                "روبوت عربي بأسلوب أنمي",
                "قهوة عربية مع تمر، تصوير احترافي",
              ].map(s => (
                <button
                  key={s}
                  onClick={() => setImgPrompt(s)}
                  className="text-[11px] px-2.5 py-1 rounded-full border border-border hover:bg-muted transition"
                  disabled={isGenerating}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setImgGenOpen(false)} disabled={isGenerating}>
              إلغاء
            </Button>
            <Button
              onClick={handleGenerateImage}
              disabled={isGenerating || !imgPrompt.trim()}
              className="gap-2"
              data-testid="button-generate-image"
            >
              {isGenerating ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> جارِ التوليد...</>
              ) : (
                <><Sparkles className="w-4 h-4" /> توليد</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Main */}
      <main className="flex-1 flex flex-col md:mr-80 h-full relative min-w-0">

        {/* Header */}
        <header className="h-14 border-b border-border/40 flex items-center justify-between px-4 md:px-6 bg-background/90 backdrop-blur-md z-10 shrink-0">
          <div className="flex-1 min-w-0">
            {!id ? (
              <span className="text-sm font-medium text-muted-foreground">محادثة جديدة</span>
            ) : isChatLoading ? (
              <div className="w-28 h-4 bg-muted rounded-full animate-pulse" />
            ) : (
              <h2 className="font-medium text-sm text-foreground truncate">{data?.conversation?.title || "محادثة"}</h2>
            )}
          </div>
          <EncryptionBadge />
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto">
          {/* Welcome screen (no active conversation) */}
          {!id && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="h-full flex flex-col items-center justify-center px-4 pb-8"
            >
              <div className="w-full max-w-2xl mx-auto text-center space-y-6">
                {/* Logo */}
                <div className="flex flex-col items-center gap-3">
                  <img src={logoImg} alt="أبو اليزيد" className="w-20 h-20 rounded-2xl shadow-lg ring-2 ring-primary/20 object-cover" />
                  <div>
                    <h2 className="text-2xl font-bold text-foreground">
                      أهلاً {user?.firstName} 👋
                    </h2>
                    <p className="text-muted-foreground mt-1 text-sm">
                      كيف يمكنني مساعدتك اليوم؟
                    </p>
                  </div>
                </div>

                {/* Suggestion Cards */}
                <div className="grid grid-cols-2 gap-2.5 max-w-lg mx-auto">
                  {SUGGESTIONS.map((s) => (
                    <motion.button
                      key={s.text}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        setInput(s.text);
                        textareaRef.current?.focus();
                      }}
                      className="group flex flex-col items-end gap-2 p-4 text-right rounded-2xl border border-border/50 bg-card/50 hover:border-primary/30 hover:bg-primary/5 transition-all shadow-sm text-sm"
                    >
                      <span className="text-2xl">{s.emoji}</span>
                      <span className="text-muted-foreground group-hover:text-foreground transition-colors leading-snug">
                        {s.text}
                      </span>
                    </motion.button>
                  ))}
                </div>

                <button
                  onClick={() => setImgGenOpen(true)}
                  className="mx-auto inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/30 bg-primary/5 hover:bg-primary/10 text-primary text-sm font-medium transition"
                  data-testid="button-open-img-gen-welcome"
                >
                  <Wand2 className="w-4 h-4" />
                  ولّد صورة بالذكاء الاصطناعي
                </button>
              </div>
            </motion.div>
          )}

          {/* Chat messages */}
          {id && (
            <div className="max-w-3xl mx-auto w-full px-4 md:px-6 py-6 space-y-1 pb-4">
              {isChatLoading ? (
                <div className="flex flex-col items-center justify-center h-40 gap-3 text-muted-foreground">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  <span className="text-sm">جاري التحميل...</span>
                </div>
              ) : (
                <>
                  {data?.messages.map((msg) => (
                    <ChatBubble
                      key={msg.id}
                      role={msg.role as "user" | "assistant"}
                      content={msg.content}
                      createdAt={msg.createdAt}
                      attachments={msg.attachments ?? undefined}
                      messageId={msg.id}
                      reactionStats={reactionMap.get(msg.id)}
                      onReact={msg.role === "assistant" ? (type) => handleReact(msg.id, type) : undefined}
                    />
                  ))}
                  {/* Optimistic user message during streaming */}
                  {pendingUserMessage && isStreaming && (
                    <ChatBubble
                      role="user"
                      content={pendingUserMessage.content}
                      attachments={pendingUserMessage.attachments}
                    />
                  )}
                  {isStreaming && (
                    <ChatBubble
                      role="assistant"
                      content={streamedContent}
                      isStreaming={true}
                    />
                  )}
                  <div ref={messagesEndRef} className="h-2" />
                </>
              )}
            </div>
          )}
        </div>

        {/* Input Area — fixed at bottom */}
        <div className="shrink-0 border-t border-border/40 bg-background/95 backdrop-blur-md px-3 md:px-6 py-3 md:py-4">
          <div className="max-w-3xl mx-auto space-y-2">
            {/* Attachment previews */}
            <AnimatePresence>
              {attachments.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex flex-wrap gap-2 px-1"
                >
                  {attachments.map((file, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="relative group rounded-xl overflow-hidden border-2 border-primary/30 shadow-md"
                    >
                      <img
                        src={file.url}
                        alt={file.name}
                        className="w-24 h-24 object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent flex items-end p-1.5 opacity-0 group-hover:opacity-100 transition">
                        <span className="text-[9px] text-white truncate w-full">{file.name}</span>
                      </div>
                      <button
                        onClick={() => setAttachments(prev => prev.filter((_, idx) => idx !== i))}
                        className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground rounded-full p-1 shadow-md hover:scale-110 transition"
                        title="إزالة"
                        data-testid={`button-remove-attachment-${i}`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Input box */}
            <div className="flex items-end gap-2 p-2 bg-card border border-border/60 rounded-2xl shadow-sm focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary/30 transition-all">
              <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*" className="hidden" />

              {/* Left icons */}
              <div className="flex pb-1.5 pl-1 gap-1 shrink-0">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading || isStreaming}
                  title="رفع صورة"
                  data-testid="button-upload-image"
                  className={cn(
                    "h-9 w-9 rounded-xl text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all",
                    isUploading && "text-primary"
                  )}
                >
                  {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />}
                </Button>

                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setImgGenOpen(true)}
                  disabled={isStreaming || isGenerating}
                  title="توليد صورة بالذكاء الاصطناعي"
                  data-testid="button-open-img-gen"
                  className="h-9 w-9 rounded-xl text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all"
                >
                  <Wand2 className="w-4 h-4" />
                </Button>
              </div>

              {/* Textarea */}
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="اكتب رسالتك هنا... (Enter للإرسال، Shift+Enter لسطر جديد)"
                className="flex-1 min-h-[44px] max-h-[200px] border-none shadow-none resize-none bg-transparent py-2.5 px-2 focus-visible:ring-0 text-sm leading-relaxed"
                rows={1}
                data-testid="input-message"
              />

              {/* Send / Stop */}
              <div className="pb-1.5 pr-1 shrink-0">
                {isStreaming ? (
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={stopGeneration}
                    title="إيقاف"
                    data-testid="button-stop"
                    className="h-9 w-9 rounded-xl border-destructive/40 text-destructive hover:bg-destructive/10"
                  >
                    <StopCircle className="w-4 h-4" />
                  </Button>
                ) : (
                  <Button
                    size="icon"
                    onClick={handleSend}
                    disabled={(!input.trim() && attachments.length === 0) || isUploading}
                    data-testid="button-send"
                    className={cn(
                      "h-9 w-9 rounded-xl transition-all",
                      input.trim() || attachments.length > 0
                        ? "bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
                        : "bg-muted text-muted-foreground cursor-not-allowed"
                    )}
                  >
                    <div className="rtl-flip"><Send className="w-4 h-4" /></div>
                  </Button>
                )}
              </div>
            </div>

            <p className="text-center text-[11px] text-muted-foreground/60">
              أبو اليزيد قد يرتكب أخطاء. يُرجى التحقق من المعلومات الهامة.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
