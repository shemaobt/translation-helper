import { Router } from "express";
import { randomBytes } from "crypto";
import { storage } from "../storage";
import { requireAuth } from "../middleware";
import { insertApiKeySchema } from "@shared/schema";

const router = Router();

router.get('/', requireAuth, async (req, res) => {
  try {
    const userId = (req as { userId: string }).userId;
    const apiKeys = await storage.getUserApiKeys(userId);
    
    const safeApiKeys = apiKeys.map(key => ({
      ...key,
      keyHash: undefined,
      maskedKey: `ak_${key.prefix}...***`,
    }));
    
    res.json(safeApiKeys);
  } catch (error) {
    console.error("Error fetching API keys:", error);
    res.status(500).json({ message: "Failed to fetch API keys" });
  }
});

router.post('/', requireAuth, async (req, res) => {
  try {
    const userId = (req as { userId: string }).userId;
    const { name } = insertApiKeySchema.parse({ ...req.body, userId });
    
    const key = `ak_${randomBytes(16).toString('hex')}`;
    
    const apiKey = await storage.createApiKey({
      userId,
      name,
      key,
      isActive: true,
    });

    res.json({
      ...apiKey,
      key,
      keyHash: undefined,
    });
  } catch (error) {
    console.error("Error creating API key:", error);
    res.status(500).json({ message: "Failed to create API key" });
  }
});

router.delete('/:keyId', requireAuth, async (req, res) => {
  try {
    const userId = (req as { userId: string }).userId;
    const { keyId } = req.params;
    await storage.deleteApiKey(keyId, userId);
    res.json({ message: "API key deleted successfully" });
  } catch (error) {
    console.error("Error deleting API key:", error);
    res.status(500).json({ message: "Failed to delete API key" });
  }
});

export default router;
