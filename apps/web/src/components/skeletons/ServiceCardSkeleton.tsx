import { Skeleton } from '@/components/ui/skeleton';

export function ServiceCardSkeleton() {
  return (
    <div
      className="overflow-hidden flex flex-col h-full"
      style={{
        borderRadius: '20px',
        border: '1px solid rgba(0,0,0,0.07)',
        backgroundColor: '#fff',
        boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
      }}
    >
      {/* Image placeholder */}
      <Skeleton className="aspect-video w-full rounded-none" />

      <div className="flex flex-col flex-1 p-6">
        {/* Title */}
        <Skeleton className="h-6 w-3/4 mb-3" />

        {/* Description lines */}
        <Skeleton className="h-4 w-full mb-2" />
        <Skeleton className="h-4 w-5/6 mb-4" />

        {/* Duration pill */}
        <div className="flex items-center gap-2 mb-5">
          <Skeleton className="h-7 w-20 rounded-full" />
        </div>

        {/* Price + button row */}
        <div
          className="flex items-center justify-between pt-4"
          style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}
        >
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-10 w-32 rounded-full" />
        </div>
      </div>
    </div>
  );
}

export function ServiceListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      {Array.from({ length: count }).map((_, i) => (
        <ServiceCardSkeleton key={i} />
      ))}
    </div>
  );
}
