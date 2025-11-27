import React, { useState } from 'react';
import { Search, Plus } from 'lucide-react';

const Header = ({ onSearch }) => {
    const [searchValue, setSearchValue] = useState('');
    const [activeTab, setActiveTab] = useState('all');

    const handleSearch = (e) => {
        setSearchValue(e.target.value);
        onSearch?.(e.target.value);
    };

    return (
        <div className="flex items-center justify-between py-6 px-6">
            {/* Search */}
            <div className="flex-1 max-w-md">
                <div className="relative group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <input
                        type="text"
                        value={searchValue}
                        onChange={handleSearch}
                        placeholder="Search bookmarks..."
                        className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:bg-white/[0.07] transition-all"
                    />
                </div>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-1 p-1 bg-white/5 rounded-lg">
                <button
                    onClick={() => setActiveTab('all')}
                    className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
                        activeTab === 'all'
                            ? 'bg-gradient-to-r from-primary to-primary/80 text-white shadow-lg shadow-primary/25'
                            : 'text-muted-foreground hover:text-foreground'
                    }`}
                >
                    All
                </button>
                <button
                    onClick={() => setActiveTab('collections')}
                    className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
                        activeTab === 'collections'
                            ? 'bg-gradient-to-r from-primary to-primary/80 text-white shadow-lg shadow-primary/25'
                            : 'text-muted-foreground hover:text-foreground'
                    }`}
                >
                    Collections
                </button>
            </div>

            {/* Add button */}
            <button className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-primary to-accent text-white text-sm font-medium rounded-xl hover:opacity-90 transition-opacity shadow-lg shadow-primary/20">
                <Plus className="w-4 h-4" />
                <span>Add</span>
            </button>
        </div>
    );
};

export default Header;
