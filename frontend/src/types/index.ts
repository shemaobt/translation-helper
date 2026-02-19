export type {
  User,
  Chat,
  Message,
  ApiKey,
  ApiUsage,
  Feedback,
  AgentPrompt,
  AssistantId,
} from "@shared/schema";

export interface ApiError extends Error {
  status?: number;
  code?: string;
}

export interface QueryError {
  message: string;
  status?: number;
}

export interface LoginError {
  message: string;
  approvalStatus?: "pending" | "approved" | "rejected";
}

export interface UserWithStats {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  isAdmin: boolean;
  profileImageUrl?: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
  lastLoginAt: string | Date | null;
  approvalStatus?: "pending" | "approved" | "rejected" | null;
  approvedAt?: string | Date | null;
  approvedBy?: string | null;
  stats: {
    totalChats: number;
    totalMessages: number;
    totalApiKeys: number;
    totalApiCalls: number;
  };
}

export interface CountResponse {
  count: number;
}

export type SortValue = string | number | Date;

export interface Voice {
  name: string;
  lang: string;
  id: string;
}

export interface SpeechSynthesisHook {
  speak: (text: string, lang?: string) => void;
  pause: () => void;
  resume: () => void;
  cancel: () => void;
  isSpeaking: boolean;
  isPaused: boolean;
  isLoading: boolean;
  isSupported: boolean;
  voices: Voice[];
  selectedVoice: Voice | null;
  setSelectedVoice: (voice: Voice | null) => void;
}
