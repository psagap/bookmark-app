import React, { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';

/**
 * TweetEmbed component - Uses Twitter's official widgets.js to embed tweets
 * This gives us proper video playback, verification badges, and official styling
 */
const TweetEmbed = ({ tweetUrl, theme = 'dark', onLoad, onError }) => {
    const containerRef = useRef(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Extract tweet ID from URL
    const getTweetId = (url) => {
        const match = url.match(/(?:twitter|x)\.com\/\w+\/status\/(\d+)/);
        return match ? match[1] : null;
    };

    useEffect(() => {
        const tweetId = getTweetId(tweetUrl);
        if (!tweetId) {
            setError('Invalid tweet URL');
            setLoading(false);
            return;
        }

        // Clear previous content
        if (containerRef.current) {
            containerRef.current.innerHTML = '';
        }

        // Wait for Twitter widgets to be ready
        const createTweet = () => {
            if (window.twttr && window.twttr.widgets) {
                window.twttr.widgets.createTweet(
                    tweetId,
                    containerRef.current,
                    {
                        theme: theme,
                        align: 'center',
                        dnt: true, // Do Not Track
                        conversation: 'none', // Hide thread/replies
                    }
                ).then((el) => {
                    setLoading(false);
                    if (el) {
                        onLoad?.();
                    } else {
                        // Tweet might be deleted or protected
                        setError('Tweet unavailable');
                        onError?.('Tweet unavailable');
                    }
                }).catch((err) => {
                    setLoading(false);
                    setError('Failed to load tweet');
                    onError?.(err);
                });
            } else {
                // widgets.js not ready yet, retry
                setTimeout(createTweet, 100);
            }
        };

        setLoading(true);
        setError(null);
        createTweet();

        // Cleanup
        return () => {
            if (containerRef.current) {
                containerRef.current.innerHTML = '';
            }
        };
    }, [tweetUrl, theme]);

    return (
        <div className="tweet-embed-container relative min-h-[200px]">
            {loading && (
                <div className="absolute inset-0 flex items-center justify-center bg-[#000000]">
                    <Loader2 className="w-6 h-6 text-[#1d9bf0] animate-spin" />
                </div>
            )}
            {error && !loading && (
                <div className="absolute inset-0 flex items-center justify-center bg-[#000000] text-[#71767b] text-sm">
                    {error}
                </div>
            )}
            <div
                ref={containerRef}
                className="tweet-embed"
                style={{
                    opacity: loading ? 0 : 1,
                    transition: 'opacity 0.3s ease'
                }}
            />
        </div>
    );
};

export default TweetEmbed;
