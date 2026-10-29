# O‘qi — o‘quvchi roadmap’i bajarilishi

2026-10-29, Asia/Tashkent. Manba: [foydalanuvchi yuborgan reja](plans/student-roadmap-source.md). Mavjud ishlayotgan modullar saqlanib, yetishmagan qismlar qo‘shildi. Och yashil palitra saqlandi.

## Logotip va ilova belgisi

- Birinchi yuborilgan rasm asosida tayyorlangan [ichki logotip](../assets/oqi-wordmark.png) — onboarding, o‘quvchi/ustoz sarlavhalari va yuklanish oynasida.
- Ikkinchi rasm asosida tayyorlangan [ilova belgisi](../assets/icon.png) — Android, iOS va web favicon’da. Android adaptive icon ham sozlangan.
- Aktivlar ImageGen orqali ilovaga moslab tayyorlangan; asl chat tasvirlarining baytma-bayt nusxasi emas. Wordmark 1536×1024, belgi 1254×1254 RGB PNG. Fayllar `assets/`dan boshqariladi.
- Ilova belgisi telefonda yangi native build o‘rnatilganda yangilanadi.

## Reja bo‘yicha natija

| ID                | Amalga oshirilgan ish                                                                                                                        | Dalil / holat                                                                                                                           |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| AUTH-01           | Email/parol, sessiya va PKCE oqimi saqlandi; parolni havola bilan tiklash, yangi parolni tasdiqlash va qayta kirish qo‘shildi                | Jonli signup/login va recovery token bilan parol yangilash tekshirildi. Xat yetkazilishi va native OAuth quyidagi chiqarish shartlarida |
| SEC-01            | Yangi o‘quvchi uchun yopiq profil, yashirilgan hudud/rasm, kontakt roziligi, bloklash; homework RLS va private Storage                       | SQL, rol/akkaunt chegaralari va jonli Storage HTTP sinovlari. Recipient ro‘yxati to‘g‘ridan-to‘g‘ri REST so‘rovida ham yopiq            |
| FLOW-01           | Qidiruv → ariza → ustoz tasdig‘i → guruh/jadval                                                                                              | Brauzer va jonli RPC bilan to‘liq o‘tdi. Tasdiqqacha a’zolik yo‘q; qayta so‘rov, rad etish va bekor qilish regressiya testlarida        |
| DATA-01           | Mavjud server private workspace auditi; actor JWT bilan bog‘langan o‘qish/yozish, CAS/revision, natija ID’si bilan retry, cache va yangilash | Boshqa sessiyada progress tiklandi; boshqa akkaunt so‘rovi rad etildi                                                                   |
| NOTIF-01          | Vazifa, javob va feedback uchun yagona event kaliti; o‘qilgan holat, hisoblagich va tegishli sahifaga o‘tish                                 | Bir mantiqiy hodisaga bitta xabar. Eski ariza/guruh/kontakt bildirishnomalari ham tegishli bo‘limni ochadi                              |
| QA-01             | 320/390 px, mavjud oqimlar, haqiqiy brauzer QR dekoderi, SQL va eksport tekshiruvlari                                                        | Fizik Android/iOS va OS push tekshiruvi ochiq chiqarish sharti                                                                          |
| HOME-01           | Yangi o‘quvchi: maqsad, mos ustoz va ariza holati. Faol o‘quvchi: avval keyingi dars, vazifa/test, guruh va chat                             | Faol kabinetda qidiruv/video kataloglari bilan ortiqcha to‘ldirish qisqartirildi                                                        |
| SEARCH-01         | Maqsad/fan/shakl bo‘yicha dastlabki filtr, moslik saralashi, tasdiqlangan ustoz, dars kuni/vaqti                                             | Vaqt filtri faqat e’lon qilingan kelgusi jadvalga tayanadi; taxminiy bo‘sh vaqt yaratilmaydi                                            |
| HW-01             | Guruh/individual vazifa, draft/publish, PDF/rasm, javob, tekshirish, izoh, qayta topshirish, yopish                                          | Jonli teacher → student → teacher → student oqimi, immutable urinish tarixi va fayl ruxsatlari tekshirildi                              |
| LEARN-01          | Pastki tab `Bilimim`; so‘nggi natija, baholash usuli, sana, tarix, faqat bir xil testni taqqoslash                                           | DTM vaznli ball va diagnostika aralashtirib umumiy foiz hisoblanmaydi; natijasiz holat “Hali o‘lchanmagan”                              |
| PROFILE-01        | Fan, maqsad, viloyat/tuman, onlayn/oflayn va mustaqil/ustoz afzalliklarini keyin o‘zgartirish                                                | Mos kelmagan fan/hudud tanlovlari tozalanadi; qayta onboarding shart emas                                                               |
| AI-01 / GROWTH-01 | Roadmap’dagi pilotdan keyingi bosqich sifatida saqlandi                                                                                      | Yangi katta AI/referral modullari va sun’iy KPI natijalari kiritilmadi                                                                  |

## Uy vazifalari

`Assignments`, `CreateAssignment`, `AssignmentDetail` routelari o‘quvchi bosh sahifasi, “Darslarim → Guruhim → Vazifalar” hamda ustoz boshqaruviga ulangan. Ustoz o‘z guruhining barcha a’zolarini yoki individual o‘quvchini tanlaydi. Yangi vazifa qoralama bo‘lib saqlanadi; e’lon qilingach matni o‘zgartirilmaydi. Tuzatish uchun yangi vazifa yaratish mumkin.

O‘quvchi matn yoki 5 tagacha PDF/JPG/PNG/WebP fayl bilan javob beradi. Muddatdan keyin topshirish mumkin va ustozga kech topshirilgani ko‘rsatiladi. `Tekshiruvda → Qabul qilindi / Qayta ishlash` oqimi bor. Qayta topshirish oldingi ishni almashtirmaydi: versiya, sana va feedback saqlanadi.

Yangi private `oqi-homework` bucket’da har fayl 10 MiB gacha, akkaunt uchun 100 MiB rezerv nazorati va soatlik limit bor. Pending upload maksimal fayl hajmini band qiladi; finalize haqiqiy Storage MIME/hajm/egasini tekshiradi. Yuklash javobi yo‘qolsa mavjud rezerv davom ettiriladi. Biriktirilmagan/pending fayllarni egasi o‘chirishi mumkin; topshirilgan ish tarixi o‘chirilmaydi. O‘chirish Storage API orqali, so‘ng metadata holatini yakunlash bilan bajariladi. Server o‘chirilayotgan faylni vazifaga biriktirishga yo‘l qo‘ymaydi.

Fayl uchun havola ruxsat tekshirilgandan keyin 60 soniyaga yaratiladi. Boshqa o‘quvchi yo‘lni bilsa ham havola ololmaydi. MIME va hajm tekshiruvi mavjud; alohida antivirus provayderi ulanmagan.

## Sinxronlash va xatolik holatlari

Progress allaqachon Supabase private state’da saqlanar edi; eski `oqi-ui.md`dagi lokal saqlash haqidagi qayd yangilandi. Server doimiy manba, AsyncStorage esa akkauntga alohida cache. Sinxronlashda revision/CAS va qayta urinish qo‘llanadi. Bir xil diagnostika urinishining takroriy yuborilishi tarixni ko‘paytirmaydi.

Offline rejim ochilgan, haqiqiy sessiyada avval sinxronlangan progress va vazifalarni o‘qishga xizmat qiladi. Sovuq ishga tushishda sessiyani serverdan tiklash bajarilmasa, qayta ulanish oynasi chiqadi. Yangi javob yoki natija muvaffaqiyatli server javobidan keyin saqlangan deb ko‘rsatiladi; tarmoq xatosida qayta urinish mavjud. Ilovani yopishdan oldin yakunlanmagan formani serverga saqlash kerak. Hisobdan chiqishda jonli akkauntning shaxsiy cache va onboarding qoralamalari tozalanadi. Demo rejimdagi mahalliy baza alohida sinov serveri sifatida saqlanadi.

Yangi crash boundary tushunarli qayta ochish oynasini ko‘rsatadi. Ushbu boundary diagnostik logga faqat `render_failure` kodini yozadi; exception payload’ini chiqarmaydi. Tashqi monitoring/analitika xizmati ulanmagan. Pilot KPI’lari [manba rejada](plans/student-roadmap-source.md) maqsad sifatida qoladi.

## Tekshiruv natijalari va ekranlar

- `npm test`: 143 ta test o‘tdi, xato yo‘q.
- `npm run test:postgres`: barcha 21 migratsiya bilan PostgreSQL 17’da 6 ta parallel so‘rov tekshiruvi o‘tdi. Uy vazifasining bir vaqtda qayta yuborilishi bitta versiya va bitta hodisa yaratadi.
- Playwright: 28 ta brauzer ssenariysi qamrab olindi. Birinchi yurishda 27 tasi o‘tdi; yangi onboarding filtriga moslangan test boshlang‘ich holati tuzatilgach, uchta to‘lov ssenariysi qayta bajarilib o‘tdi. Mahsulot kodini o‘zgartirish talab qilinmadi.
- Eksport qilingan web kodida 4 ta UI ssenariysi o‘tdi. Kontakt roziligi testi haqiqiy so‘rov/tasdiqdan keyingi yozishmani tekshiradi.
- TypeScript, Prettier va SQL installer mosligi tekshiruvlari o‘tdi. Web, Android va iOS JavaScript/asset eksportlari yaratildi; bu APK/IPA build emas.
- Quyidagi yettita ekran haqiqiy brauzerdan, ajratilgan demo ma’lumotlari bilan olindi. Gorizontal chiqib ketish va JavaScript xatolari aniqlanmadi; jonli foydalanuvchi ma’lumotlari ishlatilmadi.

| Ekran                                | Tasvir                                                 |
| ------------------------------------ | ------------------------------------------------------ |
| Rol tanlash va ichki logotip         | [390 px](screenshots/roadmap-welcome-390.png)          |
| Yangi o‘quvchi                       | [390 px](screenshots/roadmap-new-student-390.png)      |
| Faol o‘quvchi                        | [390 px](screenshots/roadmap-active-student-390.png)   |
| O‘quvchi vazifasi va javoblar tarixi | [320 px](screenshots/roadmap-homework-student-320.png) |
| Bilimim                              | [390 px](screenshots/roadmap-learning-390.png)         |
| Ustoz boshqaruvi                     | [390 px](screenshots/roadmap-teacher-390.png)          |
| Ustoz vazifalari                     | [390 px](screenshots/roadmap-homework-teacher-390.png) |

## Jonli Supabase

Loyiha: `mhqofwuawwnappstcekh`. Yangilashdan oldin mavjud ilova jadvallari ishchi muhitda 0600 ruxsatli shaxsiy JSON zaxiraga yozildi; zaxira repozitoriyga kiritilmagan. Asl **3 profil va 1 guruh** saqlandi.

Qo‘llangan qo‘shimcha migratsiyalar:

1. `202610290001_assignments.sql` — jadvallar, scoped RPC, RLS, private bucket, fayl rezervi va lifecycle.
2. `202610290002_student_privacy.sql` — faqat yangi o‘quvchi onboardingida xavfsiz standartlar; mavjud akkaunt tanlovlari o‘zgartirilmaydi.
3. `202610290003_assignment_recipient_privacy.sql` — recipient ro‘yxati uchun column access chegarasi.

Bu loyihada CLI `schema_migrations` tarixi mavjud emas; yangilanish Management API orqali faqat uch yangi SQL fayli bilan bajarildi. Yangi loyiha uchun generatsiya qilingan [SQL installer](../supabase/Darsino_Supabase_setup.sql) barcha 21 migratsiyani o‘z ichiga oladi.

Jonli sinovda vaqtinchalik uch akkaunt yaratildi. Ustoz faqat fixture uchun admin SQL bilan tasdiqlandi; bu sertifikat/moderatsiya onboarding testining o‘rnini bosmaydi. Haqiqiy signup/login, kontakt roziligi, ariza/tasdiq, boshqa sessiyada progress, PDF/PNG binary upload/download, peer denial, feedback, qayta topshirish va ishlatilmagan faylni o‘chirish o‘tdi. Recovery testi admin yaratgan recovery token orqali bajarildi; email yuborilmadi. Sinov akkauntlari, yozuvlar va Storage obyektlari yakunda olib tashlandi.

## Rollback

Frontendni oldingi `b36c2e9` versiya/build’ga qaytarish mumkin: eski mijoz yangi homework jadvallaridan foydalanmaydi. Yangi jadvallar, bucket va topshirilgan ishlarni saqlash kerak. Onboarding default trigger’ini favqulodda to‘xtatish zarur bo‘lsa:

```sql
drop trigger if exists oqi_student_privacy_defaults on public.darsino_profiles;
```

Bu mavjud foydalanuvchi maxfiylik tanlovlarini ochib yubormaydi. Yangi SQL fayllarining har biri tranzaksiyada bajariladi. Data rollback zarur bo‘lsa avval shaxsiy zaxira bilan solishtiriladi; ishlab turgan Storage obyektlari SQL bilan o‘chirilmaydi.

## Chiqarishdan oldingi ochiq shartlar

- Ushbu muhitda Expo/EAS akkauntiga kirilmagan. APK/IPA yaratilmagan; [build yo‘riqnomasi](build.md) bo‘yicha yangi native build kerak.
- Fizik Android va iOS’da kamera/galereya, yirik shrift, sust internet, fon rejimi, OAuth callback va OS bildirishnomalari tekshiriladi. Brauzer testi fizik telefon testi sifatida ko‘rsatilmaydi.
- Supabase’da email/parol va Google yoqilgan, Apple o‘chiq. Apple tugmasi jonli ilovada standart holatda yashiriladi; provayder sozlangach `EXPO_PUBLIC_APPLE_AUTH_ENABLED=true` bilan yoqiladi.
- Email signup foydalanuvchi tanlaganidek tasdiqlash kodisiz qoladi. SMTP hisob hali yo‘q; recovery xatining real tashqi emailga yetib borishi alohida tekshiriladi. Google/Apple konsent oynalari haqiqiy foydalanuvchi qurilmasida sinovdan o‘tkaziladi.
- Voyaga yetmaganlar uchun barcha yangi o‘quvchilarga bir xil yopiq standart qo‘llandi. Yosh yoki tug‘ilgan sana yig‘ilmaydi; yosh/ota-ona roziligining alohida mahsulot jarayoni pilotdan oldin belgilanadi.
- Roadmap’dagi retention/activation maqsadlari real pilot natijasi sifatida ko‘rsatilmaydi. Keng AI va growth ishlari pilotdan keyin boshlanadi.
