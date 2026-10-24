# O‘qi backendini mustahkamlash

2026-10-24. Mavjud Supabase bazasi va frontend kontrakti saqlanadi. O‘zgarishlar oltita qo‘shimcha migratsiya, Edge adapteri va frontend xizmatlari orqali qo‘llanadi; eski migratsiyalar tahrirlanmagan.

## Nimalar yaxshilandi

| Holat                                    | Yangi xatti-harakat                                                                                                                                                        |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tanlanmagan yoki eski avatar             | Boshqa akkaunt faqat profilga hozir biriktirilgan avatarni ko‘radi; maxfiylik, bloklash va suspension hisobga olinadi. Egasi o‘z fayllarini boshqarishda davom etadi.      |
| Bloklangan akkauntdan ariza              | Guruh va individual ariza, shuningdek eski arizani tasdiqlash bloklangan juftlik uchun rad etiladi.                                                                        |
| Fayl orqali chat limitini aylanib o‘tish | Matn va fayl xabarlari bir xil daqiqalik 60 ta limitga kiradi; faylning qayta yuborilgan identifikatori ikkinchi marta hisoblanmaydi.                                      |
| Bekor qilingan sessiya                   | Managed Auth’da tokenning `session_id` qiymati shu akkauntning mavjud sessiyasiga tegishli bo‘lishi shart. MFA tekshiruvi saqlanadi.                                       |
| Parallel tasdiqlash yoki taklif          | Ustoz va o‘quvchi kalendarlari tranzaksiya lock’lari bilan himoyalangan. Bitta vaqtga ikki dars qo‘shilmaydi; chegaradosh darslar mumkin.                                  |
| Guruh darsini ko‘chirish                 | Har bir faol o‘quvchining boshqa darslari ham tekshiriladi; to‘qnashuv bo‘lsa butun o‘zgarish qaytadi.                                                                     |
| Yopiq guruh taklifi                      | Taklif qilingan o‘quvchi qabul qilishdan oldin aniq jadvalni ko‘radi; boshqa o‘quvchilar va taklif qilinmagan akkauntlar oshkor qilinmaydi.                                |
| Yo‘qolgan HTTP javobi                    | Frontend bitta amal uchun bitta UUID yaratadi va ko‘pi bilan uchta transport urinishida uni saqlaydi. Server shu kalitni qayta qo‘llab xabar yoki toggle’ni takrorlamaydi. |
| Eski snapshot kech kelishi               | Bootstrap, refresh, avatar va mutation javoblari umumiy tartib darvozasi orqali tekshiriladi. Eski akkaunt yoki eski javob yangi holatni bosib ketmaydi.                   |
| Avatar va akkaunt almashishi             | Avatar upload, finalize, qo‘yish va olib tashlash bir captured sessiya bilan yuboriladi. Keyingi akkaunt tokeni davom etayotgan eski amalga qo‘shilib ketmaydi.            |
| Chat sinxronlash                         | Har bir yangi matn/fayl xabari uchun bitta in-app bildirishnoma; Realtime yuboruvchi va qabul qiluvchi qurilmalarini yangilaydi.                                           |
| Tugallanmay qolgan AI so‘rovi            | Faol so‘rov `429`, yakunlangan javob `200`, failed/expired identifikator `409` qaytaradi. Eski identifikator bilan cheksiz model chaqirish va kvotani yangilash yo‘q.      |
| Fayl hajmini kam ko‘rsatish              | Tekshirilmagan yuklash bucket maksimal hajmini rezervlaydi. Faqat haqiqiy Storage metadata tasdiqlangach rezerv aniq hajmga tushadi.                                       |
| Upload va o‘chirish poygasi              | Storage INSERT rezerv qatorini commitgacha `FOR SHARE` bilan ushlab turadi. Parallel o‘chirish kutadi; obyekt bor ekan kvota bo‘shatilmaydi.                               |

## So‘rovni qayta yuborish kontrakti

`darsino_mutate(command)` qo‘shimcha `idempotencyKey` UUID maydonini qabul qiladi. Eski klient kalitsiz ham ishlaydi, lekin takroriy amal himoyasi faqat kalit berilganda qo‘llanadi.

```json
{
  "type": "message",
  "actorId": "AUTHENTICATED_USER_UUID",
  "conversationId": "dm:STUDENT_UUID:TUTOR_UUID",
  "text": "Darsga tayyorman.",
  "idempotencyKey": "ONE_UUID_FOR_THIS_INTENT"
}
```

Kalit akkauntga tegishli; bir xil kalit bilan o‘zgargan payload rad etiladi. Bir xil payload va kalit qaytsa, server effektni takrorlamasdan hozirgi vakolatli snapshot va dastlabki natija ID’sini beradi. Faqat muvaffaqiyatli tranzaksiya receipt yaratadi. Snapshot, JWT va xabar matni receipt’da saqlanmaydi: server JSONB intentining SHA-256 digestini oladi.

Yangi kalitlar uchun har akkauntga daqiqasiga 120 ta va UTC kunlik oynada 1000 ta limit bor. Muvaffaqiyatli replay bu limitlarni sarflamaydi. Mavjud matn/fayl va AI limitlari alohida saqlanadi.

Frontend SQL ruxsat/validatsiya xatolarini avtomatik takrorlamaydi. Transport uzilishi, `408` yoki vaqtinchalik `5xx` javoblarida shu intent kaliti bilan qayta urinadi. Barcha urinishlardan keyin foydalanuvchi qayta bosgan amal yangi intent hisoblanadi; qurilmalararo doimiy outbox qo‘shilmagan.

Receipt’lar eski yozuvlar tozalanguncha replay’ni himoyalaydi. Administrator yoki `service_role` davriy ravishda quyidagini chaqirishi mumkin; default 30 kundan eski receipt’larni o‘chiradi, so‘nggi 24 soatni o‘chirish rad etiladi:

```sql
select public.darsino_prune_mutation_receipts();
```

Bu chaqiruv biznes xabarlarini yoki darslarni o‘chirmaydi. Cron avtomatik yoqilmagan; loyihaning saqlash siyosatiga mos jadval alohida sozlanadi.

## Yangilash tartibi

Yangi loyiha uchun [umumiy setup SQL](../supabase/Darsino_Supabase_setup.sql) bajariladi. Auth va Storage Supabase tomonidan boshqariladi; ilova ularning sxemasini o‘zgartirmaydi. AI funksiyasi va provider sozlamalari tayyor bo‘lgach xizmat foydalanuvchilarga ochiladi.

Ishlayotgan loyihada quyidagi ketma-ketlik kerak:

1. Yangilangan `oqi-assistant` Edge adapterini **avval** deploy qiling. Yangi adapter eski muvaffaqiyatli reservation javobini ham tushunadi. Eski adapter yangi pending/terminal statuslarni tushunmagani uchun tartib muhim.
2. `202610230001_backend_access.sql` dan `202610230006_storage_lifecycle.sql` gacha migratsiyalarni tartib bilan qo‘llang; yoki SQL Editor’dan generatsiya qilingan umumiy setup’ni bajaring. CLI va SQL Editor migration history’sini aralashtirmang.
3. Yangilangan frontendni build/deploy qiling. Eski frontend umumiy RPC’lardan foydalanishda davom etadi, yangi frontend esa intent kalitlari va tartibli snapshot himoyasini qo‘llaydi.
4. [Healthcheck](../supabase/admin/02_healthcheck.sql) va ikkita haqiqiy akkaunt bilan asosiy oqimlarni tekshiring. Managed sessiya ID’siz eski tokenlar rad etiladi; foydalanuvchi qayta kirishi kerak bo‘lishi mumkin.

```bash
npm ci
npm run supabase:check
supabase functions deploy oqi-assistant --project-ref YOUR_PROJECT_REF
supabase db push
```

CLI loyihasi avval link/auth qilingan va uning migration history’si bazaga mos bo‘lishi kerak. Ilovaga `EXPO_PUBLIC_SUPABASE_URL` va publishable/anon kalit beriladi. Server/AI kalitlari Supabase secrets’da qoladi. `.env.example` va [backend sozlamalari](backend.md) barcha ulanish nuqtalarini ko‘rsatadi.

## Fayl kvotasi va tranzaksiyalar

Bir akkaunt uchun 2 GiB hisob `reserved_size_bytes` orqali yuritiladi: pending yozuv bucket maksimumini, tekshirilgan ready yozuv haqiqiy hajmni egallaydi; deleting yozuv o‘chirish tugaguncha avvalgi rezervini saqlaydi. Mavjud pending/deleting yozuvlar migratsiyada konservativ backfill qilinadi. Upload’dan keyin finalize qilish yoki Storage API bilan to‘liq o‘chirish rezervni bo‘shatadi. Bekor qilingan finalize yoki faqat `begin_file_delete` chaqiruvi kvotani qaytarmaydi.

Storage obyektlari SQL bilan o‘chirilmaydi. Sinov fixture’dagi DELETE faqat boshqariladigan Storage HTTP serveri o‘rnidagi modeldir; production fayl o‘chirishda Storage API ishlatiladi. MIME/hajm nazorati fayl kontentini antivirus bilan tekshirish emas.

## Tekshirish

```bash
npm run typecheck
npm run typecheck:edge
npm test
npm run test:postgres
npm run supabase:check
npm run test:ui
npm run test:e2e -- --workers=2
npm run export:all
```

`test:postgres` mustaqil ulanishlarda beshta vaziyatni sinaydi: boshqa-boshqa ustozlarning parallel tasdiqlashi, tasdiqlash va taklif qabul qilish, dars ko‘chirish va qabul, bir kalit bilan parallel xabar, hamda upload va o‘chirish. Poygalar lock barrier yoki `pg_blocking_pids` orqali haqiqatan parallel holatga olib kelinadi. Test konteyneri doim yakunda olib tashlanadi.

Bu testlar database darajasida real PostgreSQL ishlatadi. Ular haqiqiy Supabase Auth/OAuth HTTP, Storage binary serveri, Realtime WebSocket yoki pullik AI provayderini ishga tushirmaydi. Production loyiha credential’lari bu ishda berilmagan va masofaviy baza o‘zgartirilmagan. Joriy snapshot hali to‘liq marketplace tarixini beradi; katta foydalanuvchi bazasi uchun cursor pagination alohida API versiyasida kiritilishi kerak. Yangi indekslar va bir marta snapshot yig‘ish mavjud kontraktning xarajatini kamaytiradi, yuklama sinovi o‘rnini bosmaydi.
