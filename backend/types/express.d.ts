import type { User, ApiKey } from "@shared/schema";

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      user?: User;
      apiKey?: ApiKey;
    }
    
    interface Session {
      userId?: string;
      passport?: { user: string };
      regenerate: (callback: (err: Error | null) => void) => void;
      save: (callback: (err: Error | null) => void) => void;
      destroy: (callback: (err: Error | null) => void) => void;
    }
  }
}

export interface AuthenticatedRequest extends Express.Request {
  userId: string;
  user: User;
}

export interface ApiKeyAuthenticatedRequest extends Express.Request {
  userId: string;
  user: User;
  apiKey: ApiKey;
}

export interface SessionRequest extends Express.Request {
  session: Express.Session;
}

export {};
