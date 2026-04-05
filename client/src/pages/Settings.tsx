import { Sidebar } from "@/components/Sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Moon, Sun, Bell, Globe, Cpu, Sliders, Shield, Trash2, LogOut, Palette } from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { api } from "@shared/routes";

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
  const [aiModel, setAiModel] = useState("gpt-4o");
  const [responseStyle, setResponseStyle] = useState("balanced");
  const [fontSize, setFontSize] = useState("medium");
  const [notifications, setNotifications] = useState(true);

  useEffect(() => {
    if (prefs) {
      setTheme(prefs.theme || "system");
      setAiModel(prefs.aiModel || "gpt-4o");
      setResponseStyle(prefs.responseStyle || "balanced");
      setFontSize(prefs.fontSize || "medium");
      setNotifications(prefs.notificationsEnabled ?? true);
    }
  }, [prefs]);

  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else if (theme === "light") {
      document.documentElement.classList.remove("dark");
    } else {
      const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      document.documentElement.classList.toggle("dark", isDark);
    }
  }, [theme]);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("text-sm-app", "text-base-app", "text-lg-app");
    if (fontSize === "small") root.style.fontSize = "14px";
    else if (fontSize === "large") root.style.fontSize = "18px";
    else root.style.fontSize = "16px";
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
      toast({ title: "تم الحفظ", description: "تم حفظ إعداداتك بنجاح." });
    },
    onError: (err: Error) => {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    },
  });

  const handleSave = () => {
    updatePrefs.mutate({ theme, aiModel, responseStyle, fontSize, notificationsEnabled: notifications });
  };

  const clearAllConversations = async () => {
    if (!confirm("هل أنت متأكد من حذف جميع المحادثات؟ هذا الإجراء لا يمكن التراجع عنه.")) return;
    const res = await fetch("/api/conversations", { credentials: "include" });
    const convList = await res.json();
    await Promise.all(
      convList.map((c: { id: number }) => 
        fetch(`/api/conversations/${c.id}`, { method: "DELETE", credentials: "include" })
      )
    );
    queryClient.invalidateQueries({ queryKey: [api.conversations.list.path] });
    toast({ title: "تم", description: "تم حذف جميع المحادثات." });
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

          {/* Account Section */}
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

          {/* AI Settings */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2">
                <Cpu className="w-5 h-5 text-primary" />
                إعدادات الذكاء الاصطناعي
              </CardTitle>
              <CardDescription>تحكم في سلوك المساعد وأدائه.</CardDescription>
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
                <Select defaultValue="ar">
                  <SelectTrigger className="w-[140px]">
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
                  <SelectTrigger className="w-[140px]">
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
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={clearAllConversations}
                  className="gap-2"
                >
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

          {/* Footer */}
          <p className="text-center text-xs text-muted-foreground pb-6">
            أبو اليزيد v2.0 · تطوير ArabiX AI · المدير التنفيذي: بلال أمير
          </p>

        </div>
      </main>
    </div>
  );
}
