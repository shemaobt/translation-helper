import type { Request, Response, NextFunction } from 'express';
import { storage } from '../storage';
import type { AuthenticatedRequest, SessionRequest } from '../types';
import type { User } from '@shared/schema';

export function getEffectiveApproval(user: User): string {
  const approvalStatus = user.approvalStatus ?? 'approved';
  return (approvalStatus === 'pending' && user.lastLoginAt) ? 'approved' : approvalStatus;
}

function handleApprovalStatus(effectiveApproval: string, res: Response): boolean {
  if (effectiveApproval === 'pending') {
    res.status(403).json({ 
      message: "Your account is awaiting admin approval.",
      approvalStatus: "pending"
    });
    return false;
  }
  
  if (effectiveApproval === 'rejected') {
    res.status(403).json({ 
      message: "Your account has been rejected. Please contact support.",
      approvalStatus: "rejected"
    });
    return false;
  }
  
  if (effectiveApproval !== 'approved') {
    res.status(403).json({ 
      message: "Account access denied. Please contact support.",
      approvalStatus: effectiveApproval
    });
    return false;
  }
  
  return true;
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const sessionReq = req as SessionRequest;
  if (!sessionReq.session || !sessionReq.session.userId) {
    res.status(401).json({ message: "Authentication required" });
    return;
  }
  
  try {
    const user = await storage.getUserById(sessionReq.session.userId);
    if (!user) {
      res.status(401).json({ message: "User not found" });
      return;
    }
    
    const effectiveApproval = getEffectiveApproval(user);
    if (!handleApprovalStatus(effectiveApproval, res)) {
      return;
    }
    
    (req as AuthenticatedRequest).userId = sessionReq.session.userId;
    (req as AuthenticatedRequest).user = user;
    next();
  } catch (error) {
    console.error("Authentication middleware error:", error);
    res.status(500).json({ message: "Authentication check failed" });
  }
}

export async function requireAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  const sessionReq = req as SessionRequest;
  if (!sessionReq.session || !sessionReq.session.userId) {
    res.status(401).json({ message: "Authentication required" });
    return;
  }
  
  try {
    const user = await storage.getUserById(sessionReq.session.userId);
    if (!user) {
      res.status(401).json({ message: "User not found" });
      return;
    }
    
    const effectiveApproval = getEffectiveApproval(user);
    if (!handleApprovalStatus(effectiveApproval, res)) {
      return;
    }
    
    if (!user.isAdmin) {
      res.status(403).json({ message: "Admin access required" });
      return;
    }
    
    (req as AuthenticatedRequest).userId = user.id;
    (req as AuthenticatedRequest).user = user;
    next();
  } catch (error) {
    console.error("Admin authorization error:", error);
    res.status(500).json({ message: "Authorization check failed" });
  }
}

export function requireCSRFHeader(req: Request, res: Response, next: NextFunction): void {
  const customHeader = req.get('X-Requested-With');
  if (customHeader !== 'XMLHttpRequest') {
    res.status(403).json({ message: "Missing required security header" });
    return;
  }
  next();
}

