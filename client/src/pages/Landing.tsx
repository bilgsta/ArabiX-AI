import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Sparkles, MessageSquareText, Mic, ArrowLeft, Zap } from "lucide-react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { useEffect } from "react";
import logoImg from "@assets/generated_images/abu_alyazid_logo.png";

const FEATURES = [
  {
    icon: ShieldCheck,
    title: "خصوصية تامة",
    description: "تشفير كامل للمحادثات. بياناتك لك وحدك.",
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
  },
  {
    icon: MessageSquareText,
    title: "عربي أصيل",
    description: "فهم عميق للعربية بكل لهجاتها وأساليبها.",
    color: "text-blue-500",
    bg: "bg-blue-500/10",
  },
  {
    icon: Zap,
    title: "ردود فورية",
    description: "مدعوم بـ GPT-4o مع بث مباشر للردود.",
    color: "text-amber-500",
    bg: "bg-amber-500/10",
  },
  {
    icon: Mic,
    title: "محادثة صوتية",
    description: "تحدث وأنصت — تجربة صوتية كاملة بالعربي.",
    color: "text-violet-500",
    bg: "bg-violet-500/10",
  },
];

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

export default function Landing() {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && user) {
      setLocation("/c/new");
    }
  }, [user, isLoading, setLocation]);

  if (isLoading || user) return null;

  return (
    <div className="min-h-screen bg-background relative overflow-hidden flex flex-col">
      {/* Subtle background glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute top-[-10%] right-[10%] w-[500px] h-[500px] rounded-full bg-primary/6 blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[10%] w-[400px] h-[400px] rounded-full bg-primary/4 blur-[100px]" />
      </div>

      {/* Nav */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-5 max-w-6xl mx-auto w-full">
        <div className="flex items-center gap-2.5">
          <img src={logoImg} alt="أبو اليزيد" className="w-9 h-9 rounded-xl shadow-sm ring-1 ring-primary/20 object-cover" />
          <span className="font-bold text-foreground">أبو اليزيد</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground hidden sm:block">بواسطة ArabiX AI</span>
          <Button
            size="sm"
            onClick={() => window.location.href = "/api/login"}
            className="rounded-xl"
          >
            تسجيل الدخول
          </Button>
        </div>
      </nav>

      {/* Hero */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 text-center pb-16">
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="max-w-3xl w-full space-y-8"
        >
          {/* Badge */}
          <motion.div variants={item} className="flex justify-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium">
              <Sparkles className="w-3.5 h-3.5" />
              <span>مساعدك الذكي الشخصي</span>
            </div>
          </motion.div>

          {/* Heading */}
          <motion.div variants={item} className="space-y-4">
            <h1 className="text-6xl md:text-8xl font-black tracking-tight bg-gradient-to-b from-foreground to-foreground/50 bg-clip-text text-transparent leading-tight pb-2">
              أبو اليزيد
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-xl mx-auto leading-relaxed">
              ذكاء اصطناعي عربي صُمم لك — يتحدث معك بطلاقة، يفهمك، ويساعدك على الإبداع والإنتاجية.
            </p>
          </motion.div>

          {/* CTAs */}
          <motion.div variants={item} className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button
              size="lg"
              onClick={() => window.location.href = "/api/login"}
              className="text-base px-8 py-6 rounded-2xl shadow-lg hover:shadow-primary/20 hover:-translate-y-0.5 transition-all group gap-2"
            >
              ابدأ المحادثة مجاناً
              <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              disabled
              className="text-base px-8 py-6 rounded-2xl"
            >
              معرفة المزيد
            </Button>
          </motion.div>

          {/* Social proof */}
          <motion.p variants={item} className="text-xs text-muted-foreground/60">
            مدعوم بـ GPT-4o · تطوير ArabiX AI
          </motion.p>
        </motion.div>

        {/* Features */}
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="mt-20 max-w-4xl w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 px-4"
        >
          {FEATURES.map((f) => (
            <motion.div
              key={f.title}
              variants={item}
              className="flex flex-col items-end text-right p-5 rounded-2xl bg-card/60 border border-border/50 hover:border-border hover:bg-card hover:shadow-md transition-all backdrop-blur-sm"
            >
              <div className={`w-11 h-11 rounded-xl ${f.bg} flex items-center justify-center mb-4`}>
                <f.icon className={`w-5 h-5 ${f.color}`} />
              </div>
              <h3 className="font-bold text-sm mb-1.5">{f.title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{f.description}</p>
            </motion.div>
          ))}
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 text-center py-6 text-xs text-muted-foreground/50 border-t border-border/20">
        © 2025 أبو اليزيد · ArabiX AI · جميع الحقوق محفوظة
      </footer>
    </div>
  );
}
