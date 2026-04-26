import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import {
  ArrowRight, Users, MessageSquare, MessageCircle, Search,
  User as UserIcon, Lock, Calendar, ChevronLeft, Mail, Shield,
  ThumbsUp, ThumbsDown, Trophy, Ban, CheckCircle2, AlertTriangle, Trash2,
  TrendingUp, Activity,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { format, formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface AdminConv {
  id: number;
  title: string;
  userId: string;
  isLocked: boolean;
  isEncrypted: boolean;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    profileImageUrl: string | null;
  } | null;
}

interface AdminMessage {
  id: number;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

interface AdminStats {
  totalUsers: number;
  totalConversations: number;
  totalMessages: number;
  totalLikes: number;
  totalDislikes: number;
}

interface AdminUser {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
  isBlocked: boolean;
  blockedReason: string | null;
  createdAt: string | null;
  conversationCount: number;
  messageCount: number;
}

interface AdminReaction {
  id: number;
  messageId: number;
  userId: string;
  type: string;
  createdAt: string;
  user: { id: string; firstName: string | null; lastName: string | null; email: string | null; profileImageUrl: string | null } | null;
  message: { id: number; content: string; conversationId: number } | null;
}

interface TopMessage {
  messageId: number;
  content: string;
  likes: number;
  dislikes: number;
  conversationId: number;
}

type Tab = "conversations" | "users" | "reactions" | "top";

export default function AdminPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("conversations");
  const [search, setSearch] = useState("");
  const [selectedConv, setSelectedConv] = useState<number | null>(null);
  const [filterLocked, setFilterLocked] = useState(false);
  const [blockTarget, setBlockTarget] = useState<AdminUser | null>(null);
  const [blockReason, setBlockReason] = useState("");

  const { data: adminCheck, isLoading: checkingAdmin } = useQuery<{ isAdmin: boolean }>({
    queryKey: ["/api/admin/me"],
  });

  const { data: stats } = useQuery<AdminStats>({
    queryKey: ["/api/admin/stats"],
    enabled: adminCheck?.isAdmin === true,
    refetchInterval: 15000,
  });

  const { data: conversations, isLoading } = useQuery<AdminConv[]>({
    queryKey: ["/api/admin/conversations"],
    enabled: adminCheck?.isAdmin === true,
  });

  const { data: users, isLoading: loadingUsers } = useQuery<AdminUser[]>({
    queryKey: ["/api/admin/users"],
    enabled: adminCheck?.isAdmin === true && tab === "users",
  });

  const { data: reactions, isLoading: loadingReactions } = useQuery<AdminReaction[]>({
    queryKey: ["/api/admin/reactions"],
    enabled: adminCheck?.isAdmin === true && tab === "reactions",
    refetchInterval: 10000,
  });

  const { data: topMessages, isLoading: loadingTop } = useQuery<TopMessage[]>({
    queryKey: ["/api/admin/top-messages"],
    enabled: adminCheck?.isAdmin === true && tab === "top",
  });

  const { data: messages, isLoading: loadingMessages } = useQuery<AdminMessage[]>({
    queryKey: ["/api/admin/conversations", selectedConv, "messages"],
    enabled: !!selectedConv,
  });

  const blockMut = useMutation({
    mutationFn: async ({ id, action, reason }: { id: string; action: 'block' | 'unblock'; reason?: string }) => {
      const res = await fetch(`/api/admin/users/${id}/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "فشلت العملية");
      }
      return res.json();
    },
    onSuccess: (_, vars) => {
      toast({
        title: vars.action === 'block' ? "تم الحظر" : "تم رفع الحظر",
        description: vars.action === 'block' ? "لن يقدر هذا المستخدم على إرسال رسائل" : "يستطيع المستخدم استخدام التطبيق الآن",
      });
      qc.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setBlockTarget(null);
      setBlockReason("");
    },
    onError: (e: any) => toast({ title: "خطأ", description: e.message, variant: "destructive" }),
  });

  const deleteMut = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/admin/conversations/${id}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("فشل الحذف");
    },
    onSuccess: () => {
      toast({ title: "تم الحذف", description: "تم حذف المحادثة" });
      qc.invalidateQueries({ queryKey: ["/api/admin/conversations"] });
      qc.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      setSelectedConv(null);
    },
    onError: (e: any) => toast({ title: "خطأ", description: e.message, variant: "destructive" }),
  });

  if (checkingAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground">جارِ التحقق من الصلاحيات...</div>
      </div>
    );
  }

  if (!adminCheck?.isAdmin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4 p-6">
        <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
          <Shield className="w-8 h-8 text-destructive" />
        </div>
        <div className="text-xl font-bold">ممنوع الوصول</div>
        <div className="text-muted-foreground text-center">هذه الصفحة مخصصة للأدمن فقط</div>
        <Link href="/">
          <Button variant="outline">العودة للرئيسية</Button>
        </Link>
      </div>
    );
  }

  const filtered = conversations?.filter(c => {
    if (filterLocked && !c.isLocked) return false;
    const q = search.toLowerCase();
    return !q ||
      c.title.toLowerCase().includes(q) ||
      c.title.includes(search) ||
      c.user?.email?.toLowerCase().includes(q) ||
      c.user?.firstName?.toLowerCase().includes(q) ||
      c.user?.lastName?.toLowerCase().includes(q);
  });

  const filteredUsers = users?.filter(u => {
    const q = search.toLowerCase();
    return !q ||
      u.email?.toLowerCase().includes(q) ||
      u.firstName?.toLowerCase().includes(q) ||
      u.lastName?.toLowerCase().includes(q);
  });

  const selectedConvObj = conversations?.find(c => c.id === selectedConv);

  return (
    <div className="min-h-screen bg-background flex flex-col" dir="rtl">
      {/* Header */}
      <div className="border-b border-border bg-secondary/20 px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => setLocation("/")}
          className="p-2 rounded-lg hover:bg-muted transition"
          data-testid="button-back"
        >
          <ArrowRight className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            <h1 className="text-lg font-bold">لوحة الأدمن</h1>
          </div>
          <div className="text-xs text-muted-foreground">إدارة شاملة للمستخدمين والمحادثات والتفاعلات</div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 p-4">
        <StatCard icon={Users} label="مستخدم" value={stats?.totalUsers ?? "—"} color="text-blue-500" />
        <StatCard icon={MessageSquare} label="محادثة" value={stats?.totalConversations ?? "—"} color="text-primary" />
        <StatCard icon={MessageCircle} label="رسالة" value={stats?.totalMessages ?? "—"} color="text-amber-500" />
        <StatCard icon={ThumbsUp} label="إعجاب" value={stats?.totalLikes ?? "—"} color="text-green-500" />
        <StatCard icon={ThumbsDown} label="عدم إعجاب" value={stats?.totalDislikes ?? "—"} color="text-rose-500" />
      </div>

      {/* Tabs */}
      <div className="border-b border-border px-4 flex gap-1 overflow-x-auto">
        <TabButton active={tab === "conversations"} onClick={() => { setTab("conversations"); setSelectedConv(null); }} icon={MessageSquare} label="المحادثات" testId="tab-conversations" />
        <TabButton active={tab === "users"} onClick={() => { setTab("users"); setSelectedConv(null); }} icon={Users} label="المستخدمون" testId="tab-users" />
        <TabButton active={tab === "reactions"} onClick={() => { setTab("reactions"); setSelectedConv(null); }} icon={Activity} label="التفاعلات" testId="tab-reactions" />
        <TabButton active={tab === "top"} onClick={() => { setTab("top"); setSelectedConv(null); }} icon={Trophy} label="الأكثر إعجاباً" testId="tab-top" />
      </div>

      {/* Block dialog */}
      <Dialog open={!!blockTarget} onOpenChange={(o) => { if (!o) { setBlockTarget(null); setBlockReason(""); } }}>
        <DialogContent dir="rtl" className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Ban className="w-5 h-5" />
              {blockTarget?.isBlocked ? "رفع الحظر" : "حظر مستخدم"}
            </DialogTitle>
            <DialogDescription>
              {blockTarget?.isBlocked
                ? `هتسمح للمستخدم ${blockTarget?.email} باستخدام التطبيق مرة أخرى.`
                : `هتمنع المستخدم ${blockTarget?.email} من إرسال رسائل وتوليد صور.`}
            </DialogDescription>
          </DialogHeader>
          {!blockTarget?.isBlocked && (
            <div className="space-y-2">
              <label className="text-sm">سبب الحظر (اختياري)</label>
              <Input
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
                placeholder="مثال: محتوى مسيء"
                data-testid="input-block-reason"
              />
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => { setBlockTarget(null); setBlockReason(""); }}>
              إلغاء
            </Button>
            <Button
              variant={blockTarget?.isBlocked ? "default" : "destructive"}
              onClick={() => blockTarget && blockMut.mutate({
                id: blockTarget.id,
                action: blockTarget.isBlocked ? 'unblock' : 'block',
                reason: blockReason || undefined,
              })}
              disabled={blockMut.isPending}
              data-testid="button-confirm-block"
            >
              {blockMut.isPending ? "جارِ التنفيذ..." : (blockTarget?.isBlocked ? "رفع الحظر" : "حظر")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Main */}
      <div className="flex-1 flex overflow-hidden">
        {/* === CONVERSATIONS TAB === */}
        {tab === "conversations" && (
          <>
            <div className={cn(
              "border-l border-border flex flex-col",
              selectedConv ? "hidden md:flex md:w-1/2 lg:w-2/5" : "flex-1"
            )}>
              <div className="p-3 space-y-2 border-b border-border">
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="بحث بالعنوان، الإيميل، الاسم..."
                    className="pr-9"
                    data-testid="input-search-conversations"
                  />
                </div>
                <div className="flex gap-2 text-xs">
                  <button
                    onClick={() => setFilterLocked(false)}
                    className={cn(
                      "px-3 py-1 rounded-full border transition",
                      !filterLocked ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground"
                    )}
                  >
                    الكل ({conversations?.length ?? 0})
                  </button>
                  <button
                    onClick={() => setFilterLocked(true)}
                    className={cn(
                      "px-3 py-1 rounded-full border transition flex items-center gap-1",
                      filterLocked ? "bg-amber-500 text-white border-amber-500" : "border-border text-muted-foreground"
                    )}
                  >
                    <Lock className="w-3 h-3" />
                    مغلقة ({conversations?.filter(c => c.isLocked).length ?? 0})
                  </button>
                </div>
              </div>

              <ScrollArea className="flex-1">
                {isLoading ? (
                  <div className="p-4 space-y-2">
                    {[1, 2, 3, 4].map(i => (
                      <div key={i} className="h-20 bg-muted/50 rounded-lg animate-pulse" />
                    ))}
                  </div>
                ) : filtered?.length === 0 ? (
                  <div className="text-center text-muted-foreground py-12">لا نتائج</div>
                ) : (
                  <div className="p-2 space-y-1">
                    {filtered?.map(c => (
                      <button
                        key={c.id}
                        onClick={() => setSelectedConv(c.id)}
                        className={cn(
                          "w-full p-3 rounded-xl text-right transition border",
                          selectedConv === c.id
                            ? "bg-primary/10 border-primary/40"
                            : "border-transparent hover:bg-muted/40"
                        )}
                        data-testid={`button-conv-${c.id}`}
                      >
                        <div className="flex items-start gap-3">
                          {c.user?.profileImageUrl ? (
                            <img src={c.user.profileImageUrl} className="w-10 h-10 rounded-full shrink-0" alt="" />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                              <UserIcon className="w-5 h-5 text-primary" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              {c.isLocked && <Lock className="w-3 h-3 text-amber-500 shrink-0" />}
                              <div className="font-medium truncate">{c.title || "محادثة جديدة"}</div>
                            </div>
                            <div className="text-xs text-muted-foreground truncate">
                              {c.user ? `${c.user.firstName} ${c.user.lastName}` : "مستخدم محذوف"}
                            </div>
                            <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-1">
                              <span className="flex items-center gap-1">
                                <MessageCircle className="w-3 h-3" />
                                {c.messageCount}
                              </span>
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {format(new Date(c.updatedAt), "d MMM", { locale: ar })}
                              </span>
                            </div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>

            <div className={cn(
              "flex-1 flex flex-col bg-secondary/10",
              selectedConv ? "flex" : "hidden md:flex"
            )}>
              {selectedConv && selectedConvObj ? (
                <>
                  <div className="border-b border-border p-3 flex items-center gap-3 bg-background/50">
                    <button
                      onClick={() => setSelectedConv(null)}
                      className="md:hidden p-1.5 rounded-lg hover:bg-muted"
                    >
                      <ChevronLeft className="w-5 h-5 rotate-180" />
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold truncate">{selectedConvObj.title}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                        <Mail className="w-3 h-3" />
                        {selectedConvObj.user?.email || "—"}
                      </div>
                    </div>
                    {selectedConvObj.isLocked && (
                      <span className="text-xs px-2 py-1 rounded-full bg-amber-500/20 text-amber-600 flex items-center gap-1">
                        <Lock className="w-3 h-3" /> مغلقة
                      </span>
                    )}
                    <button
                      onClick={() => {
                        if (confirm("احذف هذه المحادثة نهائياً؟")) {
                          deleteMut.mutate(selectedConvObj.id);
                        }
                      }}
                      className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive"
                      title="حذف المحادثة"
                      data-testid={`button-delete-conv-${selectedConvObj.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <ScrollArea className="flex-1 p-4">
                    {loadingMessages ? (
                      <div className="text-center text-muted-foreground">جارِ التحميل...</div>
                    ) : messages?.length === 0 ? (
                      <div className="text-center text-muted-foreground py-12">لا توجد رسائل</div>
                    ) : (
                      <div className="space-y-4 max-w-3xl mx-auto">
                        {messages?.map(m => (
                          <div
                            key={m.id}
                            className={cn(
                              "rounded-2xl p-3 border",
                              m.role === "user"
                                ? "bg-secondary/40 border-border mr-auto max-w-[85%]"
                                : "bg-primary/5 border-primary/20 ml-auto max-w-[85%]"
                            )}
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <div className={cn(
                                "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold",
                                m.role === "user" ? "bg-secondary text-secondary-foreground" : "bg-primary text-primary-foreground"
                              )}>
                                {m.role === "user" ? "م" : "أ"}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {m.role === "user" ? "المستخدم" : "أبو اليزيد"} · {format(new Date(m.createdAt), "d MMM HH:mm", { locale: ar })}
                              </div>
                            </div>
                            <div className="text-sm whitespace-pre-wrap leading-relaxed">{m.content}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <div>اختر محادثة لعرض الرسائل</div>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* === USERS TAB === */}
        {tab === "users" && (
          <div className="flex-1 flex flex-col">
            <div className="p-3 border-b border-border">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="بحث بالاسم أو الإيميل..."
                  className="pr-9"
                  data-testid="input-search-users"
                />
              </div>
            </div>

            <ScrollArea className="flex-1">
              {loadingUsers ? (
                <div className="p-4 space-y-2">
                  {[1, 2, 3, 4].map(i => <div key={i} className="h-20 bg-muted/50 rounded-lg animate-pulse" />)}
                </div>
              ) : filteredUsers?.length === 0 ? (
                <div className="text-center text-muted-foreground py-12">لا مستخدمين</div>
              ) : (
                <div className="p-3 space-y-2 max-w-4xl mx-auto">
                  {filteredUsers?.map(u => (
                    <div
                      key={u.id}
                      className={cn(
                        "p-4 rounded-2xl border bg-card flex items-start gap-3",
                        u.isBlocked && "border-destructive/40 bg-destructive/5"
                      )}
                      data-testid={`row-user-${u.id}`}
                    >
                      {u.profileImageUrl ? (
                        <img src={u.profileImageUrl} className="w-12 h-12 rounded-full shrink-0" alt="" />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                          <UserIcon className="w-6 h-6 text-primary" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold">
                            {[u.firstName, u.lastName].filter(Boolean).join(" ") || "بدون اسم"}
                          </span>
                          {u.isBlocked && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-destructive/20 text-destructive font-medium flex items-center gap-1">
                              <Ban className="w-3 h-3" /> محظور
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Mail className="w-3 h-3" /> {u.email || "—"}
                        </div>
                        {u.blockedReason && (
                          <div className="text-xs text-destructive flex items-center gap-1 mt-1">
                            <AlertTriangle className="w-3 h-3" /> {u.blockedReason}
                          </div>
                        )}
                        <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-2">
                          <span className="flex items-center gap-1">
                            <MessageSquare className="w-3 h-3" /> {u.conversationCount} محادثة
                          </span>
                          <span className="flex items-center gap-1">
                            <MessageCircle className="w-3 h-3" /> {u.messageCount} رسالة
                          </span>
                          {u.createdAt && (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" /> سجّل {formatDistanceToNow(new Date(u.createdAt), { locale: ar, addSuffix: true })}
                            </span>
                          )}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant={u.isBlocked ? "default" : "destructive"}
                        onClick={() => setBlockTarget(u)}
                        className="gap-1.5 shrink-0"
                        data-testid={`button-toggle-block-${u.id}`}
                      >
                        {u.isBlocked ? <CheckCircle2 className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                        {u.isBlocked ? "رفع الحظر" : "حظر"}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        )}

        {/* === REACTIONS TAB === */}
        {tab === "reactions" && (
          <ScrollArea className="flex-1">
            {loadingReactions ? (
              <div className="p-4 space-y-2">
                {[1, 2, 3, 4].map(i => <div key={i} className="h-24 bg-muted/50 rounded-lg animate-pulse" />)}
              </div>
            ) : reactions?.length === 0 ? (
              <div className="text-center text-muted-foreground py-12 px-4">
                <Activity className="w-10 h-10 mx-auto mb-2 opacity-30" />
                لم يقم أي مستخدم بأي تفاعل بعد
              </div>
            ) : (
              <div className="p-3 space-y-2 max-w-4xl mx-auto">
                <div className="text-xs text-muted-foreground px-2 mb-1">آخر التفاعلات (محدّث تلقائياً)</div>
                {reactions?.map(r => (
                  <div
                    key={r.id}
                    className={cn(
                      "p-3 rounded-2xl border bg-card flex gap-3",
                      r.type === 'like' ? "border-green-500/30" : "border-rose-500/30"
                    )}
                    data-testid={`row-reaction-${r.id}`}
                  >
                    <div className={cn(
                      "w-9 h-9 rounded-full flex items-center justify-center shrink-0",
                      r.type === 'like' ? "bg-green-500/15 text-green-600" : "bg-rose-500/15 text-rose-600"
                    )}>
                      {r.type === 'like' ? <ThumbsUp className="w-4 h-4 fill-current" /> : <ThumbsDown className="w-4 h-4 fill-current" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap text-sm">
                        <span className="font-bold">
                          {r.user ? ([r.user.firstName, r.user.lastName].filter(Boolean).join(" ") || r.user.email) : "مستخدم محذوف"}
                        </span>
                        <span className="text-muted-foreground">
                          {r.type === 'like' ? "أعجبه رد" : "لم يعجبه رد"}
                        </span>
                        <span className="text-[10px] text-muted-foreground/70">
                          {formatDistanceToNow(new Date(r.createdAt), { locale: ar, addSuffix: true })}
                        </span>
                      </div>
                      {r.message && (
                        <button
                          onClick={() => { setTab("conversations"); setSelectedConv(r.message!.conversationId); }}
                          className="block w-full text-right mt-1.5 p-2 rounded-lg bg-muted/40 text-xs text-muted-foreground hover:bg-muted/60 transition leading-relaxed"
                        >
                          "{r.message.content.slice(0, 150)}{r.message.content.length > 150 ? "..." : ""}"
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        )}

        {/* === TOP MESSAGES TAB === */}
        {tab === "top" && (
          <ScrollArea className="flex-1">
            {loadingTop ? (
              <div className="p-4 space-y-2">
                {[1, 2, 3, 4].map(i => <div key={i} className="h-24 bg-muted/50 rounded-lg animate-pulse" />)}
              </div>
            ) : topMessages?.length === 0 ? (
              <div className="text-center text-muted-foreground py-12 px-4">
                <Trophy className="w-10 h-10 mx-auto mb-2 opacity-30" />
                لا توجد بيانات بعد
              </div>
            ) : (
              <div className="p-3 space-y-2 max-w-4xl mx-auto">
                <div className="text-xs text-muted-foreground px-2 mb-1 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" /> أكثر الردود إعجاباً
                </div>
                {topMessages?.map((m, idx) => (
                  <button
                    key={m.messageId}
                    onClick={() => { setTab("conversations"); setSelectedConv(m.conversationId); }}
                    className="w-full p-3 rounded-2xl border bg-card hover:bg-muted/40 transition text-right flex gap-3"
                    data-testid={`row-top-message-${m.messageId}`}
                  >
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-bold text-sm",
                      idx === 0 ? "bg-yellow-500/20 text-yellow-600" :
                      idx === 1 ? "bg-gray-400/20 text-gray-600" :
                      idx === 2 ? "bg-orange-500/20 text-orange-600" :
                      "bg-muted text-muted-foreground"
                    )}>
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm leading-relaxed line-clamp-2">{m.content}</div>
                      <div className="flex items-center gap-3 mt-2 text-xs">
                        <span className="flex items-center gap-1 text-green-600">
                          <ThumbsUp className="w-3 h-3" /> {m.likes}
                        </span>
                        <span className="flex items-center gap-1 text-rose-600">
                          <ThumbsDown className="w-3 h-3" /> {m.dislikes}
                        </span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: any) {
  return (
    <div className="bg-secondary/30 border border-border rounded-xl p-3">
      <div className="flex items-center gap-2 mb-1">
        <Icon className={cn("w-4 h-4", color)} />
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  );
}

function TabButton({ active, onClick, icon: Icon, label, testId }: any) {
  return (
    <button
      onClick={onClick}
      data-testid={testId}
      className={cn(
        "flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition whitespace-nowrap",
        active
          ? "border-primary text-primary"
          : "border-transparent text-muted-foreground hover:text-foreground"
      )}
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  );
}
