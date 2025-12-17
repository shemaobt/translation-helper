import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { generateAssistantResponse, generateAssistantResponseStream, generateChatCompletion, generateChatTitle, clearChatThread, getChatThreadId, transcribeAudio, translateText, generateSpeech } from "./gemini";
import { insertChatSchema, insertMessageSchema, insertApiKeySchema, insertFeedbackSchema } from "@shared/schema";
import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { z } from "zod";
import multer from "multer";
import { config } from "./config";
import { requireAuth, requireAdmin, requireCSRFHeader, getEffectiveApproval, authLimiter, publicApiLimiter, aiApiLimiter } from "./middleware";
import { audioCache } from "./services";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: config.upload.audioMaxSize,
  },
  fileFilter: (_req: any, file: any, cb: any) => {
    if (file.mimetype.startsWith('audio/') || file.mimetype === 'video/webm') {
      cb(null, true);
    } else {
      cb(new Error('Only audio files are allowed'));
    }
  }
});

const signupValidationSchema = z.object({
  email: z.string().email().toLowerCase(),
  password: z.string().min(6, "Password must be at least 6 characters long"),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  profileImageUrl: z.string().optional(),
});

const loginValidationSchema = z.object({
  email: z.string().email().toLowerCase(), 
  password: z.string().min(1, "Password is required"),
});

export async function registerRoutes(app: Express): Promise<Server> {
  app.post('/api/auth/signup', authLimiter, async (req: any, res) => {
    try {
      const userData = signupValidationSchema.parse(req.body);
      
      const existingUser = await storage.getUserByEmail(userData.email);
      if (existingUser) {
        return res.status(400).json({ message: "User already exists" });
      }
      
      const hashedPassword = await bcrypt.hash(userData.password, config.auth.saltRounds);
      
      const user = await storage.createUser({
        ...userData,
        password: hashedPassword
      });
      
      const approvalStatus = user.approvalStatus ?? 'pending';
      
      if (approvalStatus === 'pending') {
        return res.status(201).json({
          message: "Account created successfully. Your account is awaiting admin approval.",
          approvalStatus: "pending",
          email: user.email
        });
      }
      
      if (approvalStatus === 'approved') {
        req.session.regenerate((err: any) => {
          if (err) {
            console.error('Session regeneration failed:', err);
            return res.status(500).json({ message: "Failed to create session" });
          }
          
          req.session.userId = user.id;
          
          req.session.save((saveErr: any) => {
            if (saveErr) {
              console.error('Session save failed:', saveErr);
              return res.status(500).json({ message: "Failed to save session" });
            }
            
            res.json({
              id: user.id,
              email: user.email,
              firstName: user.firstName,
              lastName: user.lastName,
              isAdmin: user.isAdmin,
            });
          });
        });
      } else {
        return res.status(403).json({ 
          message: "Account creation failed. Please contact support.",
          approvalStatus: approvalStatus 
        });
      }
    } catch (error) {
      console.error("Signup error:", error);
      res.status(500).json({ message: "Failed to create account" });
    }
  });

  app.post('/api/auth/login', authLimiter, async (req: any, res) => {
    try {
      const { email, password } = loginValidationSchema.parse(req.body);
      
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      
      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      
      const effectiveApproval = getEffectiveApproval(user);
      
      if (effectiveApproval === 'pending') {
        return res.status(403).json({ 
          message: "Your account is awaiting admin approval. Please wait for approval before logging in.",
          approvalStatus: "pending"
        });
      }
      
      if (effectiveApproval === 'rejected') {
        return res.status(403).json({ 
          message: "Your account has been rejected. Please contact support for assistance.",
          approvalStatus: "rejected"
        });
      }
      
      if (effectiveApproval !== 'approved') {
        return res.status(403).json({ 
          message: "Account access denied. Please contact support.",
          approvalStatus: effectiveApproval
        });
      }
      
      req.session.regenerate((err: any) => {
        if (err) {
          console.error('Session regeneration failed:', err);
          return res.status(500).json({ message: "Failed to create session" });
        }
        
        req.session.userId = user.id;
        
        req.session.save(async (saveErr: any) => {
          if (saveErr) {
            console.error('Session save failed:', saveErr);
            return res.status(500).json({ message: "Failed to save session" });
          }
          
          try {
            await storage.updateUserLastLogin(user.id);
          } catch (loginTrackErr) {
            console.error('Failed to track login:', loginTrackErr);
          }
          
          res.json({
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            isAdmin: user.isAdmin,
          });
        });
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  app.post('/api/auth/logout', (req: any, res) => {
    req.session.destroy((err: any) => {
      if (err) {
        return res.status(500).json({ message: "Failed to logout" });
      }
      res.clearCookie(config.session.cookieName);
      res.json({ message: "Logged out successfully" });
    });
  });

  app.get('/api/auth/user', requireAuth, async (req: any, res) => {
    try {
      const user = await storage.getUserById(req.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        isAdmin: user.isAdmin,
        profileImageUrl: user.profileImageUrl,
        createdAt: user.createdAt,
      });
    } catch (error) {
      console.error("Get user error:", error);
      res.status(500).json({ message: "Failed to get user" });
    }
  });

  const profileImageUpload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: config.upload.profileImageMaxSize,
    },
    fileFilter: (_req: any, file: any, cb: any) => {
      if (file.mimetype.startsWith('image/')) {
        cb(null, true);
      } else {
        cb(new Error('Only image files are allowed'));
      }
    }
  });

  app.post('/api/user/profile-image', requireAuth, profileImageUpload.single('image'), async (req: any, res) => {
    try {
      const userId = req.userId;
      const file = req.file;
      
      if (!file) {
        return res.status(400).json({ message: "No image file provided" });
      }
      
      const base64Image = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
      await storage.updateUserProfileImage(userId, base64Image);
      
      res.json({ message: "Profile image updated successfully", profileImageUrl: base64Image });
    } catch (error) {
      console.error("Profile image upload error:", error);
      res.status(500).json({ message: "Failed to upload profile image" });
    }
  });

  app.post('/api/user/change-password', requireAuth, requireCSRFHeader, async (req: any, res) => {
    try {
      const userId = req.userId;
      const { currentPassword, newPassword } = req.body;
      
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: "Current password and new password are required" });
      }
      
      if (newPassword.length < 6) {
        return res.status(400).json({ message: "New password must be at least 6 characters" });
      }
      
      const user = await storage.getUserById(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const isValid = await bcrypt.compare(currentPassword, user.password);
      if (!isValid) {
        return res.status(401).json({ message: "Current password is incorrect" });
      }
      
      const hashedPassword = await bcrypt.hash(newPassword, config.auth.saltRounds);
      await storage.updateUserPassword(userId, hashedPassword);
      
      res.json({ message: "Password changed successfully" });
    } catch (error) {
      console.error("Change password error:", error);
      res.status(500).json({ message: "Failed to change password" });
    }
  });

  app.get('/api/chats', requireAuth, async (req: any, res) => {
    try {
      const userId = req.userId;
      const chats = await storage.getUserChats(userId);
      res.json(chats);
    } catch (error) {
      console.error("Error fetching chats:", error);
      res.status(500).json({ message: "Failed to fetch chats" });
    }
  });

  app.post('/api/chats', requireAuth, async (req: any, res) => {
    try {
      const userId = req.userId;
      const chatData = insertChatSchema.parse({ ...req.body, userId });
      const chat = await storage.createChat(chatData);
      
      await storage.incrementUserChatCount(userId);
      
      res.json(chat);
    } catch (error) {
      console.error("Error creating chat:", error);
      res.status(500).json({ message: "Failed to create chat" });
    }
  });

  app.get('/api/chats/:chatId', requireAuth, async (req: any, res) => {
    try {
      const userId = req.userId;
      const { chatId } = req.params;
      const chat = await storage.getChat(chatId, userId);
      if (!chat) {
        return res.status(404).json({ message: "Chat not found" });
      }
      res.json(chat);
    } catch (error) {
      console.error("Error fetching chat:", error);
      res.status(500).json({ message: "Failed to fetch chat" });
    }
  });

  app.get('/api/chats/:chatId/messages', requireAuth, async (req: any, res) => {
    try {
      const userId = req.userId;
      const { chatId } = req.params;
      const messages = await storage.getChatMessages(chatId, userId);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  app.post('/api/chats/:chatId/messages', requireAuth, async (req: any, res) => {
    try {
      const userId = req.userId;
      const { chatId } = req.params;
      const { content } = req.body;

      const chat = await storage.getChat(chatId, userId);
      if (!chat) {
        return res.status(404).json({ message: "Chat not found" });
      }

      const userMessage = await storage.createMessage({
        chatId,
        role: "user",
        content,
      });

      const existingMessages = await storage.getChatMessages(chatId, userId);
      if (existingMessages.length === 1) {
        const title = await generateChatTitle(content);
        await storage.updateChatTitle(chatId, title, userId);
      }

      const threadId = await getChatThreadId(chatId, userId);
      const aiResponse = await generateAssistantResponse({
        chatId,
        userMessage: content,
        assistantId: chat.assistantId as any,
        threadId: threadId || undefined,
      }, userId);

      const assistantMessage = await storage.createMessage({
        chatId,
        role: "assistant",
        content: aiResponse.content,
      });

      await Promise.all([
        storage.incrementUserMessageCount(userId),
        storage.incrementUserApiUsage(userId)
      ]);

      res.json({ 
        userMessage, 
        assistantMessage
      });
    } catch (error) {
      console.error("Error creating message:", error);
      res.status(500).json({ message: "Failed to create message" });
    }
  });

  app.post('/api/chats/:chatId/messages/stream', requireAuth, async (req: any, res) => {
    try {
      const userId = req.userId;
      const { chatId } = req.params;
      const { content } = req.body;

      const chat = await storage.getChat(chatId, userId);
      if (!chat) {
        return res.status(404).json({ message: "Chat not found" });
      }

      const userMessage = await storage.createMessage({
        chatId,
        role: "user",
        content,
      });

      const existingMessages = await storage.getChatMessages(chatId, userId);
      if (existingMessages.length === 1) {
        const title = await generateChatTitle(content);
        await storage.updateChatTitle(chatId, title, userId);
      }

      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.flushHeaders();

      res.write(`data: ${JSON.stringify({ 
        type: 'user_message', 
        data: userMessage 
      })}\n\n`);

      try {
        const threadId = await getChatThreadId(chatId, userId);
        let assistantMessageId: string | null = null;
        let fullContent = "";

        for await (const chunk of generateAssistantResponseStream({
          chatId,
          userMessage: content,
          assistantId: chat.assistantId as any,
          threadId: threadId || undefined,
        }, userId)) {
          
          if (chunk.type === 'content') {
            fullContent += chunk.data;
            
            if (!assistantMessageId) {
              const assistantMessage = await storage.createMessage({
                chatId,
                role: "assistant",
                content: "",
              });
              assistantMessageId = assistantMessage.id;
              
              res.write(`data: ${JSON.stringify({ 
                type: 'assistant_message_start',
                data: assistantMessage
              })}\n\n`);
            }

            res.write(`data: ${JSON.stringify({ 
              type: 'content', 
              data: chunk.data 
            })}\n\n`);

          } else if (chunk.type === 'done') {
            if (assistantMessageId) {
              await storage.updateMessage(assistantMessageId, { content: fullContent });
            }

            await Promise.all([
              storage.incrementUserMessageCount(userId),
              storage.incrementUserApiUsage(userId)
            ]);

            res.write(`data: ${JSON.stringify({ 
              type: 'done', 
              data: chunk.data 
            })}\n\n`);
          }
        }
      } catch (streamError) {
        console.error("Error in streaming response:", streamError);
        res.write(`data: ${JSON.stringify({ 
          type: 'error', 
          data: { message: "Failed to generate streaming response" }
        })}\n\n`);
      }

      res.end();
    } catch (error) {
      console.error("Error in streaming endpoint:", error);
      res.status(500).json({ message: "Failed to create streaming message" });
    }
  });

  app.delete('/api/chats/:chatId', requireAuth, async (req: any, res) => {
    try {
      const userId = req.userId;
      const { chatId } = req.params;
      await storage.deleteChat(chatId, userId);
      await clearChatThread(chatId, userId);
      res.json({ message: "Chat deleted successfully" });
    } catch (error) {
      console.error("Error deleting chat:", error);
      res.status(500).json({ message: "Failed to delete chat" });
    }
  });

  app.patch('/api/chats/:chatId', requireAuth, async (req: any, res) => {
    try {
      const userId = req.userId;
      const { chatId } = req.params;
      
      const updateChatSchema = insertChatSchema.pick({ assistantId: true, title: true }).partial();
      const updates = updateChatSchema.parse(req.body);
      
      const existingChat = await storage.getChat(chatId, userId);
      if (!existingChat) {
        return res.status(404).json({ message: "Chat not found" });
      }
      
      const updatedChat = await storage.updateChat(chatId, updates, userId);
      res.json(updatedChat);
    } catch (error) {
      console.error("Error updating chat:", error);
      res.status(500).json({ message: "Failed to update chat" });
    }
  });

  app.get('/api/api-keys', requireAuth, async (req: any, res) => {
    try {
      const userId = req.userId;
      const apiKeys = await storage.getUserApiKeys(userId);
      
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

  app.post('/api/api-keys', requireAuth, async (req: any, res) => {
    try {
      const userId = req.userId;
      const { name } = insertApiKeySchema.parse({ ...req.body, userId });
      
      const key = `ak_${randomBytes(16).toString('hex')}`;
      
      const apiKey = await storage.createApiKey({
        userId,
        name,
        key,
        isActive: true,
      });

      res.json({
        ...apiKey,
        key,
        keyHash: undefined,
      });
    } catch (error) {
      console.error("Error creating API key:", error);
      res.status(500).json({ message: "Failed to create API key" });
    }
  });

  app.delete('/api/api-keys/:keyId', requireAuth, async (req: any, res) => {
    try {
      const userId = req.userId;
      const { keyId } = req.params;
      await storage.deleteApiKey(keyId, userId);
      res.json({ message: "API key deleted successfully" });
    } catch (error) {
      console.error("Error deleting API key:", error);
      res.status(500).json({ message: "Failed to delete API key" });
    }
  });

  app.get('/api/stats', requireAuth, async (req: any, res) => {
    try {
      const userId = req.userId;
      const stats = await storage.getUserStats(userId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });
  const authenticateApiKey = async (req: any, res: any, next: any) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: "API key required" });
      }

      const apiKey = authHeader.substring(7);
      
      if (apiKey.length < 8) {
        return res.status(401).json({ message: "Invalid API key format" });
      }
      
      const prefix = apiKey.substring(0, 8);
      const candidateKeys = await storage.getApiKeysByPrefix(prefix);
      if (candidateKeys.length === 0) {
        return res.status(401).json({ message: "Invalid API key" });
      }
      
      let matchedKey: any = null;
      for (const candidateKey of candidateKeys) {
        const isValid = await bcrypt.compare(apiKey, candidateKey.keyHash);
        if (isValid) {
          matchedKey = candidateKey;
          break;
        }
      }
      
      if (!matchedKey) {
        return res.status(401).json({ message: "Invalid API key" });
      }

      const keyOwner = await storage.getUserById(matchedKey.userId);
      if (!keyOwner) {
        return res.status(401).json({ message: "API key owner not found" });
      }
      
      const effectiveApproval = getEffectiveApproval(keyOwner);
      
      if (effectiveApproval === 'pending') {
        return res.status(403).json({ 
          message: "API access denied. Your account is awaiting admin approval.",
          approvalStatus: "pending"
        });
      }
      
      if (effectiveApproval === 'rejected') {
        return res.status(403).json({ 
          message: "API access denied. Your account has been rejected.",
          approvalStatus: "rejected"
        });
      }
      
      if (effectiveApproval !== 'approved') {
        return res.status(403).json({ 
          message: "API access denied. Please contact support.",
          approvalStatus: effectiveApproval
        });
      }

      await storage.updateApiKeyLastUsed(matchedKey.id);
      req.apiKey = matchedKey;
      req.userId = keyOwner.id;
      req.user = keyOwner;
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

      const tempChatId = `api_${randomBytes(8).toString('hex')}`;
      const lastUserMessage = messages[messages.length - 1];
      
      if (!lastUserMessage || lastUserMessage.role !== 'user') {
        return res.status(400).json({ message: "Last message must be from user" });
      }

      const response = await generateChatCompletion({
        chatId: tempChatId,
        messages: messages,
        assistantId: 'storyteller',
      }, 'api-user');

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

  app.post('/api/audio/transcribe', requireAuth, upload.single('audio'), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No audio file provided" });
      }

      const transcription = await transcribeAudio(req.file.buffer, req.file.originalname);
      await storage.incrementUserApiUsage(req.userId);
      
      res.json({ text: transcription });
    } catch (error) {
      console.error("Error transcribing audio:", error);
      res.status(500).json({ message: "Failed to transcribe audio" });
    }
  });

  app.post('/api/audio/speak', requireAuth, async (req: any, res) => {
    try {
      const { text, language = 'en-US', voice } = req.body;
      
      if (!text || typeof text !== 'string') {
        return res.status(400).json({ message: "Text is required" });
      }

      if (text.length > 4096) {
        return res.status(400).json({ message: "Text too long (max 4096 characters)" });
      }

      const etag = audioCache.getETag(text, language, voice);
      
      const clientETag = req.headers['if-none-match'];
      if (clientETag === etag) {
        return res.status(304).end();
      }

      let cached = audioCache.get(text, language, voice);
      let audioBuffer: Buffer;

      if (cached) {
        audioBuffer = cached.buffer;
      } else {
        audioBuffer = await generateSpeech(text, language, voice);
        cached = audioCache.set(text, language, audioBuffer, voice);
        await storage.incrementUserApiUsage(req.userId);
      }
      
      res.set({
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.length.toString(),
        'Cache-Control': 'public, max-age=31536000, immutable',
        'ETag': etag,
      });
      
      res.send(audioBuffer);
    } catch (error) {
      console.error("Error generating speech:", error);
      res.status(500).json({ message: "Failed to generate speech" });
    }
  });

  app.post('/api/public/translate', aiApiLimiter, async (req: any, res) => {
    try {
      const { text, fromLanguage = 'auto', toLanguage = 'en-US', context = '' } = req.body;
      
      if (!text || typeof text !== 'string') {
        return res.status(400).json({ error: "Text is required" });
      }

      if (text.length > 2048) {
        return res.status(400).json({ error: "Text too long (max 2048 characters)" });
      }

      const translatedText = await translateText(text, fromLanguage, toLanguage, context);

      res.json({
        translatedText,
        fromLanguage,
        toLanguage,
        originalText: text
      });
    } catch (error) {
      console.error("Error in public translation:", error);
      res.status(500).json({ error: "Translation failed" });
    }
  });

  app.post('/api/public/transcribe', aiApiLimiter, upload.single('audio'), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "Audio file is required" });
      }

      const filename = req.file.originalname || 'audio.webm';
      const transcribedText = await transcribeAudio(req.file.buffer, filename);
      
      res.json({
        text: transcribedText,
        language: req.body.language || 'auto'
      });
    } catch (error) {
      console.error("Error in public transcription:", error);
      res.status(500).json({ error: "Transcription failed" });
    }
  });

  app.post('/api/public/speak', aiApiLimiter, async (req: any, res) => {
    try {
      const { text, language = 'en-US', voice = 'alloy' } = req.body;
      
      if (!text || typeof text !== 'string') {
        return res.status(400).json({ error: "Text is required" });
      }

      if (text.length > 1024) {
        return res.status(400).json({ error: "Text too long (max 1024 characters for public API)" });
      }

      const etag = audioCache.getETag(text, language, voice);
      
      const clientETag = req.headers['if-none-match'];
      if (clientETag === etag) {
        return res.status(304).end();
      }

      let cached = audioCache.get(text, language, voice);
      let audioBuffer: Buffer;

      if (cached) {
        audioBuffer = cached.buffer;
      } else {
        audioBuffer = await generateSpeech(text, language, voice);
        cached = audioCache.set(text, language, audioBuffer, voice);
      }
      
      res.set({
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.length.toString(),
        'Cache-Control': 'public, max-age=31536000, immutable',
        'ETag': etag,
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, If-None-Match',
      });
      
      res.send(audioBuffer);
    } catch (error) {
      console.error("Error in public speech generation:", error);
      res.status(500).json({ error: "Speech generation failed" });
    }
  });
  app.get('/api/public/info', publicApiLimiter, (req: any, res) => {
    res.json({
      name: "Translation Helper Public API",
      version: "1.0.0",
      endpoints: {
        translate: {
          method: "POST",
          path: "/api/public/translate",
          description: "Translate text between languages",
          parameters: {
            text: "string (required, max 2048 chars)",
            fromLanguage: "string (optional, default: 'auto')",
            toLanguage: "string (optional, default: 'en-US')",
            context: "string (optional)"
          }
        },
        transcribe: {
          method: "POST",
          path: "/api/public/transcribe",
          description: "Convert speech to text",
          parameters: {
            audio: "file (required, audio format)",
            language: "string (optional, default: 'auto')"
          }
        },
        speak: {
          method: "POST",
          path: "/api/public/speak",
          description: "Convert text to speech",
          parameters: {
            text: "string (required, max 1024 chars)",
            language: "string (optional, default: 'en-US')",
            voice: "string (optional, default: 'alloy')"
          }
        }
      },
      voices: ["alloy", "echo", "fable", "onyx", "nova", "shimmer"],
      rateLimit: {
        window: "15 minutes",
        maxRequests: 50
      }
    });
  });

  app.post('/api/feedback', publicApiLimiter, async (req: any, res) => {
    try {
      const feedbackSchema = insertFeedbackSchema.extend({
        message: z.string().min(1, "Feedback message is required").max(5000, "Message too long"),
        userEmail: z.string().email().optional().or(z.literal("")),
        userName: z.string().optional().or(z.literal("")),
        category: z.enum(["bug", "feature", "general", "other"]).optional(),
      });

      const feedbackData = feedbackSchema.parse(req.body);
      const userId = req.session?.userId || null;

      const feedback = await storage.createFeedback({
        ...feedbackData,
        userId,
        userEmail: feedbackData.userEmail || undefined,
        userName: feedbackData.userName || undefined,
        status: 'new',
      });

      res.json({
        id: feedback.id,
        message: "Feedback submitted successfully",
        createdAt: feedback.createdAt,
      });
    } catch (error) {
      console.error("Error submitting feedback:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid feedback data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to submit feedback" });
    }
  });

  app.get('/api/admin/feedback', requireAdmin, async (req: any, res) => {
    try {
      const feedback = await storage.getAllFeedback();
      res.json(feedback);
    } catch (error) {
      console.error("Error fetching feedback:", error);
      res.status(500).json({ message: "Failed to fetch feedback" });
    }
  });

  app.get('/api/admin/feedback/unread-count', requireAdmin, async (req: any, res) => {
    try {
      const unreadCount = await storage.getUnreadFeedbackCount();
      res.json({ count: unreadCount });
    } catch (error) {
      console.error("Error fetching unread feedback count:", error);
      res.status(500).json({ message: "Failed to fetch unread feedback count" });
    }
  });

  app.get('/api/admin/feedback/:id', requireAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      const feedback = await storage.getFeedback(id);
      
      if (!feedback) {
        return res.status(404).json({ message: "Feedback not found" });
      }

      res.json(feedback);
    } catch (error) {
      console.error("Error fetching feedback:", error);
      res.status(500).json({ message: "Failed to fetch feedback" });
    }
  });

  app.patch('/api/admin/feedback/:id', requireAdmin, requireCSRFHeader, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const statusSchema = z.enum(["new", "read", "resolved"]);
      const validatedStatus = statusSchema.parse(status);

      const updatedFeedback = await storage.updateFeedbackStatus(id, validatedStatus);
      
      if (!updatedFeedback) {
        return res.status(404).json({ message: "Feedback not found" });
      }
      
      res.json(updatedFeedback);
    } catch (error) {
      console.error("Error updating feedback:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid status", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update feedback" });
    }
  });

  app.delete('/api/admin/feedback/:id', requireAdmin, requireCSRFHeader, async (req: any, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteFeedback(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Feedback not found" });
      }
      
      res.json({ message: "Feedback deleted successfully" });
    } catch (error) {
      console.error("Error deleting feedback:", error);
      res.status(500).json({ message: "Failed to delete feedback" });
    }
  });

  app.get('/api/admin/users', requireAdmin, async (req: any, res) => {
    try {
      const users = await storage.getAllUsersWithStats();
      
      const sanitizedUsers = users.map(user => ({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        isAdmin: user.isAdmin,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        lastLoginAt: user.lastLoginAt,
        approvalStatus: user.approvalStatus,
        approvedAt: user.approvedAt,
        approvedBy: user.approvedBy,
        stats: user.stats
      }));

      res.json(sanitizedUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.patch('/api/admin/users/:userId/admin', requireAdmin, requireCSRFHeader, async (req: any, res) => {
    try {
      const { userId } = req.params;
      
      const userIdSchema = z.string().uuid();
      const validatedUserId = userIdSchema.parse(userId);

      if (validatedUserId === req.userId) {
        return res.status(400).json({ message: "Cannot modify your own admin status" });
      }

      const updatedUser = await storage.toggleUserAdminStatus(validatedUserId);
      
      const sanitizedUser = {
        id: updatedUser.id,
        email: updatedUser.email,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        isAdmin: updatedUser.isAdmin,
        updatedAt: updatedUser.updatedAt
      };

      res.json(sanitizedUser);
    } catch (error) {
      console.error("Error toggling user admin status:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid user ID format", errors: error.errors });
      }
      if (error instanceof Error && error.message === 'User not found') {
        return res.status(404).json({ message: "User not found" });
      }
      res.status(500).json({ message: "Failed to update user admin status" });
    }
  });

  app.delete('/api/admin/users/:userId', requireAdmin, requireCSRFHeader, async (req: any, res) => {
    try {
      const { userId } = req.params;
      
      const userIdSchema = z.string().uuid();
      const validatedUserId = userIdSchema.parse(userId);

      if (validatedUserId === req.userId) {
        return res.status(400).json({ message: "Cannot delete your own account" });
      }

      const deleted = await storage.deleteUser(validatedUserId);
      
      if (!deleted) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json({ message: "User deleted successfully" });
    } catch (error) {
      console.error("Error deleting user:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid user ID format", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  app.post('/api/admin/users/:userId/reset-password', requireAdmin, requireCSRFHeader, async (req: any, res) => {
    try {
      const { userId } = req.params;
      
      const userIdSchema = z.string().uuid();
      const validatedUserId = userIdSchema.parse(userId);

      const tempPassword = randomBytes(12).toString('base64').replace(/[+/]/g, 'A').substring(0, 12);
      
      const updatedUser = await storage.resetUserPassword(validatedUserId, tempPassword);
      
      const sanitizedUser = {
        id: updatedUser.id,
        email: updatedUser.email,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        updatedAt: updatedUser.updatedAt,
        temporaryPassword: tempPassword
      };

      res.json(sanitizedUser);
    } catch (error) {
      console.error("Error resetting user password:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid user ID format", errors: error.errors });
      }
      if (error instanceof Error && error.message === 'User not found or failed to reset password') {
        return res.status(404).json({ message: "User not found" });
      }
      res.status(500).json({ message: "Failed to reset user password" });
    }
  });

  app.get('/api/admin/users/pending', requireAdmin, async (req: any, res) => {
    try {
      const pendingUsers = await storage.getPendingUsers();
      
      const sanitizedUsers = pendingUsers.map(user => ({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        createdAt: user.createdAt,
        approvalStatus: user.approvalStatus
      }));

      res.json(sanitizedUsers);
    } catch (error) {
      console.error("Error fetching pending users:", error);
      res.status(500).json({ message: "Failed to fetch pending users" });
    }
  });

  app.get('/api/admin/users/pending-count', requireAdmin, async (req: any, res) => {
    try {
      const pendingCount = await storage.getPendingUsersCount();
      res.json({ count: pendingCount });
    } catch (error) {
      console.error("Error fetching pending users count:", error);
      res.status(500).json({ message: "Failed to fetch pending users count" });
    }
  });

  app.post('/api/admin/users/:userId/approve', requireAdmin, requireCSRFHeader, async (req: any, res) => {
    try {
      const { userId } = req.params;
      
      const userIdSchema = z.string().uuid();
      const validatedUserId = userIdSchema.parse(userId);

      const approvedUser = await storage.approveUser(validatedUserId, req.userId);
      
      const sanitizedUser = {
        id: approvedUser.id,
        email: approvedUser.email,
        firstName: approvedUser.firstName,
        lastName: approvedUser.lastName,
        approvalStatus: approvedUser.approvalStatus,
        approvedAt: approvedUser.approvedAt,
        approvedBy: approvedUser.approvedBy,
        updatedAt: approvedUser.updatedAt
      };

      res.json(sanitizedUser);
    } catch (error) {
      console.error("Error approving user:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid user ID format", errors: error.errors });
      }
      if (error instanceof Error && error.message === 'User not found or failed to approve user') {
        return res.status(404).json({ message: "User not found" });
      }
      res.status(500).json({ message: "Failed to approve user" });
    }
  });

  app.post('/api/admin/users/:userId/reject', requireAdmin, requireCSRFHeader, async (req: any, res) => {
    try {
      const { userId } = req.params;
      
      const userIdSchema = z.string().uuid();
      const validatedUserId = userIdSchema.parse(userId);

      const rejectedUser = await storage.rejectUser(validatedUserId, req.userId);
      
      const sanitizedUser = {
        id: rejectedUser.id,
        email: rejectedUser.email,
        firstName: rejectedUser.firstName,
        lastName: rejectedUser.lastName,
        approvalStatus: rejectedUser.approvalStatus,
        approvedAt: rejectedUser.approvedAt,
        approvedBy: rejectedUser.approvedBy,
        updatedAt: rejectedUser.updatedAt
      };

      res.json(sanitizedUser);
    } catch (error) {
      console.error("Error rejecting user:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid user ID format", errors: error.errors });
      }
      if (error instanceof Error && error.message === 'User not found or failed to reject user') {
        return res.status(404).json({ message: "User not found" });
      }
      res.status(500).json({ message: "Failed to reject user" });
    }
  });

  app.get('/api/admin/prompts', requireAdmin, async (req: any, res) => {
    try {
      const prompts = await storage.getAllPrompts();
      res.json(prompts);
    } catch (error) {
      console.error("Error fetching prompts:", error);
      res.status(500).json({ message: "Failed to fetch prompts" });
    }
  });

  app.get('/api/admin/prompts/:agentId', requireAdmin, async (req: any, res) => {
    try {
      const { agentId } = req.params;
      const prompt = await storage.getPrompt(agentId);
      
      if (!prompt) {
        return res.status(404).json({ message: "Prompt not found" });
      }

      res.json(prompt);
    } catch (error) {
      console.error("Error fetching prompt:", error);
      res.status(500).json({ message: "Failed to fetch prompt" });
    }
  });

  app.put('/api/admin/prompts/:agentId', requireAdmin, requireCSRFHeader, async (req: any, res) => {
    try {
      const { agentId } = req.params;
      const { prompt, name, description } = req.body;

      const promptSchema = z.object({
        prompt: z.string().min(1, "Prompt is required"),
        name: z.string().optional(),
        description: z.string().optional(),
      });
      
      const validated = promptSchema.parse({ prompt, name, description });

      const updatedPrompt = await storage.updatePrompt(
        agentId, 
        validated.prompt, 
        req.userId,
        validated.name,
        validated.description
      );
      
      res.json(updatedPrompt);
    } catch (error) {
      console.error("Error updating prompt:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid prompt data", errors: error.errors });
      }
      if (error instanceof Error && error.message.includes('not found')) {
        return res.status(404).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to update prompt" });
    }
  });

  app.post('/api/admin/prompts/:agentId/reset', requireAdmin, requireCSRFHeader, async (req: any, res) => {
    try {
      const { agentId } = req.params;

      const resetPrompt = await storage.resetPromptToDefault(agentId, req.userId);
      
      res.json(resetPrompt);
    } catch (error) {
      console.error("Error resetting prompt:", error);
      if (error instanceof Error && error.message.includes('not found')) {
        return res.status(404).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to reset prompt" });
    }
  });

  app.post('/api/admin/prompts/seed', requireAdmin, async (req: any, res) => {
    try {
      await storage.seedPrompts();
      res.json({ message: "Prompts seeded successfully" });
    } catch (error) {
      console.error("Error seeding prompts:", error);
      res.status(500).json({ message: "Failed to seed prompts" });
    }
  });

  app.use('/api/*', (_req, res) => {
    res.status(404).json({ message: "API endpoint not found" });
  });

  const httpServer = createServer(app);
  return httpServer;
}
