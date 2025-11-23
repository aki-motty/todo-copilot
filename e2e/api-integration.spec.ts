import { expect, test } from "@playwright/test";

test.describe("API Integration E2E Tests", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:5173", { waitUntil: "domcontentloaded" });
    await page.evaluate(() => localStorage.clear());
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForSelector("input", { timeout: 10000 });
    await page.waitForTimeout(1000);
  });

  test("should load the app", async ({ page }) => {
    const header = page.locator("h1");
    await expect(header).toContainText("Todo Copilot");
  });

  test("should create a todo via UI", async ({ page }) => {
    const input = page.locator("input").first();
    const button = page.locator("button").first();

    await input.fill("Buy groceries");
    await button.click();
    await page.waitForTimeout(1000);

    const todoText = page.getByText("Buy groceries");
    await expect(todoText).toBeVisible();
  });

  test("should list todos", async ({ page }) => {
    const input = page.locator("input").first();
    const button = page.locator("button").first();

    await input.fill("Test todo");
    await button.click();
    await page.waitForTimeout(1000);

    const todoText = page.getByText("Test todo");
    await expect(todoText).toBeVisible();
  });

  test("should handle app state", async ({ page }) => {
    const input = page.locator("input").first();
    await expect(input).toBeVisible();
  });
});
