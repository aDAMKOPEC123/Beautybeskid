# Profile Page — Edit Personal Data & Change Password Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an "Edytuj dane" modal for editing name and phone, and a "Zmiana hasla" card section for changing password, both in the existing `/user/profil` page.

**Architecture:** Two features added entirely on the frontend. No backend changes required — `PATCH /users/me` already accepts `name` and `phone`; `PATCH /users/me/change-password` already exists. All changes live in two files: `users.api.ts` (add `updateMe`) and `Profile.tsx` (modal + password section).

**Tech Stack:** React 19, TypeScript, TanStack Query (`useMutation`), Zustand, Sonner (toasts), Lucide React icons, Tailwind CSS.

**Spec:** `docs/superpowers/specs/2026-06-16-profile-edit-personal-data-and-password-design.md`

---

## File Map

| File | What changes |
|---|---|
| `apps/web/src/api/users.api.ts` | Add `updateMe()` method to `usersApi` object |
| `apps/web/src/pages/user/Profile.tsx` | (1) Extend `cardSection` helper with optional `headerAction`; (2) Add modal state + Escape listener + useMutation for editing name/phone; (3) Add "Edytuj dane" button to "Dane konta" section; (4) Add modal JSX; (5) Add "Zmiana hasla" card section with useMutation |

---

## Task 1: Add `updateMe` API function

**Files:**
- Modify: `cosmo-app/apps/web/src/api/users.api.ts`

- [ ] **Step 1: Add `updateMe` to the `usersApi` object**

Open `apps/web/src/api/users.api.ts`. Inside the `usersApi` object, add this method (e.g. after `updateOnboarding`):

```ts
updateMe: async (data: { name?: string; phone?: string | null }): Promise<User> => {
  const res = await api.patch('/users/me', data);
  return res.data.data.user;
},
```

The `User` type is already imported from `@cosmo/shared`. The response shape `res.data.data.user` matches all other methods in this file (`uploadAvatar`, `updateMyCard`).

- [ ] **Step 2: Verify TypeScript compiles**

From `cosmo-app/apps/web/`:
```bash
pnpm build
```
Expected: zero TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/api/users.api.ts
git commit -m "feat(profile): add updateMe API function"
```

---

## Task 2: Feature 1 — Edit personal data modal

**Files:**
- Modify: `cosmo-app/apps/web/src/pages/user/Profile.tsx`

### Step 1: Add `X` to lucide-react import

- [ ] At the top of `Profile.tsx`, find:
```tsx
import { Loader2, Bell, BellOff } from 'lucide-react';
```
Change to:
```tsx
import { Loader2, Bell, BellOff, X } from 'lucide-react';
```

### Step 2: Extend `cardSection` helper with optional `headerAction`

- [ ] Find the `cardSection` helper inside `Profile.tsx` (it's a `const` defined inside the component or above the `return`). It currently has this signature:

```tsx
const cardSection = (
  title: string,
  subtitle?: string,
  children?: React.ReactNode
) => (
```

Change the signature and the inner header `<div>` to:

```tsx
const cardSection = (
  title: string,
  subtitle?: string,
  children?: React.ReactNode,
  headerAction?: React.ReactNode,
) => (
  <div
    className="max-w-xl rounded-[20px] overflow-hidden"
    style={{ border: '1px solid rgba(0,0,0,0.07)', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', background: '#fff' }}
  >
    <div
      className="px-6 py-5"
      style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <DecoLine />
          <span className="text-[10px] font-semibold tracking-[0.35em] uppercase text-caramel">
            {title}
          </span>
        </div>
        {headerAction}
      </div>
      {subtitle && (
        <p className="text-xs mt-1" style={{ color: 'rgba(20,40,28,0.5)' }}>{subtitle}</p>
      )}
    </div>
    {children}
  </div>
);
```

### Step 3: Add modal state variables

- [ ] Inside `UserProfile` component, near the other `useState` declarations, add:

```tsx
const [isEditModalOpen, setIsEditModalOpen] = useState(false);
const [editName, setEditName] = useState('');
const [editPhone, setEditPhone] = useState('');
```

### Step 4: Add useEffect to initialize modal state when it opens

- [ ] After the existing `useEffect` that syncs `profile` data (the one with `[profile]` dependency), add:

```tsx
useEffect(() => {
  if (isEditModalOpen) {
    setEditName(user?.name ?? '');
    setEditPhone(user?.phone ?? '');
  }
}, [isEditModalOpen]);
```

Note: `user` comes from `useAuth()` which is already destructured at the top. `user.phone` is included in the full User object returned by the server.

### Step 5: Add useEffect for Escape key to close modal

- [ ] Add another `useEffect`:

```tsx
useEffect(() => {
  if (!isEditModalOpen) return;
  const handler = (e: KeyboardEvent) => {
    if (e.key === 'Escape') setIsEditModalOpen(false);
  };
  document.addEventListener('keydown', handler);
  return () => document.removeEventListener('keydown', handler);
}, [isEditModalOpen]);
```

### Step 6: Add `useMutation` for saving profile data

- [ ] After the existing `useMutation` hooks (e.g. after `saveConsents`), add:

```tsx
const { mutate: saveProfile, isPending: savingProfile } = useMutation({
  mutationFn: () =>
    usersApi.updateMe({
      name: editName.trim(),
      phone: editPhone.trim() || null,
    }),
  onSuccess: (updatedUser) => {
    setUser(updatedUser);
    queryClient.invalidateQueries({ queryKey: ['profile-consents'] });
    toast.success('Dane zostaly zaktualizowane.');
    setIsEditModalOpen(false);
  },
  onError: (e: any) =>
    toast.error(e.response?.data?.message || 'Nie udalo sie zaktualizowac danych.'),
});

const handleSaveProfile = () => {
  if (!editName.trim()) {
    toast.error('Imie i nazwisko nie moze byc puste.');
    return;
  }
  saveProfile();
};
```

### Step 7: Update the "Dane konta" `cardSection` call to add the button

- [ ] Find the existing "Dane konta" section call:
```tsx
{cardSection('Dane konta', undefined,
  <div>
    {[
      { label: 'Imię i nazwisko', value: user?.name },
      ...
```

Change to pass a 4th argument `headerAction`:
```tsx
{cardSection(
  'Dane konta',
  undefined,
  <div>
    {[
      { label: 'Imię i nazwisko', value: user?.name },
      { label: 'Adres Email', value: user?.email },
      { label: 'Numer telefonu', value: user?.phone || 'Brak wpisanego telefonu' },
    ].map(({ label, value }, idx, arr) => (
      <div
        key={label}
        className="grid grid-cols-3 py-5 px-6 transition-colors"
        style={{
          borderBottom: idx < arr.length - 1 ? '1px solid rgba(0,0,0,0.06)' : undefined,
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(0,0,0,0.02)'; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = ''; }}
      >
        <span className="font-medium flex items-center" style={{ color: 'rgba(20,40,28,0.5)' }}>{label}</span>
        <span className="col-span-2 font-semibold text-lg" style={{ color: '#1A3828' }}>{value}</span>
      </div>
    ))}
  </div>,
  <button
    onClick={() => setIsEditModalOpen(true)}
    className="text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors hover:bg-gray-50"
    style={{ borderColor: 'rgba(0,0,0,0.12)', color: '#1A3828' }}
  >
    Edytuj dane
  </button>
)}
```

### Step 8: Remove the "contact staff" note below "Dane konta"

- [ ] Find and delete this block (it's right after the "Dane konta" section):
```tsx
<div className="max-w-xl">
  <p className="text-xs italic text-center" style={{ color: 'rgba(20,40,28,0.45)' }}>
    Aby zmienić swoje dane skontaktuj się z obsługą gabinetu.
  </p>
</div>
```

### Step 9: Add modal JSX

- [ ] Inside the `return (...)` JSX, add the modal at the very top of the wrapper div (right after `<div className="space-y-8 animate-enter" data-tour="profile-form">`):

```tsx
{/* Edit personal data modal */}
{isEditModalOpen && (
  <div
    className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center"
    onClick={() => setIsEditModalOpen(false)}
  >
    <div
      className="rounded-[20px] bg-white max-w-md w-full mx-4"
      style={{ border: '1px solid rgba(0,0,0,0.07)', boxShadow: '0 4px 24px rgba(0,0,0,0.12)' }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Modal header */}
      <div className="px-6 py-5" style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <DecoLine />
            <span className="text-[10px] font-semibold tracking-[0.35em] uppercase text-caramel">
              Edytuj dane
            </span>
          </div>
          <button
            onClick={() => setIsEditModalOpen(false)}
            className="p-1 rounded-full hover:bg-gray-100 transition-colors"
            style={{ color: 'rgba(20,40,28,0.4)' }}
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Modal body */}
      <div className="p-6 space-y-4">
        {/* Name */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium" style={{ color: '#1A3828' }}>
            Imie i nazwisko
          </label>
          <input
            type="text"
            className="w-full rounded-xl px-3 py-3 text-sm outline-none transition-colors"
            style={{ border: '1px solid rgba(0,0,0,0.1)', background: '#F4F9F5' }}
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onFocus={(e) => { e.currentTarget.style.borderColor = '#C4965A'; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(0,0,0,0.1)'; }}
          />
        </div>

        {/* Phone */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium" style={{ color: '#1A3828' }}>
            Numer telefonu <span className="font-normal" style={{ color: 'rgba(20,40,28,0.4)' }}>(opcjonalny)</span>
          </label>
          <input
            type="text"
            className="w-full rounded-xl px-3 py-3 text-sm outline-none transition-colors"
            style={{ border: '1px solid rgba(0,0,0,0.1)', background: '#F4F9F5' }}
            value={editPhone}
            onChange={(e) => setEditPhone(e.target.value)}
            onFocus={(e) => { e.currentTarget.style.borderColor = '#C4965A'; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(0,0,0,0.1)'; }}
          />
        </div>

        {/* Email (read-only) */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium" style={{ color: '#1A3828' }}>
            Adres e-mail
          </label>
          <p
            className="text-sm px-3 py-3 rounded-xl"
            style={{ background: 'rgba(0,0,0,0.03)', color: 'rgba(20,40,28,0.5)' }}
          >
            {user?.email}{' '}
            <span className="text-xs italic">— nie mozna zmienic</span>
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <button
            onClick={handleSaveProfile}
            disabled={savingProfile}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full text-sm font-semibold transition-opacity hover:opacity-80 disabled:opacity-60"
            style={{ background: '#1A3828', color: '#fff' }}
          >
            {savingProfile && <Loader2 className="w-4 h-4 animate-spin" />}
            Zapisz zmiany
          </button>
          <button
            onClick={() => setIsEditModalOpen(false)}
            disabled={savingProfile}
            className="inline-flex items-center justify-center px-5 py-3 rounded-full text-sm font-semibold border transition-colors hover:bg-gray-50 disabled:opacity-60"
            style={{ borderColor: 'rgba(0,0,0,0.12)', color: '#1A3828' }}
          >
            Anuluj
          </button>
        </div>
      </div>
    </div>
  </div>
)}
```

- [ ] **Step 10: Verify TypeScript build**

```bash
cd cosmo-app/apps/web && pnpm build
```
Expected: zero errors.

- [ ] **Step 11: Commit**

```bash
git add apps/web/src/pages/user/Profile.tsx
git commit -m "feat(profile): add edit personal data modal"
```

---

## Task 3: Feature 2 — Change password section

**Files:**
- Modify: `cosmo-app/apps/web/src/pages/user/Profile.tsx`

### Step 1: Add password field state variables

- [ ] Inside `UserProfile` component, near the other `useState` declarations, add:

```tsx
const [currentPassword, setCurrentPassword] = useState('');
const [newPassword, setNewPassword] = useState('');
const [confirmPassword, setConfirmPassword] = useState('');
```

### Step 2: Add `useMutation` for changing password

- [ ] After the `saveProfile` mutation block, add:

```tsx
const { mutate: doChangePassword, isPending: changingPassword } = useMutation({
  mutationFn: () => usersApi.changePassword({ currentPassword, newPassword }),
  onSuccess: () => {
    toast.success('Haslo zostalo zmienione.');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  },
  onError: (e: any) =>
    toast.error(e.response?.data?.message || 'Blad zmiany hasla'),
});

const handleChangePassword = () => {
  if (newPassword !== confirmPassword) {
    toast.error('Nowe hasla nie sa identyczne');
    return;
  }
  if (newPassword.length < 8) {
    toast.error('Nowe haslo musi miec co najmniej 8 znakow');
    return;
  }
  doChangePassword();
};
```

### Step 3: Add the "Zmiana hasla" card section to the JSX

- [ ] In the `return (...)` JSX, find the "Restart tour" block at the bottom:
```tsx
{/* Restart tour */}
<div className="max-w-xl pt-4 border-t border-border/50">
```

Insert the new section **immediately before** that block:

```tsx
{/* Change password */}
{cardSection(
  'Zmiana hasla',
  undefined,
  <div className="p-6 space-y-4">
    {[
      { label: 'Obecne haslo', value: currentPassword, setter: setCurrentPassword },
      { label: 'Nowe haslo (min. 8 znakow)', value: newPassword, setter: setNewPassword },
      { label: 'Powtorz nowe haslo', value: confirmPassword, setter: setConfirmPassword },
    ].map(({ label, value, setter }) => (
      <div key={label} className="space-y-1.5">
        <label className="text-sm font-medium" style={{ color: '#1A3828' }}>{label}</label>
        <input
          type="password"
          className="w-full rounded-xl px-3 py-3 text-sm outline-none transition-colors"
          style={{ border: '1px solid rgba(0,0,0,0.1)', background: '#F4F9F5' }}
          value={value}
          onChange={(e) => setter(e.target.value)}
          onFocus={(e) => { e.currentTarget.style.borderColor = '#C4965A'; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(0,0,0,0.1)'; }}
        />
      </div>
    ))}
    <div className="pt-1">
      <button
        onClick={handleChangePassword}
        disabled={changingPassword}
        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full text-sm font-semibold transition-opacity hover:opacity-80 disabled:opacity-60"
        style={{ background: '#1A3828', color: '#fff' }}
      >
        {changingPassword && <Loader2 className="w-4 h-4 animate-spin" />}
        Zmien haslo
      </button>
    </div>
  </div>
)}
```

- [ ] **Step 4: Verify TypeScript build**

```bash
cd cosmo-app/apps/web && pnpm build
```
Expected: zero errors.

- [ ] **Step 5: Manual verification**

Start the dev server (`pnpm dev` from `cosmo-app/`) and log in as a regular user. Navigate to `/user/profil`. Verify:
1. "Dane konta" section has an "Edytuj dane" button in the header
2. Clicking "Edytuj dane" opens the modal with pre-filled name and phone
3. Editing name/phone and clicking "Zapisz zmiany" saves and closes the modal; toast appears; display updates
4. Clicking "Anuluj" or pressing Escape or clicking the overlay closes the modal without saving
5. Submitting empty name shows toast error without API call
6. "Zmiana hasla" section appears at the bottom of the page
7. Entering mismatched or too-short passwords shows appropriate toast errors
8. Correct password change shows success toast and clears the fields
9. `/user/zmien-haslo` page still works unchanged

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/pages/user/Profile.tsx
git commit -m "feat(profile): add change password section"
```
