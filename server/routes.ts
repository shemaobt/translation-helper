import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { generateAssistantResponse, generateChatCompletion, generateChatTitle, clearChatThread, getChatThreadId } from "./openai";
import { insertChatSchema, insertMessageSchema, insertApiKeySchema } from "@shared/schema";
import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";

// Simple anonymous user middleware that ensures users exist in database
async function useAnonymousUser(req: any, res: any, next: any) {
  try {
    // Extract anonymous user ID from headers or create one
    const userHeader = req.headers['x-anonymous-user'] || 'anon_' + Math.random().toString(36).substr(2, 9) + Date.now();
    
    // Ensure user exists in database with unique email
    await storage.upsertUser({
      id: userHeader,
      email: `${userHeader}@anonymous.user`,
      firstName: 'Anonymous',
      lastName: 'User',
    });
    
    req.user = {
      claims: {
        sub: userHeader
      }
    };
    next();
  } catch (error) {
    console.error("Error creating anonymous user:", error);
    res.status(500).json({ message: "Failed to create anonymous user" });
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Skip Replit Auth setup - use anonymous users instead
  // await setupAuth(app);

  // Auth routes - return anonymous user data
  app.get('/api/auth/user', async (req: any, res) => {
    // Always return a successful anonymous user
    res.json({
      id: 'anonymous',
      email: 'anonymous@user.com',
      firstName: 'Anonymous',
      lastName: 'User',
    });
  });

  // Chat routes
  app.get('/api/chats', useAnonymousUser, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const chats = await storage.getUserChats(userId);
      res.json(chats);
    } catch (error) {
      console.error("Error fetching chats:", error);
      res.status(500).json({ message: "Failed to fetch chats" });
    }
  });

  app.post('/api/chats', useAnonymousUser, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const chatData = insertChatSchema.parse({ ...req.body, userId });
      const chat = await storage.createChat(chatData);
      res.json(chat);
    } catch (error) {
      console.error("Error creating chat:", error);
      res.status(500).json({ message: "Failed to create chat" });
    }
  });

  app.get('/api/chats/:chatId/messages', useAnonymousUser, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { chatId } = req.params;
      const messages = await storage.getChatMessages(chatId, userId);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  app.post('/api/chats/:chatId/messages', useAnonymousUser, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { chatId } = req.params;
      const { content } = req.body;

      // Verify chat belongs to user
      const chat = await storage.getChat(chatId, userId);
      if (!chat) {
        return res.status(404).json({ message: "Chat not found" });
      }

      // Create user message
      const userMessage = await storage.createMessage({
        chatId,
        role: "user",
        content,
      });

      // Check if this is the first user message and update title immediately
      const existingMessages = await storage.getChatMessages(chatId, userId);
      if (existingMessages.length === 1) {
        const title = generateChatTitle(content);
        await storage.updateChatTitle(chatId, title, userId);
      }

      // Generate AI response using StoryTeller Assistant
      const aiResponse = await generateAssistantResponse({
        chatId,
        userMessage: content,
        threadId: getChatThreadId(chatId),
      });

      // Create assistant message
      const assistantMessage = await storage.createMessage({
        chatId,
        role: "assistant",
        content: aiResponse.content,
      });

      res.json({ 
        userMessage, 
        assistantMessage
      });
    } catch (error) {
      console.error("Error creating message:", error);
      res.status(500).json({ message: "Failed to create message" });
    }
  });

  app.delete('/api/chats/:chatId', useAnonymousUser, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { chatId } = req.params;
      await storage.deleteChat(chatId, userId);
      // Clean up thread to prevent memory leaks
      clearChatThread(chatId);
      res.json({ message: "Chat deleted successfully" });
    } catch (error) {
      console.error("Error deleting chat:", error);
      res.status(500).json({ message: "Failed to delete chat" });
    }
  });

  // API Key routes
  app.get('/api/api-keys', useAnonymousUser, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const apiKeys = await storage.getUserApiKeys(userId);
      
      // Don't return the actual key hash
      const safeApiKeys = apiKeys.map(key => ({
        ...key,
        keyHash: undefined,
        maskedKey: `ak_${key.prefix}...***`,
      }));
      
      res.json(safeApiKeys);
    } catch (error) {
      console.error("Error fetching API keys:", error);
      res.status(500).json({ message: "Failed to fetch API keys" });
    }
  });

  app.post('/api/api-keys', useAnonymousUser, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { name } = insertApiKeySchema.parse({ ...req.body, userId });
      
      // Generate a new API key
      const key = `ak_${randomBytes(16).toString('hex')}`;
      
      const apiKey = await storage.createApiKey({
        userId,
        name,
        key,
        isActive: true,
      });

      // Return the key once (user needs to save it)
      res.json({
        ...apiKey,
        key, // Only returned once
        keyHash: undefined,
      });
    } catch (error) {
      console.error("Error creating API key:", error);
      res.status(500).json({ message: "Failed to create API key" });
    }
  });

  app.delete('/api/api-keys/:keyId', useAnonymousUser, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { keyId } = req.params;
      await storage.deleteApiKey(keyId, userId);
      res.json({ message: "API key deleted successfully" });
    } catch (error) {
      console.error("Error deleting API key:", error);
      res.status(500).json({ message: "Failed to delete API key" });
    }
  });

  // Dashboard stats
  app.get('/api/stats', useAnonymousUser, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const stats = await storage.getUserStats(userId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  // Public API endpoints (for external API access)
  const authenticateApiKey = async (req: any, res: any, next: any) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: "API key required" });
      }

      const apiKey = authHeader.substring(7);
      const keyHash = await bcrypt.hash(apiKey, 10);
      
      // Note: In production, you'd want to verify the hash properly
      // This is a simplified version for demo purposes
      const storedKey = await storage.getApiKeyByHash(keyHash);
      if (!storedKey) {
        return res.status(401).json({ message: "Invalid API key" });
      }

      await storage.updateApiKeyLastUsed(storedKey.id);
      req.apiKey = storedKey;
      next();
    } catch (error) {
      console.error("Error authenticating API key:", error);
      res.status(401).json({ message: "Invalid API key" });
    }
  };

  app.post('/api/v1/chat/completions', authenticateApiKey, async (req: any, res) => {
    try {
      const { messages, temperature, max_tokens } = req.body;
      
      if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({ message: "Messages array is required" });
      }

      // For external API, we'll use the assistant with a temporary chat ID
      const tempChatId = `api_${randomBytes(8).toString('hex')}`;
      const lastUserMessage = messages[messages.length - 1];
      
      if (!lastUserMessage || lastUserMessage.role !== 'user') {
        return res.status(400).json({ message: "Last message must be from user" });
      }

      // Use the new generateChatCompletion function to handle the entire conversation
      const response = await generateChatCompletion({
        chatId: tempChatId,
        messages: messages,
      });

      // Record usage
      await storage.recordApiUsage({
        apiKeyId: req.apiKey.id,
        tokens: response.tokens,
      });

      res.json({
        id: `chatcmpl-${randomBytes(8).toString('hex')}`,
        object: "chat.completion",
        created: Math.floor(Date.now() / 1000),
        model: "gpt-5",
        choices: [
          {
            index: 0,
            message: {
              role: "assistant",
              content: response.content,
            },
            finish_reason: "stop",
          },
        ],
        usage: {
          total_tokens: response.tokens,
        },
      });
    } catch (error) {
      console.error("Error in API chat completion:", error);
      res.status(500).json({ message: "Failed to generate completion" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
