# Design: Profile Page — Edit Personal Data & Change Password

**Date:** 2026-06-16
**Status:** Approved
**Scope:** `cosmo-app` — user-facing profile page

---

## Summary

Add two new capabilities to the existing `/user/profil` page (`Profile.tsx`):

1. **Edit personal data** (name, phone) via a modal dialog triggered from the "Dane konta" section.
2. **Change password** as a new inline card section at the bottom of the profile page.

The existing `/user/zmien-haslo` page (`ChangePassword.tsx`) remains unchanged.

---

## Feature 1: Edit Personal Data (Modal)

### Trigger

A small **"Edytuj dane"** button is added to the header of the existing "Dane konta" `cardSection` in `Profile.tsx`. It appears next to the section title `<span>`, styled as a ghost/outline button. Clicking it sets `isEditModalOpen = true`.

### Modal State

Local state managed in `Profile.tsx`:
- `isEditModalOpen: boolean` — controls visibility
- `editName: string` — local copy of name field
- `editPhone: string` — local copy of phone field

**Initialization:** A `useEffect` watching `isEditModalOpen` initializes `editName` from `user.name` and `editPhone` from `profile?.phone ?? ''` whenever the modal opens (not on mount).

### Modal Contents

Rendered as a fixed overlay + centered card (not a separate component file — inline JSX in `Profile.tsx`).

| Field | Type | Behavior |
|---|---|---|
| Imie i nazwisko | `type="text"` input | Pre-filled with `editName` |
| Numer telefonu | `type="text"` input | Pre-filled with `editPhone`, optional |
| Adres email | Static `<p>` | Shows `user.email` + note "Adres e-mail nie moze byc zmieniony" |
| Zapisz zmiany | Submit button | Disabled when `isPending`; shows `<Loader2>` spinner when loading |
| Anuluj | Ghost button | Sets `isEditModalOpen = false`, no API call |

**Overlay behavior:**
- Clicking the overlay (outside the modal card) closes the modal
- `Escape` key closes the modal (via `useEffect` + `keydown` listener while open)

### Validation (before calling API)

- `editName.trim()` must be non-empty — show `toast.error` and abort
- `editPhone` is optional — if empty string, send `null`; otherwise send trimmed value

### API

- **Endpoint:** `PATCH /users/me` — verified: controller destructures `{ name, phone }` directly from `req.body` with no Zod schema, returns `{ status: 'success', data: { user } }`
- **Response shape:** `res.data.data.user` (consistent with all other `usersApi` functions)
- **Add to `usersApi`:**
  ```ts
  updateMe: async (data: { name?: string; phone?: string | null }): Promise<User> => {
    const res = await api.patch('/users/me', data);
    return res.data.data.user;
  },
  ```

### State After Success

1. `setUser(updatedUser)` — updates Zustand store (full `User` object returned, so name/avatarPath/etc. all current)
2. `queryClient.invalidateQueries({ queryKey: ['profile-consents'] })` — refreshes `phone` from query
3. `toast.success('Dane zostaly zaktualizowane.')`
4. `setIsEditModalOpen(false)`

On error: `toast.error(e.response?.data?.message || 'Nie udalo sie zaktualizowac danych.')`

Use `useMutation` with `isPending` to manage loading state and disable the submit button during the request.

### Styling

- **Overlay:** `fixed inset-0 bg-black/50 z-50 flex items-center justify-center`
- **Card:** `rounded-[20px] bg-white max-w-md w-full mx-4`, border `1px solid rgba(0,0,0,0.07)`, `boxShadow: 0 1px 4px rgba(0,0,0,0.04)`
- **Inputs:** `type="text"`, `rounded-xl px-3 py-3 text-sm`, border `1px solid rgba(0,0,0,0.1)`, background `#F4F9F5`, caramel (`#C4965A`) focus border
- **"Zapisz zmiany" button:** `background: #1A3828`, white text, `rounded-full px-5 py-3`
- **"Anuluj" button:** ghost style with border, dark text

---

## Feature 2: Change Password Section in Profile

### Location

New `cardSection` block added as the **last cardSection** in `Profile.tsx`, placed directly before the closing wrapper `<div>`, before the "Restart tour" standalone button.

### Section Contents

Title: **"Zmiana hasla"**

Three password inputs (all `type="password"`):
1. `Obecne haslo` — required
2. `Nowe haslo (min. 8 znakow)` — required
3. `Powtorz nowe haslo` — required

Submit button: **"Zmien haslo"** — disabled when `isPending`; shows `<Loader2>` spinner.

### Local State

Three `useState` strings: `currentPassword`, `newPassword`, `confirmPassword` — all initialized to `''`.

### Validation (before calling API)

1. `newPassword !== confirmPassword` → `toast.error('Nowe hasla nie sa identyczne')`, abort
2. `newPassword.length < 8` → `toast.error('Nowe haslo musi miec co najmniej 8 znakow')`, abort

### API

Reuses existing `usersApi.changePassword({ currentPassword, newPassword })` — no backend or API changes needed.

```ts
mutationFn: () => usersApi.changePassword({ currentPassword, newPassword })
```

### State After Success

- `toast.success('Haslo zostalo zmienione.')`
- Clear all three fields: `setCurrentPassword(''); setNewPassword(''); setConfirmPassword('')`

On error: `toast.error(e.response?.data?.message || 'Blad zmiany hasla')`

### Styling

Uses the existing `cardSection('Zmiana hasla', undefined, <children>)` helper. Input styling consistent with existing textareas on the page. Submit button same style as other save buttons (`background: #1A3828`, white, `rounded-full`).

---

## Files Changed

| File | Change |
|---|---|
| `apps/web/src/api/users.api.ts` | Add `updateMe()` function to `usersApi` object |
| `apps/web/src/pages/user/Profile.tsx` | Add `isEditModalOpen` state, `editName`/`editPhone` state, modal JSX, "Edytuj dane" button; add "Zmiana hasla" cardSection with `currentPassword`/`newPassword`/`confirmPassword` state and `useMutation` |

## Files NOT Changed

| File | Reason |
|---|---|
| `apps/server/src/modules/users/users.controller.ts` | `PATCH /users/me` already accepts `name` and `phone` — verified |
| `apps/server/src/modules/users/users.router.ts` | Routes already exist |
| `apps/web/src/pages/user/ChangePassword.tsx` | Kept as-is per user requirement |
| `apps/web/src/router.tsx` | No new routes needed |

---

## Out of Scope

- Email change (not allowed per business requirement)
- Inline field-level validation error messages (toasts are sufficient per existing app pattern)
- Full ARIA modal accessibility (focus trap, aria-modal) — Escape key and overlay close are sufficient for this app
- Backend validation changes
- Admin-side profile editing
