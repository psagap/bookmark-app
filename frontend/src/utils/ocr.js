/**
 * OCR Utility using Tesseract.js
 *
 * This utility provides text extraction from images using OCR (Optical Character Recognition).
 * It uses Tesseract.js for client-side processing and falls back to a server endpoint for
 * larger files or when client-side processing is not available.
 *
 * Usage:
 *   import { extractTextFromImage, processImageForSearch } from '@/utils/ocr';
 *
 *   // Extract text from an image URL
 *   const text = await extractTextFromImage('https://example.com/image.png');
 *
 *   // Process multiple images and add OCR text to items
 *   const enhancedItems = await processImageForSearch(items);
 */

// Check if Tesseract is available (loaded via CDN or npm)
let tesseractWorker = null;
let tesseractLoading = false;
let tesseractLoadPromise = null;

/**
 * Initialize Tesseract worker (lazy loading)
 */
const initTesseract = async () => {
  // If already loading, wait for it
  if (tesseractLoadPromise) {
    return tesseractLoadPromise;
  }

  // If already loaded, return the worker
  if (tesseractWorker) {
    return tesseractWorker;
  }

  tesseractLoading = true;

  tesseractLoadPromise = (async () => {
    try {
      // Try to import Tesseract.js (assumes it's installed)
      const Tesseract = await import('tesseract.js');
      tesseractWorker = await Tesseract.createWorker('eng');
      console.log('Tesseract.js initialized successfully');
      return tesseractWorker;
    } catch (error) {
      console.warn('Tesseract.js not available, OCR will use server fallback:', error.message);
      tesseractWorker = null;
      return null;
    } finally {
      tesseractLoading = false;
    }
  })();

  return tesseractLoadPromise;
};

/**
 * Extract text from an image using Tesseract.js
 *
 * @param {string} imageSource - URL or base64 data of the image
 * @param {Object} options - Configuration options
 * @param {number} options.timeout - Timeout in milliseconds (default: 30000)
 * @param {boolean} options.useServer - Force server-side OCR (default: false)
 * @returns {Promise<string>} - Extracted text from the image
 */
export const extractTextFromImage = async (imageSource, options = {}) => {
  const { timeout = 30000, useServer = false } = options;

  if (!imageSource) {
    return '';
  }

  // Skip if not an image URL
  const isImageUrl = /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(imageSource) ||
    imageSource.startsWith('data:image') ||
    imageSource.includes('picsum.photos');

  if (!isImageUrl) {
    return '';
  }

  // Try server-side OCR first if specified
  if (useServer) {
    return extractTextFromImageServer(imageSource, timeout);
  }

  try {
    // Initialize Tesseract
    const worker = await initTesseract();

    if (!worker) {
      // Fall back to server-side OCR
      return extractTextFromImageServer(imageSource, timeout);
    }

    // Create a promise that rejects after timeout
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('OCR timeout')), timeout);
    });

    // Perform OCR with timeout
    const ocrPromise = worker.recognize(imageSource);
    const result = await Promise.race([ocrPromise, timeoutPromise]);

    // Clean up the extracted text
    const text = result.data.text
      .replace(/\s+/g, ' ')
      .trim();

    return text;
  } catch (error) {
    console.warn('Client-side OCR failed, trying server:', error.message);
    return extractTextFromImageServer(imageSource, timeout);
  }
};

/**
 * Server-side OCR fallback
 */
const extractTextFromImageServer = async (imageSource, timeout) => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch('http://127.0.0.1:3000/api/ocr', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageUrl: imageSource }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Server OCR failed: ${response.status}`);
    }

    const data = await response.json();
    return data.text || '';
  } catch (error) {
    if (error.name === 'AbortError') {
      console.warn('Server OCR request timed out');
    } else {
      console.warn('Server OCR failed:', error.message);
    }
    return '';
  }
};

/**
 * Process multiple items and extract OCR text from images
 *
 * @param {Array} items - Array of bookmark/note items
 * @param {Object} options - Configuration options
 * @param {number} options.concurrency - Number of parallel OCR operations (default: 3)
 * @param {number} options.timeout - Timeout per image in ms (default: 30000)
 * @returns {Promise<Array>} - Items with ocrText added to metadata
 */
export const processImagesForSearch = async (items, options = {}) => {
  const { concurrency = 3, timeout = 30000 } = options;

  // Filter items that are images and don't already have OCR text
  const imageItems = items.filter(item =>
    item.type === 'image' &&
    item.thumbnail &&
    !item.metadata?.ocrText
  );

  if (imageItems.length === 0) {
    return items;
  }

  // Process in batches for concurrency control
  const results = new Map();
  const batches = [];

  for (let i = 0; i < imageItems.length; i += concurrency) {
    batches.push(imageItems.slice(i, i + concurrency));
  }

  for (const batch of batches) {
    const batchResults = await Promise.all(
      batch.map(async (item) => {
        const text = await extractTextFromImage(item.thumbnail, { timeout });
        return { id: item.id, text };
      })
    );

    batchResults.forEach(({ id, text }) => {
      if (text) {
        results.set(id, text);
      }
    });
  }

  // Merge OCR text back into items
  return items.map(item => {
    const ocrText = results.get(item.id);
    if (ocrText) {
      return {
        ...item,
        metadata: {
          ...item.metadata,
          ocrText,
        },
      };
    }
    return item;
  });
};

/**
 * Clean up Tesseract worker
 * Call this when the app is closing or OCR is no longer needed
 */
export const terminateOCR = async () => {
  if (tesseractWorker) {
    await tesseractWorker.terminate();
    tesseractWorker = null;
    tesseractLoadPromise = null;
  }
};

/**
 * Check if OCR is available
 */
export const isOCRAvailable = async () => {
  const worker = await initTesseract();
  return !!worker;
};

export default {
  extractTextFromImage,
  processImagesForSearch,
  terminateOCR,
  isOCRAvailable,
};
