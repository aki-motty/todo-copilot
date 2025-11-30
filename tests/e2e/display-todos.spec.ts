import { expect, test } from "@playwright/test";

test.describe("Display Todos", () => {
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

  test("should display created todos in list", async ({ page }) => {
    const input = page.locator("input").first();
    const button = page.locator("button").first();

    await input.fill("Test todo");
    await button.click();
    await page.waitForTimeout(1000);

    const todoItem = page.getByText("Test todo");
    await expect(todoItem).toBeVisible();
  });
});
