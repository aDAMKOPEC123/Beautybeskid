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
  await page.goto('/');
  await expect(page.locator('h1')).toBeVisible();
  await expect(page.getByText('Tydzień Akademii')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Aktualne promocje' })).toBeVisible();
  await page.keyboard.press('Tab');
  await expect(page.locator('.academy-skip-link')).toBeFocused();
  const layout = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    bodyWidth: document.body.scrollWidth,
  }));
  expect(layout.bodyWidth).toBeLessThanOrEqual(layout.viewport + 1);
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
  await page.goto('/');
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
