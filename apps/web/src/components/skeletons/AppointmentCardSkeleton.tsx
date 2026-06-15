import { Skeleton } from '@/components/ui/skeleton';

export function AppointmentCardSkeleton() {
  return (
    <div
      className="rounded-[20px] overflow-hidden"
      style={{
        background: '#fff',
        border: '1px solid rgba(0,0,0,0.07)',
        boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
      }}
    >
      <div className="p-5 flex flex-row justify-between items-start gap-4">
        <div className="space-y-2 flex-1">
          {/* Service name */}
          <Skeleton className="h-6 w-48" />
          {/* Price */}
          <Skeleton className="h-4 w-20" />
          {/* Date */}
          <Skeleton className="h-4 w-56" />
          {/* Employee */}
          <Skeleton className="h-4 w-36" />
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          {/* Status badge */}
          <Skeleton className="h-7 w-24 rounded-full" />
          {/* Reschedule button */}
          <Skeleton className="h-7 w-24 rounded-lg" />
        </div>
      </div>
    </div>
  );
}

export function AppointmentListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-8 animate-enter">
      <div className="flex items-center justify-between">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-10 w-36 rounded-full" />
      </div>

      <section className="space-y-4">
        <Skeleton className="h-6 w-40" />
        <div className="grid gap-4">
          {Array.from({ length: count }).map((_, i) => (
            <AppointmentCardSkeleton key={i} />
          ))}
        </div>
      </section>
    </div>
  );
}
