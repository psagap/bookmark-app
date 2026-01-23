/**
 * useAudioRecorder Hook
 *
 * Provides audio recording functionality using MediaRecorder API.
 * Includes audio visualization data for waveform display.
 */

import { useState, useEffect, useRef, useCallback } from 'react';

export function useAudioRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState(null);
  const [audioLevel, setAudioLevel] = useState(0);
  const [waveformData, setWaveformData] = useState([]);

  const mediaRecorderRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const streamRef = useRef(null);
  const durationIntervalRef = useRef(null);
  const animationFrameRef = useRef(null);
  const waveformHistoryRef = useRef([]);
  const isRecordingRef = useRef(false); // Ref to avoid stale closure

  // Update waveform data from analyser
  const updateWaveform = useCallback(() => {
    // Use ref instead of state to avoid stale closure issue
    if (!analyserRef.current || !isRecordingRef.current) return;

    const analyser = analyserRef.current;

    // Use time domain data for more responsive real-time waveform
    const timeDomainData = new Uint8Array(analyser.fftSize);
    analyser.getByteTimeDomainData(timeDomainData);

    // Calculate RMS (Root Mean Square) for accurate audio level
    // Time domain data is centered at 128, so we need to calculate deviation
    let sumSquares = 0;
    let maxDeviation = 0;
    for (let i = 0; i < timeDomainData.length; i++) {
      const deviation = Math.abs(timeDomainData[i] - 128);
      maxDeviation = Math.max(maxDeviation, deviation);
      const normalized = (timeDomainData[i] - 128) / 128; // Convert to -1 to 1 range
      sumSquares += normalized * normalized;
    }
    const rms = Math.sqrt(sumSquares / timeDomainData.length);

    // Use combination of RMS and peak for more responsive visualization
    // Normal speech RMS is typically 0.01-0.15 through laptop mics
    const peakLevel = maxDeviation / 128;
    const combinedLevel = (rms * 0.4 + peakLevel * 0.6); // Favor peak for snappier response

    // Power curve to lift quiet sounds, moderate scaling
    const boostedLevel = Math.pow(combinedLevel, 0.55) * 2.0;
    const normalizedLevel = Math.min(boostedLevel, 1);
    setAudioLevel(normalizedLevel);

    // Add to waveform history (keep last 50 samples)
    waveformHistoryRef.current.push(normalizedLevel);
    if (waveformHistoryRef.current.length > 50) {
      waveformHistoryRef.current.shift();
    }
    setWaveformData([...waveformHistoryRef.current]);

    animationFrameRef.current = requestAnimationFrame(updateWaveform);
  }, []); // No dependencies - uses refs

  const startRecording = useCallback(async () => {
    setError(null);
    setDuration(0);
    waveformHistoryRef.current = [];
    setWaveformData([]);

    try {
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: true,
          sampleRate: 44100
        }
      });

      streamRef.current = stream;

      // Set up audio context for visualization
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      audioContextRef.current = audioContext;

      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256; // Smaller FFT = faster updates, more responsive to transients
      analyser.smoothingTimeConstant = 0.05; // Near-zero = instant response to sound changes
      analyserRef.current = analyser;

      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);

      // We don't need MediaRecorder for recording audio blobs since we're only using transcript
      // But keep the stream for audio visualization
      isRecordingRef.current = true;
      setIsRecording(true);

      // Start duration counter
      const startTime = Date.now();
      durationIntervalRef.current = setInterval(() => {
        setDuration(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);

      // Start waveform updates
      animationFrameRef.current = requestAnimationFrame(updateWaveform);

    } catch (err) {
      console.error('Failed to start recording:', err);

      if (err.name === 'NotAllowedError') {
        setError('Microphone permission denied. Please allow microphone access.');
      } else if (err.name === 'NotFoundError') {
        setError('No microphone found. Please check your audio input.');
      } else {
        setError(`Failed to start recording: ${err.message}`);
      }
    }
  }, [updateWaveform]);

  const stopRecording = useCallback(() => {
    // Stop the duration counter
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }

    // Stop animation frame
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    // Stop media stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    // Close audio context
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    analyserRef.current = null;
    isRecordingRef.current = false;
    setIsRecording(false);
    setAudioLevel(0);
  }, []);

  const resetRecording = useCallback(() => {
    stopRecording();
    setDuration(0);
    setWaveformData([]);
    waveformHistoryRef.current = [];
    setError(null);
  }, [stopRecording]);

  // Format duration as MM:SS
  const formatDuration = useCallback((seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  return {
    isRecording,
    duration,
    formattedDuration: formatDuration(duration),
    error,
    audioLevel,
    waveformData,
    startRecording,
    stopRecording,
    resetRecording
  };
}

export default useAudioRecorder;
