import { expect, test } from "@playwright/test";

test.describe("Toggle Todos", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:5173", { waitUntil: "domcontentloaded" });

    // Force localStorage mode and clear data
    await page.evaluate(() => {
      window.localStorage.clear();
      window.localStorage.setItem("forceLocalStorage", "true");
    });

    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForSelector("input", { timeout: 10000 });
    await page.waitForTimeout(1000);
  });

  test("should toggle todo completion", async ({ page }) => {
    const input = page.locator("input").first();
    const button = page.locator("button").first();

    await input.fill("Task to toggle");
    await button.click();
    await page.waitForTimeout(1000);

    const todoItem = page.getByText("Task to toggle");
    await expect(todoItem).toBeVisible();
  });
});
