/**
 * useSpeechRecognition Hook
 *
 * Wrapper around the Web Speech API for real-time speech-to-text transcription.
 * Handles browser compatibility and provides interim/final results.
 */

import { useState, useEffect, useRef, useCallback } from 'react';

// Check for browser support
const SpeechRecognition = typeof window !== 'undefined' &&
  (window.SpeechRecognition || window.webkitSpeechRecognition);

export function useSpeechRecognition() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState(null);
  const [isSupported, setIsSupported] = useState(false);

  const recognitionRef = useRef(null);
  const finalTranscriptRef = useRef('');

  useEffect(() => {
    setIsSupported(!!SpeechRecognition);
  }, []);

  const startListening = useCallback(() => {
    if (!SpeechRecognition) {
      setError('Speech recognition is not supported in this browser');
      return;
    }

    setError(null);
    setTranscript('');
    setInterimTranscript('');
    finalTranscriptRef.current = '';

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event) => {
      let interim = '';
      let final = finalTranscriptRef.current;

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const text = result[0].transcript;

        if (result.isFinal) {
          final += text + ' ';
          finalTranscriptRef.current = final;
        } else {
          interim += text;
        }
      }

      setTranscript(final.trim());
      setInterimTranscript(interim);
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);

      switch (event.error) {
        case 'not-allowed':
          setError('Microphone permission denied. Please allow microphone access.');
          break;
        case 'no-speech':
          // This is common and not really an error - don't show error
          // The user just hasn't spoken yet
          break;
        case 'audio-capture':
          setError('No microphone found. Please check your audio input.');
          break;
        case 'network':
          // Chrome's Web Speech API requires internet connection
          setError('Speech recognition requires an internet connection. Chrome sends audio to Google servers for processing.');
          break;
        case 'aborted':
          // User or system aborted - not an error to display
          break;
        case 'service-not-allowed':
          setError('Speech recognition service not available. Try refreshing the page.');
          break;
        default:
          setError(`Speech recognition error: ${event.error}`);
      }
    };

    recognition.onend = () => {
      setIsListening(false);
      // Auto-restart if we were supposed to be listening (handles browser auto-stop)
      // But don't restart if there was an error
      if (recognitionRef.current === recognition && !error) {
        // Only restart if this was an unexpected end
      }
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch (err) {
      console.error('Failed to start recognition:', err);
      setError('Failed to start speech recognition');
    }
  }, [error]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, []);

  const resetTranscript = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
    finalTranscriptRef.current = '';
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
    };
  }, []);

  return {
    isListening,
    transcript,
    interimTranscript,
    fullTranscript: transcript + (interimTranscript ? ' ' + interimTranscript : ''),
    error,
    isSupported,
    startListening,
    stopListening,
    resetTranscript,
    clearError
  };
}

export default useSpeechRecognition;
