import { useState, useRef, useCallback, useEffect } from "react";
import { apiRequest } from "@/lib/queryClient";
import { getCachedAudio, setCachedAudio } from "@/lib/audioCache";

interface SpeechSynthesisOptions {
  lang?: string;
}

interface SpeechSynthesisHook {
  speak: (text: string, lang?: string) => void;
  pause: () => void;
  resume: () => void;
  cancel: () => void;
  isSpeaking: boolean;
  isPaused: boolean;
  isLoading: boolean;
  isSupported: boolean;
  voices: Array<{name: string, lang: string, id: string}>;
  selectedVoice: {name: string, lang: string, id: string} | null;
  setSelectedVoice: (voice: {name: string, lang: string, id: string} | null) => void;
}

export function useSpeechSynthesis(
  options: SpeechSynthesisOptions = {}
): SpeechSynthesisHook {
  const { lang = 'en-US' } = options;
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentLanguageRef = useRef<string>(lang);

  const isSupported = typeof window !== 'undefined';

  const voices = [
    { name: 'Alloy (Versatile)', lang: 'en-US', id: 'alloy' },
    { name: 'Echo (Male)', lang: 'en-US', id: 'echo' },
    { name: 'Fable (British)', lang: 'en-US', id: 'fable' },
    { name: 'Onyx (Deep)', lang: 'en-US', id: 'onyx' },
    { name: 'Nova (Warm)', lang: 'en-US', id: 'nova' },
    { name: 'Shimmer (Soft)', lang: 'en-US', id: 'shimmer' }
  ];

  const [selectedVoice, setSelectedVoice] = useState<{name: string, lang: string, id: string} | null>(
    voices[0]
  );
  
  const selectedVoiceRef = useRef(selectedVoice);
  
  useEffect(() => {
    selectedVoiceRef.current = selectedVoice;
  }, [selectedVoice]);

  useEffect(() => {
    currentLanguageRef.current = lang;
  }, [lang]);

  const cancel = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    setIsSpeaking(false);
    setIsPaused(false);
    setIsLoading(false);
  }, []);

  const speak = useCallback(async (text: string, targetLang?: string) => {
    if (!isSupported || !text.trim()) return;

    try {
      cancel();

      const language = targetLang || currentLanguageRef.current;
      const voiceId = selectedVoiceRef.current?.id || 'alloy';
      
      let audioUrl = getCachedAudio(text, language, voiceId);
      
      if (!audioUrl) {
        setIsLoading(true);
        
        const response = await apiRequest('POST', '/api/audio/speak', {
          text: text.trim(),
          language,
          voice: voiceId
        });

        if (!response.ok) {
          throw new Error('Failed to generate speech');
        }

        const audioBlob = await response.blob();
        audioUrl = URL.createObjectURL(audioBlob);
        
        setCachedAudio(text, language, voiceId, audioUrl);
        setIsLoading(false);
      }

      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      audio.onloadstart = () => setIsSpeaking(true);
      audio.onplay = () => {
        setIsSpeaking(true);
        setIsPaused(false);
      };
      audio.onpause = () => setIsPaused(true);
      audio.onended = () => {
        setIsSpeaking(false);
        setIsPaused(false);
        audioRef.current = null;
      };
      audio.onerror = (e) => {
        console.error('Audio playback error:', e);
        setIsSpeaking(false);
        setIsPaused(false);
        audioRef.current = null;
      };

      await audio.play();

    } catch (error) {
      console.error('Error in text-to-speech:', error);
      setIsSpeaking(false);
      setIsPaused(false);
      setIsLoading(false);
    }
  }, [isSupported, cancel]);

  const pause = useCallback(() => {
    if (audioRef.current && !audioRef.current.paused) {
      audioRef.current.pause();
      setIsPaused(true);
    }
  }, []);

  const resume = useCallback(() => {
    if (audioRef.current && audioRef.current.paused) {
      audioRef.current.play().catch(console.error);
      setIsPaused(false);
    }
  }, []);

  useEffect(() => {
    return () => {
      cancel();
    };
  }, [cancel]);

  return {
    speak,
    pause,
    resume,
    cancel,
    isSpeaking,
    isPaused,
    isLoading,
    isSupported,
    voices,
    selectedVoice,
    setSelectedVoice
  };
}
