import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ShieldCheck, Sparkles, MessageSquareText } from "lucide-react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { useEffect } from "react";

export default function Landing() {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && user) {
      setLocation("/c/new");
    }
  }, [user, isLoading, setLocation]);

  if (isLoading || user) return null;

  const handleStartChat = () => {
    window.location.href = "/api/login";
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden flex flex-col items-center justify-center p-4">
      {/* Decorative Background Elements */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-accent/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
      
      {/* Hero Section */}
      <div className="relative z-10 max-w-4xl w-full text-center space-y-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6 border border-primary/20">
            <Sparkles className="w-4 h-4" />
            <span>مساعدك الشخصي الذكي</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent pb-2 leading-[1.2]">
            أبو اليزيد
          </h1>
          
          <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            مساعد ذكي متطور، صُمم بخصوصية تامة ودعم عربي أصيل. 
            <br className="hidden md:block" />
            رفيقك الرقمي للإبداع والإنتاجية.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-8"
        >
          <Button 
            size="lg" 
            className="text-lg px-8 py-6 rounded-2xl bg-primary hover:bg-primary/90 shadow-lg hover:shadow-primary/25 hover:-translate-y-0.5 transition-all w-full sm:w-auto"
            onClick={handleStartChat}
          >
            <span>ابدأ المحادثة</span>
            <ArrowLeft className="w-5 h-5 mr-2" />
          </Button>
          
          <Button 
            variant="outline" 
            size="lg" 
            className="text-lg px-8 py-6 rounded-2xl w-full sm:w-auto hover:bg-secondary/50"
            disabled
          >
            معرفة المزيد
          </Button>
        </motion.div>

        {/* Features Grid */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="grid md:grid-cols-3 gap-6 mt-20 text-right"
        >
          <div className="p-6 rounded-2xl bg-card border border-border/50 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-4">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold mb-2">خصوصية تامة</h3>
            <p className="text-muted-foreground leading-relaxed">تشفير كامل للبيانات، حيث لا نطلع على محادثاتك أبداً.</p>
          </div>
          
          <div className="p-6 rounded-2xl bg-card border border-border/50 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-4">
              <MessageSquareText className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold mb-2">لغة عربية فصحى</h3>
            <p className="text-muted-foreground leading-relaxed">فهم عميق للهجات واللغة العربية، لتجربة محادثة طبيعية.</p>
          </div>
          
          <div className="p-6 rounded-2xl bg-card border border-border/50 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-4">
              <Sparkles className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold mb-2">ذكاء اصطناعي متطور</h3>
            <p className="text-muted-foreground leading-relaxed">مبني على أحدث النماذج لمساعدتك في الكتابة والتحليل والبرمجة.</p>
          </div>
        </motion.div>
      </div>
      
      {/* Footer */}
      <div className="absolute bottom-4 text-center w-full text-xs text-muted-foreground">
        © 2024 أبو اليزيد. جميع الحقوق محفوظة.
      </div>
    </div>
  );
}
