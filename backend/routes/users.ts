import { Router } from "express";
import multer from "multer";
import { storage } from "../storage";
import { config } from "../config";
import { requireAuth, requireCSRFHeader } from "../middleware";
import { uploadProfileImage, changePassword } from "../services/userService";

const router = Router();

const profileImageUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: config.upload.profileImageMaxSize,
  },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

router.post('/profile-image', requireAuth, profileImageUpload.single('image'), async (req, res) => {
  try {
    const userId = (req as { userId: string }).userId;
    const file = (req as { file?: Express.Multer.File }).file;
    
    if (!file) {
      return res.status(400).json({ message: "No image file provided" });
    }
    
    const profileImageUrl = await uploadProfileImage(userId, {
      mimetype: file.mimetype,
      buffer: file.buffer
    });
    
    res.json({ message: "Profile image updated successfully", profileImageUrl });
  } catch (error) {
    console.error("Profile image upload error:", error);
    res.status(500).json({ message: "Failed to upload profile image" });
  }
});

router.post('/change-password', requireAuth, requireCSRFHeader, async (req, res) => {
  try {
    const userId = (req as { userId: string }).userId;
    const { currentPassword, newPassword } = req.body;
    
    const result = await changePassword(userId, currentPassword, newPassword);
    
    if (!result.success) {
      const status = result.message === "User not found" ? 404 : 
                     result.message === "Current password is incorrect" ? 401 : 400;
      return res.status(status).json({ message: result.message });
    }
    
    res.json({ message: result.message });
  } catch (error) {
    console.error("Change password error:", error);
    res.status(500).json({ message: "Failed to change password" });
  }
});

router.get('/stats', requireAuth, async (req, res) => {
  try {
    const userId = (req as { userId: string }).userId;
    const stats = await storage.getUserStats(userId);
    res.json(stats);
  } catch (error) {
    console.error("Error fetching stats:", error);
    res.status(500).json({ message: "Failed to fetch stats" });
  }
});

export default router;
