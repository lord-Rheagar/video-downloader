"use client";

import * as React from "react";
import { Download, Loader2, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface DownloadButtonProps {
  onClick: () => void;
  isLoading?: boolean;
  isSuccess?: boolean;
  disabled?: boolean;
  size?: "default" | "sm" | "lg";
}

export function DownloadButton({
  onClick,
  isLoading = false,
  isSuccess = false,
  disabled = false,
  size = "default",
}: DownloadButtonProps) {
  const [showSuccess, setShowSuccess] = React.useState(false);

  React.useEffect(() => {
    if (isSuccess) {
      setShowSuccess(true);
      const timer = setTimeout(() => setShowSuccess(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [isSuccess]);

  const getButtonContent = () => {
    if (isLoading) {
      return (
        <>
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Processing...
        </>
      );
    }
    
    if (showSuccess) {
      return (
        <>
          <Check className="mr-2 h-5 w-5" />
          Success!
        </>
      );
    }
    
    return (
      <>
        <Download className="mr-2 h-5 w-5" />
        Download
      </>
    );
  };

  return (
    <Button
      onClick={onClick}
      disabled={disabled || isLoading}
      size={size}
      className={cn(
        "min-w-[140px] font-semibold transition-all duration-300",
        "bg-gradient-to-r from-blue-600 to-purple-600",
        "hover:from-blue-700 hover:to-purple-700",
        "shadow-lg hover:shadow-xl",
        "transform hover:scale-[1.02]",
        showSuccess && "from-green-600 to-green-700 hover:from-green-700 hover:to-green-800",
        size === "lg" && "h-14 px-8 text-base"
      )}
    >
      {getButtonContent()}
    </Button>
  );
}
