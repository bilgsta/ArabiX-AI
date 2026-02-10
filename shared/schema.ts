import { pgTable, text, serial, integer, boolean, timestamp, jsonb, varchar } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// --- Users (Extends Auth Schema) ---
// Note: Basic user fields are in shared/models/auth.ts (users table).
// We'll extend functionality via a separate 'user_settings' table or just assume the auth user is the base.
// For simplicity in this stack, we will assume the `users` table from auth is the source of truth for identity.
// We will add a `subscriptions` table and `user_preferences` table linked to the auth user ID.

// We need to import the users table definition if we want to reference it, 
// but since it's in a separate file (models/auth.ts) and we want to keep schema.ts self-contained for the frontend generator if possible,
// we will just reference the ID type (string/varchar) for foreign keys.

// --- User Preferences ---
export const userPreferences = pgTable("user_preferences", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().unique(), // FK to auth.users.id
  language: text("language").default("ar").notNull(),
  theme: text("theme").default("system").notNull(), // light, dark, system
  fontSize: text("font_size").default("medium").notNull(), // small, medium, large
  accentColor: text("accent_color").default("green").notNull(),
  notificationsEnabled: boolean("notifications_enabled").default(true).notNull(),
});

// --- Subscriptions ---
export const subscriptions = pgTable("subscriptions", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().unique(),
  plan: text("plan").default("free").notNull(), // free, premium
  status: text("status").default("active").notNull(), // active, cancelled, expired
  startDate: timestamp("start_date").defaultNow(),
  endDate: timestamp("end_date"),
});

// --- Conversations ---
export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(), // FK to auth.users.id
  title: text("title").notNull(),
  isEncrypted: boolean("is_encrypted").default(true).notNull(), // Visual indicator
  isPinned: boolean("is_pinned").default(false).notNull(),
  isArchived: boolean("is_archived").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// --- Messages ---
export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull().references(() => conversations.id, { onDelete: 'cascade' }),
  role: text("role").notNull(), // user, assistant, system
  content: text("content").notNull(),
  // For file attachments (images, docs) - simple storage
  attachments: jsonb("attachments").$type<{
    type: 'image' | 'file' | 'audio';
    url: string;
    name: string;
    size?: number;
  }[]>(), 
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// --- Relations ---
export const conversationsRelations = relations(conversations, ({ many }) => ({
  messages: many(messages),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id],
  }),
}));

// --- Schemas ---
export const insertUserPreferencesSchema = createInsertSchema(userPreferences).omit({ id: true });
export const insertSubscriptionSchema = createInsertSchema(subscriptions).omit({ id: true, startDate: true });
export const insertConversationSchema = createInsertSchema(conversations).omit({ id: true, createdAt: true, updatedAt: true });
export const insertMessageSchema = createInsertSchema(messages).omit({ id: true, createdAt: true });

// --- Types ---
export type UserPreferences = typeof userPreferences.$inferSelect;
export type Subscription = typeof subscriptions.$inferSelect;
export type Conversation = typeof conversations.$inferSelect;
export type Message = typeof messages.$inferSelect;

export type InsertUserPreferences = z.infer<typeof insertUserPreferencesSchema>;
export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type InsertMessage = z.infer<typeof insertMessageSchema>;

// --- API Types ---
export type CreateConversationRequest = {
  title?: string;
  initialMessage?: string;
};

export type UpdateConversationRequest = Partial<InsertConversation>;

export type CreateMessageRequest = {
  content: string;
  role?: 'user' | 'assistant'; // Defaults to user
  attachments?: Message['attachments'];
};

export type ChatResponse = {
  message: Message;
};
