import { storage } from "../storage";
import { generateChatTitle as generateTitle, getChatThreadId, generateAssistantResponse, generateAssistantResponseStream } from "../gemini";
import type { AssistantId } from "@shared/schema";

export async function createChatWithFirstMessage(
  userId: string,
  assistantId: AssistantId,
  title?: string
): Promise<{ id: string; assistantId: AssistantId; title: string | null }> {
  const chat = await storage.createChat({
    userId,
    assistantId,
    title: title || null,
  });
  
  await storage.incrementUserChatCount(userId);
  
  return chat;
}

export function generateChatTitle(firstMessage: string): string {
  return generateTitle(firstMessage);
}

export async function addMessageToChat(
  chatId: string,
  role: "user" | "assistant",
  content: string
): Promise<{ id: string; chatId: string; role: string; content: string }> {
  return storage.createMessage({
    chatId,
    role,
    content,
  });
}

export async function generateAIResponse(
  chatId: string,
  userMessage: string,
  assistantId: AssistantId,
  userId: string
): Promise<{ content: string; threadId: string; tokens: number }> {
  const threadId = await getChatThreadId(chatId, userId);
  
  const response = await generateAssistantResponse({
    chatId,
    userMessage,
    assistantId,
    threadId: threadId || undefined,
  }, userId);

  return response;
}

export async function* generateAIResponseStream(
  chatId: string,
  userMessage: string,
  assistantId: AssistantId,
  userId: string
): AsyncGenerator<{ type: 'content' | 'done'; data: string | { content: string; threadId: string; tokens: number } }> {
  const threadId = await getChatThreadId(chatId, userId);
  
  for await (const chunk of generateAssistantResponseStream({
    chatId,
    userMessage,
    assistantId,
    threadId: threadId || undefined,
  }, userId)) {
    yield chunk;
  }
}

export async function updateChatTitleFromMessage(
  chatId: string,
  content: string,
  userId: string
): Promise<void> {
  const existingMessages = await storage.getChatMessages(chatId, userId);
  if (existingMessages.length === 1) {
    const title = generateChatTitle(content);
    await storage.updateChatTitle(chatId, title, userId);
  }
}

export async function recordMessageUsage(userId: string): Promise<void> {
  await Promise.all([
    storage.incrementUserMessageCount(userId),
    storage.incrementUserApiUsage(userId)
  ]);
}
