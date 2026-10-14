# Darsino tekshiruvi

2026-10-14: o‘quvchi va repetitor oqimlari uchun repo tekshiruvi.

| Tekshiruv                       | Natija / chegara                                                                                                                                                                                            |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TypeScript                      | `npm run typecheck`                                                                                                                                                                                         |
| Domain va Postgres RPC          | O‘tdi: 25 ta test (`npm test`): ariza, moderator, sig‘im, takroriy ariza, bekor qilish, rad etish, shaxsiy individual dars, jadval, davomat, fikr va chat ruxsatlari                                        |
| Saqlash                         | V1 profil/favorit/xabar ko‘chishi, buzilgan kesh, Unicode tokenlar, parallel token yangilanishi va yozish xatosida eski sessiya                                                                             |
| Haqiqiy Expo web bundle         | O‘tdi: 2 ta eksport UI testi (`npm run test:ui`): ikki rol bilan tasdiqlash → «Darslarim», jadval bildirishnomasi, ikki tomonlama chat, qayta ochilgan sessiya va moderator tasdig‘idan keyin dars yaratish |
| Platforma yig‘ilishi            | O‘tdi: `npm run export:all`: web, Android, iOS                                                                                                                                                              |
| Chromium piksel / E2E           | Ushbu muhitda ishga tushmadi: Unix socket `Operation not permitted`. Playwright testlari oddiy browser muhitida ishlatish uchun saqlangan.                                                                  |
| Haqiqiy SMS / deployed Supabase | Loyiha URL, ochiq kalit va SMS provayder berilmagan; migratsiya va telefon OTP kodi tayyor, live xizmatga qo‘llanmagan.                                                                                     |
| Native bildirishnoma            | Ruxsat va OS yetkazilishi real Android/iOS qurilmasida tekshirilmagan.                                                                                                                                      |

PGlite PostgreSQL testlari serverdagi ruxsat va tranzaksiya oqimini tekshiradi. U bitta ulanishli test dvigateli bo‘lgani uchun ko‘p ulanishli production yuklamasini tasdiqlamaydi. Guruh sig‘imi uchun server kodi offering qatorini qulflaydi va o‘quvchi/guruh uchun unique enrollment cheklovini ishlatadi.

`docs/screenshots/` rasmlari dastlabki repo versiyasiga tegishli; yangilangan UI uchun yangi screenshot sifatida ishlatilmagan.
