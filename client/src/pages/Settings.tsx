import { Sidebar } from "@/components/Sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Moon, Sun, Bell, Globe, Cpu, Sliders, Shield, Trash2, LogOut, Palette, Mic, Brain, User } from "lucide-react";
import React, { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { api } from "@shared/routes";
import { cn } from "@/lib/utils";

const PERSONALITIES = [
  {
    id: "professional",
    label: "محترف",
    icon: "💼",
    description: "رسمي، دقيق، ومنظم",
  },
  {
    id: "egyptian",
    label: "عامية مصرية",
    icon: "🇪🇬",
    description: "ودود وخفيف على القلب",
  },
  {
    id: "developer",
    label: "مطور",
    icon: "👨‍💻",
    description: "تقني ومتخصص في البرمجة",
  },
  {
    id: "motivational",
    label: "مدرب تحفيزي",
    icon: "🚀",
    description: "محفّز وإيجابي دائماً",
  },
];

// Apply theme and mirror to localStorage for flash-free load
function applyTheme(t: string) {
  try {
    localStorage.setItem("abu-theme", t);
  } catch {}
  if (t === "dark") {
    document.documentElement.classList.add("dark");
  } else if (t === "light") {
    document.documentElement.classList.remove("dark");
  } else {
    const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    document.documentElement.classList.toggle("dark", isDark);
    try { localStorage.removeItem("abu-theme"); } catch {}
  }
}

export default function Settings() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: prefs } = useQuery({
    queryKey: [api.user.getPreferences.path],
    queryFn: async () => {
      const res = await fetch(api.user.getPreferences.path, { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
  });

  const [theme, setTheme] = useState("system");
  const [language, setLanguage] = useState("ar");
  const [aiModel, setAiModel] = useState("gpt-4o");
  const [responseStyle, setResponseStyle] = useState("balanced");
  const [fontSize, setFontSize] = useState("medium");
  const [notifications, setNotifications] = useState(true);
  const [personality, setPersonality] = useState("professional");
  const [userName, setUserName] = useState("");
  const [voiceAutoPlay, setVoiceAutoPlay] = useState(true);
  const [continuousVoice, setContinuousVoice] = useState(false);

  // Sync from DB prefs — only initialize once when prefs first arrives,
  // so editing controls don't get overridden by background refetches.
  const hydratedRef = React.useRef(false);
  useEffect(() => {
    if (prefs && !hydratedRef.current) {
      hydratedRef.current = true;
      setTheme(prefs.theme || "system");
      setLanguage(prefs.language || "ar");
      setAiModel(prefs.aiModel || "gpt-4o");
      setResponseStyle(prefs.responseStyle || "balanced");
      setFontSize(prefs.fontSize || "medium");
      setNotifications(prefs.notificationsEnabled ?? true);
      setPersonality(prefs.personality || "professional");
      setUserName(prefs.userName || "");
      setVoiceAutoPlay(prefs.voiceAutoPlay ?? true);
      setContinuousVoice(prefs.continuousVoice ?? false);
    }
  }, [prefs]);

  // Apply theme immediately and save to localStorage for no-flash
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  // Apply font size
  useEffect(() => {
    const root = document.documentElement;
    root.style.fontSize = fontSize === "small" ? "14px" : fontSize === "large" ? "18px" : "16px";
  }, [fontSize]);

  const updatePrefs = useMutation({
    mutationFn: async (updates: Record<string, any>) => {
      const res = await fetch(api.user.updatePreferences.path, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
        credentials: "include",
      });
      if (!res.ok) throw new Error("فشل حفظ الإعدادات");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.user.getPreferences.path] });
      toast({ title: "تم الحفظ ✓", description: "تم حفظ إعداداتك بنجاح." });
    },
    onError: (err: Error) => {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    },
  });

  const handleSave = () => {
    updatePrefs.mutate({
      theme,
      language,
      aiModel,
      responseStyle,
      fontSize,
      notificationsEnabled: notifications,
      personality,
      userName: userName.trim() || null,
      voiceAutoPlay,
      continuousVoice,
    });
  };

  const clearMemory = async () => {
    if (!confirm("سيتم مسح اسمك المحفوظ وإعادة ضبط الذاكرة الشخصية. هل تريد المتابعة؟")) return;
    setUserName("");
    updatePrefs.mutate({ userName: null });
    toast({ title: "تم مسح الذاكرة", description: "تم إعادة ضبط الذاكرة الشخصية." });
  };

  const clearAllConversations = async () => {
    if (!confirm("هل أنت متأكد من حذف جميع المحادثات؟ هذا الإجراء لا يمكن التراجع عنه.")) return;
    try {
      const res = await fetch("/api/conversations", { credentials: "include" });
      const convList = await res.json();
      await Promise.all(
        convList.map((c: { id: number }) =>
          fetch(`/api/conversations/${c.id}`, { method: "DELETE", credentials: "include" })
        )
      );
      queryClient.invalidateQueries({ queryKey: [api.conversations.list.path] });
      toast({ title: "تم", description: "تم حذف جميع المحادثات." });
    } catch {
      toast({ title: "خطأ", description: "فشل حذف المحادثات.", variant: "destructive" });
    }
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar />
      <main className="flex-1 flex flex-col md:mr-80 h-full overflow-y-auto">
        <div className="max-w-2xl mx-auto w-full space-y-6 p-6 md:p-8">

          <header className="mb-6">
            <h1 className="text-3xl font-bold mb-1">الإعدادات</h1>
            <p className="text-muted-foreground">تخصيص تجربة أبو اليزيد الخاصة بك.</p>
          </header>

          {/* Account */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                الحساب الشخصي
              </CardTitle>
              <CardDescription>معلوماتك الشخصية وخطة الاشتراك.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                {user?.profileImageUrl ? (
                  <img src={user.profileImageUrl} alt="" className="w-16 h-16 rounded-full object-cover border-2 border-primary/20" />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-primary-foreground text-2xl font-bold">
                    {user?.firstName?.[0]}
                  </div>
                )}
                <div>
                  <h3 className="font-semibold text-lg">{user?.firstName} {user?.lastName}</h3>
                  <p className="text-muted-foreground text-sm">{user?.email}</p>
                </div>
              </div>
              <div className="flex justify-between items-center p-3 bg-secondary/30 rounded-xl border">
                <div>
                  <span className="font-medium block text-sm">الخطة الحالية</span>
                  <Badge variant="secondary" className="mt-1">مجاني</Badge>
                </div>
                <Button variant="outline" size="sm" disabled>ترقية الخطة</Button>
              </div>
            </CardContent>
          </Card>

          {/* Long-Term Memory */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-primary" />
                الذاكرة الشخصية
              </CardTitle>
              <CardDescription>معلومات يتذكرها المساعد عنك في كل محادثة.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="font-medium flex items-center gap-2">
                  <User className="w-4 h-4" />
                  اسمك المفضل
                </Label>
                <Input
                  placeholder="مثال: أحمد، أستاذ محمد..."
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  className="text-right"
                  dir="rtl"
                />
                <p className="text-xs text-muted-foreground">سيخاطبك المساعد بهذا الاسم في الردود.</p>
              </div>
              <Button variant="outline" size="sm" onClick={clearMemory} className="gap-2 text-muted-foreground">
                <Brain className="w-4 h-4" />
                مسح الذاكرة الشخصية
              </Button>
            </CardContent>
          </Card>

          {/* AI Personality */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2">
                <Cpu className="w-5 h-5 text-primary" />
                شخصية المساعد
              </CardTitle>
              <CardDescription>اختر أسلوب أبو اليزيد في الحديث.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                {PERSONALITIES.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setPersonality(p.id)}
                    className={cn(
                      "flex flex-col items-start gap-1.5 p-4 rounded-xl border-2 text-right transition-all",
                      personality === p.id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/40 hover:bg-muted/40"
                    )}
                  >
                    <span className="text-2xl">{p.icon}</span>
                    <span className="font-semibold text-sm">{p.label}</span>
                    <span className="text-xs text-muted-foreground">{p.description}</span>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* AI Model & Style */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2">
                <Sliders className="w-5 h-5 text-primary" />
                إعدادات الذكاء الاصطناعي
              </CardTitle>
              <CardDescription>تحكم في أداء وأسلوب الردود.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="font-medium">موديل الذكاء الاصطناعي</Label>
                  <p className="text-xs text-muted-foreground">اختر بين السرعة والجودة</p>
                </div>
                <Select value={aiModel} onValueChange={setAiModel}>
                  <SelectTrigger className="w-[170px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gpt-4o">GPT-4o (أقوى)</SelectItem>
                    <SelectItem value="gpt-4o-mini">GPT-4o Mini (أسرع)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="font-medium">أسلوب الردود</Label>
                  <p className="text-xs text-muted-foreground">طول وتفصيل الردود</p>
                </div>
                <Select value={responseStyle} onValueChange={setResponseStyle}>
                  <SelectTrigger className="w-[170px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="concise">مختصر</SelectItem>
                    <SelectItem value="balanced">متوازن</SelectItem>
                    <SelectItem value="detailed">مفصل</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Voice Settings */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2">
                <Mic className="w-5 h-5 text-primary" />
                إعدادات الصوت
              </CardTitle>
              <CardDescription>تحكم في وضع المحادثة الصوتية.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="font-medium">تشغيل الردود تلقائياً</Label>
                  <p className="text-xs text-muted-foreground">قراءة ردود المساعد بالصوت فوراً</p>
                </div>
                <Switch checked={voiceAutoPlay} onCheckedChange={setVoiceAutoPlay} />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="font-medium">وضع المحادثة المستمرة</Label>
                  <p className="text-xs text-muted-foreground">الاستماع تلقائياً بعد انتهاء الرد</p>
                </div>
                <Switch checked={continuousVoice} onCheckedChange={setContinuousVoice} />
              </div>
            </CardContent>
          </Card>

          {/* Appearance */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2">
                <Palette className="w-5 h-5 text-primary" />
                المظهر والتخصيص
              </CardTitle>
              <CardDescription>تحكم في كيفية ظهور التطبيق.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-muted rounded-lg">
                    <Globe className="w-5 h-5" />
                  </div>
                  <div className="space-y-0.5">
                    <Label className="font-medium">لغة الواجهة</Label>
                    <p className="text-xs text-muted-foreground">اختر اللغة المفضلة</p>
                  </div>
                </div>
                <Select value={language} onValueChange={setLanguage}>
                  <SelectTrigger className="w-[140px]" data-testid="select-language">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ar">العربية</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-muted rounded-lg">
                    {theme === "dark" ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
                  </div>
                  <div className="space-y-0.5">
                    <Label className="font-medium">المظهر</Label>
                    <p className="text-xs text-muted-foreground">الوضع الليلي أو النهاري</p>
                  </div>
                </div>
                <Select value={theme} onValueChange={setTheme}>
                  <SelectTrigger className="w-[140px]" data-testid="select-theme">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">فاتح ☀️</SelectItem>
                    <SelectItem value="dark">داكن 🌙</SelectItem>
                    <SelectItem value="system">النظام</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-muted rounded-lg">
                    <Sliders className="w-5 h-5" />
                  </div>
                  <div className="space-y-0.5">
                    <Label className="font-medium">حجم الخط</Label>
                    <p className="text-xs text-muted-foreground">حجم نص المحادثات</p>
                  </div>
                </div>
                <Select value={fontSize} onValueChange={setFontSize}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="small">صغير</SelectItem>
                    <SelectItem value="medium">متوسط</SelectItem>
                    <SelectItem value="large">كبير</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-muted rounded-lg">
                    <Bell className="w-5 h-5" />
                  </div>
                  <div className="space-y-0.5">
                    <Label className="font-medium">الإشعارات</Label>
                    <p className="text-xs text-muted-foreground">تلقي تنبيهات عند استلام ردود</p>
                  </div>
                </div>
                <Switch checked={notifications} onCheckedChange={setNotifications} />
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          <Button
            className="w-full bg-primary hover:bg-primary/90 shadow-md"
            size="lg"
            onClick={handleSave}
            disabled={updatePrefs.isPending}
          >
            {updatePrefs.isPending ? "جاري الحفظ..." : "حفظ الإعدادات"}
          </Button>

          {/* Danger Zone */}
          <Card className="border-destructive/30">
            <CardHeader className="pb-4">
              <CardTitle className="text-destructive flex items-center gap-2">
                <Shield className="w-5 h-5" />
                منطقة الخطر
              </CardTitle>
              <CardDescription>إجراءات لا يمكن التراجع عنها.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-destructive/5 rounded-xl border border-destructive/10">
                <div>
                  <p className="font-medium text-sm">حذف جميع المحادثات</p>
                  <p className="text-xs text-muted-foreground">سيتم حذف كل المحادثات والرسائل نهائياً</p>
                </div>
                <Button variant="destructive" size="sm" onClick={clearAllConversations} className="gap-2">
                  <Trash2 className="w-4 h-4" />
                  حذف الكل
                </Button>
              </div>
              <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-xl border">
                <div>
                  <p className="font-medium text-sm">تسجيل الخروج</p>
                  <p className="text-xs text-muted-foreground">تسجيل الخروج من جميع الأجهزة</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => logout()}
                  className="gap-2 text-destructive hover:text-destructive border-destructive/20"
                >
                  <LogOut className="w-4 h-4" />
                  خروج
                </Button>
              </div>
            </CardContent>
          </Card>

          <p className="text-center text-xs text-muted-foreground pb-6">
            أبو اليزيد v2.0 · تطوير ArabiX AI · المدير التنفيذي: بلال أمير
          </p>

        </div>
      </main>
    </div>
  );
}
