import { db } from "./db";
import { eq, desc, sql, and } from "drizzle-orm";
import {
  userPreferences, subscriptions, conversations, messages, users, messageReactions,
  type UserPreferences, type Subscription, type Conversation, type Message, type User, type MessageReaction,
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
  getMessage(id: number): Promise<Message | undefined>;

  // Reactions
  setReaction(messageId: number, userId: string, type: 'like' | 'dislike'): Promise<MessageReaction>;
  removeReaction(messageId: number, userId: string): Promise<void>;
  getReactionsForMessages(messageIds: number[]): Promise<Array<{ messageId: number; likes: number; dislikes: number; myReaction: string | null }>>;
  getReactionsForMessagesWithUser(messageIds: number[], userId: string): Promise<Array<{ messageId: number; likes: number; dislikes: number; myReaction: string | null }>>;

  // Admin methods
  getAllConversationsWithUsers(): Promise<Array<Conversation & { user: User | null; messageCount: number }>>;
  getAdminStats(): Promise<{ totalUsers: number; totalConversations: number; totalMessages: number; totalLikes: number; totalDislikes: number }>;
  getAllUsers(): Promise<Array<User & { conversationCount: number; messageCount: number }>>;
  setUserBlocked(userId: string, blocked: boolean, reason?: string | null): Promise<User>;
  getUserById(userId: string): Promise<User | undefined>;
  getRecentReactions(limit?: number): Promise<Array<MessageReaction & {
    user: { id: string; firstName: string | null; lastName: string | null; email: string | null; profileImageUrl: string | null } | null;
    message: { id: number; content: string; conversationId: number } | null;
  }>>;
  getMostLikedMessages(limit?: number): Promise<Array<{ messageId: number; content: string; likes: number; dislikes: number; conversationId: number }>>;
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

  async getMessage(id: number): Promise<Message | undefined> {
    const [msg] = await db.select().from(messages).where(eq(messages.id, id));
    return msg;
  }

  // ── Reactions ──
  async setReaction(messageId: number, userId: string, type: 'like' | 'dislike'): Promise<MessageReaction> {
    const [r] = await db
      .insert(messageReactions)
      .values({ messageId, userId, type })
      .onConflictDoUpdate({
        target: [messageReactions.messageId, messageReactions.userId],
        set: { type, createdAt: new Date() },
      })
      .returning();
    return r;
  }

  async removeReaction(messageId: number, userId: string): Promise<void> {
    await db
      .delete(messageReactions)
      .where(and(eq(messageReactions.messageId, messageId), eq(messageReactions.userId, userId)));
  }

  async getReactionsForMessages(messageIds: number[]): Promise<Array<{ messageId: number; likes: number; dislikes: number; myReaction: string | null }>> {
    if (messageIds.length === 0) return [];
    const rows = await db
      .select({
        messageId: messageReactions.messageId,
        type: messageReactions.type,
        count: sql<number>`COUNT(*)::int`,
      })
      .from(messageReactions)
      .where(sql`${messageReactions.messageId} = ANY(${messageIds})`)
      .groupBy(messageReactions.messageId, messageReactions.type);

    const map = new Map<number, { messageId: number; likes: number; dislikes: number; myReaction: string | null }>();
    messageIds.forEach(id => map.set(id, { messageId: id, likes: 0, dislikes: 0, myReaction: null }));
    rows.forEach(r => {
      const entry = map.get(r.messageId)!;
      if (r.type === 'like') entry.likes = r.count;
      else if (r.type === 'dislike') entry.dislikes = r.count;
    });
    return Array.from(map.values());
  }

  async getReactionsForMessagesWithUser(messageIds: number[], userId: string): Promise<Array<{ messageId: number; likes: number; dislikes: number; myReaction: string | null }>> {
    const stats = await this.getReactionsForMessages(messageIds);
    if (messageIds.length === 0) return stats;
    const myRows = await db
      .select({ messageId: messageReactions.messageId, type: messageReactions.type })
      .from(messageReactions)
      .where(and(sql`${messageReactions.messageId} = ANY(${messageIds})`, eq(messageReactions.userId, userId)));
    const myMap = new Map(myRows.map(r => [r.messageId, r.type]));
    return stats.map(s => ({ ...s, myReaction: myMap.get(s.messageId) ?? null }));
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

  async getAdminStats(): Promise<{ totalUsers: number; totalConversations: number; totalMessages: number; totalLikes: number; totalDislikes: number }> {
    const [u] = await db.select({ count: sql<number>`COUNT(*)::int` }).from(users);
    const [c] = await db.select({ count: sql<number>`COUNT(*)::int` }).from(conversations);
    const [m] = await db.select({ count: sql<number>`COUNT(*)::int` }).from(messages);
    const [l] = await db.select({ count: sql<number>`COUNT(*)::int` }).from(messageReactions).where(eq(messageReactions.type, 'like'));
    const [d] = await db.select({ count: sql<number>`COUNT(*)::int` }).from(messageReactions).where(eq(messageReactions.type, 'dislike'));
    return {
      totalUsers: u.count,
      totalConversations: c.count,
      totalMessages: m.count,
      totalLikes: l.count,
      totalDislikes: d.count,
    };
  }

  async getAllUsers(): Promise<Array<User & { conversationCount: number; messageCount: number }>> {
    const rows = await db
      .select({
        user: users,
        conversationCount: sql<number>`COALESCE((SELECT COUNT(*)::int FROM ${conversations} WHERE ${conversations.userId} = ${users.id}), 0)`,
        messageCount: sql<number>`COALESCE((SELECT COUNT(*)::int FROM ${messages} m JOIN ${conversations} c ON c.id = m.conversation_id WHERE c.user_id = ${users.id}), 0)`,
      })
      .from(users)
      .orderBy(desc(users.createdAt));
    return rows.map(r => ({ ...r.user, conversationCount: r.conversationCount, messageCount: r.messageCount }));
  }

  async setUserBlocked(userId: string, blocked: boolean, reason?: string | null): Promise<User> {
    const [updated] = await db
      .update(users)
      .set({ isBlocked: blocked, blockedReason: blocked ? (reason ?? null) : null, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return updated;
  }

  async getUserById(userId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    return user;
  }

  async getRecentReactions(limit: number = 50) {
    const rows = await db
      .select({
        reaction: messageReactions,
        user: users,
        message: messages,
      })
      .from(messageReactions)
      .leftJoin(users, eq(users.id, messageReactions.userId))
      .leftJoin(messages, eq(messages.id, messageReactions.messageId))
      .orderBy(desc(messageReactions.createdAt))
      .limit(limit);

    return rows.map(r => ({
      ...r.reaction,
      user: r.user ? {
        id: r.user.id,
        firstName: r.user.firstName,
        lastName: r.user.lastName,
        email: r.user.email,
        profileImageUrl: r.user.profileImageUrl,
      } : null,
      message: r.message ? {
        id: r.message.id,
        content: r.message.content.slice(0, 200),
        conversationId: r.message.conversationId,
      } : null,
    }));
  }

  async getMostLikedMessages(limit: number = 10) {
    const rows = await db
      .select({
        messageId: messageReactions.messageId,
        content: messages.content,
        conversationId: messages.conversationId,
        likes: sql<number>`COUNT(*) FILTER (WHERE ${messageReactions.type} = 'like')::int`,
        dislikes: sql<number>`COUNT(*) FILTER (WHERE ${messageReactions.type} = 'dislike')::int`,
      })
      .from(messageReactions)
      .leftJoin(messages, eq(messages.id, messageReactions.messageId))
      .groupBy(messageReactions.messageId, messages.content, messages.conversationId)
      .orderBy(desc(sql`COUNT(*) FILTER (WHERE ${messageReactions.type} = 'like')`))
      .limit(limit);
    return rows.map(r => ({
      messageId: r.messageId,
      content: (r.content || '').slice(0, 200),
      likes: r.likes,
      dislikes: r.dislikes,
      conversationId: r.conversationId || 0,
    }));
  }
}

export const storage = new DatabaseStorage();
