import { createHash } from 'crypto';
import { config } from '../config';

export interface CachedAudio {
  buffer: Buffer;
  timestamp: number;
  etag: string;
}

export class AudioCache {
  private cache = new Map<string, CachedAudio>();
  private maxSize = config.audioCache.maxSize;
  private ttl = config.audioCache.ttlMs;

  private createCacheKey(text: string, language: string, voice?: string): string {
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
      this.cache.delete(key);
      this.cache.set(key, cached);
      return cached;
    }
    
    if (cached) {
      this.cache.delete(key);
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

export const audioCache = new AudioCache();

