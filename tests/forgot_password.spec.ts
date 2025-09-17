import { test, expect } from '@playwright/test';

test('should redirect to login page when not in password recovery mode', async ({ page }) => {
  await page.goto('http://localhost:8081/reset-password');
  await page.waitForURL('http://localhost:8081/login');
  await expect(page).toHaveURL('http://localhost:8081/login');
});
