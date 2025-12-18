import { Response, NextFunction } from 'express';
import { storage } from '../storage';
import type { AuthenticatedRequest } from '../types';
import type { User } from '@shared/schema';

function getEffectiveApproval(user: User): string {
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

export async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.session || !(req.session as any).userId) {
    return res.status(401).json({ message: "Authentication required" });
  }
  
  try {
    const user = await storage.getUserById((req.session as any).userId);
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }
    
    const effectiveApproval = getEffectiveApproval(user);
    if (!handleApprovalStatus(effectiveApproval, res)) {
      return;
    }
    
    req.userId = (req.session as any).userId;
    req.user = user;
    return next();
  } catch (error) {
    console.error("Authentication middleware error:", error);
    return res.status(500).json({ message: "Authentication check failed" });
  }
}

export async function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.session || !(req.session as any).userId) {
    return res.status(401).json({ message: "Authentication required" });
  }
  
  try {
    const user = await storage.getUserById((req.session as any).userId);
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }
    
    const effectiveApproval = getEffectiveApproval(user);
    if (!handleApprovalStatus(effectiveApproval, res)) {
      return;
    }
    
    if (!user.isAdmin) {
      return res.status(403).json({ message: "Admin access required" });
    }
    
    req.userId = user.id;
    req.user = user;
    return next();
  } catch (error) {
    console.error("Admin authorization error:", error);
    return res.status(500).json({ message: "Authorization check failed" });
  }
}

export function requireCSRFHeader(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const customHeader = req.get('X-Requested-With');
  if (customHeader !== 'XMLHttpRequest') {
    return res.status(403).json({ message: "Missing required security header" });
  }
  return next();
}

export { getEffectiveApproval };

