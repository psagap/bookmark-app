import React, { useState, useCallback, useRef } from 'react';
import { Image as ImageIcon, Upload } from 'lucide-react';
import { cn } from '@/lib/utils';
import { validateImageFile, createPreviewUrl, revokePreviewUrl } from '@/lib/imageStorage';

/**
 * Global drop zone wrapper that accepts image drops anywhere on the page.
 * Shows a visual overlay when dragging images over the content area.
 */
const ImageDropZone = ({ children, onImageDrop, disabled = false }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState([]);
  const dragCounterRef = useRef(0);

  // Check if the dragged items contain files
  const containsFiles = useCallback((e) => {
    if (e.dataTransfer?.types) {
      return e.dataTransfer.types.includes('Files');
    }
    return false;
  }, []);

  // Handle drag enter
  const handleDragEnter = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();

    if (disabled || !containsFiles(e)) return;

    dragCounterRef.current++;
    if (dragCounterRef.current === 1) {
      setIsDragging(true);
    }
  }, [disabled, containsFiles]);

  // Handle drag leave
  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();

    dragCounterRef.current--;
    if (dragCounterRef.current === 0) {
      setIsDragging(false);
    }
  }, []);

  // Handle drag over (required for drop to work)
  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  // Handle drop
  const handleDrop = useCallback(async (e) => {
    e.preventDefault();
    e.stopPropagation();

    dragCounterRef.current = 0;
    setIsDragging(false);

    if (disabled) return;

    const files = Array.from(e.dataTransfer?.files || []);

    // Filter to only image files
    const imageFiles = files.filter(file => {
      const validation = validateImageFile(file);
      if (!validation.valid) {
        console.warn(`Skipped file ${file.name}: ${validation.error}`);
        return false;
      }
      return true;
    });

    if (imageFiles.length === 0) {
      // TODO: Show toast notification
      console.warn('No valid image files found in drop');
      return;
    }

    // Create preview entries for uploading files
    const previews = imageFiles.map(file => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      file,
      previewUrl: createPreviewUrl(file),
      status: 'uploading',
    }));

    setUploadingFiles(previews);

    // Process each file
    for (const preview of previews) {
      try {
        await onImageDrop?.(preview.file);

        // Mark as complete
        setUploadingFiles(prev =>
          prev.map(p =>
            p.id === preview.id ? { ...p, status: 'complete' } : p
          )
        );

        // Remove after brief delay
        setTimeout(() => {
          revokePreviewUrl(preview.previewUrl);
          setUploadingFiles(prev => prev.filter(p => p.id !== preview.id));
        }, 500);

      } catch (error) {
        console.error('Upload failed:', error);

        // Mark as error
        setUploadingFiles(prev =>
          prev.map(p =>
            p.id === preview.id ? { ...p, status: 'error', error: error.message } : p
          )
        );

        // Clean up after delay
        setTimeout(() => {
          revokePreviewUrl(preview.previewUrl);
          setUploadingFiles(prev => prev.filter(p => p.id !== preview.id));
        }, 3000);
      }
    }
  }, [disabled, onImageDrop]);

  return (
    <div
      className="relative w-full h-full"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {children}

      {/* Drag overlay */}
      {isDragging && (
        <div
          className={cn(
            "fixed inset-0 z-[100] flex items-center justify-center",
            "bg-black/60 backdrop-blur-sm",
            "transition-opacity duration-200"
          )}
        >
          <div className="flex flex-col items-center gap-4 p-8 rounded-2xl border-2 border-dashed border-violet-500/50 bg-violet-950/30">
            <div className="w-20 h-20 rounded-full bg-violet-500/20 flex items-center justify-center animate-pulse">
              <Upload className="w-10 h-10 text-violet-400" />
            </div>
            <div className="text-center">
              <p className="text-xl font-medium text-white">Drop images here</p>
              <p className="text-sm text-white/50 mt-1">PNG, JPG, GIF, or WebP up to 10MB</p>
            </div>
          </div>
        </div>
      )}

      {/* Upload progress indicators */}
      {uploadingFiles.length > 0 && (
        <div className="fixed bottom-6 right-6 z-[101] flex flex-col gap-3">
          {uploadingFiles.map((item) => (
            <div
              key={item.id}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl",
                "bg-black/90 backdrop-blur-md border",
                item.status === 'error'
                  ? "border-red-500/50"
                  : item.status === 'complete'
                  ? "border-green-500/50"
                  : "border-violet-500/50"
              )}
            >
              {/* Preview thumbnail */}
              <div className="w-10 h-10 rounded-lg overflow-hidden bg-white/10">
                <img
                  src={item.previewUrl}
                  alt=""
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Status */}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white truncate max-w-[150px]">
                  {item.file.name}
                </p>
                <p className={cn(
                  "text-xs",
                  item.status === 'error'
                    ? "text-red-400"
                    : item.status === 'complete'
                    ? "text-green-400"
                    : "text-violet-400"
                )}>
                  {item.status === 'uploading' && 'Uploading...'}
                  {item.status === 'complete' && 'Added!'}
                  {item.status === 'error' && (item.error || 'Failed')}
                </p>
              </div>

              {/* Progress indicator */}
              {item.status === 'uploading' && (
                <div className="w-5 h-5 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ImageDropZone;
