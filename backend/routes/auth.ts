import { Router } from "express";
import { z } from "zod";
import { storage } from "../storage";
import { config } from "../config";
import { requireAuth, authLimiter, passwordResetLimiter } from "../middleware";
import {
  hashPassword,
  comparePassword,
  validateApprovalStatus,
  updateLastLogin,
  createSession,
  sanitizeUserForResponse,
} from "../services/authService";
import { requestPasswordReset, resetPassword } from "../services/passwordResetService";

const router = Router();

const signupValidationSchema = z.object({
  email: z.string().email().toLowerCase(),
  password: z.string().min(6, "Password must be at least 6 characters long"),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  profileImageUrl: z.string().optional(),
  organization: z.string().optional(),
  projectType: z.enum(["mother tongue translator", "facilitator", "translation advisor", "consultant/mentor", "administrator", "other"]).optional(),
});

const loginValidationSchema = z.object({
  email: z.string().email().toLowerCase(), 
  password: z.string().min(1, "Password is required"),
});

router.post('/signup', authLimiter, async (req, res) => {
  try {
    const userData = signupValidationSchema.parse(req.body);
    
    const existingUser = await storage.getUserByEmail(userData.email);
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }
    
    const hashedPassword = await hashPassword(userData.password);
    
    const user = await storage.createUser({
      ...userData,
      password: hashedPassword
    });
    
    const approvalStatus = user.approvalStatus ?? 'pending';
    
    if (approvalStatus === 'pending') {
      return res.status(201).json({
        message: "Account created successfully. Your account is awaiting admin approval.",
        approvalStatus: "pending",
        email: user.email
      });
    }
    
    if (approvalStatus === 'approved') {
      try {
        await createSession(req as Parameters<typeof createSession>[0], user.id);
        res.json(sanitizeUserForResponse(user));
      } catch {
        return res.status(500).json({ message: "Failed to create session" });
      }
    } else {
      return res.status(403).json({ 
        message: "Account creation failed. Please contact support.",
        approvalStatus: approvalStatus 
      });
    }
  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({ message: "Failed to create account" });
  }
});

router.post('/login', authLimiter, async (req, res) => {
  try {
    const { email, password } = loginValidationSchema.parse(req.body);
    
    const user = await storage.getUserByEmail(email);
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }
    
    const isValid = await comparePassword(password, user.password);
    if (!isValid) {
      return res.status(401).json({ message: "Invalid credentials" });
    }
    
    const approval = validateApprovalStatus(user);
    if (!approval.valid) {
      return res.status(403).json({ 
        message: approval.message,
        approvalStatus: approval.status
      });
    }
    
    try {
      await createSession(req as Parameters<typeof createSession>[0], user.id);
      await updateLastLogin(user.id);
      res.json(sanitizeUserForResponse(user));
    } catch {
      return res.status(500).json({ message: "Failed to create session" });
    }
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Login failed" });
  }
});

router.post('/logout', (req, res) => {
  const session = req.session as { destroy: (cb: (err: Error | null) => void) => void };
  session.destroy((err: Error | null) => {
    if (err) {
      return res.status(500).json({ message: "Failed to logout" });
    }
    res.clearCookie(config.session.cookieName);
    res.json({ message: "Logged out successfully" });
  });
});

router.get('/user', requireAuth, async (req, res) => {
  try {
    const userId = (req as { userId: string }).userId;
    const user = await storage.getUserById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    res.json(sanitizeUserForResponse(user));
  } catch (error) {
    console.error("Get user error:", error);
    res.status(500).json({ message: "Failed to get user" });
  }
});

const forgotPasswordSchema = z.object({
  email: z.string().email().toLowerCase(),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1, "Token is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

router.post('/forgot-password', passwordResetLimiter, async (req, res) => {
  try {
    const { email } = forgotPasswordSchema.parse(req.body);
    await requestPasswordReset(email);
  } catch (error) {
    console.error("Forgot password error:", error);
  }
  res.json({ message: "If an account with that email exists, we've sent a password reset link." });
});

router.post('/reset-password', authLimiter, async (req, res) => {
  try {
    const { token, password } = resetPasswordSchema.parse(req.body);
    const result = await resetPassword(token, password);
    if (!result.success) {
      return res.status(400).json({ message: result.message });
    }
    res.json({ message: result.message });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({ message: "Failed to reset password" });
  }
});

export default router;
