# Calendar Redesign — Design Spec

**Date:** 2026-04-07
**Scope:** `/admin/wizyty` (CalendarView only)
**Status:** Approved by user

---

## Problem

The existing admin calendar (`Appointments.tsx`, 1431 lines) has several pain points:

1. **No day view** — only a weekly grid exists; no way to focus on a single day
2. **Conflict visibility** — overlapping appointments render on top of each other with no visual separation
3. **Sparse appointment cards** — cards show minimal info; admin must click to see client name, service, phone, etc.
4. **No client context on click** — clicking an appointment shows only appointment fields, not the full client profile (history, skin journal, routine, recommended products)

---

## Solution

Replace the custom calendar grid with **FullCalendar** (`@fullcalendar/react`) and add a **slide-out client drawer**.

---

## Views

| Button | FullCalendar plugin | Behaviour |
|--------|--------------------|-----------|
| **Dzień** | `resourceTimeGridDay` | One column per employee. Clicking an employee header zooms to single-employee `timeGridDay`. |
| **Tydzień** | `timeGridWeek` | Existing week view, improved card rendering. Employee filter dropdown retained. |
| **Lista** | `listWeek` | Existing list view — unchanged. |

Day view defaults to **multi-resource** (all working employees as columns). Clicking an employee avatar/name in the column header switches to single-employee zoom (standard `timeGridDay` filtered to that employee). A "Wszyscy" button returns to multi-resource.

---

## Appointment Card (`AppointmentCard.tsx`)

Rendered via FullCalendar `eventContent`. Displays all 8 fields when card height allows; collapses gracefully on short slots:

1. Client full name
2. Service name
3. Start–end time (e.g. `9:00–10:30`)
4. Price (with discount if applicable, e.g. `120 zł (–20%)`)
5. Status label + background color (POTWIERDZONA / OCZEKUJĄCA / ZREALIZOWANA / ANULOWANA)
6. Employee avatar (initials circle) — visible in multi-resource week view
7. Allergy/notes warning icon (⚠️) — shown if `cardAllergies` or `cardConditions` are non-empty on the user record
8. Phone number — shown as small text; hidden on very short slots (< 40px height)

Card background color = appointment status (same color scheme as current).

Appointment objects returned by `appointmentsApi.getAll()` include `userId` — used to navigate to the client profile and to scope drawer API calls.

---

## Client Drawer (`ClientDrawer.tsx`)

Slides in from the right when any appointment card is clicked. The calendar remains visible and interactive on the left. Drawer width: `320px` on desktop, full-screen bottom sheet on mobile.

**Header:**
- Client full name
- Phone number
- Loyalty tier + visit count
- "Profil ↗" button — navigates to `/admin/uzytkownicy/:userId` using the `userId` from the appointment object
- Close (✕) button

**Tabs — lazy-loaded individually (each tab fetches on first mount):**

| Tab | API call | New work? |
|-----|----------|-----------|
| **Wizyta** | Data from clicked appointment object + `usersApi.getById(userId)` for `card*` fields | New frontend wrapper — backend `GET /users/:id` already exists (admin-only) |
| **Historia** | `appointmentsApi.getAll({ userId, limit: 10, page })` | New work: add `userId`, `page`, `limit` query params to frontend `getAll()` and to backend `GET /appointments` controller/service |
| **Dziennik** | `skinJournalApi.adminGetJournal(userId, page)` — existing admin method | Read-only in drawer context; "Otwórz pełny dziennik ↗" link to full admin view |
| **Rutyna** | Find most recent `COMPLETED` appointment from Historia data (or fetch via `appointmentsApi.getAll({ userId, status: 'COMPLETED', limit: 1 })`), then call existing `servicesApi.getOne(appointment.service.slug)`. Service has three routine fields: `routineFirst48h`, `routineFollowingDays`, `routineProducts`. Display each non-empty field as a labeled section. | `appointmentsApi.getAll` filter is new work (see Historia); no other new work |
| **Produkty** | `recommendationsApi.getByUser(userId)` | New work: add `GET /recommendations?userId=:id` backend route + frontend method. Admin-only endpoint returning all recommendations for a given user across all their appointments. |

**New API surface required by this spec (not currently in codebase):**

| Item | Type | Notes |
|------|------|-------|
| `usersApi.getById(userId)` | Frontend wrapper | Wraps existing `GET /users/:id` (admin route) |
| `appointmentsApi.getAll({ userId?, status?, limit?, page? })` | Frontend + backend | Extend existing endpoint with optional query params |
| `recommendationsApi.getByUser(userId)` | Frontend wrapper + new backend route | `GET /recommendations?userId=:id`, admin-only |

**Loading and error states:** Each tab renders a skeleton loader while its data is fetching. On error, shows a brief error message with a "Spróbuj ponownie" retry button. Tabs do not block each other — each manages its own loading state independently.

---

## Adding Appointments (Manual)

`AddAppointmentModal.tsx` — triggered by:
- Clicking an empty time slot on the grid (pre-fills date/time/employee resource)
- "+ Wizyta" button in the top bar

Fields: client search (existing users by name/phone) or manual name+phone for walk-ins without an account, employee, service, date, time. Uses existing `appointmentsApi.createAdmin()`.

---

## Happy Hours

`HappyHourModal.tsx` — triggered by "Happy Hours" toggle button in the top bar (same UX as current).

`HappyHourOverlay.tsx` — a data adapter component that fetches `happyHoursApi.getAll()` and converts the results into FullCalendar `backgroundEvents` format (`display: 'background'`, `color`, `startRecur`/`endRecur` for RECURRING type, explicit `start`/`end` for ONE_TIME). These events are passed into `<FullCalendar backgroundEvents={...} />` and render as semi-transparent overlays under appointment cards.

Supports ONE_TIME and RECURRING (day-of-week) types, unchanged from the current backend model.

---

## Conflict Detection

FullCalendar handles this automatically. Overlapping events within the same resource column render side-by-side at reduced width. No custom logic needed.

---

## Real-time Updates

Socket.IO listeners (`appointment:created`, `appointment:updated`, `appointment:deleted`) call `queryClient.invalidateQueries(['appointments'])` — FullCalendar re-renders automatically via React state.

---

## File Structure

```
apps/web/src/
  pages/admin/Appointments.tsx             # Reduced to ~300 lines (layout + state)
  components/calendar/
    CalendarView.tsx                       # FullCalendar wrapper, view switching, resources
    AppointmentCard.tsx                    # eventContent renderer (8-field card)
    ClientDrawer.tsx                       # Slide-out panel, tab routing
    ClientDrawer/
      DrawerVisitTab.tsx                   # Appointment details + quick actions
      DrawerHistoryTab.tsx                 # Past appointments list (paginated)
      DrawerJournalTab.tsx                 # Skin journal entries (read-only)
      DrawerRoutineTab.tsx                 # Routine from last completed service
      DrawerProductsTab.tsx               # Recommended products list
    AddAppointmentModal.tsx               # Manual appointment creation (walk-ins)
    HappyHourModal.tsx                    # Happy hour create/edit
    HappyHourOverlay.tsx                  # Fetches happy hours, converts to backgroundEvents
```

---

## New Dependencies

```json
"@fullcalendar/core": "^6.x",
"@fullcalendar/react": "^6.x",
"@fullcalendar/resource-timegrid": "^6.x",
"@fullcalendar/timegrid": "^6.x",
"@fullcalendar/list": "^6.x",
"@fullcalendar/interaction": "^6.x"
```

FullCalendar v6 is tree-shakeable; only imported plugins are bundled. `@fullcalendar/resource-timegrid` requires a FullCalendar Premium licence for commercial use — verify licensing before shipping.

---

## Out of Scope

- Employee Schedule page (`/employee/terminarz`) — unchanged by this spec
- Drag & drop rescheduling — foundation is present (`@fullcalendar/interaction`), can be enabled in a later iteration
- Mobile-specific layouts beyond the drawer bottom-sheet behaviour

---

## Success Criteria

- Admin can switch between Tydzień / Dzień / Lista views
- Day view shows all working employees as columns (multi-resource)
- Clicking an employee column header zooms to single-employee day view; "Wszyscy" returns to multi-resource
- Clicking any appointment opens the client drawer without closing the calendar
- Drawer tabs each load independently and show a skeleton while fetching
- All 8 card fields visible on cards of normal height (≥60px); phone hidden on slots < 40px
- Manual appointment creation works from empty slot click and "+ Wizyta" button
- Happy Hours blocks visible as semi-transparent background overlays on the grid
- Real-time Socket.IO updates reflect on the calendar without page refresh
- Rutyna tab displays the `routine` field from the service linked to the user's most recent completed appointment
