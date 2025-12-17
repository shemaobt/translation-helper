export const config = {
  upload: {
    audioMaxSize: 25 * 1024 * 1024,
    profileImageMaxSize: 5 * 1024 * 1024,
  },
  rateLimits: {
    windowMs: 15 * 60 * 1000,
    auth: 5,
    publicApi: 100,
    aiApi: 50,
  },
  session: {
    secret: process.env.SESSION_SECRET || 'translation-helper-secret-key-2025',
    ttl: 7 * 24 * 60 * 60 * 1000,
    cookieName: 'translation.sid',
  },
  auth: {
    saltRounds: 12,
  },
  audioCache: {
    maxSize: 100,
    ttlMs: 24 * 60 * 60 * 1000,
  },
};

