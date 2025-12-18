import React from 'react';
import { Trash2, FolderPlus, X, CheckSquare } from 'lucide-react';

const SelectionToolbar = ({
  selectedCount,
  totalCount,
  onSelectAll,
  onClearSelection,
  onDelete,
  onAddToCollection
}) => {
  return (
    <div className="sticky top-0 z-40 mx-6 mb-5">
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
              >
                <div className="absolute inset-0 bg-gruvbox-bg-lighter/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                <X className="relative w-5 h-5 text-gruvbox-fg-muted group-hover:text-gruvbox-fg transition-colors" />
              </button>

              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-gruvbox-yellow animate-pulse" />
                <span className="text-gruvbox-fg font-medium">
                  {selectedCount} <span className="text-gruvbox-fg-muted font-normal">selected</span>
                </span>
              </div>

              {selectedCount < totalCount && (
                <button
                  onClick={onSelectAll}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-gruvbox-yellow-light/80 hover:text-gruvbox-yellow hover:bg-gruvbox-yellow/10 transition-all duration-200"
                >
                  <CheckSquare className="w-3.5 h-3.5" />
                  <span>Select all ({totalCount})</span>
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
