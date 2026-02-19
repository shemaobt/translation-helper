export const config = {
  audio: {
    cacheExpiryHours: 24,
    maxCacheSize: 50,
    cacheKeyPrefix: 'tts_cache_',
    bitRate: 64000,
  },
  auth: {
    redirectDelayMs: 500,
    loginPath: '/login',
    dashboardPath: '/dashboard',
  },
  api: {
    retryAttempts: 3,
  },
};

