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

