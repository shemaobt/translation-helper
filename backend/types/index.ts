import type { Request } from "express";
import type { User, ApiKey } from "@shared/schema";

export interface CustomSession {
  userId?: string;
  passport?: { user: string };
  regenerate: (callback: (err: Error | null) => void) => void;
  save: (callback: (err: Error | null) => void) => void;
  destroy: (callback: (err: Error | null) => void) => void;
}

export interface AuthenticatedRequest extends Request {
  userId: string;
  user: User;
  session: CustomSession;
}

export interface ApiKeyAuthenticatedRequest extends Request {
  userId: string;
  user: User;
  apiKey: ApiKey;
}

export interface SessionRequest extends Request {
  session: CustomSession;
}
