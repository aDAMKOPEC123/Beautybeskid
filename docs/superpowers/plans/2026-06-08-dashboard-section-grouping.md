# Dashboard Section Grouping Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Group the flat dashboard card list into 3 color-coded labeled containers (Historia wizyt, Pielęgnacja skóry, Dla Ciebie) to improve mobile readability.

**Architecture:** Create a single `SectionGroup` presentational component with color token support, then restructure `Dashboard.tsx` to wrap existing components in the appropriate groups. No backend changes, no API changes, no changes to child components.

**Tech Stack:** React 19, TypeScript, inline styles (no CSS class names)

**Spec:** `docs/superpowers/specs/2026-06-08-dashboard-section-grouping-design.md`

---

## File Map

| Action | File | Purpose |
|--------|------|---------|
| Create | `apps/web/src/components/dashboard/SectionGroup.tsx` | New presentational container component |
| Modify | `apps/web/src/pages/user/Dashboard.tsx` | Wrap existing components in groups, reorder, update root className |

---

### Task 1: Create SectionGroup component

**Files:**
- Create: `apps/web/src/components/dashboard/SectionGroup.tsx`

- [ ] **Step 1: Create the file with the full implementation**

Create `apps/web/src/components/dashboard/SectionGroup.tsx` with this exact content:

```tsx
import type { ReactNode } from 'react';

interface SectionGroupProps {
  title: string;
  color: 'green' | 'mint' | 'caramel';
  children: ReactNode;
}

const tokens = {
  green: {
    dot: '#1A3828',
    titleColor: 'rgba(26,56,40,0.5)',
    headBg: 'rgba(232,243,234,0.8)',
    border: 'rgba(26,56,40,0.08)',
  },
  mint: {
    dot: '#3D7A54',
    titleColor: '#3D7A54',
    headBg: 'rgba(61,122,84,0.06)',
    border: 'rgba(61,122,84,0.1)',
  },
  caramel: {
    dot: '#C4965A',
    titleColor: '#C4965A',
    headBg: 'rgba(196,150,90,0.06)',
    border: 'rgba(196,150,90,0.15)',
  },
};

export function SectionGroup({ title, color, children }: SectionGroupProps) {
  const t = tokens[color];
  return (
    <div style={{ borderRadius: 18, border: `1.5px solid ${t.border}`, background: '#fff', overflow: 'hidden' }}>
      <div style={{ background: t.headBg, padding: '9px 12px', display: 'flex', alignItems: 'center', gap: 7 }}>
        <div style={{ width: 7, height: 7, borderRadius: '50%', background: t.dot, flexShrink: 0 }} />
        <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: t.titleColor }}>
          {title}
        </span>
      </div>
      <div style={{ padding: 8, display: 'flex', flexDirection: 'column', gap: 5 }}>
        {children}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run from `cosmo-app/apps/web/`:
```bash
pnpm tsc --noEmit
```
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/dashboard/SectionGroup.tsx
git commit -m "feat: add SectionGroup component for dashboard grouping"
```

---

### Task 2: Restructure Dashboard.tsx

**Files:**
- Modify: `apps/web/src/pages/user/Dashboard.tsx`

- [ ] **Step 1: Add SectionGroup import**

In `apps/web/src/pages/user/Dashboard.tsx`, add to the imports block (after the last local import):

```tsx
import { SectionGroup } from '@/components/dashboard/SectionGroup';
```

- [ ] **Step 2: Replace the flat card list with grouped structure**

Find the `return (...)` in `UserDashboard`. Replace everything after `<NextAppointmentHero upcoming={upcoming} />` and before `<ConsultationModal` (there is no ConsultationModal here — replace from after NextAppointmentHero to the closing `</div>` of the root div).

The full new grouped section (replaces everything from `{/* Skin weather */}` to the ambassador block closing `</div>`):

```tsx
      {/* Historia wizyt */}
      <SectionGroup title="Historia wizyt" color="green">
        <LastVisitCard appointment={lastCompleted} />
        <PendingReviews />
      </SectionGroup>

      {/* Pielęgnacja skóry */}
      <SectionGroup title="Pielęgnacja skóry" color="mint">
        <SkinWeatherWidget />
        <HomecarePreviewCard />
        <ReminderCards />
        <JournalPreviewCard />
      </SectionGroup>

      {/* Dla Ciebie */}
      <SectionGroup title="Dla Ciebie" color="caramel">
        <RecommendedSlider />
        <div
          style={{
            borderRadius: '14px',
            overflow: 'hidden',
            background: 'white',
            border: '1px solid rgba(0,0,0,0.06)',
          }}
        >
          <button
            onClick={() => setAmbassadorOpen((v) => !v)}
            className="w-full flex items-center justify-between p-4 text-left transition-colors hover:bg-gray-50"
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{
                width: '32px', height: '32px', borderRadius: '9px',
                background: 'rgba(26,56,40,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <Users size={15} style={{ color: '#1A3828' }} />
              </span>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#1A3828' }}>
                Kod ambasadorski
              </span>
            </span>
            {ambassadorOpen
              ? <ChevronUp size={16} style={{ color: 'rgba(20,40,28,0.35)', flexShrink: 0 }} />
              : <ChevronDown size={16} style={{ color: 'rgba(20,40,28,0.35)', flexShrink: 0 }} />
            }
          </button>

          {ambassadorOpen && (
            <div style={{ padding: '0 16px 16px', borderTop: '1px solid rgba(0,0,0,0.05)' }}>
              <p style={{ fontFamily: 'monospace', fontSize: '22px', fontWeight: 700, letterSpacing: '0.2em', color: '#C4965A', marginTop: '14px', marginBottom: '4px' }}>
                {user?.ambassadorCode ?? '—'}
              </p>
              <p style={{ fontSize: '12px', color: 'rgba(20,40,28,0.5)', lineHeight: 1.5, marginBottom: '6px' }}>
                Udostępnij znajomym — przy rejestracji otrzymają kod rabatowy.
              </p>
              <p style={{ fontSize: '12px', color: 'rgba(20,40,28,0.65)' }}>
                Zaproszono:{' '}
                <span style={{ fontWeight: 700, color: '#1A3828' }}>{user?.referralCount ?? 0}</span> osób
              </p>
            </div>
          )}
        </div>
      </SectionGroup>
```

- [ ] **Step 3: Update root div className**

Change the root div from:
```tsx
<div className="space-y-4 animate-enter">
```
to:
```tsx
<div className="space-y-3 animate-enter">
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
pnpm tsc --noEmit
```
Expected: no errors

- [ ] **Step 5: Visual check in browser**

Start dev server from `cosmo-app/`:
```bash
pnpm dev
```
Open `http://localhost:5173`, log in as a user, go to `/user`.

Verify:
- Three colored section containers are visible below the appointment hero
- "Historia wizyt" header has dark green accent
- "Pielęgnacja skóry" header has medium green accent
- "Dla Ciebie" header has caramel accent
- Each container wraps its cards with inner padding
- No white screen or console errors

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/pages/user/Dashboard.tsx
git commit -m "feat: group dashboard cards into colored section containers"
```
