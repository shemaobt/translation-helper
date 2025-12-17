import rateLimit from 'express-rate-limit';
import { config } from '../config';

export const authLimiter = rateLimit({
  windowMs: config.rateLimits.windowMs,
  max: config.rateLimits.auth,
  message: { message: "Too many authentication attempts, please try again later" },
  standardHeaders: true,
  legacyHeaders: false,
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

