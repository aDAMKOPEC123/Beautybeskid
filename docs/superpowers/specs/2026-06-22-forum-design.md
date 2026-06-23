# Forum dla zalogowanych użytkowników — Specyfikacja

**Data:** 2026-06-22
**Projekt:** COSMO / BeautyBeskid
**Status:** Zatwierdzony przez użytkownika

---

## Przegląd

Forum społecznościowe dla zalogowanych klientek salonu. Użytkownicy mogą zadawać pytania, dzielić się poradami pielęgnacyjnymi, opisywać problemy ze skórą oraz otrzymywać odpowiedzi od innych użytkowników i kosmetologa (admin). Posty i wątki można publikować anonimowo. Admin ma pełną kontrolę moderacyjną.

---

## Zakres dostępu

- Forum dostępne **wyłącznie dla zalogowanych użytkowników** pod `/user/forum`
- Goście nie widzą forum w ogóle
- Link w nawigacji UserLayout

---

## Struktura forum

Forum oparte na **kategoriach tematycznych** (nie flat feed). Proponowane kategorie startowe (konfigurowalne przez admina):

1. Pielęgnacja stóp
2. Pielęgnacja twarzy
3. Dłonie & Paznokcie
4. Pytania do kosmetologa
5. Moje patenty na skórę

---

## Baza danych

### Nowe modele Prisma

```prisma
model ForumCategory {
  id          String        @id @default(cuid())
  name        String
  slug        String        @unique
  description String?
  order       Int           @default(0)
  threads     ForumThread[]
  createdAt   DateTime      @default(now())
}

model ForumThread {
  id          String        @id @default(cuid())
  title       String
  content     String
  isAnonymous Boolean       @default(false)
  isPinned    Boolean       @default(false)
  isLocked    Boolean       @default(false)
  isDeleted   Boolean       @default(false)
  authorId    String
  author      User          @relation("ForumThreadAuthor", fields: [authorId], references: [id])
  categoryId  String
  category    ForumCategory @relation(fields: [categoryId], references: [id])
  posts       ForumPost[]
  watches     ForumWatch[]
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt
}

model ForumPost {
  id            String      @id @default(cuid())
  content       String
  isAnonymous   Boolean     @default(false)
  isDeleted     Boolean     @default(false)
  mentionsAdmin Boolean     @default(false)
  authorId      String
  author        User        @relation("ForumPostAuthor", fields: [authorId], references: [id])
  threadId      String
  thread        ForumThread @relation(fields: [threadId], references: [id])
  createdAt     DateTime    @default(now())
  updatedAt     DateTime    @updatedAt
}

model ForumWatch {
  id        String      @id @default(cuid())
  userId    String
  user      User        @relation(fields: [userId], references: [id])
  threadId  String
  thread    ForumThread @relation(fields: [threadId], references: [id])
  createdAt DateTime    @default(now())
  @@unique([userId, threadId])
}
```

**Zasady:**
- `isDeleted: true` = soft delete — dane pozostają w bazie, post/wątek nie jest wyświetlany
- `authorId` zawsze zapisany niezależnie od `isAnonymous`
- `isPinned` / `isLocked` zarządzane wyłącznie przez admina
- Autor wątku jest automatycznie dodawany do `ForumWatch` przy tworzeniu

---

## Backend API

Moduł: `apps/server/src/modules/forum/` (forum.controller.ts, forum.service.ts, forum.router.ts)

### Endpointy użytkownika

| Metoda | Ścieżka | Opis |
|--------|---------|------|
| `GET` | `/api/forum/categories` | Lista kategorii z licznikiem wątków |
| `GET` | `/api/forum/categories/:slug/threads` | Wątki w kategorii — query: `?page=1&limit=20&sort=newest\|active\|popular` (popular = sortowanie po liczbie postów malejąco) |
| `POST` | `/api/forum/threads` | Utwórz wątek |
| `GET` | `/api/forum/threads/:id` | Szczegóły wątku + posty — query: `?page=1&limit=20`. Odpowiedź: `{ thread, posts: { data, totalPages } }` |
| `POST` | `/api/forum/threads/:id/posts` | Dodaj odpowiedź |
| `POST` | `/api/forum/threads/:id/watch` | Toggle obserwowania wątku |
| `GET` | `/api/forum/threads/:id/watch` | Czy aktualnie obserwuję? |
| `DELETE` | `/api/forum/threads/:id` | Soft delete własnego wątku |
| `DELETE` | `/api/forum/posts/:id` | Soft delete własnego posta |

### Endpointy admina

| Metoda | Ścieżka | Opis |
|--------|---------|------|
| `GET` | `/api/forum/admin/threads` | Lista wszystkich wątków z filtrami (all/admin-mention/deleted/pinned) |
| `PATCH` | `/api/forum/threads/:id/pin` | Toggle przypięcia wątku |
| `PATCH` | `/api/forum/threads/:id/lock` | Toggle blokady wątku |
| `PATCH` | `/api/forum/threads/:id/move` | Przenieś do innej kategorii |
| `DELETE` | `/api/forum/admin/threads/:id` | Soft delete dowolnego wątku (admin) |
| `DELETE` | `/api/forum/admin/posts/:id` | Soft delete dowolnego posta (admin) |
| `POST` | `/api/forum/categories` | Utwórz kategorię |
| `PATCH` | `/api/forum/categories/:id` | Edytuj kategorię |
| `DELETE` | `/api/forum/categories/:id` | Usuń kategorię |

### Logika anonimowości

- API dla użytkowników: jeśli `isAnonymous: true` → zwróć `author: { displayName: "Anonim", avatarUrl: null, id: null }`
- API dla admina (`/api/forum/admin/*`): zawsze zwraca pełne dane autora bez maskowania

### Logika powiadomień

1. **Nowa odpowiedź w wątku** → znajdź wszystkich obserwatorów (`ForumWatch`) → wyślij push + in-app notification (typ `GENERIC`, treść: "Nowa odpowiedź w wątku: [tytuł]", link do wątku). Autor posta nie dostaje powiadomienia o własnej odpowiedzi.
2. **`@admin` w treści posta/wątku** → ustaw `mentionsAdmin: true` → wyślij push + in-app do wszystkich użytkowników z rolą `ADMIN`
3. **Tworzenie wątku** → autor automatycznie dodawany do `ForumWatch`

---

## Frontend

### Nowe strony użytkownika

Katalog: `apps/web/src/pages/user/forum/`

| Plik | Ścieżka | Opis |
|------|---------|------|
| `ForumHome.tsx` | `/user/forum` | Lista kategorii z licznikiem wątków i opisem |
| `ForumCategory.tsx` | `/user/forum/:categorySlug` | Lista wątków: sortowanie (najnowsze/aktywne/popularne), infinite scroll lub paginacja |
| `ForumThread.tsx` | `/user/forum/watek/:id` | Treść wątku + posty + formularz odpowiedzi na dole (sticky) |
| `ForumNewThread.tsx` | `/user/forum/nowy` | Formularz: wybór kategorii, tytuł, treść, checkbox anonimowości |

### Nowa strona admina

`apps/web/src/pages/admin/AdminForum.tsx` — `/admin/forum`

- Tabela/lista wątków z filtrami: Wszystkie / Z @admin / Usunięte / Przypięte
- Wątki z `mentionsAdmin: true` wyróżnione (żółty highlight + badge)
- Akcje per wątek: Przypnij · Zamknij · Przenieś · Usuń · Odpowiedz
- Admin widzi prawdziwego autora anonimowych postów

### Kluczowe komponenty UI

| Komponent | Opis |
|-----------|------|
| `ForumThreadCard` | Karta wątku: tytuł, avatar/Anonim, kategoria, liczba odpowiedzi, data, badge Przypięty/Zamknięty |
| `ForumPostItem` | Pojedyncza odpowiedź: treść, autor (lub Anonim), data, akcje (usuń własny) |
| `WatchButton` | Toggle "Obserwuj / Obserwujesz 🔔" |
| `AnonymousToggle` | Checkbox + tooltip w formularzu nowego wątku/posta |
| `AdminBadge` | Wyróżnienie odpowiedzi admina (lewa fioletowa krawędź + badge) |

### Routing (dopisać do router.tsx w UserLayout)

```tsx
{ path: "forum", element: <ForumHome /> },
{ path: "forum/nowy", element: <ForumNewThread /> },
{ path: "forum/watek/:id", element: <ForumThread /> },
{ path: "forum/:categorySlug", element: <ForumCategory /> },
```

Dopisać do AdminLayout:
```tsx
{ path: "forum", element: <AdminForum /> },
```

### Layout

- **Mobile:** jednocolumnowy, `ForumThreadCard` pełna szerokość, formularz odpowiedzi sticky na dole
- **Desktop:** sidebar z kategoriami po lewej (220px), główna kolumna z wątkami po prawej

### API client

Nowy plik: `apps/web/src/api/forum.api.ts`

---

## Middleware routing

- Endpointy użytkownika (`/api/forum/categories`, `/api/forum/threads`, `/api/forum/posts`): chronione przez `authMiddleware`
- Endpointy admina (`/api/forum/admin/*` oraz PATCH `/api/forum/threads/:id/pin|lock|move`): chronione przez `authMiddleware` + `adminMiddleware`
- Model `User` w `schema.prisma` wymaga dodania 3 nowych relacji: `forumThreads ForumThread[]`, `forumPosts ForumPost[]`, `forumWatches ForumWatch[]`

---

## Nowe wpisy w NotificationType

Existing `GENERIC` type w schemacie jest wystarczający dla powiadomień forum (zawiera `message` i `link`). Nie potrzeba nowego enum value.

---

## Seedowanie kategorii startowych

W `apps/server/prisma/seed.ts` dodać seedowanie 5 kategorii startowych (jeśli nie istnieją) z odpowiednimi slugami i kolejnością.

---

## Co NIE wchodzi w zakres (YAGNI)

- Real-time (Socket.IO) w wątkach — push notification wystarczy
- Reakcje / like na posty — można dodać w przyszłości
- Rich text editor (TipTap) w postach — plain textarea wystarczy na start
- Wyszukiwanie po treści wątków — można dodać w przyszłości
- Prywatne wątki / tylko dla wybranych — poza zakresem
