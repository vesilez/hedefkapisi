import { expect, test, type Page } from "@playwright/test";

function requiredEnvironment(name: string) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(
      `${name} tanımlı değil. E2E testi için ayrılmış Firebase projesinin CI secret/env değerini ekleyin.`,
    );
  }
  return value;
}

async function register(
  page: Page,
  user: {
    name: string;
    surname: string;
    email: string;
    password: string;
    role: "student" | "supporter";
  },
) {
  await page.goto("/kayit");
  await page.locator("#name").fill(user.name);
  await page.locator("#surname").fill(user.surname);
  await page.locator("#email").fill(user.email);
  await page.locator("#password").fill(user.password);
  await page.locator("#confirmPassword").fill(user.password);
  await page.locator(`input[name="role"][value="${user.role}"]`).check();
  await page.getByRole("button", { name: "Kayıt Ol", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Kayıt işlemin tamamlandı" }),
  ).toBeVisible();
}

async function logout(page: Page) {
  await page.getByRole("button", { name: "Çıkış Yap", exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
}

async function login(page: Page, email: string, password: string) {
  await page.goto("/giris");
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(password);
  await page.getByRole("button", { name: "Giriş Yap", exact: true }).click();
  await expect(page).toHaveURL(/\/(profil|admin)(?:\/|\?|$)/, {
    timeout: 30_000,
  });
}

async function completeStudentProfile(page: Page) {
  await page.locator("#city").fill("İstanbul");
  await page.locator("#schoolName").fill("E2E Test Okulu");
  await page.getByRole("button", { name: "Profili Kaydet" }).click();
  await expect(page.getByText("Profilin başarıyla kaydedildi.")).toBeVisible();
}

async function completeSupporterProfile(page: Page) {
  await page.locator("#city").fill("Ankara");
  await page.locator("#supporterType").selectOption("individual");
  await page.getByRole("button", { name: "Profili Kaydet" }).click();
  await expect(page.getByText("Profilin başarıyla kaydedildi.")).toBeVisible();
}

test("öğrenci, admin ve destekçi kritik kullanıcı yolculuğu", async ({
  page,
}) => {
  const adminEmail = requiredEnvironment("E2E_ADMIN_EMAIL");
  const adminPassword = requiredEnvironment("E2E_ADMIN_PASSWORD");
  const userPassword =
    process.env.E2E_USER_PASSWORD?.trim() || "E2e-Test-12345";
  const domain = process.env.E2E_EMAIL_DOMAIN?.trim() || "example.com";
  const runId = `${Date.now()}-${process.pid}`;
  const studentEmail = `student-${runId}@${domain}`;
  const supporterEmail = `supporter-${runId}@${domain}`;
  const dreamTitle = `E2E Hayal ${runId}`;
  const comment = `E2E öğrenci yorumu ${runId}`;
  const pageErrors: string[] = [];
  let dreamUrl = "";

  page.on("pageerror", (error) =>
    pageErrors.push(error.stack ?? error.message),
  );

  await test.step("1. Öğrenci kayıt olur", async () => {
    await register(page, {
      name: "E2E",
      surname: "Öğrenci",
      email: studentEmail,
      password: userPassword,
      role: "student",
    });
    await logout(page);
  });

  await test.step("2. Öğrenci giriş yapar", async () => {
    await login(page, studentEmail, userPassword);
  });

  await test.step("3. Öğrenci profilini tamamlar", async () => {
    await completeStudentProfile(page);
  });

  await test.step("4. Öğrenci hayal paylaşır", async () => {
    await page.goto("/hayalini-paylas");
    await page.locator("#title").fill(dreamTitle);
    await page
      .locator("#shortDescription")
      .fill("E2E testi için oluşturulan yeterince uzun kısa açıklama.");
    await page
      .locator("#description")
      .fill(
        "Bu detaylı açıklama, üretim ortamındaki kritik hayal paylaşma akışını gerçek tarayıcı üzerinden doğrulamak için oluşturulmuştur.",
      );
    await page
      .locator("#problem")
      .fill(
        "Öğrencilerin fikirlerini destekçilere ulaştırma problemini çözüyor.",
      );
    await page
      .locator("#solution")
      .fill(
        "Öğrenci ve destekçileri güvenli bir platformda bir araya getiriyor.",
      );
    await page.locator("#targetAudience").fill("Öğrenciler ve destekçiler");
    await page.locator("#categoryId").selectOption("education");
    await page.locator("#city").fill("İstanbul");
    await page.getByLabel("Mentorluk", { exact: true }).check();
    await page.getByRole("button", { name: "Onaya Gönder" }).click();
    await expect(
      page.getByText("Fikrin değerlendirilmek üzere gönderildi."),
    ).toBeVisible();
    await logout(page);
  });

  await test.step("5. Admin giriş yapar", async () => {
    await login(page, adminEmail, adminPassword);
    await expect(page).toHaveURL(/\/admin(?:\/|\?|$)/);
    await expect(page.getByText("Toplam kullanıcı")).toBeVisible();
    await expect(page.getByText("Sponsor", { exact: true })).toBeVisible();
    await expect(page.getByText("Onaylanan hayal")).toBeVisible();
    await expect(page.getByText("Toplam destek başvurusu")).toBeVisible();
    await expect(page.getByText("Son 30 gün destek başvuruları")).toBeVisible();
    await expect(page.getByText("Kategori dağılımı")).toBeVisible();

    await page.setViewportSize({ width: 375, height: 812 });
    const hasHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(hasHorizontalOverflow).toBe(false);
    await page.setViewportSize({ width: 1280, height: 900 });
  });

  await test.step("6. Admin hayali onaylar", async () => {
    await page.goto("/admin/hayaller");
    await expect(page.getByPlaceholder("Hayal veya kullanıcı ara")).toBeVisible();
    await expect(page.getByRole("button", { name: /CSV/ })).toBeVisible();
    const row = page.getByRole("row").filter({ hasText: dreamTitle });
    await expect(row).toBeVisible();
    await row.getByRole("button", { name: "Onayla" }).click();
    await expect(page.getByText("Hayal başarıyla onaylandı.")).toBeVisible();
    await logout(page);
  });

  await test.step("7. Supporter kayıt olur ve giriş yapar", async () => {
    await register(page, {
      name: "E2E",
      surname: "Destekçi",
      email: supporterEmail,
      password: userPassword,
      role: "supporter",
    });
    await logout(page);
    await login(page, supporterEmail, userPassword);
    await completeSupporterProfile(page);
  });

  await test.step("8. Supporter destek başvurusu oluşturur", async () => {
    await page.goto("/hayaller");
    const dreamLink = page.getByRole("link", {
      name: new RegExp(dreamTitle),
    });
    await expect(dreamLink).toBeVisible();
    await dreamLink.click();
    dreamUrl = page.url();
    await page.getByLabel("Mentorluk", { exact: true }).check();
    await page
      .getByLabel("Mesajın")
      .fill(
        "Bu hayale mentorluk desteği sunmak istiyorum ve öğrenciyle iletişim kurabilirim.",
      );
    await page.getByRole("button", { name: "Destek Başvurusu Gönder" }).click();
    await expect(page.getByText("Destek başvurun alındı.")).toBeVisible();
    await logout(page);
  });

  await test.step("9. Öğrenci yorum yapar", async () => {
    await login(page, studentEmail, userPassword);
    await page.goto(dreamUrl);
    await page.getByLabel("Yorum yaz").fill(comment);
    await page.getByRole("button", { name: "Yorum Gönder" }).click();
    await expect(page.getByText(comment)).toBeVisible();
  });

  await test.step("10. Beğeni ve favori ekleme/kaldırma çalışır", async () => {
    const likeButton = page.getByRole("button", {
      name: /Hayali beğen|Beğeniyi geri al/,
    });
    await likeButton.click();
    await expect(page.getByText("Hayal beğenildi.")).toBeVisible();
    await expect(likeButton).toHaveAccessibleName(/Beğeniyi geri al/);
    await likeButton.click();
    await expect(page.getByText("Beğeni geri alındı.")).toBeVisible();

    const favoriteButton = page.getByRole("button", {
      name: /Hayali favorilere ekle|Hayali favorilerden çıkar/,
    });
    await favoriteButton.click();
    await expect(page.getByText("Hayal favorilere eklendi.")).toBeVisible();
    await expect(favoriteButton).toHaveAccessibleName(
      /Hayali favorilerden çıkar/,
    );
    await favoriteButton.click();
    await expect(page.getByText("Hayal favorilerden çıkarıldı.")).toBeVisible();
    await logout(page);
  });

  await test.step("11. Admin destek başvurusunu onaylar", async () => {
    await login(page, adminEmail, adminPassword);
    await page.goto("/admin/destek-basvurulari");
    const requestCard = page
      .getByTestId("support-request-card")
      .filter({ hasText: supporterEmail });
    await expect(requestCard).toBeVisible();
    await requestCard.getByText("Başvuru detaylarını görüntüle").click();
    await requestCard.getByRole("button", { name: "Onayla" }).click();
    await expect(page.getByText("Destek başvurusu onaylandı.")).toBeVisible();
  });

  expect(pageErrors, pageErrors.join("\n\n")).toEqual([]);
});
