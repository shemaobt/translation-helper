import bcrypt from "bcryptjs";
import type { Request } from "express";
import { config } from "../config";
import { storage } from "../storage";
import type { User } from "@shared/schema";

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, config.auth.saltRounds);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function getEffectiveApprovalStatus(user: User): string {
  if (user.isAdmin) {
    return 'approved';
  }
  return user.approvalStatus ?? 'pending';
}

export function validateApprovalStatus(user: User): { valid: boolean; message: string; status: string } {
  const effectiveApproval = getEffectiveApprovalStatus(user);
  
  if (effectiveApproval === 'pending') {
    return { 
      valid: false, 
      message: "Your account is awaiting admin approval. Please wait for approval before logging in.",
      status: "pending"
    };
  }
  
  if (effectiveApproval === 'rejected') {
    return { 
      valid: false, 
      message: "Your account has been rejected. Please contact support for assistance.",
      status: "rejected"
    };
  }
  
  if (effectiveApproval !== 'approved') {
    return { 
      valid: false, 
      message: "Account access denied. Please contact support.",
      status: effectiveApproval
    };
  }

  return { valid: true, message: "", status: "approved" };
}

export async function updateLastLogin(userId: string): Promise<void> {
  try {
    await storage.updateUserLastLogin(userId);
  } catch (error) {
    console.error('Failed to track login:', error);
  }
}

export function createSession(
  req: Request & { session: { userId?: string; regenerate: Function; save: Function } },
  userId: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    req.session.regenerate((err: Error | null) => {
      if (err) {
        console.error('Session regeneration failed:', err);
        reject(new Error("Failed to create session"));
        return;
      }
      
      req.session.userId = userId;
      
      req.session.save((saveErr: Error | null) => {
        if (saveErr) {
          console.error('Session save failed:', saveErr);
          reject(new Error("Failed to save session"));
          return;
        }
        resolve();
      });
    });
  });
}

export function sanitizeUserForResponse(user: User): Record<string, unknown> {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    isAdmin: user.isAdmin,
    profileImageUrl: user.profileImageUrl,
    createdAt: user.createdAt,
  };
}
