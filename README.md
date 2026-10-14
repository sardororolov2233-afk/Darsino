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

1. Supabase loyihasida [Phone Login](https://supabase.com/docs/guides/auth/phone-login) ni yoqing, SMS provayder va 6 xonali OTPni sozlang.
2. `supabase/migrations/202610140001_marketplace.sql` ni loyiha SQL editorida qo‘llang yoki Supabase CLI orqali `supabase db push` ishlating.
3. `.env.example` asosida `.env` yarating:

```dotenv
EXPO_PUBLIC_BACKEND_MODE=supabase
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-publishable-or-anon-key
```

Ilova ichiga **service_role kalitini kiritmang**. URL va ochiq kalit kerak. `supabase` rejimida ulanish yoki autentifikatsiya xatosi demo bazaga o‘tishga sabab bo‘lmaydi. `EXPO_PUBLIC_BACKEND_MODE=demo` bilan demo rejimini ochiq tanlash mumkin.

4. Moderator bo‘ladigan akkaunt telefonini tasdiqlasin. Keyin administrator SQL editorida uning haqiqiy `auth.users.id` qiymati bilan rol tayinlaydi:

```sql
update public.darsino_profiles
set role = 'moderator', name = 'Darsino moderatori', onboarded = true
where id = 'AUTH_USER_UUID';
```

Demo moderator telefoni real rejimda maxsus huquq bermaydi. Ilova mijozidan moderator rolini olish mumkin emas.

5. Ilovani qayta boshlang. Yangi Supabase bazasida katalog bo‘sh bo‘ladi: repetitor ro‘yxatdan o‘tadi, moderator tasdiqlaydi, repetitor dars e’lon qiladi va o‘quvchi ariza yuboradi. Namuna katalog live ma’lumotlarga aralashtirilmaydi.

### Ma’lumotlar va ruxsatlar

`darsino_snapshot()` faqat kirgan akkauntga ruxsat etilgan ma’lumotlarni qaytaradi. `darsino_mutate(command)` amallarni serverda tekshiradi. Jadval, ariza, qatnashchi, davomat, fikr va suhbatlar alohida Postgres jadvallarida saqlanadi. Jadvallarda RLS yoqilgan va `anon` / `authenticated` rollariga to‘g‘ridan-to‘g‘ri yozish yoki o‘qish ruxsati berilmagan; autentifikatsiyalangan RPC orqali foydalaniladi.

- Tasdiqlashni faqat shu darsning tasdiqlangan repetitori bajaradi. Guruh sig‘imi tranzaksiya va qator qulfi bilan tekshiriladi; bir o‘quvchi ikki marta qo‘shilmaydi.
- Narx va dars nomi serverdagi e’londan olinadi. Bir vaqtdagi repetitor darslari ustma-ust tushmaydi.
- Fikr tugagan va davomatda qatnashgan dars uchungina qabul qilinadi.
- Diplom / sertifikat ma’lumoti va moderator izohi egasi va moderatorga ochiq. Boshqa foydalanuvchining telefoni, arizalari, davomati va shaxsiy chati berilmaydi. Repetitor o‘z arizachilari va qatnashchilari ismini ko‘radi; profilning ochiq fan/hudud ma’lumotlari suhbatdoshlarga ko‘rinadi.
- Native autentifikatsiya sessiyasi SecureStore orqali OS keychainida saqlanadi; katta qiymatlar navbat bilan bo‘laklanadi. Webda SDK sessiyasi AsyncStorage / localStorage orqali saqlanadi. Live marketplace ma’lumoti demo keshiga yozilmaydi.
- Ilova ochiq paytda ma’lumotlar 15 soniyada yangilanadi; arizalar va bildirishnomalarda qo‘lda yangilash ham bor. Bu bosqichda masofaviy push yuborish xizmati ulanmagan. Telefon eslatmalari foydalanuvchi yoqqan darslar uchun mahalliy ishlaydi; jadval yangilanganda qayta rejalashtiriladi, akkauntdan chiqqanda olib tashlanadi.

## Tekshirish

```bash
npm run typecheck
npm test
npm run test:ui
npm run export:all
npm run format:check
```

`npm test` — immutable demo oqimi, Postgres RPC / cheklovlar va kesh / token saqlash testlari. SQL testlari PGlite orqali haqiqiy PostgreSQL funksiyalarini ishlatadi; Supabase SMS provayderini sinamaydi.

`npm run test:ui` — ilovaning eksport qilingan Expo web bundle’ini JSDOMda ishga tushirib, o‘quvchi → repetitor → o‘quvchi, chat / sessiya saqlanishi va yangi repetitor → moderator → dars yaratish oqimlarini tekshiradi. Font yuklash va layout observerlari stub qilingan; bu piksel yoki native qurilma testi emas.

Oddiy brauzer mavjud muhitda:

```bash
npx playwright install chromium
npm run test:e2e
```

`DARSINO_TEST_BASE_URL` bilan tayyor test serverini, `PLAYWRIGHT_CHROMIUM_EXECUTABLE` bilan mavjud Chromiumni tanlash mumkin. E2E serveri demo rejimida ishlaydi.

Real SMS yetkazilishi, Supabase loyiha konfiguratsiyasi, iOS/Android ruxsatlari va telefon eslatmasi staging loyihasi va real qurilmada alohida tekshirilishi kerak. Joriy avtomatik tekshiruv natijalari [docs/verification.md](docs/verification.md) da.
