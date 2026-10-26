# O‘qi backend: xarita, dars fayllari va AI

O‘quvchi xaritada ustoz manzilini tanlaydi, guruh materialini ochadi yoki suriladigan AI belgisini bosib savol beradi. Mobil ilova Supabase Auth sessiyasi bilan RPC, private Storage va `oqi-assistant` Edge Function’ga ulanadi. Maxfiy AI kaliti ilovaga yuborilmaydi.

2026-10-24 yangilanishi: [backend mustahkamlash](backend-hardening.md) retry, jadval tranzaksiyalari, maxfiylik, kvota va migratsiya tartibini belgilaydi. **Mavjud ishlayotgan AI xizmatida yangilangan Edge adapteri SQL migratsiyasidan avval deploy qilinadi.** Yangi loyihada SQL avval o‘rnatilib, xizmat Edge deploy’dan keyin ochiladi.

Jonli loyiha sxemasi solishtirildi, Edge deploy va web kirish oynasi tekshirildi: [joriy natijalar](supabase-live-verification.md). **2026-10-25 dan kirish email/parol bilan:** signup’da parol takrorlanadi, email kodi so‘ralmaydi. Server avtomatik tasdiqlash va kamida 8 belgili parolga sozlanadi. Signup uchun SMTP kerak emas; AI provider secrets alohida qoladi.

## Ishga tushirish

1. `npm ci` bajaring. `.env.example` asosida `.env` yarating, `EXPO_PUBLIC_BACKEND_MODE=supabase`, loyiha URL’i va publishable/anon kalitini kiriting. `service_role` kalitini Expo sozlamalariga yozmang.
2. Yangi loyihada Supabase SQL Editor’da `supabase/Darsino_Supabase_setup.sql` faylini bajaring. CLI ishlatilsa `supabase/migrations/` ichidagi hali bajarilmagan fayllar tartib bilan qo‘llanadi. Mavjud AI xizmatida avval yangilangan Edge adapterini deploy qilib, keyin SQL’ni yangilang. Ikkala SQL o‘rnatish usulidan bittasini tanlang.
3. Auth’da Email va signup yoqilgan, `mailer_autoconfirm=true`, `password_min_length=8` bo‘lsin. Ro‘yxatdan o‘tishda email/parol/parolni takrorlash, keyingi kirishda email/parol ishlatiladi. Email OTP yoki SMTP signup uchun talab qilinmaydi. AI uchun Edge Functions → Secrets’da `AI_GATEWAY_API_KEY` va `AI_MODEL` qo‘shiladi; kalit chatga yoki Git’ga yozilmaydi. Model [jonli katalogdagi](https://ai-gateway.vercel.sh/v1/models) aniq `provider/model` identifikatoridan tanlanadi.
4. Supabase CLI’da loyiha bilan autentifikatsiyadan o‘tib, repo ildizidan `supabase functions deploy oqi-assistant --project-ref YOUR_PROJECT_REF` bajaring. `supabase/config.toml` shu funksiyaning eski gateway JWT tekshiruvini o‘chiradi; funksiya o‘zi har so‘rovda `auth.getUser` bilan tokenni tekshiradi. `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` Supabase tomonidan server muhitiga taqdim etiladi. Yangi loyiha SQL va Edge tayyor bo‘lmaguncha foydalanuvchiga ochilmaydi; mavjud backend yangilanishida Edge avval qo‘llanadi.
5. Android qurilmadagi xarita uchun `.env`ga `EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_KEY` kiriting va Google Maps SDK for Android’ni yoqing. Kalitni ilovaning package nomi va imzolash sertifikati bilan cheklang. iOS Apple Maps’dan, web OpenStreetMap embed’dan foydalanadi.
6. Native paketlar uchun [EAS profillari va muhitlarini](build.md) sozlab development/store build yarating. Lokal sinovda `npm start` yoki `npm run web` ishlatiladi. Brauzer GPS’i uchun HTTPS yoki localhost kerak.

## Qayerdan ishlatiladi

| Oyna                                     | Amal                                                                                            |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Profil → Ruxsatlar va xotira             | GPS holatini ko‘rish, so‘rash, native sozlamalarni ochish                                       |
| Ustoz profili → Dars manzilini belgilash | GPS, koordinata kiritish yoki native xaritaga tegish; manzilni saqlash/olib tashlash            |
| Qidirish → Xarita                        | Filtrdagi ustozlar manzili; yaqin qidiruvda 5/10/25/50 km; Google Maps’da yo‘nalish             |
| Ustoz → Guruhlar → Guruhni boshqarish    | Sarlavha bilan video/hujjat yuklash, e’lonni yashirish/ochish, o‘chirish                        |
| O‘quvchi → Darslarim → Dars materiallari | Guruhga va tanlangan mashg‘ulotga tegishli fayllarni ko‘rish                                    |
| O‘quvchi → Video darslar                 | Qabul qilingan guruhlaridagi videolar va avvalgi ochiq manbalar                                 |
| O‘ng tomondagi AI belgisi                | Bosib chatni ochish, surib joyini o‘zgartirish; joylashuvi shu akkaunt/qurilmada eslab qolinadi |

Rasm va hujjat tanlash tizim picker’i orqali ishlaydi. Butun galereya yoki tashqi diskni o‘qish ruxsati so‘ralmaydi. GPS faqat foydalanuvchi tugmani bosganda olinadi; o‘quvchining koordinatasi bazaga saqlanmaydi. Ustozning o‘zi saqlagan dars manzili tasdiqlangan va faol profil bo‘lsa boshqa foydalanuvchilarga ko‘rinadi.

## Materiallar

Hozirgi limit har fayl uchun **20 MiB**: MP4, WebM, PDF, DOCX, PPTX, XLSX va JPEG/PNG/WebP. Bu qisqa video darslar uchun dastlabki variant. Uzoq videolarga keyingi bosqichda TUS/resumable upload va video transcoding qo‘shish kerak. MP4 ichidagi kodek qurilmada qo‘llanishi kerak; video yuklanganda kodek o‘zgartirilmaydi.

Yuklash: SQL’da yo‘l rezerv qilish → Storage’ga baytlarni yuklash → haqiqiy MIME/hajmni tekshirish → guruhga bog‘lash. Javob yo‘qolsa «Yuklashni yakunlash» tugmasi mavjud rezerv bilan qayta urinadi. Tasdiqlangan ustoz faqat o‘z guruhiga yuklaydi. Talaba faqat faol a’zolikdagi e’lon qilingan materialni oladi. Bucket yopiq; havola ko‘pi bilan 5 daqiqa ishlaydi. A’zolik bekor qilinganda yangi havola berilmaydi; avval imzolangan havola muddati tugaguncha ishlashi mumkin. Ochilgan oynada havola yangilanadi, video joyi saqlanadi.

Yashirish materialni o‘quvchi ro‘yxatidan olib tashlaydi. O‘chirish avval bog‘lanishni olib tashlaydi, keyin Storage baytlarini va metadata holatini o‘zgartiradi. Storage tarmoq xatosida qolgan bog‘lanmagan faylni keyinchalik shu fayl xizmatining `remove` metodi bilan tozalash mumkin.

## AI xizmati

`AI SDK 7.0.142` va AI Gateway serverda ishlaydi. Chatning yakunlangan javoblari alohida private jadvallarda turadi; umumiy marketplace snapshot’ga kiritilmaydi. Modelga oxirgi 15 ta serverda saqlangan xabar yuboriladi. Qurilma yuborgan qo‘shimcha `messages` yoki `system` maydonlari ishlatilmaydi. AI hozir shaxsiy dars fayllari yoki baholarni o‘qimaydi.

Server bitta akkaunt uchun parallel ravishda bitta faol so‘rov, daqiqasiga 5 ta va sirg‘aluvchi 24 soatda 30 ta so‘rovga ruxsat beradi. Limit PostgreSQL profil qatori lock’i bilan hisoblanadi; bir nechta Edge instansiya uchun ham bitta limit. Muvaffaqiyatsiz urinishlar ham hisoblanadi. 60 soniyadan oshgan tugallanmagan so‘rov yangi urinishda bo‘shatiladi. Model chaqiruvi 35 soniyada to‘xtaydi, avtomatik provider retry yo‘q, javob 900 output token bilan chegaralangan. Alohida gateway byudjetini xizmat panelidan boshqarish mumkin.

Faqat kirgan, onboard qilingan o‘quvchi savol beradi. `requestId` qayta yuborilsa, yakunlangan javob qaytariladi. Ilova AI javobini o‘zi yozolmaydi: yakunlash RPC’si faqat server roliga berilgan. Provider xatolari foydalanuvchiga maxfiy tafsilotlarsiz qaytariladi.

Demo rejimi xaritada namuna nuqtalarini va AI chat oynasining belgilangan sinov javobini ko‘rsatadi. Demo haqiqiy GPS yaqinligi, Storage yoki model natijasi sifatida ko‘rsatilmaydi.

## Tekshirish va chegaralar

`npm run typecheck`, `npm test`, `npm run supabase:check`, `npm run format:check` va `npm run export:all` loyiha tekshiruvlari. Deno 2 o‘rnatilgan bo‘lsa `npm run typecheck:edge` Edge adapterini ham tekshiradi. `npm run test:e2e` brauzer oqimlarini tekshiradi.

SQL testlari PostgreSQL funksiyalarini PGlite va mustaqil PostgreSQL sessiyalarida tekshiradi. HTTP handler testida model o‘rniga boshqariladigan javob ishlatiladi. Jonli sxema / Edge / web va yangi email/parolli signup/login natijalari [alohida hisobotda](supabase-live-verification.md) yuritiladi. Binary upload, Realtime, pullik model va real qurilma dialoglari uchun amalda bajarilgan natija talab qilinadi. Web/Android/iOS eksport native qurilmada bajarilgan sinov bilan bir xil emas. Eski email OTP tekshiruvi yangi signup oqimining talabi emas.

Manbalar: [Expo Location](https://docs.expo.dev/versions/latest/sdk/location/), [DocumentPicker](https://docs.expo.dev/versions/latest/sdk/document-picker/), [Video](https://docs.expo.dev/versions/latest/sdk/video/), [Supabase functions auth](https://supabase.com/docs/guides/functions/auth), [private assets](https://supabase.com/docs/guides/storage/serving/downloads), [AI Gateway](https://vercel.com/docs/ai-gateway/getting-started). SDK chaqiruvlari o‘rnatilgan paketlarning manbalari bilan tekshirilgan.
