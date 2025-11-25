import { GoogleGenAI } from "@google/genai";
import type { Message } from "@shared/schema";
import { ASSISTANTS, type AssistantId } from "@shared/schema";
import { storage } from './storage';

const ai = new GoogleGenAI({
  apiKey: process.env.AI_INTEGRATIONS_GEMINI_API_KEY,
  httpOptions: {
    baseUrl: process.env.AI_INTEGRATIONS_GEMINI_BASE_URL,
  },
});

export interface AssistantRequest {
  chatId: string;
  userMessage: string;
  assistantId: AssistantId;
  threadId?: string;
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatCompletionRequest {
  chatId: string;
  messages: ChatMessage[];
  assistantId: AssistantId;
  threadId?: string;
}

export interface AssistantResponse {
  content: string;
  threadId: string;
  tokens: number;
}

export async function generateAssistantResponse(
  request: AssistantRequest,
  userId: string
): Promise<AssistantResponse> {
  try {
    const assistant = ASSISTANTS[request.assistantId];
    const chatHistory = await storage.getChatMessages(request.chatId, userId);
    
    const contents: { role: string; parts: { text: string }[] }[] = [];
    
    for (const msg of chatHistory) {
      contents.push({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }]
      });
    }
    
    contents.push({
      role: 'user',
      parts: [{ text: request.userMessage }]
    });

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents,
      config: {
        systemInstruction: assistant.systemPrompt,
      },
    });

    const content = response.text || "";
    
    return {
      content,
      threadId: request.chatId,
      tokens: 0,
    };
  } catch (error) {
    console.error("Gemini API error:", error);
    throw new Error("Failed to generate response. Please try again.");
  }
}

export async function* generateAssistantResponseStream(
  request: AssistantRequest,
  userId: string
): AsyncGenerator<{ type: 'content' | 'done', data: string | AssistantResponse }> {
  try {
    const assistant = ASSISTANTS[request.assistantId];
    const chatHistory = await storage.getChatMessages(request.chatId, userId);
    
    const contents: { role: string; parts: { text: string }[] }[] = [];
    
    for (const msg of chatHistory) {
      contents.push({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }]
      });
    }
    
    contents.push({
      role: 'user',
      parts: [{ text: request.userMessage }]
    });

    const response = await ai.models.generateContentStream({
      model: "gemini-2.5-flash",
      contents,
      config: {
        systemInstruction: assistant.systemPrompt,
      },
    });

    let fullContent = "";

    for await (const chunk of response) {
      const text = chunk.text || "";
      if (text) {
        fullContent += text;
        yield { type: 'content', data: text };
      }
    }

    yield { 
      type: 'done', 
      data: {
        content: fullContent,
        threadId: request.chatId,
        tokens: 0,
      } as AssistantResponse 
    };

  } catch (error) {
    console.error("Gemini API streaming error:", error);
    throw new Error("Failed to generate streaming response. Please try again.");
  }
}

export async function generateChatCompletion(
  request: ChatCompletionRequest,
  userId: string
): Promise<AssistantResponse> {
  try {
    const assistant = ASSISTANTS[request.assistantId];
    
    const systemMessages = request.messages.filter(msg => msg.role === "system");
    const conversationMessages = request.messages.filter(msg => msg.role !== "system");
    
    const systemInstruction = systemMessages.length > 0
      ? systemMessages.map(msg => msg.content).join("\n\n") + "\n\n" + assistant.systemPrompt
      : assistant.systemPrompt;
    
    const contents: { role: string; parts: { text: string }[] }[] = [];
    
    for (const msg of conversationMessages) {
      contents.push({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }]
      });
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents,
      config: {
        systemInstruction,
      },
    });

    const content = response.text || "";
    
    return {
      content,
      threadId: request.chatId,
      tokens: 0,
    };
  } catch (error) {
    console.error("Gemini API error:", error);
    throw new Error("Failed to generate response. Please try again.");
  }
}

export async function clearChatThread(chatId: string, userId: string): Promise<void> {
  await storage.updateChatThreadId(chatId, '', userId);
}

export async function getChatThreadId(chatId: string, userId: string): Promise<string | null> {
  return await storage.getChatThreadId(chatId, userId);
}

export function generateChatTitle(firstMessage: string): string {
  const title = firstMessage.trim();
  if (title.length <= 50) return title;
  
  const words = title.split(' ');
  let result = '';
  
  for (const word of words) {
    if ((result + ' ' + word).length > 47) break;
    result = result ? result + ' ' + word : word;
  }
  
  return result + '...';
}
