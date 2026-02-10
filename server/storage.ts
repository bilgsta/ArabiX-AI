import { db } from "./db";
import { eq, desc } from "drizzle-orm";
import {
  userPreferences, subscriptions, conversations, messages,
  type UserPreferences, type Subscription, type Conversation, type Message,
  type InsertUserPreferences, type InsertConversation, type InsertMessage
} from "@shared/schema";

export interface IStorage {
  // User Preferences
  getUserPreferences(userId: string): Promise<UserPreferences | undefined>;
  updateUserPreferences(userId: string, prefs: Partial<InsertUserPreferences>): Promise<UserPreferences>;

  // Subscriptions
  getSubscription(userId: string): Promise<Subscription | undefined>;
  createSubscription(userId: string, plan?: string): Promise<Subscription>;

  // Conversations
  getConversations(userId: string): Promise<Conversation[]>;
  getConversation(id: number): Promise<Conversation | undefined>;
  createConversation(userId: string, conversation: InsertConversation): Promise<Conversation>;
  updateConversation(id: number, conversation: Partial<InsertConversation>): Promise<Conversation>;
  deleteConversation(id: number): Promise<void>;

  // Messages
  getMessages(conversationId: number): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
}

export class DatabaseStorage implements IStorage {
  // --- User Preferences ---
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

  // --- Subscriptions ---
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

  // --- Conversations ---
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
    const [conv] = await db
      .insert(conversations)
      .values({ ...conversation, userId })
      .returning();
    return conv;
  }

  async updateConversation(id: number, updates: Partial<InsertConversation>): Promise<Conversation> {
    const [updated] = await db
      .update(conversations)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(conversations.id, id))
      .returning();
    return updated;
  }

  async deleteConversation(id: number): Promise<void> {
    await db.delete(conversations).where(eq(conversations.id, id));
  }

  // --- Messages ---
  async getMessages(conversationId: number): Promise<Message[]> {
    return db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(messages.createdAt);
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    const [msg] = await db.insert(messages).values(message).returning();
    
    // Update conversation timestamp
    await db.update(conversations)
      .set({ updatedAt: new Date() })
      .where(eq(conversations.id, message.conversationId));
      
    return msg;
  }
}

export const storage = new DatabaseStorage();
