import React, { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Mic,
  Square,
  Loader2,
  AlertCircle,
  Sparkles,
  Save,
  Hash,
  RotateCcw,
  Radio,
  Download,
  Bookmark
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/contexts/ThemeContext';
import useWhisperTranscription from '@/hooks/useWhisperTranscription';
import useSpeechRecognition from '@/hooks/useSpeechRecognition';
import useAudioRecorder from '@/hooks/useAudioRecorder';

// ============================================================================
// AUDIO NOTE MODULE
// Record audio, transcribe with local Whisper, process with Gemma LLM
// Redesigned with note-style layout and draft system
// ============================================================================

const AudioNoteModule = ({
  isOpen,
  onClose,
  onSave,
  onSaveDraft,        // Save as draft callback
  initialData = null, // For resuming drafts { polishedText, rawTranscript, tags, draftId }
  className = '',
}) => {
  // Get theme for styling
  const { currentTheme } = useTheme();
  const noteCardColors = currentTheme?.noteCard || {};
  const themeColors = currentTheme?.colors || {};

  // Recording state
  const [recordingState, setRecordingState] = useState('idle'); // idle, recording, transcribing, processing, complete
  const [polishedText, setPolishedText] = useState('');
  const [rawTranscript, setRawTranscript] = useState('');
  const [detectedFormat, setDetectedFormat] = useState('general');
  const [processingTime, setProcessingTime] = useState(0);
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [error, setError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false); // Track if content has been modified

  const tagInputRef = useRef(null);
  const [useWebSpeech, setUseWebSpeech] = useState(false); // Fallback flag
  const draftIdRef = useRef(null); // Track draft ID if resuming

  // Whisper transcription hook (primary)
  const {
    isTranscribing,
    isModelLoading,
    modelLoadProgress,
    transcript: whisperTranscript,
    error: whisperError,
    isModelLoaded,
    startRecording: startWhisperRecording,
    stopRecording: stopWhisperRecording,
    cancelRecording,
    preloadModel,
    clearError: clearWhisperError,
    resetTranscript: resetWhisperTranscript
  } = useWhisperTranscription();

  // Web Speech API hook (fallback)
  const {
    isListening,
    transcript: webSpeechTranscript,
    fullTranscript: webSpeechFullTranscript,
    error: webSpeechError,
    isSupported: webSpeechSupported,
    startListening,
    stopListening,
    resetTranscript: resetWebSpeechTranscript,
    clearError: clearWebSpeechError
  } = useSpeechRecognition();

  // Audio recorder for visualization
  const {
    isRecording,
    formattedDuration,
    audioLevel,
    waveformData,
    error: recorderError,
    startRecording: startAudioRecorder,
    stopRecording: stopAudioRecorder,
    resetRecording
  } = useAudioRecorder();

  // Initialize with draft data if provided
  useEffect(() => {
    if (isOpen && initialData) {
      setPolishedText(initialData.polishedText || '');
      setRawTranscript(initialData.rawTranscript || '');
      setTags(initialData.tags || []);
      draftIdRef.current = initialData.draftId || null;
      if (initialData.polishedText) {
        setRecordingState('complete');
      }
    }
  }, [isOpen, initialData]);

  // Process transcript with Gemma LLM
  const processWithLLM = useCallback(async (transcript) => {
    if (!transcript || transcript.trim().length === 0) {
      setError('No transcript to process');
      setRecordingState('idle');
      return;
    }

    setRecordingState('processing');
    setError(null);
    setRawTranscript(transcript);

    try {
      const response = await fetch('/api/audio-notes/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rawTranscript: transcript,
          options: { formatType: 'auto' }
        }),
      });

      const data = await response.json();

      if (data.success) {
        setPolishedText(data.polishedText);
        setDetectedFormat(data.detectedFormat || 'general');
        setProcessingTime(data.processingTimeMs || 0);
        setRecordingState('complete');
        setIsDirty(true);
      } else {
        throw new Error(data.error || 'Processing failed');
      }
    } catch (err) {
      console.error('LLM processing error:', err);
      setError(err.message || 'Failed to process transcript');
      // Fall back to raw transcript
      setPolishedText(transcript);
      setRecordingState('complete');
      setIsDirty(true);
    }
  }, []);

  // Start recording
  const handleStartRecording = useCallback(async () => {
    setError(null);
    clearWhisperError();
    if (clearWebSpeechError) clearWebSpeechError();
    setPolishedText('');
    setRawTranscript('');

    // Start audio recorder for visualization
    startAudioRecorder();

    if (useWebSpeech) {
      // Use Web Speech API (fallback)
      startListening();
      setRecordingState('recording');
    } else {
      // Use Whisper (primary)
      const whisperStarted = await startWhisperRecording();
      if (whisperStarted) {
        setRecordingState('recording');
      } else {
        // Whisper failed to start, try Web Speech API
        console.log('[Audio] Whisper failed, falling back to Web Speech API');
        if (webSpeechSupported) {
          setUseWebSpeech(true);
          startListening();
          setRecordingState('recording');
        } else {
          stopAudioRecorder();
          setError('Speech recognition not available');
        }
      }
    }
  }, [startWhisperRecording, startAudioRecorder, clearWhisperError, clearWebSpeechError, useWebSpeech, startListening, webSpeechSupported, stopAudioRecorder]);

  // Stop recording and transcribe
  const handleStopRecording = useCallback(async () => {
    stopAudioRecorder();
    setRecordingState('transcribing');

    let transcript = '';

    if (useWebSpeech) {
      // Get transcript from Web Speech API
      stopListening();
      transcript = webSpeechFullTranscript?.trim() || '';
    } else {
      // Get transcript from Whisper
      transcript = await stopWhisperRecording();
    }

    if (transcript && transcript.trim().length > 0) {
      // Process with LLM
      processWithLLM(transcript);
    } else {
      setRecordingState('idle');
      setError('No speech detected. Please try again.');
    }
  }, [stopAudioRecorder, stopWhisperRecording, stopListening, useWebSpeech, webSpeechFullTranscript, processWithLLM]);

  // Reset everything
  const handleReset = useCallback(() => {
    setRecordingState('idle');
    setPolishedText('');
    setRawTranscript('');
    setDetectedFormat('general');
    setProcessingTime(0);
    setTags([]);
    setError(null);
    setIsDirty(false);
    draftIdRef.current = null;
    clearWhisperError();
    if (clearWebSpeechError) clearWebSpeechError();
    resetWhisperTranscript();
    if (resetWebSpeechTranscript) resetWebSpeechTranscript();
    resetRecording();
    cancelRecording();
  }, [clearWhisperError, clearWebSpeechError, resetWhisperTranscript, resetWebSpeechTranscript, resetRecording, cancelRecording]);

  // Save audio note (publish)
  const handleSave = useCallback(async () => {
    if (!polishedText || polishedText.trim().length === 0) {
      setError('No content to save');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      await onSave({
        rawTranscript,
        polishedText,
        detectedFormat,
        processingTime,
        tags,
        draftId: draftIdRef.current, // Pass draft ID so it can be deleted after publishing
      });
      onClose();
      handleReset();
    } catch (err) {
      console.error('Save error:', err);
      setError(err.message || 'Failed to save audio note');
    } finally {
      setIsSaving(false);
    }
  }, [polishedText, rawTranscript, detectedFormat, processingTime, tags, onSave, onClose, handleReset]);

  // Save as draft
  const handleSaveAsDraft = useCallback(async () => {
    if (!polishedText || polishedText.trim().length === 0) {
      // Nothing to save as draft
      onClose();
      handleReset();
      return;
    }

    if (!onSaveDraft) {
      // No draft handler provided, just close
      onClose();
      handleReset();
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      await onSaveDraft({
        rawTranscript,
        polishedText,
        detectedFormat,
        processingTime,
        tags,
        draftId: draftIdRef.current,
      });
      onClose();
      handleReset();
    } catch (err) {
      console.error('Draft save error:', err);
      setError(err.message || 'Failed to save draft');
    } finally {
      setIsSaving(false);
    }
  }, [polishedText, rawTranscript, detectedFormat, processingTime, tags, onSaveDraft, onClose, handleReset]);

  // Handle close with auto-save draft
  const handleClose = useCallback(() => {
    if (recordingState === 'recording' || recordingState === 'transcribing' || recordingState === 'processing') {
      // Don't close during active states
      return;
    }

    // Auto-save as draft if there's unsaved content
    if (isDirty && polishedText && polishedText.trim().length > 0 && onSaveDraft) {
      handleSaveAsDraft();
    } else {
      onClose();
      handleReset();
    }
  }, [recordingState, isDirty, polishedText, onSaveDraft, handleSaveAsDraft, onClose, handleReset]);

  // Handle tag input
  const handleTagKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const newTag = tagInput.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
      if (newTag && !tags.includes(newTag)) {
        setTags([...tags, newTag]);
        setIsDirty(true);
      }
      setTagInput('');
    } else if (e.key === 'Backspace' && tagInput === '' && tags.length > 0) {
      setTags(tags.slice(0, -1));
      setIsDirty(true);
    }
  };

  const removeTag = (tagToRemove) => {
    setTags(tags.filter(t => t !== tagToRemove));
    setIsDirty(true);
  };

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        if (recordingState === 'recording') {
          handleStopRecording();
        } else if (recordingState !== 'transcribing' && recordingState !== 'processing') {
          handleClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, recordingState, handleStopRecording, handleClose]);

  // Reset when closing
  useEffect(() => {
    if (!isOpen) {
      // Don't reset here - let handleClose manage it
    }
  }, [isOpen]);

  // Preload model when modal opens (optional, for faster first transcription)
  useEffect(() => {
    if (isOpen && !isModelLoaded && !useWebSpeech) {
      preloadModel().then((success) => {
        if (!success) {
          console.log('[Audio] Whisper model failed to load, will use Web Speech API');
          if (webSpeechSupported) {
            setUseWebSpeech(true);
            setError(null);
            clearWhisperError();
          }
        }
      });
    }
  }, [isOpen, isModelLoaded, preloadModel, useWebSpeech, webSpeechSupported, clearWhisperError]);

  // Combine errors
  const displayError = error || (useWebSpeech ? webSpeechError : whisperError) || recorderError;

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={handleClose}
          />

          {/* Modal - Theme-Aware Note-Style Design */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            className={cn(
              'fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50',
              'w-[95%] max-w-3xl max-h-[85vh]',
              'rounded-2xl shadow-2xl shadow-black/20 overflow-hidden',
              'flex flex-col',
              className
            )}
            style={{
              backgroundColor: noteCardColors.bg || themeColors.bgLight || 'var(--note-bg)',
              borderWidth: '1px',
              borderStyle: 'solid',
              borderColor: `${noteCardColors.accent || themeColors.primaryHex || 'var(--note-accent)'}30`,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 z-10 p-2 rounded-full transition-colors"
              style={{
                backgroundColor: `${noteCardColors.accent || themeColors.primaryHex || 'var(--note-accent)'}20`,
                color: noteCardColors.heading || themeColors.fg || 'var(--note-heading)',
              }}
              disabled={recordingState === 'recording' || recordingState === 'transcribing' || recordingState === 'processing'}
            >
              <X className="w-5 h-5" />
            </button>

            {/* Scrollable Content Area */}
            <div className="flex-1 overflow-y-auto p-8">
              {/* Model Loading Progress */}
              {isModelLoading && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-3 p-4 mb-6 rounded-xl"
                  style={{
                    backgroundColor: `${noteCardColors.accent || themeColors.primaryHex}15`,
                    color: noteCardColors.heading || themeColors.fg,
                    borderWidth: '1px',
                    borderStyle: 'solid',
                    borderColor: `${noteCardColors.accent || themeColors.primaryHex}25`,
                  }}
                >
                  <Download className="w-5 h-5 flex-shrink-0 animate-bounce" style={{ color: noteCardColors.accent || themeColors.primaryHex }} />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Downloading speech model...</p>
                    <div className="mt-2 h-2 rounded-full overflow-hidden" style={{ backgroundColor: `${noteCardColors.accent || themeColors.primaryHex}20` }}>
                      <motion.div
                        className="h-full rounded-full"
                        style={{ backgroundColor: noteCardColors.accent || themeColors.primaryHex }}
                        initial={{ width: 0 }}
                        animate={{ width: `${modelLoadProgress}%` }}
                      />
                    </div>
                    <p className="text-xs mt-1" style={{ color: noteCardColors.text || themeColors.fgMuted }}>{modelLoadProgress}% - First time only (~142MB)</p>
                  </div>
                </motion.div>
              )}

              {/* Error Display */}
              {displayError && !isModelLoading && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-start gap-3 p-4 mb-6 bg-red-500/10 text-red-600 dark:text-red-400 rounded-xl border border-red-500/20"
                >
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <p className="text-sm leading-relaxed">{displayError}</p>
                </motion.div>
              )}

              {/* Recording Section */}
              <div className="mb-8">
                {/* Idle State - Start Recording */}
                {(recordingState === 'idle' && !isModelLoading) && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="p-8 rounded-2xl border-2 border-dashed"
                    style={{
                      backgroundColor: `${noteCardColors.accent || themeColors.primaryHex}10`,
                      borderColor: `${noteCardColors.accent || themeColors.primaryHex}30`,
                    }}
                  >
                    <div className="flex flex-col items-center text-center">
                      <motion.button
                        onClick={handleStartRecording}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="w-24 h-24 rounded-full flex items-center justify-center mb-6 text-white shadow-lg transition-shadow hover:shadow-xl"
                        style={{
                          background: `linear-gradient(135deg, ${noteCardColors.accent || themeColors.primaryHex}, ${themeColors.secondaryHex || noteCardColors.accent || themeColors.primaryHex})`,
                          boxShadow: `0 10px 25px ${noteCardColors.accent || themeColors.primaryHex}40`,
                        }}
                      >
                        <Mic className="w-10 h-10" />
                      </motion.button>
                      <h3 className="text-xl font-serif font-semibold mb-2" style={{ color: noteCardColors.heading || themeColors.fg }}>
                        Start Recording
                      </h3>
                      <p className="text-sm max-w-sm leading-relaxed" style={{ color: noteCardColors.text || themeColors.fgMuted }}>
                        Tap to record your voice note. Your speech will be transcribed and polished into a clean note.
                      </p>
                      <p className="mt-4 text-xs" style={{ color: `${noteCardColors.text || themeColors.fgMuted}80` }}>
                        {useWebSpeech ? 'Using Web Speech API' : 'Works offline'}
                      </p>
                    </div>
                  </motion.div>
                )}

                {/* Model Loading State */}
                {recordingState === 'idle' && isModelLoading && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="p-8 rounded-2xl"
                    style={{
                      backgroundColor: `${noteCardColors.accent || themeColors.primaryHex}10`,
                      borderWidth: '1px',
                      borderStyle: 'solid',
                      borderColor: `${noteCardColors.accent || themeColors.primaryHex}25`,
                    }}
                  >
                    <div className="flex flex-col items-center text-center">
                      <div
                        className="w-24 h-24 rounded-full flex items-center justify-center mb-6"
                        style={{ backgroundColor: `${noteCardColors.accent || themeColors.primaryHex}25` }}
                      >
                        <Loader2 className="w-10 h-10 animate-spin" style={{ color: noteCardColors.accent || themeColors.primaryHex }} />
                      </div>
                      <h3 className="text-xl font-serif font-semibold mb-2" style={{ color: noteCardColors.heading || themeColors.fg }}>
                        Preparing...
                      </h3>
                      <p className="text-sm" style={{ color: noteCardColors.text || themeColors.fgMuted }}>
                        Loading speech recognition model
                      </p>
                    </div>
                  </motion.div>
                )}

                {/* Recording State */}
                {recordingState === 'recording' && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="p-8 rounded-2xl"
                    style={{
                      backgroundColor: `${noteCardColors.accent || themeColors.primaryHex}12`,
                      borderWidth: '1px',
                      borderStyle: 'solid',
                      borderColor: `${noteCardColors.accent || themeColors.primaryHex}30`,
                    }}
                  >
                    <div className="flex flex-col items-center w-full">
                      {/* Waveform - with overflow-hidden and proper margins */}
                      <div className="w-full h-20 flex items-center justify-center gap-1 mb-6 px-4 overflow-hidden">
                        {waveformData.length > 0 ? (
                          waveformData.map((level, i) => (
                            <motion.div
                              key={i}
                              className="w-1.5 rounded-full flex-shrink-0"
                              style={{
                                background: `linear-gradient(to top, ${noteCardColors.accent || themeColors.primaryHex}, ${themeColors.secondaryHex || noteCardColors.accent})`,
                              }}
                              animate={{ height: Math.min(Math.max(8, level * 60), 64) }}
                              transition={{ duration: 0.15, ease: "easeOut" }}
                            />
                          ))
                        ) : (
                          Array.from({ length: 40 }).map((_, i) => (
                            <motion.div
                              key={i}
                              className="w-1 rounded-full flex-shrink-0"
                              style={{ backgroundColor: `${noteCardColors.accent || themeColors.primaryHex}50` }}
                              animate={{
                                height: Math.min(8 + Math.sin((Date.now() / 300) + i * 0.3) * 16 * (audioLevel + 0.2), 64),
                                opacity: 0.4 + audioLevel * 0.6
                              }}
                              transition={{ duration: 0.2, ease: "easeOut" }}
                            />
                          ))
                        )}
                      </div>

                      {/* Stop Button */}
                      <motion.button
                        onClick={handleStopRecording}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="w-20 h-20 rounded-full flex items-center justify-center mb-4 text-white shadow-lg"
                        style={{
                          backgroundColor: noteCardColors.accent || themeColors.primaryHex,
                          boxShadow: `0 10px 25px ${noteCardColors.accent || themeColors.primaryHex}50`,
                        }}
                      >
                        <motion.div
                          animate={{ scale: [1, 1.1, 1] }}
                          transition={{ duration: 1, repeat: Infinity }}
                        >
                          <Square className="w-8 h-8 fill-current" />
                        </motion.div>
                      </motion.button>

                      {/* Duration */}
                      <div className="flex items-center gap-2 mb-4" style={{ color: noteCardColors.accent || themeColors.primaryHex }}>
                        <Radio className="w-4 h-4 animate-pulse" />
                        <span className="font-mono text-lg">{formattedDuration}</span>
                      </div>

                      <p className="text-sm" style={{ color: noteCardColors.text || themeColors.fgMuted }}>
                        Recording... Tap stop when done
                      </p>

                      {/* Live transcript preview */}
                      {useWebSpeech && webSpeechFullTranscript && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="mt-4 w-full"
                        >
                          <div
                            className="p-3 rounded-lg max-h-24 overflow-y-auto"
                            style={{
                              backgroundColor: `${noteCardColors.bg || themeColors.bgLight}80`,
                              borderWidth: '1px',
                              borderStyle: 'solid',
                              borderColor: `${noteCardColors.accent || themeColors.primaryHex}25`,
                            }}
                          >
                            <p className="text-sm italic font-serif" style={{ color: noteCardColors.text || themeColors.fgMuted }}>
                              {webSpeechFullTranscript}
                            </p>
                          </div>
                        </motion.div>
                      )}
                    </div>
                  </motion.div>
                )}

                {/* Transcribing State */}
                {recordingState === 'transcribing' && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="p-8 rounded-2xl"
                    style={{
                      backgroundColor: `${noteCardColors.accent || themeColors.primaryHex}10`,
                      borderWidth: '1px',
                      borderStyle: 'solid',
                      borderColor: `${noteCardColors.accent || themeColors.primaryHex}25`,
                    }}
                  >
                    <div className="flex flex-col items-center text-center">
                      <div
                        className="w-20 h-20 rounded-full flex items-center justify-center mb-6"
                        style={{ backgroundColor: `${noteCardColors.accent || themeColors.primaryHex}20` }}
                      >
                        <Loader2 className="w-10 h-10 animate-spin" style={{ color: noteCardColors.accent || themeColors.primaryHex }} />
                      </div>
                      <h3 className="text-lg font-serif font-medium mb-2" style={{ color: noteCardColors.heading || themeColors.fg }}>
                        {useWebSpeech ? 'Processing...' : 'Transcribing Audio'}
                      </h3>
                      <p className="text-sm" style={{ color: noteCardColors.text || themeColors.fgMuted }}>
                        {useWebSpeech ? 'Preparing transcript...' : 'Converting speech to text locally...'}
                      </p>
                    </div>
                  </motion.div>
                )}

                {/* Processing State */}
                {recordingState === 'processing' && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="p-8 rounded-2xl"
                    style={{
                      backgroundColor: `${themeColors.secondaryHex || noteCardColors.accent}15`,
                      borderWidth: '1px',
                      borderStyle: 'solid',
                      borderColor: `${themeColors.secondaryHex || noteCardColors.accent}25`,
                    }}
                  >
                    <div className="flex flex-col items-center text-center">
                      <div
                        className="w-20 h-20 rounded-full flex items-center justify-center mb-6"
                        style={{ backgroundColor: `${themeColors.secondaryHex || noteCardColors.accent}25` }}
                      >
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                        >
                          <Sparkles className="w-10 h-10" style={{ color: themeColors.secondaryHex || noteCardColors.accent }} />
                        </motion.div>
                      </div>
                      <h3 className="text-lg font-serif font-medium mb-2" style={{ color: noteCardColors.heading || themeColors.fg }}>
                        Polishing with AI
                      </h3>
                      <p className="text-sm" style={{ color: noteCardColors.text || themeColors.fgMuted }}>
                        Removing filler words and formatting...
                      </p>
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Note Preview Section - Show when we have content */}
              {polishedText && (recordingState === 'complete' || recordingState === 'idle') && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  {/* Divider */}
                  <div className="flex items-center gap-4 mb-6">
                    <div
                      className="flex-1 h-px"
                      style={{ background: `linear-gradient(to right, transparent, ${noteCardColors.accent || themeColors.primaryHex}40, transparent)` }}
                    />
                  </div>

                  {/* Note Card */}
                  <div
                    className="rounded-2xl shadow-sm overflow-hidden"
                    style={{
                      backgroundColor: `${noteCardColors.bg || themeColors.bgLight}dd`,
                      borderWidth: '1px',
                      borderStyle: 'solid',
                      borderColor: `${noteCardColors.accent || themeColors.primaryHex}25`,
                    }}
                  >
                    {/* Note Header */}
                    <div
                      className="flex items-center justify-between px-6 py-4"
                      style={{
                        borderBottomWidth: '1px',
                        borderBottomStyle: 'solid',
                        borderBottomColor: `${noteCardColors.accent || themeColors.primaryHex}15`,
                        backgroundColor: `${noteCardColors.accent || themeColors.primaryHex}08`,
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <Mic className="w-5 h-5" style={{ color: noteCardColors.accent || themeColors.primaryHex }} />
                        <span className="font-serif font-medium" style={{ color: noteCardColors.heading || themeColors.fg }}>Voice Note</span>
                      </div>
                    </div>

                    {/* Note Content - Editable */}
                    <div className="p-6 min-h-[150px] max-h-[300px]">
                      <textarea
                        value={polishedText}
                        onChange={(e) => {
                          setPolishedText(e.target.value);
                          setIsDirty(true);
                        }}
                        className="w-full h-full min-h-[120px] bg-transparent font-serif text-lg whitespace-pre-wrap leading-relaxed resize-none outline-none"
                        style={{
                          color: noteCardColors.heading || themeColors.fg,
                          '--tw-placeholder-opacity': '0.5',
                        }}
                        placeholder="Edit your note..."
                      />
                    </div>

                    {/* Tags Section */}
                    <div
                      className="px-6 py-4"
                      style={{
                        borderTopWidth: '1px',
                        borderTopStyle: 'solid',
                        borderTopColor: `${noteCardColors.accent || themeColors.primaryHex}15`,
                        backgroundColor: `${noteCardColors.accent || themeColors.primaryHex}05`,
                      }}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <Hash className="w-4 h-4" style={{ color: `${noteCardColors.accent || themeColors.primaryHex}60` }} />
                        {tags.map(tag => (
                          <span
                            key={tag}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium"
                            style={{
                              backgroundColor: `${noteCardColors.accent || themeColors.primaryHex}20`,
                              color: noteCardColors.heading || themeColors.fg,
                            }}
                          >
                            {tag}
                            <button
                              onClick={() => removeTag(tag)}
                              className="hover:text-red-500 transition-colors"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                        <input
                          ref={tagInputRef}
                          type="text"
                          value={tagInput}
                          onChange={(e) => setTagInput(e.target.value)}
                          onKeyDown={handleTagKeyDown}
                          placeholder={tags.length === 0 ? 'Add tags...' : 'Add more...'}
                          className="flex-1 min-w-[100px] bg-transparent outline-none text-sm"
                          style={{
                            color: noteCardColors.heading || themeColors.fg,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>

            {/* Footer Actions - Fixed at bottom */}
            {(polishedText || recordingState === 'recording') && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="px-8 py-5"
                style={{
                  borderTopWidth: '1px',
                  borderTopStyle: 'solid',
                  borderTopColor: `${noteCardColors.accent || themeColors.primaryHex}20`,
                  backgroundColor: `${noteCardColors.bg || themeColors.bgLight}`,
                }}
              >
                <div className="flex items-center justify-between gap-4">
                  {/* Left: Start Over */}
                  <button
                    onClick={handleReset}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl transition-colors"
                    style={{ color: noteCardColors.text || themeColors.fgMuted }}
                  >
                    <RotateCcw className="w-4 h-4" />
                    Start Over
                  </button>

                  {/* Right: Draft & Save buttons - Show when we have content */}
                  {polishedText && (
                    <div className="flex items-center gap-3">
                      {/* Keep as Draft button */}
                      {onSaveDraft && (
                        <button
                          onClick={handleSaveAsDraft}
                          disabled={isSaving || !polishedText}
                          className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          style={{
                            borderWidth: '1px',
                            borderStyle: 'solid',
                            borderColor: `${noteCardColors.accent || themeColors.primaryHex}40`,
                            color: noteCardColors.heading || themeColors.fg,
                          }}
                        >
                          <Bookmark className="w-4 h-4" />
                          Keep as Draft
                        </button>
                      )}

                      {/* Save Note button */}
                      <button
                        onClick={handleSave}
                        disabled={isSaving || !polishedText}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{
                          background: `linear-gradient(135deg, ${noteCardColors.accent || themeColors.primaryHex}, ${themeColors.secondaryHex || noteCardColors.accent || themeColors.primaryHex})`,
                          boxShadow: `0 4px 12px ${noteCardColors.accent || themeColors.primaryHex}30`,
                        }}
                      >
                        {isSaving ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="w-4 h-4" />
                            Save Note
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default AudioNoteModule;
