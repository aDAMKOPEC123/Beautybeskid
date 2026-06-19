# Skin Journal Categories Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace free-form tag text input with 4 fixed category toggle buttons (#stopy, #twarz, #włosy, #skóra ciała) displayed as hashtags across user journal, admin journal, and the calendar drawer preview.

**Architecture:** Pure frontend change — categories are stored in the same `String[]` Prisma field (`tags`), just now populated with known slugs. No backend migration or API changes needed. A shared `JOURNAL_CATEGORIES` constant drives both form toggles and display labels.

**Tech Stack:** React, TypeScript, inline styles (matching existing patterns in these files)

---

## File Map

| File | Change |
|------|--------|
| `apps/web/src/pages/user/SkinJournal.tsx` | Replace tag text input with category toggles; display as hashtags in both card types |
| `apps/web/src/pages/admin/UserJournal.tsx` | Same toggle for AddNoteForm; hashtag display in both card types |
| `apps/web/src/components/calendar/ClientDrawer/DrawerJournalTab.tsx` | Hashtag display in entry preview |

---

## Shared constant (to be defined at top of each file)

```ts
const JOURNAL_CATEGORIES = [
  { slug: 'stopy',       label: '#stopy' },
  { slug: 'twarz',       label: '#twarz' },
  { slug: 'wlosy',       label: '#włosy' },
  { slug: 'skora_ciala', label: '#skóra ciała' },
] as const;
```

---

## Task 1: Update `apps/web/src/pages/user/SkinJournal.tsx`

**Files:**
- Modify: `apps/web/src/pages/user/SkinJournal.tsx`

### 1a — Add JOURNAL_CATEGORIES constant

- [ ] After the `MOODS` constant on line 9, add:

```ts
const JOURNAL_CATEGORIES = [
  { slug: 'stopy',       label: '#stopy' },
  { slug: 'twarz',       label: '#twarz' },
  { slug: 'wlosy',       label: '#włosy' },
  { slug: 'skora_ciala', label: '#skóra ciała' },
] as const;

type CategorySlug = typeof JOURNAL_CATEGORIES[number]['slug'];
```

### 1b — Replace tag display in `AdminEntryCard` (lines 108–114)

- [ ] Replace:

```tsx
      {entry.tags.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
          {entry.tags.map((tag) => (
            <span key={tag} style={{ fontSize: 11, padding: '3px 10px', background: 'rgba(26,18,8,0.07)', color: '#4B4036', borderRadius: 20, fontWeight: 500 }}>{tag}</span>
          ))}
        </div>
      )}
```

With:

```tsx
      {entry.tags.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
          {entry.tags.map((tag) => {
            const cat = JOURNAL_CATEGORIES.find((c) => c.slug === tag);
            return (
              <span key={tag} style={{ fontSize: 11, fontWeight: 700, color: '#4B4036' }}>
                {cat ? cat.label : `#${tag}`}
              </span>
            );
          })}
        </div>
      )}
```

### 1c — Replace tag display in `EntryCard` (lines 157–163)

- [ ] Replace:

```tsx
      {entry.tags.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: entry.comments.length > 0 ? 10 : 0 }}>
          {entry.tags.map((tag) => (
            <span key={tag} style={{ fontSize: 11, padding: '3px 10px', background: '#fdf6ec', color: '#B8913A', border: '1px solid #f0e0c0', borderRadius: 20, fontWeight: 500 }}>{tag}</span>
          ))}
        </div>
      )}
```

With:

```tsx
      {entry.tags.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: entry.comments.length > 0 ? 10 : 0 }}>
          {entry.tags.map((tag) => {
            const cat = JOURNAL_CATEGORIES.find((c) => c.slug === tag);
            return (
              <span key={tag} style={{ fontSize: 12, fontWeight: 700, color: '#B8913A' }}>
                {cat ? cat.label : `#${tag}`}
              </span>
            );
          })}
        </div>
      )}
```

### 1d — Replace tag input in `AddEntryForm`

- [ ] In `AddEntryForm`, remove the `tagsRaw` state and replace with `selectedCategories`:

Change state declaration from:
```ts
  const [tagsRaw, setTagsRaw] = useState('');
```
To:
```ts
  const [selectedCategories, setSelectedCategories] = useState<CategorySlug[]>([]);
```

- [ ] In the `mutationFn`, replace:
```ts
      const tags = tagsRaw.split(',').map((t) => t.trim()).filter(Boolean);
      tags.forEach((t) => fd.append('tags', t));
```
With:
```ts
      selectedCategories.forEach((t) => fd.append('tags', t));
```

- [ ] Replace the tag input JSX block:

```tsx
      <div style={{ marginBottom: 16 }}>
        <label style={{ display: 'block', fontSize: 13, color: '#666', marginBottom: 6, fontWeight: 500 }}>Tagi (opcjonalnie, oddzielone przecinkami)</label>
        <input type="text" value={tagsRaw} onChange={(e) => setTagsRaw(e.target.value)} placeholder="np. nawilżenie, trądzik, po zabiegu" style={{ width: '100%', padding: '10px 12px', border: '1px solid #e5e0d8', borderRadius: 8, fontSize: 14, color: '#1A1208', background: '#faf9f7', boxSizing: 'border-box' }} />
      </div>
```

With:

```tsx
      <div style={{ marginBottom: 16 }}>
        <label style={{ display: 'block', fontSize: 13, color: '#666', marginBottom: 8, fontWeight: 500 }}>Kategoria (opcjonalnie)</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {JOURNAL_CATEGORIES.map((cat) => {
            const active = selectedCategories.includes(cat.slug);
            return (
              <button
                key={cat.slug}
                type="button"
                onClick={() =>
                  setSelectedCategories((prev) =>
                    active ? prev.filter((s) => s !== cat.slug) : [...prev, cat.slug]
                  )
                }
                style={{
                  padding: '8px 14px',
                  border: active ? '2px solid #B8913A' : '2px solid #e5e0d8',
                  borderRadius: 20,
                  background: active ? '#fdf6ec' : '#faf9f7',
                  color: active ? '#B8913A' : '#888',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>
```

- [ ] Commit:
```bash
git add apps/web/src/pages/user/SkinJournal.tsx
git commit -m "feat(journal): replace tag text input with category toggle buttons, display as hashtags"
```

---

## Task 2: Update `apps/web/src/pages/admin/UserJournal.tsx`

**Files:**
- Modify: `apps/web/src/pages/admin/UserJournal.tsx`

### 2a — Add JOURNAL_CATEGORIES constant

- [ ] After the `MOODS` constant on line 8, add:

```ts
const JOURNAL_CATEGORIES = [
  { slug: 'stopy',       label: '#stopy' },
  { slug: 'twarz',       label: '#twarz' },
  { slug: 'wlosy',       label: '#włosy' },
  { slug: 'skora_ciala', label: '#skóra ciała' },
] as const;

type CategorySlug = typeof JOURNAL_CATEGORIES[number]['slug'];
```

### 2b — Replace tag display in admin `isAdminEntry` card (lines 87–93)

- [ ] Replace:
```tsx
        {entry.tags.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 10 }}>
            {entry.tags.map((tag) => (
              <span key={tag} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: 'rgba(26,18,8,0.07)', color: '#4B4036' }}>{tag}</span>
            ))}
          </div>
        )}
```

With:
```tsx
        {entry.tags.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
            {entry.tags.map((tag) => {
              const cat = JOURNAL_CATEGORIES.find((c) => c.slug === tag);
              return (
                <span key={tag} style={{ fontSize: 11, fontWeight: 700, color: '#4B4036' }}>
                  {cat ? cat.label : `#${tag}`}
                </span>
              );
            })}
          </div>
        )}
```

### 2c — Replace tag display in user entry card (lines 127–133)

- [ ] Replace:
```tsx
      {entry.tags.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 10 }}>
          {entry.tags.map((tag) => (
            <span key={tag} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: '#fdf6ec', color: '#B8913A', border: '1px solid #f0e0c0' }}>{tag}</span>
          ))}
        </div>
      )}
```

With:
```tsx
      {entry.tags.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
          {entry.tags.map((tag) => {
            const cat = JOURNAL_CATEGORIES.find((c) => c.slug === tag);
            return (
              <span key={tag} style={{ fontSize: 12, fontWeight: 700, color: '#B8913A' }}>
                {cat ? cat.label : `#${tag}`}
              </span>
            );
          })}
        </div>
      )}
```

### 2d — Replace tag input in `AddNoteForm`

- [ ] In `AddNoteForm`, remove the `tagsRaw` state and replace with `selectedCategories`:

Change:
```ts
  const [tagsRaw, setTagsRaw] = useState('');
```
To:
```ts
  const [selectedCategories, setSelectedCategories] = useState<CategorySlug[]>([]);
```

- [ ] In the `mutationFn`, replace:
```ts
        tags: tagsRaw.split(',').map((t) => t.trim()).filter(Boolean),
```
With:
```ts
        tags: selectedCategories,
```

- [ ] Replace the tag input JSX block:

```tsx
      <label style={{ fontSize: 11, color: '#6B6560', display: 'block', marginBottom: 4 }}>Tagi (oddzielone przecinkami)</label>
      <input type="text" value={tagsRaw} onChange={(e) => setTagsRaw(e.target.value)} placeholder="np. peeling, nawilżenie" style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e0d8', borderRadius: 8, marginBottom: 14, fontSize: 13, boxSizing: 'border-box' }} />
```

With:

```tsx
      <label style={{ fontSize: 11, color: '#6B6560', display: 'block', marginBottom: 6 }}>Kategoria</label>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
        {JOURNAL_CATEGORIES.map((cat) => {
          const active = selectedCategories.includes(cat.slug);
          return (
            <button
              key={cat.slug}
              type="button"
              onClick={() =>
                setSelectedCategories((prev) =>
                  active ? prev.filter((s) => s !== cat.slug) : [...prev, cat.slug]
                )
              }
              style={{
                padding: '6px 12px',
                border: active ? '2px solid #1A1208' : '2px solid #e5e0d8',
                borderRadius: 20,
                background: active ? '#1A1208' : '#faf9f7',
                color: active ? '#fff' : '#888',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {cat.label}
            </button>
          );
        })}
      </div>
```

- [ ] Commit:
```bash
git add apps/web/src/pages/admin/UserJournal.tsx
git commit -m "feat(journal): admin form — category toggles, hashtag display"
```

---

## Task 3: Update `apps/web/src/components/calendar/ClientDrawer/DrawerJournalTab.tsx`

**Files:**
- Modify: `apps/web/src/components/calendar/ClientDrawer/DrawerJournalTab.tsx`

### 3a — Add JOURNAL_CATEGORIES and update display

- [ ] After the `MOOD_EMOJI` constant, add:

```ts
const JOURNAL_CATEGORIES = [
  { slug: 'stopy',       label: '#stopy' },
  { slug: 'twarz',       label: '#twarz' },
  { slug: 'wlosy',       label: '#włosy' },
  { slug: 'skora_ciala', label: '#skóra ciała' },
] as const;
```

- [ ] Replace the tags display block (lines 61–67):

```tsx
          {entry.tags?.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {entry.tags.map((t: string) => (
                <span key={t} className="bg-gray-100 rounded px-1.5 py-0.5 text-[10px]">{t}</span>
              ))}
            </div>
          )}
```

With:

```tsx
          {entry.tags?.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-1">
              {entry.tags.map((t: string) => {
                const cat = JOURNAL_CATEGORIES.find((c) => c.slug === t);
                return (
                  <span key={t} style={{ fontSize: 10, fontWeight: 700, color: '#B8913A' }}>
                    {cat ? cat.label : `#${t}`}
                  </span>
                );
              })}
            </div>
          )}
```

- [ ] Commit:
```bash
git add apps/web/src/components/calendar/ClientDrawer/DrawerJournalTab.tsx
git commit -m "feat(journal): hashtag display in calendar drawer"
```

---

## Task 4: Verify build

- [ ] Run:
```bash
cd apps/web && pnpm build
```
Expected: no TypeScript errors (pure style/logic changes, no new types from API).

- [ ] Visual check at `/user/dziennik` on 375px viewport — category buttons visible in form, hashtags in cards.
- [ ] Visual check at `/admin/uzytkownicy` (journal tab) — same for admin form and card display.
