/**
 * useWhisperTranscription Hook
 *
 * Browser-based speech-to-text using Whisper via @xenova/transformers
 * Works offline after initial model download (~75MB for tiny model)
 * Cross-browser compatible (Chrome, Firefox, Safari, Edge)
 */

import { useState, useCallback, useRef } from 'react';

// Model loading state - shared across hook instances
let pipelinePromise = null;
let pipelineInstance = null;

/**
 * Load the Whisper pipeline (lazy, singleton)
 * Using whisper-base for better accuracy (~142MB download, cached after first use)
 */
async function loadPipeline(onProgress, onError) {
  if (pipelineInstance) return pipelineInstance;

  if (pipelinePromise) return pipelinePromise;

  pipelinePromise = (async () => {
    try {
      // Dynamic import to avoid loading transformers.js until needed
      console.log('[Whisper] Importing transformers.js...');
      const { pipeline, env } = await import('@xenova/transformers');

      // Configure environment for browser
      env.allowLocalModels = false;
      env.useBrowserCache = true;

      console.log('[Whisper] Loading whisper-base model from Hugging Face...');

      // Use whisper-base for better accuracy (~142MB)
      // Models: whisper-tiny (~75MB), whisper-base (~142MB), whisper-small (~466MB)
      pipelineInstance = await pipeline(
        'automatic-speech-recognition',
        'Xenova/whisper-base',
        {
          progress_callback: (progress) => {
            console.log('[Whisper] Progress:', progress.status, progress.file || '');
            if (progress.status === 'progress' && onProgress) {
              const percent = Math.round((progress.loaded / progress.total) * 100);
              onProgress(percent, progress.file);
            }
            if (progress.status === 'done') {
              console.log('[Whisper] File loaded:', progress.file);
            }
          }
        }
      );

      console.log('[Whisper] Model loaded successfully');
      return pipelineInstance;
    } catch (err) {
      console.error('[Whisper] Failed to load model:', err);
      pipelinePromise = null; // Reset so it can be retried
      if (onError) onError(err);
      throw err;
    }
  })();

  return pipelinePromise;
}

export function useWhisperTranscription() {
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isModelLoading, setIsModelLoading] = useState(false);
  const [modelLoadProgress, setModelLoadProgress] = useState(0);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState(null);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const streamRef = useRef(null);

  /**
   * Start recording audio
   */
  const startRecording = useCallback(async () => {
    setError(null);
    setTranscript('');
    audioChunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true
        }
      });

      streamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4'
      });

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(1000); // Collect data every second

      return true;
    } catch (err) {
      console.error('[Whisper] Failed to start recording:', err);
      if (err.name === 'NotAllowedError') {
        setError('Microphone permission denied');
      } else if (err.name === 'NotFoundError') {
        setError('No microphone found');
      } else {
        setError(err.message);
      }
      return false;
    }
  }, []);

  /**
   * Stop recording and transcribe
   */
  const stopRecording = useCallback(async () => {
    if (!mediaRecorderRef.current) return '';

    return new Promise((resolve) => {
      const mediaRecorder = mediaRecorderRef.current;

      mediaRecorder.onstop = async () => {
        // Stop the stream
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }

        // Create audio blob
        const mimeType = mediaRecorder.mimeType || 'audio/webm';
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });

        console.log('[Whisper] Audio blob created:', audioBlob.size, 'bytes, type:', mimeType);

        if (audioBlob.size === 0) {
          setError('No audio recorded');
          resolve('');
          return;
        }

        // Transcribe
        setIsTranscribing(true);

        try {
          // Load model if not already loaded
          setIsModelLoading(!pipelineInstance);
          const whisper = await loadPipeline((progress, file) => {
            setModelLoadProgress(progress);
          });
          setIsModelLoading(false);

          // Convert blob to URL for the pipeline
          const audioUrl = URL.createObjectURL(audioBlob);

          // Transcribe using URL (transformers.js handles decoding)
          console.log('[Whisper] Transcribing audio...');
          const result = await whisper(audioUrl, {
            language: 'english',
            task: 'transcribe',
            chunk_length_s: 30,
            stride_length_s: 5,
          });

          // Clean up URL
          URL.revokeObjectURL(audioUrl);

          const text = result.text?.trim() || '';
          console.log('[Whisper] Transcription complete:', text);

          setTranscript(text);
          setIsTranscribing(false);
          resolve(text);
        } catch (err) {
          console.error('[Whisper] Transcription error:', err);
          setError('Failed to transcribe: ' + err.message);
          setIsTranscribing(false);
          resolve('');
        }
      };

      mediaRecorder.stop();
    });
  }, []);

  /**
   * Cancel recording without transcribing
   */
  const cancelRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    audioChunksRef.current = [];
    setTranscript('');
    setIsTranscribing(false);
  }, []);

  /**
   * Pre-load the model (optional, for faster first transcription)
   */
  const preloadModel = useCallback(async () => {
    if (pipelineInstance) return true;

    setIsModelLoading(true);
    setError(null);

    try {
      await loadPipeline(
        (progress) => {
          setModelLoadProgress(progress);
        },
        (err) => {
          // Error callback
          console.error('[Whisper] Model load error in callback:', err);
        }
      );
      setIsModelLoading(false);
      return true;
    } catch (err) {
      console.error('[Whisper] Failed to preload model:', err);
      const errorMessage = err.message || 'Failed to load speech model';
      setError(`Model load failed: ${errorMessage}. Check console for details.`);
      setIsModelLoading(false);
      return false;
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const resetTranscript = useCallback(() => {
    setTranscript('');
  }, []);

  return {
    // State
    isTranscribing,
    isModelLoading,
    modelLoadProgress,
    transcript,
    error,
    isModelLoaded: !!pipelineInstance,

    // Actions
    startRecording,
    stopRecording,
    cancelRecording,
    preloadModel,
    clearError,
    resetTranscript
  };
}

export default useWhisperTranscription;
