import { Router } from "express";
import multer from "multer";
import { storage } from "../storage";
import { config } from "../config";
import { requireAuth } from "../middleware";
import { transcribeAudio, generateSpeech } from "../gemini";
import { getCachedAudio, setCachedAudio, getAudioETag } from "../services";

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

router.post('/transcribe', requireAuth, upload.single('audio'), async (req, res) => {
  try {
    const file = (req as { file?: Express.Multer.File }).file;
    if (!file) {
      return res.status(400).json({ message: "No audio file provided" });
    }

    const userId = (req as { userId: string }).userId;
    const transcription = await transcribeAudio(file.buffer, file.originalname);
    await storage.incrementUserApiUsage(userId);
    
    res.json({ text: transcription });
  } catch (error) {
    console.error("Error transcribing audio:", error);
    res.status(500).json({ message: "Failed to transcribe audio" });
  }
});

router.post('/speak', requireAuth, async (req, res) => {
  try {
    const { text, language = 'en-US', voice } = req.body;
    const userId = (req as { userId: string }).userId;
    
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ message: "Text is required" });
    }

    if (text.length > 4096) {
      return res.status(400).json({ message: "Text too long (max 4096 characters)" });
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
      await storage.incrementUserApiUsage(userId);
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

export default router;
