import React, { useState, useEffect } from 'react';
import { X, Plus, FolderOpen, ChevronRight, Check } from 'lucide-react';

// Curated color palette - fewer, more distinct colors
const COLLECTION_COLORS = [
  { name: 'Coral', value: '#fb4934' },
  { name: 'Amber', value: '#fe8019' },
  { name: 'Gold', value: '#fabd2f' },
  { name: 'Lime', value: '#b8bb26' },
  { name: 'Mint', value: '#8ec07c' },
  { name: 'Sky', value: '#83a598' },
  { name: 'Lavender', value: '#d3869b' },
  { name: 'Slate', value: '#928374' },
];

const CollectionModal = ({
  open,
  onOpenChange,
  collections = [],
  onSelectCollection,
  onCreateCollection
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [selectedColor, setSelectedColor] = useState(COLLECTION_COLORS[0].value);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (open) {
      setTimeout(() => setIsVisible(true), 10);
    } else {
      setIsVisible(false);
    }
  }, [open]);

  if (!open) return null;

  const handleCreate = () => {
    if (newName.trim()) {
      onCreateCollection(newName.trim(), selectedColor);
      setNewName('');
      setSelectedColor(COLLECTION_COLORS[0].value);
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => {
      setIsCreating(false);
      setNewName('');
      onOpenChange(false);
    }, 200);
  };

  // Get the selected color object
  const selectedColorObj = COLLECTION_COLORS.find(c => c.value === selectedColor) || COLLECTION_COLORS[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black/60 transition-opacity duration-300 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
        onClick={handleClose}
      />

      {/* Modal */}
      <div className={`relative w-full max-w-md mx-4 transition-all duration-300 ${isVisible ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-4'}`}>
        {/* Modal content */}
        <div className="relative bg-gruvbox-bg border border-gruvbox-bg-lighter rounded-2xl shadow-xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-gruvbox-bg-lighter/60">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-gruvbox-yellow/20 to-gruvbox-orange/10">
                <FolderOpen className="w-5 h-5 text-gruvbox-yellow" />
              </div>
              <h2 className="text-lg font-semibold text-gruvbox-fg">
                {isCreating ? 'Create Side' : 'Add to Side'}
              </h2>
            </div>
            <button
              onClick={handleClose}
              className="relative p-2 rounded-xl overflow-hidden group"
            >
              <div className="absolute inset-0 bg-gruvbox-bg-lighter/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
              <X className="relative w-5 h-5 text-gruvbox-fg-muted group-hover:text-gruvbox-fg transition-colors" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            {isCreating ? (
              <div className="space-y-5">
                {/* Name input with color preview */}
                <div>
                  <label className="block text-xs uppercase tracking-wider text-gruvbox-fg-muted mb-2.5">Side Name</label>
                  <div className="relative">
                    <div
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full transition-colors duration-200"
                      style={{ backgroundColor: selectedColor }}
                    />
                    <input
                      type="text"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="Enter side name..."
                      className="w-full pl-9 pr-4 py-3 bg-gruvbox-bg-dark border border-gruvbox-bg-lighter/80 rounded-xl text-gruvbox-fg placeholder:text-gruvbox-fg-muted/50 focus:outline-none focus:border-gruvbox-yellow/40 focus:bg-gruvbox-bg-dark/80 transition-all duration-200"
                      autoFocus
                    />
                  </div>
                </div>

                {/* Color picker - horizontal strip */}
                <div>
                  <label className="block text-xs uppercase tracking-wider text-gruvbox-fg-muted mb-3">Choose Color</label>
                  <div className="flex items-center gap-2 p-2 bg-gruvbox-bg-dark rounded-xl">
                    {COLLECTION_COLORS.map((color) => (
                      <button
                        key={color.value}
                        onClick={() => setSelectedColor(color.value)}
                        className="group relative flex-1 aspect-square rounded-lg transition-all duration-200 hover:scale-105"
                        style={{ backgroundColor: color.value }}
                        title={color.name}
                      >
                        {/* Selection indicator */}
                        {selectedColor === color.value && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-5 h-5 rounded-md bg-white/20 backdrop-blur-sm flex items-center justify-center">
                              <Check className="w-3.5 h-3.5 text-white drop-shadow-sm" strokeWidth={3} />
                            </div>
                          </div>
                        )}
                        {/* Glow on selection */}
                        {selectedColor === color.value && (
                          <div
                            className="absolute -inset-0.5 rounded-lg opacity-60 blur-sm -z-10"
                            style={{ backgroundColor: color.value }}
                          />
                        )}
                      </button>
                    ))}
                  </div>
                  {/* Selected color name */}
                  <p className="text-xs text-gruvbox-fg-muted/60 mt-2 text-center">
                    {selectedColorObj.name}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setIsCreating(false)}
                    className="relative flex-1 px-4 py-3 rounded-xl overflow-hidden group"
                  >
                    <div className="absolute inset-0 bg-gruvbox-bg-lighter group-hover:bg-gruvbox-bg-lighter/80 transition-colors duration-200" />
                    <span className="relative text-gruvbox-fg-muted group-hover:text-gruvbox-fg transition-colors">Cancel</span>
                  </button>
                  <button
                    onClick={handleCreate}
                    disabled={!newName.trim()}
                    className="relative flex-1 px-4 py-3 rounded-xl overflow-hidden group disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <div
                      className="absolute inset-0 transition-all duration-300 group-hover:brightness-110 group-disabled:group-hover:brightness-100"
                      style={{ backgroundColor: selectedColor }}
                    />
                    <span className="relative font-medium text-white drop-shadow-sm">Create Side</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Create new button */}
                <button
                  onClick={() => setIsCreating(true)}
                  className="relative w-full flex items-center gap-3 px-4 py-4 rounded-xl border-2 border-dashed border-gruvbox-yellow/30 hover:border-gruvbox-yellow/60 group overflow-hidden transition-all duration-200"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-gruvbox-yellow/5 to-gruvbox-orange/5 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                  <div className="relative p-2 rounded-lg bg-gruvbox-yellow/10 group-hover:bg-gruvbox-yellow/20 transition-colors">
                    <Plus className="w-4 h-4 text-gruvbox-yellow" />
                  </div>
                  <div className="relative flex flex-col items-start">
                    <span className="font-medium text-gruvbox-yellow-light group-hover:text-gruvbox-yellow transition-colors">Create New Side</span>
                    <span className="text-xs text-gruvbox-fg-muted/60">Organize your bookmarks</span>
                  </div>
                  <ChevronRight className="relative ml-auto w-4 h-4 text-gruvbox-fg-muted/40 group-hover:text-gruvbox-fg-muted/80 transition-colors" />
                </button>

                {/* Existing collections */}
                {collections.length > 0 && (
                  <div className="mt-5 space-y-1.5">
                    <p className="text-[10px] uppercase tracking-[0.15em] text-gruvbox-fg-muted/60 mb-3 px-1">
                      Existing Sides
                    </p>
                    {collections.map((collection, index) => (
                      <button
                        key={collection.id}
                        onClick={() => onSelectCollection(collection.id)}
                        className="relative w-full flex items-center gap-3 px-4 py-3.5 rounded-xl group overflow-hidden transition-all duration-200"
                        style={{ transitionDelay: `${index * 30}ms` }}
                      >
                        <div className="absolute inset-0 bg-gruvbox-bg-lighter/30 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                        <div
                          className="relative w-3.5 h-3.5 rounded-full ring-2 ring-offset-1 ring-offset-gruvbox-bg-light transition-transform duration-200 group-hover:scale-110"
                          style={{ backgroundColor: collection.color, ringColor: `${collection.color}40` }}
                        />
                        <span className="relative text-gruvbox-fg/90 group-hover:text-gruvbox-fg transition-colors">
                          {collection.name}
                        </span>
                        <span className="relative ml-auto px-2 py-0.5 rounded-md bg-gruvbox-bg-lighter/40 text-xs text-gruvbox-fg-muted">
                          {collection.bookmarkCount || 0}
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {collections.length === 0 && (
                  <div className="text-center py-6">
                    <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-gruvbox-bg-lighter/30 flex items-center justify-center">
                      <FolderOpen className="w-6 h-6 text-gruvbox-fg-muted/40" />
                    </div>
                    <p className="text-gruvbox-fg-muted/60 text-sm">
                      No sides yet
                    </p>
                    <p className="text-gruvbox-fg-muted/40 text-xs mt-1">
                      Create one to get started
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CollectionModal;
