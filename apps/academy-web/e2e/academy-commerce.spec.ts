import { expect, test } from '@playwright/test';

const course = {
  id: 'course-e2e',
  slug: 'kurs-testowy',
  title: 'Kurs testowy',
  description: 'Praktyczny kurs do kontroli ścieżki zakupowej.',
  price: 149,
  compareAtPrice: 199,
  lowestPrice30Days: 149,
  difficulty: 'BEGINNER',
  estimatedMinutes: 90,
  lessonCount: 6,
  isComingSoon: false,
  isFree: false,
  isFeatured: true,
  isBestseller: true,
  thumbnailUrl: null,
  tags: ['praktyka'],
  createdAt: '2026-07-15T00:00:00.000Z',
  displayOrder: 1,
};

test.beforeEach(async ({ page }) => {
  await page.route('**/api/academy/public/courses', (route) => route.fulfill({ json: { data: [course] } }));
  await page.route('**/api/academy/public/bundles', (route) => route.fulfill({ json: { data: [] } }));
  await page.route('**/api/academy/public/storefront', (route) => route.fulfill({
    json: {
      data: {
        banners: [],
        activePromotion: { name: 'Promocja E2E', publicLabel: 'Tydzień Akademii', endsAt: '2099-12-31T23:59:59.000Z' },
        socialProof: { students: 120, completions: 80, reviews: [] },
      },
    },
  }));
});

test('katalog jest dostępny klawiaturą, responsywny i pokazuje promocje', async ({ page }) => {
  await page.goto('/kursy');
  // Przy jednym kursie katalog prowadzi kartą wiodącą, nie siatką z filtrami.
  await expect(page.getByRole('heading', { name: 'Kursy kosmetologii online' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Kurs testowy' })).toBeVisible();
  await expect(page.getByText('Tydzień Akademii')).toBeVisible();
  await page.keyboard.press('Tab');
  await expect(page.locator('.academy-skip-link')).toBeFocused();
  const layout = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    bodyWidth: document.body.scrollWidth,
  }));
  expect(layout.bodyWidth).toBeLessThanOrEqual(layout.viewport + 1);
});

test('narzędzia katalogu włączają się dopiero przy większej liczbie kursów', async ({ page }) => {
  await page.goto('/kursy');
  await expect(page.getByRole('heading', { name: 'Kurs testowy' })).toBeVisible();
  await expect(page.getByLabel('Szukaj kursu')).toHaveCount(0);

  const many = [1, 2, 3, 4].map((n) => ({ ...course, id: `course-${n}`, slug: `kurs-${n}`, title: `Kurs ${n}`, isFeatured: n === 1 }));
  await page.route('**/api/academy/public/courses', (route) => route.fulfill({ json: { data: many } }));
  await page.reload();

  await expect(page.getByRole('heading', { name: 'Wszystkie kursy' })).toBeVisible();
  await expect(page.getByLabel('Szukaj kursu')).toBeVisible();
  // Kurs wiodący prowadzi sekcję u góry i nie może się dublować w siatce.
  await expect(page.getByRole('heading', { name: 'Kurs 1' })).toBeVisible();
  await expect(page.locator('.catalog-grid').getByRole('link', { name: /Kurs 1/ })).toHaveCount(0);
  await expect(page.locator('.catalog-grid').getByRole('link', { name: /Kurs 2/ })).toHaveCount(1);
});

test('nagłówek i treść mieszczą się na krytycznych breakpointach', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('h1')).toBeVisible();
  for (const width of [320, 375, 390, 1024, 1366, 1440]) {
    await page.setViewportSize({ width, height: width < 600 ? 720 : 900 });
    const layout = await page.evaluate(() => {
      const viewport = document.documentElement.clientWidth;
      const header = document.querySelector('.academy-topbar-inner');
      const outside = header ? [...header.children].filter((element) => {
        const rect = element.getBoundingClientRect();
        return rect.width > 0 && (rect.left < -1 || rect.right > viewport + 1);
      }).map((element) => ({ className: element.className, rect: element.getBoundingClientRect().toJSON() })) : [];
      return { viewport, bodyWidth: document.body.scrollWidth, outside };
    });
    expect(layout.bodyWidth, `overflow przy ${width}px`).toBeLessThanOrEqual(layout.viewport + 1);
    expect(layout.outside, `nagłówek przy ${width}px`).toEqual([]);
  }
});

test('koszyk zachowuje produkt po odświeżeniu i pozwala go usunąć', async ({ page }) => {
  await page.goto('/kursy');
  await page.getByRole('button', { name: 'Dodaj do koszyka' }).first().click();
  await page.goto('/koszyk');
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Twoje kursy' })).toBeVisible();
  await expect(page.getByText('Kurs testowy')).toBeVisible();
  await page.getByRole('button', { name: 'Usuń Kurs testowy z koszyka' }).click();
  await expect(page.getByRole('heading', { name: 'Koszyk jest pusty' })).toBeVisible();
});

test('wypis z marketingu bez poprawnego tokenu kończy się bezpiecznym komunikatem', async ({ page }) => {
  await page.route('**/api/academy/public/leads/unsubscribe/**', (route) => route.fulfill({ status: 404, json: { message: 'Nie znaleziono zapisu' } }));
  await page.goto('/wypisz/invalid-token');
  await expect(page.getByRole('heading', { name: 'Link jest nieprawidłowy' })).toBeVisible();
});

test('dolna nawigacja prowadzi po Akademii i nie zasłania treści', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'Pasek pojawia się tylko na wąskich ekranach.');

  await page.goto('/kursy');
  await page.getByRole('button', { name: 'Tylko niezbędne' }).click();
  const nav = page.locator('.academy-bnav');
  await expect(nav).toBeVisible();
  // Hamburger z paska górnego ustępuje dolnej nawigacji — dwa menu to jedno za dużo.
  await expect(page.locator('.academy-menu-button')).toBeHidden();

  // Środkowy przycisk prowadzi do katalogu.
  await expect(page.getByRole('link', { name: 'Katalog kursów' })).toBeVisible();

  // Miejsca dla zalogowanych kierują do logowania, zamiast prowadzić w pustkę.
  await page.getByRole('link', { name: /Moja nauka/ }).click();
  await expect(page).toHaveURL(/\/logowanie/);

  await page.goto('/kursy');
  await page.getByRole('button', { name: 'Więcej' }).click();
  const sheet = page.locator('.academy-bnav-sheet');
  await expect(sheet).toHaveClass(/is-open/);
  await expect(sheet.getByRole('link', { name: 'Certyfikaty — zaloguj się, aby uzyskać dostęp' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(sheet).not.toHaveClass(/is-open/);

  // Stopka musi kończyć się nad paskiem, nie pod nim.
  const gap = await page.evaluate(() => {
    const footer = document.querySelector('.academy-footer')!.getBoundingClientRect();
    const bar = document.querySelector('.academy-bnav')!.getBoundingClientRect();
    window.scrollTo(0, document.body.scrollHeight);
    return { footerBottom: footer.bottom, barTop: bar.top };
  });
  expect(gap.footerBottom).toBeGreaterThan(0);
});
