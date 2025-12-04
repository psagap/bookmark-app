import React from 'react';
import { Play, ExternalLink, BadgeCheck, Video } from 'lucide-react';

/**
 * Custom Tweet Card Component
 * Renders tweets natively without Twitter widget for consistent styling
 */

const XLogo = ({ className }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const formatCount = (count) => {
  if (!count) return '';
  const num = parseInt(count.replace(/[^0-9]/g, ''));
  if (isNaN(num)) return count;
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
};

const TweetMedia = ({ media, url, onMediaClick }) => {
  if (!media || media.length === 0) return null;

  // Get the first media item (respect the order from the tweet)
  const firstMedia = media[0];
  if (!firstMedia) return null;

  // If first media is a video
  if (firstMedia.type === 'video') {
    const posterUrl = firstMedia.poster || firstMedia.thumbnail;
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="block mt-3 group"
      >
        <div className="relative rounded-xl overflow-hidden bg-gruvbox-bg-darkest">
          {/* Video thumbnail or placeholder */}
          {posterUrl ? (
            <img
              src={posterUrl}
              alt=""
              className="w-full aspect-video object-cover opacity-80 group-hover:opacity-100 transition-opacity"
            />
          ) : (
            <div className="w-full aspect-video bg-gruvbox-bg-darker flex items-center justify-center">
              <Video className="w-16 h-16 text-gruvbox-fg-muted/40" />
            </div>
          )}
          {/* Play overlay */}
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 group-hover:bg-black/30 transition-colors">
            <div className="w-14 h-14 rounded-full bg-gruvbox-bg-light/90 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <Play className="w-6 h-6 text-gruvbox-fg ml-1" fill="currentColor" />
            </div>
            <p className="text-gruvbox-fg text-sm font-medium px-4 text-center">
              Videos are shy here — tap to watch on X
            </p>
          </div>
        </div>
      </a>
    );
  }

  // First media is an image - show it as cover
  if (firstMedia.type === 'image' && firstMedia.url) {
    return (
      <div className="mt-3 rounded-xl overflow-hidden bg-gruvbox-bg-darkest">
        <img
          src={firstMedia.url}
          alt=""
          className="w-full aspect-video object-cover cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            onMediaClick?.(firstMedia.url);
          }}
        />
      </div>
    );
  }

  return null;
};

const CustomTweetCard = ({
  tweetData,
  url,
  onMediaClick,
  className = ''
}) => {
  if (!tweetData) return null;

  const {
    authorName,
    authorHandle,
    authorAvatar,
    isVerified,
    tweetText,
    tweetDate,
    tweetMedia,
    likeCount,
    retweetCount,
    replyCount,
    viewCount
  } = tweetData;

  // Clean up tweet text - remove t.co links at end
  const cleanText = tweetText?.replace(/https:\/\/t\.co\/\w+\s*$/g, '').trim() || '';

  return (
    <div className={`bg-gruvbox-bg-light rounded-xl border border-gruvbox-bg-lighter overflow-hidden ${className}`}>
      {/* Header */}
      <div className="p-4 pb-0">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            {/* Avatar */}
            <div className="w-10 h-10 rounded-full overflow-hidden bg-gruvbox-bg-lighter flex-shrink-0">
              {authorAvatar ? (
                <img
                  src={authorAvatar.replace('_bigger', '_normal')}
                  alt={authorName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gruvbox-fg-muted">
                  {authorName?.[0] || 'X'}
                </div>
              )}
            </div>

            {/* Author info */}
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1">
                <span className="font-semibold text-gruvbox-fg truncate text-sm">
                  {authorName}
                </span>
                {isVerified && (
                  <BadgeCheck className="w-4 h-4 text-[#1d9bf0] flex-shrink-0" fill="#1d9bf0" stroke="white" strokeWidth={2} />
                )}
              </div>
              <span className="text-gruvbox-fg-muted text-sm truncate">
                {authorHandle}
              </span>
            </div>
          </div>

          {/* X Logo */}
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-gruvbox-fg-muted hover:text-gruvbox-fg transition-colors"
          >
            <XLogo className="w-5 h-5" />
          </a>
        </div>

        {/* Tweet text */}
        {cleanText && (
          <p className="mt-3 text-gruvbox-fg text-[15px] leading-relaxed whitespace-pre-wrap">
            {cleanText}
          </p>
        )}
      </div>

      {/* Media */}
      <div className="px-4">
        <TweetMedia media={tweetMedia} url={url} onMediaClick={onMediaClick} />
      </div>

      {/* Timestamp & Stats Footer */}
      <div className="px-4 py-3 mt-1 overflow-hidden">
        <div className="flex items-center justify-between gap-2">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-gruvbox-fg-muted text-sm hover:underline truncate"
          >
            {tweetDate && new Date(tweetDate).toLocaleString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
              hour12: true,
              month: 'short',
              day: 'numeric',
              year: 'numeric'
            })}
          </a>

          {/* View on X button - uses universal pill style */}
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="pill-interactive flex-shrink-0"
          >
            <span>View on</span>
            <XLogo className="w-3 h-3" />
          </a>
        </div>
      </div>

      {/* Engagement stats - simplified (no view count) */}
      {(likeCount || retweetCount) && (
        <div className="px-4 py-2.5 border-t border-gruvbox-bg-lighter/60 bg-gruvbox-bg/30">
          <div className="flex items-center gap-4 text-xs">
            {retweetCount && (
              <span className="text-gruvbox-fg-muted">
                <span className="font-semibold text-gruvbox-fg">{formatCount(retweetCount)}</span> reposts
              </span>
            )}
            {likeCount && (
              <span className="text-gruvbox-fg-muted">
                <span className="font-semibold text-gruvbox-fg">{formatCount(likeCount)}</span> likes
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomTweetCard;
