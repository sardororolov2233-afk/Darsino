# O‘qi — ixtiyoriy xizmat emaillari uchun SMTP

2026-10-25. **Email/parolli signup va login uchun SMTP kerak emas.** Yangi oqimda email kodi yuborilmaydi; Supabase `mailer_autoconfirm=true` bilan yangi akkauntga sessiya beradi. SMTP yo‘qligi ilovaga ro‘yxatdan o‘tishni to‘smasligi kerak.

Ushbu yo‘riqnoma kelgusida parolni tiklash, emailni o‘zgartirish yoki boshqa xizmat emaillari yoqilsa ishlatiladi. Bu oqimlar faqat SMTP yozuvlarini kiritish bilan tayyor bo‘lib qolmaydi: tegishli ilova/callback va yetkazilish sinovi ham kerak. Hozir SMTP akkaunti yaratilmagan va SMTP sozlanmagan.

## Keyinchalik SMTP kerak bo‘lsa

1. Resend’da akkaunt oching va [API Keys](https://resend.com/api-keys) sahifasida email yuborishga ruxsatli kalit yarating.
2. Muhit sozlamalaridagi **maxfiy** `SMTP_PASSWORD` maydoniga API kalitini kiriting. Kalitni chatga, buyruq matniga yoki Git’ga yozmang. Ushbu binding faqat `api.supabase.com` bilan sozlash uchun ishlatiladi.
3. Quyidagi maxfiy bo‘lmagan SMTP sozlamalarini kiriting:

   | O‘zgaruvchi         | Sinov qiymati           |
   | ------------------- | ----------------------- |
   | `SMTP_HOST`         | `smtp.resend.com`       |
   | `SMTP_PORT`         | `465` — TLS             |
   | `SMTP_USER`         | `resend`                |
   | `SMTP_SENDER_EMAIL` | `onboarding@resend.dev` |
   | `SMTP_SENDER_NAME`  | `O‘qi`                  |

4. Sozlamalarni saqlang. HTTPS Management API orqali faqat SMTP va aniq kerak bo‘lgan xizmat emailining shabloni sozlanadi. Signup uchun eski Confirm Signup / Magic Link OTP shablonlarini o‘zgartirish talab qilinmaydi.

`onboarding@resend.dev` **faqat dastlabki sinov uchun**: xat Resend akkaunti egasining o‘z manziliga yuboriladi. Ommaviy foydalanuvchilar uchun o‘zingizga tegishli domenni tasdiqlash va shu domendagi sender manzilini tanlash kerak. Production domen yoki sender avtomatik tanlanmaydi.

SMTP keyinchalik sozlangach, avval ruxsatli bitta manzilga aynan kerakli xizmat emaili yetkazilishi tekshiriladi. Natija [jonli tekshiruv hisobotiga](supabase-live-verification.md) kiritiladi; SMTP sozlamasi saqlanishi email yetkazilganini isbotlamaydi.

Tarix: 2026-10-24 da default provider va free tier kodli OTP shablonlarini o‘zgartirishni 400 bilan rad etgan. 2026-10-25 dan email OTP talabi bekor qilingan; shu eski cheklov yangi signup/login uchun blocker emas.

Resend qo‘llanmasi: [Send with SMTP](https://resend.com/docs/send-with-smtp).
