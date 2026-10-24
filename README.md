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

## Backendni o‘rnatish

- Belgilangan Supabase loyihasiga ulash: [CLI, preflight va deploy tartibi](docs/supabase-deployment.md).
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
