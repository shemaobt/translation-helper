import OpenAI from "openai";
import type { Message } from "@shared/schema";

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || "your_openai_api_key"
});

export interface ChatCompletionRequest {
  messages: { role: "user" | "assistant" | "system"; content: string }[];
  temperature?: number;
  maxTokens?: number;
}

export interface ChatCompletionResponse {
  content: string;
  tokens: number;
}

export async function generateChatCompletion(
  request: ChatCompletionRequest
): Promise<ChatCompletionResponse> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5", // the newest OpenAI model is "gpt-5" which was released August 7, 2025
      messages: request.messages,
      temperature: request.temperature || 0.7,
      max_tokens: request.maxTokens || 1000,
    });

    const content = response.choices[0]?.message?.content || "";
    const tokens = response.usage?.total_tokens || 0;

    return {
      content,
      tokens,
    };
  } catch (error) {
    console.error("OpenAI API error:", error);
    throw new Error("Failed to generate AI response. Please try again.");
  }
}

export function formatMessagesForOpenAI(messages: Message[]): ChatCompletionRequest["messages"] {
  return messages.map(msg => ({
    role: msg.role as "user" | "assistant",
    content: msg.content,
  }));
}

export function generateChatTitle(firstMessage: string): string {
  // Generate a title from the first user message (max 50 chars)
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
