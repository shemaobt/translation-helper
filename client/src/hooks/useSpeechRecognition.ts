import { useState, useEffect, useRef } from "react";

interface SpeechRecognitionOptions {
  lang?: string;
}

interface SpeechRecognitionHook {
  transcript: string;
  interimTranscript: string;
  isListening: boolean;
  startListening: () => void;
  stopListening: () => void;
  resetTranscript: () => void;
  isSupported: boolean;
  lastError: string | null;
  permissionDenied: boolean;
}

// Define the Web Speech API types
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

export function useSpeechRecognition(options: SpeechRecognitionOptions = {}): SpeechRecognitionHook {
  const { lang = 'en-US' } = options;
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const recognitionRef = useRef<any>(null);
  const shouldContinueRef = useRef(false);

  // Check if browser supports Web Speech API
  const isSupported = typeof window !== 'undefined' && 
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  useEffect(() => {
    if (!isSupported) return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.lang = lang;

    recognition.onstart = () => {
      setIsListening(true);
      setLastError(null);
    };

    recognition.onend = () => {
      setIsListening(false);
      // Auto-restart if user still wants to continue
      if (shouldContinueRef.current) {
        setTimeout(() => {
          if (shouldContinueRef.current && recognitionRef.current) {
            try {
              recognition.start();
            } catch (e) {
              console.error('Failed to restart recognition:', e);
              setLastError('Failed to restart recording');
            }
          }
        }, 100);
      }
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
      setLastError(event.error);
      
      // Handle permission denied
      if (event.error === 'not-allowed') {
        setPermissionDenied(true);
        shouldContinueRef.current = false;
        return;
      }
      
      // Auto-restart for benign errors
      const benignErrors = ['no-speech', 'audio-capture', 'network'];
      if (benignErrors.includes(event.error) && shouldContinueRef.current) {
        setTimeout(() => {
          if (shouldContinueRef.current && recognitionRef.current) {
            try {
              recognition.start();
            } catch (e) {
              console.error('Failed to restart recognition:', e);
              setLastError('Failed to restart recording');
            }
          }
        }, 500);
      }
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = '';
      let interim = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcriptText = result[0].transcript;

        if (result.isFinal) {
          finalTranscript += transcriptText + ' ';
        } else {
          interim += transcriptText;
        }
      }

      if (finalTranscript) {
        setTranscript(prev => prev + finalTranscript);
      }
      setInterimTranscript(interim);
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [isSupported, lang]); // Remove isListening from dependencies!

  const startListening = () => {
    if (!isSupported || !recognitionRef.current || isListening) return;
    
    setPermissionDenied(false);
    setLastError(null);
    shouldContinueRef.current = true;
    
    try {
      recognitionRef.current.start();
    } catch (error) {
      console.error('Failed to start speech recognition:', error);
      setLastError('Failed to start recording');
    }
  };

  const stopListening = () => {
    if (!recognitionRef.current) return;
    
    shouldContinueRef.current = false;
    
    try {
      recognitionRef.current.stop();
    } catch (error) {
      console.error('Failed to stop speech recognition:', error);
      setLastError('Failed to stop recording');
    }
  };

  const resetTranscript = () => {
    setTranscript("");
    setInterimTranscript("");
  };

  return {
    transcript,
    interimTranscript,
    isListening,
    startListening,
    stopListening,
    resetTranscript,
    isSupported,
    lastError,
    permissionDenied
  };
}