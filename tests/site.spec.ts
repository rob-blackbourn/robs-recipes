import { expect, test } from '@playwright/test';

const chicken = '#/recipe/' + encodeURIComponent('Pressure Cooker/chicken-cacciatore');
const bareYield = '#/recipe/' + encodeURIComponent('BBQ/jerked-chicken-kebabs');

test('browse, combine filters, follow recipe, and return to search', async ({ page }, testInfo) => {
  await page.goto('./');
  await expect(page.getByRole('heading', { name: 'What’s cooking?' })).toBeVisible();
  await expect(page.locator('.recipe-card')).toHaveCount(36);
  await page.screenshot({ path: testInfo.outputPath('desktop.png') });
  await page.getByRole('button', { name: /^British / }).click();
  await page.getByRole('searchbox', { name: 'Search recipes' }).fill('chicken');
  await expect(page.locator('.recipe-card').first()).toBeVisible();
  await expect(page.locator('.recipe-card .card-folder').first()).toContainText('British');
  await page.locator('.recipe-card').first().click();
  await expect(page.getByRole('heading', { name: 'Ingredients', exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Back to recipes' }).click();
  await expect(page.getByRole('searchbox')).toHaveValue('chicken');
  await expect(page.getByLabel('Choose a subfolder')).toHaveValue('British');
  await page.getByRole('searchbox').fill('xyz-no-such-food');
  await expect(page.getByRole('heading', { name: 'No recipes on this shelf.' })).toBeVisible();
});

test('settings persist and affect explicit serving yields only', async ({ page }, testInfo) => {
  await page.goto('./#/settings');
  await page.getByLabel('Preferred units').selectOption('metric');
  await page.getByLabel('Default servings').fill('8');
  await page.screenshot({ path: testInfo.outputPath('settings.png') });
  await page.reload();
  await expect(page.getByLabel('Preferred units')).toHaveValue('metric');
  await expect(page.getByLabel('Default servings')).toHaveValue('8');
  await page.goto('./' + chicken);
  await expect(page.getByLabel('Required servings')).toHaveValue('8');
  await expect(page.getByLabel('Multiplier', { exact: true })).toHaveValue('2');
  await expect(page.locator('.ingredient-list')).toContainText('560 g mushrooms');
  await page.goto('./' + bareYield);
  await expect(page.getByLabel('Multiplier', { exact: true })).toHaveValue('1');
  await page.goto('./#/settings');
  await page.getByLabel('Default servings').fill('0');
  await expect(page.getByText('Enter a number greater than zero.')).toBeVisible();
  await page.reload();
  await expect(page.getByLabel('Default servings')).toHaveValue('8');
  await page.getByRole('button', { name: 'Reset settings' }).click();
  await expect(page.getByLabel('Default servings')).toHaveValue('');
  await expect(page.getByLabel('Preferred units')).toHaveValue('original');
  await page.getByLabel('Default servings').fill('0');
  await page.getByRole('button', { name: 'Reset settings' }).click();
  await expect(page.getByLabel('Default servings')).toHaveValue('');
});

test('recipe overrides, source conventions, reset and checkbox stability', async ({ page }) => {
  await page.goto('./' + chicken);
  await page.getByLabel('Required servings').fill('6');
  await page.getByLabel('Display units').selectOption('metric');
  await expect(page.locator('.ingredient-list')).toContainText('420 g mushrooms');
  await page.getByRole('checkbox').first().check();
  await page.getByLabel('Display units').selectOption('cups-us');
  await expect(page.getByRole('checkbox').first()).toBeChecked();
  await page.getByText('Original measurement conventions', { exact: true }).click();
  await page.getByLabel('Source cups').selectOption('us');
  await page.reload();
  await expect(page.getByLabel('Required servings')).toHaveValue('6');
  await expect(page.getByLabel('Display units')).toHaveValue('cups-us');
  await page.getByText('Original measurement conventions', { exact: true }).click();
  await expect(page.getByLabel('Source cups')).toHaveValue('us');
  await page.getByRole('button', { name: 'Show original recipe' }).click();
  await expect(page.getByLabel('Required servings')).toHaveValue('4');
  await expect(page.locator('.ingredient-list')).toContainText('280g mushrooms');
  await page.getByRole('button', { name: 'Use my defaults' }).click();
  await expect(page.getByLabel('Multiplier', { exact: true })).toHaveValue('1');
  await page.getByLabel('Multiplier', { exact: true }).fill('0');
  await page.getByRole('button', { name: 'Show original recipe' }).click();
  await expect(page.getByLabel('Multiplier', { exact: true })).toHaveValue('1');
});

test('mobile layout, references, images, unknown routes, and print', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('./');
  await expect(page.locator('.recipe-card').first()).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('mobile.png') });
  await page.getByRole('button', { name: /Folders/ }).click();
  await expect(page.getByLabel('Choose a subfolder')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.goto('./#/references');
  await page.getByRole('searchbox').fill('250');
  await page.locator('.recipe-card').click();
  await expect(page.locator('.source-text')).toContainText('1 cup = 250 ml');
  await page.goto('./#/recipe/' + encodeURIComponent('Japanese/Tofu/agedashi-dofu'));
  await expect(page.locator('.recipe-images img')).toBeVisible();
  expect(
    await page
      .locator('.recipe-images img')
      .evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0),
  ).toBe(true);
  await page.goto('./' + chicken + '?yield=6&units=metric');
  await expect(page.getByRole('heading', { name: 'Ingredients', exact: true })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('mobile-recipe.png'), fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.emulateMedia({ media: 'print' });
  await expect(page.locator('.site-header')).toBeHidden();
  await expect(page.getByRole('button', { name: 'Print recipe' })).toBeHidden();
  await expect(page.locator('.effective-summary')).toContainText('6 servings');
  await expect(page.locator('.ingredient-list')).toContainText('420 g mushrooms');
  await page.emulateMedia({ media: 'screen' });
  await page.goto('./#/recipe/missing');
  await expect(
    page.getByRole('heading', { name: 'This page isn’t in the collection.' }),
  ).toBeVisible();
  await page.goto('./#/recipe/%broken');
  await expect(
    page.getByRole('heading', { name: 'This page isn’t in the collection.' }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test('storage failure and keyboard skip link remain usable', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', {
      get() {
        throw new Error('Storage disabled');
      },
    });
  });
  await page.goto('./#/settings');
  await page.getByLabel('Preferred units').selectOption('metric');
  await expect(page.getByRole('status')).toContainText('Browser storage is unavailable');
  await page.goto('./' + chicken);
  await expect(page.getByLabel('Display units')).toHaveValue('metric');
  await page.getByRole('link', { name: 'Skip to content' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('main')).toBeFocused();
  await expect(page.getByRole('heading', { name: 'Ingredients', exact: true })).toBeVisible();
});

test('temperature preferences persist and apply to recipes and printing independently of yield', async ({
  page,
}) => {
  await page.goto('./#/recipe/' + encodeURIComponent('British/Bread/bloomer'));
  await expect(page.locator('.method')).toContainText('220°C');
  await expect(page.locator('.method')).not.toContainText('°F');
  await expect(page.locator('.method')).not.toContainText('Gas Mark');
  await page.goto('./#/settings');
  await page.getByLabel('Preferred temperature unit').selectOption('fahrenheit');
  await page.reload();
  await expect(page.getByLabel('Preferred temperature unit')).toHaveValue('fahrenheit');
  await page.goto('./#/recipe/' + encodeURIComponent('British/Bread/bloomer'));
  await page.getByLabel('Multiplier', { exact: true }).fill('2');
  await page.getByLabel('Display units').selectOption('imperial');
  await expect(page.locator('.method')).toContainText('430°F');
  await expect(page.locator('.method')).not.toContainText('°C');
  await expect(page.locator('.method')).not.toContainText('Gas Mark');
  await page.emulateMedia({ media: 'print' });
  await expect(page.locator('.method .temperature').first()).toBeVisible();
  await expect(page.locator('.method .temperature').first()).toHaveText('430°F');
  await page.emulateMedia({ media: 'screen' });
  await page.goto('./#/recipe/' + encodeURIComponent('British/Meat/Beef/beef-wellington'));
  await expect(page.locator('.method')).toContainText('340°F fan');
  await expect(page.locator('.method')).not.toContainText('°C');
  await page.goto('./#/settings');
  await page.getByLabel('Preferred temperature unit').selectOption('gas');
  await page.goto('./#/recipe/' + encodeURIComponent('British/Bread/bloomer'));
  await expect(page.locator('.method')).toContainText('Gas Mark 7');
  await expect(page.locator('.method')).not.toContainText('°C');
  await expect(page.locator('.method')).not.toContainText('°F');
  await page.goto('./#/recipe/' + encodeURIComponent('Japanese/Tofu/agedashi-dofu'));
  await expect(page.locator('.method')).toContainText('170°C');
  await expect(page.locator('.method')).not.toContainText('Gas Mark');
  await page.goto('./#/recipe/' + encodeURIComponent('French/Suasages/french-merguez-sausages'));
  await expect(page.locator('.method')).toContainText('65.6°C');
  await expect(page.locator('.method')).not.toContainText('Gas Mark');
  await page.goto('./#/settings');
  await page.getByRole('button', { name: 'Reset settings' }).click();
  await expect(page.getByLabel('Preferred temperature unit')).toHaveValue('celsius');
});
