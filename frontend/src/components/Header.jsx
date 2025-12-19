import React, { useState, useRef, useEffect } from 'react';
import { Plus, Moon, Settings, CheckSquare, X, FileText, Link2, ChevronDown } from 'lucide-react';
import MindSearch from './MindSearch';
import Logo from './Logo';

const Header = ({
  onNavigate,
  activePage = 'home',
  tags = [],
  collections = [],
  activeCollection,
  activeTags = [],
  selectionMode,
  onToggleSelectionMode,
  onQuickNote,
  onAddUrl,
  onOpenSettings,
  // Search props
  bookmarks = [],
  onResultSelect,
  onFilterChange,
  activeFilters = [],
}) => {
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const addMenuRef = useRef(null);

  // Close add menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (addMenuRef.current && !addMenuRef.current.contains(e.target)) {
        setAddMenuOpen(false);
      }
    };

    if (addMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [addMenuOpen]);

  return (
    <div className="flex flex-col">
      {/* Main Header Row */}
      <div className="flex items-center justify-between py-5 px-8">
        {/* Logo and Title area */}
        <div className="flex items-center gap-4">
          {/* Custom Logo */}
          <div className="relative">
            <Logo size={44} className="drop-shadow-lg" />
            <div className="absolute -inset-2 rounded-xl bg-gradient-to-br from-gruvbox-yellow/15 to-gruvbox-orange/10 blur-xl -z-10 opacity-80" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-xl font-display tracking-wide text-gruvbox-fg-light">
              Curated Lounge
            </h1>
            <span className="text-[10px] uppercase tracking-[0.2em] text-gruvbox-fg-muted/50 mt-0.5">
              Your digital library
            </span>
          </div>
        </div>

        {/* MindSearch - Center */}
        <MindSearch
          onFilterChange={onFilterChange}
          activeFilters={activeFilters}
          showInlineFilters={false}
        />

        {/* Right side actions */}
        <div className="flex items-center gap-2">
          {/* Selection mode toggle */}
          <button
            onClick={onToggleSelectionMode}
            className={`relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 overflow-hidden ${
              selectionMode
                ? 'text-gruvbox-bg-darkest'
                : 'text-gruvbox-fg-muted hover:text-gruvbox-fg'
            }`}
          >
            {selectionMode && (
              <div className="absolute inset-0 bg-gradient-to-r from-gruvbox-yellow to-gruvbox-orange" />
            )}
            <div className={`absolute inset-0 bg-gruvbox-bg-lighter/50 transition-opacity duration-200 ${selectionMode ? 'opacity-0' : 'opacity-0 hover:opacity-100'}`} />
            {selectionMode ? (
              <>
                <X className="relative w-4 h-4" />
                <span className="relative">Cancel</span>
              </>
            ) : (
              <>
                <CheckSquare className="relative w-4 h-4" />
                <span className="relative">Select</span>
              </>
            )}
          </button>

          {/* Divider */}
          <div className="h-8 w-px bg-gruvbox-bg-lighter/40 mx-1" />

          {/* Add button with dropdown menu */}
          <div className="relative" ref={addMenuRef}>
            <button
              onClick={() => setAddMenuOpen(!addMenuOpen)}
              className="relative group flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-gruvbox-yellow to-gruvbox-orange transition-all duration-300 group-hover:scale-105" />
              <div className="absolute inset-0 bg-gradient-to-r from-gruvbox-yellow-light to-gruvbox-orange-light opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="absolute inset-0 bg-white/20 opacity-0 group-active:opacity-100 transition-opacity duration-100" />
              <Plus className="relative w-4 h-4 text-gruvbox-bg-darkest" strokeWidth={2.5} />
              <span className="relative text-gruvbox-bg-darkest">Add New</span>
              <ChevronDown className={`relative w-3.5 h-3.5 text-gruvbox-bg-darkest transition-transform duration-200 ${addMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown menu */}
            {addMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-gruvbox-bg-light/95 backdrop-blur-md border border-gruvbox-bg-lighter rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                <button
                  onClick={() => {
                    onQuickNote?.();
                    setAddMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gruvbox-fg hover:bg-gruvbox-yellow/10 transition-colors"
                >
                  <FileText className="w-4 h-4 text-gruvbox-yellow" />
                  <span>Quick Note</span>
                </button>
                <div className="h-px bg-gruvbox-bg-lighter mx-3" />
                <button
                  onClick={() => {
                    onAddUrl?.();
                    setAddMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gruvbox-fg hover:bg-gruvbox-yellow/10 transition-colors"
                >
                  <Link2 className="w-4 h-4 text-gruvbox-aqua" />
                  <span>Add URL</span>
                </button>
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="h-8 w-px bg-gruvbox-bg-lighter/40 mx-1" />

          {/* Icon buttons */}
          <div className="flex items-center gap-1">
            <button
              onClick={onOpenSettings}
              className="relative p-2.5 rounded-xl transition-all duration-200 group overflow-hidden"
            >
              <div className="absolute inset-0 bg-gruvbox-bg-lighter/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
              <Settings className="relative w-[18px] h-[18px] text-gruvbox-fg-muted group-hover:text-gruvbox-fg transition-all duration-200 group-hover:rotate-45" strokeWidth={1.75} />
            </button>

            <button className="relative p-2.5 rounded-xl transition-all duration-200 group overflow-hidden">
              <div className="absolute inset-0 bg-gruvbox-bg-lighter/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
              <Moon className="relative w-[18px] h-[18px] text-gruvbox-fg-muted group-hover:text-gruvbox-purple-light transition-colors duration-200" strokeWidth={1.75} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Header;
