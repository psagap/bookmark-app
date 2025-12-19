import React, { useState, useEffect, useRef } from 'react';
import { Trash2, FolderPlus, X, CheckSquare } from 'lucide-react';

// Animated counter component
const AnimatedCounter = ({ value }) => {
  const [displayValue, setDisplayValue] = useState(value);
  const [isAnimating, setIsAnimating] = useState(false);
  const prevValue = useRef(value);

  useEffect(() => {
    if (value !== prevValue.current) {
      setIsAnimating(true);
      // Small delay for the animation
      const timeout = setTimeout(() => {
        setDisplayValue(value);
        setIsAnimating(false);
      }, 50);
      prevValue.current = value;
      return () => clearTimeout(timeout);
    }
  }, [value]);

  return (
    <span
      className={`inline-flex items-center justify-center min-w-[2ch] transition-all duration-200 ${
        isAnimating ? 'scale-125 text-gruvbox-yellow' : 'scale-100'
      }`}
    >
      {displayValue}
    </span>
  );
};

const SelectionToolbar = ({
  selectedCount,
  totalCount,
  onSelectAll,
  onClearSelection,
  onDelete,
  onAddToCollection
}) => {
  return (
    <div className="sticky top-0 z-40 mx-6 mb-5 animate-in slide-in-from-top-4 fade-in duration-300">
      <div className="relative">
        {/* Glow effect */}
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-gruvbox-yellow/20 via-gruvbox-orange/10 to-gruvbox-yellow/20 blur-xl opacity-60" />

        {/* Main toolbar */}
        <div className="relative bg-gruvbox-bg-light/90 backdrop-blur-xl border border-gruvbox-yellow/20 rounded-2xl px-5 py-3.5 shadow-2xl shadow-gruvbox-bg-darkest/60">
          <div className="flex items-center justify-between">
            {/* Left side - selection info */}
            <div className="flex items-center gap-4">
              <button
                onClick={onClearSelection}
                className="relative p-2 rounded-xl overflow-hidden group"
                title="Cancel selection (Esc)"
              >
                <div className="absolute inset-0 bg-gruvbox-bg-lighter/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                <X className="relative w-5 h-5 text-gruvbox-fg-muted group-hover:text-gruvbox-fg transition-colors" />
              </button>

              {/* Live counter badge */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 bg-gruvbox-yellow/15 px-3 py-1.5 rounded-lg border border-gruvbox-yellow/30">
                  <div className="w-2 h-2 rounded-full bg-gruvbox-yellow animate-pulse" />
                  <span className="text-gruvbox-fg font-bold text-lg tabular-nums">
                    <AnimatedCounter value={selectedCount} />
                  </span>
                </div>
                <span className="text-gruvbox-fg-muted text-sm">
                  of {totalCount} selected
                </span>
              </div>

              {selectedCount < totalCount && (
                <button
                  onClick={onSelectAll}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-gruvbox-yellow-light/80 hover:text-gruvbox-yellow hover:bg-gruvbox-yellow/10 transition-all duration-200"
                >
                  <CheckSquare className="w-3.5 h-3.5" />
                  <span>Select all</span>
                </button>
              )}
            </div>

            {/* Right side - actions */}
            <div className="flex items-center gap-3">
              <button
                onClick={onAddToCollection}
                className="relative group flex items-center gap-2.5 px-4 py-2.5 rounded-xl overflow-hidden"
              >
                <div className="absolute inset-0 bg-gruvbox-aqua/15 group-hover:bg-gruvbox-aqua/25 transition-colors duration-200" />
                <div className="absolute inset-0 border border-gruvbox-aqua/30 rounded-xl" />
                <FolderPlus className="relative w-4 h-4 text-gruvbox-aqua-light" />
                <span className="relative text-sm font-medium text-gruvbox-aqua-light">Add to Side</span>
              </button>

              <button
                onClick={onDelete}
                className="relative group flex items-center gap-2.5 px-4 py-2.5 rounded-xl overflow-hidden"
              >
                <div className="absolute inset-0 bg-gruvbox-red/15 group-hover:bg-gruvbox-red/25 transition-colors duration-200" />
                <div className="absolute inset-0 border border-gruvbox-red/30 rounded-xl" />
                <Trash2 className="relative w-4 h-4 text-gruvbox-red-light" />
                <span className="relative text-sm font-medium text-gruvbox-red-light">Delete</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SelectionToolbar;
