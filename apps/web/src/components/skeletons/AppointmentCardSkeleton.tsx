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
      <div className="p-4 sm:p-5">
        <div className="mb-3 flex items-center justify-between sm:hidden">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-7 w-24 rounded-full" />
        </div>
        <div className="sm:flex sm:items-start sm:justify-between sm:gap-4">
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="hidden h-3 w-28 sm:block" />
            <Skeleton className="h-5 w-48 max-w-full" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-56 max-w-full" />
            <Skeleton className="h-4 w-36 max-w-full" />
          </div>
          <div className="hidden shrink-0 flex-col items-end gap-2 sm:flex">
            <Skeleton className="h-7 w-24 rounded-full" />
            <Skeleton className="h-10 w-24 rounded-xl" />
          </div>
        </div>
        <Skeleton className="mt-3 h-11 w-full rounded-xl sm:hidden" />
      </div>
    </div>
  );
}

export function AppointmentListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-8 animate-enter">
      <div className="flex items-center justify-between gap-4">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="hidden h-11 w-36 rounded-full sm:block" />
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
