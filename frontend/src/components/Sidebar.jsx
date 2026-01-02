import React from 'react';
import { Home, FolderOpen, Star, Archive } from 'lucide-react';
import { cn } from '@/lib/utils';

const NavItem = ({ icon: Icon, label, active }) => {
    return (
        <div className={cn(
            "w-10 h-10 rounded-lg cursor-pointer transition-all duration-300 group relative flex items-center justify-center",
            "hover:bg-primary/10",
            active && "bg-primary/20"
        )}>
            <Icon className={cn(
                "w-5 h-5 transition-all duration-200",
                active ? "text-primary" : "text-foreground/50 group-hover:text-foreground/80"
            )} strokeWidth={1.5} />
            {label && <span className="sr-only">{label}</span>}
            {active && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-full bg-gradient-to-b from-primary to-primary/60" />
            )}
        </div>
    );
};

const Sidebar = () => {
    return (
        <div className="fixed left-0 top-0 h-full w-16 flex flex-col items-center py-6 bg-card border-r border-border z-50">
            {/* Decorative top border */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent" />

            {/* Logo area */}
            <div className="mb-8">
                <div className="w-10 h-10 rounded-lg overflow-hidden shadow-lg shadow-primary/20">
                    <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
                </div>
            </div>

            {/* Main nav */}
            <div className="flex flex-col gap-2">
                <NavItem icon={Home} label="Home" active />
                <NavItem icon={FolderOpen} label="Collections" />
                <NavItem icon={Star} label="Favorites" />
                <NavItem icon={Archive} label="Archive" />
            </div>

            {/* Spacer */}
            <div className="flex-1" />

            {/* Decorative bottom element */}
            <div className="w-6 h-6 rounded-full border border-border flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-primary/50" />
            </div>
        </div>
    );
};

export default Sidebar;
