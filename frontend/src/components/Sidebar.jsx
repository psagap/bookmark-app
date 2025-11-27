import React from 'react';
import { Home, Bookmark, Moon, Sparkles, Grid3X3, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

const SidebarItem = ({ icon: Icon, label, active }) => {
    return (
        <div className={cn(
            "p-2.5 rounded-xl cursor-pointer transition-all duration-200 group relative flex items-center justify-center",
            "hover:bg-white/5",
            active && "bg-gradient-to-br from-primary/20 to-accent/10"
        )}>
            <Icon className={cn(
                "w-5 h-5 transition-all duration-200",
                active ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
            )} strokeWidth={1.5} />
            {label && <span className="sr-only">{label}</span>}
            {active && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 rounded-full bg-gradient-to-b from-primary to-accent" />
            )}
        </div>
    );
};

const Sidebar = () => {
    return (
        <div className="fixed left-0 top-0 h-full w-14 flex flex-col items-center py-5 glass border-r border-white/5 z-50">
            {/* Logo area */}
            <div className="mb-6">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                    <Bookmark className="w-4 h-4 text-white" strokeWidth={2} />
                </div>
            </div>

            {/* Main nav */}
            <div className="flex flex-col gap-1">
                <SidebarItem icon={Home} label="Home" active />
                <SidebarItem icon={Grid3X3} label="Collections" />
                <SidebarItem icon={Sparkles} label="AI" />
            </div>

            {/* Spacer */}
            <div className="flex-1" />

            {/* Bottom nav */}
            <div className="flex flex-col gap-1">
                <SidebarItem icon={Moon} label="Theme" />
                <SidebarItem icon={Settings} label="Settings" />
            </div>
        </div>
    );
};

export default Sidebar;
