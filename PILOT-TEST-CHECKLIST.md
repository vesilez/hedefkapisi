# Hedef Kapısı Pilot Test Kontrol Listesi

Bu belge küçük ve kontrollü bir pilot kullanıcı grubuyla yapılacak kabul testleri içindir. Testlerde gerçek kişisel veri, ödeme bilgisi veya gizli kurum belgesi kullanılmamalıdır.

## Test ortamı hazırlığı

- [ ] Firebase projesi production ile aynı kuralları ve indeksleri kullanıyor.
- [ ] `firestore.rules`, `storage.rules` ve `firestore.indexes.json` deploy edildi.
- [ ] Öğrenci, destekçi, mentor, sponsor ve admin için ayrı test hesapları oluşturuldu.
- [ ] Tarayıcı konsolunda Firebase yapılandırma veya yetki hatası yok.
- [ ] Mobil testler en az 360 px ve 390 px genişlikte yapıldı.
- [ ] Açık ve koyu tema her ana akışta kontrol edildi.
- [ ] Pilot katılımcılara gerçek şifre veya hassas kişisel bilgi paylaşmamaları bildirildi.

## Öğrenci senaryoları

| Test | Beklenen sonuç |
| --- | --- |
| Geçerli bilgilerle öğrenci hesabı oluştur | Hesap `student` rolüyle ve puan 0 olarak oluşur; rol kullanıcı tarafından sonradan değiştirilemez. |
| Boş, çok uzun veya zararlı HTML içeren ad/profil alanı gönder | Form anlaşılır doğrulama mesajı verir ve kayıt yazılmaz. |
| Hayal formunda zorunlu alanları boş bırak | Alan bazlı hata gösterilir; hayal oluşmaz. |
| Geçerli hayal paylaş | Hayal moderasyon durumuna geçer, ilk hayal rozeti ve puan yalnızca bir kez işlenir. |
| Başka öğrencinin pending hayaline URL ile eriş | İçerik okunamaz. |
| Onaylı hayale yorum yaz ve sil | Yorum görünür; kullanıcı yalnızca kendi yorumunu silebilir. |
| Boş, 1000 karakterden uzun veya zararlı HTML içeren yorum gönder | Gönderim engellenir. |
| Mentora talep gönder | Talep mentor panelinde bekleyen olarak görünür. |
| Kabul edilen mentorluk sonrası sohbeti aç | Yalnızca öğrenci ve mentor sohbeti okuyabilir/gönderebilir. |
| Geri bildirim gönder | Kayıt `open` durumuyla oluşur; kullanıcı/ tarih bilgisi otomatik eklenir. |

## Destekçi senaryoları

| Test | Beklenen sonuç |
| --- | --- |
| Destekçi hesabı oluştur ve profilini tamamla | Destekçi alanları kaydedilir; rol, puan ve admin alanları değişmez. |
| Onaylı hayale destek başvurusu gönder | Başvuru pending oluşur ve ilgili taraf/admin okuyabilir. |
| Başvuru durumunu istemciden değiştirmeyi dene | Firestore isteği reddedilir. |
| Başka destekçinin başvurusuna URL/sorgu ile eriş | Kayıt okunamaz. |
| Uzun veya zararlı HTML içeren destek mesajı gönder | Form ve Firestore kuralları yazmayı engeller. |
| Onaylanan destek sonrası puan/sohbet kontrolü | Puan tekil olay olarak işlenir; yetkili sohbet açılır. |

## Mentor senaryoları

| Test | Beklenen sonuç |
| --- | --- |
| Mentor profiline uzmanlık ve uygunluk bilgisi ekle | Geçerli sınırlar içindeki bilgiler kaydedilir ve profil listelenir. |
| Öğrenci talebini kabul et | Mentorluk active olur ve özel sohbet bir kez oluşturulur. |
| Talebi reddet | Talep rejected olur; özel sohbet oluşmaz. |
| Aktif öğrenci için not oluştur | Notu yalnızca mentor ve admin okuyabilir. |
| İlerleme değerlendirmesi oluştur | 1–5 puan ve metin sınırları doğrulanarak kaydedilir. |
| Başka mentorun notunu okumayı/değiştirmeyi dene | Firestore isteği reddedilir. |
| Not, değerlendirme veya mesajda zararlı HTML dene | Gönderim engellenir. |

## Sponsor senaryoları

| Test | Beklenen sonuç |
| --- | --- |
| Sponsor hesabı oluştur ve kurum başvurusu gönder | Başvuru `pending` oluşur; admin bildirimi ve admin listesi güncellenir. |
| Onay öncesi resmî destek vermeyi dene | İşlem reddedilir. |
| Admin sponsor başvurusunu onayla | Profil public olur, sponsor rozeti bir kez verilir ve sponsor bilgilendirilir. |
| Hayalleri başlık, kategori, şehir ve destek türüyle filtrele | Filtreler birlikte çalışır ve uygun kayıtlar listelenir. |
| Hayale resmî destek ver | Tekil destek kaydı oluşur, sayaç ve +25 puan transaction içinde güncellenir, hayal sahibi bildirim alır. |
| Aynı hayale ikinci kez resmî destek ver | İşlem reddedilir ve ikinci puan yazılmaz. |
| Başka sponsorun profilini veya destek kaydını değiştirmeyi dene | Firestore isteği reddedilir. |

## Admin senaryoları

| Test | Beklenen sonuç |
| --- | --- |
| Normal kullanıcıyla `/admin` sayfalarına eriş | Admin içeriği gösterilmez ve Firestore sorguları reddedilir. |
| Hayal ve destek başvurusu moderasyonu yap | Yalnızca izin verilen durum/onay alanları güncellenir. |
| Sponsor başvurusunu onayla/reddet | Durum ve inceleme alanları admin kimliğiyle güncellenir. |
| Geri bildirimleri aç | En yeni kayıt üstte; tür, kullanıcı, sayfa, tarih ve durum görünür. |
| Geri bildirimi açık → inceleniyor → çözüldü yap | Yalnızca durum ve güncelleme tarihi değişir. |
| Kullanıcı rol/durum yönetimini yap | Yetki matrisi uygulanır; admin superadmin hesabını yetkisiz değiştiremez. |
| Sohbetleri denetim amacıyla oku ve mesaj göndermeyi dene | Okuma mümkündür; admin mesaj gönderemez. |

## Genel kullanıcı deneyimi

- [ ] Navbar bağlantılarının tamamı açılıyor.
- [ ] Footer platform, yasal ve geri bildirim bağlantıları açılıyor.
- [ ] Bilinmeyen bir URL anlaşılır 404 ekranına gidiyor.
- [ ] Beklenmeyen segment hatası teknik kod göstermeyen hata ekranına gidiyor.
- [ ] Root layout hatası `global-error` ekranıyla karşılanıyor.
- [ ] Liste sayfalarında loading, boş ve hata durumları ayırt edilebiliyor.
- [ ] Klavye ile menü, form, modal ve butonlara erişilebiliyor.
- [ ] Form hata mesajları yalnızca renkle aktarılmıyor; `alert` veya `status` ile okunabiliyor.
- [ ] 360 px genişlikte yatay sayfa taşması oluşmuyor.
- [ ] Açık/koyu temada metin-kontrast ve odak göstergeleri okunuyor.

## Güvenlik negatif testleri

- [ ] Kullanıcı belgesinde `role`, `status`, `emailVerified`, `score`, `achievements` veya admin alanını istemciden değiştirme isteği reddediliyor.
- [ ] Hayal sahibi `status`, `moderatedBy`, `moderatedAt` alanlarını değiştiremiyor.
- [ ] Başvuru sahibi onay ve inceleme alanlarını değiştiremiyor.
- [ ] Sohbette `senderId` başka kullanıcı yapıldığında yazma reddediliyor.
- [ ] Geri bildirimde `userId`, `userEmail`, `status` veya tarih sahteciliği reddediliyor.
- [ ] `<script>`, event-handler HTML, `javascript:` ve `data:text/html` içeriği istemci doğrulamasından geçmiyor.
- [ ] Firestore tarafından dönen teknik hata kodu son kullanıcı arayüzünde görünmüyor.

## Hata öncelikleri

### Kritik (P0)

- Yetkisiz özel veri erişimi veya hesap ele geçirme
- Admin/rol/puan/rozet/onay alanlarının kullanıcı tarafından değiştirilebilmesi
- Kullanıcılar arası sohbet, not veya özel başvuru sızıntısı
- Veri kaybı, toplu silinme ya da production ortamının kullanılamaması

Pilot durdurulur; düzeltme ve güvenlik doğrulaması tamamlanmadan yeniden açılmaz.

### Yüksek (P1)

- Kayıt, giriş, hayal paylaşma, destek, sohbet veya moderasyon ana akışının çalışmaması
- Aynı puanın/rozetin/desteğin tekrar yazılması
- Mobilde ana işlemin tamamlanamaması
- Kullanıcıya teknik Firebase hata ayrıntılarının gösterilmesi

24 saat içinde değerlendirilir; ilgili akış geçici olarak kapatılabilir.

### Orta (P2)

- Loading, boş veya hata durumunun eksik/yanıltıcı olması
- Tema, erişilebilirlik veya doğrulama mesajı sorunu
- Ana akışı engellemeyen filtre, sıralama veya bildirim problemi

Pilot döngüsü içinde planlanır.

### Düşük (P3)

- Metin, boşluk, ikon, küçük görsel tutarsızlıklar
- Kullanımı engellemeyen performans veya mikro etkileşim önerileri

Sonraki ürün iyileştirme döngüsüne alınır.

## Pilot çıkış kriterleri

- [ ] Açık P0 hata yok.
- [ ] Açık P1 hatalar için çözüm veya kabul edilmiş geçici önlem var.
- [ ] Beş hesap türünün temel senaryoları en az bir kez geçti.
- [ ] Firestore ve Storage kuralları test ortamına deploy edildi.
- [ ] Geri bildirim sorumlusu ve yanıt süresi belirlendi.
- [ ] Pilot katılımcı listesi, iletişim ve veri saklama süresi onaylandı.
- [ ] Production yedeği, izleme ve geri alma prosedürü belgelendi.
