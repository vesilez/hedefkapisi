# Hedef Kapısı

Hedef Kapısı; lise ve üniversite öğrencilerinin hayallerini, fikirlerini ve çözüm önerilerini paylaşabildiği, mentorların, destekçilerin ve kurumların kontrollü destek başvurusu yapabildiği bir platform olarak tasarlanmıştır. Bu depo şu anda sonraki geliştirme adımlarına temel olacak proje iskeletini içerir.

## Kullanılan teknolojiler

- Next.js 16 ve App Router
- React 19, TypeScript (strict mode) ve Tailwind CSS 4
- ESLint ve Prettier
- Firebase Authentication, Firestore ve Storage istemci SDK'ları
- Zod, React Hook Form, Lucide React, clsx ve tailwind-merge

## Kurulum

1. Node.js'in güncel LTS sürümünü kurun.
2. Depoyu klonlayıp proje dizinine geçin.
3. Bağımlılıkları kurun: `npm install`
4. `.env.example` dosyasını `.env.local` adıyla kopyalayın.
5. Geliştirme ortamını başlatın: `npm run dev`

Uygulama varsayılan olarak `http://localhost:3000` adresinde açılır.

## Firebase kurulumu

1. [Firebase Console](https://console.firebase.google.com/) üzerinden yeni bir proje oluşturun.
2. Proje ayarlarında **Uygulamalarınız** bölümünden Web (`</>`) uygulaması ekleyin.
3. `.env.example` dosyasını `.env.local` olarak kopyalayıp Firebase Console'daki web uygulaması yapılandırmasından aşağıdaki değerleri ekleyin:

```dotenv
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
```

4. Firebase Console üzerinden Authentication, Cloud Firestore ve Storage servislerini manuel olarak etkinleştirin.

Firebase web yapılandırması public client config niteliğindedir; buna rağmen ortama özgü değerler repository'ye commit edilmemelidir. Uygulama güvenliği API anahtarının gizliliğine değil, doğru Authentication yetkilendirmesine ve Firestore/Storage Security Rules kurallarına dayanır.

Değerler `src/config/env.ts` içinde Zod ile merkezi olarak doğrulanır. Eksik bir değer varsa ilgili environment değişkeninin adı hata mesajında belirtilir. Measurement ID kullanılmadığı için zorunlu değildir.

Bu aşamada yalnızca Firebase App, Authentication, Firestore ve Storage istemci bağlantıları hazırlanmıştır. Kayıt, giriş, çıkış, şifre sıfırlama ve diğer kullanıcı akışları henüz geliştirilmemiştir.

## Environment değişkenleri

`NEXT_PUBLIC_SITE_URL`, metadata üretiminde kullanılan ana site adresidir ve yerel geliştirmede `http://localhost:3000` olabilir.

## Geliştirme komutları

- `npm run dev`: geliştirme sunucusu
- `npm run build`: üretim derlemesi
- `npm run start`: üretim sunucusu
- `npm run lint`: kod kalitesi kontrolü
- `npm run typecheck`: TypeScript kontrolü
- `npm run format`: dosyaları biçimlendirme
- `npm run format:check`: biçim kontrolü
- `npm run check`: tip, lint ve biçim kontrollerinin tamamı

## Klasör yapısı

- `src/app`: App Router sayfaları, route grupları ve genel durum ekranları
- `src/components`: tekrar kullanılabilir layout ve UI bileşenleri
- `src/config`: site, menü ve environment yapılandırmaları
- `src/constants`: roller ve iş alanı sabitleri
- `src/lib`: Firebase adaptör sınırları, doğrulamalar ve yardımcılar
- `src/services`: sayfalardan bağımsız veri erişim katmanı
- `src/types`: ortak iş alanı tipleri

## Kodlama standartları

TypeScript strict mode kullanılır ve `any` kullanılmaz. Bileşen, fonksiyon, tip ve dosya adları İngilizcedir. Client Component yalnızca tarayıcı etkileşimi gerektiğinde kullanılır. Environment erişimi merkezi yapılandırmadan, Firebase/veri erişimi ise servis katmanından geçirilir. Arayüz mobil öncelikli ve erişilebilir HTML yaklaşımıyla geliştirilir.

## MVP kapsamı

Planlanan MVP; kullanıcı kayıt ve girişini, öğrenci hayal gönderimini, yayınlanan hayallerin listelenmesini, kontrollü destek başvurularını, profil alanını ve temel admin moderasyonunu kapsar.

## Şimdilik kapsam dışında

Bu iskelette authentication kullanıcı akışları, Firestore CRUD, dosya yükleme, route koruması, admin yetkilendirmesi, sahte kullanıcı/backend, seed verisi, ödeme, yapay zekâ ve mobil uygulama bulunmaz.
