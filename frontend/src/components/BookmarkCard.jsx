import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Play, ExternalLink, MoreHorizontal, Pin, Layers, Trash2, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import GlowingCard from './GlowingCard';
import TweetEmbed from './TweetEmbed';

const CardMenu = ({ onPin, onCreateSide, onDelete, onRefresh, isPinned, isRefreshing }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
    const buttonRef = useRef(null);

    useEffect(() => {
        if (!isOpen) return;

        const updatePosition = () => {
            if (buttonRef.current) {
                const rect = buttonRef.current.getBoundingClientRect();
                setMenuPosition({
                    top: rect.bottom + 4,
                    left: rect.right - 160,
                });
            }
        };

        updatePosition();

        // Close menu on scroll instead of following
        const handleScroll = () => setIsOpen(false);
        window.addEventListener('scroll', handleScroll, true);

        return () => {
            window.removeEventListener('scroll', handleScroll, true);
        };
    }, [isOpen]);

    const handleClick = (e, action) => {
        e.stopPropagation();
        action();
        setIsOpen(false);
    };

    return (
        <div className="relative">
            <button
                ref={buttonRef}
                onClick={(e) => {
                    e.stopPropagation();
                    setIsOpen(!isOpen);
                }}
                className="p-1.5 rounded-full bg-black/50 text-white hover:bg-black/70 backdrop-blur-sm transition-colors"
            >
                <MoreHorizontal className="w-4 h-4" />
            </button>

            {isOpen && createPortal(
                <>
                    <div
                        className="fixed inset-0 z-[9998]"
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsOpen(false);
                        }}
                    />
                    <div
                        className="fixed z-[9999] min-w-[160px] bg-popover/95 backdrop-blur-md border border-border rounded-lg shadow-xl overflow-hidden"
                        style={{ top: menuPosition.top, left: menuPosition.left }}
                    >
                        <button
                            onClick={(e) => handleClick(e, onPin)}
                            className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-foreground hover:bg-accent/50 transition-colors"
                        >
                            <Pin className={cn("w-4 h-4", isPinned && "fill-current text-primary")} />
                            <span>{isPinned ? 'Unpin' : 'Pin'}</span>
                        </button>
                        <button
                            onClick={(e) => handleClick(e, onRefresh)}
                            disabled={isRefreshing}
                            className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-foreground hover:bg-accent/50 transition-colors disabled:opacity-50"
                        >
                            <RefreshCw className={cn("w-4 h-4", isRefreshing && "animate-spin")} />
                            <span>{isRefreshing ? 'Refreshing...' : 'Refresh Image'}</span>
                        </button>
                        <button
                            onClick={(e) => handleClick(e, onCreateSide)}
                            className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-foreground hover:bg-accent/50 transition-colors"
                        >
                            <Layers className="w-4 h-4" />
                            <span>Create Side</span>
                        </button>
                        <div className="h-px bg-border mx-2" />
                        <button
                            onClick={(e) => handleClick(e, onDelete)}
                            className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                        >
                            <Trash2 className="w-4 h-4" />
                            <span>Delete</span>
                        </button>
                    </div>
                </>,
                document.body
            )}
        </div>
    );
};

const BookmarkCard = ({ bookmark, onDelete, onPin, onCreateSide, onRefresh }) => {
    const { title, url, thumbnail, category, notes, type, metadata } = bookmark;
    const [isRefreshing, setIsRefreshing] = useState(false);

    const handleRefresh = async () => {
        setIsRefreshing(true);
        try {
            await onRefresh?.(bookmark);
        } finally {
            setIsRefreshing(false);
        }
    };

    // Determine card type based on content
    const isVideo = url?.includes('youtube.com') || url?.includes('youtu.be');
    const isTweet = url?.includes('twitter.com') || url?.includes('x.com');
    const isNote = !url && (notes || title);

    // YouTube Embed Helper
    const getYoutubeEmbedUrl = (url) => {
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? `https://www.youtube.com/embed/${match[2]}` : null;
    };

    if (isNote) {
        return (
            <GlowingCard className="break-inside-avoid mb-6">
                <Card className="bg-card border-border hover:border-primary/50 transition-colors group relative">
                    <CardHeader className="p-6 pb-2">
                        <div className="flex justify-between items-start">
                            <div className="w-8 h-8 rounded-full border border-border flex items-center justify-center text-muted-foreground">
                                <span className="text-xs">T</span>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-6 pt-2">
                        <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                            {notes || title}
                        </p>
                    </CardContent>
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <CardMenu
                            onPin={() => onPin?.(bookmark)}
                            onCreateSide={() => onCreateSide?.(bookmark)}
                            onDelete={() => onDelete?.(bookmark)}
                            onRefresh={handleRefresh}
                            isPinned={bookmark.pinned}
                            isRefreshing={isRefreshing}
                        />
                    </div>
                </Card>
            </GlowingCard>
        );
    }

    if (isTweet) {
        // Check if we have a valid MP4 video URL for native autoplay
        const tweetData = metadata?.tweetData;
        const videoMedia = tweetData?.tweetMedia?.find(
            m => m.type === 'video' && m.url && m.url.includes('.mp4') && !m.url.startsWith('blob:')
        );

        // If we have a valid MP4, show native video with autoplay
        if (videoMedia) {
            return (
                <GlowingCard className="break-inside-avoid mb-6">
                    <Card className="bg-[#000000] border-[#2f3336] hover:border-[#536471] transition-colors group relative overflow-hidden">
                        {/* Author Header */}
                        <div className="p-3 flex items-center gap-3">
                            {tweetData.authorAvatar && (
                                <img
                                    src={tweetData.authorAvatar}
                                    alt={tweetData.authorName}
                                    className="w-10 h-10 rounded-full"
                                />
                            )}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1">
                                    <span className="font-bold text-white text-sm truncate">{tweetData.authorName}</span>
                                    {tweetData.isVerified && (
                                        <svg viewBox="0 0 22 22" className="w-4 h-4 text-[#1d9bf0] fill-current">
                                            <path d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.688-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.634.433 1.218.877 1.688.47.443 1.054.747 1.687.878.633.132 1.29.084 1.897-.136.274.586.705 1.084 1.246 1.439.54.354 1.17.551 1.816.569.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.239 1.266.296 1.903.164.636-.132 1.22-.447 1.68-.907.46-.46.776-1.044.908-1.681s.075-1.299-.165-1.903c.586-.274 1.084-.705 1.439-1.246.354-.54.551-1.17.569-1.816zM9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z" />
                                        </svg>
                                    )}
                                </div>
                                <span className="text-[#71767b] text-sm">{tweetData.authorHandle}</span>
                            </div>
                            <a
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="text-[#1d9bf0] hover:text-[#1a8cd8]"
                            >
                                <ExternalLink className="w-4 h-4" />
                            </a>
                        </div>

                        {/* Tweet Text */}
                        {tweetData.tweetText && (
                            <div className="px-3 pb-3">
                                <p className="text-white text-[15px] leading-5 whitespace-pre-wrap">{tweetData.tweetText}</p>
                            </div>
                        )}

                        {/* Native Video with Autoplay */}
                        <div className="relative bg-black">
                            <video
                                src={videoMedia.url}
                                poster={videoMedia.poster}
                                autoPlay
                                muted
                                loop
                                playsInline
                                className="w-full max-h-[500px] object-contain"
                            />
                        </div>

                        {/* Engagement Stats */}
                        {tweetData.viewCount && (
                            <div className="px-3 py-2 border-t border-[#2f3336]">
                                <span className="text-[#71767b] text-sm">{tweetData.viewCount} views</span>
                            </div>
                        )}

                        {/* Hover Actions */}
                        <div className="absolute top-2 right-12 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                            <CardMenu
                                onPin={() => onPin?.(bookmark)}
                                onCreateSide={() => onCreateSide?.(bookmark)}
                                onDelete={() => onDelete?.(bookmark)}
                                onRefresh={handleRefresh}
                                isPinned={bookmark.pinned}
                                isRefreshing={isRefreshing}
                            />
                        </div>
                    </Card>
                </GlowingCard>
            );
        }

        // Fall back to official Twitter embed for tweets without valid MP4 URLs
        return (
            <GlowingCard className="break-inside-avoid mb-6">
                <Card className="bg-[#000000] border-[#2f3336] hover:border-[#536471] transition-colors group relative overflow-hidden">
                    {/* Official Twitter Embed */}
                    <div className="tweet-card-embed" onClick={(e) => e.stopPropagation()}>
                        <TweetEmbed tweetUrl={url} theme="dark" />
                    </div>

                    {/* Hover Actions */}
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                        <CardMenu
                            onPin={() => onPin?.(bookmark)}
                            onCreateSide={() => onCreateSide?.(bookmark)}
                            onDelete={() => onDelete?.(bookmark)}
                            onRefresh={handleRefresh}
                            isPinned={bookmark.pinned}
                            isRefreshing={isRefreshing}
                        />
                    </div>
                </Card>
            </GlowingCard>
        );
    }

    if (isVideo) {
        const embedUrl = getYoutubeEmbedUrl(url);
        return (
            <GlowingCard className="break-inside-avoid mb-6">
                <Card className="bg-card border-border hover:border-primary/50 transition-colors group relative">
                    <div className="aspect-video w-full bg-black">
                        {embedUrl ? (
                            <iframe
                                src={embedUrl}
                                title={title}
                                className="w-full h-full border-0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center bg-accent">
                                <Play className="w-12 h-12 text-muted-foreground" />
                            </div>
                        )}
                    </div>
                    <CardContent className="p-4">
                        <h3 className="font-medium text-foreground leading-tight mb-2 line-clamp-2">{title}</h3>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <div className="w-4 h-4 rounded-full bg-red-600 flex items-center justify-center text-white text-[8px] font-bold">Y</div>
                            <span>YouTube</span>
                        </div>
                    </CardContent>
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                        <CardMenu
                            onPin={() => onPin?.(bookmark)}
                            onCreateSide={() => onCreateSide?.(bookmark)}
                            onDelete={() => onDelete?.(bookmark)}
                            onRefresh={handleRefresh}
                            isPinned={bookmark.pinned}
                            isRefreshing={isRefreshing}
                        />
                    </div>
                </Card>
            </GlowingCard>
        );
    }

    return (
        <GlowingCard className="break-inside-avoid mb-6">
            <Card className="bg-card border-border hover:border-primary/50 transition-colors group relative">
                {/* Image Thumbnail */}
                {thumbnail && (
                    <div className="relative aspect-[1.91/1] w-full overflow-hidden bg-muted rounded-t-lg">
                        <img
                            src={thumbnail}
                            alt={title}
                            className="w-full h-full object-cover transition-transform group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                )}

                <CardContent className={cn("p-4", thumbnail ? "pt-4" : "pt-6")}>
                    {/* Icon/Category */}
                    <div className="flex items-center gap-2 mb-3">
                        <div className="w-5 h-5 rounded bg-accent flex items-center justify-center overflow-hidden">
                            <img src={`https://www.google.com/s2/favicons?domain=${url}&sz=32`} alt="" className="w-3 h-3 opacity-70" />
                        </div>
                        <span className="text-xs text-muted-foreground font-medium">{new URL(url).hostname.replace('www.', '')}</span>
                    </div>

                    <h3 className="font-medium text-foreground leading-tight mb-2 line-clamp-2">
                        {title}
                    </h3>

                    <p className="text-xs text-muted-foreground line-clamp-3 mb-3">
                        {notes || metadata?.ogDescription || url}
                    </p>

                    <div className="flex flex-wrap gap-2 mt-3">
                        {category && (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5 font-normal text-muted-foreground">
                                {category}
                            </Badge>
                        )}
                        {bookmark.tags?.map(tag => (
                            <span key={tag} className="text-[10px] text-muted-foreground/70">#{tag}</span>
                        ))}
                    </div>
                </CardContent>

                {/* Hover Actions */}
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <CardMenu
                        onPin={() => onPin?.(bookmark)}
                        onCreateSide={() => onCreateSide?.(bookmark)}
                        onDelete={() => onDelete?.(bookmark)}
                        onRefresh={handleRefresh}
                        isPinned={bookmark.pinned}
                        isRefreshing={isRefreshing}
                    />
                </div>
            </Card>
        </GlowingCard>
    );
};

export default BookmarkCard;
