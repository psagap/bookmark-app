import React, { useEffect, useRef, useState } from 'react';
import { Loader2, ExternalLink } from 'lucide-react';

/**
 * TweetEmbed Component - Following X's Official oEmbed + widgets.js Guide
 *
 * Flow:
 * 1. Fetch oEmbed HTML from our server (which calls publish.twitter.com/oembed)
 * 2. Inject the blockquote HTML into the container
 * 3. Call twttr.widgets.load() to hydrate into full interactive widget
 * 4. After load, attempt autoplay for videos (muted, per browser policy)
 *
 * References:
 * - https://developer.x.com/en/docs/twitter-for-websites/oembed-api
 * - https://developer.x.com/en/docs/twitter-for-websites/javascript-api/guides/scripting-loading-and-initialization
 */
const TweetEmbed = ({ tweetUrl, theme = 'dark', maxWidth = 550 }) => {
    const containerRef = useRef(null);
    const [status, setStatus] = useState('idle'); // idle, loading, loaded, error
    const [errorMsg, setErrorMsg] = useState('');

    useEffect(() => {
        if (!tweetUrl || !containerRef.current) return;

        let isMounted = true;

        const loadTweet = async () => {
            setStatus('loading');

            try {
                // Step 1: Fetch oEmbed HTML from our server
                const response = await fetch(
                    `http://127.0.0.1:3000/api/twitter/oembed?url=${encodeURIComponent(tweetUrl)}&maxwidth=${maxWidth}`
                );

                if (!response.ok) {
                    throw new Error(`Failed to fetch embed: ${response.status}`);
                }

                const data = await response.json();

                if (!isMounted) return;

                if (!data.html) {
                    throw new Error('No embed HTML returned');
                }

                // Step 2: Inject the blockquote HTML into container
                containerRef.current.innerHTML = data.html;

                // Step 3: Wait for widgets.js to be ready, then hydrate
                const hydrateWidget = () => {
                    if (window.twttr && window.twttr.widgets) {
                        window.twttr.widgets.load(containerRef.current).then(() => {
                            if (!isMounted) return;
                            setStatus('loaded');

                            // Step 4: Attempt video autoplay after widget loads
                            attemptVideoAutoplay(containerRef.current);
                        });
                    } else {
                        // widgets.js not ready yet, retry
                        setTimeout(hydrateWidget, 100);
                    }
                };

                hydrateWidget();

            } catch (err) {
                console.error('Tweet embed error:', err);
                if (isMounted) {
                    setStatus('error');
                    setErrorMsg(err.message || 'Failed to load tweet');
                }
            }
        };

        loadTweet();

        return () => {
            isMounted = false;
            // Clean up on unmount
            if (containerRef.current) {
                containerRef.current.innerHTML = '';
            }
        };
    }, [tweetUrl, maxWidth]);

    /**
     * Attempt to autoplay video in the embedded tweet (muted)
     * Per the guide: "Use MutationObserver or a timeout to find the video element and call .play()"
     * Must be muted to comply with browser autoplay policies
     */
    const attemptVideoAutoplay = (container) => {
        // Give the widget time to fully render (iframe loads async)
        const tryAutoplay = (attempts = 0) => {
            if (attempts > 20) return; // Stop after ~2 seconds

            // Look for video in the tweet widget
            const iframe = container.querySelector('iframe.twitter-tweet-rendered');
            if (iframe) {
                try {
                    // The video is inside the iframe - we can't directly access it due to cross-origin
                    // But we can try to find any video element that might be exposed
                    const video = container.querySelector('video');
                    if (video && video.paused) {
                        video.muted = true; // Required for autoplay
                        video.play().catch(e => {
                            // Autoplay blocked by browser - this is expected behavior
                            console.log('Video autoplay not available:', e.message);
                        });
                        return;
                    }
                } catch (e) {
                    // Cross-origin restrictions - expected
                }
            }

            // Keep trying as widget loads
            setTimeout(() => tryAutoplay(attempts + 1), 100);
        };

        tryAutoplay();
    };

    return (
        <div className="tweet-embed-wrapper min-h-[200px]">
            {/* Loading spinner */}
            {status === 'loading' && (
                <div className="flex items-center justify-center py-12 bg-[#000000]">
                    <Loader2 className="w-8 h-8 text-[#1d9bf0] animate-spin" />
                </div>
            )}

            {/* Error fallback - link to view on X */}
            {status === 'error' && (
                <div className="flex flex-col items-center justify-center py-8 px-4 bg-[#000000] rounded-xl">
                    <p className="text-[#71767b] text-sm mb-4 text-center">
                        {errorMsg || 'Could not load tweet'}
                    </p>
                    <a
                        href={tweetUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#1d9bf0] text-white text-sm font-medium rounded-full hover:bg-[#1a8cd8] transition-colors"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <ExternalLink className="w-4 h-4" />
                        View on X
                    </a>
                </div>
            )}

            {/* Tweet container - widgets.js renders here */}
            <div
                ref={containerRef}
                className="tweet-embed-container"
                style={{
                    opacity: status === 'loaded' ? 1 : 0,
                    transition: 'opacity 0.3s ease',
                    display: status === 'error' ? 'none' : 'block'
                }}
            />
        </div>
    );
};

export default TweetEmbed;
