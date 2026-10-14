# Darsino tekshiruvi

2026-10-14: o‘quvchi / repetitor oqimlari va Supabase Table / Storage paketi uchun repo tekshiruvi.

| Tekshiruv                       | Natija / chegara                                                                                                                                                                                            |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TypeScript                      | `npm run typecheck`                                                                                                                                                                                         |
| Domain va Postgres RPC          | O‘tdi: 42 ta test (`npm test`): marketplace, moderator, sig‘im, jadval, davomat, fikr, Auth, Storage RLS / RPC, fayl klienti, Realtime cleanup va kesh                                                      |
| Saqlash                         | V1 profil/favorit/xabar ko‘chishi, buzilgan kesh, Unicode tokenlar, parallel token yangilanishi va yozish xatosida eski sessiya                                                                             |
| Haqiqiy Expo web bundle         | O‘tdi: 2 ta eksport UI testi (`npm run test:ui`): ikki rol bilan tasdiqlash → «Darslarim», jadval bildirishnomasi, ikki tomonlama chat, qayta ochilgan sessiya va moderator tasdig‘idan keyin dars yaratish |
| Platforma yig‘ilishi            | O‘tdi: `npm run export:all`: web, Android, iOS                                                                                                                                                              |
| Chromium piksel / E2E           | Ushbu muhitda ishga tushmadi: Unix socket `Operation not permitted`. Playwright testlari oddiy browser muhitida ishlatish uchun saqlangan.                                                                  |
| Haqiqiy SMS / deployed Supabase | Loyiha URL, ochiq kalit va SMS provayder berilmagan; migratsiya va telefon OTP kodi tayyor, live xizmatga qo‘llanmagan.                                                                                     |
| Native bildirishnoma            | Ruxsat va OS yetkazilishi real Android/iOS qurilmasida tekshirilmagan.                                                                                                                                      |

Supabase qo‘shimcha tekshiruvlari:

- SQL Editor fayli bo‘sh loyihada, oldingi bazani yangilashda va ikki marta qayta bajarishda tekshirildi. Oldingi profil, xabar va arizalar saqlandi; qisman mavjud sxema ma’lumotga tegmasdan rad etildi. `npm run supabase:check` generatsiya fayli migratsiyalarga aynan mosligini tasdiqladi.
- 5 ta private bucket: avatar, tasdiqlash hujjati, chat fayli, dars materiali va guruh muqovasi. Begona foydalanuvchi, noto‘g‘ri yo‘l / MIME / hajm, eski rezerv, soxta rol, tasdiqlanmagan telefon va bloklangan akkaunt tekshirildi.
- Moderator hujjatni ko‘radi, shaxsiy chat / dars materialini umumiy huquq bilan ko‘rmaydi. Faol a’zolik tugashi, material yashirilishi, muqova e’loni yopilishi va fayl bog‘lanishini o‘zgartirish ruxsatlari tekshirildi.
- Keng tashqi Storage policy bo‘lsa ham anonim kirish va fayl ustiga yozish yopiq qoladi. O‘chirish rezervi yangi bog‘lanishni to‘sadi; Storage obyekti qolganida metadata’ni o‘chirilgan deb belgilash rad etiladi. Rad etilgan hujjatni o‘chirish mumkin, tasdiqlangan asl nusxa himoyalangan.
- Fayl xizmatidagi ArrayBuffer / upsert:false, finalize xatosidan keyingi qayta urinish, ruxsatdan keyin signed URL so‘rash va Storage xatosida metadata’ni saqlash tekshirildi. Realtime voqealarini birlashtirish va logout’da unsubscribe alohida stub test bilan tekshirildi.
- SQL testlarida Auth / Storage jadvallari minimal fixture sifatida yaratiladi. Haqiqiy binary upload / download, signed URL HTTP, SMS va Realtime WebSocket Supabase loyihasida tekshirilmagan. Fayl tanlash tugmalari UI’ga hali ulanmagan; tayyor SQL va klient xizmati repoda bor.

PGlite PostgreSQL testlari serverdagi ruxsat va tranzaksiya oqimini tekshiradi. U bitta ulanishli test dvigateli bo‘lgani uchun ko‘p ulanishli production yuklamasini tasdiqlamaydi. Guruh sig‘imi uchun server kodi offering qatorini qulflaydi va o‘quvchi/guruh uchun unique enrollment cheklovini ishlatadi.

`docs/screenshots/` rasmlari dastlabki repo versiyasiga tegishli; yangilangan UI uchun yangi screenshot sifatida ishlatilmagan.
