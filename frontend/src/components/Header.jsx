import React, { useState } from 'react';
import { Search, Plus, Moon, Settings, CheckSquare, X, Command } from 'lucide-react';
import ExpandableNav from './ExpandableNav';

const Header = ({ onSearch, onNavigate, activePage = 'home', tags = [], collections = [], activeCollection, activeTags = [], selectionMode, onToggleSelectionMode }) => {
    const [searchValue, setSearchValue] = useState('');
    const [searchFocused, setSearchFocused] = useState(false);

    const handleSearch = (e) => {
        setSearchValue(e.target.value);
        onSearch?.(e.target.value);
    };

    return (
        <div className="flex flex-col">
            {/* Main Header Row */}
            <div className="flex items-center justify-between py-6 px-8">
                {/* Logo and Title area */}
                <div className="flex items-center gap-5">
                    {/* Logo placeholder */}
                    <div className="relative">
                        <div className="w-11 h-11 rounded-xl overflow-hidden bg-gradient-to-br from-gruvbox-yellow/20 to-gruvbox-orange/10 border border-gruvbox-yellow/20 flex items-center justify-center backdrop-blur-sm">
                            <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" onError={(e) => { e.target.style.display = 'none'; }} />
                        </div>
                        <div className="absolute -inset-1 rounded-xl bg-gradient-to-br from-gruvbox-yellow/20 to-gruvbox-orange/10 blur-lg -z-10 opacity-60" />
                    </div>
                    <div className="flex flex-col">
                        <h1 className="text-2xl font-display tracking-wide text-gruvbox-fg-light">
                            Curated Lounge
                        </h1>
                        <span className="text-[10px] uppercase tracking-[0.2em] text-gruvbox-fg-muted/60 mt-0.5">Your digital library</span>
                    </div>
                </div>

                {/* Search */}
                <div className="flex-1 max-w-md mx-10">
                    <div className={`relative transition-all duration-300 ${searchFocused ? 'scale-[1.02]' : ''}`}>
                        <div className={`absolute inset-0 rounded-xl bg-gradient-to-r from-gruvbox-yellow/20 to-gruvbox-orange/20 blur-xl transition-opacity duration-300 ${searchFocused ? 'opacity-60' : 'opacity-0'}`} />
                        <div className="relative flex items-center">
                            <Search className={`absolute left-4 w-4 h-4 transition-colors duration-200 ${searchFocused ? 'text-gruvbox-yellow' : 'text-gruvbox-fg-muted/60'}`} />
                            <input
                                type="text"
                                value={searchValue}
                                onChange={handleSearch}
                                onFocus={() => setSearchFocused(true)}
                                onBlur={() => setSearchFocused(false)}
                                placeholder="Search bookmarks..."
                                className="w-full pl-11 pr-20 py-3 bg-gruvbox-bg-light/60 backdrop-blur-sm border border-gruvbox-bg-lighter/80 rounded-xl text-sm text-gruvbox-fg placeholder:text-gruvbox-fg-muted/50 focus:outline-none focus:border-gruvbox-yellow/40 focus:bg-gruvbox-bg-light/80 transition-all duration-200"
                            />
                            <div className="absolute right-3 flex items-center gap-1 px-2 py-1 rounded-md bg-gruvbox-bg-lighter/50 border border-gruvbox-bg-lighter">
                                <Command className="w-3 h-3 text-gruvbox-fg-muted/60" />
                                <span className="text-[10px] text-gruvbox-fg-muted/60 font-medium">K</span>
                            </div>
                        </div>
                    </div>
                </div>

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
                    <div className="h-8 w-px bg-gruvbox-bg-lighter/60 mx-1" />

                    {/* Add button */}
                    <button className="relative group flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-sm font-semibold overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-r from-gruvbox-yellow to-gruvbox-orange transition-all duration-300 group-hover:scale-105" />
                        <div className="absolute inset-0 bg-gradient-to-r from-gruvbox-yellow-light to-gruvbox-orange-light opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        <div className="absolute inset-0 bg-white/20 opacity-0 group-active:opacity-100 transition-opacity duration-100" />
                        <Plus className="relative w-4 h-4 text-gruvbox-bg-darkest" strokeWidth={2.5} />
                        <span className="relative text-gruvbox-bg-darkest">Add New</span>
                    </button>

                    {/* Divider */}
                    <div className="h-8 w-px bg-gruvbox-bg-lighter/60 mx-1" />

                    {/* Icon buttons */}
                    <div className="flex items-center gap-1">
                        <button className="relative p-2.5 rounded-xl transition-all duration-200 group overflow-hidden">
                            <div className="absolute inset-0 bg-gruvbox-bg-lighter/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                            <Settings className="relative w-[18px] h-[18px] text-gruvbox-fg-muted group-hover:text-gruvbox-fg transition-colors duration-200 group-hover:rotate-45" strokeWidth={1.75} />
                        </button>

                        <button className="relative p-2.5 rounded-xl transition-all duration-200 group overflow-hidden">
                            <div className="absolute inset-0 bg-gruvbox-bg-lighter/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                            <Moon className="relative w-[18px] h-[18px] text-gruvbox-fg-muted group-hover:text-gruvbox-purple-light transition-colors duration-200" strokeWidth={1.75} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Expandable Navigation Bar */}
            <div className="pb-5">
                <ExpandableNav
                    activePage={activePage}
                    onNavigate={onNavigate}
                    tags={tags}
                    collections={collections}
                    activeCollection={activeCollection}
                    activeTags={activeTags}
                />
            </div>
        </div>
    );
};

export default Header;
