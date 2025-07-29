"use client";

import * as React from "react";
import { Link, X, AlertCircle, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Platform } from "@/types";
import { isValidUrl, detectPlatform } from "@/utils/platform-detector";

interface UrlInputProps {
  value: string;
  onChange: (value: string) => void;
  onPlatformDetected?: (platform: Platform) => void;
  placeholder?: string;
  disabled?: boolean;
  selectedPlatform?: Platform;
}

const platformPlaceholders: Record<Platform, string> = {
  youtube: "https://www.youtube.com/watch?v=...",
  twitter: "https://twitter.com/user/status/...",
  reddit: "https://www.reddit.com/r/.../comments/...",
  unknown: "Paste video URL here...",
};

export function UrlInput({
  value,
  onChange,
  onPlatformDetected,
  placeholder,
  disabled = false,
  selectedPlatform = 'unknown',
}: UrlInputProps) {
  const [isFocused, setIsFocused] = React.useState(false);
  const [validationState, setValidationState] = React.useState<"idle" | "valid" | "invalid">("idle");

  React.useEffect(() => {
    if (!value) {
      setValidationState("idle");
      return;
    }

    const isValid = isValidUrl(value);
    setValidationState(isValid ? "valid" : "invalid");

    if (isValid && onPlatformDetected) {
      const platform = detectPlatform(value);
      onPlatformDetected(platform);
    }
  }, [value, onPlatformDetected]);

  const handleClear = () => {
    onChange("");
    setValidationState("idle");
  };

  const getValidationIcon = () => {
    if (validationState === "valid") {
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    }
    if (validationState === "invalid" && value) {
      return <AlertCircle className="h-5 w-5 text-red-500" />;
    }
    return null;
  };

  const dynamicPlaceholder = React.useMemo(() => {
    if (placeholder) return placeholder;
    // Use selected platform for placeholder if no URL entered
    if (!value && selectedPlatform !== 'unknown') {
      return platformPlaceholders[selectedPlatform];
    }
    if (value) {
      const platform = detectPlatform(value);
      return platformPlaceholders[platform];
    }
    return platformPlaceholders.unknown;
  }, [value, placeholder, selectedPlatform]);

  return (
    <div className="relative w-full">
      <div className={cn(
        "relative flex items-center rounded-lg transition-all duration-200",
        "bg-gray-900/50 border",
        isFocused ? "border-blue-500/50 shadow-lg shadow-blue-500/20" : "border-gray-700",
        validationState === "valid" && "border-green-500/50",
        validationState === "invalid" && value && "border-red-500/50"
      )}>
        <div className="absolute left-4 text-gray-400">
          <Link className="h-5 w-5" />
        </div>
        
        <Input
          type="url"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={dynamicPlaceholder}
          disabled={disabled}
          className={cn(
            "h-14 pl-12 pr-20 text-base",
            "bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0",
            "text-white placeholder:text-gray-500",
            "transition-all duration-200"
          )}
        />
        
        <div className="absolute right-4 flex items-center gap-2">
          {getValidationIcon()}
          {value && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClear}
              className="h-8 w-8 p-0 hover:bg-gray-800/50"
              disabled={disabled}
            >
              <X className="h-4 w-4 text-gray-400" />
            </Button>
          )}
        </div>
      </div>
      
      {validationState === "invalid" && value && (
        <p className="mt-2 text-sm text-red-500 animate-in fade-in-0 slide-in-from-top-1">
          Please enter a valid video URL
        </p>
      )}
    </div>
  );
}
