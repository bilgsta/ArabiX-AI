import { Sidebar } from "@/components/Sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import { Moon, Sun, Bell, Globe } from "lucide-react";
import { useState, useEffect } from "react";

export default function Settings() {
  const { user } = useAuth();
  const [theme, setTheme] = useState("light");

  useEffect(() => {
    // Simple theme toggle logic for demo
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar />
      <main className="flex-1 flex flex-col md:mr-80 h-full overflow-y-auto p-4 md:p-8">
        <div className="max-w-2xl mx-auto w-full space-y-8">
          
          <header className="mb-8">
            <h1 className="text-3xl font-bold mb-2">الإعدادات</h1>
            <p className="text-muted-foreground">تخصيص تجربة أبو اليزيد الخاصة بك.</p>
          </header>

          {/* Account Section */}
          <Card>
            <CardHeader>
              <CardTitle>الحساب الشخصي</CardTitle>
              <CardDescription>معلوماتك الشخصية وخطة الاشتراك.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary text-2xl font-bold">
                  {user?.firstName?.[0]}
                </div>
                <div>
                  <h3 className="font-semibold text-lg">{user?.firstName} {user?.lastName}</h3>
                  <p className="text-muted-foreground">{user?.email}</p>
                </div>
              </div>
              <div className="pt-4 border-t">
                <div className="flex justify-between items-center p-3 bg-secondary/30 rounded-lg">
                  <div>
                    <span className="font-medium block">الخطة الحالية</span>
                    <span className="text-sm text-muted-foreground">مجاني (Free)</span>
                  </div>
                  <Button variant="outline" disabled>ترقية الخطة</Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Preferences Section */}
          <Card>
            <CardHeader>
              <CardTitle>التفضيلات والمظهر</CardTitle>
              <CardDescription>تحكم في كيفية ظهور التطبيق.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-muted rounded-lg"><Globe className="w-5 h-5" /></div>
                  <div className="space-y-0.5">
                    <Label>لغة الواجهة</Label>
                    <p className="text-xs text-muted-foreground">اختر اللغة المفضلة للتطبيق</p>
                  </div>
                </div>
                <Select defaultValue="ar">
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="اختر اللغة" />
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
                    {theme === 'dark' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
                  </div>
                  <div className="space-y-0.5">
                    <Label>المظهر</Label>
                    <p className="text-xs text-muted-foreground">الوضع الليلي أو النهاري</p>
                  </div>
                </div>
                <Select value={theme} onValueChange={setTheme}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">فاتح</SelectItem>
                    <SelectItem value="dark">داكن</SelectItem>
                    <SelectItem value="system">النظام</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-muted rounded-lg"><Bell className="w-5 h-5" /></div>
                  <div className="space-y-0.5">
                    <Label>الإشعارات</Label>
                    <p className="text-xs text-muted-foreground">تلقي تنبيهات عند استلام ردود</p>
                  </div>
                </div>
                <Switch defaultChecked />
              </div>

            </CardContent>
          </Card>

        </div>
      </main>
    </div>
  );
}
