import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { generateAssistantResponse, generateAssistantResponseStream, generateChatCompletion, generateChatTitle, clearChatThread, getChatThreadId, transcribeAudio, generateSpeech } from "./openai";
import OpenAI from "openai";
import { insertChatSchema, insertMessageSchema, insertApiKeySchema, insertUserSchema, insertFeedbackSchema } from "@shared/schema";
import { randomBytes, createHash } from "crypto";
import bcrypt from "bcryptjs";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import multer from "multer";

// Server-side audio cache for faster TTS responses
interface CachedAudio {
  buffer: Buffer;
  timestamp: number;
  etag: string;
}

class AudioCache {
  private cache = new Map<string, CachedAudio>();
  private maxSize = 100; // Limit memory usage
  private ttl = 24 * 60 * 60 * 1000; // 24 hours

  private createCacheKey(text: string, language: string, voice?: string): string {
    // Normalize text for consistent caching
    const normalizedText = text.trim().toLowerCase();
    const voiceKey = voice || 'default';
    return createHash('sha256').update(`${normalizedText}:${language}:${voiceKey}`).digest('hex');
  }

  private isExpired(cached: CachedAudio): boolean {
    return Date.now() - cached.timestamp > this.ttl;
  }

  get(text: string, language: string, voice?: string): CachedAudio | null {
    const key = this.createCacheKey(text, language, voice);
    const cached = this.cache.get(key);
    
    if (cached && !this.isExpired(cached)) {
      // LRU: Move to end by re-inserting
      this.cache.delete(key);
      this.cache.set(key, cached);
      return cached;
    }
    
    if (cached) {
      this.cache.delete(key); // Remove expired
    }
    
    return null;
  }

  set(text: string, language: string, buffer: Buffer, voice?: string): CachedAudio {
    const key = this.createCacheKey(text, language, voice);
    const etag = `"${key.substring(0, 16)}"`;
    const cached: CachedAudio = {
      buffer,
      timestamp: Date.now(),
      etag
    };

    // LRU eviction if cache is full
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }

    this.cache.set(key, cached);
    return cached;
  }

  getETag(text: string, language: string, voice?: string): string {
    const key = this.createCacheKey(text, language, voice);
    return `"${key.substring(0, 16)}"`;
  }
}

const audioCache = new AudioCache();

// OpenAI instance for direct API calls
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR 
});

// Multer configuration for audio uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB limit (Whisper max file size)
  },
  fileFilter: (req: any, file: any, cb: any) => {
    // Accept audio files
    if (file.mimetype.startsWith('audio/') || file.mimetype === 'video/webm') {
      cb(null, true);
    } else {
      cb(new Error('Only audio files are allowed'));
    }
  }
});

// Authentication middleware
function requireAuth(req: any, res: any, next: any) {
  if (req.session && req.session.userId) {
    req.userId = req.session.userId;
    return next();
  }
  return res.status(401).json({ message: "Authentication required" });
}

// Admin authorization middleware
async function requireAdmin(req: any, res: any, next: any) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ message: "Authentication required" });
  }
  
  try {
    const user = await storage.getUserById(req.session.userId);
    if (!user || !user.isAdmin) {
      return res.status(403).json({ message: "Admin access required" });
    }
    
    req.userId = user.id;
    req.user = user;
    return next();
  } catch (error) {
    console.error("Admin authorization error:", error);
    return res.status(500).json({ message: "Authorization check failed" });
  }
}

// CSRF protection middleware - requires custom header for state-changing operations
function requireCSRFHeader(req: any, res: any, next: any) {
  const customHeader = req.get('X-Requested-With');
  if (customHeader !== 'XMLHttpRequest') {
    return res.status(403).json({ message: "Missing required security header" });
  }
  return next();
}

// Explicit validation schemas with security requirements
const signupValidationSchema = z.object({
  email: z.string().email().toLowerCase(),
  password: z.string().min(6, "Password must be at least 6 characters long"),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
});

const loginValidationSchema = z.object({
  email: z.string().email().toLowerCase(), 
  password: z.string().min(1, "Password is required"),
});

// Rate limiting for authentication routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 auth attempts per windowMs
  message: { message: "Too many authentication attempts, please try again later" },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter for public API endpoints
const publicApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: { error: 'Too many requests from this IP, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter for AI endpoints (more restrictive)
const aiApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // Limit each IP to 50 AI requests per windowMs
  message: { error: 'Too many AI requests from this IP, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth routes
  app.post('/api/auth/signup', authLimiter, async (req: any, res) => {
    try {
      const userData = signupValidationSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(userData.email);
      if (existingUser) {
        return res.status(400).json({ message: "User already exists" });
      }
      
      // Hash password
      const hashedPassword = await bcrypt.hash(userData.password, 12);
      
      // Create user
      const user = await storage.createUser({
        ...userData,
        password: hashedPassword
      });
      
      // Regenerate session to prevent session fixation
      req.session.regenerate((err: any) => {
        if (err) {
          console.error('Session regeneration failed:', err);
          return res.status(500).json({ message: "Failed to create session" });
        }
        
        // Set session
        req.session.userId = user.id;
        
        // Save session to ensure it's persisted
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
    } catch (error) {
      console.error("Signup error:", error);
      res.status(500).json({ message: "Failed to create account" });
    }
  });

  app.post('/api/auth/login', authLimiter, async (req: any, res) => {
    try {
      // Validate login data
      const { email, password } = loginValidationSchema.parse(req.body);
      
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      
      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      
      // Regenerate session to prevent session fixation
      req.session.regenerate((err: any) => {
        if (err) {
          console.error('Session regeneration failed:', err);
          return res.status(500).json({ message: "Failed to create session" });
        }
        
        // Set session
        req.session.userId = user.id;
        
        // Save session to ensure it's persisted
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
      res.clearCookie('connect.sid');
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
      });
    } catch (error) {
      console.error("Get user error:", error);
      res.status(500).json({ message: "Failed to get user" });
    }
  });

  // Chat routes
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
        const title = await generateChatTitle(content);
        await storage.updateChatTitle(chatId, title, userId);
      }

      // Generate AI response using the selected assistant
      const threadId = await getChatThreadId(chatId, userId);
      const aiResponse = await generateAssistantResponse({
        chatId,
        userMessage: content,
        assistantId: chat.assistantId as any,
        threadId: threadId || undefined,
      }, userId);

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

  // Streaming message endpoint for real-time AI responses
  app.post('/api/chats/:chatId/messages/stream', requireAuth, async (req: any, res) => {
    try {
      const userId = req.userId;
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
        const title = await generateChatTitle(content);
        await storage.updateChatTitle(chatId, title, userId);
      }

      // Set up Server-Sent Events
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.flushHeaders();

      // Send initial user message
      res.write(`data: ${JSON.stringify({ 
        type: 'user_message', 
        data: userMessage 
      })}\n\n`);

      try {
        // Generate streaming AI response
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
            
            // Create assistant message on first chunk
            if (!assistantMessageId) {
              const assistantMessage = await storage.createMessage({
                chatId,
                role: "assistant",
                content: "", // Will be updated incrementally
              });
              assistantMessageId = assistantMessage.id;
              
              // Send assistant message created event
              res.write(`data: ${JSON.stringify({ 
                type: 'assistant_message_start',
                data: assistantMessage
              })}\n\n`);
            }

            // Send content chunk
            res.write(`data: ${JSON.stringify({ 
              type: 'content', 
              data: chunk.data 
            })}\n\n`);

          } else if (chunk.type === 'done') {
            // Update the assistant message with final content
            if (assistantMessageId) {
              await storage.updateMessage(assistantMessageId, { content: fullContent });
            }

            // Send completion event
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
      // Clean up thread to prevent memory leaks
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
      
      // Create update schema for validating partial chat updates
      const updateChatSchema = insertChatSchema.pick({ assistantId: true, title: true }).partial();
      const updates = updateChatSchema.parse(req.body);
      
      // Verify chat belongs to user
      const existingChat = await storage.getChat(chatId, userId);
      if (!existingChat) {
        return res.status(404).json({ message: "Chat not found" });
      }
      
      // Update the chat
      const updatedChat = await storage.updateChat(chatId, updates, userId);
      res.json(updatedChat);
    } catch (error) {
      console.error("Error updating chat:", error);
      res.status(500).json({ message: "Failed to update chat" });
    }
  });

  // API Key routes
  app.get('/api/api-keys', requireAuth, async (req: any, res) => {
    try {
      const userId = req.userId;
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

  app.post('/api/api-keys', requireAuth, async (req: any, res) => {
    try {
      const userId = req.userId;
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

  // Dashboard stats
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

  // Public API endpoints (for external API access)
  const authenticateApiKey = async (req: any, res: any, next: any) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: "API key required" });
      }

      const apiKey = authHeader.substring(7);
      
      // Extract prefix for lookup (first 8 characters)
      if (apiKey.length < 8) {
        return res.status(401).json({ message: "Invalid API key format" });
      }
      
      const prefix = apiKey.substring(0, 8);
      
      // Get candidate keys by prefix
      const candidateKeys = await storage.getApiKeysByPrefix(prefix);
      if (candidateKeys.length === 0) {
        return res.status(401).json({ message: "Invalid API key" });
      }
      
      // Find matching key using constant-time comparison
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

      await storage.updateApiKeyLastUsed(matchedKey.id);
      req.apiKey = matchedKey;
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
        assistantId: 'storyteller', // Default to storyteller for external API
      }, 'api-user'); // Use special API user ID for external requests

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

  // Audio transcription endpoint using OpenAI Whisper
  app.post('/api/audio/transcribe', requireAuth, upload.single('audio'), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No audio file provided" });
      }

      const transcription = await transcribeAudio(req.file.buffer, req.file.originalname);
      res.json({ text: transcription });
    } catch (error) {
      console.error("Error transcribing audio:", error);
      res.status(500).json({ message: "Failed to transcribe audio" });
    }
  });

  // Text-to-speech endpoint using OpenAI TTS
  app.post('/api/audio/speak', requireAuth, async (req: any, res) => {
    try {
      const { text, language = 'en-US', voice } = req.body;
      
      if (!text || typeof text !== 'string') {
        return res.status(400).json({ message: "Text is required" });
      }

      if (text.length > 4096) {
        return res.status(400).json({ message: "Text too long (max 4096 characters)" });
      }

      // Generate ETag for this content (include voice for proper caching)
      const etag = audioCache.getETag(text, language, voice);
      
      // Check if client has cached version
      const clientETag = req.headers['if-none-match'];
      if (clientETag === etag) {
        return res.status(304).end(); // Not Modified
      }

      // Check server cache first
      let cached = audioCache.get(text, language, voice);
      let audioBuffer: Buffer;

      if (cached) {
        // Cache hit - instant response!
        audioBuffer = cached.buffer;
      } else {
        // Cache miss - generate and cache
        audioBuffer = await generateSpeech(text, language, voice);
        cached = audioCache.set(text, language, audioBuffer, voice);
      }
      
      res.set({
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.length.toString(),
        'Cache-Control': 'public, max-age=31536000, immutable', // 1 year - content-addressable
        'ETag': etag,
      });
      
      res.send(audioBuffer);
    } catch (error) {
      console.error("Error generating speech:", error);
      res.status(500).json({ message: "Failed to generate speech" });
    }
  });

  // PUBLIC API ENDPOINTS - No authentication required, but rate limited
  
  // Public text translation endpoint
  app.post('/api/public/translate', aiApiLimiter, async (req: any, res) => {
    try {
      const { text, fromLanguage = 'auto', toLanguage = 'en-US', context = '' } = req.body;
      
      if (!text || typeof text !== 'string') {
        return res.status(400).json({ error: "Text is required" });
      }

      if (text.length > 2048) {
        return res.status(400).json({ error: "Text too long (max 2048 characters)" });
      }

      // Create a translation prompt
      const prompt = context 
        ? `Translate the following text from ${fromLanguage} to ${toLanguage}. Context: ${context}\n\nText to translate: ${text}`
        : `Translate the following text from ${fromLanguage} to ${toLanguage}:\n\n${text}`;

      // Create a direct OpenAI chat completion for translation
      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          { role: 'system', content: 'You are a professional translator. Provide only the translation without any additional text or explanations.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 1000,
        temperature: 0.1
      });
      
      const response = completion.choices[0].message.content;

      res.json({
        translatedText: response,
        fromLanguage,
        toLanguage,
        originalText: text
      });
    } catch (error) {
      console.error("Error in public translation:", error);
      res.status(500).json({ error: "Translation failed" });
    }
  });

  // Public speech-to-text endpoint
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

  // Public text-to-speech endpoint
  app.post('/api/public/speak', aiApiLimiter, async (req: any, res) => {
    try {
      const { text, language = 'en-US', voice = 'alloy' } = req.body;
      
      if (!text || typeof text !== 'string') {
        return res.status(400).json({ error: "Text is required" });
      }

      if (text.length > 1024) {
        return res.status(400).json({ error: "Text too long (max 1024 characters for public API)" });
      }

      // Generate ETag for this content
      const etag = audioCache.getETag(text, language, voice);
      
      // Check if client has cached version
      const clientETag = req.headers['if-none-match'];
      if (clientETag === etag) {
        return res.status(304).end(); // Not Modified
      }

      // Check server cache first
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
        'Access-Control-Allow-Origin': '*', // Allow CORS for public API
        'Access-Control-Allow-Headers': 'Content-Type, If-None-Match',
      });
      
      res.send(audioBuffer);
    } catch (error) {
      console.error("Error in public speech generation:", error);
      res.status(500).json({ error: "Speech generation failed" });
    }
  });

  // Public API info endpoint
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

  // Feedback routes
  app.post('/api/feedback', publicApiLimiter, async (req: any, res) => {
    try {
      // Validate feedback data
      const feedbackSchema = insertFeedbackSchema.extend({
        message: z.string().min(1, "Feedback message is required").max(5000, "Message too long"),
        userEmail: z.string().email().optional().or(z.literal("")),
        userName: z.string().optional().or(z.literal("")),
        category: z.enum(["bug", "feature", "general", "other"]).optional(),
      });

      const feedbackData = feedbackSchema.parse(req.body);
      
      // Extract userId from session if available
      const userId = req.session?.userId || null;

      const feedback = await storage.createFeedback({
        ...feedbackData,
        userId,
        userEmail: feedbackData.userEmail || undefined,
        userName: feedbackData.userName || undefined,
        status: 'new', // Default status
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

  // Admin feedback management routes (requires admin auth)
  app.get('/api/admin/feedback', requireAdmin, async (req: any, res) => {
    try {
      const feedback = await storage.getAllFeedback();
      res.json(feedback);
    } catch (error) {
      console.error("Error fetching feedback:", error);
      res.status(500).json({ message: "Failed to fetch feedback" });
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

      // Validate status
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

  app.get('/api/admin/feedback/unread-count', requireAdmin, async (req: any, res) => {
    try {
      const unreadCount = await storage.getUnreadFeedbackCount();
      res.json({ count: unreadCount });
    } catch (error) {
      console.error("Error fetching unread feedback count:", error);
      res.status(500).json({ message: "Failed to fetch unread feedback count" });
    }
  });

  // Catch-all for unmatched API routes - return 404 instead of HTML
  app.use('/api/*', (req, res) => {
    res.status(404).json({ message: "API endpoint not found" });
  });

  const httpServer = createServer(app);
  return httpServer;
}
