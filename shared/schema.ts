import { sql } from "drizzle-orm";
import { pgTable, text, serial, integer, boolean, timestamp, jsonb, varchar, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// --- Replit Auth Required Tables ---
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)]
);

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// --- User Preferences ---
export const userPreferences = pgTable("user_preferences", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().unique(),
  language: text("language").default("ar").notNull(),
  theme: text("theme").default("system").notNull(),
  fontSize: text("font_size").default("medium").notNull(),
  accentColor: text("accent_color").default("green").notNull(),
  notificationsEnabled: boolean("notifications_enabled").default(true).notNull(),
  aiModel: text("ai_model").default("gpt-4o").notNull(),
  responseStyle: text("response_style").default("balanced").notNull(),
});

// --- Subscriptions ---
export const subscriptions = pgTable("subscriptions", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().unique(),
  plan: text("plan").default("free").notNull(),
  status: text("status").default("active").notNull(),
  startDate: timestamp("start_date").defaultNow(),
  endDate: timestamp("end_date"),
});

// --- Conversations ---
export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  title: text("title").notNull(),
  isEncrypted: boolean("is_encrypted").default(true).notNull(),
  isPinned: boolean("is_pinned").default(false).notNull(),
  isArchived: boolean("is_archived").default(false).notNull(),
  passwordHash: text("password_hash"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// --- Messages ---
export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull().references(() => conversations.id, { onDelete: 'cascade' }),
  role: text("role").notNull(),
  content: text("content").notNull(),
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
export const insertConversationSchema = createInsertSchema(conversations).omit({ id: true, createdAt: true, updatedAt: true, passwordHash: true });
export const insertMessageSchema = createInsertSchema(messages).omit({ id: true, createdAt: true });

// --- Types ---
export type UserPreferences = typeof userPreferences.$inferSelect;
export type Subscription = typeof subscriptions.$inferSelect;
export type Conversation = typeof conversations.$inferSelect;
export type Message = typeof messages.$inferSelect;

export type InsertUserPreferences = z.infer<typeof insertUserPreferencesSchema>;
export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type InsertMessage = z.infer<typeof insertMessageSchema>;

// Conversation with computed isLocked field (no passwordHash exposed)
export type ConversationPublic = Omit<Conversation, 'passwordHash'> & { isLocked: boolean };

export type CreateConversationRequest = {
  title?: string;
  initialMessage?: string;
};

export type UpdateConversationRequest = Partial<InsertConversation>;

export type CreateMessageRequest = {
  content: string;
  role?: 'user' | 'assistant';
  attachments?: Message['attachments'];
};

export type ChatResponse = {
  message: Message;
};
