import type { Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import { storage } from "../storage";
import { getEffectiveApprovalStatus } from "../services/authService";
import type { User, ApiKey } from "@shared/schema";

export interface ApiKeyAuthenticatedRequest extends Request {
  apiKey: ApiKey;
  userId: string;
  user: User;
}

export async function authenticateApiKey(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ message: "API key required" });
      return;
    }

    const apiKey = authHeader.substring(7);
    
    if (apiKey.length < 8) {
      res.status(401).json({ message: "Invalid API key format" });
      return;
    }
    
    const prefix = apiKey.substring(0, 8);
    const candidateKeys = await storage.getApiKeysByPrefix(prefix);
    if (candidateKeys.length === 0) {
      res.status(401).json({ message: "Invalid API key" });
      return;
    }
    
    let matchedKey: ApiKey | null = null;
    for (const candidateKey of candidateKeys) {
      const isValid = await bcrypt.compare(apiKey, candidateKey.keyHash);
      if (isValid) {
        matchedKey = candidateKey;
        break;
      }
    }
    
    if (!matchedKey) {
      res.status(401).json({ message: "Invalid API key" });
      return;
    }

    const keyOwner = await storage.getUserById(matchedKey.userId);
    if (!keyOwner) {
      res.status(401).json({ message: "API key owner not found" });
      return;
    }
    
    const effectiveApproval = getEffectiveApprovalStatus(keyOwner);
    
    if (effectiveApproval === 'pending') {
      res.status(403).json({ 
        message: "API access denied. Your account is awaiting admin approval.",
        approvalStatus: "pending"
      });
      return;
    }
    
    if (effectiveApproval === 'rejected') {
      res.status(403).json({ 
        message: "API access denied. Your account has been rejected.",
        approvalStatus: "rejected"
      });
      return;
    }
    
    if (effectiveApproval !== 'approved') {
      res.status(403).json({ 
        message: "API access denied. Please contact support.",
        approvalStatus: effectiveApproval
      });
      return;
    }

    await storage.updateApiKeyLastUsed(matchedKey.id);
    
    (req as ApiKeyAuthenticatedRequest).apiKey = matchedKey;
    (req as ApiKeyAuthenticatedRequest).userId = keyOwner.id;
    (req as ApiKeyAuthenticatedRequest).user = keyOwner;
    
    next();
  } catch (error) {
    console.error("Error authenticating API key:", error);
    res.status(401).json({ message: "Invalid API key" });
  }
}
