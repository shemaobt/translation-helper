import OpenAI, { toFile } from "openai";
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

// Thread ID persistence moved to database for durability across restarts
import { storage } from './storage';

export async function generateAssistantResponse(
  request: AssistantRequest,
  userId: string
): Promise<AssistantResponse> {
  try {
    let threadId = request.threadId || await storage.getChatThreadId(request.chatId, userId);
    
    // Create a new thread if none exists
    if (!threadId) {
      const thread = await openai.beta.threads.create();
      threadId = thread.id;
      await storage.updateChatThreadId(request.chatId, threadId, userId);
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
  request: ChatCompletionRequest,
  userId: string
): Promise<AssistantResponse> {
  try {
    let threadId = request.threadId || await storage.getChatThreadId(request.chatId, userId);
    
    // Create a new thread if none exists
    if (!threadId) {
      const thread = await openai.beta.threads.create();
      threadId = thread.id;
      await storage.updateChatThreadId(request.chatId, threadId, userId);
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

export async function clearChatThread(chatId: string, userId: string): Promise<void> {
  await storage.updateChatThreadId(chatId, '', userId);
}

export async function getChatThreadId(chatId: string, userId: string): Promise<string | null> {
  return await storage.getChatThreadId(chatId, userId);
}

// Audio processing functions for Whisper and TTS
export async function transcribeAudio(audioBuffer: Buffer, filename: string): Promise<string> {
  try {
    const transcription = await openai.audio.transcriptions.create({
      file: await toFile(audioBuffer, filename),
      model: "whisper-1",
      language: undefined, // Let Whisper auto-detect language
      response_format: "text"
    });
    
    return transcription;
  } catch (error) {
    console.error("Error transcribing audio:", error);
    throw new Error("Failed to transcribe audio");
  }
}

export async function generateSpeech(text: string, language = 'en-US'): Promise<Buffer> {
  try {
    // Map languages to appropriate voices
    const voiceMap: Record<string, string> = {
      'en-US': 'alloy',
      'en-GB': 'alloy', 
      'es-ES': 'nova',
      'es-MX': 'nova',
      'fr-FR': 'shimmer',
      'de-DE': 'echo',
      'it-IT': 'fable',
      'pt-BR': 'onyx',
      'ja-JP': 'alloy',
      'ko-KR': 'alloy',
      'zh-CN': 'alloy',
      'hi-IN': 'alloy',
      'ar-SA': 'alloy',
      'ru-RU': 'echo',
      'nl-NL': 'alloy',
      'sv-SE': 'alloy',
      'da-DK': 'alloy'
    };

    const voice = voiceMap[language] || 'alloy';
    
    const speech = await openai.audio.speech.create({
      model: "tts-1",
      voice: voice as any,
      input: text,
      response_format: "mp3",
      speed: 0.9 // Slightly slower for better clarity
    });

    const buffer = Buffer.from(await speech.arrayBuffer());
    return buffer;
  } catch (error) {
    console.error("Error generating speech:", error);
    throw new Error("Failed to generate speech");
  }
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
