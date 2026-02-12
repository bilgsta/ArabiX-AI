import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replit_integrations/auth";
import { registerAuthRoutes } from "./replit_integrations/auth";
import { registerChatRoutes } from "./replit_integrations/chat";
import { api } from "@shared/routes";
import { z } from "zod";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // 1. Setup Auth
  await setupAuth(app);
  registerAuthRoutes(app);

  // 2. Register Chat Routes (Integration)
  // Note: The integration's registerChatRoutes creates endpoints like /api/conversations
  // which might conflict with our custom implementation below.
  // Ideally, we should unify them. Since I'm building a custom app with specific requirements,
  // I will use my custom implementation for better control over the "E2EE" flag and specific fields,
  // but I might leverage the integration's internals if needed.
  // For now, I'll NOT register the default chat integration routes to avoid conflict,
  // and instead implement the logic here using the integration's OpenAI client.
  
  // registerChatRoutes(app); // Commented out to avoid conflict

  // --- Custom Routes ---

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

  // Conversations
  app.get(api.conversations.list.path, isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const conversations = await storage.getConversations(userId);
    res.json(conversations);
  });

  app.post(api.conversations.create.path, isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const { title, initialMessage } = req.body;
    
    const conversation = await storage.createConversation(userId, {
      title: title || "New Chat",
      isEncrypted: true, // Defaulting to true as per requirements
    });

    if (initialMessage) {
      await storage.createMessage({
        conversationId: conversation.id,
        role: "user",
        content: initialMessage,
      });
      // Trigger AI response? Use separate message endpoint for that flow usually.
    }

    res.status(201).json(conversation);
  });

  app.get(api.conversations.get.path, isAuthenticated, async (req: any, res) => {
    const id = parseInt(req.params.id);
    const userId = req.user.claims.sub;
    
    const conversation = await storage.getConversation(id);
    if (!conversation || conversation.userId !== userId) {
      return res.status(404).json({ message: "Conversation not found" });
    }

    const messages = await storage.getMessages(id);
    res.json({ conversation, messages });
  });

  app.delete(api.conversations.delete.path, isAuthenticated, async (req: any, res) => {
    const id = parseInt(req.params.id);
    const userId = req.user.claims.sub;
    
    const conversation = await storage.getConversation(id);
    if (!conversation || conversation.userId !== userId) {
      return res.status(404).json({ message: "Conversation not found" });
    }

    await storage.deleteConversation(id);
    res.status(204).send();
  });

  // Messages (with OpenAI integration)
  app.post(api.messages.create.path, isAuthenticated, async (req: any, res) => {
    const conversationId = parseInt(req.params.id);
    const userId = req.user.claims.sub;
    const { content, role = "user" } = req.body;

    // Verify ownership
    const conversation = await storage.getConversation(conversationId);
    if (!conversation || conversation.userId !== userId) {
      return res.status(404).json({ message: "Conversation not found" });
    }

    // Save user message
    const userMessage = await storage.createMessage({
      conversationId,
      role,
      content,
    });

    res.status(201).json(userMessage);
  });
  
  // Real-time Chat Streaming Endpoint
  app.post("/api/conversations/:id/messages/stream", isAuthenticated, async (req: any, res) => {
    const conversationId = parseInt(req.params.id);
    const userId = req.user.claims.sub;

    const conversation = await storage.getConversation(conversationId);
    if (!conversation || conversation.userId !== userId) {
      return res.status(404).json({ message: "Conversation not found" });
    }

    const messages = await storage.getMessages(conversationId);
    const chatHistory = messages.map(m => ({
      role: m.role as "user" | "assistant",
      content: m.content
    }));

    const openai = require("openai").default;
    const ai = new openai({
        apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
        baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
    });

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    try {
      const stream = await ai.chat.completions.create({
        model: "gpt-5.1",
        messages: [
            { role: "system", content: "أنت أبو اليزيد، مساعد ذكي شخصي طورته شركة ArabiX AI. أنت تتحدث العربية بطلاقة وتعطي الأولوية لخصوصية المستخدم. هويتك هي: أنا أبو اليزيد، مساعد ذكي شخصي تم تطويره بواسطة شركة ArabiX AI، بقيادة المدير التنفيذي بلال أمير، وأعمل على بنية تحتية مستقلة وآمنة لخدمة المستخدم العربي." },
            ...chatHistory
        ],
        stream: true,
      });

      let fullResponse = "";

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || "";
        if (content) {
          fullResponse += content;
          res.write(`data: ${JSON.stringify({ content })}\n\n`);
        }
      }

      await storage.createMessage({
        conversationId,
        role: "assistant",
        content: fullResponse
      });

      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
    } catch (error) {
      console.error("AI Error:", error);
      res.write(`data: ${JSON.stringify({ error: "Failed to generate response" })}\n\n`);
      res.end();
    }
  });

  return httpServer;
}
