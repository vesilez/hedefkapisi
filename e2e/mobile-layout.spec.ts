import { expect, test } from "@playwright/test";

const VIEWPORTS = [
  { name: "320px", width: 320, height: 720 },
  { name: "375px", width: 375, height: 812 },
  { name: "768px", width: 768, height: 1024 },
  { name: "desktop", width: 1440, height: 1000 },
] as const;

const PUBLIC_ROUTES = [
  "/",
  "/hayaller",
  "/giris",
  "/kayit",
  "/mentorlar",
  "/sponsorlar",
  "/liderlik",
] as const;

for (const viewport of VIEWPORTS) {
  test.describe(viewport.name, () => {
    test.describe.configure({ timeout: 30_000 });
    test.use({ viewport });

    for (const route of PUBLIC_ROUTES) {
      test(`${route} yatay taşma oluşturmaz`, async ({ page }) => {
        await page.goto(route);
        await page.waitForLoadState("networkidle");

        const dimensions = await page.evaluate(() => ({
          viewport: document.documentElement.clientWidth,
          document: document.documentElement.scrollWidth,
          body: document.body.scrollWidth,
        }));

        expect(
          dimensions.document,
          `${route}: document genişliği viewport'u aşıyor`,
        ).toBeLessThanOrEqual(dimensions.viewport);
        expect(
          dimensions.body,
          `${route}: body genişliği viewport'u aşıyor`,
        ).toBeLessThanOrEqual(dimensions.viewport);
      });
    }

    test("ilk hayal detayında yatay taşma oluşmaz", async ({ page }) => {
      await page.goto("/hayaller");
      await page.waitForLoadState("networkidle");
      const detailLink = page.locator('a[href^="/hayaller/"]').first();
      test.skip((await detailLink.count()) === 0, "Yayında hayal bulunmuyor.");
      await detailLink.click();
      await page.waitForLoadState("networkidle");

      const dimensions = await page.evaluate(() => ({
        viewport: document.documentElement.clientWidth,
        document: document.documentElement.scrollWidth,
      }));
      expect(dimensions.document).toBeLessThanOrEqual(dimensions.viewport);
    });

    if (viewport.width < 768) {
      test("mobil menü açılır, ekranda kalır ve kapanır", async ({ page }) => {
        await page.goto("/");
        const menuDetails = page.locator("header details").last();
        await menuDetails.locator("summary").click({ force: true });
        await expect(menuDetails).toHaveAttribute("open", "");

        const menu = page.getByRole("navigation", { name: "Mobil menü" });
        await expect(menu).toBeVisible();
        const box = await menu.boundingBox();
        expect(box).not.toBeNull();
        expect(box!.x).toBeGreaterThanOrEqual(0);
        expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width);
        expect(box!.y + box!.height).toBeLessThanOrEqual(viewport.height);

        await page
          .locator('button[aria-label="Mobil menüyü kapat"]')
          .click({ force: true });
        await expect(menu).toBeHidden();
      });
    }
  });
}
