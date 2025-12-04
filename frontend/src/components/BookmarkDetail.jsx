import React, { useState, useEffect, useRef, useCallback } from 'react';
import { CreepyButton } from './CreepyButton';
import TweetEmbed from './TweetEmbed';
import FerrisWheelLoader from './FerrisWheelLoader';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Play, ExternalLink, ChevronUp, X, Plus, Link2, MoreHorizontal } from "lucide-react";
import { getTagColor, getTagColors, getAllTagColors, setTagColor } from '@/utils/tagColors';

// Color picker dropdown for tags - opens on click of ellipsis menu
const TagColorDropdown = ({ tag, currentColor, onSelect, onClose, position }) => {
    const allColors = getAllTagColors();
    const dropdownRef = React.useRef(null);

    // Close on click outside
    React.useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                onClose();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [onClose]);

    // Close on escape
    React.useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [onClose]);

    return (
        <div
            ref={dropdownRef}
            className="absolute z-50 animate-in fade-in zoom-in-95 duration-150"
            style={{
                top: position === 'above' ? 'auto' : '100%',
                bottom: position === 'above' ? '100%' : 'auto',
                right: 0,
                marginTop: position === 'above' ? 0 : '8px',
                marginBottom: position === 'above' ? '8px' : 0,
            }}
        >
            {/* Dropdown card */}
            <div
                className="rounded-xl overflow-hidden"
                style={{
                    background: 'linear-gradient(145deg, rgba(50, 48, 47, 0.98), rgba(40, 40, 40, 0.98))',
                    backdropFilter: 'blur(16px)',
                    border: '1px solid rgba(102, 92, 84, 0.4)',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5), 0 2px 8px rgba(0, 0, 0, 0.3)',
                }}
            >
                {/* Header */}
                <div
                    className="px-3 py-2 border-b"
                    style={{
                        borderColor: 'rgba(102, 92, 84, 0.3)',
                        background: 'rgba(0, 0, 0, 0.15)',
                    }}
                >
                    <span className="text-xs font-medium uppercase tracking-wider text-gruvbox-fg-muted">
                        Colors
                    </span>
                </div>

                {/* Color grid */}
                <div className="p-3">
                    <div className="grid grid-cols-4 gap-2">
                        {allColors.map((color) => {
                            const isSelected = currentColor.id === color.id;
                            return (
                                <button
                                    key={color.id}
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setTagColor(tag, color.id);
                                        onSelect(color.id);
                                        onClose();
                                    }}
                                    className="group relative w-8 h-8 rounded-lg transition-all duration-200 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-white/30"
                                    style={{
                                        backgroundColor: color.text,
                                        boxShadow: isSelected
                                            ? `0 0 0 2px #1d2021, 0 0 0 4px ${color.text}, 0 4px 12px rgba(0,0,0,0.4)`
                                            : '0 2px 6px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.15)',
                                    }}
                                    title={color.name}
                                >
                                    {/* Checkmark for selected */}
                                    {isSelected && (
                                        <svg
                                            className="absolute inset-0 m-auto w-4 h-4 text-gruvbox-bg-darkest"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            stroke="currentColor"
                                            strokeWidth={3}
                                        >
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                        </svg>
                                    )}
                                    {/* Hover glow */}
                                    <div
                                        className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                        style={{
                                            boxShadow: `0 0 12px ${color.text}`,
                                        }}
                                    />
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};

// Simple tag container with flex wrap - uniform pill sizes
const TagColumnsContainer = ({ tags, onRemoveTag, onAddTag }) => {
    const [isAdding, setIsAdding] = useState(false);
    const [newTag, setNewTag] = useState('');
    const [openMenuTag, setOpenMenuTag] = useState(null); // Track which tag's menu is open
    const [, forceUpdate] = useState(0); // For re-rendering after color change
    const inputRef = useRef(null);

    // Parse tags into array
    const tagsList = tags ? tags.split(',').map(t => t.trim()).filter(t => t) : [];

    // Get colors for all tags at once to avoid adjacent duplicates
    const tagColors = getTagColors(tagsList);

    // Focus input when adding mode is activated
    useEffect(() => {
        if (isAdding && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isAdding]);

    const handleAddTag = () => {
        if (newTag.trim()) {
            onAddTag(newTag.trim());
            setNewTag('');
            setIsAdding(false);
        }
    };

    const handleMenuToggle = (tag, e) => {
        e.stopPropagation();
        setOpenMenuTag(openMenuTag === tag ? null : tag);
    };

    return (
        <div className="flex flex-wrap gap-2 items-center">
            {/* Tags - compact cohesive pills */}
            {tagsList.map((tag, idx) => {
                const color = tagColors[idx];
                const isMenuOpen = openMenuTag === tag;

                return (
                    <div
                        key={idx}
                        className="relative group"
                    >
                        {/* Tag pill - tighter spacing, cohesive feel */}
                        <div
                            className="inline-flex items-center rounded-lg text-sm font-medium border transition-all duration-200 hover:brightness-110"
                            style={{
                                backgroundColor: color.bg,
                                borderColor: color.border,
                            }}
                        >
                            {/* Tag name - main clickable area */}
                            <span
                                className="py-1.5 pl-2.5 pr-1 truncate max-w-[100px]"
                                style={{ color: color.text }}
                            >
                                {tag}
                            </span>

                            {/* Subtle divider */}
                            <div
                                className="w-px h-4 mx-0.5"
                                style={{ backgroundColor: `${color.text}30` }}
                            />

                            {/* Action buttons - grouped tightly */}
                            <div className="flex items-center pr-1">
                                {/* Ellipsis menu */}
                                <button
                                    type="button"
                                    onClick={(e) => handleMenuToggle(tag, e)}
                                    className="p-1 rounded hover:bg-white/15 transition-colors"
                                    style={{ color: color.text }}
                                >
                                    <MoreHorizontal className="w-3.5 h-3.5" />
                                </button>

                                {/* Remove button */}
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onRemoveTag(idx);
                                    }}
                                    className="p-1 rounded hover:bg-white/15 transition-colors"
                                    style={{ color: color.text }}
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>

                        {/* Color dropdown - opens on click of ellipsis */}
                        {isMenuOpen && (
                            <TagColorDropdown
                                tag={tag}
                                currentColor={color}
                                onSelect={() => forceUpdate(n => n + 1)}
                                onClose={() => setOpenMenuTag(null)}
                                position="below"
                            />
                        )}
                    </div>
                );
            })}

            {/* Add tag - inline input that blends with tags */}
            {isAdding ? (
                <div
                    className="inline-flex items-center rounded-lg border transition-all duration-200"
                    style={{
                        backgroundColor: 'rgba(40, 40, 40, 0.9)',
                        borderColor: 'rgba(250, 189, 47, 0.5)',
                    }}
                >
                    <input
                        ref={inputRef}
                        type="text"
                        value={newTag}
                        onChange={(e) => setNewTag(e.target.value)}
                        placeholder="new tag..."
                        className="bg-transparent text-sm py-1.5 pl-2.5 pr-1 focus:outline-none placeholder:text-gruvbox-fg-muted/60"
                        style={{
                            color: '#ebdbb2',
                            width: `${Math.max(70, newTag.length * 8 + 30)}px`,
                            caretColor: '#fabd2f',
                        }}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                e.stopPropagation();
                                handleAddTag();
                            } else if (e.key === 'Escape') {
                                setIsAdding(false);
                                setNewTag('');
                            }
                        }}
                        onBlur={() => {
                            // Small delay to allow click on add button
                            setTimeout(() => {
                                if (!newTag.trim()) {
                                    setIsAdding(false);
                                }
                            }, 150);
                        }}
                    />
                    {/* Add/confirm button */}
                    <button
                        type="button"
                        onClick={handleAddTag}
                        disabled={!newTag.trim()}
                        className="p-1.5 mr-0.5 rounded transition-all"
                        style={{
                            color: newTag.trim() ? '#fabd2f' : 'rgba(146, 131, 116, 0.5)',
                        }}
                    >
                        <Plus className="w-4 h-4" />
                    </button>
                </div>
            ) : (
                <button
                    type="button"
                    onClick={() => setIsAdding(true)}
                    className="group inline-flex items-center gap-1 py-1.5 px-2.5 rounded-lg border border-dashed transition-all duration-200 hover:border-gruvbox-yellow/50 hover:bg-gruvbox-yellow/5"
                    style={{
                        borderColor: 'rgba(146, 131, 116, 0.35)',
                    }}
                >
                    <Plus className="w-3.5 h-3.5 text-gruvbox-fg-muted group-hover:text-gruvbox-yellow transition-colors" />
                    <span className="text-sm text-gruvbox-fg-muted group-hover:text-gruvbox-yellow transition-colors">
                        Add
                    </span>
                </button>
            )}
        </div>
    );
};

const TweetPreview = ({ bookmark }) => {
    return (
        <div className="flex flex-col h-full bg-black text-white relative overflow-hidden">
            {/* Scrollable container for the tweet embed */}
            <div className="flex-1 flex items-center justify-center p-6 overflow-y-auto">
                <div className="w-full max-w-[550px]">
                    {/* Twitter/X Embed Widget */}
                    <TweetEmbed tweetUrl={bookmark.url} />
                </div>
            </div>
        </div>
    );
};

const VideoPreview = ({ bookmark }) => {
    const [isPlaying, setIsPlaying] = useState(false);

    // Extract YouTube video ID from URL
    const getYoutubeVideoId = (url) => {
        if (!url) return null;
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? match[2] : null;
    };

    const videoId = getYoutubeVideoId(bookmark.url);
    const isYoutube = bookmark.url?.includes('youtube.com') || bookmark.url?.includes('youtu.be');

    // Get high-quality YouTube thumbnail
    const youtubeThumbnail = videoId
        ? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
        : bookmark.thumbnail;

    // Fallback thumbnail
    const fallbackThumbnail = videoId
        ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
        : bookmark.thumbnail;

    if (isPlaying && videoId) {
        // Show embedded YouTube player
        return (
            <div className="h-full bg-black flex flex-col">
                <div className="flex-1 relative">
                    <iframe
                        src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`}
                        title={bookmark.title}
                        className="absolute inset-0 w-full h-full"
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                    />
                </div>
            </div>
        );
    }

    return (
        <div className="h-full bg-black flex items-center justify-center relative group">
            {/* YouTube Thumbnail */}
            {youtubeThumbnail ? (
                <img
                    src={youtubeThumbnail}
                    alt={bookmark.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                        // Fallback to lower quality thumbnail if maxres doesn't exist
                        if (e.target.src !== fallbackThumbnail) {
                            e.target.src = fallbackThumbnail;
                        }
                    }}
                />
            ) : (
                <div className="w-full h-full bg-neutral-900" />
            )}

            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/40" />

            {/* Play button */}
            <div
                className="absolute inset-0 flex items-center justify-center cursor-pointer"
                onClick={() => isYoutube && setIsPlaying(true)}
            >
                <div className="w-20 h-20 rounded-full bg-red-600 flex items-center justify-center border-4 border-white/90 transition-all group-hover:scale-110 group-hover:bg-red-500 shadow-2xl">
                    <Play className="w-8 h-8 text-white fill-white ml-1" />
                </div>
            </div>

            {/* Video info - Title is clickable to open on YouTube */}
            <div className="absolute bottom-0 left-0 right-0 p-6">
                <a
                    href={bookmark.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block group/title"
                    onClick={(e) => e.stopPropagation()}
                >
                    <h2 className="text-white text-xl font-bold leading-tight line-clamp-2 mb-2 group-hover/title:text-red-300 transition-colors">
                        {bookmark.title?.replace(/^\(\d+\)\s*/, '').replace(/ - YouTube$/, '')}
                    </h2>
                </a>
                <div className="flex items-center gap-2 text-white/70">
                    <svg className="w-5 h-5 text-red-500" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                    </svg>
                    <span className="text-sm font-medium">YouTube</span>
                    {isYoutube && (
                        <span className="text-xs text-white/50 ml-2">Click to play • Title opens YouTube</span>
                    )}
                </div>
            </div>
        </div>
    );
};

const ArticlePreview = ({ bookmark }) => {
    const [article, setArticle] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [revealed, setRevealed] = useState(false);

    useEffect(() => {
        const fetchArticle = async () => {
            try {
                setLoading(true);
                setError(null);
                setRevealed(false);
                const response = await fetch(`http://127.0.0.1:3000/api/article/extract?url=${encodeURIComponent(bookmark.url)}`);
                if (response.ok) {
                    const data = await response.json();
                    setArticle(data);
                    // Trigger reveal animation after data loads
                    setTimeout(() => setRevealed(true), 100);
                } else {
                    setError('Failed to load article');
                }
            } catch (err) {
                console.error('Article fetch error:', err);
                setError('Failed to load article');
            } finally {
                setLoading(false);
            }
        };

        if (bookmark.url) {
            fetchArticle();
        }
    }, [bookmark.url]);

    if (loading) {
        return <FerrisWheelLoader label="Loading Article" subtitle="FETCHING CONTENT" />;
    }

    if (error || !article) {
        return (
            <div className="h-full bg-gradient-to-br from-neutral-800 to-neutral-900 p-8 flex flex-col justify-center relative">
                <div className="w-16 h-16 rounded-xl bg-white/10 flex items-center justify-center mb-6">
                    <span className="text-4xl">📄</span>
                </div>
                <h2 className="text-3xl font-bold text-white mb-4 leading-tight">{bookmark.title}</h2>
                <p className="text-white/60 text-lg line-clamp-4">{bookmark.notes || bookmark.url}</p>
                <div className="mt-auto pt-8 flex justify-between items-end">
                    <Badge variant="outline" className="text-white border-white/20">{bookmark.category}</Badge>
                    <span className="text-white/40 font-mono text-sm">{new Date(bookmark.createdAt).toLocaleDateString()}</span>
                </div>
            </div>
        );
    }

    const heroImage = article.images?.find(img => img.type === 'hero');

    return (
        <div className="h-full bg-[#1a1a2e] text-neutral-100 relative flex flex-col overflow-hidden">
            {/* Vintage film grain overlay */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none z-50"
                 style={{
                     backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
                 }}
            />

            {/* Reveal animation curtain */}
            <div
                className="absolute inset-0 bg-[#1a1a2e] z-40 pointer-events-none transition-transform duration-1000 ease-out"
                style={{
                    transform: revealed ? 'translateY(-100%)' : 'translateY(0)',
                }}
            >
                {/* Decorative bottom edge like vintage theater curtain */}
                <div className="absolute bottom-0 left-0 right-0 h-8 flex justify-center">
                    {[...Array(20)].map((_, i) => (
                        <div
                            key={i}
                            className="w-8 h-8 rounded-b-full bg-amber-700/50"
                            style={{ marginLeft: i > 0 ? '-4px' : 0 }}
                        />
                    ))}
                </div>
            </div>

            {/* Header with site info */}
            <div className="flex-shrink-0 flex items-center gap-3 px-6 py-4 border-b border-gruvbox-bg-light bg-gruvbox-bg/80 backdrop-blur-sm relative z-10">
                {article.favicon && (
                    <img
                        src={article.favicon}
                        alt=""
                        className="w-5 h-5 rounded"
                        onError={(e) => { e.target.style.display = 'none'; }}
                    />
                )}
                <span className="text-sm font-medium text-gruvbox-teal">{article.siteName}</span>
                {article.author && (
                    <>
                        <span className="text-gruvbox-bg-lighter">•</span>
                        <span className="text-sm text-gruvbox-fg-muted">{article.author}</span>
                    </>
                )}
                {article.publishedDate && (
                    <>
                        <span className="text-gruvbox-bg-lighter">•</span>
                        <span className="text-sm text-gruvbox-fg-dim">
                            {new Date(article.publishedDate).toLocaleDateString(undefined, {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric'
                            })}
                        </span>
                    </>
                )}
            </div>

            {/* Scrollable content */}
            <div className="flex-1 min-h-0 overflow-y-auto relative z-10">
                <div className="max-w-2xl mx-auto px-6 py-8 pb-24">
                    {/* Title - Clickable to original article */}
                    <a
                        href={bookmark.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block group/title cursor-pointer mb-4"
                    >
                        <h1
                            className="text-4xl font-bold leading-tight text-gruvbox-fg group-hover/title:text-gruvbox-teal-light transition-all duration-700"
                            style={{
                                opacity: revealed ? 1 : 0,
                                transform: revealed ? 'translateY(0)' : 'translateY(20px)',
                                fontFamily: 'Georgia, serif',
                            }}
                        >
                            {article.title || bookmark.title}
                        </h1>
                        {/* Click hint */}
                        <div className="flex items-center gap-2 mt-2 text-xs text-gruvbox-fg-muted opacity-0 group-hover/title:opacity-100 transition-opacity">
                            <ExternalLink className="w-3 h-3" />
                            <span>Read full article on {article.siteName}</span>
                        </div>
                    </a>

                    {/* Description/subtitle */}
                    {article.description && (
                        <p
                            className="text-xl text-gruvbox-fg-muted mb-8 leading-relaxed transition-all duration-700 delay-100"
                            style={{
                                opacity: revealed ? 1 : 0,
                                transform: revealed ? 'translateY(0)' : 'translateY(20px)',
                                fontStyle: 'italic',
                            }}
                        >
                            {article.description}
                        </p>
                    )}

                    {/* Hero image - Clickable */}
                    {heroImage && (
                        <a
                            href={bookmark.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block mb-8 -mx-2 overflow-hidden rounded-sm transition-all duration-700 delay-200 group/hero"
                            style={{
                                opacity: revealed ? 1 : 0,
                                transform: revealed ? 'translateY(0)' : 'translateY(20px)',
                                boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
                            }}
                        >
                            <div className="relative">
                                <img
                                    src={heroImage.src}
                                    alt={article.title}
                                    className="w-full h-auto object-cover"
                                    onError={(e) => { e.target.style.display = 'none'; }}
                                />
                                {/* Hover overlay */}
                                <div className="absolute inset-0 bg-black/0 group-hover/hero:bg-black/30 transition-colors flex items-center justify-center">
                                    <div className="opacity-0 group-hover/hero:opacity-100 transition-opacity bg-gruvbox-bg-darkest/80 px-4 py-2 rounded-full flex items-center gap-2">
                                        <ExternalLink className="w-4 h-4 text-gruvbox-teal" />
                                        <span className="text-sm text-gruvbox-fg">View original</span>
                                    </div>
                                </div>
                            </div>
                        </a>
                    )}

                    {/* Article content - rendered in document order */}
                    <div className="space-y-4">
                        {article.content?.length > 0 ? (
                            article.content.map((block, idx) => {
                                const delay = Math.min(300 + idx * 50, 800);

                                if (block.type === 'paragraph') {
                                    return (
                                        <p
                                            key={idx}
                                            className="text-gruvbox-fg/85 leading-relaxed transition-all duration-500"
                                            style={{
                                                opacity: revealed ? 1 : 0,
                                                transform: revealed ? 'translateY(0)' : 'translateY(15px)',
                                                transitionDelay: `${delay}ms`,
                                            }}
                                        >
                                            {block.text}
                                        </p>
                                    );
                                }

                                if (block.type === 'heading') {
                                    const HeadingTag = `h${Math.min(block.level + 1, 6)}`;
                                    return (
                                        <HeadingTag
                                            key={idx}
                                            className="text-gruvbox-teal-light font-bold mt-8 mb-4 transition-all duration-500"
                                            style={{
                                                opacity: revealed ? 1 : 0,
                                                transform: revealed ? 'translateY(0)' : 'translateY(15px)',
                                                transitionDelay: `${delay}ms`,
                                                fontSize: block.level <= 2 ? '1.5rem' : '1.25rem',
                                                fontFamily: 'Georgia, serif',
                                            }}
                                        >
                                            {block.text}
                                        </HeadingTag>
                                    );
                                }

                                if (block.type === 'image') {
                                    return (
                                        <figure
                                            key={idx}
                                            className="my-6 transition-all duration-500"
                                            style={{
                                                opacity: revealed ? 1 : 0,
                                                transform: revealed ? 'translateY(0)' : 'translateY(15px)',
                                                transitionDelay: `${delay}ms`,
                                            }}
                                        >
                                            <div
                                                className="overflow-hidden rounded-sm"
                                                style={{
                                                    boxShadow: '0 4px 15px rgba(0,0,0,0.4)',
                                                }}
                                            >
                                                <img
                                                    src={block.src}
                                                    alt={block.caption || ''}
                                                    className="w-full h-auto object-cover"
                                                    onError={(e) => { e.target.parentElement.parentElement.style.display = 'none'; }}
                                                />
                                            </div>
                                            {block.caption && (
                                                <figcaption className="mt-2 text-sm text-gruvbox-fg-muted italic text-center">
                                                    {block.caption}
                                                </figcaption>
                                            )}
                                        </figure>
                                    );
                                }

                                return null;
                            })
                        ) : (
                            <p className="text-gruvbox-fg-dim italic">
                                No article content could be extracted. Click the link below to read on the original site.
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {/* Read more button - vintage styled */}
            <div
                className="absolute bottom-6 left-6 z-20 transition-all duration-700 delay-500"
                style={{
                    opacity: revealed ? 1 : 0,
                    transform: revealed ? 'translateY(0)' : 'translateY(20px)',
                }}
            >
                <a
                    href={bookmark.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-700 to-amber-600 text-amber-100 rounded transition-all hover:from-amber-600 hover:to-amber-500 hover:scale-105"
                    style={{
                        boxShadow: '0 4px 15px rgba(245, 158, 11, 0.3), inset 0 1px 0 rgba(255,255,255,0.2)',
                        fontFamily: 'Georgia, serif',
                    }}
                >
                    <span className="text-sm font-medium tracking-wide">Read on {article.siteName}</span>
                    <ExternalLink className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                </a>
            </div>

            {/* Decorative corner ornaments */}
            <div className="absolute top-16 left-4 w-8 h-8 border-l-2 border-t-2 border-amber-700/30 pointer-events-none z-10" />
            <div className="absolute top-16 right-4 w-8 h-8 border-r-2 border-t-2 border-amber-700/30 pointer-events-none z-10" />
            <div className="absolute bottom-4 left-4 w-8 h-8 border-l-2 border-b-2 border-amber-700/30 pointer-events-none z-10" />
            <div className="absolute bottom-4 right-4 w-8 h-8 border-r-2 border-b-2 border-amber-700/30 pointer-events-none z-10" />
        </div>
    );
};

const DefaultPreview = ({ bookmark }) => (
    <div className="h-full bg-gradient-to-br from-neutral-800 to-neutral-900 p-8 flex flex-col justify-center relative">
        <div className="w-16 h-16 rounded-xl bg-white/10 flex items-center justify-center mb-6">
            <span className="text-4xl">📄</span>
        </div>
        <h2 className="text-3xl font-bold text-white mb-4 leading-tight">{bookmark.title}</h2>
        <p className="text-white/60 text-lg line-clamp-4">{bookmark.notes || bookmark.url}</p>

        <div className="mt-auto pt-8 flex justify-between items-end">
            <Badge variant="outline" className="text-white border-white/20">{bookmark.category}</Badge>
            <span className="text-white/40 font-mono text-sm">{new Date(bookmark.createdAt).toLocaleDateString()}</span>
        </div>
    </div>
);

// Helper component to render Wikipedia HTML content with clickable links and images
const WikiContent = ({ html, lang, skipMainImage = false }) => {
    if (!html) return null;

    // Process HTML to make links clickable, fix image URLs, and clean up content
    const processHtml = (rawHtml) => {
        let processed = rawHtml;

        // Convert Wikipedia internal links to full URLs that open in new tab
        processed = processed.replace(
            /<a[^>]*href="\.\/([^"]+)"[^>]*>([^<]*)<\/a>/gi,
            (match, path, text) => {
                const fullUrl = `https://${lang}.wikipedia.org/wiki/${path}`;
                return `<a href="${fullUrl}" target="_blank" rel="noopener noreferrer" class="wiki-link">${text}</a>`;
            }
        );

        // Also handle /wiki/ links
        processed = processed.replace(
            /<a[^>]*href="\/wiki\/([^"]+)"[^>]*>([^<]*)<\/a>/gi,
            (match, path, text) => {
                const fullUrl = `https://${lang}.wikipedia.org/wiki/${path}`;
                return `<a href="${fullUrl}" target="_blank" rel="noopener noreferrer" class="wiki-link">${text}</a>`;
            }
        );

        // Fix ALL image src URLs - handle various Wikipedia URL formats
        // Handle protocol-relative URLs (//upload.wikimedia.org)
        processed = processed.replace(
            /src="\/\/([^"]+)"/gi,
            'src="https://$1"'
        );

        // Handle relative /w/ URLs
        processed = processed.replace(
            /src="\/w\/([^"]+)"/gi,
            `src="https://${lang}.wikipedia.org/w/$1"`
        );

        // Handle relative /static/ URLs
        processed = processed.replace(
            /src="\/static\/([^"]+)"/gi,
            `src="https://${lang}.wikipedia.org/static/$1"`
        );

        // CRITICAL: Wikipedia mobile-html uses lazy-load placeholders with <span> instead of <img>
        // Convert these span placeholders to actual img tags
        processed = processed.replace(
            /<span([^>]*class="[^"]*pcs-lazy-load-placeholder[^"]*"[^>]*)>[\s\S]*?<\/span>/gi,
            (match, attrs) => {
                // Extract data-src from attributes
                const dataSrcMatch = attrs.match(/data-src="([^"]+)"/i);
                if (!dataSrcMatch) return match;

                let imgUrl = dataSrcMatch[1];
                // Fix protocol-relative URL
                if (imgUrl.startsWith('//')) {
                    imgUrl = 'https:' + imgUrl;
                }

                // Extract other useful attributes
                const widthMatch = attrs.match(/data-width="(\d+)"/i);
                const heightMatch = attrs.match(/data-height="(\d+)"/i);
                const classMatch = attrs.match(/data-class="([^"]+)"/i);

                const width = widthMatch ? ` width="${widthMatch[1]}"` : '';
                const height = heightMatch ? ` height="${heightMatch[1]}"` : '';
                const imgClass = classMatch ? classMatch[1] : 'mw-file-element';

                return `<img src="${imgUrl}" class="${imgClass}"${width}${height} loading="lazy" />`;
            }
        );

        // Also handle any remaining data-src on img tags
        processed = processed.replace(
            /data-src="([^"]+)"/gi,
            (match, url) => {
                let fixedUrl = url;
                if (url.startsWith('//')) {
                    fixedUrl = 'https:' + url;
                } else if (url.startsWith('/')) {
                    fixedUrl = `https://${lang}.wikipedia.org${url}`;
                }
                return `src="${fixedUrl}"`;
            }
        );

        // Fix srcset URLs - handle all protocol-relative URLs
        processed = processed.replace(
            /srcset="([^"]+)"/gi,
            (match, srcset) => {
                let fixed = srcset;
                // Fix protocol-relative URLs
                fixed = fixed.replace(/\/\/upload\.wikimedia\.org/g, 'https://upload.wikimedia.org');
                fixed = fixed.replace(/\/\/[a-z]+\.wikipedia\.org/g, (m) => 'https:' + m);
                return `srcset="${fixed}"`;
            }
        );

        // Also fix background-image URLs in style attributes
        processed = processed.replace(
            /background-image:\s*url\(['"]?(\/\/[^'")\s]+)['"]?\)/gi,
            (match, url) => `background-image: url('https:${url}')`
        );

        // Add class to figures for styling
        processed = processed.replace(
            /<figure([^>]*)>/gi,
            '<figure$1 class="wiki-figure">'
        );

        // Remove edit links, citation needed, etc.
        processed = processed.replace(/<span class="mw-editsection[^>]*>[\s\S]*?<\/span>/gi, '');
        processed = processed.replace(/\[edit\]/gi, '');
        processed = processed.replace(/\[citation needed\]/gi, '');
        processed = processed.replace(/\[\d+\]/g, ''); // Remove reference numbers

        // Remove infobox from content (displayed separately in sidebar)
        processed = processed.replace(/<table[^>]*class="[^"]*infobox[^"]*"[^>]*>[\s\S]*?<\/table>/gi, '');

        // If skipMainImage is true, remove the first figure (which is typically the same as infobox image)
        if (skipMainImage) {
            // Remove only the FIRST figure element to avoid duplicate with infobox
            processed = processed.replace(/<figure[^>]*>[\s\S]*?<\/figure>/i, '');
        }

        // Remove navboxes, sidebars, and other navigation elements
        processed = processed.replace(/<div[^>]*class="[^"]*navbox[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '');
        processed = processed.replace(/<table[^>]*class="[^"]*navbox[^"]*"[^>]*>[\s\S]*?<\/table>/gi, '');
        processed = processed.replace(/<div[^>]*class="[^"]*sidebar[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '');

        // Remove empty spans and cleanup
        processed = processed.replace(/<span[^>]*>\s*<\/span>/gi, '');

        return processed;
    };

    return (
        <div
            className="wiki-content"
            dangerouslySetInnerHTML={{ __html: processHtml(html) }}
        />
    );
};

const WikiPreview = ({ bookmark }) => {
    // Extract title from URL if possible or use bookmark title
    const title = bookmark.title.replace(' - Wikipedia', '');
    const [wikiData, setWikiData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [revealed, setRevealed] = useState(false);

    // Helper to strip HTML tags from text
    const stripHtml = (html) => {
        if (!html) return '';
        return html.replace(/<[^>]+>/g, '').trim();
    };

    useEffect(() => {
        const fetchWikiData = async () => {
            try {
                setLoading(true);
                setRevealed(false);
                const urlObj = new URL(bookmark.url);
                const pageTitle = urlObj.pathname.split('/wiki/')[1];

                // Detect language from subdomain
                const langMatch = urlObj.hostname.match(/^(\w+)\.wikipedia\.org/);
                const lang = langMatch ? langMatch[1] : 'en';

                if (pageTitle) {
                    const response = await fetch(`http://127.0.0.1:3000/api/wikipedia/article?title=${lang}:${encodeURIComponent(decodeURIComponent(pageTitle))}`);
                    if (response.ok) {
                        const data = await response.json();
                        setWikiData(data);
                        setTimeout(() => setRevealed(true), 100);
                    }
                }
            } catch (error) {
                console.error('Failed to fetch Wiki article:', error);
            } finally {
                setLoading(false);
            }
        };

        if (bookmark.url.includes('wikipedia.org')) {
            fetchWikiData();
        }
    }, [bookmark.url]);

    if (loading) {
        return <FerrisWheelLoader label="Loading Wikipedia" subtitle="FETCHING KNOWLEDGE" />;
    }

    const mainImage = wikiData?.mainImage || bookmark.thumbnail;
    const mainImageCaption = wikiData?.mainImageCaption || '';
    const infobox = wikiData?.infobox;
    const sections = wikiData?.sections || [];
    const lang = wikiData?.lang || 'en';
    const images = wikiData?.images || [];

    return (
        <div className="h-full bg-gruvbox-bg-darkest text-gruvbox-fg relative flex flex-col overflow-hidden">
            {/* Subtle film grain overlay */}
            <div className="absolute inset-0 opacity-[0.02] pointer-events-none z-50"
                 style={{
                     backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
                 }}
            />

            {/* Reveal animation curtain */}
            <div
                className="absolute inset-0 bg-gruvbox-bg-darkest z-40 pointer-events-none transition-transform duration-1000 ease-out"
                style={{
                    transform: revealed ? 'translateY(-100%)' : 'translateY(0)',
                }}
            >
                <div className="absolute bottom-0 left-0 right-0 h-8 flex justify-center">
                    {[...Array(20)].map((_, i) => (
                        <div
                            key={i}
                            className="w-8 h-8 rounded-b-full bg-gruvbox-teal/50"
                            style={{ marginLeft: i > 0 ? '-4px' : 0 }}
                        />
                    ))}
                </div>
            </div>

            {/* Wikipedia-style Header */}
            <div className="flex-shrink-0 flex items-center justify-between px-6 py-3 border-b border-gruvbox-bg-light bg-gruvbox-bg/90 backdrop-blur-sm relative z-10">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-gruvbox-teal/20 flex items-center justify-center border border-gruvbox-teal/30">
                        <span className="text-gruvbox-teal text-sm font-bold" style={{ fontFamily: 'Linux Libertine, Georgia, serif' }}>W</span>
                    </div>
                    <div>
                        <span className="text-lg font-medium text-gruvbox-fg" style={{ fontFamily: 'Linux Libertine, Georgia, serif' }}>Wikipedia</span>
                        <span className="text-xs text-gruvbox-fg-muted ml-2">The Free Encyclopedia</span>
                    </div>
                </div>
                <a
                    href={bookmark.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gruvbox-teal hover:text-gruvbox-teal-light border border-gruvbox-teal/40 rounded hover:bg-gruvbox-teal/10 transition-all"
                >
                    <ExternalLink className="w-3 h-3" />
                    <span>Open in Wikipedia</span>
                </a>
            </div>

            {/* Scrollable Content - Wikipedia Layout */}
            <div className="flex-1 min-h-0 overflow-y-auto relative z-10">
                <div className="px-6 py-6">
                    {/* Title */}
                    <h1
                        className="text-4xl font-normal mb-1 leading-tight text-gruvbox-fg border-b border-gruvbox-bg-light pb-2 transition-all duration-700"
                        style={{
                            opacity: revealed ? 1 : 0,
                            transform: revealed ? 'translateY(0)' : 'translateY(20px)',
                            fontFamily: 'Linux Libertine, Georgia, Times, serif',
                        }}
                    >
                        {stripHtml(wikiData?.displayTitle) || title}
                    </h1>

                    {/* Short description */}
                    {wikiData?.description && (
                        <p
                            className="text-sm text-gruvbox-fg-muted italic mb-4 transition-all duration-700 delay-100"
                            style={{
                                opacity: revealed ? 1 : 0,
                                transform: revealed ? 'translateY(0)' : 'translateY(15px)',
                            }}
                        >
                            {wikiData.description}
                        </p>
                    )}

                    {/* Main content area with floating infobox */}
                    <div className="relative">
                        {/* Infobox - floats right (Wikipedia style) */}
                        {(mainImage || infobox) && (
                            <div
                                className="float-right w-64 ml-6 mb-4 transition-all duration-700 delay-150"
                                style={{
                                    opacity: revealed ? 1 : 0,
                                    transform: revealed ? 'translateX(0)' : 'translateX(20px)',
                                }}
                            >
                                <div
                                    className="bg-gruvbox-bg border border-gruvbox-bg-light rounded overflow-hidden"
                                    style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.3)' }}
                                >
                                    {/* Infobox title */}
                                    <div className="bg-gruvbox-teal/20 px-3 py-2 text-center border-b border-gruvbox-bg-light">
                                        <span className="text-gruvbox-fg font-medium text-sm" style={{ fontFamily: 'Georgia, serif' }}>
                                            {stripHtml(wikiData?.displayTitle) || title}
                                        </span>
                                    </div>

                                    {/* Main image */}
                                    {mainImage && (
                                        <div className="p-2 border-b border-gruvbox-bg-light">
                                            <img
                                                src={mainImage}
                                                alt={title}
                                                className="w-full h-auto rounded-sm"
                                            />
                                            {mainImageCaption && (
                                                <p className="mt-2 text-xs text-gruvbox-fg-muted italic leading-relaxed px-1">
                                                    {mainImageCaption}
                                                </p>
                                            )}
                                        </div>
                                    )}

                                    {/* Infobox properties */}
                                    {infobox && infobox.rows && (
                                        <div className="divide-y divide-gruvbox-bg-light/50">
                                            {infobox.rows.slice(0, 12).map((row, idx) => (
                                                row.type === 'header' ? (
                                                    <div key={idx} className="bg-gruvbox-teal/10 px-3 py-1.5 text-center">
                                                        <span className="text-gruvbox-teal-light text-xs font-medium">{stripHtml(row.text)}</span>
                                                    </div>
                                                ) : (
                                                    <div key={idx} className="flex text-xs">
                                                        <div className="w-24 flex-shrink-0 bg-gruvbox-bg-light/30 px-2 py-1.5 text-gruvbox-fg-muted font-medium">
                                                            {stripHtml(row.label)}
                                                        </div>
                                                        <div className="flex-1 px-2 py-1.5 text-gruvbox-fg/80">
                                                            {stripHtml(row.value)}
                                                        </div>
                                                    </div>
                                                )
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Article content - wraps around infobox */}
                        <div>
                            {/* Lead section / Extract */}
                            <div
                                className="transition-all duration-700 delay-200"
                                style={{
                                    opacity: revealed ? 1 : 0,
                                    transform: revealed ? 'translateY(0)' : 'translateY(15px)',
                                }}
                            >
                                {sections.length > 0 && sections[0]?.html ? (
                                    <WikiContent html={sections[0].html} lang={lang} skipMainImage={!!(mainImage || infobox)} />
                                ) : wikiData?.extract ? (
                                    <p className="text-amber-100/85 leading-relaxed mb-4" style={{ fontFamily: 'Georgia, serif' }}>
                                        {wikiData.extract}
                                    </p>
                                ) : null}
                            </div>

                            {/* Other sections - images are preserved in HTML */}
                            {sections.slice(1).map((section, idx) => (
                                <div
                                    key={section.id}
                                    className="mt-6 transition-all duration-500"
                                    style={{
                                        opacity: revealed ? 1 : 0,
                                        transform: revealed ? 'translateY(0)' : 'translateY(15px)',
                                        transitionDelay: `${300 + idx * 100}ms`,
                                    }}
                                >
                                    {section.title && (
                                        <h2
                                            className={`font-normal text-amber-200 border-b border-amber-800/30 pb-1 mb-3 clear-both ${
                                                section.level <= 2 ? 'text-2xl' : 'text-xl'
                                            }`}
                                            style={{ fontFamily: 'Linux Libertine, Georgia, serif' }}
                                        >
                                            {section.title}
                                        </h2>
                                    )}
                                    <WikiContent html={section.html} lang={lang} />
                                </div>
                            ))}

                            {/* Image Gallery - All images from media list */}
                            {images.length > 0 && (
                                <div
                                    className="mt-8 pt-6 border-t border-amber-800/30 transition-all duration-700"
                                    style={{
                                        opacity: revealed ? 1 : 0,
                                        transform: revealed ? 'translateY(0)' : 'translateY(15px)',
                                        transitionDelay: '500ms',
                                    }}
                                >
                                    <h2
                                        className="text-2xl font-normal text-amber-200 border-b border-amber-800/30 pb-1 mb-4"
                                        style={{ fontFamily: 'Linux Libertine, Georgia, serif' }}
                                    >
                                        Images
                                    </h2>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                        {images.map((img, idx) => (
                                            <figure
                                                key={idx}
                                                className="bg-[#16213e]/60 border border-amber-800/30 rounded overflow-hidden transition-all duration-300 hover:border-amber-600/50"
                                                style={{
                                                    boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                                                    opacity: revealed ? 1 : 0,
                                                    transform: revealed ? 'translateY(0)' : 'translateY(10px)',
                                                    transitionDelay: `${550 + idx * 50}ms`,
                                                }}
                                            >
                                                <div className="aspect-video overflow-hidden">
                                                    <img
                                                        src={img.src}
                                                        alt={img.caption || img.title || ''}
                                                        className="w-full h-full object-cover"
                                                        style={{ filter: 'sepia(5%) contrast(1.02)' }}
                                                        onError={(e) => { e.target.parentElement.parentElement.style.display = 'none'; }}
                                                        loading="lazy"
                                                    />
                                                </div>
                                                {img.caption && (
                                                    <figcaption className="p-2 text-xs text-amber-500/70 italic line-clamp-2">
                                                        {img.caption}
                                                    </figcaption>
                                                )}
                                            </figure>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Clear float */}
                        <div className="clear-both" />
                    </div>
                </div>
            </div>

            {/* CSS for wiki content styling */}
            <style>{`
                .wiki-content {
                    font-family: Georgia, 'Times New Roman', serif;
                    font-size: 0.95rem;
                    line-height: 1.7;
                    color: rgba(251, 191, 36, 0.85);
                }
                .wiki-content p {
                    margin-bottom: 1rem;
                }
                .wiki-content .wiki-link {
                    color: #60a5fa;
                    text-decoration: none;
                    border-bottom: 1px solid transparent;
                    transition: all 0.2s;
                }
                .wiki-content .wiki-link:hover {
                    color: #93c5fd;
                    border-bottom-color: #93c5fd;
                }
                .wiki-content b, .wiki-content strong {
                    color: rgba(251, 191, 36, 1);
                    font-weight: 600;
                }
                .wiki-content ul, .wiki-content ol {
                    margin: 0.75rem 0;
                    padding-left: 1.5rem;
                }
                .wiki-content li {
                    margin-bottom: 0.25rem;
                }
                .wiki-content h3, .wiki-content h4 {
                    color: rgba(253, 230, 138, 0.9);
                    font-family: 'Linux Libertine', Georgia, serif;
                    margin-top: 1.5rem;
                    margin-bottom: 0.5rem;
                }
                /* Wikipedia-style figure/image styling */
                .wiki-content figure,
                .wiki-content .wiki-figure,
                .wiki-content .thumb {
                    float: right;
                    clear: right;
                    margin: 0.5rem 0 1rem 1.5rem;
                    max-width: 280px;
                    background: rgba(22, 33, 62, 0.6);
                    border: 1px solid rgba(245, 158, 11, 0.3);
                    border-radius: 4px;
                    padding: 6px;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                }
                .wiki-content figure img,
                .wiki-content .wiki-figure img,
                .wiki-content .thumb img {
                    max-width: 100%;
                    height: auto;
                    display: block;
                    border-radius: 2px;
                    filter: sepia(5%) contrast(1.02);
                }
                .wiki-content figcaption,
                .wiki-content .thumbcaption {
                    font-size: 0.8rem;
                    color: rgba(251, 191, 36, 0.7);
                    padding: 6px 4px 2px;
                    line-height: 1.4;
                    font-style: italic;
                }
                /* Handle left-aligned images */
                .wiki-content figure.mw-halign-left,
                .wiki-content .tleft {
                    float: left;
                    margin: 0.5rem 1.5rem 1rem 0;
                }
                /* Handle centered images */
                .wiki-content figure.mw-halign-center {
                    float: none;
                    margin: 1rem auto;
                    display: block;
                }
                /* Gallery styling */
                .wiki-content .gallery {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 8px;
                    margin: 1rem 0;
                    clear: both;
                }
                .wiki-content .gallery .gallerybox {
                    flex: 0 0 auto;
                    max-width: 180px;
                }
                /* Clear floats after sections */
                .wiki-content::after {
                    content: '';
                    display: table;
                    clear: both;
                }
                /* Ensure all images are visible */
                .wiki-content img {
                    max-width: 100%;
                    height: auto;
                    display: block;
                }
                /* Handle various Wikipedia image wrapper classes */
                .wiki-content .mw-file-element,
                .wiki-content .mw-file-description {
                    display: block;
                }
                .wiki-content .thumbinner {
                    background: rgba(22, 33, 62, 0.6);
                    border: 1px solid rgba(245, 158, 11, 0.3);
                    border-radius: 4px;
                    padding: 6px;
                    max-width: 280px;
                }
                .wiki-content .thumbimage {
                    border-radius: 2px;
                }
                /* Handle noresize and other image classes */
                .wiki-content .noresize img,
                .wiki-content .mw-default-size img {
                    max-width: 280px;
                }
                /* Lazy loaded image placeholders */
                .wiki-content .lazy-image-placeholder {
                    background: rgba(245, 158, 11, 0.1);
                    min-height: 100px;
                }
                /* Remove any hidden attributes that might hide images */
                .wiki-content [hidden] {
                    display: block !important;
                }
                .wiki-content .noviewer {
                    display: block;
                }
            `}</style>

            {/* Decorative corner ornaments */}
            <div className="absolute top-14 left-4 w-6 h-6 border-l-2 border-t-2 border-amber-700/20 pointer-events-none z-10" />
            <div className="absolute top-14 right-4 w-6 h-6 border-r-2 border-t-2 border-amber-700/20 pointer-events-none z-10" />
            <div className="absolute bottom-4 left-4 w-6 h-6 border-l-2 border-b-2 border-amber-700/20 pointer-events-none z-10" />
            <div className="absolute bottom-4 right-4 w-6 h-6 border-r-2 border-b-2 border-amber-700/20 pointer-events-none z-10" />
        </div>
    );
};

// Humorous placeholder options for the title field
const TITLE_PLACEHOLDERS = [
    "Give me a name, I'm feeling anonymous...",
    "Title goes here (or doesn't, I'm not your boss)",
    "Name me like one of your French bookmarks",
    "Untitled masterpiece awaits...",
    "This bookmark deserves a name, don't you think?",
    "Insert witty title here",
    "What shall we call this treasure?",
    "A title would be nice, just saying...",
    "Name pending... forever?",
    "Title loading... just kidding, you have to type it",
    "Bookmark #4,827 (or give me a real name)",
    "Your future self will thank you for a title",
    "Don't leave me nameless!",
    "Title TBD (To Be Determined... by you)",
    "I'm too pretty to be untitled",
    "Help, I need a title!",
    "Insert creative title here",
    "What's in a name? Everything.",
    "Title or it didn't happen",
    "Nameless but not shameless",
    "Waiting for inspiration...",
    "Title goes brrr...",
    "This space intentionally left blank",
    "Error 404: Title not found",
    "Loading title.exe...",
    "Your ad here (just kidding, add a title)",
    "Roses are red, this needs a title",
    "Keep calm and add a title",
    "Plot twist: add a title",
    "Title-less in Seattle",
    "To title or not to title...",
    "Once upon a title...",
    "Breaking: Bookmark still untitled",
    "Title.mp3 not found",
    "My name is... (what?)",
    "Spoiler alert: needs a title",
    "Coming soon: a great title",
    "Title under construction",
    "May the title be with you",
    "Winter is coming... add a title",
    "In a galaxy without a title...",
    "Houston, we need a title",
    "I'll be back... with a title hopefully",
    "You shall not pass... without a title",
    "Why so titleless?",
    "One does not simply skip the title",
    "I am inevitable... but my title isn't",
    "Reality can be whatever you title it",
    "It's a bird! It's a plane! It's... untitled",
    "Title machine broke",
    "Achievement unlocked: Add a title",
    "Press F to add title",
    "Ctrl+T for title (not really)",
    "No title gang",
    "Professional bookmark, casual title",
    "This bookmark is mint, title is... not",
];

const getRandomPlaceholder = () => {
    return TITLE_PLACEHOLDERS[Math.floor(Math.random() * TITLE_PLACEHOLDERS.length)];
};

const BookmarkDetail = ({ bookmark, open, onOpenChange, onSave }) => {
    const [formData, setFormData] = useState({
        title: '',
        category: '',
        tags: '',
        notes: ''
    });
    const [titlePlaceholder, setTitlePlaceholder] = useState(getRandomPlaceholder());
    const [saving, setSaving] = useState(false);
    const [showCloseHint, setShowCloseHint] = useState(false);
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const contentRef = useRef(null);
    const isInDangerZone = useRef(false);
    const notesTextareaRef = useRef(null);
    const formContainerRef = useRef(null);
    const notesContainerRef = useRef(null);

    // Auto-resize notes textarea to expand as user types, up to the save button
    const autoResizeNotes = useCallback(() => {
        const textarea = notesTextareaRef.current;
        const formContainer = formContainerRef.current;

        if (!textarea || !formContainer) return;

        // Temporarily set height to auto to measure content
        const prevHeight = textarea.style.height;
        textarea.style.height = 'auto';

        // Get the natural content height
        const contentHeight = textarea.scrollHeight;

        // Get positions
        const formRect = formContainer.getBoundingClientRect();
        const textareaRect = textarea.getBoundingClientRect();

        // Calculate space from current textarea top to bottom of form container
        // Subtract space for the button area (buttons + padding + border = ~75px)
        const buttonAreaSpace = 75;
        const spaceFromTopToFormBottom = formRect.bottom - textareaRect.top - buttonAreaSpace;

        // The maximum height the textarea can be
        const maxHeight = Math.max(100, spaceFromTopToFormBottom);

        // Use content height if it fits, otherwise cap at max
        const minHeight = 100;
        let newHeight;

        if (contentHeight <= minHeight) {
            newHeight = minHeight;
        } else if (contentHeight >= maxHeight) {
            newHeight = maxHeight;
        } else {
            newHeight = contentHeight;
        }

        textarea.style.height = `${newHeight}px`;
    }, []);

    // Update form when bookmark changes
    // Title starts empty - user can add custom title if they want
    useEffect(() => {
        if (bookmark) {
            setFormData({
                title: bookmark.customTitle || '',
                category: bookmark.category || '',
                tags: bookmark.tags?.join(', ') || '',
                notes: bookmark.notes || ''
            });
        }
    }, [bookmark]);

    // Show close hint briefly when dialog opens and get new random placeholder
    useEffect(() => {
        if (open) {
            setShowCloseHint(true);
            setOffset({ x: 0, y: 0 });
            setTitlePlaceholder(getRandomPlaceholder());
            const timer = setTimeout(() => setShowCloseHint(false), 3000);
            // Trigger auto-resize after dialog opens (with delay for layout to settle)
            const resizeTimer = setTimeout(autoResizeNotes, 150);
            return () => {
                clearTimeout(timer);
                clearTimeout(resizeTimer);
            };
        }
    }, [open, autoResizeNotes]);

    // Auto-resize on window resize
    useEffect(() => {
        if (!open) return;

        const handleResize = () => autoResizeNotes();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [open, autoResizeNotes]);

    const handleSave = async () => {
        if (!bookmark) return;

        setSaving(true);
        try {
            const updatedBookmark = {
                ...bookmark,
                customTitle: formData.title || '',
                category: formData.category,
                tags: formData.tags.split(',').map(t => t.trim()).filter(t => t),
                notes: formData.notes
            };

            const response = await fetch(`http://127.0.0.1:3000/api/bookmarks/${bookmark.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedBookmark)
            });

            if (response.ok) {
                if (onSave) onSave(await response.json());
                onOpenChange(false);
            }
        } catch (error) {
            console.error('Error saving bookmark:', error);
        } finally {
            setSaving(false);
        }
    };

    // Handle mouse movement to create the "dodge" effect
    const handleMouseMove = (e) => {
        if (!contentRef.current || !open) return;

        const rect = contentRef.current.getBoundingClientRect();
        const dangerZoneSize = 80; // pixels around the card that trigger the dodge
        const maxOffset = 12; // maximum dodge distance in pixels

        const mouseX = e.clientX;
        const mouseY = e.clientY;

        // Check if mouse is over the card itself
        const isOverCard = (
            mouseX >= rect.left &&
            mouseX <= rect.right &&
            mouseY >= rect.top &&
            mouseY <= rect.bottom
        );

        if (isOverCard) {
            // Mouse is over the card, return to center
            if (isInDangerZone.current) {
                isInDangerZone.current = false;
                setOffset({ x: 0, y: 0 });
            }
            return;
        }

        // Check if mouse is in the "danger zone" (close to the card edges)
        const isNearTop = mouseY < rect.top && mouseY > rect.top - dangerZoneSize;
        const isNearBottom = mouseY > rect.bottom && mouseY < rect.bottom + dangerZoneSize;
        const isNearLeft = mouseX < rect.left && mouseX > rect.left - dangerZoneSize;
        const isNearRight = mouseX > rect.right && mouseX < rect.right + dangerZoneSize;

        // Also check vertical/horizontal alignment for corner cases
        const isVerticallyAligned = mouseY >= rect.top - dangerZoneSize && mouseY <= rect.bottom + dangerZoneSize;
        const isHorizontallyAligned = mouseX >= rect.left - dangerZoneSize && mouseX <= rect.right + dangerZoneSize;

        let newOffsetX = 0;
        let newOffsetY = 0;

        // Calculate dodge based on which edge the mouse is near
        if (isNearTop && isHorizontallyAligned) {
            // Mouse approaching from top - card slides down
            const proximity = 1 - (rect.top - mouseY) / dangerZoneSize;
            newOffsetY = maxOffset * Math.min(1, proximity);
            setShowCloseHint(true);
        }
        if (isNearBottom && isHorizontallyAligned) {
            // Mouse approaching from bottom - card slides up
            const proximity = 1 - (mouseY - rect.bottom) / dangerZoneSize;
            newOffsetY = -maxOffset * Math.min(1, proximity);
            setShowCloseHint(true);
        }
        if (isNearLeft && isVerticallyAligned) {
            // Mouse approaching from left - card slides right
            const proximity = 1 - (rect.left - mouseX) / dangerZoneSize;
            newOffsetX = maxOffset * Math.min(1, proximity);
            setShowCloseHint(true);
        }
        if (isNearRight && isVerticallyAligned) {
            // Mouse approaching from right - card slides left
            const proximity = 1 - (mouseX - rect.right) / dangerZoneSize;
            newOffsetX = -maxOffset * Math.min(1, proximity);
            setShowCloseHint(true);
        }

        const inDangerZone = (isNearTop || isNearBottom || isNearLeft || isNearRight) &&
            (isVerticallyAligned || isHorizontallyAligned);

        if (inDangerZone) {
            isInDangerZone.current = true;
            setOffset({ x: newOffsetX, y: newOffsetY });
        } else if (isInDangerZone.current) {
            // Mouse left the danger zone, return to center
            isInDangerZone.current = false;
            setOffset({ x: 0, y: 0 });
            setTimeout(() => setShowCloseHint(false), 1000);
        }
    };

    // Reset offset when mouse leaves the window
    const handleMouseLeave = () => {
        isInDangerZone.current = false;
        setOffset({ x: 0, y: 0 });
    };

    if (!bookmark) return null;

    const isWiki = bookmark.url?.includes('wikipedia.org');

    const isArticle = bookmark.category === 'Article' ||
                      bookmark.subCategory === 'article' ||
                      bookmark.subCategory === 'webpage' ||
                      (!bookmark.url?.includes('x.com') &&
                       !bookmark.url?.includes('twitter.com') &&
                       !bookmark.url?.includes('youtube') &&
                       !bookmark.url?.includes('wikipedia.org'));

    const renderPreview = () => {
        const type = bookmark.subCategory || bookmark.category;
        if (isWiki) {
            return <WikiPreview bookmark={bookmark} />;
        }
        if (type?.includes('tweet') || bookmark.url?.includes('x.com') || bookmark.url?.includes('twitter.com')) {
            return <TweetPreview bookmark={bookmark} />;
        }
        if (type?.includes('video') || bookmark.url?.includes('youtube')) {
            return <VideoPreview bookmark={bookmark} />;
        }
        // Use ArticlePreview for articles/webpages
        if (isArticle) {
            return <ArticlePreview bookmark={bookmark} />;
        }
        return <DefaultPreview bookmark={bookmark} />;
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            {/* Custom overlay with mouse tracking */}
            <div
                className="fixed inset-0 z-50 bg-black/80"
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
                style={{ display: open ? 'block' : 'none' }}
            />

            {/* Close hint indicator */}
            <div
                className={`fixed top-6 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white/70 text-sm transition-all duration-500 ${
                    showCloseHint ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'
                }`}
                style={{ display: open ? 'flex' : 'none' }}
            >
                <ChevronUp className="w-4 h-4 animate-bounce" />
                <span>Click outside to close</span>
            </div>

            <DialogContent
                ref={contentRef}
                className="max-w-none w-[92vw] h-[90vh] max-h-[950px] p-0 overflow-hidden bg-background border-border rounded-2xl"
                style={{
                    transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))`,
                    transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
                }}
            >

                <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr] h-full overflow-hidden">

                    {/* Left: Preview */}
                    <div className="h-full overflow-hidden flex flex-col">
                        <div className="flex-1 overflow-y-auto min-h-0">
                            {renderPreview()}
                        </div>
                    </div>

                    {/* Right: Edit Form */}
                    <div ref={formContainerRef} className="p-6 flex flex-col h-full overflow-hidden bg-gruvbox-bg-light/50">
                        <div className="space-y-4 flex-1 flex flex-col min-h-0">
                            {/* Title Input with Link Button */}
                            <div className="relative">
                                <div className="flex items-start gap-3">
                                    <input
                                        id="title"
                                        type="text"
                                        value={formData.title}
                                        onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                                        placeholder={titlePlaceholder}
                                        autoComplete="off"
                                        spellCheck="false"
                                        className="flex-1"
                                        style={{
                                            fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
                                            fontStyle: 'normal',
                                            fontSize: '1.25rem',
                                            fontWeight: 500,
                                            color: '#ebdbb2',
                                            caretColor: '#fabd2f',
                                            background: 'none',
                                            border: 'none',
                                            borderRadius: 0,
                                            outline: 'none',
                                            boxShadow: 'none',
                                            padding: 0,
                                            margin: 0,
                                            width: '100%',
                                            WebkitAppearance: 'none',
                                            MozAppearance: 'none',
                                            appearance: 'none'
                                        }}
                                    />
                                </div>
                                {/* Creation date underneath title */}
                                <p className="text-xs text-gruvbox-fg-muted mt-3">
                                    Added {new Date(bookmark.createdAt).toLocaleDateString([], { year: 'numeric', month: 'long', day: 'numeric' })}
                                </p>

                                {/* Visit Original Link Button - Prominent */}
                                <a
                                    href={bookmark.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="group flex items-center gap-3 mt-4 px-4 py-3 rounded-xl bg-gradient-to-r from-gruvbox-teal/10 to-gruvbox-aqua/10 border border-gruvbox-teal/30 hover:border-gruvbox-teal/60 hover:from-gruvbox-teal/20 hover:to-gruvbox-aqua/20 transition-all duration-300"
                                >
                                    <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gruvbox-teal/20 flex items-center justify-center group-hover:bg-gruvbox-teal/30 transition-colors">
                                        <ExternalLink className="w-5 h-5 text-gruvbox-teal" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-gruvbox-fg group-hover:text-gruvbox-teal-light transition-colors">
                                            Visit Original
                                        </p>
                                        <p className="text-xs text-gruvbox-fg-muted truncate">
                                            {bookmark.url ? new URL(bookmark.url).hostname.replace('www.', '') : ''}
                                        </p>
                                    </div>
                                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gruvbox-teal/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transform translate-x-2 group-hover:translate-x-0 transition-all duration-300">
                                        <svg className="w-4 h-4 text-gruvbox-teal" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                        </svg>
                                    </div>
                                </a>
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="category" className="text-gruvbox-fg-muted text-xs uppercase tracking-wider">Category</Label>
                                <Select
                                    value={formData.category}
                                    onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
                                >
                                    <SelectTrigger className="bg-gruvbox-bg/60 border-gruvbox-bg-lighter/60 text-gruvbox-fg">
                                        <SelectValue placeholder="Select category" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-gruvbox-bg border-gruvbox-bg-lighter">
                                        <SelectItem value="X">X (Tweet/Thread)</SelectItem>
                                        <SelectItem value="Instagram">Instagram</SelectItem>
                                        <SelectItem value="Substack">Substack</SelectItem>
                                        <SelectItem value="YouTube">YouTube</SelectItem>
                                        <SelectItem value="Wikipedia">Wikipedia</SelectItem>
                                        <SelectItem value="GitHub">GitHub</SelectItem>
                                        <SelectItem value="Reddit">Reddit</SelectItem>
                                        <SelectItem value="Medium">Medium</SelectItem>
                                        <SelectItem value="LinkedIn">LinkedIn</SelectItem>
                                        <SelectItem value="TikTok">TikTok</SelectItem>
                                        <SelectItem value="Article">Article/Webpage</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-gruvbox-fg-muted text-xs uppercase tracking-wider">Tags</Label>
                                {/* Tag columns with horizontal scroll */}
                                <TagColumnsContainer
                                    tags={formData.tags}
                                    onRemoveTag={(idx) => {
                                        const tagsList = formData.tags.split(',').map(t => t.trim()).filter(t => t);
                                        const filtered = tagsList.filter((_, i) => i !== idx);
                                        setFormData(prev => ({ ...prev, tags: filtered.join(', ') }));
                                    }}
                                    onAddTag={(newTag) => {
                                        const currentTags = formData.tags ? formData.tags.split(',').map(t => t.trim()).filter(t => t) : [];
                                        if (!currentTags.includes(newTag)) {
                                            setFormData(prev => ({
                                                ...prev,
                                                tags: [...currentTags, newTag].join(', ')
                                            }));
                                        }
                                    }}
                                />
                            </div>

                            <div ref={notesContainerRef} className="space-y-1.5 flex-1 flex flex-col min-h-0">
                                <Label htmlFor="notes" className="text-gruvbox-fg-muted text-xs uppercase tracking-wider flex-shrink-0">Notes</Label>
                                <textarea
                                    ref={notesTextareaRef}
                                    id="notes"
                                    value={formData.notes}
                                    onChange={(e) => {
                                        setFormData(prev => ({ ...prev, notes: e.target.value }));
                                        // Trigger resize on next frame to ensure state is updated
                                        requestAnimationFrame(autoResizeNotes);
                                    }}
                                    placeholder="Add your notes here..."
                                    className="w-full rounded-md border border-gruvbox-bg-lighter/60 bg-gruvbox-bg/60 px-3 py-2 text-sm text-gruvbox-fg placeholder:text-gruvbox-fg-muted/50 focus:outline-none focus:border-gruvbox-yellow/40 transition-colors"
                                    style={{
                                        minHeight: '100px',
                                        resize: 'none',
                                        overflow: 'auto'
                                    }}
                                />
                            </div>
                        </div>

                        <div className="pt-4 flex justify-end gap-3 border-t border-gruvbox-bg-lighter/40 mt-auto flex-shrink-0">
                            <button
                                className="px-4 py-2 text-sm font-medium text-gruvbox-fg-muted hover:text-gruvbox-fg transition-colors"
                                onClick={() => onOpenChange(false)}
                            >
                                Cancel
                            </button>
                            <div className="creepy-btn-small">
                                <CreepyButton onClick={handleSave} disabled={saving}>
                                    {saving ? 'Saving...' : 'Save Changes'}
                                </CreepyButton>
                            </div>
                        </div>
                    </div>

                </div>
            </DialogContent>
        </Dialog>
    );
};

export default BookmarkDetail;
