"use client";

import * as React from "react";
import { Check, ChevronDown, Globe, Youtube } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Platform } from "@/types";
import { PLATFORM_CONFIG } from "@/config/platforms";

interface PlatformSelectorProps {
  value: Platform;
  onChange: (platform: Platform) => void;
}

const platformIcons: Record<Platform, React.ElementType> = {
  youtube: Youtube,
  twitter: Globe, // X/Twitter icon
  instagram: Globe, // Instagram icon
  facebook: Globe, // Facebook icon
  reddit: Globe, // Reddit icon
  unknown: Globe,
};

export function PlatformSelector({ value, onChange }: PlatformSelectorProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedPlatform = PLATFORM_CONFIG[value];
  const Icon = platformIcons[value];

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        variant="outline"
        role="combobox"
        aria-expanded={isOpen}
        aria-label="Select platform"
        className={cn(
          "w-[200px] justify-between",
          "bg-gray-900/50 border-gray-700 hover:bg-gray-800/50",
          "text-white hover:text-white",
          "transition-all duration-200"
        )}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="flex items-center gap-2">
          <Icon className="h-4 w-4" style={{ color: selectedPlatform.color }} />
          {selectedPlatform.displayName}
        </span>
        <ChevronDown className={cn(
          "ml-2 h-4 w-4 shrink-0 transition-transform duration-200",
          isOpen && "rotate-180"
        )} />
      </Button>
      
      {isOpen && (
        <div className="absolute z-50 mt-2 w-[200px] overflow-hidden rounded-md border border-gray-700 bg-gray-900/95 backdrop-blur-sm shadow-lg animate-in fade-in-0 zoom-in-95">
          <div className="p-1">
            {(Object.keys(PLATFORM_CONFIG) as Platform[])
              .filter(platform => platform !== 'unknown')
              .map((platform) => {
                const config = PLATFORM_CONFIG[platform];
                const PlatformIcon = platformIcons[platform];
                const isSelected = platform === value;
                
                return (
                  <button
                    key={platform}
                    className={cn(
                      "relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-2 text-sm outline-none",
                      "transition-colors duration-150",
                      "hover:bg-gray-800/50",
                      isSelected && "bg-gray-800/50",
                      !config.supported && "opacity-50 cursor-not-allowed"
                    )}
                    onClick={() => {
                      if (config.supported) {
                        onChange(platform);
                        setIsOpen(false);
                      }
                    }}
                    disabled={!config.supported}
                  >
                    <PlatformIcon
                      className="mr-2 h-4 w-4"
                      style={{ color: config.color }}
                    />
                    <span className="flex-1 text-left text-white">
                      {config.displayName}
                    </span>
                    {config.comingSoon && (
                      <span className="ml-auto text-xs text-gray-400">Soon</span>
                    )}
                    {isSelected && (
                      <Check className="ml-2 h-4 w-4 text-green-500" />
                    )}
                  </button>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}
