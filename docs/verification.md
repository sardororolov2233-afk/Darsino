# O‘qi tekshiruvi

2026-10-15: o‘quvchi va ustoz prototiplari Expo / React Native ilovasiga moslashtirildi. Yangilangan ekranlar va chegaralar: [O‘qi UI](oqi-ui.md).

| Tekshiruv                                 | Natija / chegara                                                                                            |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| TypeScript                                | `npm run typecheck` o‘tdi                                                                                   |
| Auth, domain, Postgres, learning, teacher | `npm test`: 57 ta test o‘tdi                                                                                |
| Eksport qilingan Expo web bundle          | 4 ta JSDOM UI testi o‘tdi: tasdiqlash, jadval, chat, sessiya, moderator, avatar                             |
| Chromium E2E                              | 7 ta oqim o‘tdi; 390 va 320 px layout ko‘zdan kechirildi                                                    |
| Platformalar                              | `npm run export:all`: web, Android va iOS bundle eksportlari o‘tdi; native qurilma / store build testi emas |
| SQL / format                              | `npm run supabase:check`, `npm run format:check` va `git diff --check` o‘tdi                                |
| Live xizmatlar                            | Supabase / SMTP / OAuth credential’lari berilmagan; migratsiya live loyihaga qo‘llanmagan                   |
| Native imkoniyatlar                       | Haqiqiy rasm pickeri, telefon bildirishnomalari va OS yetkazilishi real qurilmada tekshirilmagan            |

## Oqimlar

- Marketplace: ariza tasdiqlanmaguncha a’zolik yoki jadval yo‘q. Faqat o‘zining tasdiqlangan ustoz profili qaror qiladi. Sig‘im, jadval to‘qnashuvi, individual dars, davomat va fikr qoldirish tekshirildi. Soxta rol, begona ma’lumotlar va eskirgan akkaunt sessiyasi rad etiladi.
- O‘quvchi: haqiqiy javoblardan radar, eng yaxshi natijadan XP, takrorlash orqali XP oshirib yubormaslik, Toshkent sanasi, buzilgan kesh, qidiruv / xarita filtrlari va boshqa akkauntdan progress ajratilishi tekshirildi.
- Ustoz: test topshirig‘i → shaxsiy chat → o‘quvchi testni tugatishi → natijani ixtiyoriy ulashish → ustoz radari → haqiqiy davomat. Soxta yuboruvchi va noto‘g‘ri javoblar radarni o‘zgartirmaydi.
- Klub: bepul e’lon → qidiruv / klublarda topish → ariza → ustoz tasdig‘i → a’zolik. SQL testi noldan soxta a’zo yaratilmasligini, oddiy darsga nol / manfiy narx qo‘yilmasligini va migratsiya takrorlanganda a’zolik saqlanishini tekshiradi.
- Xonalar: 320 px xarita filtri natija bo‘lmasa eski belgini qoldirmaydi; reja saqlanadi va qayta ochiladi, boshqa ustozga ko‘rinmaydi. Begona guruh, kichik sig‘im, noto‘g‘ri sana va reja vaqti to‘qnashuvi rad etiladi. Xonalar namuna, saqlash haqiqiy bron emas.

## Supabase va fayllar

SQL Editor bundle bo‘sh loyihada, oldingi bazani yangilashda va qayta bajarishda tekshirildi. Profil, xabar, ariza va a’zolik saqlanadi; qisman mavjud sxema tranzaksiya bilan rad etiladi. Bepul klub uchun `202610150001_free_clubs.sql` yangilanishi qo‘shildi.

16 ta jadvaldagi RLS, 5 ta private bucket, fayl rezervi / finalize / o‘chirish, MIME / hajm / egalik, tasdiqlanmagan yoki bloklangan akkaunt, moderator hujjati, faol a’zoga material, private chat, yopiq yordamchi RPC va keng tashqi Storage policy bilan himoya test qilindi. Binary upload o‘rniga test fixture ishlatilgan; haqiqiy Supabase HTTP / signed URL / Realtime WebSocket tekshiruvi emas.

Email OTP manzilni normallashtiradi, telefon talab qilmaydi; email faqat o‘z akkauntiga qaytadi. PKCE faqat ruxsat etilgan callback kodini bir marta almashtiradi. Google / Apple sinovida demo akkauntlar ishlatilgan, real provider sessiyasi ochilmagan. Native SecureStore uchun Unicode, parallel yangilash va yozish xatosida eski sessiyani saqlash tekshirildi.

PGlite haqiqiy PostgreSQL funksiyalari va tranzaksiyalarini bitta ulanishda tekshiradi; production yuklama sinovi emas. JSDOM font, rasm dekoderi va Canvas qismlari stub qilingan. Chromium haqiqiy eksport bilan layout va foydalanuvchi oqimlarini tekshiradi.
