import { Router } from "express";
import { storage } from "../storage";
import { requireAuth } from "../middleware";
import { insertChatSchema } from "@shared/schema";
import { clearChatThread, getChatThreadId, generateAssistantResponse, generateAssistantResponseStream, generateChatTitle } from "../gemini";
import type { AssistantId } from "@shared/schema";

const router = Router();

router.get('/', requireAuth, async (req, res) => {
  try {
    const userId = (req as { userId: string }).userId;
    const chats = await storage.getUserChats(userId);
    res.json(chats);
  } catch (error) {
    console.error("Error fetching chats:", error);
    res.status(500).json({ message: "Failed to fetch chats" });
  }
});

router.post('/', requireAuth, async (req, res) => {
  try {
    const userId = (req as { userId: string }).userId;
    const chatData = insertChatSchema.parse({ ...req.body, userId });
    const chat = await storage.createChat(chatData);
    
    await storage.incrementUserChatCount(userId);
    
    res.json(chat);
  } catch (error) {
    console.error("Error creating chat:", error);
    res.status(500).json({ message: "Failed to create chat" });
  }
});

router.get('/:chatId', requireAuth, async (req, res) => {
  try {
    const userId = (req as { userId: string }).userId;
    const { chatId } = req.params;
    const chat = await storage.getChat(chatId, userId);
    if (!chat) {
      return res.status(404).json({ message: "Chat not found" });
    }
    res.json(chat);
  } catch (error) {
    console.error("Error fetching chat:", error);
    res.status(500).json({ message: "Failed to fetch chat" });
  }
});

router.get('/:chatId/messages', requireAuth, async (req, res) => {
  try {
    const userId = (req as { userId: string }).userId;
    const { chatId } = req.params;
    const messages = await storage.getChatMessages(chatId, userId);
    res.json(messages);
  } catch (error) {
    console.error("Error fetching messages:", error);
    res.status(500).json({ message: "Failed to fetch messages" });
  }
});

router.post('/:chatId/messages', requireAuth, async (req, res) => {
  try {
    const userId = (req as { userId: string }).userId;
    const { chatId } = req.params;
    const { content } = req.body;

    const chat = await storage.getChat(chatId, userId);
    if (!chat) {
      return res.status(404).json({ message: "Chat not found" });
    }

    const userMessage = await storage.createMessage({
      chatId,
      role: "user",
      content,
    });

    const existingMessages = await storage.getChatMessages(chatId, userId);
    if (existingMessages.length === 1) {
      const title = generateChatTitle(content);
      await storage.updateChatTitle(chatId, title, userId);
    }

    const threadId = await getChatThreadId(chatId, userId);
    const aiResponse = await generateAssistantResponse({
      chatId,
      userMessage: content,
      assistantId: chat.assistantId as AssistantId,
      threadId: threadId || undefined,
    }, userId);

    const assistantMessage = await storage.createMessage({
      chatId,
      role: "assistant",
      content: aiResponse.content,
    });

    await Promise.all([
      storage.incrementUserMessageCount(userId),
      storage.incrementUserApiUsage(userId)
    ]);

    res.json({ 
      userMessage, 
      assistantMessage
    });
  } catch (error) {
    console.error("Error creating message:", error);
    res.status(500).json({ message: "Failed to create message" });
  }
});

router.post('/:chatId/messages/stream', requireAuth, async (req, res) => {
  try {
    const userId = (req as { userId: string }).userId;
    const { chatId } = req.params;
    const { content } = req.body;

    const chat = await storage.getChat(chatId, userId);
    if (!chat) {
      return res.status(404).json({ message: "Chat not found" });
    }

    const userMessage = await storage.createMessage({
      chatId,
      role: "user",
      content,
    });

    const existingMessages = await storage.getChatMessages(chatId, userId);
    if (existingMessages.length === 1) {
      const title = generateChatTitle(content);
      await storage.updateChatTitle(chatId, title, userId);
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    res.write(`data: ${JSON.stringify({ 
      type: 'user_message', 
      data: userMessage 
    })}\n\n`);

    try {
      const threadId = await getChatThreadId(chatId, userId);
      let assistantMessageId: string | null = null;
      let fullContent = "";

      for await (const chunk of generateAssistantResponseStream({
        chatId,
        userMessage: content,
        assistantId: chat.assistantId as AssistantId,
        threadId: threadId || undefined,
      }, userId)) {
        
        if (chunk.type === 'content') {
          fullContent += chunk.data;
          
          if (!assistantMessageId) {
            const assistantMessage = await storage.createMessage({
              chatId,
              role: "assistant",
              content: "",
            });
            assistantMessageId = assistantMessage.id;
            
            res.write(`data: ${JSON.stringify({ 
              type: 'assistant_message_start',
              data: assistantMessage
            })}\n\n`);
          }

          res.write(`data: ${JSON.stringify({ 
            type: 'content', 
            data: chunk.data 
          })}\n\n`);

        } else if (chunk.type === 'done') {
          if (assistantMessageId) {
            await storage.updateMessage(assistantMessageId, { content: fullContent });
          }

          await Promise.all([
            storage.incrementUserMessageCount(userId),
            storage.incrementUserApiUsage(userId)
          ]);

          res.write(`data: ${JSON.stringify({ 
            type: 'done', 
            data: chunk.data 
          })}\n\n`);
        }
      }
    } catch (streamError) {
      console.error("Error in streaming response:", streamError);
      res.write(`data: ${JSON.stringify({ 
        type: 'error', 
        data: { message: "Failed to generate streaming response" }
      })}\n\n`);
    }

    res.end();
  } catch (error) {
    console.error("Error in streaming endpoint:", error);
    res.status(500).json({ message: "Failed to create streaming message" });
  }
});

router.delete('/:chatId', requireAuth, async (req, res) => {
  try {
    const userId = (req as { userId: string }).userId;
    const { chatId } = req.params;
    await storage.deleteChat(chatId, userId);
    await clearChatThread(chatId, userId);
    res.json({ message: "Chat deleted successfully" });
  } catch (error) {
    console.error("Error deleting chat:", error);
    res.status(500).json({ message: "Failed to delete chat" });
  }
});

router.patch('/:chatId', requireAuth, async (req, res) => {
  try {
    const userId = (req as { userId: string }).userId;
    const { chatId } = req.params;
    
    const updateChatSchema = insertChatSchema.pick({ assistantId: true, title: true }).partial();
    const updates = updateChatSchema.parse(req.body);
    
    const existingChat = await storage.getChat(chatId, userId);
    if (!existingChat) {
      return res.status(404).json({ message: "Chat not found" });
    }
    
    const updatedChat = await storage.updateChat(chatId, updates, userId);
    res.json(updatedChat);
  } catch (error) {
    console.error("Error updating chat:", error);
    res.status(500).json({ message: "Failed to update chat" });
  }
});

export default router;
