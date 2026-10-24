# O‘qi — Supabase loyihasiga ulash

Maqsad loyiha: `mhqofwuawwnappstcekh`, URL: `https://mhqofwuawwnappstcekh.supabase.co`. `supabase/config.toml` ichidagi `project_id = "oqi"` lokal stack nomidir; masofaviy loyiha faqat muvaffaqiyatli `link` yoki aniq `--project-ref` orqali tanlanadi.

## Hozirgi holat

2026-10-24: Supabase CLI **2.122.0** cloud muhitidagi `/workspace/.cache/supabase-cli` katalogiga o‘rnatildi. Mavjud konfiguratsiya saqlandi, lokal project ID va CLI vaqtinchalik fayllari uchun Git ignore qoidalari qo‘shildi. CI format tekshiruvini ham bajaradi.

`supabase init` mavjud konfiguratsiyani aniqladi; uni `--force` bilan almashtirish kerak emas. `login` va `link` autentifikatsiya yo‘qligi sabab tugamadi. Dastlab Supabase HTTPS so‘rovlari muhit proksisida `403` qaytardi. Kerakli tarmoq manzillari qo‘shilgach HTTPS ulanishi ochildi: Management API va Auth endpoint autentifikatsiyasiz `401` qaytardi. `SUPABASE_ACCESS_TOKEN` uchun maxfiy maydon muhit sozlamalari draftiga saqlandi; haqiqiy tokenni shu maydonga xavfsiz kiritib, sozlamalarni saqlash/publish qilish kerak. **Masofaviy migratsiya, Edge deploy, Auth konfiguratsiyasi yoki jonli akkaunt sinovi hali bajarilmagan.**

GitHub API ulanishi ham ochildi. [Backend branchining CI ishga tushishi](https://github.com/sardororolov2233-afk/Darsino/actions/runs/40103704773) GitHub akkauntidagi billing cheklovi sabab runner boshlanmasdan to‘xtagan: `The job was not started because your account is locked due to a billing issue.` Koddagi test xatosi qayd etilmagan, chunki job hech bir step’ni bajarmagan. Billing muammosi hal bo‘lgach CI qayta bajariladi; lokal tekshiruvlar masofaviy CI o‘tganini anglatmaydi.

## CLI va autentifikatsiya

Cloud muhitida:

```bash
cd /workspace/Darsino
export PATH="/workspace/.cache/supabase-cli/node_modules/.bin:$PATH"
export SUPABASE_HOME=/workspace/.cache/supabase
supabase --version
```

CLI boshqa kompyuterda kerak bo‘lsa, repozitoriy dependency’larini o‘zgartirmasdan `npx --yes supabase@2.122.0` orqali ishlatiladi. Shaxsiy terminalda interaktiv `supabase login` mumkin. Ushbu cloud muhitida tokenni [Supabase access tokens](https://supabase.com/dashboard/account/tokens) sahifasidan olib, muhitning `SUPABASE_ACCESS_TOKEN` maxfiy maydoniga kiriting. CLI shu o‘zgaruvchi bilan alohida interaktiv login’siz ishlaydi. Token, database paroli va server kalitlarini chatga, buyruq matniga yoki Git’ga yozmang.

Muhitdagi HTTPS ruxsatlari: `api.supabase.com`, `supabase.com`, `mhqofwuawwnappstcekh.supabase.co`; GitHub PR/CI tekshiruvi uchun `api.github.com`. `db.mhqofwuawwnappstcekh.supabase.co` faqat bevosita Postgres ulanishi kerak bo‘lganda ishlatiladi; hostname ruxsati TCP/5432 ulanishi borligini isbotlamaydi. CLI’ning `db query --linked` buyrug‘i Management API orqali HTTPS ishlatadi.

## Bazani avval tekshirish

Autentifikatsiya va tarmoq ishlagach:

```bash
supabase link --project-ref mhqofwuawwnappstcekh
supabase db query --linked --file supabase/admin/00_preflight.sql
```

Preflight faqat o‘qiydi: boshqariladigan Auth/Storage sxemalari, mavjud ilova obyektlari, yozuvlar soni, CLI migratsiya tarixi va Realtime/RPC holatini chiqaradi. U sxemani yangilamaydi va migratsiyalarni bajarilgan deb belgilamaydi. Natijada Auth foydalanuvchilarining email yoki shaxsiy ma’lumotlari chiqarilmaydi.

Keyingi yo‘l natijaga qarab tanlanadi:

| Baza holati                                                | Amal                                                                                                                                                |
| ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| O‘qi/Darsino obyektlari yo‘q, Supabase Auth/Storage mavjud | Yangi o‘rnatish: CLI migratsiyalari yoki generatsiya qilingan SQL’dan bittasini tanlash.                                                            |
| Obyektlar mavjud va CLI tarixi real sxemaga mos            | Faqat hali bajarilmagan migratsiyalarni qo‘llash.                                                                                                   |
| Obyektlar mavjud, CLI tarixi yo‘q yoki nomuvofiq           | Baseline migratsiyasini qayta yubormaslik; real obyektlar bilan tarixni solishtirish. SQL Editor yo‘lida qolish yoki dalil asosida tarixni moslash. |
| Auth/Storage yoki boshqa muhim obyektlar yetishmaydi       | Deploy’dan oldin loyiha va oldingi o‘rnatish holatini tekshirish.                                                                                   |

Jadval/funksiya mavjudligi uning ta’rifi aynan kerakli versiyaga mosligini isbotlamaydi. `migration repair` barcha fayllar uchun ko‘r-ko‘rona bajarilmaydi. `config push` yangi CLI default’larini jonli Auth/SMTP/OAuth sozlamalariga yozib yuborishi mumkin; bu yo‘riqnomada ishlatilmaydi.

## Migratsiya va Edge tartibi

Mavjud ishlayotgan AI backendida yangilangan adapter **SQL’dan avval** deploy qilinadi:

```bash
supabase functions deploy oqi-assistant --project-ref mhqofwuawwnappstcekh --use-api
```

CLI tarixi tekshirilib, sxemaga mosligi aniqlangandan keyin:

```bash
supabase migration list --linked
supabase db push --linked --dry-run
supabase db push --linked
```

Bu buyruqlar bevosita Postgres ulanishi va qo‘shimcha database ruxsatlarini talab qilishi mumkin. Agar cloud muhitida faqat HTTPS ishlasa, SQL Editor yo‘li tanlanadi: tekshirilgan bazaga `supabase/Darsino_Supabase_setup.sql` to‘liq qo‘llanadi; shu faylni `supabase db query --linked --file supabase/Darsino_Supabase_setup.sql` orqali ham yuborish mumkin. Ushbu yo‘l CLI migration history’sini avtomatik moslamaydi. Ikki yo‘l bir-biriga tekshiruvsiz almashtirilmaydi.

Yangi bazada SQL avval, Edge keyin tayyorlanadi; ikkalasi va Auth sozlamalari tayyor bo‘lmaguncha ilova foydalanuvchilarga ochilmaydi. Tekshirish uchun `supabase/admin/02_healthcheck.sql` katalog/RLS/Storage/Realtime holatini ko‘rsatadi. `darsino_snapshot()` profil yaratishi yoki yangilashi mumkin; faqat o‘qish tekshiruviga kiritilmaydi.

## Jonli ilova va kirish

Bazadan keyin `.env`ga loyiha URL’i va **publishable/anon** kalit ulanadi. Kalit olinguncha placeholder bilan jonli konfiguratsiya yaratilmaydi:

```dotenv
EXPO_PUBLIC_BACKEND_MODE=supabase
EXPO_PUBLIC_SUPABASE_URL=https://mhqofwuawwnappstcekh.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=YOUR_PUBLISHABLE_OR_ANON_KEY
```

Email OTP uchun Supabase Authentication’da Email provider, email tasdiqlash, [kodli email shabloni](../supabase/templates/email-otp.html) va ishlab chiqarishda custom SMTP kerak. Qaytish manzillari: lokal web uchun `http://localhost:8081/`, mobil build uchun `darsino://auth/callback`; production web origin’i nashr manzili ma’lum bo‘lgach qo‘shiladi. Google/Apple provider credential’lari alohida sozlanadi. SQL ularni yaratmaydi.

AI uchun `AI_GATEWAY_API_KEY` va `AI_MODEL` serverdagi Edge secrets’ga kiritiladi. Ular tayyor bo‘lmaguncha modelga haqiqiy so‘rov yuborilmaydi. Moderator faqat [aniq akkaunt UUID’si bilan](../supabase/admin/01_assign_moderator.sql) tayinlanadi; tasodifiy akkauntga avtomatik rol berilmaydi.

Yakuniy jonli sinov: ikki haqiqiy akkaunt bilan kirish, ustozni tasdiqlash, dars/ariza/qabul, chat, haqiqiy fayl yuklash va ikki qurilmada Realtime. Lokal testlarning o‘tishi ushbu jonli xizmatlar tekshirildi degani emas. Android/iOS test build va QR keyingi bosqichda yaratiladi.
