# O‘qi

O‘quvchi, repetitor va moderator uchun React Native / Expo ilovasi. Backend — Supabase Auth, PostgreSQL RPC, RLS, private Storage, Realtime va alohida AI Edge Function.

## Ishga tushirish

Node.js 24.15+ tavsiya etiladi; dependency versiyalari `package-lock.json` orqali qulflangan.

```bash
npm ci
npm run web
```

Sozlamalar berilmaganida ilova belgilangan **demo** rejimida ochiladi. Demo foydalanuvchilar, fayllar va AI javoblari haqiqiy server natijasi emas.

Jonli ulanish uchun `.env.example` asosida `.env` yarating:

```dotenv
EXPO_PUBLIC_BACKEND_MODE=supabase
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=YOUR_PUBLISHABLE_OR_ANON_KEY
```

`service_role`, database paroli, SMTP va AI kalitlari mobil ilovaga kiritilmaydi. OAuth va native pluginlar uchun development/store build kerak; mobil qurilma sozlamalari [Supabase yo‘riqnomasida](supabase/README.md).

## Ustoz paneli

Stitch asosidagi [test yuklash, guruh chat va o‘quvchilar tahlili](docs/teacher-workspace.md) tayyor. Boshqaruvda “Davomat” va “Qarzdorlar” bloklari ishlaydi; guruh ma’lumotlaridan keyingi alohida qadamda hafta kunlari, har kunning soati va darslar soni tanlanadi. [Dizaynning HTML va rasmlari](docs/designs/stitch/README.md) repozitoriyga kiritilgan.

## Email va parol bilan kirish

2026-10-25 dan ro‘yxatdan o‘tish **email + parol + parolni takrorlash**, keyingi kirish esa **email + parol** orqali ishlaydi. Parol kamida 8 belgidan iborat bo‘ladi; ikki parol mos kelishi tekshiriladi. Email tasdiqlash kodi so‘ralmaydi va signup uchun SMTP kerak emas. Supabase’da avtomatik email tasdiqlash yoqilishi kerak; jonli sozlama va sinov holati [hisobotda](docs/supabase-live-verification.md) ko‘rsatiladi.

Android APK, development client va production build uchun [EAS yo‘riqnomasi](docs/build.md) hamda [profillar](eas.json) tayyor. Expo/EAS akkaunti va signing credential’lari berilmaguncha APK/IPA yaratilgani da’vo qilinmaydi.

## 2026-10-27 kabinet va QR yangilanishi

[Yagona dizayn, o‘quvchi kabineti, moliya va QR](docs/workspace-polish.md): “Oylik to‘lovlar” alohida daromad/to‘lov sahifasini ochadi; o‘quvchi guruh, test, davomat, to‘lov va chatni bir joyda ko‘radi. Kamera va QR rasmini tanlash orqali o‘zaro kontakt topish, rozilik va guruhga taklif ishlaydi. Web QR dekoderi `npm ci` yoki export vaqtida lokal tayyorlanadi.

## O‘qituvchini tasdiqlash

O‘qituvchi uchun telefon va PDF/rasm sertifikat majburiy. Ariza admin navbatiga tushadi; tasdiqlanmaguncha ustoz kabineti yopiq. Telefon va hujjat faqat egasi hamda adminga ko‘rinadi. [Oqim va server qoidalari](docs/tutor-approval.md).

## 2026-10-29 och yashil dizayn

[Yangi palitra va ekranlar](docs/light-green-design.md): och yashil asosiy tugmalar va kartalar, logotipga mos to‘q ko‘k matnlar, och login/onboarding, yagona guruh, chat, test va moliya ranglari. 320/390 px ko‘rinishlar, 26 brauzer ssenariysi va web/Android/iOS bundle eksportlari tekshirilgan.

## Backendni o‘rnatish

- Belgilangan Supabase loyihasiga ulash: [CLI, preflight va deploy tartibi](docs/supabase-deployment.md).
- Jonli sxema, Edge va parolli kirish holati: [tekshiruv hisoboti](docs/supabase-live-verification.md). [SMTP](docs/supabase-smtp.md) faqat keyingi xizmat emaillari uchun ixtiyoriy.
- Yangi loyiha: Supabase SQL Editor’da [generatsiya qilingan SQL](supabase/Darsino_Supabase_setup.sql) to‘liq bajariladi; keyin Auth/provider va Edge sozlamalari ulanadi.
- Mavjud loyiha: [yangilash tartibi](docs/backend-hardening.md#yangilash-tartibi) bo‘yicha yangilangan AI Edge adapteri avval deploy qilinadi, keyin yangi migratsiyalar qo‘llanadi.
- SQL bazasi va fayllar: [Supabase README](supabase/README.md).
- Xarita, materiallar va AI: [backend yo‘riqnomasi](docs/backend.md).
- Retry, parallel so‘rovlar, maxfiylik va kvotalar: [backend mustahkamlash](docs/backend-hardening.md).

Frontend `src/services/` orqali serverga ulanadi. Rollar va obyektga ruxsatlar server tomonidan tekshiriladi; qurilma akkaunt roli yoki foydalanuvchi ID’sini almashtirib vakolat ololmaydi. `supabase/migrations/` — SQL manbasi; umumiy SQL fayli qo‘lda tahrirlanmaydi.

## Tekshirish

```bash
npm run typecheck
npm test
npm run supabase:check
npm run test:postgres
npm run typecheck:edge
npm run test:ui
npm run test:e2e -- --workers=2
npm run export:all
npm run format:check
```

`test:postgres` uchun Docker kerak: skript pin qilingan PostgreSQL 17 tasviridan vaqtinchalik konteyner ochadi, mustaqil ulanishlarda parallel amallarni tekshiradi va o‘z konteynerini yakunda o‘chiradi. Host portlari ochilmaydi. `typecheck:edge` uchun Deno 2.9.6, Playwright uchun `npx playwright install chromium` kerak. CI shu tekshiruvlarni bajaradi.

Lokal SQL testlari haqiqiy PostgreSQL funksiyalari va ruxsatlarini tekshiradi. Jonli Supabase Auth/OAuth, Storage binary HTTP, Realtime WebSocket, AI provayderi va native qurilma sinovlari alohida ulanishni talab qiladi. JavaScript bundle eksporti APK/IPA yoki haqiqiy qurilmada bajarilgan test emas.

## Ilova bo‘limlari

[Onboarding](docs/onboarding.md), [O‘qi interfeysi](docs/oqi-ui.md), [guruh boshqaruvi](docs/group-management.md), [profil, besh til, MFA, ID/QR va takliflar](docs/profile-settings.md).

## 2026-10-29 o‘quvchi roadmap’i

[Bajarilgan ishlar, ekranlar va chiqarish shartlari](docs/student-roadmap-implementation.md): yangi ichki logotip va launcher icon, yangi/faol o‘quvchiga mos bosh sahifa, to‘liq uy vazifalari oqimi, private PDF/rasm fayllari, feedback va qayta topshirish, “Bilimim”, qidiruvning kun/vaqt filtrlari, profil afzalliklari va parolni tiklash. [Asl roadmap](docs/plans/student-roadmap-source.md) ham saqlangan. Uch yangi SQL yangilanishi jonli loyihada tekshirildi; eski ma’lumotlar saqlandi.
