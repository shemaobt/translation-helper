import { useState, useRef, useCallback } from "react";
import { apiRequest } from "@/lib/queryClient";

interface OpenAISpeechRecognitionOptions {
  lang?: string;
}

interface OpenAISpeechRecognitionHook {
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

export function useOpenAISpeechRecognition(
  options: OpenAISpeechRecognitionOptions = {}
): OpenAISpeechRecognitionHook {
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const isProcessingRef = useRef(false);

  // Check if browser supports MediaRecorder (universal support)
  const isSupported = typeof window !== 'undefined' && 
    'MediaRecorder' in window && 
    'navigator' in window && 
    'mediaDevices' in navigator;

  const processAudioChunk = useCallback(async (audioBlob: Blob, mimeType: string) => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;

    try {
      // Determine correct file extension based on MIME type for Whisper
      let extension = 'webm';
      if (mimeType.includes('wav')) extension = 'wav';
      else if (mimeType.includes('mp4')) extension = 'mp4';
      else if (mimeType.includes('ogg')) extension = 'ogg';  
      else if (mimeType.includes('webm')) extension = 'webm';


      const formData = new FormData();
      formData.append('audio', audioBlob, `audio.${extension}`);

      const response = await apiRequest('POST', '/api/audio/transcribe', formData);
      const data = await response.json();
      
      if (data.text && data.text.trim()) {
        const newText = data.text.trim();
        setTranscript(prev => {
          const combined = prev ? `${prev} ${newText}` : newText;
          return combined;
        });
      }
      
      setLastError(null);
    } catch (error) {
      console.error('Error transcribing audio:', error);
      setLastError('Failed to transcribe audio');
    } finally {
      isProcessingRef.current = false;
    }
  }, []);

  const startListening = useCallback(async () => {
    if (!isSupported || isListening) return;

    try {
      setLastError(null);
      setPermissionDenied(false);
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        } 
      });
      
      streamRef.current = stream;
      chunksRef.current = [];

      // Determine the best audio format for Whisper compatibility
      const mimeTypes = [
        'audio/wav',
        'audio/mp4', 
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/ogg;codecs=opus'
      ];

      let selectedMimeType = '';
      for (const mimeType of mimeTypes) {
        if (MediaRecorder.isTypeSupported(mimeType)) {
          selectedMimeType = mimeType;
          break;
        }
      }

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: selectedMimeType || undefined,
        audioBitsPerSecond: 64000, // Good quality for speech
      });

      mediaRecorderRef.current = mediaRecorder;

      // Store audio data for processing when recording ends

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstart = () => {
        setIsListening(true);
        setInterimTranscript("Listening...");
      };

      mediaRecorder.onstop = () => {
        setIsListening(false);
        setInterimTranscript("");
        
        // Process the complete recording
        if (chunksRef.current.length > 0) {
          const audioBlob = new Blob(chunksRef.current, { type: selectedMimeType });
          if (audioBlob.size > 1000) {
            processAudioChunk(audioBlob, selectedMimeType);
          }
        }

        // Cleanup
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
      };

      mediaRecorder.onerror = (event: any) => {
        console.error('MediaRecorder error:', event.error);
        setLastError(event.error?.message || 'Recording failed');
        setIsListening(false);
      };

      // Start recording
      mediaRecorder.start(); // Collect data when stopped

    } catch (error: any) {
      console.error('Error starting recording:', error);
      
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        setPermissionDenied(true);
        setLastError('Microphone permission denied');
      } else if (error.name === 'NotFoundError') {
        setLastError('No microphone found');
      } else {
        setLastError('Failed to start recording');
      }
    }
  }, [isSupported, isListening, processAudioChunk]);

  const stopListening = useCallback(() => {
    if (mediaRecorderRef.current && isListening) {
      mediaRecorderRef.current.stop();
    }
  }, [isListening]);

  const resetTranscript = useCallback(() => {
    setTranscript("");
    setInterimTranscript("");
    setLastError(null);
  }, []);

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