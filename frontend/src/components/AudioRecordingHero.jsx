import React, { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mic,
  Square,
  Loader2,
  Sparkles,
  AlertCircle,
  Download,
  Save,
  Hash,
  RotateCcw,
  X,
  Bookmark
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/contexts/ThemeContext';
import useWhisperTranscription from '@/hooks/useWhisperTranscription';
import useSpeechRecognition from '@/hooks/useSpeechRecognition';
import useAudioRecorder from '@/hooks/useAudioRecorder';

// ============================================================================
// AUDIO RECORDING HERO - Modern Minimal Design
// Clean, theme-aware voice recording interface
// Inspired by modern voice UIs: Apple Voice Memos, Otter.ai, Notion AI
// ============================================================================

// Custom canvas-based waveform - smooth, Siri-like animation
const LiveWaveform = ({ audioLevel, isRecording, primaryColor }) => {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const phaseRef = useRef(0);
  const currentAmplitudeRef = useRef(0);
  const targetAmplitudeRef = useRef(0);
  const isRecordingRef = useRef(false);
  const colorRef = useRef(primaryColor || '#e8594f');

  // Update refs when props change
  useEffect(() => {
    colorRef.current = primaryColor || '#e8594f';
  }, [primaryColor]);

  useEffect(() => {
    isRecordingRef.current = isRecording;
    if (isRecording) {
      // Scale audioLevel (0-1) to amplitude
      // Base of 0.25 ensures gentle waves when recording
      // Multiplier of 1.4 gives moderate response to speech
      targetAmplitudeRef.current = 0.25 + audioLevel * 1.4;
    } else {
      targetAmplitudeRef.current = 0;
    }
  }, [isRecording, audioLevel]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;

    // Set canvas size with device pixel ratio for sharpness
    const updateCanvasSize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
      return { width: rect.width, height: rect.height };
    };

    let { width, height } = updateCanvasSize();
    const centerY = height / 2;

    // Convert hex color to rgba - with validation
    const hexToRgba = (hex, alpha) => {
      try {
        if (!hex || typeof hex !== 'string') hex = '#e8594f';
        if (!hex.startsWith('#')) hex = '#e8594f';
        const r = parseInt(hex.slice(1, 3), 16) || 232;
        const g = parseInt(hex.slice(3, 5), 16) || 89;
        const b = parseInt(hex.slice(5, 7), 16) || 79;
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
      } catch {
        return `rgba(232, 89, 79, ${alpha})`;
      }
    };

    const draw = () => {
      // Clear canvas
      ctx.clearRect(0, 0, width, height);

      // Smooth amplitude interpolation (lerp)
      // Moderate attack/release for natural-feeling movement
      const isIncreasing = targetAmplitudeRef.current > currentAmplitudeRef.current;
      const lerpFactor = isIncreasing ? 0.15 : 0.08;
      currentAmplitudeRef.current += (targetAmplitudeRef.current - currentAmplitudeRef.current) * lerpFactor;
      const amplitude = currentAmplitudeRef.current;

      // Update phase for animation - gentle speed
      phaseRef.current += 0.04 + amplitude * 0.06;

      const color = colorRef.current;

      // Always show some visual feedback
      if (amplitude > 0.05 || isRecordingRef.current) {
        // Draw multiple wave layers for depth when recording/has amplitude
        // Higher base amplitude ensures always visible when recording
        const effectiveAmplitude = Math.max(amplitude, isRecordingRef.current ? 0.35 : 0);

        // Moderate amplitude multipliers - visible but contained within the box
        const waves = [
          { amplitude: effectiveAmplitude * 28, frequency: 0.016, opacity: 0.75, lineWidth: 2.5 },
          { amplitude: effectiveAmplitude * 20, frequency: 0.022, opacity: 0.5, lineWidth: 2, phaseOffset: 1.2 },
          { amplitude: effectiveAmplitude * 14, frequency: 0.03, opacity: 0.3, lineWidth: 1.5, phaseOffset: 2.5 },
        ];

        waves.forEach((wave) => {
          ctx.beginPath();
          ctx.strokeStyle = hexToRgba(color, wave.opacity);
          ctx.lineWidth = wave.lineWidth;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';

          const phaseOffset = wave.phaseOffset || 0;

          for (let x = 0; x <= width; x++) {
            // Attenuation function - wave is strongest in center, fades at edges
            const normalizedX = (x / width) * 2 - 1; // -1 to 1
            const attenuation = Math.pow(1 - Math.pow(normalizedX, 2), 2);

            // Composite sine waves for organic movement
            const y1 = Math.sin(x * wave.frequency + phaseRef.current + phaseOffset) * wave.amplitude * attenuation;
            const y2 = Math.sin(x * wave.frequency * 1.6 + phaseRef.current * 0.7 + phaseOffset) * wave.amplitude * 0.35 * attenuation;
            const y3 = Math.sin(x * wave.frequency * 0.6 + phaseRef.current * 1.3 + phaseOffset) * wave.amplitude * 0.2 * attenuation;

            const y = centerY + y1 + y2 + y3;

            if (x === 0) {
              ctx.moveTo(x, y);
            } else {
              ctx.lineTo(x, y);
            }
          }

          ctx.stroke();
        });
      } else {
        // Draw subtle idle animation - a gently pulsing line
        ctx.beginPath();

        const pulseIntensity = 0.15 + Math.sin(phaseRef.current * 0.3) * 0.05;

        // Gradient line that fades at edges
        const gradient = ctx.createLinearGradient(0, 0, width, 0);
        gradient.addColorStop(0, 'transparent');
        gradient.addColorStop(0.15, hexToRgba(color, pulseIntensity * 0.5));
        gradient.addColorStop(0.5, hexToRgba(color, pulseIntensity));
        gradient.addColorStop(0.85, hexToRgba(color, pulseIntensity * 0.5));
        gradient.addColorStop(1, 'transparent');

        ctx.strokeStyle = gradient;
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';

        // Gentle wave even when idle
        for (let x = 0; x <= width; x++) {
          const normalizedX = (x / width) * 2 - 1;
          const attenuation = Math.pow(1 - Math.pow(normalizedX, 2), 1.5);
          const y = centerY + Math.sin(x * 0.015 + phaseRef.current * 0.5) * 3 * attenuation;

          if (x === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();
      }

      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []); // Empty deps - animation loop runs independently, reads from refs

  return (
    <div className="flex items-center justify-center h-64 w-full max-w-lg mx-auto overflow-hidden">
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ width: '100%', height: '256px' }}
      />
    </div>
  );
};

// Circular progress ring for recording
const RecordingRing = ({ duration, maxDuration = 300, primaryColor, size = 180 }) => {
  const progress = Math.min(duration / maxDuration, 1);
  const circumference = 2 * Math.PI * (size / 2 - 8);
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <svg
      width={size}
      height={size}
      className="absolute inset-0 -rotate-90"
      style={{ transform: 'rotate(-90deg)' }}
    >
      {/* Background ring */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={size / 2 - 8}
        fill="none"
        stroke={`${primaryColor}20`}
        strokeWidth="3"
      />
      {/* Progress ring */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={size / 2 - 8}
        fill="none"
        stroke={primaryColor}
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={strokeDashoffset}
        style={{ transition: 'stroke-dashoffset 1s linear' }}
      />
    </svg>
  );
};

const AudioRecordingHero = ({
  onRecordingComplete,
  className = '',
}) => {
  // Get current theme for styling
  const { currentTheme } = useTheme();
  const themeColors = currentTheme?.colors || {};
  const glowColors = currentTheme?.glow || {};

  // Recording state
  const [recordingState, setRecordingState] = useState('idle'); // idle, recording, transcribing, processing, editing
  const [error, setError] = useState(null);
  const [useWebSpeech, setUseWebSpeech] = useState(false);

  // Editing state (shown after processing completes)
  const [polishedText, setPolishedText] = useState('');
  const [rawTranscript, setRawTranscript] = useState('');
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const tagInputRef = useRef(null);

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

  // Audio recorder for visualization data
  const {
    isRecording,
    duration,
    formattedDuration,
    audioLevel,
    waveformData,
    error: recorderError,
    startRecording: startAudioRecorder,
    stopRecording: stopAudioRecorder,
    resetRecording
  } = useAudioRecorder();

  // Preload model on mount
  useEffect(() => {
    if (!isModelLoaded && !useWebSpeech) {
      preloadModel().then((success) => {
        if (!success && webSpeechSupported) {
          setUseWebSpeech(true);
          setError(null);
          clearWhisperError();
        }
      });
    }
  }, [isModelLoaded, preloadModel, useWebSpeech, webSpeechSupported, clearWhisperError]);

  // Process transcript with LLM → transition to editing state
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rawTranscript: transcript,
          options: { formatType: 'auto' }
        }),
      });

      const data = await response.json();

      if (data.success) {
        setPolishedText(data.polishedText || transcript);
        setRecordingState('editing');
      } else {
        throw new Error(data.error || 'Processing failed');
      }
    } catch (err) {
      console.error('LLM processing error:', err);
      // Fall back to raw transcript
      setPolishedText(transcript);
      setRecordingState('editing');
    }
  }, []);

  // Start recording
  const handleStartRecording = useCallback(async () => {
    setError(null);
    clearWhisperError();
    if (clearWebSpeechError) clearWebSpeechError();

    startAudioRecorder();

    if (useWebSpeech) {
      startListening();
      setRecordingState('recording');
    } else {
      const whisperStarted = await startWhisperRecording();
      if (whisperStarted) {
        setRecordingState('recording');
      } else {
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
      stopListening();
      transcript = webSpeechFullTranscript?.trim() || '';
    } else {
      transcript = await stopWhisperRecording();
    }

    if (transcript && transcript.trim().length > 0) {
      processWithLLM(transcript);
    } else {
      setRecordingState('idle');
      setError('No speech detected. Please try again.');
    }
  }, [stopAudioRecorder, stopWhisperRecording, stopListening, useWebSpeech, webSpeechFullTranscript, processWithLLM]);

  // Cancel recording
  const handleCancelRecording = useCallback(() => {
    stopAudioRecorder();
    if (useWebSpeech) {
      stopListening();
      if (resetWebSpeechTranscript) resetWebSpeechTranscript();
    } else {
      cancelRecording();
    }
    setRecordingState('idle');
    setError(null);
  }, [stopAudioRecorder, stopListening, useWebSpeech, resetWebSpeechTranscript, cancelRecording]);

  // Save the edited note
  const handleSaveNote = useCallback(async () => {
    if (!polishedText || polishedText.trim().length === 0) return;

    setIsSaving(true);
    try {
      await onRecordingComplete?.({
        rawTranscript,
        polishedText,
        tags,
        detectedFormat: 'general',
        processingTimeMs: 0,
      });
      // Reset everything after save
      setRecordingState('idle');
      setPolishedText('');
      setRawTranscript('');
      setTags([]);
      setTagInput('');
    } catch (err) {
      setError(err.message || 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  }, [polishedText, rawTranscript, tags, onRecordingComplete]);

  // Reset editor and go back to idle
  const handleResetEditor = useCallback(() => {
    setRecordingState('idle');
    setPolishedText('');
    setRawTranscript('');
    setTags([]);
    setTagInput('');
    setError(null);
  }, []);

  // Tag handlers
  const handleTagKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const newTag = tagInput.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
      if (newTag && !tags.includes(newTag)) {
        setTags([...tags, newTag]);
      }
      setTagInput('');
    } else if (e.key === 'Backspace' && tagInput === '' && tags.length > 0) {
      setTags(tags.slice(0, -1));
    }
  };

  const removeTag = (tagToRemove) => {
    setTags(tags.filter(t => t !== tagToRemove));
  };

  // Combine errors
  const displayError = error || (useWebSpeech ? webSpeechError : whisperError) || recorderError;

  // Theme colors - Use CSS variables for full theme-awareness
  // These CSS variables are set by ThemeContext and automatically update with theme changes
  const primaryColor = themeColors.primaryHex || 'var(--theme-primary, #e8594f)';
  const secondaryColor = themeColors.secondaryHex || 'var(--theme-secondary, #ff7a6b)';
  const glowRgb = glowColors.colorRgb || 'var(--glow-color-rgb, 232, 89, 79)';
  const bgColor = 'var(--theme-bg-dark, #1a1f2e)';
  const cardBg = 'var(--theme-bg-light, #2a3142)';

  return (
    <div className={cn('flex flex-col items-center justify-center py-12', className)}>
      {/* Model Loading Progress */}
      {isModelLoading && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 p-4 mb-8 rounded-2xl max-w-sm w-full"
          style={{ backgroundColor: cardBg }}
        >
          <Download className="w-5 h-5 flex-shrink-0 animate-bounce" style={{ color: primaryColor }} />
          <div className="flex-1">
            <p className="text-sm font-medium" style={{ color: 'var(--theme-fg)' }}>
              Loading speech model...
            </p>
            <div className="mt-2 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: `${primaryColor}20` }}>
              <motion.div
                className="h-full rounded-full"
                style={{ backgroundColor: primaryColor }}
                initial={{ width: 0 }}
                animate={{ width: `${modelLoadProgress}%` }}
              />
            </div>
          </div>
        </motion.div>
      )}

      {/* Error Display */}
      <AnimatePresence>
        {displayError && !isModelLoading && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex items-start gap-3 p-4 mb-8 rounded-2xl max-w-sm w-full"
            style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)' }}
          >
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-400" />
            <p className="text-sm text-red-400">{displayError}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Side Notes Editor - Shown after recording completes */}
      {recordingState === 'editing' && polishedText && (
        <motion.div
          key="editing"
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
          className="w-full max-w-lg"
        >
          <div
            className="rounded-2xl overflow-hidden"
            style={{
              backgroundColor: cardBg,
              border: '2px dashed #d79921',
              boxShadow: '0 4px 24px rgba(0,0,0,0.15), 0 0 0 1px rgba(215, 153, 33, 0.1)',
            }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-5 py-4"
              style={{
                borderBottom: '1px solid rgba(215, 153, 33, 0.15)',
                backgroundColor: 'rgba(215, 153, 33, 0.05)',
              }}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: 'rgba(215, 153, 33, 0.15)' }}
                >
                  <Mic className="w-3.5 h-3.5" style={{ color: '#d79921' }} />
                </div>
                <span className="text-sm font-medium tracking-wide" style={{ color: 'var(--theme-fg)' }}>
                  Voice Draft
                </span>
              </div>
              <span className="text-xs px-2 py-1 rounded-full" style={{ backgroundColor: 'rgba(215, 153, 33, 0.15)', color: '#d79921' }}>
                Draft
              </span>
            </div>

            {/* Editable Content */}
            <div className="px-5 py-5">
              <textarea
                value={polishedText}
                onChange={(e) => setPolishedText(e.target.value)}
                className="w-full min-h-[140px] bg-transparent text-base leading-relaxed resize-none outline-none font-serif"
                style={{ color: 'var(--theme-fg)' }}
                placeholder="Edit your note..."
                autoFocus
              />
            </div>

            {/* Tags Section */}
            <div
              className="px-5 py-3"
              style={{
                borderTop: '1px dashed rgba(215, 153, 33, 0.15)',
                backgroundColor: 'rgba(215, 153, 33, 0.03)',
              }}
            >
              <div className="flex flex-wrap items-center gap-2">
                <Hash className="w-3.5 h-3.5" style={{ color: 'rgba(215, 153, 33, 0.5)' }} />
                {tags.map(tag => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium"
                    style={{ backgroundColor: 'rgba(215, 153, 33, 0.15)', color: '#d79921' }}
                  >
                    {tag}
                    <button onClick={() => removeTag(tag)} className="hover:text-red-400 transition-colors">
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
                  placeholder={tags.length === 0 ? 'Add tags...' : 'More...'}
                  className="flex-1 min-w-[80px] bg-transparent outline-none text-xs"
                  style={{ color: 'var(--theme-fg-muted)' }}
                />
              </div>
            </div>

            {/* Footer Actions */}
            <div
              className="flex items-center justify-between px-5 py-4"
              style={{
                borderTop: '1px dashed rgba(215, 153, 33, 0.2)',
                backgroundColor: 'rgba(215, 153, 33, 0.03)',
              }}
            >
              <button
                onClick={handleResetEditor}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors hover:bg-white/5"
                style={{ color: 'var(--theme-fg-muted)' }}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Re-record
              </button>

              <div className="flex items-center gap-2.5">
                <button
                  onClick={handleSaveNote}
                  disabled={isSaving || !polishedText.trim()}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-all disabled:opacity-50"
                  style={{
                    background: 'linear-gradient(135deg, #d79921, #b57614)',
                    boxShadow: '0 2px 8px rgba(215, 153, 33, 0.3)',
                  }}
                >
                  {isSaving ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Save className="w-3.5 h-3.5" />
                  )}
                  {isSaving ? 'Saving...' : 'Save Note'}
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Main Recording Interface — Curved Container */}
      {recordingState !== 'editing' && (
      <div
        className="w-full max-w-lg rounded-3xl p-8"
        style={{
          backgroundColor: cardBg,
          border: `1px solid ${primaryColor}18`,
          boxShadow: `0 4px 24px rgba(0,0,0,0.12), 0 0 0 1px ${primaryColor}08`,
        }}
      >
        {/* Waveform Visualization */}
        <div className="mb-8">
          <LiveWaveform
            audioLevel={audioLevel}
            isRecording={recordingState === 'recording'}
            primaryColor={primaryColor}
          />
        </div>

        {/* Central Recording Button */}
        <div className="flex flex-col items-center">
          {/* Recording Button with Progress Ring */}
          <div className="relative mb-6">
            {recordingState === 'recording' && (
              <RecordingRing
                duration={duration}
                primaryColor={primaryColor}
                size={180}
              />
            )}

            <AnimatePresence mode="wait">
              {(recordingState === 'idle' && !isModelLoading) && (
                <motion.button
                  key="start"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleStartRecording}
                  className="relative w-[180px] h-[180px] rounded-full flex items-center justify-center transition-all"
                  style={{
                    backgroundColor: cardBg,
                    boxShadow: `0 0 0 1px ${primaryColor}20`,
                  }}
                >
                  {/* Inner circle with gradient */}
                  <div
                    className="w-20 h-20 rounded-full flex items-center justify-center"
                    style={{
                      background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`,
                      boxShadow: `0 4px 24px ${primaryColor}40`,
                    }}
                  >
                    <Mic className="w-8 h-8 text-white" />
                  </div>
                </motion.button>
              )}

              {recordingState === 'recording' && (
                <motion.button
                  key="stop"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleStopRecording}
                  className="relative w-[180px] h-[180px] rounded-full flex items-center justify-center"
                  style={{ backgroundColor: 'transparent' }}
                >
                  {/* Pulsing background */}
                  <motion.div
                    className="absolute inset-4 rounded-full"
                    style={{ backgroundColor: `${primaryColor}15` }}
                    animate={{ scale: [1, 1.1, 1], opacity: [0.5, 0.3, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />

                  {/* Stop button */}
                  <div
                    className="relative w-20 h-20 rounded-full flex items-center justify-center"
                    style={{
                      background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`,
                      boxShadow: `0 4px 24px ${primaryColor}50`,
                    }}
                  >
                    <Square className="w-7 h-7 text-white fill-white" />
                  </div>
                </motion.button>
              )}

              {(recordingState === 'transcribing' || recordingState === 'processing') && (
                <motion.div
                  key="loading"
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.95, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="flex flex-col items-center w-full max-w-sm"
                >
                  {/* Card container to stand out from wallpaper */}
                  <div
                    className="w-full rounded-2xl p-6 flex flex-col items-center gap-5"
                    style={{
                      backgroundColor: cardBg,
                      border: `1px solid ${primaryColor}20`,
                      boxShadow: `0 8px 32px rgba(0,0,0,0.2)`,
                    }}
                  >
                    {/* Animated icon */}
                    <div className="relative w-16 h-16 flex items-center justify-center">
                      {/* Spinning ring */}
                      <motion.div
                        className="absolute inset-0 rounded-full"
                        style={{
                          border: `2px solid ${primaryColor}15`,
                          borderTopColor: primaryColor,
                        }}
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
                      />
                      {recordingState === 'processing' ? (
                        <Sparkles className="w-7 h-7" style={{ color: primaryColor }} />
                      ) : (
                        <Loader2 className="w-7 h-7 animate-spin" style={{ color: primaryColor }} />
                      )}
                    </div>

                    {/* Step progress bar */}
                    <div className="w-full flex flex-col gap-3">
                      {/* Step 1 */}
                      <div className="flex items-center gap-3">
                        <div
                          className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                          style={{
                            backgroundColor: recordingState === 'processing' ? primaryColor : (recordingState === 'transcribing' ? primaryColor : `${primaryColor}20`),
                            color: 'white',
                          }}
                        >
                          {recordingState === 'processing' ? '✓' : '1'}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium" style={{ color: recordingState === 'transcribing' ? 'var(--theme-fg)' : 'var(--theme-fg-muted)' }}>
                            Transcribing speech
                          </p>
                          {recordingState === 'transcribing' && (
                            <motion.div
                              className="h-1 rounded-full mt-1.5 overflow-hidden"
                              style={{ backgroundColor: `${primaryColor}20` }}
                            >
                              <motion.div
                                className="h-full rounded-full"
                                style={{ backgroundColor: primaryColor }}
                                initial={{ width: '0%' }}
                                animate={{ width: ['0%', '70%', '40%', '90%'] }}
                                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                              />
                            </motion.div>
                          )}
                        </div>
                      </div>

                      {/* Connecting line */}
                      <div className="ml-2.5 h-3 w-px" style={{ backgroundColor: `${primaryColor}30` }} />

                      {/* Step 2 */}
                      <div className="flex items-center gap-3">
                        <div
                          className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                          style={{
                            backgroundColor: recordingState === 'processing' ? primaryColor : `${primaryColor}20`,
                            color: recordingState === 'processing' ? 'white' : 'var(--theme-fg-muted)',
                          }}
                        >
                          2
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium" style={{ color: recordingState === 'processing' ? 'var(--theme-fg)' : 'var(--theme-fg-muted)' }}>
                            Polishing with AI
                          </p>
                          {recordingState === 'processing' && (
                            <motion.div
                              className="h-1 rounded-full mt-1.5 overflow-hidden"
                              style={{ backgroundColor: `${primaryColor}20` }}
                            >
                              <motion.div
                                className="h-full rounded-full"
                                style={{ backgroundColor: primaryColor }}
                                initial={{ width: '0%' }}
                                animate={{ width: ['0%', '60%', '80%', '50%', '95%'] }}
                                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                              />
                            </motion.div>
                          )}
                        </div>
                      </div>

                      {/* Connecting line */}
                      <div className="ml-2.5 h-3 w-px" style={{ backgroundColor: `${primaryColor}15` }} />

                      {/* Step 3 - pending */}
                      <div className="flex items-center gap-3 opacity-40">
                        <div
                          className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                          style={{
                            backgroundColor: `${primaryColor}15`,
                            color: 'var(--theme-fg-muted)',
                          }}
                        >
                          3
                        </div>
                        <p className="text-sm" style={{ color: 'var(--theme-fg-muted)' }}>
                          Ready for review
                        </p>
                      </div>
                    </div>

                    {/* Status message */}
                    <motion.p
                      key={recordingState}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-xs text-center"
                      style={{ color: 'var(--theme-fg-muted)' }}
                    >
                      {recordingState === 'transcribing'
                        ? 'Converting your speech to text...'
                        : 'Removing filler words and formatting...'}
                    </motion.p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Duration / Status Text */}
          <AnimatePresence mode="wait">
            {recordingState === 'recording' && (
              <motion.div
                key="recording-info"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="text-center"
              >
                <p className="text-3xl font-light font-mono tabular-nums mb-2" style={{ color: 'var(--theme-fg)' }}>
                  {formattedDuration}
                </p>
                <p className="text-sm" style={{ color: 'var(--theme-fg-muted)' }}>
                  Recording... Tap to stop
                </p>

                {/* Live transcript preview for Web Speech */}
                {useWebSpeech && webSpeechFullTranscript && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mt-4 p-3 rounded-xl max-w-sm max-h-20 overflow-y-auto"
                    style={{ backgroundColor: cardBg }}
                  >
                    <p className="text-sm italic" style={{ color: 'var(--theme-fg-muted)' }}>
                      {webSpeechFullTranscript}
                    </p>
                  </motion.div>
                )}
              </motion.div>
            )}

            {recordingState === 'idle' && !isModelLoading && (
              <motion.div
                key="idle-info"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="text-center"
              >
                <p className="text-lg font-light mb-1" style={{ color: 'var(--theme-fg)' }}>
                  Tap to record
                </p>
                <p className="text-xs" style={{ color: 'var(--theme-fg-muted)' }}>
                  {useWebSpeech ? 'Web Speech API' : 'Local Whisper'}
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Cancel button */}
          {recordingState === 'recording' && (
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={handleCancelRecording}
              className="mt-6 px-6 py-2 rounded-full text-sm transition-all"
              style={{
                color: 'var(--theme-fg-muted)',
                backgroundColor: `${primaryColor}10`,
              }}
            >
              Cancel
            </motion.button>
          )}
        </div>
      </div>
      )}
    </div>
  );
};

export default AudioRecordingHero;
