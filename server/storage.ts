import { db } from "./db";
import { eq, desc, sql } from "drizzle-orm";
import {
  userPreferences, subscriptions, conversations, messages, users,
  type UserPreferences, type Subscription, type Conversation, type Message, type User,
  type InsertUserPreferences, type InsertConversation, type InsertMessage
} from "@shared/schema";

export interface IStorage {
  getUserPreferences(userId: string): Promise<UserPreferences | undefined>;
  updateUserPreferences(userId: string, prefs: Partial<InsertUserPreferences>): Promise<UserPreferences>;

  getSubscription(userId: string): Promise<Subscription | undefined>;
  createSubscription(userId: string, plan?: string): Promise<Subscription>;

  getConversations(userId: string): Promise<Conversation[]>;
  getConversation(id: number): Promise<Conversation | undefined>;
  createConversation(userId: string, conversation: InsertConversation): Promise<Conversation>;
  updateConversation(id: number, conversation: Partial<InsertConversation>): Promise<Conversation>;
  deleteConversation(id: number): Promise<void>;
  setConversationPassword(id: number, hash: string | null): Promise<Conversation>;

  getMessages(conversationId: number): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;

  // Admin methods
  getAllConversationsWithUsers(): Promise<Array<Conversation & { user: User | null; messageCount: number }>>;
  getAdminStats(): Promise<{ totalUsers: number; totalConversations: number; totalMessages: number }>;
  getAllUsers(): Promise<User[]>;
}

export class DatabaseStorage implements IStorage {
  async getUserPreferences(userId: string): Promise<UserPreferences | undefined> {
    const [prefs] = await db.select().from(userPreferences).where(eq(userPreferences.userId, userId));
    return prefs;
  }

  async updateUserPreferences(userId: string, prefs: Partial<InsertUserPreferences>): Promise<UserPreferences> {
    const [updated] = await db
      .insert(userPreferences)
      .values({ userId, ...prefs } as InsertUserPreferences)
      .onConflictDoUpdate({
        target: userPreferences.userId,
        set: prefs,
      })
      .returning();
    return updated;
  }

  async getSubscription(userId: string): Promise<Subscription | undefined> {
    const [sub] = await db.select().from(subscriptions).where(eq(subscriptions.userId, userId));
    return sub;
  }

  async createSubscription(userId: string, plan: string = "free"): Promise<Subscription> {
    const [sub] = await db
      .insert(subscriptions)
      .values({ userId, plan, status: "active" })
      .onConflictDoUpdate({
        target: subscriptions.userId,
        set: { plan, status: "active" },
      })
      .returning();
    return sub;
  }

  async getConversations(userId: string): Promise<Conversation[]> {
    return db
      .select()
      .from(conversations)
      .where(eq(conversations.userId, userId))
      .orderBy(desc(conversations.updatedAt));
  }

  async getConversation(id: number): Promise<Conversation | undefined> {
    const [conv] = await db.select().from(conversations).where(eq(conversations.id, id));
    return conv;
  }

  async createConversation(userId: string, conversation: InsertConversation): Promise<Conversation> {
    const [conv] = await db.insert(conversations).values(conversation).returning();
    return conv;
  }

  async updateConversation(id: number, conversation: Partial<InsertConversation>): Promise<Conversation> {
    const [updated] = await db
      .update(conversations)
      .set({ ...conversation, updatedAt: new Date() })
      .where(eq(conversations.id, id))
      .returning();
    return updated;
  }

  async deleteConversation(id: number): Promise<void> {
    await db.delete(conversations).where(eq(conversations.id, id));
  }

  async setConversationPassword(id: number, hash: string | null): Promise<Conversation> {
    const [updated] = await db
      .update(conversations)
      .set({ passwordHash: hash, updatedAt: new Date() })
      .where(eq(conversations.id, id))
      .returning();
    return updated;
  }

  async getMessages(conversationId: number): Promise<Message[]> {
    return db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(messages.createdAt);
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    const [msg] = await db.insert(messages).values(message).returning();
    return msg;
  }

  // ── Admin methods ──
  async getAllConversationsWithUsers(): Promise<Array<Conversation & { user: User | null; messageCount: number }>> {
    const rows = await db
      .select({
        conv: conversations,
        user: users,
        messageCount: sql<number>`COALESCE((SELECT COUNT(*) FROM ${messages} WHERE ${messages.conversationId} = ${conversations.id}), 0)::int`,
      })
      .from(conversations)
      .leftJoin(users, eq(users.id, conversations.userId))
      .orderBy(desc(conversations.updatedAt));

    return rows.map(r => ({ ...r.conv, user: r.user, messageCount: r.messageCount }));
  }

  async getAdminStats(): Promise<{ totalUsers: number; totalConversations: number; totalMessages: number }> {
    const [u] = await db.select({ count: sql<number>`COUNT(*)::int` }).from(users);
    const [c] = await db.select({ count: sql<number>`COUNT(*)::int` }).from(conversations);
    const [m] = await db.select({ count: sql<number>`COUNT(*)::int` }).from(messages);
    return { totalUsers: u.count, totalConversations: c.count, totalMessages: m.count };
  }

  async getAllUsers(): Promise<User[]> {
    return db.select().from(users).orderBy(desc(users.createdAt));
  }
}

export const storage = new DatabaseStorage();
