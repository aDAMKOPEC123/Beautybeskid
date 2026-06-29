# Blog: Wyszukiwarka + Kategorie — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `category` field to blog posts, a search bar and category filter pills on the public blog list, and a category input (with autocomplete) in the admin blog form.

**Architecture:** `category String?` added to the Prisma `BlogPost` model — one Prisma migration. The field is a free-text string; unique values are collected dynamically from loaded posts and shown as filter pills. All filtering (search + category) happens client-side — no new API endpoints needed. Admin gets a text input with datalist autocomplete in `AdminBlogForm`. Seed files are updated to assign categories to existing articles.

**Tech Stack:** Prisma (PostgreSQL migration), Express/TypeScript (backend), React + TypeScript + Tailwind (frontend), Zod (shared schema validation), TipTap (unchanged).

---

## File Map

| File | Action | What changes |
|---|---|---|
| `apps/server/prisma/schema.prisma` | Modify | Add `category String?` to `BlogPost` |
| `packages/shared/src/schemas/blog.schema.ts` | Modify | Add `category` to Zod schemas |
| `apps/server/prisma/seed-blog-kosmetologia.ts` | Modify | Add `category` to all 10 articles |
| `apps/server/prisma/seed-blog-kosmetologia-2.ts` | Modify | Add `category` to all 10 articles |
| `apps/web/src/api/blog.api.ts` | No change | `category` returned automatically |
| `apps/web/src/pages/admin/AdminBlogForm.tsx` | Modify | Add category input with datalist autocomplete |
| `apps/web/src/pages/admin/Blog.tsx` | Modify | Show category badge per article |
| `apps/web/src/pages/public/BlogList.tsx` | Modify | Search bar + category filter pills |

---

## Task 1: Prisma schema — dodaj pole `category`

**Files:**
- Modify: `apps/server/prisma/schema.prisma` (linia ~242, model BlogPost)

- [ ] Otwórz `apps/server/prisma/schema.prisma`, znajdź model `BlogPost` i dodaj pole po `metaDescription`:

```prisma
category        String?
```

Kompletny fragment po zmianie:
```prisma
model BlogPost {
  id              String   @id @default(cuid())
  title           String
  slug            String   @unique
  content         String
  excerpt         String
  coverImage      String?
  isPublished     Boolean  @default(false)
  views           Int      @default(0)
  readingTime     Int?
  metaTitle       String?
  metaDescription String?
  category        String?
  authorId        String
  author          User     @relation(fields: [authorId], references: [id])
  tags            Tag[]    @relation("PostTags")
  comments        BlogComment[]
  likes           BlogPostLike[]
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}
```

- [ ] Uruchom migrację:

```bash
cd cosmo-app/apps/server
pnpm prisma:migrate
# Gdy pyta o nazwę migracji: add_blog_category
```

Oczekiwany output: `The following migration(s) have been applied: ...add_blog_category`

- [ ] Wygeneruj klienta Prisma:

```bash
pnpm prisma:generate
```

---

## Task 2: Shared schema — dodaj `category` do Zod

**Files:**
- Modify: `packages/shared/src/schemas/blog.schema.ts`

- [ ] Dodaj `category` do `createBlogPostSchema`:

```typescript
export const createBlogPostSchema = z.object({
  title: z.string().min(5, 'Tytuł musi mieć co najmniej 5 znaków'),
  content: z.string().min(1, 'Treść jest wymagana'),
  excerpt: z.string().min(10, 'Zajawka jest za krótka'),
  tags: z.array(z.string()).optional(),
  isPublished: z.boolean().default(false),
  metaTitle: z.string().max(70).optional(),
  metaDescription: z.string().max(160).optional(),
  readingTime: z.number().int().positive().optional(),
  category: z.string().max(60).optional(),
});
```

`updateBlogPostSchema` to `.partial()` więc automatycznie obejmie `category`.

- [ ] Zbuduj shared package żeby sprawdzić brak błędów TypeScript:

```bash
cd cosmo-app
pnpm build --filter @cosmo/shared
```

Oczekiwany output: build bez błędów.

---

## Task 3: Seed files — przypisz kategorie do 20 artykułów

**Files:**
- Modify: `apps/server/prisma/seed-blog-kosmetologia.ts` (artykuły 1–10)
- Modify: `apps/server/prisma/seed-blog-kosmetologia-2.ts` (artykuły 11–20)

Kategorie do przypisania:

| Artykuł | Kategoria |
|---|---|
| Skinboosters / mezoterapia | `Zabiegi na twarz` |
| Peeling chemiczny AHA/BHA | `Zabiegi na twarz` |
| Dermapen | `Zabiegi na twarz` |
| Powiększanie ust | `Medycyna estetyczna` |
| Ombre Powder Brows | `Brwi i rzęsy` |
| Depilacja laserowa | `Medycyna estetyczna` |
| Trądzik różowaty | `Pielęgnacja skóry` |
| Retinol | `Pielęgnacja skóry` |
| Masaż Kobido | `Zabiegi na twarz` |
| Fototerapia LED | `Zabiegi na twarz` |
| Mikrodermabrazja | `Zabiegi na twarz` |
| Pielęgnacja po 40 | `Pielęgnacja skóry` |
| Kwas hialuronowy | `Pielęgnacja skóry` |
| Trendy paznokcie 2025 | `Paznokcie` |
| Krem z filtrem SPF | `Pielęgnacja skóry` |
| Oczyszczanie twarzy | `Zabiegi na twarz` |
| Cera tłusta i pory | `Pielęgnacja skóry` |
| Henna brwi i rzęs | `Brwi i rzęsy` |
| Cellulit | `Pielęgnacja ciała` |
| Karboksyterapia | `Zabiegi na twarz` |

- [ ] W `seed-blog-kosmetologia.ts` dodaj pole `category` do każdego obiektu w tablicy `articles`. Przykład dla artykułu 1:

```typescript
{
  slug: 'skinboosters-mezoterapia-hialuronowa-limanowa',
  title: 'Skinboosters — kiedy krem już nie wystarcza',
  category: 'Zabiegi na twarz',   // ← dodaj to pole
  // ...reszta pól bez zmian
}
```

- [ ] Tak samo w `seed-blog-kosmetologia-2.ts` dla artykułów 11–20.

- [ ] Uruchom oba seedery żeby zaktualizować rekordy w bazie:

```bash
cd cosmo-app/apps/server
npx tsx prisma/seed-blog-kosmetologia.ts
npx tsx prisma/seed-blog-kosmetologia-2.ts
```

Oczekiwany output: `✓` przy każdym artykule, `Seeded X blog posts successfully`.

- [ ] Zweryfikuj przez psql lub Prisma Studio, że pole category jest wypełnione:

```bash
npx prisma studio
# Otwórz model BlogPost i sprawdź kolumnę category
```

---

## Task 4: AdminBlogForm — pole category z autocompletem

**Files:**
- Modify: `apps/web/src/pages/admin/AdminBlogForm.tsx`

- [ ] Dodaj stan `category` obok pozostałych stanów (ok. linia 41):

```typescript
const [category, setCategory] = useState('');
```

- [ ] W `useEffect` ładującym dane do edycji (ok. linia 66) dodaj:

```typescript
setCategory(post.category ?? '');
```

- [ ] W funkcji `handleSubmit` (ok. linia 119) dodaj `category` do obiektu `data`:

```typescript
const data = {
  title,
  content,
  excerpt,
  readingTime,
  metaTitle: metaTitle || undefined,
  metaDescription: metaDescription || undefined,
  tags: tags.split(',').map(t => t.trim()).filter(Boolean),
  isPublished: publish,
  category: category.trim() || undefined,
};
```

- [ ] Wyciągnij unikalne kategorie z załadowanych postów (dodaj tuż przed `return`):

```typescript
const existingCategories = Array.from(
  new Set((posts ?? []).map((p: any) => p.category).filter(Boolean))
) as string[];
```

- [ ] Dodaj kartę "Kategoria" w JSX — umieść ją **przed** kartą "Tagi" (ok. linia 295):

```tsx
{/* Category */}
<Card>
  <CardHeader>
    <CardTitle>Kategoria</CardTitle>
  </CardHeader>
  <CardContent className="space-y-3">
    <div className="space-y-2">
      <Label htmlFor="category">Kategoria artykułu</Label>
      <Input
        id="category"
        list="category-suggestions"
        value={category}
        onChange={e => setCategory(e.target.value)}
        placeholder="np. Zabiegi na twarz, Pielęgnacja skóry..."
      />
      <datalist id="category-suggestions">
        {existingCategories.map(cat => (
          <option key={cat} value={cat} />
        ))}
      </datalist>
    </div>
    {category && (
      <span className="inline-flex text-xs px-2.5 py-1 rounded-full bg-primary/10 text-primary font-medium">
        {category}
      </span>
    )}
  </CardContent>
</Card>
```

- [ ] Sprawdź czy `posts` jest ładowane również dla nowych artykułów. W query `blog-admin` zmień `enabled: isEdit` na `enabled: true`:

```typescript
const { data: posts } = useQuery({
  queryKey: ['blog-admin'],
  queryFn: () => blogApi.getAll(),
  enabled: true,   // ← było: isEdit
  staleTime: 0,
});
```

- [ ] Manualny test: wejdź na `/admin/blog/new`, sprawdź czy pole "Kategoria" jest widoczne. Wpisz literę i sprawdź czy pojawiają się podpowiedzi z istniejących artykułów.

---

## Task 5: AdminBlog list — badge kategorii

**Files:**
- Modify: `apps/web/src/pages/admin/Blog.tsx`

- [ ] W karcie artykułu, w sekcji z datą i statusem (ok. linia 36), dodaj badge kategorii:

```tsx
<div className="flex items-center gap-3 mt-2">
  <span className={`text-xs px-2.5 py-1 rounded-full font-bold shadow-sm ${p.isPublished ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
    {p.isPublished ? 'Opublikowany' : 'Szkic'}
  </span>
  {p.category && (
    <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-primary/10 text-primary">
      {p.category}
    </span>
  )}
  <span className="text-xs text-muted-foreground">{new Date(p.createdAt).toLocaleDateString()}</span>
</div>
```

- [ ] Manualny test: wejdź na `/admin/blog` i sprawdź czy artykuły z przypisanymi kategoriami mają badge.

---

## Task 6: BlogList — wyszukiwarka i filtry kategorii

**Files:**
- Modify: `apps/web/src/pages/public/BlogList.tsx`

- [ ] Dodaj dwa stany na górze komponentu `BlogList` (ok. linia 115, po deklaracji `likeMutation`):

```typescript
const [search, setSearch] = useState('');
const [activeCategory, setActiveCategory] = useState<string | null>(null);
```

- [ ] Wyciągnij unikalne kategorie z postów i oblicz filtrowane posty — dodaj tuż przed `return` (po bloku `isLoading`):

```typescript
const allCategories = Array.from(
  new Set(
    (posts ?? [])
      .filter((p: any) => p.isPublished && p.category)
      .map((p: any) => p.category as string)
  )
).sort();

const filteredPosts = (posts ?? [])
  .filter((p: any) => p.isPublished)
  .filter((p: any) =>
    !activeCategory || p.category === activeCategory
  )
  .filter((p: any) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      p.title?.toLowerCase().includes(q) ||
      p.excerpt?.toLowerCase().includes(q)
    );
  });
```

- [ ] W sekcji Hero, za tagline paragrafem (ok. linia 237), dodaj pasek wyszukiwania i filtry:

```tsx
{/* Search + filters */}
<div className="mt-8 max-w-2xl mx-auto space-y-4">
  {/* Search input */}
  <div className="relative">
    <Search
      size={16}
      className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
      style={{ color: 'rgba(20,40,28,0.4)' }}
    />
    <input
      type="text"
      value={search}
      onChange={e => setSearch(e.target.value)}
      placeholder="Szukaj artykułu..."
      className="w-full pl-11 pr-4 py-3 rounded-2xl text-sm outline-none transition-all"
      style={{
        backgroundColor: '#fff',
        border: '1px solid rgba(20,40,28,0.12)',
        color: '#1A3828',
      }}
      onFocus={e => (e.currentTarget.style.border = '1px solid #3D7A54')}
      onBlur={e => (e.currentTarget.style.border = '1px solid rgba(20,40,28,0.12)')}
    />
    {search && (
      <button
        onClick={() => setSearch('')}
        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-black/5 transition-colors"
        style={{ color: 'rgba(20,40,28,0.4)' }}
      >
        <X size={14} />
      </button>
    )}
  </div>

  {/* Category pills */}
  {allCategories.length > 0 && (
    <div className="flex flex-wrap gap-2 justify-center">
      <button
        onClick={() => setActiveCategory(null)}
        className="text-xs font-semibold px-4 py-1.5 rounded-full transition-all duration-200"
        style={{
          backgroundColor: !activeCategory ? '#1A3828' : 'rgba(20,40,28,0.07)',
          color: !activeCategory ? '#fff' : 'rgba(20,40,28,0.6)',
        }}
      >
        Wszystkie
      </button>
      {allCategories.map(cat => (
        <button
          key={cat}
          onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
          className="text-xs font-semibold px-4 py-1.5 rounded-full transition-all duration-200"
          style={{
            backgroundColor: activeCategory === cat ? '#3D7A54' : 'rgba(20,40,28,0.07)',
            color: activeCategory === cat ? '#fff' : 'rgba(20,40,28,0.6)',
          }}
        >
          {cat}
        </button>
      ))}
    </div>
  )}
</div>
```

- [ ] Dodaj import `Search` i `X` z `lucide-react` (już jest `Clock, Heart, MessageCircle` w imporcie):

```typescript
import { Clock, Heart, MessageCircle, Search, X } from 'lucide-react';
```

- [ ] W sekcji listy artykułów, zamień `posts?.filter((p: any) => p.isPublished)` na `filteredPosts`:

```tsx
{/* Brak wyników */}
{filteredPosts.length === 0 && (
  <div
    className="text-center py-16 rounded-2xl"
    style={{ backgroundColor: '#fff', border: '1px solid rgba(20,40,28,0.07)' }}
  >
    <p className="text-base font-medium" style={{ color: 'rgba(20,40,28,0.5)' }}>
      {search || activeCategory
        ? 'Brak artykułów pasujących do filtrów.'
        : 'Brak artykułów.'}
    </p>
    {(search || activeCategory) && (
      <button
        onClick={() => { setSearch(''); setActiveCategory(null); }}
        className="mt-3 text-sm font-semibold underline"
        style={{ color: '#3D7A54' }}
      >
        Wyczyść filtry
      </button>
    )}
  </div>
)}

{filteredPosts.map((post: any) => (
  // ...istniejący JSX karty artykułu bez zmian
))}
```

- [ ] Manualny test: wejdź na `/blog`, sprawdź:
  - Pasek wyszukiwania pojawia się nad listą artykułów
  - Pills kategorii są widoczne (Zabiegi na twarz, Pielęgnacja skóry, Brwi i rzęsy, Paznokcie, Pielęgnacja ciała, Medycyna estetyczna)
  - Klik na kategorię filtruje listę
  - Wyszukanie frazy filtruje listę
  - Oba filtry działają jednocześnie
  - "Wyczyść filtry" kasuje oba
  - Aktywna kategoria jest wizualnie zaznaczona

---

## Kolejność wykonania

1. Task 1 (migracja) — musi być pierwsza
2. Task 2 (shared schema) — zależy od Task 1
3. Task 3 (seed) — wymaga działającej migracji
4. Task 4, 5, 6 — niezależne od siebie, można równolegle
