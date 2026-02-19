import { createHash } from 'crypto';
import { config } from '../config';
import { Buffer } from 'buffer';

export interface CachedAudio {
  buffer: Buffer;
  timestamp: number;
  etag: string;
}

const cache = new Map<string, CachedAudio>();
const maxSize = config.audioCache.maxSize;
const ttl = config.audioCache.ttlMs;

function createCacheKey(text: string, language: string, voice?: string): string {
  const normalizedText = text.trim().toLowerCase();
  const voiceKey = voice || 'default';
  return createHash('sha256').update(`${normalizedText}:${language}:${voiceKey}`).digest('hex');
}

function isExpired(cached: CachedAudio): boolean {
  return Date.now() - cached.timestamp > ttl;
}

export function getCachedAudio(text: string, language: string, voice?: string): CachedAudio | null {
  const key = createCacheKey(text, language, voice);
  const cached = cache.get(key);
  
  if (cached && !isExpired(cached)) {
    cache.delete(key);
    cache.set(key, cached);
    return cached;
  }
  
  if (cached) {
    cache.delete(key);
  }
  
  return null;
}

export function setCachedAudio(text: string, language: string, buffer: Buffer, voice?: string): CachedAudio {
  const key = createCacheKey(text, language, voice);
  const etag = `"${key.substring(0, 16)}"`;
  const cached: CachedAudio = {
    buffer,
    timestamp: Date.now(),
    etag
  };

  if (cache.size >= maxSize) {
    const firstKey = cache.keys().next().value;
    if (firstKey) cache.delete(firstKey);
  }

  cache.set(key, cached);
  return cached;
}

export function getAudioETag(text: string, language: string, voice?: string): string {
  const key = createCacheKey(text, language, voice);
  return `"${key.substring(0, 16)}"`;
}
