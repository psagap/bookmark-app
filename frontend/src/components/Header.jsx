import React, { useState, useRef, useEffect } from 'react';
import { Plus, Settings, CheckSquare, X, FileText, Link2, ChevronDown } from 'lucide-react';
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
  // Tag filter props
  onTagFilterChange,
  tagRefreshTrigger = 0,
  // Media counts for category suggestions
  mediaCounts = {},
  user,
  onLogin,
  onSignOut,
  onChangePassword,
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
        <div className="flex items-center gap-6">
          {/* Custom Logo */}
          <div className="relative">
            <Logo size={56} className="drop-shadow-lg" />
            <div className="absolute -inset-2 rounded-xl bg-primary/10 blur-xl -z-10 opacity-80" />
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
          activeTags={activeTags}
          onTagFilterChange={onTagFilterChange}
          tagRefreshTrigger={tagRefreshTrigger}
          mediaCounts={mediaCounts}
        />

        {/* Right side actions */}
        <div className="flex items-center gap-2">
          {/* Selection mode toggle */}
          <button
            onClick={onToggleSelectionMode}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors duration-200 ${selectionMode
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
          >
            {selectionMode ? (
              <>
                <X className="w-4 h-4" />
                <span>Cancel</span>
              </>
            ) : (
              <>
                <CheckSquare className="w-4 h-4" />
                <span>Select</span>
              </>
            )}
          </button>

          {/* Divider */}
          <div className="h-8 w-px bg-gruvbox-bg-lighter/40 mx-1" />

          {/* Add button with dropdown menu */}
          <div className="relative" ref={addMenuRef}>
            <button
              onClick={() => setAddMenuOpen(!addMenuOpen)}
              className="relative group flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold overflow-hidden bg-primary hover:bg-primary/90 active:bg-primary/80 transition-colors duration-200"
            >
              <Plus className="w-4 h-4 text-primary-foreground" strokeWidth={2.5} />
              <span className="text-primary-foreground">Add New</span>
              <ChevronDown className={`w-3.5 h-3.5 text-primary-foreground transition-transform duration-200 ${addMenuOpen ? 'rotate-180' : ''}`} />
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
            {/* Auth Button */}
            {user ? (
              <div className="relative group/auth">
                <button className="p-2.5 rounded-xl transition-colors duration-200 hover:bg-muted/50 flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-amber-500 to-amber-700 text-white flex items-center justify-center text-xs font-bold shadow-sm">
                    {user.email?.[0].toUpperCase()}
                  </div>
                </button>
                {/* Auth Dropdown */}
                <div className="absolute right-0 top-full pt-2 w-48 z-50 opacity-0 invisible group-hover/auth:opacity-100 group-hover/auth:visible transition-all duration-200">
                  <div className="bg-gruvbox-bg-light/95 backdrop-blur-md border border-gruvbox-bg-lighter rounded-xl shadow-2xl overflow-hidden">
                    <div className="px-4 py-3 border-b border-gruvbox-bg-lighter">
                      <p className="text-xs text-gruvbox-fg-muted font-medium">Signed in as</p>
                      <p className="text-sm text-gruvbox-fg truncate">{user.email}</p>
                    </div>
                    <button
                      onClick={onChangePassword}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gruvbox-fg hover:bg-white/10 transition-colors text-left"
                    >
                      <span>Change Password</span>
                    </button>
                    <div className="h-px bg-white/10 mx-3" />
                    <button
                      onClick={onSignOut}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-400 hover:text-red-500 hover:bg-red-500/10 transition-colors text-left"
                    >
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <button
                onClick={onLogin}
                className="px-4 py-2 rounded-xl text-sm font-medium text-gruvbox-fg hover:bg-muted/50 transition-colors duration-200"
              >
                Log In
              </button>
            )}

            <button
              onClick={onOpenSettings}
              className="p-2.5 rounded-xl transition-colors duration-200 hover:bg-muted/50"
            >
              <Settings className="w-[18px] h-[18px] text-muted-foreground hover:text-foreground transition-colors duration-200" strokeWidth={1.75} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Header;
