import type { Express } from "express";
import { createServer, type Server } from "http";
import authRoutes from "./auth";
import userRoutes from "./users";
import chatRoutes from "./chats";
import apiKeyRoutes from "./apiKeys";
import audioRoutes from "./audio";
import publicRoutes from "./public";
import adminRoutes from "./admin";

export async function registerRoutes(app: Express): Promise<Server> {
  app.use('/api/auth', authRoutes);
  app.use('/api/user', userRoutes);
  app.use('/api/chats', chatRoutes);
  app.use('/api/api-keys', apiKeyRoutes);
  app.use('/api/audio', audioRoutes);
  app.use('/api/public', publicRoutes);
  app.use('/api/v1', publicRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/stats', userRoutes);

  app.use('/api/*', (_req, res) => {
    res.status(404).json({ message: "API endpoint not found" });
  });

  const httpServer = createServer(app);
  return httpServer;
}
