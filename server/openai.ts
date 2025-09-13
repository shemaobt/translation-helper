import OpenAI from "openai";
import type { Message } from "@shared/schema";
import { ASSISTANTS, type AssistantId } from "@shared/schema";

const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || "your_openai_api_key"
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

// Store thread IDs for chat sessions
const chatThreadMap = new Map<string, string>();

export async function generateAssistantResponse(
  request: AssistantRequest
): Promise<AssistantResponse> {
  try {
    let threadId = request.threadId || chatThreadMap.get(request.chatId);
    
    // Create a new thread if none exists
    if (!threadId) {
      const thread = await openai.beta.threads.create();
      threadId = thread.id;
      chatThreadMap.set(request.chatId, threadId);
    }

    // Add the user message to the thread
    await openai.beta.threads.messages.create(threadId, {
      role: "user",
      content: request.userMessage,
    });

    // Run the assistant
    const run = await openai.beta.threads.runs.create(threadId, {
      assistant_id: ASSISTANTS[request.assistantId].openaiId,
    });

    // Wait for the run to complete
    let runStatus = await openai.beta.threads.runs.retrieve(run.id, {
      thread_id: threadId,
    });
    
    while (runStatus.status === "in_progress" || runStatus.status === "queued") {
      await new Promise(resolve => setTimeout(resolve, 1000));
      runStatus = await openai.beta.threads.runs.retrieve(run.id, {
        thread_id: threadId,
      });
    }

    if (runStatus.status === "failed") {
      throw new Error("Assistant run failed");
    }

    // Get the assistant's response
    const messages = await openai.beta.threads.messages.list(threadId);
    const lastMessage = messages.data[0];
    
    if (!lastMessage || lastMessage.role !== "assistant") {
      throw new Error("No assistant response found");
    }

    const content = lastMessage.content
      .filter(block => block.type === "text")
      .map(block => (block as any).text.value)
      .join("\n");

    return {
      content,
      threadId,
      tokens: runStatus.usage?.total_tokens || 0,
    };
  } catch (error) {
    console.error("OpenAI Assistant API error:", error);
    throw new Error("Failed to generate response from StoryTeller assistant. Please try again.");
  }
}

export async function generateChatCompletion(
  request: ChatCompletionRequest
): Promise<AssistantResponse> {
  try {
    let threadId = request.threadId || chatThreadMap.get(request.chatId);
    
    // Create a new thread if none exists
    if (!threadId) {
      const thread = await openai.beta.threads.create();
      threadId = thread.id;
      chatThreadMap.set(request.chatId, threadId);
    }

    // Extract system messages for run instructions
    const systemMessages = request.messages.filter(msg => msg.role === "system");
    const conversationMessages = request.messages.filter(msg => msg.role !== "system");

    // Add all conversation messages to the thread in order
    for (const message of conversationMessages) {
      await openai.beta.threads.messages.create(threadId, {
        role: message.role as "user" | "assistant",
        content: message.content,
      });
    }

    // Create run with system messages as additional instructions
    const runConfig: any = {
      assistant_id: ASSISTANTS[request.assistantId].openaiId,
    };

    if (systemMessages.length > 0) {
      const systemInstructions = systemMessages.map(msg => msg.content).join("\n\n");
      runConfig.additional_instructions = systemInstructions;
    }

    const run = await openai.beta.threads.runs.create(threadId, runConfig);

    // Wait for the run to complete
    let runStatus = await openai.beta.threads.runs.retrieve(run.id, {
      thread_id: threadId,
    });
    
    while (runStatus.status === "in_progress" || runStatus.status === "queued") {
      await new Promise(resolve => setTimeout(resolve, 1000));
      runStatus = await openai.beta.threads.runs.retrieve(run.id, {
        thread_id: threadId,
      });
    }

    if (runStatus.status === "failed") {
      throw new Error("Assistant run failed");
    }

    // Get the assistant's response
    const messages = await openai.beta.threads.messages.list(threadId);
    const lastMessage = messages.data[0];
    
    if (!lastMessage || lastMessage.role !== "assistant") {
      throw new Error("No assistant response found");
    }

    const content = lastMessage.content
      .filter(block => block.type === "text")
      .map(block => (block as any).text.value)
      .join("\n");

    return {
      content,
      threadId,
      tokens: runStatus.usage?.total_tokens || 0,
    };
  } catch (error) {
    console.error("OpenAI Assistant API error:", error);
    throw new Error("Failed to generate response from StoryTeller assistant. Please try again.");
  }
}

export function clearChatThread(chatId: string): void {
  chatThreadMap.delete(chatId);
}

export function getChatThreadId(chatId: string): string | undefined {
  return chatThreadMap.get(chatId);
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
