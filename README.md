# O‘qi

Expo / React Native ilovasi: o‘quvchilar repetitor topadi, ochiq guruh yoki individual darsga ariza yuboradi; repetitor tasdiqlagach guruh va jadval «Darslarim»da ko‘rinadi. Repetitor profili moderator tomonidan tekshiriladi.

O‘qi interfeysi taqdim etilgan interaktiv prototip asosida Expo / React Native uchun qayta ishlangan: to‘q ko‘k (`#0F265C`), yashil (`#34D399`) ranglar, Manrope shrifti, yumaloq kartalar va markazda ajratilgan bilim radari.

## O‘qi interfeysi va yangi imkoniyatlar

- **Bosh:** haqiqiy faoliyatdan hisoblangan kunlik maqsad, fanlar katalogi, bilim radari, mos ustozlar va keyingi dars.
- **Qidirish:** ustozlar, video manbalar, diagnostika, klublar va guruhlar. Bir nechta so‘z, o‘zbekcha apostrof va teglar bilan qidirish; so‘nggi qidiruvlar; narx, fan, hudud, reyting va shakl filtrlari. Hududimda, onlayn va saqlangan ustozlar tezkor tanlovlari ishlaydi.
- **Xarita:** Toshkent hududlari bo‘yicha interaktiv sxema. Aniq GPS nuqtalari va masofa berilmagan, shuning uchun sxema aniq manzil yoki 3 km ichida ekanlikni da’vo qilmaydi. Belgilar va tanlangan profil filtrlar bilan birga yangilanadi.
- **Radar:** matematika, ingliz tili va fizikadan 5 savolli original qisqa testlar; har javobga izoh, haqiqiy natija va besh ko‘nikma tahlili. Radar oxirgi urinishdan, XP esa har bir testdagi eng yaxshi natijadan hisoblanadi. Bular sertifikat, AI baholash yoki IELTS prognozi emas.
- **Darslarim:** mavjud tasdiqlangan jadval, guruhlar va arizalar; yonida video darslar va klublar katalogi.
- **Video darslar:** Khan Academy va British Council manbalarida ochiladi. Manbani ochgandan keyin foydalanuvchi «O‘rgandim» deb belgilaydi; avtomatik video kuzatuvi yo‘q.
- **Klublar:** ustoz e’lon qilgan klublarga ariza va ustoz tasdig‘i bilan a’zolik; yonida alohida belgilangan namuna katalogini kuzatish. Namuna klubini kuzatish a’zolik yaratmaydi.
- **Profil:** rasm yuklash, XP, erishilgan yutuqlar, kuzatilgan klublar, saqlangan ustozlar va suhbatlar. Chatga yuqoridagi xabar belgisi orqali ham kiriladi.

Radar, dars progressi, klub kuzatuvlari va qidiruv tarixi `@oqi/learning-v1:<account>` ostida akkaunt uchun alohida **shu qurilmada** saqlanadi; hali Supabase bilan sinxronlanmaydi. Mavjud Supabase marketplace, Auth va private Storage oqimlari davom etadi. Avvalgi ma’lumotlarni saqlash uchun `@darsino/*` kesh kalitlari, `darsino_*` RPC/jadvallar, native `uz.darsino.app` identifikatori va OAuth `darsino://` qaytish sxemasi o‘zgartirilmagan. Ilovaning ko‘rinadigan nomi, ikonasi va Expo slugi O‘qi/oqi bo‘ldi.

Tekshiruv va ekranlar: [O‘qi UI](docs/oqi-ui.md).

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

1. Email kodi, Google yoki Apple akkaunti bilan kirish / ro‘yxatdan o‘tish. Telefon talab qilinmaydi.
2. Ism, shahar, hudud, fanlar va o‘qish maqsadini tanlash.
3. Repetitorlarni fan, hudud, narx, reyting va dars shakli bo‘yicha filtrlash; profil, ochiq guruhlar va haqiqiy fikrlarni ko‘rish.
4. Ustozga yozish yoki guruh / individual darsga ariza yuborish.
5. Ariza javobini kutish yoki kutilayotgan arizani bekor qilish.
6. Tasdiqlangan guruh, individual dars va jadvalni «Darslarim»da ko‘rish.
7. Bildirishnomalarni o‘qish; telefonda tanlangan darsga 15 daqiqa oldin mahalliy eslatma yoqish. Onlayn dars manzili HTTPS havola bo‘lsa, «Darsga kirish» orqali ochiladi.
8. Dars tugab, repetitor «qatnashgan» deb belgilagach bir marta fikr qoldirish.

## Repetitor oqimi

1. Email, Google yoki Apple orqali akkaunt ochish va repetitor rolini tanlash.
2. Fan, yo‘nalish, tajriba, diplom / sertifikat ma’lumoti, bio, narx, dars shakli va qabul vaqtlarini kiritish.
3. Moderator tekshiruvini kutish. Rad etilgan profilni izoh asosida tuzatib qayta yuborish.
4. Tasdiqlangach individual dars yoki guruh yaratish: o‘rinlar, narx, manzil va aniq jadval. Yaratish formasi 1–12 ta haftalik darsni oldindan ko‘rsatadi.
5. O‘z darslariga kelgan arizalarni izoh bilan tasdiqlash yoki rad etish.
6. Qatnashchilarni ko‘rish, ularga yozish, boshlangan dars uchun davomat belgilash va zarur bo‘lsa guruhdan chiqarish.
7. Kelgusi dars vaqtini o‘zgartirish yoki ochiq e’lonni yopish / ochish. Jadval o‘zgarsa qatnashchilarga bildirishnoma keladi.
8. **Tahlil → Guruhlar → Xonalar → Klublar → Profil** kabinetida faol o‘quvchilar, arizalar, belgilangan davomat va ulashilgan diagnostika natijalarini ko‘rish. Chat va arizalar yuqoridagi tugmalardan ochiladi.
9. Guruhning faol a’zolariga diagnostika testini shaxsiy chat orqali yuborish. O‘quvchi testni tugatib «Natijani ustozga yuborish»ni bosgach, javoblardan guruh radari hisoblanadi. O‘quvchining boshqa shaxsiy progressi ustozga ochilmaydi.
10. Bepul yoki pullik klub / tadbir e’lon qilish. Qatnashchilar soni noldan boshlanadi va ariza tasdiqlangach yangilanadi. Bepul klub uchun mavjud Supabase loyihasiga [yangi migratsiya](supabase/migrations/202610150001_free_clubs.sql) qo‘llanadi.

**Xonalar:** hudud / sig‘im filtrlari, interaktiv sxema va oflayn guruh uchun sana, vaqt, davomiylik va taxminiy xarajat rejasi. Rejalar `@oqi/teacher-v1:<account>` ostida shu qurilmada, ustoz akkauntiga alohida saqlanadi; sig‘im va o‘z rejalaridagi vaqt to‘qnashuvi tekshiriladi. Katalogdagi xonalar va narxlar namuna. Saqlash xonani band qilmaydi; mavjudlik, yakuniy narx va band qilish xona egasi bilan alohida tasdiqlanadi. To‘lov, balans va pul yechish xizmati ulanmagan.

## Sinov rejimi

Sozlamalarsiz ilova aniq belgilangan mahalliy sinov rejimida ochiladi. Email yuborilmaydi; tasdiqlash kodi `421806`. Google va Apple tugmalari demo akkaunt ochadi, haqiqiy OAuth oynasi ochilmaydi. Ma’lumotlar shu qurilmada saqlanadi.

| Akkaunt                        | Email                         | Natija                         |
| ------------------------------ | ----------------------------- | ------------------------------ |
| Yangi o‘quvchi                 | Masalan, `sardor@example.com` | Profilni to‘ldirish            |
| Tasdiqlangan repetitor Dilnoza | `dilnoza@darsino.demo`        | Arizalar va guruh boshqaruvi   |
| Sinov moderatori               | `moderator@darsino.demo`      | Repetitor profilini tekshirish |
| Yangi repetitor                | Boshqa email, repetitor roli  | Profilni moderatorga yuborish  |

Mavjud akkauntga qayta kirganda uning roli saqlanadi. Moderator roli ro‘yxatdan o‘tish tanlovida yo‘q. Demo bazadagi oldindan band o‘rinlar alohida ko‘rsatiladi; ular soxta o‘quvchi akkauntlariga aylantirilmaydi. Reyting faqat qoldirilgan fikrlardan hisoblanadi.

`@darsino/frontend-v1` ma’lumotlari yangi formatga ko‘chiriladi: profil, saqlangan ustozlar va yuborilgan xabarlar qoladi; aniq sanasi bo‘lmagan eski so‘rovlar tarixga arxivlanadi. Ulardan avtomatik tasdiq yoki dars yaratilmaydi.

Sinov rejimi qurilmalararo autentifikatsiya uchun mo‘ljallanmagan. Profil rasmlari demo rejimida qurilmada, live rejimida private Supabase Storage’da saqlanadi.

## Supabase bilan ishlash

To‘liq SQL va ishga tushirish yo‘riqnomasi: [supabase/README.md](supabase/README.md).

1. Supabase SQL Editor’da [Darsino_Supabase_setup.sql](supabase/Darsino_Supabase_setup.sql) faylini to‘liq bajaring. U 16 ta jadval, 5 ta private Storage bucket, RLS, RPC, Auth trigger va Realtime’ni tayyorlaydi. Mavjud Darsino bazasini ma’lumotlarini saqlagan holda yangilash va qayta bajarish test qilingan.
2. Authentication’da Email, Google va Apple providerlarini sozlang. Email shabloniga `{{ .Token }}` qo‘ying, custom SMTP va OAuth qaytish manzillarini yo‘riqnoma bo‘yicha ulang. SMS provider talab qilinmaydi.
3. `.env.example` asosida `.env` yarating; rejimni `supabase` qilib, loyiha URL va publishable / anon kalitini yozing. Ilovaga **service_role / secret kalitini kiritmang**. Ilovani qayta boshlang.
4. Moderator alohida akkauntda emailini tasdiqlagach, [moderator SQL](supabase/admin/01_assign_moderator.sql) ichidagi `target` UUID’ni almashtirib bajaring. Demo emaillar real bazada huquq bermaydi.
5. [Healthcheck SQL](supabase/admin/02_healthcheck.sql) bilan sozlamalarni tekshiring. Live bazaga demo foydalanuvchilar yoki e’lonlar kiritilmaydi.

Ilova asosiy amallar uchun `darsino_snapshot()` va `darsino_mutate(command)` ishlatadi. Yozish, sig‘im, ustoz tasdig‘i, narx, darslar ustma-ust kelishi va fikr qoldirish huquqi serverda tekshiriladi. Diplom / sertifikatni egasi va moderator, chatni suhbat qatnashchilari, materiallarni esa faol guruh a’zolari ko‘radi. Boshqa akkauntning emaili va telefoni berilmaydi.

Storage uchun [fayl xizmati](src/services/files.ts) avatar, hujjat, chat fayli, material va muqovani yuklash / bog‘lash / signed URL olish / o‘chirishga tayyor. Profil va profilni tahrirlash ekranlarida rasm tanlash, oldindan ko‘rish, saqlash, almashtirish va olib tashlash ulangan. Avatar ustoz kartasi, profili, chat va qatnashchilar ro‘yxatida ko‘rinadi. Boshqa fayl turlarining picker UI’si keyingi bosqichda. Barcha bucketlar private; fayl ustiga yozish taqiqlangan.

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

`npm test` — email OTP, PKCE callback, emailga mos SQL ruxsatlari, demo oqimi, PostgreSQL RPC / RLS, Storage metadata ruxsatlari, SQL o‘rnatish / qayta bajarish, fayl klienti, Realtime cleanup va kesh / token testlari. PGlite testlari haqiqiy PostgreSQL funksiyalarini bajaradi, ammo Supabase email/OAuth, binary Storage HTTP yoki WebSocket serverini sinamaydi.

`npm run test:ui` — ilovaning eksport qilingan Expo web bundle’ini JSDOMda ishga tushirib, o‘quvchi → repetitor → o‘quvchi, chat / sessiya saqlanishi va yangi repetitor → moderator → dars yaratish oqimlarini tekshiradi. Font yuklash va layout observerlari stub qilingan; bu piksel yoki native qurilma testi emas.

Oddiy brauzer mavjud muhitda:

```bash
npx playwright install chromium
npm run test:e2e
```

`DARSINO_TEST_BASE_URL` bilan tayyor test serverini, `PLAYWRIGHT_CHROMIUM_EXECUTABLE` bilan mavjud Chromiumni tanlash mumkin. E2E serveri demo rejimida ishlaydi.

Real email yetkazilishi, Google/Apple provider sozlamalari, Supabase loyiha konfiguratsiyasi, native rasm pickeri va telefon eslatmasi staging loyihasi va real qurilmada alohida tekshirilishi kerak. Joriy avtomatik tekshiruv natijalari [docs/verification.md](docs/verification.md) da.
