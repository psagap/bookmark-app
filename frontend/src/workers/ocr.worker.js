/**
 * OCR Web Worker
 *
 * Offloads heavy OCR processing from the main thread.
 * Uses Tesseract.js for client-side OCR on images.
 *
 * Messages:
 *   { type: 'init' } - Initialize the Tesseract worker
 *   { type: 'recognize', id, imageUrl } - Extract text from image
 *   { type: 'terminate' } - Clean up and terminate
 */

let tesseractWorker = null;
let isInitialized = false;

// Initialize Tesseract.js worker
const initTesseract = async () => {
  if (isInitialized && tesseractWorker) {
    return tesseractWorker;
  }

  try {
    // Dynamic import of Tesseract.js
    const Tesseract = await import('tesseract.js');
    tesseractWorker = await Tesseract.createWorker('eng', 1, {
      logger: (m) => {
        if (m.status === 'recognizing text') {
          self.postMessage({
            type: 'progress',
            progress: m.progress,
          });
        }
      },
    });

    isInitialized = true;
    return tesseractWorker;
  } catch (error) {
    console.error('Failed to initialize Tesseract:', error);
    throw error;
  }
};

// Recognize text from an image
const recognizeImage = async (imageUrl, timeout = 30000) => {
  if (!tesseractWorker) {
    await initTesseract();
  }

  // Create timeout promise
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('OCR timeout')), timeout);
  });

  try {
    // Race between OCR and timeout
    const result = await Promise.race([
      tesseractWorker.recognize(imageUrl),
      timeoutPromise,
    ]);

    // Clean up and return text
    const text = result.data.text
      .replace(/\s+/g, ' ')
      .trim();

    return {
      text,
      confidence: result.data.confidence,
      words: result.data.words?.length || 0,
    };
  } catch (error) {
    throw error;
  }
};

// Process multiple images
const processImages = async (images) => {
  const results = [];

  for (const image of images) {
    try {
      const result = await recognizeImage(image.url, image.timeout || 30000);
      results.push({
        id: image.id,
        success: true,
        ...result,
      });
    } catch (error) {
      results.push({
        id: image.id,
        success: false,
        error: error.message,
      });
    }

    // Send progress update
    self.postMessage({
      type: 'batch-progress',
      completed: results.length,
      total: images.length,
    });
  }

  return results;
};

// Clean up resources
const terminate = async () => {
  if (tesseractWorker) {
    await tesseractWorker.terminate();
    tesseractWorker = null;
    isInitialized = false;
  }
};

// Message handler
self.onmessage = async (event) => {
  const { type, ...data } = event.data;

  try {
    switch (type) {
      case 'init':
        await initTesseract();
        self.postMessage({ type: 'init-complete', success: true });
        break;

      case 'recognize':
        const result = await recognizeImage(data.imageUrl, data.timeout);
        self.postMessage({
          type: 'recognize-complete',
          id: data.id,
          success: true,
          ...result,
        });
        break;

      case 'batch':
        const batchResults = await processImages(data.images);
        self.postMessage({
          type: 'batch-complete',
          success: true,
          results: batchResults,
        });
        break;

      case 'terminate':
        await terminate();
        self.postMessage({ type: 'terminate-complete' });
        break;

      default:
        self.postMessage({
          type: 'error',
          error: `Unknown message type: ${type}`,
        });
    }
  } catch (error) {
    self.postMessage({
      type: 'error',
      id: data.id,
      error: error.message,
    });
  }
};

// Handle errors
self.onerror = (error) => {
  self.postMessage({
    type: 'error',
    error: error.message || 'Unknown worker error',
  });
};
