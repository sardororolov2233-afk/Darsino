# Darsino

Expo / React Native ilovasi: o‘quvchilar repetitor topadi, ochiq guruh yoki individual darsga ariza yuboradi; repetitor tasdiqlagach guruh va jadval «Darslarim»da ko‘rinadi. Repetitor profili moderator tomonidan tekshiriladi.

Darsino logotipi, ko‘k-sariq ranglar va Manrope shrifti saqlangan. Rollarga mos kabinetlar, tushunarli holatlar, bo‘sh natijalar, xato izohlari va kamida 44 px bosiladigan boshqaruvlar qo‘shilgan.

## Ishga tushirish

Node.js 24 va npm ishlating:

```bash
npm ci
npm run web
# Telefon / emulyator uchun:
npm run android
npm run ios
```

## O‘quvchi oqimi

1. Telefon va tasdiqlash kodi bilan kirish yoki ro‘yxatdan o‘tish.
2. Ism, shahar, hudud, fanlar va o‘qish maqsadini tanlash.
3. Repetitorlarni fan, hudud, narx, reyting va dars shakli bo‘yicha filtrlash; profil, ochiq guruhlar va haqiqiy fikrlarni ko‘rish.
4. Ustozga yozish yoki guruh / individual darsga ariza yuborish.
5. Ariza javobini kutish yoki kutilayotgan arizani bekor qilish.
6. Tasdiqlangan guruh, individual dars va jadvalni «Darslarim»da ko‘rish.
7. Bildirishnomalarni o‘qish; telefonda tanlangan darsga 15 daqiqa oldin mahalliy eslatma yoqish. Onlayn dars manzili HTTPS havola bo‘lsa, «Darsga kirish» orqali ochiladi.
8. Dars tugab, repetitor «qatnashgan» deb belgilagach bir marta fikr qoldirish.

## Repetitor oqimi

1. Telefon orqali akkaunt ochish va repetitor rolini tanlash.
2. Fan, yo‘nalish, tajriba, diplom / sertifikat ma’lumoti, bio, narx, dars shakli va qabul vaqtlarini kiritish.
3. Moderator tekshiruvini kutish. Rad etilgan profilni izoh asosida tuzatib qayta yuborish.
4. Tasdiqlangach individual dars yoki guruh yaratish: o‘rinlar, narx, manzil va aniq jadval. Yaratish formasi 1–12 ta haftalik darsni oldindan ko‘rsatadi.
5. O‘z darslariga kelgan arizalarni izoh bilan tasdiqlash yoki rad etish.
6. Qatnashchilarni ko‘rish, ularga yozish, boshlangan dars uchun davomat belgilash va zarur bo‘lsa guruhdan chiqarish.
7. Kelgusi dars vaqtini o‘zgartirish yoki ochiq e’lonni yopish / ochish. Jadval o‘zgarsa qatnashchilarga bildirishnoma keladi.

**Xona band qilish va to‘lovlar keyingi versiyaga qoldirilgan.** Avvalgi tadbir / xona namuna bronlari amaldagi buyurtma sifatida yuborilmaydi.

## Sinov rejimi

Sozlamalarsiz ilova aniq belgilangan mahalliy sinov rejimida ochiladi. SMS yuborilmaydi; kod `421806`. Ma’lumotlar bitta qurilma / brauzerda saqlanadi va hisobdan chiqqanda qoladi, shuning uchun ikki rolning umumiy oqimini tekshirish mumkin.

| Akkaunt                        | Telefon                      | Natija                                      |
| ------------------------------ | ---------------------------- | ------------------------------------------- |
| Yangi o‘quvchi                 | Masalan, `+998901234567`     | Profilni to‘ldirish                         |
| Tasdiqlangan repetitor Dilnoza | `+998901111111`              | Arizalarni qabul qilish va guruh boshqarish |
| Sinov moderatori               | `+998900000001`              | Yangi repetitor profilini tekshirish        |
| Yangi repetitor                | Boshqa raqam, repetitor roli | Profilni moderatorga yuborish               |

Mavjud akkauntga qayta kirganda uning roli saqlanadi. Moderator roli ro‘yxatdan o‘tish tanlovida yo‘q. Demo bazadagi oldindan band o‘rinlar alohida ko‘rsatiladi; ular soxta o‘quvchi akkauntlariga aylantirilmaydi. Reyting faqat qoldirilgan fikrlardan hisoblanadi.

`@darsino/frontend-v1` ma’lumotlari yangi formatga ko‘chiriladi: profil, saqlangan ustozlar va yuborilgan xabarlar qoladi; aniq sanasi bo‘lmagan eski so‘rovlar tarixga arxivlanadi. Ulardan avtomatik tasdiq yoki dars yaratilmaydi.

Sinov rejimi haqiqiy autentifikatsiya va qurilmalararo aloqa uchun mo‘ljallanmagan. Real ma’lumotlar uchun Supabase rejimini yoqing.

## Supabase bilan ishlash

To‘liq SQL va ishga tushirish yo‘riqnomasi: [supabase/README.md](supabase/README.md).

1. Supabase SQL Editor’da [Darsino_Supabase_setup.sql](supabase/Darsino_Supabase_setup.sql) faylini to‘liq bajaring. U 16 ta jadval, 5 ta private Storage bucket, RLS, RPC, Auth trigger va Realtime’ni tayyorlaydi. Mavjud Darsino bazasini ma’lumotlarini saqlagan holda yangilash va qayta bajarish test qilingan.
2. Authentication’da Phone Login, SMS provayder va 6 xonali OTPni sozlang.
3. `.env.example` asosida `.env` yarating; rejimni `supabase` qilib, loyiha URL va publishable / anon kalitini yozing. Ilovaga **service_role / secret kalitini kiritmang**. Ilovani qayta boshlang.
4. Moderator alohida akkauntda telefonini tasdiqlagach, [moderator SQL](supabase/admin/01_assign_moderator.sql) ichidagi `target` UUID’ni almashtirib bajaring. Demo telefonlar real bazada huquq bermaydi.
5. [Healthcheck SQL](supabase/admin/02_healthcheck.sql) bilan sozlamalarni tekshiring. Live bazaga demo foydalanuvchilar yoki e’lonlar kiritilmaydi.

Ilova asosiy amallar uchun `darsino_snapshot()` va `darsino_mutate(command)` ishlatadi. Yozish, sig‘im, ustoz tasdig‘i, narx, darslar ustma-ust kelishi va fikr qoldirish huquqi serverda tekshiriladi. Diplom / sertifikatni egasi va moderator, chatni suhbat qatnashchilari, materiallarni esa faol guruh a’zolari ko‘radi. Boshqa akkaunt telefoni berilmaydi.

Storage uchun [fayl xizmati](src/services/files.ts) avatar, hujjat, chat fayli, material va muqovani yuklash / bog‘lash / signed URL olish / o‘chirishga tayyor. Fayl tanlash tugmalari mavjud UI’ga hali qo‘shilmagan; bu paket backend va klient xizmatini tayyorlaydi. Barcha bucketlar private; fayl ustiga yozish taqiqlangan.

Ariza, xabar va bildirishnomalar uchun Realtime ulanishi qo‘shilgan. Kanal uzilsa 15 soniyalik polling va qo‘lda yangilash qoladi. Masofaviy push yuborish xizmati hali ulanmagan; telefondagi dars eslatmalari mahalliy ishlaydi.

Native Auth sessiyasi SecureStore orqali saqlanadi, webda SDK AsyncStorage / localStorage’dan foydalanadi. Live marketplace demo keshiga yozilmaydi; server xatosi demo rejimiga avtomatik o‘tishga sabab bo‘lmaydi.

## Tekshirish

```bash
npm run typecheck
npm test
npm run test:ui
npm run export:all
npm run format:check
```

`npm test` — demo oqimi, PostgreSQL RPC / RLS, Storage metadata ruxsatlari, SQL o‘rnatish / qayta bajarish, fayl klienti, Realtime cleanup va kesh / token testlari. PGlite testlari haqiqiy PostgreSQL funksiyalarini bajaradi, ammo Supabase SMS, binary Storage HTTP yoki WebSocket serverini sinamaydi.

`npm run test:ui` — ilovaning eksport qilingan Expo web bundle’ini JSDOMda ishga tushirib, o‘quvchi → repetitor → o‘quvchi, chat / sessiya saqlanishi va yangi repetitor → moderator → dars yaratish oqimlarini tekshiradi. Font yuklash va layout observerlari stub qilingan; bu piksel yoki native qurilma testi emas.

Oddiy brauzer mavjud muhitda:

```bash
npx playwright install chromium
npm run test:e2e
```

`DARSINO_TEST_BASE_URL` bilan tayyor test serverini, `PLAYWRIGHT_CHROMIUM_EXECUTABLE` bilan mavjud Chromiumni tanlash mumkin. E2E serveri demo rejimida ishlaydi.

Real SMS yetkazilishi, Supabase loyiha konfiguratsiyasi, iOS/Android ruxsatlari va telefon eslatmasi staging loyihasi va real qurilmada alohida tekshirilishi kerak. Joriy avtomatik tekshiruv natijalari [docs/verification.md](docs/verification.md) da.
