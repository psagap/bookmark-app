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
        // Use official Twitter embed for full-fidelity tweets with videos, verification, etc.
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
