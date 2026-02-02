import {
  users,
  chats,
  messages,
  apiKeys,
  apiUsage,
  feedback,
  agentPrompts,
  type User,
  type UpsertUser,
  type InsertUser,
  type Chat,
  type InsertChat,
  type Message,
  type InsertMessage,
  type ApiKey,
  type InsertApiKey,
  type ApiUsage,
  type InsertApiUsage,
  type Feedback,
  type InsertFeedback,
  type AgentPrompt,
  type InsertAgentPrompt,
} from "@shared/schema";
import { getAllDefaultPrompts, type AgentPromptId } from "./prompts";
import { db } from "./db";
import { eq, desc, and, sql, count } from "drizzle-orm";
import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserById(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  updateUserProfileImage(userId: string, imageUrl: string): Promise<void>;
  updateUserPassword(userId: string, hashedPassword: string): Promise<void>;
  updateUserProfile(userId: string, updates: { organization?: string; projectType?: string }): Promise<void>;
  
  incrementUserChatCount(userId: string): Promise<void>;
  incrementUserMessageCount(userId: string): Promise<void>;
  incrementUserApiUsage(userId: string): Promise<void>;
  updateUserLastLogin(userId: string): Promise<void>;
  
  getUserChats(userId: string): Promise<Chat[]>;
  getChat(chatId: string, userId: string): Promise<Chat | undefined>;
  createChat(chat: InsertChat): Promise<Chat>;
  updateChatTitle(chatId: string, title: string, userId: string): Promise<void>;
  updateChat(chatId: string, updates: Partial<Pick<InsertChat, 'assistantId' | 'title'>>, userId: string): Promise<Chat>;
  updateChatThreadId(chatId: string, threadId: string, userId: string): Promise<void>;
  getChatThreadId(chatId: string, userId: string): Promise<string | null>;
  deleteChat(chatId: string, userId: string): Promise<void>;
  
  getChatMessages(chatId: string, userId: string): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  updateMessage(messageId: string, updates: Partial<Pick<InsertMessage, 'content'>>): Promise<Message>;
  
  getUserApiKeys(userId: string): Promise<ApiKey[]>;
  getApiKeyByHash(keyHash: string): Promise<ApiKey | undefined>;
  getApiKeysByPrefix(prefix: string): Promise<ApiKey[]>;
  createApiKey(apiKey: InsertApiKey & { key: string }): Promise<ApiKey>;
  deleteApiKey(keyId: string, userId: string): Promise<void>;
  updateApiKeyLastUsed(keyId: string): Promise<void>;
  
  recordApiUsage(usage: InsertApiUsage): Promise<void>;
  getUserStats(userId: string): Promise<{
    totalMessages: number;
    totalApiCalls: number;
    activeApiKeys: number;
  }>;
  
  createFeedback(feedback: InsertFeedback): Promise<Feedback>;
  getAllFeedback(): Promise<Feedback[]>;
  getFeedback(feedbackId: string): Promise<Feedback | undefined>;
  updateFeedbackStatus(feedbackId: string, status: 'new' | 'read' | 'resolved'): Promise<Feedback | null>;
  deleteFeedback(feedbackId: string): Promise<boolean>;
  getUnreadFeedbackCount(): Promise<number>;
  
  getAllUsersWithStats(): Promise<(User & {
    stats: {
      totalChats: number;
      totalMessages: number;
      totalApiKeys: number;
      totalApiCalls: number;
    }
  })[]>;
  toggleUserAdminStatus(userId: string): Promise<User>;
  deleteUser(userId: string): Promise<boolean>;
  resetUserPassword(userId: string, newPassword: string): Promise<User>;
  
  getPendingUsers(): Promise<User[]>;
  getPendingUsersCount(): Promise<number>;
  approveUser(userId: string, approvedById: string): Promise<User>;
  rejectUser(userId: string, approvedById: string): Promise<User>;
  
  getAllPrompts(): Promise<AgentPrompt[]>;
  getPrompt(agentId: string): Promise<AgentPrompt | undefined>;
  updatePrompt(agentId: string, prompt: string, userId: string, name?: string, description?: string): Promise<AgentPrompt>;
  resetPromptToDefault(agentId: string, userId: string): Promise<AgentPrompt>;
  seedPrompts(): Promise<void>;
}

export class DatabaseStorage implements IStorage {

  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserById(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(userData: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(userData).returning();
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

  async updateUserProfileImage(userId: string, imageUrl: string): Promise<void> {
    await db
      .update(users)
      .set({ 
        profileImageUrl: imageUrl,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId));
  }

  async updateUserPassword(userId: string, hashedPassword: string): Promise<void> {
    await db
      .update(users)
      .set({ 
        password: hashedPassword,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId));
  }

  async updateUserProfile(userId: string, updates: { organization?: string; projectType?: string }): Promise<void> {
    const updateData: { organization?: string; projectType?: string; updatedAt: Date } = {
      updatedAt: new Date()
    };
    
    if (updates.organization !== undefined) {
      updateData.organization = updates.organization || null;
    }
    if (updates.projectType !== undefined) {
      updateData.projectType = updates.projectType || null;
    }
    
    await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, userId));
  }

  async incrementUserChatCount(userId: string): Promise<void> {
    await db
      .update(users)
      .set({ 
        chatCount: sql`chat_count + 1`,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId));
  }

  async incrementUserMessageCount(userId: string): Promise<void> {
    await db
      .update(users)
      .set({ 
        messageCount: sql`message_count + 1`,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId));
  }

  async incrementUserApiUsage(userId: string): Promise<void> {
    await db
      .update(users)
      .set({ 
        apiUsageCount: sql`api_usage_count + 1`,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId));
  }

  async updateUserLastLogin(userId: string): Promise<void> {
    await db
      .update(users)
      .set({ 
        lastLoginAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(users.id, userId));
  }

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

  async updateChat(chatId: string, updates: Partial<Pick<InsertChat, 'assistantId' | 'title'>>, userId: string): Promise<Chat> {
    const [updatedChat] = await db
      .update(chats)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(eq(chats.id, chatId), eq(chats.userId, userId)))
      .returning();
    return updatedChat;
  }

  async updateChatThreadId(chatId: string, threadId: string, userId: string): Promise<void> {
    await db
      .update(chats)
      .set({ threadId, updatedAt: new Date() })
      .where(and(eq(chats.id, chatId), eq(chats.userId, userId)));
  }

  async getChatThreadId(chatId: string, userId: string): Promise<string | null> {
    const [chat] = await db
      .select({ threadId: chats.threadId })
      .from(chats)
      .where(and(eq(chats.id, chatId), eq(chats.userId, userId)));
    return chat?.threadId || null;
  }

  async deleteChat(chatId: string, userId: string): Promise<void> {
    await db
      .delete(chats)
      .where(and(eq(chats.id, chatId), eq(chats.userId, userId)));
  }

  async getChatMessages(chatId: string, userId: string): Promise<Message[]> {
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

  async updateMessage(messageId: string, updates: Partial<Pick<InsertMessage, 'content'>>): Promise<Message> {
    const [updatedMessage] = await db
      .update(messages)
      .set(updates)
      .where(eq(messages.id, messageId))
      .returning();
    return updatedMessage;
  }

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

  async getApiKeysByPrefix(prefix: string): Promise<ApiKey[]> {
    return await db
      .select()
      .from(apiKeys)
      .where(and(eq(apiKeys.prefix, prefix), eq(apiKeys.isActive, true)));
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

  async recordApiUsage(usage: InsertApiUsage): Promise<void> {
    await db.insert(apiUsage).values(usage);
  }

  async getUserStats(userId: string): Promise<{
    totalMessages: number;
    totalApiCalls: number;
    activeApiKeys: number;
  }> {
    const [messageCount] = await db
      .select({ count: count() })
      .from(messages)
      .innerJoin(chats, eq(messages.chatId, chats.id))
      .where(eq(chats.userId, userId));

    const [apiCallCount] = await db
      .select({ count: count() })
      .from(apiUsage)
      .innerJoin(apiKeys, eq(apiUsage.apiKeyId, apiKeys.id))
      .where(eq(apiKeys.userId, userId));

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

  async createFeedback(feedbackData: InsertFeedback): Promise<Feedback> {
    const [newFeedback] = await db
      .insert(feedback)
      .values(feedbackData)
      .returning();
    return newFeedback;
  }

  async getAllFeedback(): Promise<Feedback[]> {
    return await db
      .select()
      .from(feedback)
      .orderBy(desc(feedback.createdAt));
  }

  async getFeedback(feedbackId: string): Promise<Feedback | undefined> {
    const [feedbackItem] = await db
      .select()
      .from(feedback)
      .where(eq(feedback.id, feedbackId));
    return feedbackItem;
  }

  async updateFeedbackStatus(feedbackId: string, status: 'new' | 'read' | 'resolved'): Promise<Feedback | null> {
    const [updatedFeedback] = await db
      .update(feedback)
      .set({ status, updatedAt: new Date() })
      .where(eq(feedback.id, feedbackId))
      .returning();
    return updatedFeedback || null;
  }

  async deleteFeedback(feedbackId: string): Promise<boolean> {
    const result = await db
      .delete(feedback)
      .where(eq(feedback.id, feedbackId));
    return (result.rowCount ?? 0) > 0;
  }

  async getUnreadFeedbackCount(): Promise<number> {
    const [result] = await db
      .select({ count: count() })
      .from(feedback)
      .where(eq(feedback.status, 'new'));
    return result.count || 0;
  }

  async getAllUsersWithStats(): Promise<(User & {
    stats: {
      totalChats: number;
      totalMessages: number;
      totalApiKeys: number;
      totalApiCalls: number;
    }
  })[]> {
    const allUsers = await db.select().from(users).orderBy(desc(users.createdAt));
    
    const usersWithStats = await Promise.all(
      allUsers.map(async (user) => {
        const [chatCount] = await db
          .select({ count: count() })
          .from(chats)
          .where(eq(chats.userId, user.id));

        const [messageCount] = await db
          .select({ count: count() })
          .from(messages)
          .innerJoin(chats, eq(messages.chatId, chats.id))
          .where(eq(chats.userId, user.id));

        const [apiKeyCount] = await db
          .select({ count: count() })
          .from(apiKeys)
          .where(eq(apiKeys.userId, user.id));

        const [apiCallCount] = await db
          .select({ count: count() })
          .from(apiUsage)
          .innerJoin(apiKeys, eq(apiUsage.apiKeyId, apiKeys.id))
          .where(eq(apiKeys.userId, user.id));

        return {
          ...user,
          stats: {
            totalChats: chatCount.count || 0,
            totalMessages: messageCount.count || 0,
            totalApiKeys: apiKeyCount.count || 0,
            totalApiCalls: apiCallCount.count || 0,
          }
        };
      })
    );

    return usersWithStats;
  }

  async toggleUserAdminStatus(userId: string): Promise<User> {
    const [currentUser] = await db.select().from(users).where(eq(users.id, userId));
    if (!currentUser) {
      throw new Error('User not found');
    }

    const [updatedUser] = await db
      .update(users)
      .set({ 
        isAdmin: !currentUser.isAdmin,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId))
      .returning();
    
    if (!updatedUser) {
      throw new Error('Failed to update user admin status');
    }

    return updatedUser;
  }

  async deleteUser(userId: string): Promise<boolean> {
    try {
      await db
        .delete(apiUsage)
        .where(sql`api_key_id IN (SELECT id FROM ${apiKeys} WHERE user_id = ${userId})`);
      
      await db.delete(apiKeys).where(eq(apiKeys.userId, userId));
      
      await db
        .delete(messages)
        .where(sql`chat_id IN (SELECT id FROM ${chats} WHERE user_id = ${userId})`);
      
      await db.delete(chats).where(eq(chats.userId, userId));
      
      await db.delete(feedback).where(eq(feedback.userId, userId));
      
      const result = await db.delete(users).where(eq(users.id, userId));
      
      return (result.rowCount ?? 0) > 0;
    } catch (error) {
      console.error('Error deleting user:', error);
      return false;
    }
  }

  async resetUserPassword(userId: string, newPassword: string): Promise<User> {
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    
    const [updatedUser] = await db
      .update(users)
      .set({ 
        password: hashedPassword,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId))
      .returning();
    
    if (!updatedUser) {
      throw new Error('User not found or failed to reset password');
    }

    return updatedUser;
  }

  async getPendingUsers(): Promise<User[]> {
    const pendingUsers = await db
      .select()
      .from(users)
      .where(eq(users.approvalStatus, 'pending'))
      .orderBy(desc(users.createdAt));
    
    return pendingUsers;
  }

  async getPendingUsersCount(): Promise<number> {
    const [result] = await db
      .select({ count: count() })
      .from(users)
      .where(eq(users.approvalStatus, 'pending'));
    return result.count || 0;
  }

  async approveUser(userId: string, approvedById: string): Promise<User> {
    const [updatedUser] = await db
      .update(users)
      .set({ 
        approvalStatus: 'approved',
        approvedAt: new Date(),
        approvedBy: approvedById,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId))
      .returning();
    
    if (!updatedUser) {
      throw new Error('User not found or failed to approve user');
    }

    return updatedUser;
  }

  async rejectUser(userId: string, approvedById: string): Promise<User> {
    const [updatedUser] = await db
      .update(users)
      .set({ 
        approvalStatus: 'rejected',
        approvedAt: new Date(),
        approvedBy: approvedById,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId))
      .returning();
    
    if (!updatedUser) {
      throw new Error('User not found or failed to reject user');
    }

    return updatedUser;
  }

  async getAllPrompts(): Promise<AgentPrompt[]> {
    return await db
      .select()
      .from(agentPrompts)
      .where(eq(agentPrompts.isActive, true))
      .orderBy(agentPrompts.name);
  }

  async getPrompt(agentId: string): Promise<AgentPrompt | undefined> {
    const [prompt] = await db
      .select()
      .from(agentPrompts)
      .where(and(eq(agentPrompts.agentId, agentId), eq(agentPrompts.isActive, true)));
    return prompt;
  }

  async updatePrompt(agentId: string, prompt: string, userId: string, name?: string, description?: string): Promise<AgentPrompt> {
    const existing = await this.getPrompt(agentId);
    
    if (!existing) {
      throw new Error(`Prompt for agent ${agentId} not found`);
    }

    const updateData: Partial<AgentPrompt> = {
      prompt,
      version: existing.version + 1,
      updatedBy: userId,
      updatedAt: new Date(),
    };
    
    if (name !== undefined) {
      updateData.name = name;
    }
    if (description !== undefined) {
      updateData.description = description;
    }

    const [updatedPrompt] = await db
      .update(agentPrompts)
      .set(updateData)
      .where(eq(agentPrompts.agentId, agentId))
      .returning();
    
    return updatedPrompt;
  }

  async resetPromptToDefault(agentId: string, userId: string): Promise<AgentPrompt> {
    const defaults = getAllDefaultPrompts();
    const defaultPrompt = defaults.find(p => p.agentId === agentId);
    
    if (!defaultPrompt) {
      throw new Error(`No default prompt found for agent ${agentId}`);
    }

    return await this.updatePrompt(
      agentId, 
      defaultPrompt.prompt, 
      userId,
      defaultPrompt.name,
      defaultPrompt.description
    );
  }

  async seedPrompts(): Promise<void> {
    const defaults = getAllDefaultPrompts();
    
    for (const defaultPrompt of defaults) {
      const existing = await this.getPrompt(defaultPrompt.agentId);
      
      if (!existing) {
        await db.insert(agentPrompts).values({
          agentId: defaultPrompt.agentId,
          name: defaultPrompt.name,
          description: defaultPrompt.description,
          prompt: defaultPrompt.prompt,
          version: 1,
          isActive: true,
        });
        console.log(`Seeded prompt for agent: ${defaultPrompt.agentId}`);
      }
    }
  }
}

export const storage = new DatabaseStorage();
