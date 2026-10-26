# O‘qi — jonli Supabase tekshiruvi

Maqsad loyiha: `mhqofwuawwnappstcekh`. Natijalar sanasi bilan yuritiladi; lokal testlar, demo va amalda bajarilgan jonli tekshiruvlar aralashtirilmaydi. Sana zonasi: Asia/Tashkent.

## 2026-10-26 — majburiy o‘qituvchi arizasi

`202610260002_tutor_applications.sql` qo‘llandi. Management API orqali qayta o‘qishda: private ariza jadvalida RLS yoqilgan, klientning bevosita SELECT/yozishi taqiqlangan, ichki mutation/snapshot yordamchilari yopiq, public authenticated mutation ishlaydi, onboarding’dan oldin sertifikat yuklash guard’i o‘rnatilgan. Mavjud **1 profil / 1 moderator** saqlandi; jonli arizalar **0**, ushbu tekshiruvda foydalanuvchi yoki sertifikat yaratilmagan. Admin roli tayinlanmadi va credential o‘zgartirilmadi.

Izolyatsiyalangan testlarda telefon, PDF/rasm, private hujjat, admin bildirishnomasi, kutish, rad etish, qayta yuborish, tasdiqlash va kabinetga kirish tekshirildi. Lokal **132 test**, **4 UI testi**, **20 brauzer oqimi** va **5 PostgreSQL concurrency tekshiruvi** o‘tdi. Android/iOS/web bundle eksportlari o‘tdi; bu APK/IPA kompilatsiyasi yoki fizik qurilma sinovi emas. [Ariza qo‘llanmasi](tutor-approval.md).

## 2026-10-26 — ustoz ish maydoni

`202610260001_teacher_workspace.sql` Management API orqali tranzaksiyada qo‘llandi. Yangi to‘rtta jadvalda RLS yoqilgan, `oqi_group_messages` Realtime publication’ida bor. `oqi_mock_*` funksiyalari anon rolga yopiq; `authenticated` test saqlash RPCsini bajara oladi, ichki `oqi_mock_test_json` yordamchisini bajara olmaydi. Faqat o‘qish orqali qayta tekshirildi: avvalgi **1 profil / 0 guruh** saqlangan. Ushbu tekshiruvda jonli o‘quvchi, chat yoki test ma’lumotlari yaratilmagan.

Funksional guruh/test/chat tekshiruvlari izolyatsiyalangan PGlite va demo brauzerida bajarildi. Jonli migratsiyaning o‘rnatilgani haqiqiy foydalanuvchilar bilan WebSocket, binary PDF upload yoki qurilma sinovi bajarilganini anglatmaydi. [Oqim va cheklovlar](teacher-workspace.md), [SQL ruxsatlari](../supabase/README.md#2026-10-26-ustoz-ish-maydoni).

## 2026-10-25 — email va parol kontrakti

Foydalanuvchining yangi talabi: **signup — email, parol, parolni takrorlash; login — email va parol**. Email kodi yoki signup xati talab qilinmaydi. Parol kamida 8 belgili; ikki parol mosligi klientda tekshiriladi. Signup/login uchun SMTP kerak emas.

| Tekshiruv                          | Joriy holat                                                                                                                                                           |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Server sozlamasi                   | **PASS** — Management API PATCH va qayta o‘qish: `external_email_enabled=true`, `mailer_autoconfirm=true`, `password_min_length=8`. Boshqa Auth sozlamalari saqlandi. |
| Haqiqiy signup va keyingi login    | **PASS** — ikkita vaqtinchalik akkaunt bilan public signup sessiya qaytardi; chiqish va keyingi parol bilan kirish ishladi. Email yuborilmadi.                        |
| Email OTP / custom signup shabloni | **TALAB QILINMAYDI** — avvalgi OTP/SMTP talabi bekor qilingan.                                                                                                        |
| EAS                                | Development, preview APK va production AAB profillari tayyor; Expo login/project link va signing credential’lari yo‘q. APK/IPA yaratilmagan.                          |

Qo‘shimcha jonli sinovlar o‘tdi: o‘z profiliga kirish, begona profil/fayl va ichki RPC’larni rad etish; PNG baytlarini yuklash va aynan qayta olish; finalize, avatar qo‘yish/olib tashlash va Storage API bilan o‘chirish. Realtime haqiqiy autentifikatsiyali WebSocket orqali yangi bildirishnomani oldi. Sinov abonenti ota jarayon bergan sessiyani SDK’ning `accessToken` callback’i orqali ishlatdi.

Barcha vaqtinchalik Auth akkauntlari va sinov fayl/receipt/bildirishnomalari tozalandi. Yakuniy faqat o‘qish tekshiruvi: smoke akkauntlar **0**, dastlabki profillar soni **1**, fayllar **0**, bildirishnomalar **0**. Mavjud profil saqlandi. Birinchi yordamchi test API’ning `201` javobini noto‘g‘ri baholagach, shu yordamchi tuzatildi va yaratilgan ma’lumotlar egalik belgisi bilan tozalandi; bu ilova xatosi sifatida qayd etilmadi.

Lokal tekshiruvlar: **123** asosiy test, **4** eksport qilingan UI testi va **17** brauzer oqimi o‘tdi. Yangi browser testi parol mosligi, ko‘rsatish/yashirish, forma almashtirganda tozalash, noto‘g‘ri parol, custom parol bilan qayta kirish va reload’ni tekshirdi. Web, Android va iOS bundle eksportlari o‘tdi; vaqtinchalik checkout’da Android/iOS native prebuild ham o‘tdi. EAS konfiguratsiyasi uchun 13 ruxsat/credential holati tekshirildi. APK/IPA kompilatsiyasi bajarilmagan.

Avtomatik tasdiqlash email orqali egalikni tekshirish emas. SQL’dagi akkaunt, sessiya, suspension, rol va MFA himoyalari saqlanadi. [Build yo‘riqnomasi](build.md) hamda [ixtiyoriy SMTP](supabase-smtp.md) alohida.

## 2026-10-24 — bajarilgan tekshiruvlar

## Baza va ulanish

| Tekshiruv            | Natija                                                                                                                        |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Management API       | Mavjud maxfiy binding orqali rasmiy HTTPS API autentifikatsiyasi ishladi.                                                     |
| Loyiha               | `ACTIVE_HEALTHY`, PostgreSQL **17.11**.                                                                                       |
| SQL holati           | Oldin SQL Editor orqali yaratilgan sxema barcha **16 migratsiyaning yakuniy holatiga** mos.                                   |
| Funksiyalar          | **65** funksiya manbasi LF/CRLF satr oxirlari normallashtirilganda mos; ko‘p satrli literal mazmuniga ta’sir aniqlanmadi.     |
| Jadvallar            | **30** jadvalning ustunlari, default qiymatlari, indekslari va RLS holati mos. `anon` / `authenticated` ruxsatlari aynan mos. |
| Qo‘shimcha obyektlar | **12 policy**, **2 trigger** va Realtime’ga kiritilgan **5 jadval** mos.                                                      |
| Healthcheck          | **12** faqat o‘qish so‘rovi o‘tdi: 30 jadvalda RLS, 5 private bucket, 7 Storage policy va 5 Realtime jadvali tekshirildi.     |

Lokal PostgreSQL 18 katalogidagi qo‘shimcha `NOT NULL` constraint yozuvlari va Supabase’ning `service_role` uchun default grantlari kutilgan farqlardir; ular ilova sxemasi yoki mijoz ruxsatlari nomuvofiqligi sifatida baholanmadi.

**Masofaviy SQL qayta bajarilmadi va `migration repair` ishlatilmadi.** CLI migratsiya tarixi mavjud emas; sxema mosligi tarixdagi bajarilgan fayllar ro‘yxatini yaratmaydi. Baseline migratsiyasini ko‘r-ko‘rona qayta yuborish kerak emas.

CLI `link` muhit proksisi taqdim etgan credential formatini `Invalid access token format` deb rad etdi. Shu binding HTTPS Management API’da ishladi; foydalanuvchidan raw tokenni chatga yuborish so‘ralmaydi. Bu CLI cheklovi API autentifikatsiyasi muvaffaqiyatsizligini anglatmaydi.

## Edge, HTTP va frontend

| Tekshiruv                 | Natija                                                                                                                                                                                                                      |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Frontend konfiguratsiyasi | Publishable kalit Git ignore qilingan `.env`da; `EXPO_PUBLIC_BACKEND_MODE=supabase`. Kalit qiymati hisobotga yoki Git’ga kiritilmagan.                                                                                      |
| Auth HTTP                 | Health va settings so‘rovlari **200**.                                                                                                                                                                                      |
| Anonim ruxsatlar          | Profil jadvali, snapshot va ichki RPC so‘rovlari **401** bilan rad etildi.                                                                                                                                                  |
| Edge deploy               | `oqi-assistant`: **ACTIVE**, versiya **1**, `verify_jwt=false`; token tekshiruvi handler ichida.                                                                                                                            |
| Edge HTTP                 | `OPTIONS` **204**, `GET` **405**, Authorization’siz `POST` **401**.                                                                                                                                                         |
| AI                        | `AI_GATEWAY_API_KEY` va `AI_MODEL` hali sozlanmagan. Pullik model chaqiruvi bajarilmadi.                                                                                                                                    |
| Web                       | Jonli konfiguratsiya bilan eksport `/tmp/oqi-live-web`ga o‘tdi. Rol → akkaunt → email oynasi ochildi; demo yordamchisi yo‘q, bo‘sh/noto‘g‘ri email validatsiyasi ishladi, JavaScript xatosi kuzatilmadi. Email yuborilmadi. |

Frontend eksporti hali ommaviy web nashri, APK/IPA yoki real qurilmada tekshirish degani emas.

## 2026-10-24 email sozlamalari tarixi

Auth’da Email, signup va email tasdiqlash yoqilgan; kod uzunligi **6 raqam**. Google yoqilgan, Apple va CAPTCHA o‘chirilgan. Bu provider sozlamalarining mavjudligi Google orqali haqiqiy kirish tekshirildi degani emas.

Custom SMTP mavjud emas. Confirm Signup va Magic Link uchun kodli shablonlarni birga yangilash so‘rovi **400** bilan rad etildi:

> Email template modification is not available for free tier projects using the default email provider. Please upgrade your plan or configure a custom SMTP provider.

**2026-10-24 dagi so‘rov Auth konfiguratsiyasini o‘zgartirmadi.** SMTP akkaunti yaratilmagan, SMTP sozlanmagan va haqiqiy OTP yetkazilishi tasdiqlanmagan. 2026-10-25 dan bu signup blocker emas: email/parol oqimi tanlangan. [SMTP yo‘riqnomasi](supabase-smtp.md) faqat keyingi ixtiyoriy xizmat emaillariga tegishli.

| Keyingi sinov                                                                            | Holat                                                                                                                                                        |
| ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Vaqtinchalik test akkauntlari bilan haqiqiy Auth, binary Storage va Realtime smoke testi | **PASS, 2026-10-25** — public signup/login, vakolatli RPC, PNG binary lifecycle va haqiqiy WebSocket xabari tekshirildi; vaqtinchalik ma’lumotlar tozalandi. |
| Haqiqiy email OTP olish va kod bilan kirish                                              | **TALAB QILINMAYDI** — 2026-10-25 dan signup/login parol bilan.                                                                                              |
| Pullik AI javobi                                                                         | **PENDING** — provider secrets va model tanlangandan keyin.                                                                                                  |
| Google/Apple kirishi va native qurilma testi                                             | **PENDING**.                                                                                                                                                 |

GitHub’da [draft PR #6](https://github.com/sardororolov2233-afk/Darsino/pull/6) mavjud. `7c4f519` commitidagi CI billing cheklovi sabab runner boshlanmasdan to‘xtagan; keyingi commitlarning masofaviy CI natijasi bu hisobotda hali tasdiqlanmagan.

Deploy tartibi: [Supabase ulanish yo‘riqnomasi](supabase-deployment.md). Mavjud ishlayotgan AI xizmatini kelgusida yangilashda Edge adapteri SQL’dan oldin deploy qilinadi.
