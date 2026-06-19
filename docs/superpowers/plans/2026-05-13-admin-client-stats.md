# Admin Client Statistics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enrich the admin `UserDetailsModal` with financial statistics (total spent, avg per visit, most frequent service) and expanded visit history rows showing price, loyalty points earned, and employee per appointment.

**Architecture:** Two-file change only. Backend `getUserDetails()` is extended to compute stats in JS from already-fetched Prisma data (no extra queries). The `loyaltyTransactions` take-cap is removed. Frontend modal gets a 7-card stats grid (3+3+1 layout) and expanded history rows with a detail sub-row for COMPLETED visits.

**Tech Stack:** Node.js/Express 5, Prisma ORM, TypeScript, React 19, TanStack Query, Tailwind CSS, Vitest

---

## File Map

| File | Change |
|---|---|
| `apps/server/src/modules/users/users.service.ts` | Enrich `getUserDetails`: add `employee` to appointments select, remove `take:20` cap on loyaltyTransactions, compute stats + pointsEarned inline |
| `apps/server/src/modules/users/users.service.test.ts` | Add `describe('getUserDetails')` tests for stats computation and pointsEarned mapping |
| `apps/web/src/pages/admin/Users.tsx` | Replace 4-card stats grid with 7-card layout; expand history rows with price/points/employee sub-row |

---

## Task 1: Backend — Enrich `getUserDetails` with stats and pointsEarned

**Files:**
- Modify: `apps/server/src/modules/users/users.service.ts`
- Test: `apps/server/src/modules/users/users.service.test.ts`

### Step 1.1: Add `getUserDetails` import to the test file's import line

Open `apps/server/src/modules/users/users.service.test.ts`. Find the import line:

```ts
import { getPendingUsers, approveUser, rejectUser, changeUserPassword } from './users.service';
```

Replace with:

```ts
import { getPendingUsers, approveUser, rejectUser, changeUserPassword, getUserDetails } from './users.service';
```

### Step 1.2: Write the failing tests for `getUserDetails`

Append to `apps/server/src/modules/users/users.service.test.ts` (after the last `describe` block):

```ts
describe('getUserDetails', () => {
  const makeUser = (overrides: Partial<Record<string, unknown>> = {}) => ({
    id: 'u1',
    email: 'test@test.pl',
    name: 'Anna',
    phone: null,
    role: 'USER',
    avatarPath: null,
    loyaltyPoints: 100,
    loyaltyTier: 'BRONZE',
    createdAt: new Date('2025-01-01'),
    termsAcceptedAt: null,
    marketingConsent: false,
    photoConsent: false,
    cardAllergies: null,
    cardConditions: null,
    cardPreferences: null,
    cardStaffNotes: null,
    appointments: [],
    loyaltyTransactions: [],
    ...overrides,
  });

  it('throws 404 if user not found', async () => {
    (prisma.user.findUnique as any).mockResolvedValue(null);
    await expect(getUserDetails('nonexistent')).rejects.toThrow(AppError);
  });

  it('returns totalSpent=0, avgPerVisit=0, mostFrequentService=null for a new user', async () => {
    (prisma.user.findUnique as any).mockResolvedValue(makeUser());
    const result = await getUserDetails('u1');
    expect(result.stats.totalSpent).toBe(0);
    expect(result.stats.avgPerVisit).toBe(0);
    expect(result.stats.mostFrequentService).toBeNull();
  });

  it('computes totalSpent and avgPerVisit from COMPLETED appointments only', async () => {
    (prisma.user.findUnique as any).mockResolvedValue(makeUser({
      appointments: [
        {
          id: 'a1', date: new Date('2026-01-10'), status: 'COMPLETED',
          notes: null, staffNote: null, createdAt: new Date(),
          service: { id: 's1', name: 'Manicure', durationMinutes: 60, price: 120 },
          employee: null,
        },
        {
          id: 'a2', date: new Date('2026-02-15'), status: 'COMPLETED',
          notes: null, staffNote: null, createdAt: new Date(),
          service: { id: 's2', name: 'Pedicure', durationMinutes: 90, price: 180 },
          employee: null,
        },
        {
          id: 'a3', date: new Date('2026-03-01'), status: 'CANCELLED',
          notes: null, staffNote: null, createdAt: new Date(),
          service: { id: 's3', name: 'Zabieg', durationMinutes: 60, price: 200 },
          employee: null,
        },
      ],
    }));
    const result = await getUserDetails('u1');
    expect(result.stats.totalSpent).toBe(300);   // 120 + 180, not 200 (cancelled)
    expect(result.stats.avgPerVisit).toBe(150);   // 300 / 2
  });

  it('returns the most frequent service name from COMPLETED appointments', async () => {
    (prisma.user.findUnique as any).mockResolvedValue(makeUser({
      appointments: [
        { id: 'a1', date: new Date('2026-01-01'), status: 'COMPLETED', notes: null, staffNote: null, createdAt: new Date(), service: { id: 's1', name: 'Manicure', durationMinutes: 60, price: 100 }, employee: null },
        { id: 'a2', date: new Date('2026-02-01'), status: 'COMPLETED', notes: null, staffNote: null, createdAt: new Date(), service: { id: 's1', name: 'Manicure', durationMinutes: 60, price: 100 }, employee: null },
        { id: 'a3', date: new Date('2026-03-01'), status: 'COMPLETED', notes: null, staffNote: null, createdAt: new Date(), service: { id: 's2', name: 'Pedicure', durationMinutes: 90, price: 150 }, employee: null },
      ],
    }));
    const result = await getUserDetails('u1');
    expect(result.stats.mostFrequentService).toBe('Manicure');
  });

  it('attaches pointsEarned to matching COMPLETED appointments via description prefix', async () => {
    (prisma.user.findUnique as any).mockResolvedValue(makeUser({
      appointments: [
        {
          id: 'a1', date: new Date('2026-01-10'), status: 'COMPLETED',
          notes: null, staffNote: null, createdAt: new Date(),
          service: { id: 's1', name: 'Manicure', durationMinutes: 60, price: 120 },
          employee: { id: 'e1', name: 'Ania K.' },
        },
      ],
      loyaltyTransactions: [
        { id: 't1', points: 24, type: 'EARN', description: 'Punkty za wizyte: Manicure', createdAt: new Date('2026-01-10') },
      ],
    }));
    const result = await getUserDetails('u1');
    const appt = result.allAppointments.find((a: any) => a.id === 'a1');
    expect(appt?.pointsEarned).toBe(24);
    expect(appt?.employee?.name).toBe('Ania K.');
  });

  it('sets pointsEarned=null for appointments with no matching transaction', async () => {
    (prisma.user.findUnique as any).mockResolvedValue(makeUser({
      appointments: [
        {
          id: 'a1', date: new Date('2026-01-10'), status: 'COMPLETED',
          notes: null, staffNote: null, createdAt: new Date(),
          service: { id: 's1', name: 'Manicure', durationMinutes: 60, price: 120 },
          employee: null,
        },
      ],
      loyaltyTransactions: [],
    }));
    const result = await getUserDetails('u1');
    const appt = result.allAppointments.find((a: any) => a.id === 'a1');
    expect(appt?.pointsEarned).toBeNull();
  });
});
```

- [ ] **Step 1.3: Run tests to verify they fail**

```bash
cd cosmo-app/apps/server
pnpm vitest run src/modules/users/users.service.test.ts
```

Expected: `getUserDetails` tests **FAIL** (function not yet enriched — it currently doesn't return `stats` or `pointsEarned`).

- [ ] **Step 1.4: Implement the enriched `getUserDetails`**

In `apps/server/src/modules/users/users.service.ts`, replace the entire `getUserDetails` function (find it by its export signature):

```ts
export const getUserDetails = async (id: string) => {
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      role: true,
      avatarPath: true,
      loyaltyPoints: true,
      loyaltyTier: true,
      createdAt: true,
      termsAcceptedAt: true,
      marketingConsent: true,
      photoConsent: true,
      cardAllergies: true,
      cardConditions: true,
      cardPreferences: true,
      cardStaffNotes: true,
      appointments: {
        select: {
          id: true,
          date: true,
          status: true,
          notes: true,
          staffNote: true,
          createdAt: true,
          service: {
            select: {
              id: true,
              name: true,
              durationMinutes: true,
              price: true,
            },
          },
          employee: {
            select: { id: true, name: true },
          },
        },
        orderBy: { date: 'desc' },
      },
      loyaltyTransactions: {
        select: {
          id: true,
          points: true,
          type: true,
          description: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        // No take limit — all EARN transactions needed for accurate pointsEarned matching
      },
    },
  });

  if (!user) {
    throw new AppError('Nie znaleziono uzytkownika', 404);
  }

  const now = new Date();
  const lastVisit =
    user.appointments.find((a) => a.status === 'COMPLETED' && new Date(a.date) < now) ?? null;
  const upcoming = user.appointments.filter(
    (a) =>
      (a.status === 'PENDING' || a.status === 'CONFIRMED') && new Date(a.date) >= now,
  );

  // --- Financial stats (computed in JS, no extra DB queries) ---
  const completedAppointments = user.appointments.filter((a) => a.status === 'COMPLETED');
  const totalSpent = completedAppointments.reduce((sum, a) => sum + (a.service?.price ?? 0), 0);
  const completedCount = completedAppointments.length;
  const avgPerVisit = completedCount > 0 ? Math.round(totalSpent / completedCount) : 0;

  const serviceCount: Record<string, number> = {};
  for (const a of completedAppointments) {
    if (a.service?.name) {
      serviceCount[a.service.name] = (serviceCount[a.service.name] ?? 0) + 1;
    }
  }
  const mostFrequentService =
    Object.keys(serviceCount).length > 0
      ? Object.entries(serviceCount).sort((a, b) => b[1] - a[1])[0][0]
      : null;

  // --- Points earned per appointment (inline — do not refactor getUserTimeline) ---
  const earnTransactions = user.loyaltyTransactions.filter(
    (t) =>
      t.type === 'EARN' &&
      VISIT_POINTS_PREFIXES.some((prefix) => t.description.startsWith(prefix)),
  );
  const pointsMap = new Map<string, number>();
  for (const t of earnTransactions) {
    const serviceName = extractVisitServiceName(t.description);
    if (!serviceName) continue;
    for (const a of completedAppointments) {
      if (a.service?.name === serviceName && !pointsMap.has(a.id)) {
        pointsMap.set(a.id, t.points);
        break;
      }
    }
  }

  const allAppointments = user.appointments.map((a) => ({
    ...a,
    pointsEarned: pointsMap.get(a.id) ?? null,
  }));

  return {
    ...user,
    lastVisit,
    upcoming,
    allAppointments,
    stats: {
      totalSpent,
      avgPerVisit,
      mostFrequentService,
    },
  };
};
```

- [ ] **Step 1.5: Run tests to verify they pass**

```bash
cd cosmo-app/apps/server
pnpm vitest run src/modules/users/users.service.test.ts
```

Expected: All tests **PASS** including the new `getUserDetails` describe block.

- [ ] **Step 1.6: Commit**

```bash
cd cosmo-app
git add apps/server/src/modules/users/users.service.ts apps/server/src/modules/users/users.service.test.ts
git commit -m "feat(users): enrich getUserDetails with financial stats and pointsEarned per appointment"
```

---

## Task 2: Frontend — Update stats grid (7 cards)

**Files:**
- Modify: `apps/web/src/pages/admin/Users.tsx`

- [ ] **Step 2.1: Add `Star` to lucide-react import**

In `apps/web/src/pages/admin/Users.tsx`, find:

```ts
import { Phone, Mail, BookOpen, ChevronDown, ChevronUp, UserPlus, Check, X } from 'lucide-react';
```

Replace with:

```ts
import { Phone, Mail, BookOpen, ChevronDown, ChevronUp, UserPlus, Check, X, Star } from 'lucide-react';
```

- [ ] **Step 2.2: Replace the 4-card stats grid with the 7-card layout**

Find the stats grid section (search for `{/* Stats grid */}`):

```tsx
              {/* Stats grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-muted/20 rounded-xl p-4 border border-border/50">
                  <p className="text-xs font-semibold uppercase text-muted-foreground mb-1">Konto założono</p>
                  <p className="font-bold text-foreground">{formatDate(data.createdAt)}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">({accountAge(data.createdAt)} temu)</p>
                </div>

                <div className="bg-muted/20 rounded-xl p-4 border border-border/50">
                  <p className="text-xs font-semibold uppercase text-muted-foreground mb-1">Ostatnia wizyta</p>
                  {data.lastVisit ? (
                    <>
                      <p className="font-bold text-foreground">{formatDate(data.lastVisit.date)}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">{data.lastVisit.service?.name}</p>
                    </>
                  ) : (
                    <p className="font-bold text-muted-foreground">Brak wizyt</p>
                  )}
                </div>

                <div className="bg-muted/20 rounded-xl p-4 border border-border/50">
                  <p className="text-xs font-semibold uppercase text-muted-foreground mb-1">Program lojalnościowy</p>
                  <span className={`inline-block px-2 py-1 rounded-md text-xs font-black ${TIER_COLORS[data.loyaltyTier] || 'bg-muted'}`}>
                    {TIER_LABELS[data.loyaltyTier] || data.loyaltyTier}
                  </span>
                  <p className="text-sm font-bold mt-1">{data.loyaltyPoints} pkt</p>
                </div>

                <div className="bg-muted/20 rounded-xl p-4 border border-border/50">
                  <p className="text-xs font-semibold uppercase text-muted-foreground mb-1">Wizyty łącznie</p>
                  <p className="font-bold text-2xl text-foreground">{data.allAppointments?.length ?? 0}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {data.upcoming?.length > 0 ? `${data.upcoming.length} zaplanowane` : 'Brak zaplanowanych'}
                  </p>
                </div>
              </div>
```

Replace with:

```tsx
              {/* Stats grid — 3 columns, 2 rows + optional 3rd row */}
              <div className="grid grid-cols-3 gap-3">
                {/* Row 1: Financial */}
                <div className="bg-muted/20 rounded-xl p-4 border border-border/50">
                  <p className="text-xs font-semibold uppercase text-muted-foreground mb-1">Wydano łącznie</p>
                  <p className="font-bold text-2xl text-green-600">{data.stats?.totalSpent ?? 0} zł</p>
                  <p className="text-xs text-muted-foreground mt-0.5">za wszystkie wizyty</p>
                </div>
                <div className="bg-muted/20 rounded-xl p-4 border border-border/50">
                  <p className="text-xs font-semibold uppercase text-muted-foreground mb-1">Wizyty łącznie</p>
                  <p className="font-bold text-2xl text-foreground">{data.allAppointments?.length ?? 0}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {data.upcoming?.length > 0 ? `${data.upcoming.length} zaplanowane` : 'Brak zaplanowanych'}
                  </p>
                </div>
                <div className="bg-muted/20 rounded-xl p-4 border border-border/50">
                  <p className="text-xs font-semibold uppercase text-muted-foreground mb-1">Średnia za wizytę</p>
                  {(data.stats?.avgPerVisit ?? 0) > 0 ? (
                    <p className="font-bold text-2xl text-foreground">{data.stats.avgPerVisit} zł</p>
                  ) : (
                    <p className="font-bold text-2xl text-muted-foreground">—</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-0.5">tylko zakończone</p>
                </div>

                {/* Row 2: Meta */}
                <div className="bg-muted/20 rounded-xl p-4 border border-border/50">
                  <p className="text-xs font-semibold uppercase text-muted-foreground mb-1">Ostatnia wizyta</p>
                  {data.lastVisit ? (
                    <>
                      <p className="font-bold text-foreground">{formatDate(data.lastVisit.date)}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">{data.lastVisit.service?.name}</p>
                    </>
                  ) : (
                    <p className="font-bold text-muted-foreground">Brak wizyt</p>
                  )}
                </div>
                <div className="bg-muted/20 rounded-xl p-4 border border-border/50">
                  <p className="text-xs font-semibold uppercase text-muted-foreground mb-1">Konto założono</p>
                  <p className="font-bold text-foreground">{formatDate(data.createdAt)}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">({accountAge(data.createdAt)} temu)</p>
                </div>
                <div className="bg-muted/20 rounded-xl p-4 border border-border/50">
                  <p className="text-xs font-semibold uppercase text-muted-foreground mb-1">Program lojalnościowy</p>
                  <span className={`inline-block px-2 py-1 rounded-md text-xs font-black ${TIER_COLORS[data.loyaltyTier] || 'bg-muted'}`}>
                    {TIER_LABELS[data.loyaltyTier] || data.loyaltyTier}
                  </span>
                  <p className="text-sm font-bold mt-1">{data.loyaltyPoints} pkt</p>
                </div>
              </div>

              {/* Row 3: Most frequent service (full width, only if present) */}
              {data.stats?.mostFrequentService && (
                <div className="bg-muted/20 rounded-xl p-4 border border-border/50 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                    <Star size={14} />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase text-muted-foreground">Najczęstsza usługa</p>
                    <p className="font-bold text-foreground">{data.stats.mostFrequentService}</p>
                  </div>
                </div>
              )}
```

- [ ] **Step 2.3: Commit**

```bash
cd cosmo-app
git add apps/web/src/pages/admin/Users.tsx
git commit -m "feat(admin/users): expand stats grid to 7 cards with financial metrics"
```

---

## Task 3: Frontend — Expand visit history rows

**Files:**
- Modify: `apps/web/src/pages/admin/Users.tsx`

- [ ] **Step 3.1: Replace the allAppointments history section**

Find the all appointments history block (search for `{/* All appointments history */}`):

```tsx
              {/* All appointments history */}
              {data.allAppointments?.length > 0 && (
                <div>
                  <h3 className="font-semibold text-base border-b pb-2 mb-3">Historia wizyt</h3>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {data.allAppointments.map((a: any) => (
                      <div key={a.id} className="flex items-center justify-between p-3 bg-muted/10 border border-border/40 rounded-lg">
                        <div>
                          <p className="font-semibold text-sm">{a.service?.name}</p>
                          <p className="text-xs text-muted-foreground">{formatDateTime(a.date)}</p>
                          {a.notes && <p className="text-xs text-muted-foreground italic mt-0.5">"{a.notes}"</p>}
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${STATUS_COLORS[a.status]}`}>
                          {STATUS_LABELS[a.status]}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
```

Replace with:

```tsx
              {/* All appointments history */}
              {data.allAppointments?.length > 0 && (
                <div>
                  <h3 className="font-semibold text-base border-b pb-2 mb-3">Historia wizyt</h3>
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {data.allAppointments.map((a: any) => (
                      <div
                        key={a.id}
                        className={`border border-border/40 rounded-lg overflow-hidden ${
                          a.status === 'CANCELLED' ? 'opacity-60' : ''
                        }`}
                      >
                        {/* Header row */}
                        <div className="flex items-center justify-between p-3 bg-muted/10">
                          <div>
                            <p className="font-semibold text-sm">{a.service?.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatDateTime(a.date)}
                              {a.employee?.name && ` · ${a.employee.name}`}
                            </p>
                          </div>
                          <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${STATUS_COLORS[a.status]}`}>
                            {STATUS_LABELS[a.status]}
                          </span>
                        </div>
                        {/* Detail sub-row — COMPLETED visits only */}
                        {a.status === 'COMPLETED' && (
                          <div className="flex items-center gap-4 px-3 py-2 bg-muted/5 border-t border-border/30">
                            {a.service?.price != null && (
                              <span className="text-xs font-bold text-green-700">
                                Cena: {a.service.price} zł
                              </span>
                            )}
                            {a.pointsEarned != null && (
                              <span className="text-xs font-bold text-violet-600">
                                +{a.pointsEarned} pkt
                              </span>
                            )}
                          </div>
                        )}
                        {/* Notes */}
                        {a.notes && (
                          <p className="px-3 pb-2 text-xs text-muted-foreground italic">"{a.notes}"</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
```

- [ ] **Step 3.2: Also update the empty-state message below it**

Find:

```tsx
              {data.allAppointments?.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">Ten klient nie ma jeszcze żadnych wizyt.</p>
              )}
```

This stays as-is — no change needed.

- [ ] **Step 3.3: Verify the app compiles**

```bash
cd cosmo-app/apps/web
pnpm build
```

Expected: Build succeeds with no TypeScript errors.

- [ ] **Step 3.4: Commit**

```bash
cd cosmo-app
git add apps/web/src/pages/admin/Users.tsx
git commit -m "feat(admin/users): expand visit history rows with price, points, and employee"
```

---

## Manual Verification Checklist

After all tasks are complete, start the dev server and open the admin panel:

```bash
cd cosmo-app
pnpm dev
```

Open `http://localhost:5173/admin/uzytkownicy`, click "Szczegóły" on any client.

- [ ] Stats grid shows 6 cards in a 3-column layout (2 rows) + optional full-width "Najczęstsza usługa" card (7 total when data present)
- [ ] "Wydano łącznie" shows total in green
- [ ] "Średnia za wizytę" shows `—` for clients with 0 completed visits
- [ ] "Najczęstsza usługa" card appears only for clients with ≥1 completed visit
- [ ] History rows: COMPLETED visits show a green price line + violet points (if earned)
- [ ] History rows: CANCELLED visits are visually muted (reduced opacity)
- [ ] Employee name appears in the sub-line if the appointment has one
