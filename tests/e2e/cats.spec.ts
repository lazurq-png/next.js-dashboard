import { type Page, expect, test } from '@playwright/test';
import { CAT_TYPES } from '@/app/ui/xenocats/cat-types';

// The /cats page needs no login and no database. Each test summons a cat and
// watches what its attack does to the fake cursor.

async function openCats(page: Page) {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/cats');
  await expect(page.getByRole('heading', { name: 'The cats' })).toBeVisible();
  // The fake cursor takes over on the first pointer move after hydration; nudge the
  // mouse until it has.
  let nudge = 0;
  await expect
    .poll(async () => {
      await page.mouse.move(640 + (nudge++ % 2), 400);
      return page.locator('html').getAttribute('class');
    })
    .toContain('xenocat-cursor-hidden');
}

const fakeCursor = (page: Page) => page.getByTestId('fake-cursor');

/** The fake cursor's drawn position, from its inline transform. */
async function cursorAt(page: Page) {
  const transform = await fakeCursor(page).evaluate((el) => (el as HTMLElement).style.transform);
  const [, x, y] = /translate3d\(([-\d.]+)px, ([-\d.]+)px/.exec(transform)!;
  return { x: Number(x), y: Number(y) };
}

/** Clicks a Summon button and returns where the real pointer was left. */
async function summon(page: Page, id: string) {
  const button = page.getByTestId(`summon-${id}`);
  const box = (await button.boundingBox())!;
  const pointer = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  await page.mouse.move(pointer.x, pointer.y);
  await button.click();
  await expect(page.getByTestId('xenocat')).toHaveAttribute('data-cat-type', id);
  return pointer;
}

test('lists every cat type with its thumbnail, attack and Summon button', async ({ page }) => {
  await openCats(page);
  await expect(page.locator('[data-testid^="cat-card-"]')).toHaveCount(CAT_TYPES.length);
  for (const type of CAT_TYPES) {
    const card = page.getByTestId(`cat-card-${type.id}`);
    await expect(card.getByRole('heading', { name: type.name })).toBeVisible();
    await expect(card.getByText(type.effect.description)).toBeVisible();
    await expect(card.locator('svg')).toBeVisible();
    await expect(card.getByRole('button', { name: `Summon ${type.name}` })).toBeVisible();
  }
});

test('the page swaps the system cursor for the fake one, which follows the pointer', async ({
  page,
}) => {
  await openCats(page);
  await expect(page.locator('html')).toHaveClass(/xenocat-cursor-hidden/);
  await page.mouse.move(400, 300);
  await expect(fakeCursor(page)).toHaveCSS('opacity', '1');
  await expect.poll(() => cursorAt(page)).toEqual({ x: 400, y: 300 });
});

test('Void Tabby makes the cursor vanish, and clicks are blocked meanwhile', async ({ page }) => {
  await openCats(page);
  await summon(page, 'void-tabby');
  await expect(fakeCursor(page)).toHaveAttribute('data-effect', 'vanish');
  await expect(fakeCursor(page)).toHaveCSS('opacity', '0');

  // A click during the effect does nothing: the status line does not change.
  const status = page.getByRole('status');
  const before = await status.textContent();
  await page.getByTestId('summon-gravi-coon').click({ force: true });
  await expect(status).toHaveText(before ?? '');
  await expect(page.locator('[data-cat-type="gravi-coon"]')).toHaveCount(0);

  // After 3 s the cursor is back and clicks work again.
  await expect(fakeCursor(page)).toHaveAttribute('data-effect', '', { timeout: 5000 });
  await expect(fakeCursor(page)).toHaveCSS('opacity', '1');
  await page.getByTestId('summon-gravi-coon').click();
  await expect(status).toHaveText('Gravi Coon is on its way.');
});

test('Gravi Coon makes the cursor heavy', async ({ page }) => {
  await openCats(page);
  await summon(page, 'gravi-coon');
  await expect(fakeCursor(page)).toHaveAttribute('data-effect', 'heavy');
  const start = await cursorAt(page);
  const real = { x: start.x, y: start.y };
  // Move the real pointer 200 px right in small steps; the fake one should cover ~30%.
  await page.mouse.move(real.x + 200, real.y, { steps: 20 });
  await expect
    .poll(async () => (await cursorAt(page)).x - start.x, { timeout: 2000 })
    .toBeGreaterThan(40);
  const moved = (await cursorAt(page)).x - start.x;
  expect(moved).toBeGreaterThan(40);
  expect(moved).toBeLessThan(100);
});

test('Pulsar Siamese knocks the cursor away from the cat', async ({ page }) => {
  await openCats(page);
  const pointer = await summon(page, 'pulsar-siamese');
  await expect(fakeCursor(page)).toHaveAttribute('data-effect', 'knockback');
  const cat = (await page.getByTestId('xenocat').boundingBox())!;
  const catCentre = { x: cat.x + cat.width / 2, y: cat.y + cat.height / 2 };
  const dist = (a: { x: number; y: number }, b: { x: number; y: number }) =>
    Math.hypot(a.x - b.x, a.y - b.y);
  // While the knockback still runs, the fake cursor gets well away from the real
  // pointer, and further from the cat than the pointer is.
  await expect
    .poll(async () => {
      const effect = await fakeCursor(page).getAttribute('data-effect');
      const fake = await cursorAt(page);
      return (
        effect === 'knockback' &&
        dist(fake, pointer) > 100 &&
        dist(fake, catCentre) > dist(pointer, catCentre)
      );
    })
    .toBe(true);
});

test('an idle summoned cat never stays: it attacks, then leaves', async ({ page }) => {
  await openCats(page);
  await summon(page, 'void-tabby');
  await expect(page.getByTestId('xenocat')).toHaveCount(0, { timeout: 8000 });
});
