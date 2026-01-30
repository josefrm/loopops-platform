import { expect, test } from '@playwright/test';

test('load homepage and check title', async ({ page }) => {
  await page.goto('/');

  // Expect a title "to contain" a substring.
  await expect(page).toHaveTitle(/LoopOps/);
});

test('navigate to project context', async ({ page }) => {
  // This is just a placeholder example.
  // You will need to click on specific elements based on your app's actual structure.
  await page.goto('/');

  // Example: Click a button with text "Get Started" (adjust selector as needed)
  // await page.getByRole('button', { name: 'Get Started' }).click();

  // Example: Check if a specific element is visible
  // await expect(page.getByText('Welcome')).toBeVisible();
});
