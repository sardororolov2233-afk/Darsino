# O‘qi — Supabase loyihasiga ulash

Maqsad loyiha: `mhqofwuawwnappstcekh`, URL: `https://mhqofwuawwnappstcekh.supabase.co`. `supabase/config.toml` ichidagi `project_id = "oqi"` lokal stack nomidir; masofaviy loyiha faqat muvaffaqiyatli `link` yoki aniq `--project-ref` orqali tanlanadi.

## Hozirgi holat

2026-10-24: Supabase CLI **2.122.0** cloud muhitidagi `/workspace/.cache/supabase-cli` katalogiga o‘rnatildi. Mavjud konfiguratsiya saqlandi, lokal project ID va CLI vaqtinchalik fayllari uchun Git ignore qoidalari qo‘shildi. CI format tekshiruvini ham bajaradi.

`supabase init` mavjud konfiguratsiyani aniqladi; uni `--force` bilan almashtirish kerak emas. Mavjud maxfiy binding orqali **HTTPS Management API autentifikatsiyasi ishladi**. CLI `link` esa proksi credentialining formatini `Invalid access token format` deb rad etdi; buning uchun raw tokenni chatga yuborish talab qilinmaydi.

2026-10-24 tekshiruvida jonli loyiha `ACTIVE_HEALTHY`, PostgreSQL 17.11. Mavjud SQL Editor sxemasi barcha 16 migratsiyaning yakuniy obyektlariga mosligi solishtirildi; **SQL qayta bajarilmadi va migration history tuzatilmadi**. `oqi-assistant` Edge funksiyasi ACTIVE holatida deploy qilindi, frontend ignored `.env` orqali jonli rejimga ulandi. **2026-10-25 yangi talab:** signup email/parol/parolni takrorlash bilan, login email/parol bilan; email kodi va signup SMTP talab qilinmaydi. Serverda avtomatik tasdiqlash va minimal 8 belgili parol PATCH/qayta o‘qish bilan tasdiqlandi. [Jonli hisobot](supabase-live-verification.md) yangi public signup/login sinovini alohida qayd etadi.

GitHub API ulanishi ham ochildi. `7c4f519` commitidagi [CI ishga tushishi](https://github.com/sardororolov2233-afk/Darsino/actions/runs/40103704773) billing cheklovi sabab runner boshlanmasdan to‘xtagan; test qadamlari bajarilmagan. [Draft PR #6](https://github.com/sardororolov2233-afk/Darsino/pull/6) mavjud. Keyingi commitlarning masofaviy CI natijasi alohida tekshiriladi; lokal tekshiruvlar CI o‘tganini anglatmaydi.

## CLI va autentifikatsiya

Cloud muhitida:

```bash
cd /workspace/Darsino
export PATH="/workspace/.cache/supabase-cli/node_modules/.bin:$PATH"
export SUPABASE_HOME=/workspace/.cache/supabase
supabase --version
```

CLI boshqa kompyuterda kerak bo‘lsa, repozitoriy dependency’larini o‘zgartirmasdan `npx --yes supabase@2.122.0` orqali ishlatiladi. Shaxsiy terminalda interaktiv `supabase login` mumkin. Ushbu cloud muhitida mavjud `SUPABASE_ACCESS_TOKEN` bindingi HTTPS Management API bilan ishlaydi, ammo CLI format tekshiruvidan o‘tmaydi. Yangi raw tokenni chatga yuborish kerak emas. Token, database paroli va server kalitlarini chatga, buyruq matniga yoki Git’ga yozmang.

Muhitdagi HTTPS ruxsatlari: `api.supabase.com`, `supabase.com`, `mhqofwuawwnappstcekh.supabase.co`; GitHub PR/CI tekshiruvi uchun `api.github.com`. `db.mhqofwuawwnappstcekh.supabase.co` faqat bevosita Postgres ulanishi kerak bo‘lganda ishlatiladi; hostname ruxsati TCP/5432 ulanishi borligini isbotlamaydi. CLI’ning `db query --linked` buyrug‘i Management API orqali HTTPS ishlatadi.

## Bazani avval tekshirish

Quyidagi CLI yo‘li mos autentifikatsiyasi bor boshqa terminal uchun. Joriy cloud tekshiruvi HTTPS Management API orqali bajarildi; `link` tugallangan deb hisoblanmaydi:

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

Maqsadli bazada yakuniy sxema allaqachon mos, CLI tarixi esa yo‘q. Quyidagi buyruqlar hozir shu bazaga qayta bajarilmagan; ular faqat kelgusi yangilanishda tarix sxemaga moslashtirilgandan keyin qo‘llanadi:

```bash
supabase migration list --linked
supabase db push --linked --dry-run
supabase db push --linked
```

Bu buyruqlar bevosita Postgres ulanishi va qo‘shimcha database ruxsatlarini talab qilishi mumkin. Agar cloud muhitida faqat HTTPS ishlasa, SQL Editor yo‘li tanlanadi: tekshirilgan bazaga `supabase/Darsino_Supabase_setup.sql` to‘liq qo‘llanadi; shu faylni `supabase db query --linked --file supabase/Darsino_Supabase_setup.sql` orqali ham yuborish mumkin. Ushbu yo‘l CLI migration history’sini avtomatik moslamaydi. Ikki yo‘l bir-biriga tekshiruvsiz almashtirilmaydi.

Yangi bazada SQL avval, Edge keyin tayyorlanadi; ikkalasi va Auth sozlamalari tayyor bo‘lmaguncha ilova foydalanuvchilarga ochilmaydi. Tekshirish uchun `supabase/admin/02_healthcheck.sql` katalog/RLS/Storage/Realtime holatini ko‘rsatadi. `darsino_snapshot()` profil yaratishi yoki yangilashi mumkin; faqat o‘qish tekshiruviga kiritilmaydi.

## Jonli ilova va kirish

Joriy cloud `.env` faylida loyiha URL’i va haqiqiy **publishable** kalit bor; fayl Git ignore qilingan. Quyidagisi boshqa muhit uchun namuna, haqiqiy kalit qiymati hisobotga kiritilmaydi:

```dotenv
EXPO_PUBLIC_BACKEND_MODE=supabase
EXPO_PUBLIC_SUPABASE_URL=https://mhqofwuawwnappstcekh.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=YOUR_PUBLISHABLE_OR_ANON_KEY
```

Email va signup yoqilgan bo‘lsin; yangi oqim uchun `mailer_autoconfirm=true`, `password_min_length=8` kerak. Klient signup’da `signUp({email,password})`, kirishda `signInWithPassword({email,password})` chaqiradi; parolni takrorlash klient validatsiyasidir. Emailga kod yoki signup xati yuborilmaydi. SQL’dagi sessiya, suspension va MFA talablari saqlanadi; tasdiqlangan Auth holati email orqali egalik isboti sifatida talqin qilinmaydi.

Google oxirgi tekshiruvda yoqilgan, Apple o‘chiq; OAuth yangi email/parol oqimidan alohida. OAuth qaytish manzillari: lokal web uchun `http://localhost:8081/`, mobil build uchun `darsino://auth/callback`; production origin nashr manzili ma’lum bo‘lgach qo‘shiladi. [SMTP](supabase-smtp.md) kelgusidagi xizmat emaillari uchun ixtiyoriy va signup sharti emas.

AI uchun `AI_GATEWAY_API_KEY` va `AI_MODEL` serverdagi Edge secrets’ga kiritiladi. Ular tayyor bo‘lmaguncha modelga haqiqiy so‘rov yuborilmaydi. Moderator faqat [aniq akkaunt UUID’si bilan](../supabase/admin/01_assign_moderator.sql) tayinlanadi; tasodifiy akkauntga avtomatik rol berilmaydi.

Yangi email/parolli signup → chiqish → parol bilan qayta kirish hamda Auth / binary Storage / Realtime smoke natijalari [jonli hisobotda](supabase-live-verification.md) amalda bajarilgach yangilanadi. Pullik model va native qurilma sinovlari alohida qoladi. [EAS profillari](../eas.json) va [build yo‘riqnomasi](build.md) tayyor; Expo akkaunti va signing ruxsatlarisiz APK/IPA yaratilgani da’vo qilinmaydi.
