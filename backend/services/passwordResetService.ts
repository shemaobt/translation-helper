import { randomBytes, createHash } from 'crypto';
import { config } from '../config';
import { storage } from '../storage';
import { hashPassword } from './authService';
import { sendPasswordResetEmail } from './emailService';

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export async function requestPasswordReset(email: string): Promise<void> {
  const user = await storage.getUserByEmail(email);
  if (!user) return;

  const rawToken = randomBytes(32).toString('hex');
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + config.passwordReset.tokenExpiryMs);

  await storage.createPasswordResetToken(user.id, tokenHash, expiresAt);
  await sendPasswordResetEmail(user.email, rawToken, user.firstName);
}

export async function resetPassword(token: string, newPassword: string): Promise<{ success: boolean; message: string }> {
  const tokenHash = hashToken(token);
  const resetToken = await storage.getValidPasswordResetToken(tokenHash);

  if (!resetToken) {
    return { success: false, message: 'Invalid or expired reset link. Please request a new one.' };
  }

  const hashedPassword = await hashPassword(newPassword);
  await storage.updateUserPassword(resetToken.userId, hashedPassword);
  await storage.markPasswordResetTokenUsed(resetToken.id);

  return { success: true, message: 'Password has been reset successfully.' };
}
