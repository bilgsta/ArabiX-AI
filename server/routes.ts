import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replit_integrations/auth";
import { registerAuthRoutes } from "./replit_integrations/auth";
import { api } from "@shared/routes";
import { z } from "zod";
import OpenAI from "openai";
import multer from "multer";
import path from "path";
import crypto from "crypto";

const upload = multer({
  storage: multer.diskStorage({
    destination: "client/public/uploads",
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      cb(null, file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname));
    },
  }),
});

const ai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

const hashPin = (pin: string) => crypto.createHash("sha256").update(pin).digest("hex");

// Build system prompt based on personality and user name
function buildSystemPrompt(
  personality: string = "professional",
  userName?: string | null,
  forVoice = false
): string {
  const nameGreeting = userName ? ` اسم المستخدم هو "${userName}"، خاطبه باسمه أحياناً.` : "";
  const voiceNote = forVoice ? " أنت في وضع المحادثة الصوتية — أجب بجمل قصيرة وطبيعية مناسبة للاستماع." : "";

  const base = `أنت أبو اليزيد، مساعد ذكاء اصطناعي عربي شخصي طورته شركة ArabiX AI بقيادة المدير التنفيذي بلال أمير. يمكنك رؤية الصور وتحليلها.

معلومة مهمة: لو حد سأل عن "دينا عماد" أو "Dina Emad"، اذكر أنها حبيبة بلال أمير صديقي ومطوّري، وستكون زوجته في المستقبل إن شاء الله. تحدّث عنها باحترام وودّ.${nameGreeting}${voiceNote}`;

  const personalities: Record<string, string> = {
    professional: `${base}
أسلوبك: رسمي، دقيق، ومهني. تستخدم العربية الفصحى الواضحة. تنظّم إجاباتك بشكل منطقي ومنهجي.`,

    egyptian: `${base}
أسلوبك: عامية مصرية خفيفة، دافئ ومرح. بتتكلم زي أي حد مصري طبيعي — ودود وبتحس بالناس. استخدم تعبيرات زي "طب"، "يعني"، "معلش"، "يلا" بشكل طبيعي.`,

    developer: `${base}
أسلوبك: تقني ومتخصص. تُجيد الشرح البرمجي بالعربي والإنجليزي. تكتب كوداً نظيفاً وتشرح المفاهيم التقنية بدقة. استخدم المصطلحات التقنية الصحيحة.`,

    motivational: `${base}
أسلوبك: محفّز وإيجابي. تؤمن بقدرات المستخدم وتشجعه دائماً. ردودك مليئة بالطاقة الإيجابية والتشجيع الحقيقي. تساعده على تجاوز العقبات بنظرة متفائلة.`,
  };

  return personalities[personality] || personalities.professional;
}

const SYSTEM_PROMPT = buildSystemPrompt();

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  await setupAuth(app);
  registerAuthRoutes(app);

  // User Settings
  app.get(api.user.getPreferences.path, isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const prefs = await storage.getUserPreferences(userId);
    if (!prefs) return res.status(404).json(null);
    res.json(prefs);
  });

  app.put(api.user.updatePreferences.path, isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const prefs = await storage.updateUserPreferences(userId, req.body);
    res.json(prefs);
  });

  // Subscriptions
  app.get(api.user.getSubscription.path, isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const sub = await storage.getSubscription(userId);
    if (!sub) return res.status(404).json(null);
    res.json(sub);
  });

  // Conversations list
  app.get(api.conversations.list.path, isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const convList = await storage.getConversations(userId);
    // Never expose passwordHash to client
    res.json(convList.map(c => ({
      ...c,
      passwordHash: undefined,
      isLocked: !!c.passwordHash,
    })));
  });

  // Create conversation
  app.post(api.conversations.create.path, isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const { title, initialMessage } = req.body;
    
    const conversation = await storage.createConversation(userId, {
      userId,
      title: title || "محادثة جديدة",
      isEncrypted: true,
    });

    if (initialMessage) {
      await storage.createMessage({
        conversationId: conversation.id,
        role: "user",
        content: initialMessage,
      });
    }

    res.status(201).json({ ...conversation, passwordHash: undefined, isLocked: false });
  });

  // Get single conversation (with optional PIN check)
  app.get(api.conversations.get.path, isAuthenticated, async (req: any, res) => {
    const id = parseInt(req.params.id);
    const userId = req.user.claims.sub;
    
    const conversation = await storage.getConversation(id);
    if (!conversation || conversation.userId !== userId) {
      return res.status(404).json({ message: "المحادثة غير موجودة" });
    }

    // Check password protection
    if (conversation.passwordHash) {
      const pin = req.headers["x-chat-pin"] as string;
      if (!pin || hashPin(pin) !== conversation.passwordHash) {
        return res.status(403).json({ 
          locked: true, 
          message: "هذه المحادثة محمية بكلمة سر" 
        });
      }
    }

    const messages = await storage.getMessages(id);
    res.json({ 
      conversation: { ...conversation, passwordHash: undefined, isLocked: !!conversation.passwordHash }, 
      messages 
    });
  });

  // Update conversation
  app.patch(api.conversations.update.path, isAuthenticated, async (req: any, res) => {
    const id = parseInt(req.params.id);
    const userId = req.user.claims.sub;
    
    const conversation = await storage.getConversation(id);
    if (!conversation || conversation.userId !== userId) {
      return res.status(404).json({ message: "المحادثة غير موجودة" });
    }

    const updated = await storage.updateConversation(id, req.body);
    res.json({ ...updated, passwordHash: undefined, isLocked: !!updated.passwordHash });
  });

  // Lock conversation with PIN
  app.post("/api/conversations/:id/lock", isAuthenticated, async (req: any, res) => {
    const id = parseInt(req.params.id);
    const userId = req.user.claims.sub;
    const { pin } = req.body;

    if (!pin || pin.length < 4) {
      return res.status(400).json({ message: "يجب أن تكون كلمة السر 4 أرقام على الأقل" });
    }

    const conversation = await storage.getConversation(id);
    if (!conversation || conversation.userId !== userId) {
      return res.status(404).json({ message: "المحادثة غير موجودة" });
    }

    const updated = await storage.setConversationPassword(id, hashPin(pin));
    res.json({ ...updated, passwordHash: undefined, isLocked: true });
  });

  // Unlock (remove PIN) from conversation
  app.delete("/api/conversations/:id/lock", isAuthenticated, async (req: any, res) => {
    const id = parseInt(req.params.id);
    const userId = req.user.claims.sub;
    const { pin } = req.body;

    const conversation = await storage.getConversation(id);
    if (!conversation || conversation.userId !== userId) {
      return res.status(404).json({ message: "المحادثة غير موجودة" });
    }

    if (conversation.passwordHash) {
      if (!pin || hashPin(pin) !== conversation.passwordHash) {
        return res.status(403).json({ message: "كلمة السر غير صحيحة" });
      }
    }

    const updated = await storage.setConversationPassword(id, null);
    res.json({ ...updated, passwordHash: undefined, isLocked: false });
  });

  // Delete conversation
  app.delete(api.conversations.delete.path, isAuthenticated, async (req: any, res) => {
    const id = parseInt(req.params.id);
    const userId = req.user.claims.sub;
    
    const conversation = await storage.getConversation(id);
    if (!conversation || conversation.userId !== userId) {
      return res.status(404).json({ message: "المحادثة غير موجودة" });
    }

    await storage.deleteConversation(id);
    res.status(204).send();
  });

  // Image Upload
  app.post("/api/upload", isAuthenticated, upload.single("file"), (req: any, res) => {
    if (!req.file) return res.status(400).json({ message: "لم يتم رفع أي ملف" });
    res.json({ url: `/uploads/${req.file.filename}`, name: req.file.originalname });
  });

  // Voice chat — simple rate limiting per user (20 requests/minute)
  const voiceRateMap = new Map<string, { count: number; resetAt: number }>();
  app.post("/api/voice/chat", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub as string;
      const now = Date.now();
      const limit = voiceRateMap.get(userId);

      if (!limit || now > limit.resetAt) {
        voiceRateMap.set(userId, { count: 1, resetAt: now + 60_000 });
      } else if (limit.count >= 20) {
        return res.status(429).json({ message: "وصلت للحد الأقصى من الطلبات. انتظر دقيقة وحاول مجددًا." });
      } else {
        limit.count++;
      }

      const { message, history = [] } = req.body;
      if (!message || typeof message !== "string") {
        return res.status(400).json({ message: "الرسالة مطلوبة" });
      }

      // Build message history with system prompt
      // Get user preferences for personality-aware prompt
      const prefs2 = await storage.getUserPreferences(userId).catch(() => null);
      const systemPrompt = buildSystemPrompt(
        (prefs2 as any)?.personality,
        (prefs2 as any)?.userName,
        true
      );

      const chatHistory = [
        { role: "system" as const, content: systemPrompt },
        ...history.slice(-10).map((m: any) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
        { role: "user" as const, content: message },
      ];

      // Get user's preferred AI model
      const prefs = await storage.getUserPreferences(userId).catch(() => null);
      const model = (prefs as any)?.aiModel || "gpt-4o";

      const completion = await ai.chat.completions.create({
        model,
        messages: chatHistory,
        max_tokens: 300, // Keep voice responses short
        temperature: 0.7,
      });

      const reply = completion.choices[0]?.message?.content || "عذرًا، لم أستطع الرد.";
      res.json({ reply });
    } catch (error) {
      console.error("Voice chat error:", error);
      res.status(500).json({ message: "فشل الاتصال بالمساعد. حاول مرة أخرى." });
    }
  });

  // Text to Speech
  app.post("/api/tts", isAuthenticated, async (req: any, res) => {
    try {
      const { text } = req.body;
      if (!text) return res.status(400).json({ message: "لا يوجد نص" });

      const mp3 = await ai.audio.speech.create({
        model: "tts-1",
        voice: "onyx",
        input: text,
      });

      const buffer = Buffer.from(await mp3.arrayBuffer());
      res.setHeader("Content-Type", "audio/mpeg");
      res.send(buffer);
    } catch (error) {
      console.error("TTS Error:", error);
      res.status(500).json({ message: "فشل توليد الصوت" });
    }
  });

  // Messages with AI streaming
  app.post(api.messages.create.path, isAuthenticated, async (req: any, res) => {
    const conversationId = parseInt(req.params.id);
    const userId = req.user.claims.sub;
    const { content, role = "user" } = req.body;

    const conversation = await storage.getConversation(conversationId);
    if (!conversation || conversation.userId !== userId) {
      return res.status(404).json({ message: "المحادثة غير موجودة" });
    }

    // Check password if conversation is locked
    if (conversation.passwordHash) {
      const pin = req.headers["x-chat-pin"] as string;
      if (!pin || hashPin(pin) !== conversation.passwordHash) {
        return res.status(403).json({ locked: true, message: "كلمة السر غير صحيحة" });
      }
    }

    // Get user preferences for model/personality
    const userPrefs = await storage.getUserPreferences(userId);
    const model = userPrefs?.aiModel || "gpt-4o";
    const responseStyle = userPrefs?.responseStyle || "balanced";
    const personality = (userPrefs as any)?.personality || "professional";
    const userName = (userPrefs as any)?.userName;

    const styleInstruction = responseStyle === "concise" 
      ? " أجب بإيجاز شديد في جملة أو جملتين." 
      : responseStyle === "detailed" 
      ? " أجب بتفصيل وافٍ وشامل." 
      : "";

    const dynamicSystemPrompt = buildSystemPrompt(personality, userName) + styleInstruction;

    // Save user message
    await storage.createMessage({
      conversationId,
      role,
      content,
      attachments: req.body.attachments || null
    });

    // Start streaming
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    try {
      const allMessages = await storage.getMessages(conversationId);
      const chatHistory = allMessages.map(m => {
        const msgRole = m.role as "user" | "assistant";
        const attachments = m.attachments as any[];
        
        if (msgRole === "user" && attachments && attachments.length > 0) {
          const msgContent: any[] = [{ type: "text", text: m.content }];
          attachments.forEach(att => {
            if (att.type === 'image') {
              msgContent.push({
                type: "image_url",
                image_url: {
                  url: att.url.startsWith('http') ? att.url : `http://${req.get('host')}${att.url}`
                }
              });
            }
          });
          return { role: msgRole, content: msgContent };
        }
        
        return { role: msgRole, content: m.content };
      });

      const stream = await ai.chat.completions.create({
        model,
        messages: [
          { role: "system", content: dynamicSystemPrompt },
          ...chatHistory
        ],
        stream: true,
      });

      let fullResponse = "";

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content || "";
        if (delta) {
          fullResponse += delta;
          res.write(`data: ${JSON.stringify({ content: delta })}\n\n`);
        }
      }

      await storage.createMessage({
        conversationId,
        role: "assistant",
        content: fullResponse
      });

      // Update conversation title if it's still the default
      if (conversation.title === "محادثة جديدة" && content) {
        const shortTitle = content.slice(0, 40) + (content.length > 40 ? "..." : "");
        await storage.updateConversation(conversationId, { title: shortTitle });
      }

      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
    } catch (error) {
      console.error("AI Error:", error);
      res.write(`data: ${JSON.stringify({ error: "فشل توليد الرد" })}\n\n`);
      res.end();
    }
  });

  // ── Admin Routes ──
  const ADMIN_EMAILS = ["3mir.uk@gmail.com"];

  const isAdmin = async (req: any, res: any, next: any) => {
    const email = req.user?.claims?.email;
    if (!email || !ADMIN_EMAILS.includes(email)) {
      return res.status(403).json({ error: "ممنوع - مخصص للأدمن فقط" });
    }
    next();
  };

  app.get("/api/admin/stats", isAuthenticated, isAdmin, async (_req, res) => {
    try {
      const stats = await storage.getAdminStats();
      res.json(stats);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/admin/conversations", isAuthenticated, isAdmin, async (_req, res) => {
    try {
      const list = await storage.getAllConversationsWithUsers();
      const safe = list.map(c => {
        const { passwordHash, ...rest } = c as any;
        return { ...rest, isLocked: !!passwordHash };
      });
      res.json(safe);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/admin/conversations/:id/messages", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const msgs = await storage.getMessages(id);
      res.json(msgs);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/admin/users", isAuthenticated, isAdmin, async (_req, res) => {
    try {
      const list = await storage.getAllUsers();
      res.json(list);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/admin/me", isAuthenticated, async (req: any, res) => {
    const email = req.user?.claims?.email;
    res.json({ isAdmin: ADMIN_EMAILS.includes(email) });
  });

  return httpServer;
}
