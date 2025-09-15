import { useState, useRef, useEffect } from "react";

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
  isSupported: boolean;
  voices: SpeechSynthesisVoice[];
  selectedVoice: SpeechSynthesisVoice | null;
  setSelectedVoice: (voice: SpeechSynthesisVoice | null) => void;
}

export function useSpeechSynthesis(options: SpeechSynthesisOptions = {}): SpeechSynthesisHook {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Check if browser supports speech synthesis
  const isSupported = typeof window !== 'undefined' && 
    'speechSynthesis' in window;

  // Function to select the best voice for a given language
  const selectBestVoice = (targetLang: string, availableVoices: SpeechSynthesisVoice[]) => {
    const langCode = targetLang.split('-')[0]; // e.g., 'en' from 'en-US'
    
    // Filter voices for the target language
    const languageVoices = availableVoices.filter(voice => 
      voice.lang.startsWith(langCode)
    );
    
    if (languageVoices.length === 0) {
      // Fallback to any available voice
      return availableVoices[0] || null;
    }
    
    // Define high-quality voice patterns (case-insensitive)
    const highQualityPatterns = [
      // Google voices
      /google.*neural/i,
      /google.*wavenet/i,
      /google.*studio/i,
      // Microsoft voices
      /microsoft.*neural/i,
      /microsoft.*natural/i,
      /aria/i, // Microsoft Aria
      /jenny/i, // Microsoft Jenny
      /davis/i, // Microsoft Davis
      /jane/i, // Microsoft Jane
      // Apple voices (macOS/iOS)
      /samantha/i, // Classic high-quality Apple voice
      /alex/i,
      /victoria/i,
      /daniel/i,
      /karen/i,
      /moira/i,
      /tessa/i,
      /veena/i,
      /yuri/i,
      // Amazon Polly
      /amazon.*neural/i,
      /amazon.*standard/i,
      // Other high-quality indicators
      /neural/i,
      /natural/i,
      /premium/i,
      /enhanced/i,
    ];
    
    // Score voices based on quality indicators
    const scoredVoices = languageVoices.map(voice => {
      let score = 0;
      const voiceName = voice.name.toLowerCase();
      const voiceUri = voice.voiceURI.toLowerCase();
      
      // Check for high-quality patterns
      highQualityPatterns.forEach(pattern => {
        if (pattern.test(voiceName) || pattern.test(voiceUri)) {
          score += 100;
        }
      });
      
      // Prefer local voices (usually higher quality)
      if (voice.localService) {
        score += 50;
      }
      
      // Prefer exact language match over language family match
      if (voice.lang === targetLang) {
        score += 25;
      } else if (voice.lang.startsWith(langCode + '-')) {
        score += 15;
      }
      
      // Prefer default voices
      if (voice.default) {
        score += 10;
      }
      
      // Bonus for common high-quality voice names
      if (voiceName.includes('premium') || voiceName.includes('plus')) {
        score += 20;
      }
      
      return { voice, score };
    });
    
    // Sort by score (highest first) and return the best voice
    scoredVoices.sort((a, b) => b.score - a.score);
    return scoredVoices[0]?.voice || languageVoices[0];
  };

  useEffect(() => {
    if (!isSupported) return;

    const loadVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      setVoices(availableVoices);
      
      // Select the best default voice for English
      if (availableVoices.length > 0 && !selectedVoice) {
        const bestVoice = selectBestVoice(options.lang || 'en-US', availableVoices);
        setSelectedVoice(bestVoice);
      }
    };

    // Load voices immediately if already available
    loadVoices();
    
    // Chrome and other browsers may load voices asynchronously
    const handleVoicesChanged = () => {
      loadVoices();
    };
    
    if (window.speechSynthesis.addEventListener) {
      window.speechSynthesis.addEventListener('voiceschanged', handleVoicesChanged);
    } else if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = handleVoicesChanged;
    }

    return () => {
      if (window.speechSynthesis.removeEventListener) {
        window.speechSynthesis.removeEventListener('voiceschanged', handleVoicesChanged);
      } else if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, [isSupported, options.lang]);

  const speak = (text: string, targetLang?: string) => {
    if (!isSupported) {
      console.warn('Speech synthesis is not supported in this browser');
      return;
    }

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    
    // Choose the best voice based on target language or use selected voice
    let voiceToUse = selectedVoice;
    
    if (targetLang && voices.length > 0) {
      // Use the enhanced voice selection for the target language
      voiceToUse = selectBestVoice(targetLang, voices);
    } else if (!voiceToUse && voices.length > 0) {
      // If no selected voice, use the best voice for the current language
      voiceToUse = selectBestVoice(options.lang || 'en-US', voices);
    }
    
    // Set voice if available
    if (voiceToUse) {
      utterance.voice = voiceToUse;
      console.log(`Using voice: ${voiceToUse.name} (${voiceToUse.lang}) - Local: ${voiceToUse.localService}`);
    }

    // Configure speech parameters for natural sounding speech
    utterance.rate = 0.9; // Slightly slower than default for clarity
    utterance.pitch = 1.0; // Neutral pitch
    utterance.volume = 0.8; // Slightly lower volume to avoid distortion

    // Event handlers
    utterance.onstart = () => {
      setIsSpeaking(true);
      setIsPaused(false);
    };

    utterance.onend = () => {
      setIsSpeaking(false);
      setIsPaused(false);
    };

    utterance.onerror = (event) => {
      console.error('Speech synthesis error:', event);
      setIsSpeaking(false);
      setIsPaused(false);
    };

    utterance.onpause = () => {
      setIsPaused(true);
    };

    utterance.onresume = () => {
      setIsPaused(false);
    };

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  };

  const pause = () => {
    if (!isSupported || !isSpeaking) return;
    window.speechSynthesis.pause();
  };

  const resume = () => {
    if (!isSupported || !isPaused) return;
    window.speechSynthesis.resume();
  };

  const cancel = () => {
    if (!isSupported) return;
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    setIsPaused(false);
  };

  return {
    speak,
    pause,
    resume,
    cancel,
    isSpeaking,
    isPaused,
    isSupported,
    voices,
    selectedVoice,
    setSelectedVoice
  };
}