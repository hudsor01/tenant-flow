import { test, expect } from '@playwright/test';
import { loginAsOwner } from '../auth-helpers';

test.describe('Property Bulk Import', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsOwner(page);
  });

  test('should upload a valid Excel file and import properties', async ({ page }) => {
    await page.goto('/manage/properties');

    // Open the bulk import dialog
    await page.click('button:has-text("Bulk Import")');

    // Create a dummy file
    const fileContent = `[
      {
        "name": "Test Property from E2E",
        "address": "123 E2E St",
        "city": "E2E City",
        "state": "TS",
        "zipCode": "12345"
      }
    ]`;
    await page.setInputFiles('input[type="file"]', {
      name: 'test.xlsx',
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      buffer: Buffer.from(fileContent),
    });

    // Click the import button
    await page.click('button:has-text("Import Properties")');

    // Wait for the success message
    await expect(page.locator('text=Import Successful!')).toBeVisible();
    await expect(page.locator('text=Imported: 1 properties')).toBeVisible();
  });
});
