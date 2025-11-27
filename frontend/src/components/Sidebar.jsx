import React from 'react';
import { Smile, Gift, Sun, Sparkles, LayoutGrid, Settings } from 'lucide-react';
import FerrisWheel from './FerrisWheel';
// import Ghost from './Ghost';
import { cn } from '@/lib/utils';

const SidebarItem = ({ icon: Icon, label, active }) => {
    return (
        <div className={cn(
            "p-3 rounded-xl cursor-pointer transition-colors hover:bg-accent group relative flex items-center justify-center",
            active && "text-primary"
        )}>
            <Icon className="w-6 h-6 text-muted-foreground group-hover:text-foreground transition-colors" />
            {label && <span className="sr-only">{label}</span>}
        </div>
    );
};

const Sidebar = () => {
    return (
        <div className="fixed left-0 top-0 h-full w-16 flex flex-col items-center py-6 bg-background border-r border-border/40 z-50">
            <div className="mb-8">
                <div className="transform -rotate-90 origin-center whitespace-nowrap text-muted-foreground font-medium tracking-widest text-xs mb-4">
                    my mind
                </div>
                <SidebarItem icon={Smile} label="Home" active />
            </div>

            <div className="flex-1 w-full flex items-center justify-center overflow-hidden">
                {/* <Ghost /> */}
            </div>

            <div className="flex flex-col gap-4">
                <SidebarItem icon={Gift} label="Gift" />
                <SidebarItem icon={Sun} label="Theme" />
                <SidebarItem icon={Sparkles} label="Magic" />
                <SidebarItem icon={LayoutGrid} label="Layout" />
                <SidebarItem icon={Settings} label="Settings" />
            </div>
        </div>
    );
};

export default Sidebar;
