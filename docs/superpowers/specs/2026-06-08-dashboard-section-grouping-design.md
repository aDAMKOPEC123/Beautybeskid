# Dashboard Section Grouping — Design Spec

**Date:** 2026-06-08
**Status:** Approved by user

## Problem

The user dashboard (`/user`) renders ~11 cards/widgets stacked with `space-y-4` and no visual grouping or labels. On mobile, all cards look identical — same white background, same border — making the page feel like one undifferentiated pile. Users have no context for what they're looking at or where one topic ends and another begins.

## Solution

Group dashboard sections into 3 color-coded, labeled containers. Each container has a header row (dot + label) and wraps the related cards inside. The `NextAppointmentHero` stays as a standalone hero card above the groups.

## Layout Structure

Order below is the **intended final DOM order** — components are reordered from the current layout to match their logical group:

```
[Header: greeting + date]      ← DecoLine inside header is unchanged
[DashboardNewsBanner]          ← standalone, unchanged
[Welcome coupon]               ← standalone, conditional, unchanged
[NextAppointmentHero]          ← standalone hero card, unchanged

[SectionGroup: Historia wizyt]       ← color="green"
  └─ LastVisitCard
  └─ PendingReviews

[SectionGroup: Pielęgnacja skóry]    ← color="mint"
  └─ SkinWeatherWidget
  └─ HomecarePreviewCard
  └─ ReminderCards
  └─ JournalPreviewCard

[SectionGroup: Dla Ciebie]           ← color="caramel"
  └─ RecommendedSlider
  └─ Ambassador code block (inline in Dashboard.tsx)
```

The three `SectionGroup` containers are separated by `space-y-3` (12px). The root wrapper keeps `animate-enter`: `<div className="space-y-3 animate-enter">`.

## SectionGroup Component

**Create new file:** `apps/web/src/components/dashboard/SectionGroup.tsx`

**Props:**
```ts
interface SectionGroupProps {
  title: string;
  color: 'green' | 'mint' | 'caramel';
  children: React.ReactNode;
}
```

**Color prop → token mapping:**

| `color` prop | Section | Dot color | Title color | Header bg | Border |
|---|---|---|---|---|---|
| `'green'` | Historia wizyt | `#1A3828` | `rgba(26,56,40,0.5)` | `rgba(232,243,234,0.8)` | `rgba(26,56,40,0.08)` |
| `'mint'` | Pielęgnacja skóry | `#3D7A54` | `#3D7A54` | `rgba(61,122,84,0.06)` | `rgba(61,122,84,0.1)` |
| `'caramel'` | Dla Ciebie | `#C4965A` | `#C4965A` | `rgba(196,150,90,0.06)` | `rgba(196,150,90,0.15)` |

**Implementation uses inline styles.** The component carries no business logic.

```tsx
export function SectionGroup({ title, color, children }: SectionGroupProps) {
  const tokens = {
    green:   { dot: '#1A3828', titleColor: 'rgba(26,56,40,0.5)',  headBg: 'rgba(232,243,234,0.8)', border: 'rgba(26,56,40,0.08)' },
    mint:    { dot: '#3D7A54', titleColor: '#3D7A54',              headBg: 'rgba(61,122,84,0.06)',  border: 'rgba(61,122,84,0.1)' },
    caramel: { dot: '#C4965A', titleColor: '#C4965A',              headBg: 'rgba(196,150,90,0.06)', border: 'rgba(196,150,90,0.15)' },
  }[color];

  return (
    <div style={{ borderRadius: 18, border: `1.5px solid ${tokens.border}`, background: '#fff', overflow: 'hidden' }}>
      <div style={{ background: tokens.headBg, padding: '9px 12px', display: 'flex', alignItems: 'center', gap: 7 }}>
        <div style={{ width: 7, height: 7, borderRadius: '50%', background: tokens.dot, flexShrink: 0 }} />
        <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: tokens.titleColor }}>
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

### Inner card borders

Child components (`LastVisitCard`, `SkinWeatherWidget`, etc.) each carry their own outer `border: 1px solid rgba(0,0,0,0.06)`. This is **intentional** — the inner card borders provide visual separation between items within the group. The outer `SectionGroup` border uses a colored accent at 1.5px, which visually frames the group. No suppression of inner borders is required.

## Dashboard.tsx Changes

Replace the flat list of components with the grouped structure. The root div changes from `space-y-4` to `space-y-3` (keeps `animate-enter`).

**Usage:**
```tsx
<SectionGroup title="Historia wizyt" color="green">
  <LastVisitCard appointment={lastCompleted} />
  <PendingReviews />
</SectionGroup>

<SectionGroup title="Pielęgnacja skóry" color="mint">
  <SkinWeatherWidget />
  <HomecarePreviewCard />
  <ReminderCards />
  <JournalPreviewCard />
</SectionGroup>

<SectionGroup title="Dla Ciebie" color="caramel">
  <RecommendedSlider />
  {/* Ambassador code block — inline JSX, moved here from bottom of file */}
</SectionGroup>
```

## Existing Child Components

No changes to: `LastVisitCard`, `PendingReviews`, `SkinWeatherWidget`, `HomecarePreviewCard`, `ReminderCards`, `JournalPreviewCard`, `RecommendedSlider`.

## Out of Scope

- No changes to other user pages
- No changes to existing card component internals
- No animation changes
- Dark mode not supported by this app (all components use hardcoded light-mode colors)
- Desktop layout unchanged (grouping applies all breakpoints, most impactful on mobile)
