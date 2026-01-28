import { cn } from "@/lib/utils";

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted", className)}
      {...props}
    />
  );
}

// Table Skeleton Components
function TableSkeleton({
  rows = 5,
  columns = 6,
  className,
  ...props
}: {
  rows?: number;
  columns?: number;
} & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("w-full", className)} {...props}>
      {/* Table Header Skeleton */}
      <div className="flex gap-4 p-4 border-b">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton
            key={`header-${i}`}
            className={cn(
              "h-4",
              i === 0 ? "w-12" : i === columns - 1 ? "w-20" : "flex-1 min-w-16",
            )}
          />
        ))}
      </div>
      {/* Table Body Skeleton */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div
          key={`row-${rowIndex}`}
          className="flex gap-4 p-4 border-b border-border/30"
        >
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton
              key={`cell-${rowIndex}-${colIndex}`}
              className={cn(
                "h-4",
                colIndex === 0
                  ? "w-12"
                  : colIndex === columns - 1
                    ? "w-20"
                    : "flex-1 min-w-16",
              )}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

// Card Grid Skeleton
function CardGridSkeleton({
  cards = 6,
  className,
  ...props
}: {
  cards?: number;
} & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4",
        className,
      )}
      {...props}
    >
      {Array.from({ length: cards }).map((_, i) => (
        <div key={i} className="rounded-lg border border-border p-4 space-y-3">
          {/* Status bar */}
          <Skeleton className="h-1 w-full" />
          {/* Card header */}
          <div className="flex justify-between items-start">
            <div className="space-y-2 flex-1">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
            <Skeleton className="h-6 w-16" />
          </div>
          {/* Card content */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-4" />
              <Skeleton className="h-4 flex-1" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-4" />
              <Skeleton className="h-4 flex-1" />
            </div>
          </div>
          {/* Actions */}
          <div className="grid grid-cols-4 gap-1 pt-2 border-t">
            {Array.from({ length: 4 }).map((_, j) => (
              <Skeleton key={j} className="h-8 w-full" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// Stats Card Skeleton
function StatsCardSkeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("rounded-lg border border-border p-6", className)}
      {...props}
    >
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-6 w-16" />
        </div>
        <Skeleton className="h-8 w-8 rounded" />
      </div>
    </div>
  );
}

// Chart Skeleton
function ChartSkeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("rounded-lg border border-border p-6 space-y-4", className)}
      {...props}
    >
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-48" />
        </div>
      </div>
      <div className="h-64 flex items-end justify-between space-x-2 mt-8">
        {Array.from({ length: 12 }).map((_, i) => (
          <Skeleton
            key={i}
            className={cn("w-6", `h-${20 + 30 + 10}`)}
            style={{ height: `${20 + 30}px` }}
          />
        ))}
      </div>
    </div>
  );
}

// List Skeleton
function ListSkeleton({
  items = 5,
  className,
  ...props
}: {
  items?: number;
} & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("space-y-2", className)} {...props}>
      {Array.from({ length: items }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 p-4 border border-border rounded-lg"
        >
          {/* Status indicator */}
          <Skeleton className="h-3 w-3 rounded-full" />
          {/* Content */}
          <div className="flex-1 space-y-2">
            <div className="flex justify-between">
              <Skeleton className="h-5 w-1/3" />
              <Skeleton className="h-6 w-20" />
            </div>
            <Skeleton className="h-4 w-1/4" />
          </div>
          {/* Actions */}
          <div className="flex gap-2">
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-20" />
          </div>
        </div>
      ))}
    </div>
  );
}

export {
  Skeleton,
  TableSkeleton,
  CardGridSkeleton,
  StatsCardSkeleton,
  ChartSkeleton,
  ListSkeleton,
};
