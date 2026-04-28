import { Skeleton } from '@/components/ui/skeleton';

export function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-enter">
      {/* Greeting */}
      <div>
        <Skeleton className="h-9 w-64 mb-2" />
        <Skeleton className="h-4 w-80" />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Ambassador card — full width */}
        <div
          className="rounded-[20px] p-6 md:col-span-2"
          style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.07)' }}
        >
          <Skeleton className="h-6 w-52 mb-3" />
          <Skeleton className="h-8 w-40 mb-2" />
          <Skeleton className="h-4 w-72 mb-3" />
          <Skeleton className="h-4 w-56" />
        </div>

        {/* Loyalty card */}
        <div
          className="rounded-[20px] p-6"
          style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.07)' }}
        >
          <Skeleton className="h-6 w-52 mb-3" />
          <Skeleton className="h-10 w-28 mb-2" />
          <Skeleton className="h-4 w-40 mb-6" />
          <Skeleton className="h-10 w-full rounded-full" />
        </div>

        {/* Appointments card */}
        <div
          className="rounded-[20px] p-6"
          style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.07)' }}
        >
          <Skeleton className="h-6 w-40 mb-3" />
          <div className="space-y-3 mb-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="flex justify-between items-center p-4 rounded-xl"
                style={{ border: '1px solid rgba(0,0,0,0.06)', background: 'rgba(232,243,234,0.4)' }}
              >
                <div className="space-y-1.5">
                  <Skeleton className="h-5 w-36" />
                  <Skeleton className="h-3 w-44" />
                </div>
                <Skeleton className="h-6 w-20 rounded-full" />
              </div>
            ))}
          </div>
          <Skeleton className="h-10 w-full rounded-full" />
        </div>
      </div>
    </div>
  );
}
