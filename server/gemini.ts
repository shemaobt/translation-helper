import { GoogleGenerativeAI } from "@google/generative-ai";
import { TextToSpeechClient } from "@google-cloud/text-to-speech";
import type { Message } from "@shared/schema";
import { ASSISTANTS, type AssistantId } from "@shared/schema";

const genAI = new GoogleGenerativeAI(
  process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY || "your_google_api_key"
);

// Initialize Google Cloud Text-to-Speech client
const ttsClient = new TextToSpeechClient();

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
import { getDefaultPrompt, type AgentPromptId } from './prompts';

/**
 * Get the system instruction for an assistant.
 * First tries to load from database, falls back to file-based defaults.
 */
async function getSystemInstruction(assistantId: AssistantId): Promise<string> {
  try {
    // Try to get from database first
    const dbPrompt = await storage.getPrompt(assistantId);
    if (dbPrompt?.prompt) {
      return dbPrompt.prompt;
    }
  } catch (error) {
    console.warn(`Failed to load prompt from DB for ${assistantId}, using default:`, error);
  }
  
  // Fall back to file-based default or schema default
  try {
    return getDefaultPrompt(assistantId as AgentPromptId);
  } catch {
    // Final fallback to schema
    const assistantConfig = ASSISTANTS[assistantId];
    return assistantConfig.systemPrompt || 
      "You are a helpful AI assistant specializing in translation and language support.";
  }
}

/**
 * Generate assistant response using Gemini 2.0 Flash (cheap and fast)
 */
export async function generateAssistantResponse(
  request: AssistantRequest,
  userId: string
): Promise<AssistantResponse> {
  try {
    let threadId = request.threadId || await storage.getChatThreadId(request.chatId, userId);
    
    // Create a new thread ID if none exists
    if (!threadId) {
      threadId = `thread_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      await storage.updateChatThreadId(request.chatId, threadId, userId);
    }

    // Get chat history from database
    const chatHistory = await storage.getChatMessages(request.chatId, userId);
    
    // Build conversation history for Gemini
    const history = chatHistory
      .filter(msg => msg.role !== 'system')
      .map(msg => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }],
      }));

    // Get assistant instructions from database or defaults
    const systemInstruction = await getSystemInstruction(request.assistantId);

    // Use Gemini 2.0 Flash for cost optimization
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash-exp",
      systemInstruction,
    });

    const chat = model.startChat({
      history,
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 8192,
      },
    });

    const result = await chat.sendMessage(request.userMessage);
    const response = result.response;
    const content = response.text();

    // Estimate token usage (Gemini doesn't provide exact counts in streaming)
    const estimatedTokens = Math.ceil(
      (request.userMessage.length + content.length) / 4
    );

    return {
      content,
      threadId,
      tokens: estimatedTokens,
    };
  } catch (error) {
    console.error("Gemini API error:", error);
    throw new Error("Failed to generate response from AI assistant. Please try again.");
  }
}

/**
 * Stream assistant response using Gemini (for real-time responses)
 */
export async function* generateAssistantResponseStream(
  request: AssistantRequest,
  userId: string
): AsyncGenerator<{ type: 'content' | 'done', data: string | AssistantResponse }> {
  try {
    let threadId = request.threadId || await storage.getChatThreadId(request.chatId, userId);
    
    // Create a new thread ID if none exists
    if (!threadId) {
      threadId = `thread_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      await storage.updateChatThreadId(request.chatId, threadId, userId);
    }

    // Get chat history from database
    const chatHistory = await storage.getChatMessages(request.chatId, userId);
    
    // Build conversation history for Gemini
    const history = chatHistory
      .filter(msg => msg.role !== 'system')
      .map(msg => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }],
      }));

    // Get assistant instructions from database or defaults
    const systemInstruction = await getSystemInstruction(request.assistantId);

    // Use Gemini 2.0 Flash for cost optimization
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash-exp",
      systemInstruction,
    });

    const chat = model.startChat({
      history,
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 8192,
      },
    });

    const result = await chat.sendMessageStream(request.userMessage);
    
    let fullContent = "";

    for await (const chunk of result.stream) {
      const chunkText = chunk.text();
      if (chunkText) {
        fullContent += chunkText;
        yield { type: 'content', data: chunkText };
      }
    }

    // Estimate token usage
    const estimatedTokens = Math.ceil(
      (request.userMessage.length + fullContent.length) / 4
    );

    // Return final response
    yield { 
      type: 'done', 
      data: {
        content: fullContent,
        threadId,
        tokens: estimatedTokens,
      } as AssistantResponse 
    };

  } catch (error) {
    console.error("Gemini streaming error:", error);
    throw new Error("Failed to generate streaming response from AI assistant. Please try again.");
  }
}

/**
 * Generate chat completion with full message history
 */
export async function generateChatCompletion(
  request: ChatCompletionRequest,
  userId: string
): Promise<AssistantResponse> {
  try {
    let threadId = request.threadId || await storage.getChatThreadId(request.chatId, userId);
    
    // Create a new thread ID if none exists
    if (!threadId) {
      threadId = `thread_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      await storage.updateChatThreadId(request.chatId, threadId, userId);
    }

    // Extract system messages and conversation messages
    const systemMessages = request.messages.filter(msg => msg.role === "system");
    const conversationMessages = request.messages.filter(msg => msg.role !== "system");

    // Build system instruction - use provided system messages or load from database
    const systemInstruction = systemMessages.length > 0
      ? systemMessages.map(msg => msg.content).join("\n\n")
      : await getSystemInstruction(request.assistantId);

    // Build conversation history
    const history = conversationMessages.slice(0, -1).map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }],
    }));

    // Use Gemini 2.0 Flash
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash-exp",
      systemInstruction,
    });

    const chat = model.startChat({
      history,
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 8192,
      },
    });

    // Send the last message
    const lastMessage = conversationMessages[conversationMessages.length - 1];
    const result = await chat.sendMessage(lastMessage.content);
    const response = result.response;
    const content = response.text();

    // Estimate token usage
    const totalMessageLength = conversationMessages.reduce(
      (sum, msg) => sum + msg.content.length, 0
    );
    const estimatedTokens = Math.ceil((totalMessageLength + content.length) / 4);

    return {
      content,
      threadId,
      tokens: estimatedTokens,
    };
  } catch (error) {
    console.error("Gemini chat completion error:", error);
    throw new Error("Failed to generate response from AI assistant. Please try again.");
  }
}

export async function clearChatThread(chatId: string, userId: string): Promise<void> {
  await storage.updateChatThreadId(chatId, '', userId);
}

export async function getChatThreadId(chatId: string, userId: string): Promise<string | null> {
  return await storage.getChatThreadId(chatId, userId);
}

/**
 * Transcribe audio using Gemini's multimodal capabilities
 */
export async function transcribeAudio(audioBuffer: Buffer, filename: string): Promise<string> {
  try {
    // Use Gemini 2.0 Flash for audio transcription
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

    // Convert buffer to base64
    const base64Audio = audioBuffer.toString('base64');
    
    // Determine MIME type from filename
    const mimeType = filename.endsWith('.mp3') ? 'audio/mp3' :
                    filename.endsWith('.wav') ? 'audio/wav' :
                    filename.endsWith('.m4a') ? 'audio/mp4' :
                    filename.endsWith('.webm') ? 'audio/webm' :
                    'audio/mpeg';

    const result = await model.generateContent([
      {
        inlineData: {
          mimeType,
          data: base64Audio,
        },
      },
      { text: "Transcribe this audio file. Provide only the transcribed text without any additional commentary." },
    ]);

    const response = result.response;
    return response.text();
  } catch (error) {
    console.error("Error transcribing audio with Gemini:", error);
    throw new Error("Failed to transcribe audio");
  }
}

/**
 * Generate speech using Google Cloud TTS
 */
export async function generateSpeech(text: string, language = 'en-US', voiceId?: string): Promise<Buffer> {
  try {
    // Map language codes to Google Cloud TTS voice names
    const voiceMap: Record<string, { languageCode: string; name: string; ssmlGender: string }> = {
      'en-US': { languageCode: 'en-US', name: 'en-US-Neural2-A', ssmlGender: 'FEMALE' },
      'en-GB': { languageCode: 'en-GB', name: 'en-GB-Neural2-A', ssmlGender: 'FEMALE' },
      'es-ES': { languageCode: 'es-ES', name: 'es-ES-Neural2-A', ssmlGender: 'FEMALE' },
      'es-MX': { languageCode: 'es-US', name: 'es-US-Neural2-A', ssmlGender: 'FEMALE' },
      'fr-FR': { languageCode: 'fr-FR', name: 'fr-FR-Neural2-A', ssmlGender: 'FEMALE' },
      'de-DE': { languageCode: 'de-DE', name: 'de-DE-Neural2-A', ssmlGender: 'FEMALE' },
      'it-IT': { languageCode: 'it-IT', name: 'it-IT-Neural2-A', ssmlGender: 'FEMALE' },
      'pt-BR': { languageCode: 'pt-BR', name: 'pt-BR-Neural2-A', ssmlGender: 'FEMALE' },
      'ja-JP': { languageCode: 'ja-JP', name: 'ja-JP-Neural2-B', ssmlGender: 'FEMALE' },
      'ko-KR': { languageCode: 'ko-KR', name: 'ko-KR-Neural2-A', ssmlGender: 'FEMALE' },
      'zh-CN': { languageCode: 'cmn-CN', name: 'cmn-CN-Wavenet-A', ssmlGender: 'FEMALE' },
      'hi-IN': { languageCode: 'hi-IN', name: 'hi-IN-Neural2-A', ssmlGender: 'FEMALE' },
      'ar-SA': { languageCode: 'ar-XA', name: 'ar-XA-Wavenet-A', ssmlGender: 'FEMALE' },
      'ru-RU': { languageCode: 'ru-RU', name: 'ru-RU-Wavenet-A', ssmlGender: 'FEMALE' },
      'nl-NL': { languageCode: 'nl-NL', name: 'nl-NL-Wavenet-A', ssmlGender: 'FEMALE' },
      'sv-SE': { languageCode: 'sv-SE', name: 'sv-SE-Wavenet-A', ssmlGender: 'FEMALE' },
      'da-DK': { languageCode: 'da-DK', name: 'da-DK-Wavenet-A', ssmlGender: 'FEMALE' },
    };

    const voice = voiceMap[language] || voiceMap['en-US'];

    const [response] = await ttsClient.synthesizeSpeech({
      input: { text },
      voice: {
        languageCode: voice.languageCode,
        name: voice.name,
        ssmlGender: voice.ssmlGender as any,
      },
      audioConfig: {
        audioEncoding: 'MP3' as any,
        speakingRate: 1.0,
        pitch: 0,
      },
    });

    if (!response.audioContent) {
      throw new Error("No audio content generated");
    }

    return Buffer.from(response.audioContent as Uint8Array);
  } catch (error) {
    console.error("Error generating speech with Google Cloud TTS:", error);
    throw new Error("Failed to generate speech");
  }
}

/**
 * Translate text using Gemini
 */
export async function translateText(
  text: string,
  fromLanguage: string,
  toLanguage: string,
  context?: string
): Promise<string> {
  try {
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.0-flash-exp",
      systemInstruction: "You are a professional translator. Provide only the translated text without explanations."
    });

    const prompt = context
      ? `Translate the following text from ${fromLanguage} to ${toLanguage}.\nContext: ${context}\n\nText: ${text}`
      : `Translate the following text from ${fromLanguage} to ${toLanguage}:\n\n${text}`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    return response.text();
  } catch (error) {
    console.error("Error translating text with Gemini:", error);
    throw new Error("Failed to translate text");
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

