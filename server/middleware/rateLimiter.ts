import rateLimit from 'express-rate-limit';
import type { Request } from 'express';
import { config } from '../config';
import { storage } from '../storage';
import { getEffectiveApproval } from './auth';

export const authLimiter = rateLimit({
  windowMs: config.rateLimits.windowMs,
  max: config.rateLimits.auth,
  message: { message: "Too many authentication attempts, please try again later" },
  standardHeaders: true,
  legacyHeaders: false,
  skip: async (req: Request) => {
    try {
      if (!req.body || typeof req.body !== 'object') {
        return false;
      }
      
      const email = req.body.email;
      if (!email || typeof email !== 'string') {
        return false;
      }
      
      const user = await storage.getUserByEmail(email.toLowerCase());
      if (!user) {
        return false;
      }
      
      const effectiveApproval = getEffectiveApproval(user);
      return effectiveApproval === 'pending' || effectiveApproval === 'rejected';
    } catch (error) {
      console.error('Error checking user status for rate limiting:', error);
      return false;
    }
  },
});

export const publicApiLimiter = rateLimit({
  windowMs: config.rateLimits.windowMs,
  max: config.rateLimits.publicApi,
  message: { error: 'Too many requests from this IP, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

export const aiApiLimiter = rateLimit({
  windowMs: config.rateLimits.windowMs,
  max: config.rateLimits.aiApi,
  message: { error: 'Too many AI requests from this IP, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

