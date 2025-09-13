import {
  users,
  chats,
  messages,
  apiKeys,
  apiUsage,
  type User,
  type UpsertUser,
  type Chat,
  type InsertChat,
  type Message,
  type InsertMessage,
  type ApiKey,
  type InsertApiKey,
  type ApiUsage,
  type InsertApiUsage,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, sql, count } from "drizzle-orm";
import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";

// Interface for storage operations
export interface IStorage {
  // User operations
  // (IMPORTANT) these user operations are mandatory for Replit Auth.
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Chat operations
  getUserChats(userId: string): Promise<Chat[]>;
  getChat(chatId: string, userId: string): Promise<Chat | undefined>;
  createChat(chat: InsertChat): Promise<Chat>;
  updateChatTitle(chatId: string, title: string, userId: string): Promise<void>;
  deleteChat(chatId: string, userId: string): Promise<void>;
  
  // Message operations
  getChatMessages(chatId: string, userId: string): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  
  // API Key operations
  getUserApiKeys(userId: string): Promise<ApiKey[]>;
  getApiKeyByHash(keyHash: string): Promise<ApiKey | undefined>;
  createApiKey(apiKey: InsertApiKey & { key: string }): Promise<ApiKey>;
  deleteApiKey(keyId: string, userId: string): Promise<void>;
  updateApiKeyLastUsed(keyId: string): Promise<void>;
  
  // Usage operations
  recordApiUsage(usage: InsertApiUsage): Promise<void>;
  getUserStats(userId: string): Promise<{
    totalMessages: number;
    totalApiCalls: number;
    activeApiKeys: number;
  }>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  // (IMPORTANT) these user operations are mandatory for Replit Auth.

  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Chat operations
  async getUserChats(userId: string): Promise<Chat[]> {
    return await db
      .select()
      .from(chats)
      .where(eq(chats.userId, userId))
      .orderBy(desc(chats.updatedAt));
  }

  async getChat(chatId: string, userId: string): Promise<Chat | undefined> {
    const [chat] = await db
      .select()
      .from(chats)
      .where(and(eq(chats.id, chatId), eq(chats.userId, userId)));
    return chat;
  }

  async createChat(chat: InsertChat): Promise<Chat> {
    const [newChat] = await db.insert(chats).values(chat).returning();
    return newChat;
  }

  async updateChatTitle(chatId: string, title: string, userId: string): Promise<void> {
    await db
      .update(chats)
      .set({ title, updatedAt: new Date() })
      .where(and(eq(chats.id, chatId), eq(chats.userId, userId)));
  }

  async deleteChat(chatId: string, userId: string): Promise<void> {
    await db
      .delete(chats)
      .where(and(eq(chats.id, chatId), eq(chats.userId, userId)));
  }

  // Message operations
  async getChatMessages(chatId: string, userId: string): Promise<Message[]> {
    // Verify chat belongs to user first
    const chat = await this.getChat(chatId, userId);
    if (!chat) return [];

    return await db
      .select()
      .from(messages)
      .where(eq(messages.chatId, chatId))
      .orderBy(messages.createdAt);
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    const [newMessage] = await db.insert(messages).values(message).returning();
    return newMessage;
  }

  // API Key operations
  async getUserApiKeys(userId: string): Promise<ApiKey[]> {
    return await db
      .select()
      .from(apiKeys)
      .where(eq(apiKeys.userId, userId))
      .orderBy(desc(apiKeys.createdAt));
  }

  async getApiKeyByHash(keyHash: string): Promise<ApiKey | undefined> {
    const [apiKey] = await db
      .select()
      .from(apiKeys)
      .where(and(eq(apiKeys.keyHash, keyHash), eq(apiKeys.isActive, true)));
    return apiKey;
  }

  async createApiKey(data: InsertApiKey & { key: string }): Promise<ApiKey> {
    const keyHash = await bcrypt.hash(data.key, 10);
    const prefix = data.key.substring(0, 8);
    
    const [apiKey] = await db
      .insert(apiKeys)
      .values({
        ...data,
        keyHash,
        prefix,
      })
      .returning();
    return apiKey;
  }

  async deleteApiKey(keyId: string, userId: string): Promise<void> {
    await db
      .delete(apiKeys)
      .where(and(eq(apiKeys.id, keyId), eq(apiKeys.userId, userId)));
  }

  async updateApiKeyLastUsed(keyId: string): Promise<void> {
    await db
      .update(apiKeys)
      .set({ lastUsedAt: new Date() })
      .where(eq(apiKeys.id, keyId));
  }

  // Usage operations
  async recordApiUsage(usage: InsertApiUsage): Promise<void> {
    await db.insert(apiUsage).values(usage);
  }

  async getUserStats(userId: string): Promise<{
    totalMessages: number;
    totalApiCalls: number;
    activeApiKeys: number;
  }> {
    // Get total messages from user's chats
    const [messageCount] = await db
      .select({ count: count() })
      .from(messages)
      .innerJoin(chats, eq(messages.chatId, chats.id))
      .where(eq(chats.userId, userId));

    // Get total API calls from user's API keys
    const [apiCallCount] = await db
      .select({ count: count() })
      .from(apiUsage)
      .innerJoin(apiKeys, eq(apiUsage.apiKeyId, apiKeys.id))
      .where(eq(apiKeys.userId, userId));

    // Get active API keys count
    const [activeKeyCount] = await db
      .select({ count: count() })
      .from(apiKeys)
      .where(and(eq(apiKeys.userId, userId), eq(apiKeys.isActive, true)));

    return {
      totalMessages: messageCount.count || 0,
      totalApiCalls: apiCallCount.count || 0,
      activeApiKeys: activeKeyCount.count || 0,
    };
  }
}

export const storage = new DatabaseStorage();
