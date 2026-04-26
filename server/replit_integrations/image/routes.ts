import type { Express, Request, Response } from "express";
import { openai } from "./client";
import { isAuthenticated } from "../auth";
import { storage } from "../../storage";
import path from "path";
import fs from "fs";
import crypto from "crypto";

const UPLOADS_DIR = path.resolve("client/public/uploads");
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

export function registerImageRoutes(app: Express): void {
  // Generate AI image and (optionally) save it as a message in a conversation
  app.post("/api/generate-image", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub as string;
      const user = await storage.getUserById(userId);
      if (user?.isBlocked) return res.status(403).json({ error: "تم حظر حسابك" });

      const { prompt, size = "1024x1024", conversationId } = req.body || {};
      if (!prompt || typeof prompt !== "string") {
        return res.status(400).json({ error: "أدخل وصفًا للصورة" });
      }

      const response = await openai.images.generate({
        model: "gpt-image-1",
        prompt,
        n: 1,
        size: size as "1024x1024" | "1792x1024" | "1024x1792",
      } as any);

      const imageData = response.data?.[0];
      if (!imageData) return res.status(500).json({ error: "فشل توليد الصورة" });

      // Always persist the result to /uploads so it can be re-displayed and inspected later
      let savedUrl: string | null = null;
      try {
        const filename = `gen-${Date.now()}-${crypto.randomBytes(4).toString("hex")}.png`;
        const filePath = path.join(UPLOADS_DIR, filename);
        if (imageData.b64_json) {
          fs.writeFileSync(filePath, Buffer.from(imageData.b64_json, "base64"));
          savedUrl = `/uploads/${filename}`;
        } else if (imageData.url) {
          const r = await fetch(imageData.url);
          if (r.ok) {
            const buf = Buffer.from(await r.arrayBuffer());
            fs.writeFileSync(filePath, buf);
            savedUrl = `/uploads/${filename}`;
          }
        }
      } catch (e) {
        console.error("Could not persist generated image:", e);
      }

      const finalUrl = savedUrl || imageData.url || null;
      if (!finalUrl) return res.status(500).json({ error: "فشل حفظ الصورة" });

      // Optionally attach to a conversation as a user prompt + assistant image response
      if (conversationId) {
        const convId = parseInt(String(conversationId));
        const conv = await storage.getConversation(convId);
        if (conv && conv.userId === userId) {
          await storage.createMessage({
            conversationId: convId,
            role: "user",
            content: `🎨 ارسم: ${prompt}`,
          });
          await storage.createMessage({
            conversationId: convId,
            role: "assistant",
            content: `تفضّل الصورة المطلوبة:\n\n${prompt}`,
            attachments: [{ type: "image", url: finalUrl, name: "generated.png" }] as any,
          });
          if (conv.title === "محادثة جديدة") {
            await storage.updateConversation(convId, { title: prompt.slice(0, 40) });
          }
        }
      }

      res.json({ url: finalUrl, b64_json: imageData.b64_json });
    } catch (error: any) {
      console.error("Error generating image:", error);
      res.status(500).json({ error: error?.message || "فشل توليد الصورة" });
    }
  });
}

