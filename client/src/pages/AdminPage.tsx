import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import {
  ArrowRight, Users, MessageSquare, MessageCircle, Search,
  User as UserIcon, Lock, Calendar, ChevronLeft, Mail, Shield
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { cn } from "@/lib/utils";

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
}

export default function AdminPage() {
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [selectedConv, setSelectedConv] = useState<number | null>(null);
  const [filterLocked, setFilterLocked] = useState(false);

  const { data: adminCheck, isLoading: checkingAdmin } = useQuery<{ isAdmin: boolean }>({
    queryKey: ["/api/admin/me"],
  });

  const { data: stats } = useQuery<AdminStats>({
    queryKey: ["/api/admin/stats"],
    enabled: adminCheck?.isAdmin === true,
  });

  const { data: conversations, isLoading } = useQuery<AdminConv[]>({
    queryKey: ["/api/admin/conversations"],
    enabled: adminCheck?.isAdmin === true,
  });

  const { data: messages, isLoading: loadingMessages } = useQuery<AdminMessage[]>({
    queryKey: ["/api/admin/conversations", selectedConv, "messages"],
    enabled: !!selectedConv,
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
          <div className="text-xs text-muted-foreground">رسائل ومحادثات جميع المستخدمين</div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 p-4">
        <StatCard icon={Users} label="مستخدم" value={stats?.totalUsers ?? "—"} color="text-blue-500" />
        <StatCard icon={MessageSquare} label="محادثة" value={stats?.totalConversations ?? "—"} color="text-primary" />
        <StatCard icon={MessageCircle} label="رسالة" value={stats?.totalMessages ?? "—"} color="text-amber-500" />
      </div>

      {/* Main */}
      <div className="flex-1 flex overflow-hidden">
        {/* Conversations list */}
        <div className={cn(
          "border-l border-border flex flex-col",
          selectedConv ? "hidden md:flex md:w-1/2 lg:w-2/5" : "flex-1"
        )}>
          {/* Search & filter */}
          <div className="p-3 space-y-2 border-b border-border">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="بحث بالعنوان، الإيميل، الاسم..."
                className="pr-9"
                data-testid="input-search"
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

        {/* Messages view */}
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
