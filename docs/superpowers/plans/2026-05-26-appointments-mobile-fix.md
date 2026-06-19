# Appointments Mobile Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix AppointmentCard overflow on mobile via responsive flex layout, and make the Historia section collapsible with an animated chevron.

**Architecture:** Single-file change to `apps/web/src/pages/user/Appointments.tsx`. Task 1 adds the Historia accordion (simpler, isolated). Task 2 restructures AppointmentCard's header using Tailwind responsive utilities with JSX duplication for mobile/desktop contexts.

**Tech Stack:** React 19, TypeScript, Tailwind CSS (with `sm:` breakpoint = 640px), lucide-react icons, date-fns

---

### Task 1: Historia Collapsible Section

**Files:**
- Modify: `cosmo-app/apps/web/src/pages/user/Appointments.tsx`

- [ ] **Step 1: Add `ChevronDown` to the lucide-react import**

Open `apps/web/src/pages/user/Appointments.tsx`. Line 6 currently reads:
```tsx
import { Plus, X, ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
```
Change to:
```tsx
import { Plus, X, ChevronLeft, ChevronRight, CalendarDays, ChevronDown } from 'lucide-react';
```

- [ ] **Step 2: Add `historyOpen` state to `UserAppointments`**

Inside `UserAppointments` (after the existing `useEffect` block, before `if (isLoading)...`), add:
```tsx
const [historyOpen, setHistoryOpen] = useState(false);
```

- [ ] **Step 3: Replace the Historia section JSX**

Find this block (around line 140):
```tsx
      {past.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold" style={{ color: 'rgba(20,40,28,0.5)' }}>Historia</h2>
          <div className="grid gap-4 opacity-75">
            {past.map((a: any) => (
              <AppointmentCard key={a.id} appointment={a} hasPendingReview={pendingReviews.some((p) => p.id === a.id)} />
            ))}
          </div>
        </section>
      )}
```

Replace with:
```tsx
      {past.length > 0 && (
        <section className="space-y-4">
          <button
            type="button"
            onClick={() => setHistoryOpen((v) => !v)}
            className="w-full flex items-center justify-between"
            style={{ color: 'rgba(20,40,28,0.5)' }}
          >
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold">Historia</h2>
              <span
                className="text-xs px-2 py-0.5 rounded-full"
                style={{ background: 'rgba(0,0,0,0.06)', color: 'rgba(20,40,28,0.5)' }}
              >
                {past.length}
              </span>
            </div>
            <ChevronDown
              size={18}
              className={`transition-transform duration-200 ${historyOpen ? 'rotate-180' : ''}`}
            />
          </button>
          {historyOpen && (
            <div className="grid gap-4 opacity-75">
              {past.map((a: any) => (
                <AppointmentCard key={a.id} appointment={a} hasPendingReview={pendingReviews.some((p) => p.id === a.id)} />
              ))}
            </div>
          )}
        </section>
      )}
```

- [ ] **Step 4: Verify TypeScript**

```bash
cd cosmo-app/apps/web && pnpm tsc --noEmit
```
Expected: zero errors.

- [ ] **Step 5: Commit**

```bash
cd cosmo-app
git add apps/web/src/pages/user/Appointments.tsx
git commit -m "feat: make Historia section collapsible with chevron accordion"
```

---

### Task 2: AppointmentCard Responsive Mobile Layout

**Files:**
- Modify: `cosmo-app/apps/web/src/pages/user/Appointments.tsx`

- [ ] **Step 1: Replace the card header in `AppointmentCard`**

Find the `{/* Header */}` block inside `AppointmentCard` (starts around line 166):
```tsx
        {/* Header */}
        <div className="p-5 flex flex-row justify-between items-start gap-4">
          <div className="space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#C4965A' }}>
              {canReschedule ? 'Nadchodząca wizyta' : 'Przeszła wizyta'}
            </p>
            <h3 className="text-[15px] font-heading font-bold" style={{ color: '#1A3828' }}>
              {a.service?.name}
            </h3>
            {a.service?.price && (() => {
              const base = Number(a.service.price);
              const reward = a.coupon?.reward;
              const discounted = reward ? calcDiscountedPrice(base, reward) : base;
              const hasDiscount = reward && discounted < base;
              return (
                <div className="flex items-center gap-2 flex-wrap">
                  {hasDiscount ? (
                    <>
                      <span className="line-through text-sm" style={{ color: 'rgba(20,40,28,0.4)' }}>
                        {base.toFixed(2)} zł
                      </span>
                      <span className="font-bold text-sm" style={{ color: '#15803D' }}>
                        {discounted.toFixed(2)} zł
                      </span>
                      <span
                        className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                        style={{ background: 'rgba(34,197,94,0.12)', color: '#15803D', border: '1px solid rgba(34,197,94,0.2)' }}
                      >
                        {reward.discountType === 'PERCENTAGE'
                          ? `-${Number(reward.discountValue)}%`
                          : `-${Number(reward.discountValue).toFixed(2)} zł`}
                      </span>
                    </>
                  ) : (
                    <span className="font-bold text-sm" style={{ color: '#C4965A' }}>
                      {base.toFixed(2)} zł
                    </span>
                  )}
                </div>
              );
            })()}
            <p className="text-sm" style={{ color: 'rgba(20,40,28,0.5)' }}>
              {format(new Date(a.date), "EEEE, d MMMM yyyy 'o' HH:mm", { locale: pl })}
            </p>
            {a.employee && (
              <p className="text-sm" style={{ color: 'rgba(20,40,28,0.5)' }}>
                Pracownik:{' '}
                <span className="font-medium" style={{ color: '#1A3828' }}>{a.employee.name}</span>
              </p>
            )}
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0">
            <span
              className="text-[11px] font-bold px-3 py-1.5 rounded-full"
              style={statusStyle}
            >
              {STATUS_LABELS[a.status] ?? a.status}
            </span>
            {canReschedule && (
              <button
                className="text-sm px-4 py-2.5 rounded-xl border transition-colors hover:opacity-80"
                style={{ borderColor: 'rgba(0,0,0,0.15)', color: '#1A3828' }}
                onClick={() => setRescheduleOpen(true)}
                disabled={a.rescheduleStatus === 'PENDING'}
              >
                {a.rescheduleStatus === 'PENDING' ? 'Zmiana w toku...' : 'Zmień termin'}
              </button>
            )}
          </div>
        </div>
```

Replace with:
```tsx
        {/* Header */}
        <div className="p-5">
          {/* Mobile top row: label left, status badge right */}
          <div className="flex items-center justify-between mb-3 sm:hidden">
            <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#C4965A' }}>
              {canReschedule ? 'Nadchodząca wizyta' : 'Przeszła wizyta'}
            </p>
            <span
              className="text-[11px] font-bold px-3 py-1.5 rounded-full"
              style={statusStyle}
            >
              {STATUS_LABELS[a.status] ?? a.status}
            </span>
          </div>

          {/* Desktop: flex-row layout; Mobile: info column only */}
          <div className="sm:flex sm:flex-row sm:justify-between sm:items-start sm:gap-4">
            {/* Info column — full width on mobile */}
            <div className="space-y-1 min-w-0">
              <p className="hidden sm:block text-[10px] font-bold uppercase tracking-wider" style={{ color: '#C4965A' }}>
                {canReschedule ? 'Nadchodząca wizyta' : 'Przeszła wizyta'}
              </p>
              <h3 className="text-[15px] font-heading font-bold" style={{ color: '#1A3828' }}>
                {a.service?.name}
              </h3>
              {a.service?.price && (() => {
                const base = Number(a.service.price);
                const reward = a.coupon?.reward;
                const discounted = reward ? calcDiscountedPrice(base, reward) : base;
                const hasDiscount = reward && discounted < base;
                return (
                  <div className="flex items-center gap-2 flex-wrap">
                    {hasDiscount ? (
                      <>
                        <span className="line-through text-sm" style={{ color: 'rgba(20,40,28,0.4)' }}>
                          {base.toFixed(2)} zł
                        </span>
                        <span className="font-bold text-sm" style={{ color: '#15803D' }}>
                          {discounted.toFixed(2)} zł
                        </span>
                        <span
                          className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                          style={{ background: 'rgba(34,197,94,0.12)', color: '#15803D', border: '1px solid rgba(34,197,94,0.2)' }}
                        >
                          {reward.discountType === 'PERCENTAGE'
                            ? `-${Number(reward.discountValue)}%`
                            : `-${Number(reward.discountValue).toFixed(2)} zł`}
                        </span>
                      </>
                    ) : (
                      <span className="font-bold text-sm" style={{ color: '#C4965A' }}>
                        {base.toFixed(2)} zł
                      </span>
                    )}
                  </div>
                );
              })()}
              <p className="text-sm" style={{ color: 'rgba(20,40,28,0.5)' }}>
                {format(new Date(a.date), "EEEE, d MMMM yyyy 'o' HH:mm", { locale: pl })}
              </p>
              {a.employee && (
                <p className="text-sm" style={{ color: 'rgba(20,40,28,0.5)' }}>
                  Pracownik:{' '}
                  <span className="font-medium" style={{ color: '#1A3828' }}>{a.employee.name}</span>
                </p>
              )}
            </div>

            {/* Desktop only: status badge + reschedule button */}
            <div className="hidden sm:flex flex-col items-end gap-2 shrink-0">
              <span
                className="text-[11px] font-bold px-3 py-1.5 rounded-full"
                style={statusStyle}
              >
                {STATUS_LABELS[a.status] ?? a.status}
              </span>
              {canReschedule && (
                <button
                  className="text-sm px-4 py-2.5 rounded-xl border transition-colors hover:opacity-80"
                  style={{ borderColor: 'rgba(0,0,0,0.15)', color: '#1A3828' }}
                  onClick={() => setRescheduleOpen(true)}
                  disabled={a.rescheduleStatus === 'PENDING'}
                >
                  {a.rescheduleStatus === 'PENDING' ? 'Zmiana w toku...' : 'Zmień termin'}
                </button>
              )}
            </div>
          </div>

          {/* Mobile only: full-width reschedule button */}
          {canReschedule && (
            <div className="mt-3 sm:hidden">
              <button
                className="w-full text-sm px-4 py-2.5 rounded-xl border transition-colors hover:opacity-80"
                style={{ borderColor: 'rgba(0,0,0,0.15)', color: '#1A3828' }}
                onClick={() => setRescheduleOpen(true)}
                disabled={a.rescheduleStatus === 'PENDING'}
              >
                {a.rescheduleStatus === 'PENDING' ? 'Zmiana w toku...' : 'Zmień termin'}
              </button>
            </div>
          )}
        </div>
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd cosmo-app/apps/web && pnpm tsc --noEmit
```
Expected: zero errors.

- [ ] **Step 3: Visual check on mobile viewport**

Open browser DevTools → toggle device toolbar → set width to 375px.
Navigate to `/user/wizyty`. Confirm:
- Appointment card text (service name, date, employee) is fully readable, no overflow
- Status badge and "Zmień termin" button are visible and not squeezed
- "Zmień termin" spans full card width on mobile
- At 640px+ the layout looks identical to before

- [ ] **Step 4: Commit**

```bash
cd cosmo-app
git add apps/web/src/pages/user/Appointments.tsx
git commit -m "feat: responsive AppointmentCard layout — fix mobile overflow"
```
