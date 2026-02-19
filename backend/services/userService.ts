import { storage } from "../storage";
import { hashPassword, comparePassword } from "./authService";
import type { User } from "@shared/schema";

export function sanitizeUser(user: User): Record<string, unknown> {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    isAdmin: user.isAdmin,
    profileImageUrl: user.profileImageUrl,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    lastLoginAt: user.lastLoginAt,
    approvalStatus: user.approvalStatus,
    approvedAt: user.approvedAt,
    approvedBy: user.approvedBy,
  };
}

export function sanitizeUserForAdmin(user: User & { stats?: Record<string, number> }): Record<string, unknown> {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    isAdmin: user.isAdmin,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    lastLoginAt: user.lastLoginAt,
    approvalStatus: user.approvalStatus,
    approvedAt: user.approvedAt,
    approvedBy: user.approvedBy,
    stats: user.stats,
  };
}

export async function uploadProfileImage(
  userId: string,
  file: { mimetype: string; buffer: Buffer }
): Promise<string> {
  const base64Image = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
  await storage.updateUserProfileImage(userId, base64Image);
  return base64Image;
}

export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string
): Promise<{ success: boolean; message: string }> {
  if (!currentPassword || !newPassword) {
    return { success: false, message: "Current password and new password are required" };
  }
  
  if (newPassword.length < 6) {
    return { success: false, message: "New password must be at least 6 characters" };
  }
  
  const user = await storage.getUserById(userId);
  if (!user) {
    return { success: false, message: "User not found" };
  }
  
  const isValid = await comparePassword(currentPassword, user.password);
  if (!isValid) {
    return { success: false, message: "Current password is incorrect" };
  }
  
  const hashedPassword = await hashPassword(newPassword);
  await storage.updateUserPassword(userId, hashedPassword);
  
  return { success: true, message: "Password changed successfully" };
}

export async function getUserProfile(userId: string): Promise<Record<string, unknown> | null> {
  const user = await storage.getUserById(userId);
  if (!user) {
    return null;
  }
  return sanitizeUser(user);
}
