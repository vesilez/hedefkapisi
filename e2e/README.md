# Playwright E2E

Test, öğrenci kaydından admin destek onayına kadar kritik kullanıcı yolculuğunu
gerçek Chromium tarayıcısında doğrular.

Testler Firebase Authentication ve Firestore'a gerçek kayıt yazar. Bu nedenle
production projesi yerine yalnızca E2E için ayrılmış bir Firebase projesi
kullanılmalıdır. İlgili `NEXT_PUBLIC_FIREBASE_*` değişkenlerine ek olarak şu
değişkenler gerekir:

- `E2E_ADMIN_EMAIL`: Test Firebase projesindeki aktif admin hesabı
- `E2E_ADMIN_PASSWORD`: Admin hesabının şifresi
- `E2E_USER_PASSWORD`: Üretilen öğrenci/destekçi hesaplarının şifresi (opsiyonel)
- `E2E_EMAIL_DOMAIN`: Benzersiz test hesaplarının alan adı (opsiyonel)
- `E2E_BASE_URL`: Mevcut bir deployment'a karşı çalışmak için URL (opsiyonel)

Yerel çalıştırma:

```powershell
npm run test:e2e:install
$env:E2E_ADMIN_EMAIL = "admin@test.example"
$env:E2E_ADMIN_PASSWORD = "..."
npm run test:e2e
```

`E2E_BASE_URL` verilmezse Playwright önce production build alır, sonra
`npm run start` ile uygulamayı ayağa kaldırır. CI akışı Chromium'u kurar,
testi tek worker ile çalıştırır ve hata durumunda rapor, ekran görüntüsü,
video ve trace çıktılarını artifact olarak saklar.
