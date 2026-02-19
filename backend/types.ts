import { Request } from 'express';
import type { User, ApiKey } from '@shared/schema';

export interface AuthenticatedRequest extends Request {
  userId?: string;
  user?: User;
}

export interface ApiKeyRequest extends AuthenticatedRequest {
  apiKey?: ApiKey;
}

export interface FileRequest extends AuthenticatedRequest {
  file?: Express.Multer.File;
}

