import { Router } from "express";
import { z } from "zod";
import { randomBytes } from "crypto";
import { storage } from "../storage";
import { requireAdmin, requireCSRFHeader } from "../middleware";
import { sanitizeUserForAdmin } from "../services/userService";

const router = Router();

router.get('/feedback', requireAdmin, async (_req, res) => {
  try {
    const feedback = await storage.getAllFeedback();
    res.json(feedback);
  } catch (error) {
    console.error("Error fetching feedback:", error);
    res.status(500).json({ message: "Failed to fetch feedback" });
  }
});

router.get('/feedback/unread-count', requireAdmin, async (_req, res) => {
  try {
    const unreadCount = await storage.getUnreadFeedbackCount();
    res.json({ count: unreadCount });
  } catch (error) {
    console.error("Error fetching unread feedback count:", error);
    res.status(500).json({ message: "Failed to fetch unread feedback count" });
  }
});

router.get('/feedback/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const feedback = await storage.getFeedback(id);
    
    if (!feedback) {
      return res.status(404).json({ message: "Feedback not found" });
    }

    res.json(feedback);
  } catch (error) {
    console.error("Error fetching feedback:", error);
    res.status(500).json({ message: "Failed to fetch feedback" });
  }
});

router.patch('/feedback/:id', requireAdmin, requireCSRFHeader, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const statusSchema = z.enum(["new", "read", "resolved"]);
    const validatedStatus = statusSchema.parse(status);

    const updatedFeedback = await storage.updateFeedbackStatus(id, validatedStatus);
    
    if (!updatedFeedback) {
      return res.status(404).json({ message: "Feedback not found" });
    }
    
    res.json(updatedFeedback);
  } catch (error) {
    console.error("Error updating feedback:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid status", errors: error.errors });
    }
    res.status(500).json({ message: "Failed to update feedback" });
  }
});

router.delete('/feedback/:id', requireAdmin, requireCSRFHeader, async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await storage.deleteFeedback(id);
    
    if (!deleted) {
      return res.status(404).json({ message: "Feedback not found" });
    }
    
    res.json({ message: "Feedback deleted successfully" });
  } catch (error) {
    console.error("Error deleting feedback:", error);
    res.status(500).json({ message: "Failed to delete feedback" });
  }
});

router.get('/users', requireAdmin, async (_req, res) => {
  try {
    const users = await storage.getAllUsersWithStats();
    const sanitizedUsers = users.map(user => sanitizeUserForAdmin(user));
    res.json(sanitizedUsers);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ message: "Failed to fetch users" });
  }
});

router.patch('/users/:userId/admin', requireAdmin, requireCSRFHeader, async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = (req as { userId: string }).userId;
    
    const userIdSchema = z.string().uuid();
    const validatedUserId = userIdSchema.parse(userId);

    if (validatedUserId === currentUserId) {
      return res.status(400).json({ message: "Cannot modify your own admin status" });
    }

    const updatedUser = await storage.toggleUserAdminStatus(validatedUserId);
    
    res.json({
      id: updatedUser.id,
      email: updatedUser.email,
      firstName: updatedUser.firstName,
      lastName: updatedUser.lastName,
      isAdmin: updatedUser.isAdmin,
      updatedAt: updatedUser.updatedAt
    });
  } catch (error) {
    console.error("Error toggling user admin status:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid user ID format", errors: error.errors });
    }
    if (error instanceof Error && error.message === 'User not found') {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(500).json({ message: "Failed to update user admin status" });
  }
});

router.delete('/users/:userId', requireAdmin, requireCSRFHeader, async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = (req as { userId: string }).userId;
    
    const userIdSchema = z.string().uuid();
    const validatedUserId = userIdSchema.parse(userId);

    if (validatedUserId === currentUserId) {
      return res.status(400).json({ message: "Cannot delete your own account" });
    }

    const deleted = await storage.deleteUser(validatedUserId);
    
    if (!deleted) {
      return res.status(404).json({ message: "User not found" });
    }
    
    res.json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("Error deleting user:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid user ID format", errors: error.errors });
    }
    res.status(500).json({ message: "Failed to delete user" });
  }
});

router.post('/users/:userId/reset-password', requireAdmin, requireCSRFHeader, async (req, res) => {
  try {
    const { userId } = req.params;
    
    const userIdSchema = z.string().uuid();
    const validatedUserId = userIdSchema.parse(userId);

    const tempPassword = randomBytes(12).toString('base64').replace(/[+/]/g, 'A').substring(0, 12);
    
    const updatedUser = await storage.resetUserPassword(validatedUserId, tempPassword);
    
    res.json({
      id: updatedUser.id,
      email: updatedUser.email,
      firstName: updatedUser.firstName,
      lastName: updatedUser.lastName,
      updatedAt: updatedUser.updatedAt,
      temporaryPassword: tempPassword
    });
  } catch (error) {
    console.error("Error resetting user password:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid user ID format", errors: error.errors });
    }
    if (error instanceof Error && error.message === 'User not found or failed to reset password') {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(500).json({ message: "Failed to reset user password" });
  }
});

router.get('/users/pending', requireAdmin, async (_req, res) => {
  try {
    const pendingUsers = await storage.getPendingUsers();
    
    const sanitizedUsers = pendingUsers.map(user => ({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      createdAt: user.createdAt,
      approvalStatus: user.approvalStatus
    }));

    res.json(sanitizedUsers);
  } catch (error) {
    console.error("Error fetching pending users:", error);
    res.status(500).json({ message: "Failed to fetch pending users" });
  }
});

router.get('/users/pending-count', requireAdmin, async (_req, res) => {
  try {
    const pendingCount = await storage.getPendingUsersCount();
    res.json({ count: pendingCount });
  } catch (error) {
    console.error("Error fetching pending users count:", error);
    res.status(500).json({ message: "Failed to fetch pending users count" });
  }
});

router.post('/users/:userId/approve', requireAdmin, requireCSRFHeader, async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = (req as { userId: string }).userId;
    
    const userIdSchema = z.string().uuid();
    const validatedUserId = userIdSchema.parse(userId);

    const approvedUser = await storage.approveUser(validatedUserId, currentUserId);
    
    res.json({
      id: approvedUser.id,
      email: approvedUser.email,
      firstName: approvedUser.firstName,
      lastName: approvedUser.lastName,
      approvalStatus: approvedUser.approvalStatus,
      approvedAt: approvedUser.approvedAt,
      approvedBy: approvedUser.approvedBy,
      updatedAt: approvedUser.updatedAt
    });
  } catch (error) {
    console.error("Error approving user:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid user ID format", errors: error.errors });
    }
    if (error instanceof Error && error.message === 'User not found or failed to approve user') {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(500).json({ message: "Failed to approve user" });
  }
});

router.post('/users/:userId/reject', requireAdmin, requireCSRFHeader, async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = (req as { userId: string }).userId;
    
    const userIdSchema = z.string().uuid();
    const validatedUserId = userIdSchema.parse(userId);

    const rejectedUser = await storage.rejectUser(validatedUserId, currentUserId);
    
    res.json({
      id: rejectedUser.id,
      email: rejectedUser.email,
      firstName: rejectedUser.firstName,
      lastName: rejectedUser.lastName,
      approvalStatus: rejectedUser.approvalStatus,
      approvedAt: rejectedUser.approvedAt,
      approvedBy: rejectedUser.approvedBy,
      updatedAt: rejectedUser.updatedAt
    });
  } catch (error) {
    console.error("Error rejecting user:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid user ID format", errors: error.errors });
    }
    if (error instanceof Error && error.message === 'User not found or failed to reject user') {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(500).json({ message: "Failed to reject user" });
  }
});

router.get('/prompts', requireAdmin, async (_req, res) => {
  try {
    const prompts = await storage.getAllPrompts();
    res.json(prompts);
  } catch (error) {
    console.error("Error fetching prompts:", error);
    res.status(500).json({ message: "Failed to fetch prompts" });
  }
});

router.get('/prompts/:agentId', requireAdmin, async (req, res) => {
  try {
    const { agentId } = req.params;
    const prompt = await storage.getPrompt(agentId);
    
    if (!prompt) {
      return res.status(404).json({ message: "Prompt not found" });
    }

    res.json(prompt);
  } catch (error) {
    console.error("Error fetching prompt:", error);
    res.status(500).json({ message: "Failed to fetch prompt" });
  }
});

router.put('/prompts/:agentId', requireAdmin, requireCSRFHeader, async (req, res) => {
  try {
    const { agentId } = req.params;
    const currentUserId = (req as { userId: string }).userId;
    const { prompt, name, description } = req.body;

    const promptSchema = z.object({
      prompt: z.string().min(1, "Prompt is required"),
      name: z.string().optional(),
      description: z.string().optional(),
    });
    
    const validated = promptSchema.parse({ prompt, name, description });

    const updatedPrompt = await storage.updatePrompt(
      agentId, 
      validated.prompt, 
      currentUserId,
      validated.name,
      validated.description
    );
    
    res.json(updatedPrompt);
  } catch (error) {
    console.error("Error updating prompt:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid prompt data", errors: error.errors });
    }
    if (error instanceof Error && error.message.includes('not found')) {
      return res.status(404).json({ message: error.message });
    }
    res.status(500).json({ message: "Failed to update prompt" });
  }
});

router.post('/prompts/:agentId/reset', requireAdmin, requireCSRFHeader, async (req, res) => {
  try {
    const { agentId } = req.params;
    const currentUserId = (req as { userId: string }).userId;

    const resetPrompt = await storage.resetPromptToDefault(agentId, currentUserId);
    
    res.json(resetPrompt);
  } catch (error) {
    console.error("Error resetting prompt:", error);
    if (error instanceof Error && error.message.includes('not found')) {
      return res.status(404).json({ message: error.message });
    }
    res.status(500).json({ message: "Failed to reset prompt" });
  }
});

router.post('/prompts/seed', requireAdmin, async (_req, res) => {
  try {
    await storage.seedPrompts();
    res.json({ message: "Prompts seeded successfully" });
  } catch (error) {
    console.error("Error seeding prompts:", error);
    res.status(500).json({ message: "Failed to seed prompts" });
  }
});

export default router;
