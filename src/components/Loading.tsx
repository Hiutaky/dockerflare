import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoadingProps {
  message?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function Loading({
  message = "Loading...",
  className,
  size = "md",
}: LoadingProps) {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-8 h-8",
    lg: "w-12 h-12",
  };

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-12 text-muted-foreground",
        className,
      )}
    >
      <Loader2 className={cn(sizeClasses[size], "animate-spin mb-3")} />
      <p className="text-sm">{message}</p>
    </div>
  );
}
