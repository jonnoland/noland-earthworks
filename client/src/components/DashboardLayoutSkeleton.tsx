import { Skeleton } from './ui/skeleton';

export function DashboardLayoutSkeleton() {
  return (
    <div className="flex h-dvh bg-background overflow-hidden">
      {/* Sidebar skeleton */}
      <div className="hidden lg:flex flex-col w-56 shrink-0 border-r border-border bg-background p-3 space-y-4">
        {/* Logo area */}
        <div className="flex items-center gap-2 px-2 py-2 border-b border-border mb-1">
          <Skeleton className="h-8 w-32 rounded-md" />
        </div>

        {/* Menu items */}
        <div className="space-y-1 px-1">
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-full rounded-lg" />
          ))}
        </div>
      </div>

      {/* Main content skeleton */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="h-14 border-b border-border flex items-center px-6 gap-4">
          <Skeleton className="h-5 w-40 rounded" />
          <div className="flex-1" />
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
        {/* Content */}
        <div className="flex-1 p-6 space-y-4 overflow-y-auto">
          <Skeleton className="h-28 w-full rounded-xl" />
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
            <Skeleton className="h-28 rounded-xl" />
            <Skeleton className="h-28 rounded-xl" />
            <Skeleton className="h-28 rounded-xl" />
            <Skeleton className="h-28 rounded-xl" />
          </div>
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </div>
    </div>
  );
}
