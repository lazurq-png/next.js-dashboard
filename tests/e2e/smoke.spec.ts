import { expect, test } from '@playwright/test';

// Pages that render without the database. Nothing here submits a form: every
// Server Action runs against the project's only database.

test('home page renders and links to the login page', async ({ page }) => {
  await page.goto('/');
  const login = page.getByRole('link', { name: 'Log in' });
  await expect(login).toBeVisible();
  await login.click();
  await expect(page).toHaveURL(/\/login$/);
});

test('login page renders the sign-in form', async ({ page }) => {
  await page.goto('/login');
  await expect(page.getByRole('heading', { name: 'Please log in to continue.' })).toBeVisible();
  await expect(page.getByLabel('Email')).toBeVisible();
  await expect(page.getByLabel('Password')).toBeVisible();
  await expect(page.getByRole('button', { name: /log in/i })).toBeVisible();
});

test('the dashboard sends a visitor without a session to the login page', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/login/);
});
