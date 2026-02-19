import { Router } from "express";
import { z } from "zod";
import multer from "multer";
import { randomBytes } from "crypto";
import { storage } from "../storage";
import { config } from "../config";
import { publicApiLimiter, aiApiLimiter, authenticateApiKey } from "../middleware";
import type { ApiKeyAuthenticatedRequest } from "../middleware";
import { transcribeAudio, translateText, generateSpeech, generateChatCompletion } from "../gemini";
import { getCachedAudio, setCachedAudio, getAudioETag } from "../services";
import { insertFeedbackSchema } from "@shared/schema";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: config.upload.audioMaxSize,
  },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('audio/') || file.mimetype === 'video/webm') {
      cb(null, true);
    } else {
      cb(new Error('Only audio files are allowed'));
    }
  }
});

router.post('/translate', aiApiLimiter, async (req, res) => {
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

router.post('/transcribe', aiApiLimiter, upload.single('audio'), async (req, res) => {
  try {
    const file = (req as { file?: Express.Multer.File }).file;
    if (!file) {
      return res.status(400).json({ error: "Audio file is required" });
    }

    const filename = file.originalname || 'audio.webm';
    const transcribedText = await transcribeAudio(file.buffer, filename);
    
    res.json({
      text: transcribedText,
      language: req.body.language || 'auto'
    });
  } catch (error) {
    console.error("Error in public transcription:", error);
    res.status(500).json({ error: "Transcription failed" });
  }
});

router.post('/speak', aiApiLimiter, async (req, res) => {
  try {
    const { text, language = 'en-US', voice = 'alloy' } = req.body;
    
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: "Text is required" });
    }

    if (text.length > 1024) {
      return res.status(400).json({ error: "Text too long (max 1024 characters for public API)" });
    }

    const etag = getAudioETag(text, language, voice);
    
    const clientETag = req.headers['if-none-match'];
    if (clientETag === etag) {
      return res.status(304).end();
    }

    let cached = getCachedAudio(text, language, voice);
    let audioBuffer: Buffer;

    if (cached) {
      audioBuffer = cached.buffer;
    } else {
      audioBuffer = await generateSpeech(text, language, voice);
      cached = setCachedAudio(text, language, audioBuffer, voice);
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

router.get('/info', publicApiLimiter, (_req, res) => {
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

router.post('/feedback', publicApiLimiter, async (req, res) => {
  try {
    const feedbackSchema = insertFeedbackSchema.extend({
      message: z.string().min(1, "Feedback message is required").max(5000, "Message too long"),
      userEmail: z.string().email().optional().or(z.literal("")),
      userName: z.string().optional().or(z.literal("")),
      category: z.enum(["bug", "feature", "general", "other"]).optional(),
    });

    const feedbackData = feedbackSchema.parse(req.body);
    const session = req.session as { userId?: string };
    const userId = session?.userId || null;

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

router.post('/v1/chat/completions', authenticateApiKey, async (req, res) => {
  try {
    const typedReq = req as ApiKeyAuthenticatedRequest;
    const { messages } = req.body;
    
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
      apiKeyId: typedReq.apiKey.id,
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

export default router;
