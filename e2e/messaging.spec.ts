import { expect, test } from "@playwright/test";

test.describe("rol bazlı mesajlaşma", () => {
  test("mesaj rotası yetki durumunu güvenli biçimde çözer", async ({ page }) => {
    await page.goto("/mesajlar");
    await expect(page.locator("body")).not.toContainText(
      "Missing or insufficient permissions",
    );
    await expect(page).toHaveURL(/\/(mesajlar|giris)$/u);
  });

  test("mesaj rotası Firebase yetki hatasını kullanıcıya sızdırmaz", async ({ page }) => {
    await page.goto("/mesajlar");
    await expect(page.locator("body")).not.toContainText(
      "Missing or insufficient permissions",
    );
  });
});
