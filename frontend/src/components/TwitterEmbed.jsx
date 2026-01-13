import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Play, Pause, Volume2, VolumeX, ExternalLink, Maximize2, X } from 'lucide-react';
import { cn } from '@/lib/utils';

// X Logo SVG Component
const XLogo = ({ className }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

/**
 * TweetMediaGallery - Displays tweet media (images/videos) with autoplay support
 * Best practices from Twitter, Buffer, Hootsuite, mymind:
 * - Videos autoplay muted when visible (IntersectionObserver)
 * - Click to unmute/fullscreen
 * - Lazy loading for performance
 * - Multiple media displayed in grid layout
 * - Video URL priority: localUrl > fxTwitterUrl > url (excluding blob:)
 */
const TweetMediaGallery = ({ media = [], tweetUrl, localVideoUrl, fxTwitterVideoUrl, className }) => {
  const [activeVideo, setActiveVideo] = useState(null);
  const [isMuted, setIsMuted] = useState(true);
  const [isPlaying, setIsPlaying] = useState({});
  const [lightboxMedia, setLightboxMedia] = useState(null);
  const [fetchedVideoUrl, setFetchedVideoUrl] = useState(null);
  const videoRefs = useRef({});
  const containerRef = useRef(null);

  // Fetch video URL from FxTwitter API if we don't have one
  useEffect(() => {
    const hasVideoMedia = media.some(m => m.type === 'video');
    const hasValidVideoUrl = localVideoUrl || fxTwitterVideoUrl ||
      media.some(m => m.type === 'video' && m.url && !m.url.startsWith('blob:'));

    if (hasVideoMedia && !hasValidVideoUrl && tweetUrl) {
      // Fetch video URL from our FxTwitter API endpoint
      const fetchVideoUrl = async () => {
        try {
          const response = await fetch(`/api/twitter/video?url=${encodeURIComponent(tweetUrl)}`);
          const data = await response.json();
          if (data.success && data.videoUrl) {
            setFetchedVideoUrl(data.videoUrl);
          }
        } catch (err) {
          console.warn('Failed to fetch video URL from FxTwitter:', err);
        }
      };
      fetchVideoUrl();
    }
  }, [media, localVideoUrl, fxTwitterVideoUrl, tweetUrl]);

  // Filter valid media and prefer local/FxTwitter URLs when available
  // IMPORTANT: Only show the FIRST media item to avoid showing images from replies/ads
  // that may have been captured in older bookmarks
  const allValidMedia = media.filter(m =>
    (m.type === 'image' && m.url && !m.url.startsWith('blob:')) ||
    (m.type === 'video' && (m.poster || m.url || m.localUrl || m.fxTwitterUrl || localVideoUrl || fxTwitterVideoUrl || fetchedVideoUrl))
  );

  // Only take the first media item - this is the main tweet's media
  const validMedia = allValidMedia.slice(0, 1).map(m => {
    // For videos, prefer: localUrl > fxTwitterUrl > fetchedVideoUrl > url (if not blob:)
    if (m.type === 'video') {
      // Priority: local cached > FxTwitter direct > fetched > original (if valid)
      let videoUrl = m.localUrl || localVideoUrl;
      if (!videoUrl) {
        videoUrl = m.fxTwitterUrl || fxTwitterVideoUrl || fetchedVideoUrl;
      }
      if (!videoUrl && m.url && !m.url.startsWith('blob:')) {
        videoUrl = m.url;
      }

      const isLocal = videoUrl?.startsWith('/api/media/');
      const isFxTwitter = videoUrl?.includes('video.twimg.com') || videoUrl?.includes('fxtwitter');
      const hasRealVideo = isLocal || isFxTwitter || (videoUrl && !videoUrl.startsWith('blob:'));

      return {
        ...m,
        url: videoUrl,
        isLocal,
        isFxTwitter,
        hasRealVideo
      };
    }
    return m;
  });

  // Intersection Observer for autoplay - industry best practice
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const videoId = entry.target.dataset.videoId;
          const videoEl = videoRefs.current[videoId];

          if (entry.isIntersecting) {
            // Autoplay when 50% visible (muted per browser policy)
            if (videoEl && videoEl.paused) {
              videoEl.muted = true;
              videoEl.play().catch(() => {
                // Autoplay blocked - that's okay
              });
              setIsPlaying(prev => ({ ...prev, [videoId]: true }));
            }
          } else {
            // Pause when out of view for performance
            if (videoEl && !videoEl.paused) {
              videoEl.pause();
              setIsPlaying(prev => ({ ...prev, [videoId]: false }));
            }
          }
        });
      },
      { threshold: 0.5, rootMargin: '50px' }
    );

    // Observe all video containers
    const videoContainers = containerRef.current?.querySelectorAll('[data-video-id]');
    videoContainers?.forEach(container => observer.observe(container));

    return () => observer.disconnect();
  }, [validMedia]);

  const togglePlay = useCallback((videoId) => {
    const videoEl = videoRefs.current[videoId];
    if (!videoEl) return;

    if (videoEl.paused) {
      videoEl.play();
      setIsPlaying(prev => ({ ...prev, [videoId]: true }));
    } else {
      videoEl.pause();
      setIsPlaying(prev => ({ ...prev, [videoId]: false }));
    }
  }, []);

  const toggleMute = useCallback((videoId) => {
    const videoEl = videoRefs.current[videoId];
    if (!videoEl) return;

    videoEl.muted = !videoEl.muted;
    setIsMuted(videoEl.muted);
  }, []);

  const openLightbox = useCallback((mediaItem) => {
    setLightboxMedia(mediaItem);
  }, []);

  const closeLightbox = useCallback(() => {
    setLightboxMedia(null);
  }, []);

  if (!validMedia.length) return null;

  // Grid layout based on media count (like Twitter)
  const getGridClass = (count) => {
    switch (count) {
      case 1: return 'grid-cols-1';
      case 2: return 'grid-cols-2';
      case 3: return 'grid-cols-2';
      case 4: return 'grid-cols-2';
      default: return 'grid-cols-2';
    }
  };

  return (
    <>
      <div
        ref={containerRef}
        className={cn(
          'grid gap-1 rounded-xl overflow-hidden',
          getGridClass(validMedia.length),
          className
        )}
      >
        {validMedia.map((item, index) => {
          const videoId = `video-${index}`;

          if (item.type === 'video') {
            // Use hasRealVideo from mapped media (prefers local cached videos)
            const hasRealVideo = item.hasRealVideo;

            return (
              <div
                key={index}
                data-video-id={videoId}
                className={cn(
                  'relative bg-black overflow-hidden group cursor-pointer',
                  validMedia.length === 3 && index === 0 ? 'row-span-2' : '',
                  validMedia.length === 1 ? 'aspect-video' : 'aspect-square'
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  if (hasRealVideo) {
                    togglePlay(videoId);
                  } else {
                    // Fallback to opening on X
                    window.open(tweetUrl, '_blank');
                  }
                }}
              >
                {hasRealVideo ? (
                  <>
                    <video
                      ref={el => videoRefs.current[videoId] = el}
                      src={item.url}
                      poster={item.poster}
                      autoPlay
                      loop
                      muted
                      playsInline
                      preload="auto"
                      className="w-full h-full object-cover"
                      onPlay={() => setIsPlaying(prev => ({ ...prev, [videoId]: true }))}
                      onPause={() => setIsPlaying(prev => ({ ...prev, [videoId]: false }))}
                      onLoadedData={(e) => {
                        // Ensure autoplay works
                        e.target.play().catch(() => {});
                      }}
                    />

                    {/* Video controls overlay */}
                    <div className={cn(
                      'absolute inset-0 flex items-center justify-center transition-opacity duration-200',
                      isPlaying[videoId] ? 'opacity-0 group-hover:opacity-100' : 'opacity-100'
                    )}>
                      <div className="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center shadow-lg hover:scale-110 transition-transform">
                        {isPlaying[videoId] ? (
                          <Pause className="w-6 h-6 text-black" fill="currentColor" />
                        ) : (
                          <Play className="w-6 h-6 text-black ml-0.5" fill="currentColor" />
                        )}
                      </div>
                    </div>

                    {/* Mute button - bottom right */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleMute(videoId);
                      }}
                      className="absolute bottom-3 right-3 w-8 h-8 rounded-full bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80"
                    >
                      {isMuted ? (
                        <VolumeX className="w-4 h-4 text-white" />
                      ) : (
                        <Volume2 className="w-4 h-4 text-white" />
                      )}
                    </button>

                    {/* Fullscreen button - bottom left */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openLightbox(item);
                      }}
                      className="absolute bottom-3 left-3 w-8 h-8 rounded-full bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80"
                    >
                      <Maximize2 className="w-4 h-4 text-white" />
                    </button>
                  </>
                ) : (
                  // Fallback for blob URLs - show poster with link to X
                  <>
                    {item.poster ? (
                      <img
                        src={item.poster}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-zinc-900 flex items-center justify-center">
                        <Play className="w-12 h-12 text-white/20" />
                      </div>
                    )}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center hover:scale-110 transition-transform shadow-lg">
                          <Play className="w-6 h-6 text-black ml-0.5" fill="currentColor" />
                        </div>
                        <span className="text-sm text-white/80 flex items-center gap-1">
                          <XLogo className="w-4 h-4" />
                          Watch on X
                        </span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            );
          }

          // Image
          return (
            <div
              key={index}
              className={cn(
                'relative overflow-hidden group cursor-pointer',
                validMedia.length === 3 && index === 0 ? 'row-span-2' : '',
                validMedia.length === 1 ? 'aspect-auto' : 'aspect-square'
              )}
              onClick={(e) => {
                e.stopPropagation();
                openLightbox(item);
              }}
            >
              <img
                src={item.url}
                alt=""
                loading="lazy"
                className={cn(
                  'w-full h-full object-cover',
                  validMedia.length === 1 && 'max-h-[400px] object-contain bg-black'
                )}
              />

              {/* Hover overlay */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />

              {/* Expand button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  openLightbox(item);
                }}
                className="absolute bottom-3 right-3 w-8 h-8 rounded-full bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80"
              >
                <Maximize2 className="w-4 h-4 text-white" />
              </button>
            </div>
          );
        })}
      </div>

      {/* Lightbox */}
      {lightboxMedia && (
        <div
          className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center"
          onClick={closeLightbox}
        >
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors z-10"
          >
            <X className="w-6 h-6 text-white" />
          </button>

          {lightboxMedia.type === 'video' && lightboxMedia.url && !lightboxMedia.url.startsWith('blob:') ? (
            <video
              src={lightboxMedia.url}
              poster={lightboxMedia.poster}
              controls
              autoPlay
              className="max-w-[90vw] max-h-[90vh] rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          ) : lightboxMedia.type === 'video' ? (
            <a
              href={tweetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center gap-4 text-white"
              onClick={(e) => e.stopPropagation()}
            >
              {lightboxMedia.poster && (
                <img
                  src={lightboxMedia.poster}
                  alt=""
                  className="max-w-[90vw] max-h-[70vh] rounded-lg"
                />
              )}
              <span className="flex items-center gap-2 text-lg">
                <XLogo className="w-5 h-5" />
                Watch on X
                <ExternalLink className="w-4 h-4" />
              </span>
            </a>
          ) : (
            <img
              src={lightboxMedia.url}
              alt=""
              className="max-w-[90vw] max-h-[90vh] rounded-lg object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          )}
        </div>
      )}
    </>
  );
};

/**
 * TwitterEmbed - Full tweet embed using Twitter's widget.js
 * Use this for complete tweet rendering with native controls
 */
const TwitterEmbed = ({ tweetUrl, posterImage, onClose }) => {
  const containerRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  // Extract tweet ID from URL
  const getTweetId = (url) => {
    const match = url?.match(/(?:twitter|x)\.com\/\w+\/status\/(\d+)/);
    return match ? match[1] : null;
  };

  const tweetId = getTweetId(tweetUrl);

  useEffect(() => {
    if (!tweetId || !containerRef.current) return;

    // Load Twitter widget script if not already loaded
    const loadTwitterScript = () => {
      return new Promise((resolve, reject) => {
        if (window.twttr) {
          resolve(window.twttr);
          return;
        }

        const script = document.createElement('script');
        script.src = 'https://platform.twitter.com/widgets.js';
        script.async = true;
        script.onload = () => {
          // Wait for twttr to be ready
          const checkReady = setInterval(() => {
            if (window.twttr && window.twttr.widgets) {
              clearInterval(checkReady);
              resolve(window.twttr);
            }
          }, 100);

          // Timeout after 5 seconds
          setTimeout(() => {
            clearInterval(checkReady);
            reject(new Error('Twitter widget timeout'));
          }, 5000);
        };
        script.onerror = reject;
        document.head.appendChild(script);
      });
    };

    const embedTweet = async () => {
      try {
        const twttr = await loadTwitterScript();

        // Clear container
        containerRef.current.innerHTML = '';

        // Create the tweet embed
        await twttr.widgets.createTweet(tweetId, containerRef.current, {
          theme: 'dark',
          align: 'center',
          conversation: 'none',
          cards: 'visible',
          dnt: true,
        });

        setIsLoading(false);
      } catch (err) {
        console.error('Failed to embed tweet:', err);
        setError(true);
        setIsLoading(false);
      }
    };

    embedTweet();
  }, [tweetId]);

  if (!tweetId) {
    return null;
  }

  return (
    <div className="relative w-full">
      {/* Loading state with poster */}
      {isLoading && (
        <div className="relative aspect-video bg-black/50 rounded-xl overflow-hidden">
          {posterImage ? (
            <img
              src={posterImage}
              alt=""
              className="w-full h-full object-cover opacity-50"
            />
          ) : (
            <div className="w-full h-full bg-zinc-900" />
          )}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-10 h-10 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          </div>
        </div>
      )}

      {/* Error state - fallback to link */}
      {error && (
        <a
          href={tweetUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block relative aspect-video bg-black rounded-xl overflow-hidden group"
        >
          {posterImage && (
            <img
              src={posterImage}
              alt=""
              className="w-full h-full object-cover"
            />
          )}
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center group-hover:bg-black/30 transition-colors">
            <div className="flex flex-col items-center gap-2">
              <div className="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Play className="w-6 h-6 text-black ml-0.5" fill="currentColor" />
              </div>
              <span className="text-sm text-white/80 flex items-center gap-1">
                <XLogo className="w-4 h-4" />
                Watch on X
              </span>
            </div>
          </div>
        </a>
      )}

      {/* Twitter embed container */}
      <div
        ref={containerRef}
        className={isLoading ? 'hidden' : 'twitter-embed-container'}
        style={{ minHeight: error ? 0 : 'auto' }}
      />
    </div>
  );
};

export { TweetMediaGallery };
export default TwitterEmbed;
