/**
 * useOCRWorker Hook
 *
 * Provides an easy interface to use the OCR Web Worker from React components.
 * Handles worker lifecycle, message passing, and cleanup.
 *
 * Usage:
 *   const { extractText, processImages, isReady, progress } = useOCRWorker();
 *
 *   // Single image OCR
 *   const result = await extractText(imageUrl);
 *
 *   // Batch processing
 *   const results = await processImages([{ id: '1', url: 'https://...' }]);
 */

import { useState, useEffect, useRef, useCallback } from 'react';

export const useOCRWorker = () => {
  const [isReady, setIsReady] = useState(false);
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState(null);

  const workerRef = useRef(null);
  const pendingRequests = useRef(new Map());
  const requestIdCounter = useRef(0);

  // Initialize worker
  useEffect(() => {
    let worker = null;

    const initWorker = async () => {
      try {
        // Create worker using Vite's worker import syntax
        worker = new Worker(
          new URL('../workers/ocr.worker.js', import.meta.url),
          { type: 'module' }
        );

        // Handle messages from worker
        worker.onmessage = (event) => {
          const { type, id, ...data } = event.data;

          switch (type) {
            case 'init-complete':
              setIsReady(true);
              setError(null);
              break;

            case 'recognize-complete':
            case 'batch-complete':
              const request = pendingRequests.current.get(id);
              if (request) {
                if (data.success) {
                  request.resolve(data);
                } else {
                  request.reject(new Error(data.error));
                }
                pendingRequests.current.delete(id);
              }
              setProgress(null);
              break;

            case 'progress':
              setProgress({ type: 'single', progress: data.progress });
              break;

            case 'batch-progress':
              setProgress({
                type: 'batch',
                completed: data.completed,
                total: data.total,
              });
              break;

            case 'error':
              setError(data.error);
              const errorRequest = pendingRequests.current.get(id);
              if (errorRequest) {
                errorRequest.reject(new Error(data.error));
                pendingRequests.current.delete(id);
              }
              break;

            default:
              console.warn('Unknown message from OCR worker:', type);
          }
        };

        worker.onerror = (event) => {
          setError(event.message || 'Worker error');
          setIsReady(false);
        };

        workerRef.current = worker;

        // Initialize Tesseract in the worker
        worker.postMessage({ type: 'init' });
      } catch (err) {
        console.error('Failed to create OCR worker:', err);
        setError(err.message);
      }
    };

    initWorker();

    // Cleanup on unmount
    return () => {
      if (workerRef.current) {
        workerRef.current.postMessage({ type: 'terminate' });
        workerRef.current.terminate();
        workerRef.current = null;
      }
      pendingRequests.current.clear();
    };
  }, []);

  // Extract text from a single image
  const extractText = useCallback((imageUrl, timeout = 30000) => {
    return new Promise((resolve, reject) => {
      if (!workerRef.current) {
        reject(new Error('OCR worker not initialized'));
        return;
      }

      const id = `ocr-${++requestIdCounter.current}`;
      pendingRequests.current.set(id, { resolve, reject });

      workerRef.current.postMessage({
        type: 'recognize',
        id,
        imageUrl,
        timeout,
      });
    });
  }, []);

  // Process multiple images
  const processImages = useCallback((images) => {
    return new Promise((resolve, reject) => {
      if (!workerRef.current) {
        reject(new Error('OCR worker not initialized'));
        return;
      }

      const id = `batch-${++requestIdCounter.current}`;
      pendingRequests.current.set(id, {
        resolve: (data) => resolve(data.results),
        reject,
      });

      workerRef.current.postMessage({
        type: 'batch',
        id,
        images,
      });
    });
  }, []);

  // Cancel pending operations
  const cancel = useCallback(() => {
    pendingRequests.current.forEach((request) => {
      request.reject(new Error('Cancelled'));
    });
    pendingRequests.current.clear();
    setProgress(null);
  }, []);

  return {
    extractText,
    processImages,
    cancel,
    isReady,
    progress,
    error,
  };
};

export default useOCRWorker;
