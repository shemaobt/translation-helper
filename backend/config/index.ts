function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function getOptionalEnv(name: string, defaultValue: string): string {
  return process.env[name] || defaultValue;
}

export const config = {
  database: {
    url: getRequiredEnv('DATABASE_URL'),
  },
  google: {
    apiKey: getRequiredEnv('GOOGLE_API_KEY'),
    credentials: process.env.GOOGLE_APPLICATION_CREDENTIALS,
  },
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
    secret: getRequiredEnv('SESSION_SECRET'),
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
  server: {
    port: parseInt(getOptionalEnv('PORT', '5000'), 10),
    nodeEnv: getOptionalEnv('NODE_ENV', 'development'),
  },
};

