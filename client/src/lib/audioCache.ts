import { config } from "@/config";

interface CachedAudio {
  url: string;
  timestamp: number;
  language: string;
  textHash: string;
}

function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

export function getCachedAudio(text: string, language: string, voiceName: string): string | null {
  try {
    const textHash = simpleHash(text);
    const cacheKey = `${config.audio.cacheKeyPrefix}${language}_${voiceName}_${textHash}`;
    const cached = localStorage.getItem(cacheKey);
    
    if (cached) {
      const { url, timestamp }: CachedAudio = JSON.parse(cached);
      const now = Date.now();
      const ageHours = (now - timestamp) / (1000 * 60 * 60);
      
      if (ageHours < config.audio.cacheExpiryHours) {
        return url;
      } else {
        localStorage.removeItem(cacheKey);
        URL.revokeObjectURL(url);
      }
    }
  } catch (error) {
    console.warn('Error reading from audio cache:', error);
  }
  
  return null;
}

export function setCachedAudio(text: string, language: string, voiceName: string, audioUrl: string): void {
  try {
    const textHash = simpleHash(text);
    const cacheKey = `${config.audio.cacheKeyPrefix}${language}_${voiceName}_${textHash}`;
    const cacheData: CachedAudio = {
      url: audioUrl,
      timestamp: Date.now(),
      language,
      textHash
    };
    
    cleanupOldCache();
    localStorage.setItem(cacheKey, JSON.stringify(cacheData));
  } catch (error) {
    console.warn('Error saving to audio cache:', error);
  }
}

export function cleanupOldCache(): void {
  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(config.audio.cacheKeyPrefix)) {
        keys.push(key);
      }
    }
    
    if (keys.length > config.audio.maxCacheSize) {
      const entries = keys.map(key => {
        const cached = localStorage.getItem(key);
        return cached ? { key, data: JSON.parse(cached) } : null;
      }).filter(Boolean) as Array<{key: string, data: CachedAudio}>;
      
      entries.sort((a, b) => a.data.timestamp - b.data.timestamp);
      
      const toRemove = entries.slice(0, entries.length - config.audio.maxCacheSize);
      toRemove.forEach(({ key, data }) => {
        localStorage.removeItem(key);
        URL.revokeObjectURL(data.url);
      });
    }
  } catch (error) {
    console.warn('Error during cache cleanup:', error);
  }
}

