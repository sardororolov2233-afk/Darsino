# O‘qi — o‘quvchi qismini yakunlash va rivojlantirish rejasi

> **Hujjat turi:** Product Roadmap + Technical Implementation Plan\
> **Versiya:** 1.0\
> **Sana:** 2026-10-29\
> **Loyiha:** O‘qi (GitHub repozitoriyasi: `sardororolov2233-afk/Darsino`)\
> **Platforma:** React Native / Expo, Supabase\
> **Asosiy maqsad:** O‘quvchini ro‘yxatdan o‘tishdan boshlab mos ustoz topish, guruhga yozilish, darsda qatnashish, uy vazifalarini bajarish va ta’lim natijasini kuzatishgacha olib boruvchi **to‘liq ishlaydigan va xavfsiz** mahsulot yaratish.

---

## 1. Strategik qaror

**O‘qi — hozirgi bosqichda repetitorlar marketplace’i va o‘quvchi uchun shaxsiy ta’lim kabineti.** Keng qamrovli AI Learning OS keyingi bosqichda quriladi. Hozirgi ustuvorlik ko‘p yangi funksiya qo‘shish emas, mavjud foydalanuvchi yo‘lini uzluksiz va ishonchli qilishdir.

### Asosiy foydalanuvchi yo‘li

```text
Onboarding → Maqsad/fan/hudud → Mos ustozni topish
→ Ustoz yoki guruh haqida ma’lumot → Ariza yuborish
→ Ustoz tasdig‘i → Darslarim/jadval → Dars va materiallar
→ Uy vazifasi → Ustoz fikr-mulohazasi → Test va natijalar
→ Takrorlash / keyingi dars
```

### Asosiy prinsiplar

1. Bosh sahifa foydalanuvchining **keyingi eng muhim harakatini** ko‘rsatadi.
2. Haqiqiy ma’lumot va demo/namuna ma’lumotlar aralashtirilmaydi.
3. Shaxsiy ma’lumotlar, ayniqsa voyaga yetmagan o‘quvchilarning ma’lumotlari, standart holatda himoyalangan bo‘ladi.
4. O‘qituvchi tasdiqlamagan ariza dars jadvaliga avtomatik qo‘shilmaydi.
5. O‘quvchining test natijasi boshqa foydalanuvchilarga uning roziligisiz ochilmaydi.
6. Narx, davomat va to‘lov holatlari **haqiqiy saqlangan yozuvlarga** tayanadi; to‘lov daftari haqiqiy karta tranzaksiyasi sifatida ko‘rsatilmaydi.
7. Kichik ekranlar (kamida 320 px), sust internet va qayta urinish holatlari inobatga olinadi.

---

## 2. Repozitoriyda aniqlangan joriy holat

2026-10-29 kuni GitHub’dagi `main` tarmog‘i va loyiha hujjatlari ko‘rib chiqildi. Quyidagilar **kod/hujjatlarda mavjud deb ko‘rinadi**, biroq bu ularning har biri real qurilmada va barcha live konfiguratsiyalarda tekshirilganini anglatmaydi.

| Yo‘nalish | Joriy holat | Ish |
|---|---|---|
| Onboarding | Rol, email/parol, maqsad, fan, onlayn/oflayn, mustaqil/ustoz, viloyat/tuman, profil | UX va auth tekshiruvi |
| Bosh sahifa | Maqsad, guruhlar, testlar, davomat, to‘lovlar, keyingi dars, radar, ustozlar | Ikkita foydalanuvchi holatiga bo‘lish |
| Qidiruv | Ustozlar/guruhlar, filtrlar, narx, hudud, shakl | Moslashtirish va foydalanuvchi yo‘lini qisqartirish |
| Ustoz va guruh profillari | Profil, ariza, guruhga kirish, chat | Mavjud vaqtlar/bo‘sh o‘rinlar va holatlarni aniq ko‘rsatish |
| Darslarim | Guruh, jadval, material, test, to‘lov, chat | Uy vazifalari bilan boyitish |
| Bilim radari | Mustaqil test, mock test, natijalar va ko‘nikmalar | Atamalarni soddalashtirish, tarix va sync |
| Ma’lumotlar | Supabase + ayrim mahalliy saqlash | O‘quv progressini serverga ishonchli sinxronlash |
| Aloqa | Shaxsiy/guruh chati, QR kontakt va takliflar | Maxfiylik, bloklash, bildirishnomalar auditi |
| To‘lovlar | Ustoz tomonidan yuritiladigan hisob daftari | UX’da bank to‘lovi bilan adashtirmaslik |

**Muhim texnik xulosa:** `docs/oqi-ui.md` ga ko‘ra o‘quv progressining bir qismi `AsyncStorage`da saqlanadi va Supabase bilan to‘liq sinxronlanmagan. `docs/workspace-polish.md` da ayrim real Supabase jarayonlari tekshirilgani qayd etilgan, lekin real Android/iOS qurilmadagi va OS bildirishnomalaridagi holatni alohida tekshirish kerak.

**Manba fayllar:** `src/screens/HomeScreen.tsx`, `src/screens/SearchScreen.tsx`, `src/screens/DiscoveryScreens.tsx`, `src/screens/StudentWorkspaceScreens.tsx`, `src/screens/LearningScreens.tsx`, `src/screens/MockTestsScreens.tsx`, `src/navigation.ts`, `src/components/BottomNavigation.tsx`, `docs/oqi-ui.md`, `docs/onboarding.md`, `docs/workspace-polish.md`, `docs/group-management.md`.

---

## 3. Ustuvor vazifalar jadvali

**P0 = chiqarishdan oldin zarur**, **P1 = asosiy foydalanuvchi qiymati**, **P2 = mahsulot tasdiqlangach kengaytirish**.

| ID | Ustuvorlik | Vazifa | Natija / Done |
|---|---|---|---|
| AUTH-01 | P0 | Ro‘yxatdan o‘tish, login, sessiya, parolni tiklash, email egaligi va OAuth oqimlarini tekshirish | Barcha yo‘llar real backend bilan ishlaydi; xatolar tushunarli |
| SEC-01 | P0 | Supabase RLS, profil ko‘rinishi, kontakt/blok/shikoyat, voyaga yetmaganlar uchun xavfsiz standartlar | Begona akkaunt o‘quvchi ma’lumotiga kira olmaydi |
| FLOW-01 | P0 | Ustoz topish → ariza → tasdiq → guruh → jadval E2E | To‘liq foydalanuvchi yo‘li ishlaydi |
| DATA-01 | P0 | Progress va natijalarni hisoblararo/sinxronlash auditi | Qurilma almashganda ma’lumot yo‘qolmaydi |
| NOTIF-01 | P0 | Ilova ichidagi taklif, ariza, dars va topshiriq bildirishnomalarini tekshirish | To‘g‘ri foydalanuvchiga, takrorlanmasdan yetadi |
| QA-01 | P0 | Real Android va iOS tekshiruvlari, kichik ekran, sust internet | Kritik xato yo‘q |
| HOME-01 | P1 | Bosh sahifani yangi/aktiv o‘quvchi holatiga moslashtirish | Keyingi harakat 1–2 ekranda ayon |
| SEARCH-01 | P1 | Maqsadga mos qidiruv/saralash va narx/vaqt filtrlari | Foydalanuvchi mos guruhni tez topadi |
| HW-01 | P1 | Uy vazifasini yaratish, topshirish va tekshirish | To‘liq teacher→student→teacher oqimi |
| LEARN-01 | P1 | “Radar”ni “Bilimim” sifatida tushunarli taqdim etish | Natija, tarix va rivojlanish aniq ko‘rinadi |
| PROFILE-01 | P1 | Maqsad, fanlar, hudud va afzalliklarni keyin o‘zgartirish | Re-onboarding shart emas |
| AI-01 | P2 | AI yordamida mashq tavsiyasi va bilim bo‘shlig‘i tahlili | O‘lchash metodikasi tasdiqlangandan keyin |
| GROWTH-01 | P2 | Referral, tajriba, tavsiyalar va kengaytirilgan analitika | Faqat asosiy retention isbotlangach |

---

## 4. Ekranlar va UX bo‘yicha aniq topshiriqlar

### 4.1. Onboarding — `P0/P1`

**Mavjud elementlarni saqlash:** o‘quvchi/o‘qituvchi roli, maqsadlar (IELTS, CEFR, milliy sertifikat, universitet, malakaviy ko‘nikma), fanlar, onlayn/oflayn, mustaqil/ustoz, viloyat/tuman, profil rasmi.

**O‘zgartirish:**

- [ ] Har qadamda progress indikatori (masalan, 2/4) va “Orqaga” mavjud.
- [ ] Minimal zarur ma’lumot birinchi kirishda; qo‘shimcha byudjet va qulay dars vaqti qidiruv paytida so‘raladi.
- [ ] Maqsad/fan o‘zgarsa mos bo‘lmagan tanlovlar xavfsiz tozalanadi.
- [ ] Saqlashda spinner, bir marta bosish himoyasi, muvaffaqiyatsiz so‘rovda qayta urinish.
- [ ] Boshlang‘ich demo yozuv real profil sifatida ko‘rinmasin.
- [ ] Email egaligini tasdiqlash va parol tiklash oqimlarini Supabase sozlamalari bilan mos tekshirish.
- [ ] Voyaga yetmaganlar uchun yoshga mos rozilik va maxfiylik jarayonlarini loyihalash; ortiqcha shaxsiy ma’lumot yig‘maslik.

**Qabul mezoni:** ilova yopilib ochilganda to‘liq ro‘yxatdan o‘tgan akkaunt onboardingga qaytmaydi; chala to‘ldirilgan forma nazoratli tiklanadi; foydalanuvchi ma’lumotlari faqat o‘z akkauntiga yoziladi.

### 4.2. Bosh sahifa — `P1`

**A. Yangi o‘quvchi (`active_groups = 0`):**

1. “Mening maqsadim” kartasi.
2. **Asosiy CTA:** “Maqsadimga mos ustoz topish”.
3. Mos ustozlar/guruhlar (haqiqiy katalogdan).
4. “Darslar qanday ishlaydi?” qisqa izohi.
5. Hozirgi arizalar va ularning holati (mavjud bo‘lsa).

**B. Faol o‘quvchi (`active_groups > 0`):**

1. Yaqinlashayotgan dars: sana, vaqt, guruh/ustoz, manzil yoki online havola (ruxsatga muvofiq).
2. Bugun bajariladigan ish: uy vazifasi yoki test.
3. “Darslarim” va guruh chatiga bir bosishda kirish.
4. Qisqa natija: o‘tilgan testlar, mavjud bo‘lsa o‘sish.
5. Davomat va to‘lov holati — kichik, alohida detallar ekranida kengayuvchi kartalar.

**UI qoidasi:** bosh sahifaga barcha funksiyalarni joylamaslik. Qidiruv, QR, barcha video darslar va to‘liq to‘lovlar tarixi o‘z bo‘limida bo‘lsin. Ma’lumot mavjud bo‘lmasa `0%` yoki soxta qiymat emas, “Hali o‘lchanmagan” chiqsin.

**Asosiy fayllar:** `src/screens/HomeScreen.tsx`, `src/components/BottomNavigation.tsx`, umumiy UI komponentlari.

### 4.3. Qidiruv va ustoz profili — `P0/P1`

- [ ] Onboarding maqsadi va fanini qidiruvga dastlabki filtr sifatida olib kelish.
- [ ] Fan, hudud, onlayn/oflayn, narx, bo‘sh vaqt, reyting, tekshirilgan ustoz filtrlari.
- [ ] Qidiruv bo‘sh bo‘lsa aniq alternativalar: filtrni tozalash, boshqa hudud, onlayn dars.
- [ ] Ustoz kartasida **fan, dars shakli, hudud, narx davri, verifikatsiya holati** ochiq ko‘rinsin.
- [ ] Haqiqiy bo‘sh vaqt va guruh sig‘imi mavjud bo‘lsa ko‘rsatiladi; tasdiqlanmagan ma’lumot `mavjud` deb berilmaydi.
- [ ] Bir xil arizani ikki marta yuborish bloklansin; ariza statusi `pending / approved / rejected / canceled` aniq ko‘rinsin.
- [ ] Tekshirilgan ustoz badge’i faqat moderator tasdig‘iga bog‘lansin, foydalanuvchi kiritgan matnga emas.
- [ ] Xarita real GPS masofa o‘lchamasa, taxminiy joylashuv ekani aniq yozilsin.

**Asosiy fayllar:** `src/screens/SearchScreen.tsx`, `src/screens/DiscoveryScreens.tsx`, tegishli backend/RPC va katalog holati.

### 4.4. Darslarim / guruh kabineti — `P0/P1`

Kirish nuqtasi: **Darslarim → Guruhim**.

**Guruh ichi:**

- **Jadval:** kelgusi/o‘tgan darslar va tegishli materiallar.
- **Vazifalar:** yangi/tugallangan/tekshiruvda/qayta ishlash kerak.
- **Materiallar:** PDF/rasm/video, yuklash holati va tegishli ruxsatlar.
- **Testlar:** boshlangan/topshirilgan, natija.
- **To‘lovlar:** ustoz tomonidan qayd etilgan holat, oy, summa, sana.
- **Aloqa:** guruh chati, ustozga shaxsiy murojaat.

**Qabul mezoni:** foydalanuvchi faqat a’zo bo‘lgan guruh ma’lumotlarini ko‘radi; hali bo‘sh guruh uchun tushunarli holat mavjud; jadval yoki to‘lovlar boshqa akkauntdan aralashmaydi.

**Asosiy fayl:** `src/screens/StudentWorkspaceScreens.tsx` va mavjud `ClassroomContext`/`studentWorkspace` oqimi.

### 4.5. Uy vazifalari tizimi — `P1`, asosiy yangi modul

**O‘qituvchi amallari:**

1. Guruh yoki aniq o‘quvchi uchun vazifa yaratish.
2. Sarlavha, tavsif, fan, muddat, ixtiyoriy fayl/rasm biriktirish.
3. Javoblarni ko‘rish, izoh/qayta topshirish talabi yuborish.
4. Holat va topshirganlar sonini ko‘rish.

**O‘quvchi amallari:**

1. Topshiriq haqida ilova ichida xabar oladi.
2. Vazifani va muddatni ko‘radi.
3. Matn va/yoki fayl bilan javob yuboradi.
4. `Topshirildi → Tekshiruvda → Qabul qilindi / Qayta ishlash` holatini kuzatadi.
5. O‘qituvchi fikrini o‘qib, ruxsat bo‘lsa qayta topshiradi.

**Tavsiya etiladigan ma’lumotlar modeli (avval mavjud sxema bilan solishtirilsin):**

- `assignments`: `id`, `offering_id`, `teacher_id`, `title`, `description`, `due_at`, `published_at`, `created_at`.
- `assignment_recipients` (individual manzilli topshiriq kerak bo‘lsa): `assignment_id`, `student_id`.
- `assignment_submissions`: `id`, `assignment_id`, `student_id`, `content`, `status`, `submitted_at`, `reviewed_at`.
- `assignment_feedback`: `id`, `submission_id`, `teacher_id`, `comment`, `created_at` (yoki versioned feedback maydonlari).
- Fayllar: Supabase Storage’da **private** bucket; yo‘llar vazifa/javob egasiga bog‘langan; imzolangan URL yoki vakolatli yuklab olish.

**Xavfsizlik:** RLS bilan ustoz faqat o‘z guruhi vazifalarini boshqaradi; talaba faqat o‘ziga tegishli vazifalarni o‘qiydi va o‘z javobini yangilaydi; oldingi ishlar tarixi imkon qadar saqlanadi. Biriktirilgan fayl turi, hajmi, virus/zararli kontent xatari va ruxsatlar tekshiriladi.

**Backend integratsiyasi:** mavjud `darsino_snapshot()` va `darsino_mutate(command)` sxemasining ish uslubini o‘rganib, yangi migratsiya va amallarni shu arxitektura bilan uyg‘unlashtirish; ishonchsiz klientdagi `teacher_id/student_id`ni mustaqil vakolat sifatida qabul qilmaslik.

**Qabul mezoni:** ustoz vazifani e’lon qiladi → o‘quvchi javob beradi → ustoz izoh qaytaradi → o‘quvchi qayta topshiradi; ikki boshqa akkaunt bir-birining fayli va natijasini ko‘rolmaydi.

### 4.6. “Bilimim” bo‘limi — `P1`

- [ ] Pastki navigatsiyada `Radar` o‘rniga `Bilimim` nomini sinovdan o‘tkazish (ichki ekran/route nomini birdan o‘zgartirish shart emas).
- [ ] Natijalar: fan, test sanasi, baholash usuli, ball/foiz; turli formatdagi testlarni noto‘g‘ri birlashtirmaslik.
- [ ] So‘nggi natijalar tarixi; o‘sish taqqoslanadigan testlarga asoslangan bo‘lsin.
- [ ] Natija yo‘q bo‘lsa “Birinchi testni ishlash” chaqirig‘i.
- [ ] Shaxsiy progress va ustozga ulashiladigan natija o‘rtasidagi farq aniq qolishi.
- [ ] Account-level Supabase sync + offline/cache strategiyasi.

**Qabul mezoni:** foydalanuvchi boshqa qurilmadan kirganda o‘z natijalarini ko‘radi; boshqa akkauntning progressi chiqmaydi; testni takror bosish bitta natijani ikki marta yaratmaydi.

---

## 5. Bildirishnomalar va aloqa

**Yagona bildirishnoma markazi:**

| Hodisa | Qabul qiluvchi | Kanal (MVP) |
|---|---|---|
| Guruhga taklif keldi | O‘quvchi | Ilova ichi |
| Ariza qabul qilindi/rad etildi | O‘quvchi | Ilova ichi |
| Yangi vazifa / izoh | O‘quvchi | Ilova ichi |
| Yangi javob topshirildi | Ustoz | Ilova ichi |
| Dars vaqti o‘zgardi | Guruh a’zolari | Ilova ichi |
| To‘lov eslatmasi | Tegishli o‘quvchi | Ilova ichi, mavjud cheklovlar bilan |

- [ ] Bildirishnomada yagona event ID orqali takroriy yozuvni oldini olish.
- [ ] Bosilganda tegishli ekran ochilsin (deep-link/navigation).
- [ ] O‘qilgan/o‘qilmagan holatini saqlash.
- [ ] Android/iOS push’ni real qurilmada tekshirgandan so‘ng alohida yoqish.
- [ ] O‘quvchi xabarlarni boshqara, kontaktni bloklay va shikoyat qila olishi.
- [ ] Voyaga yetmaganlarga shaxsiy aloqa va profil topilishi bo‘yicha xavfsiz standartlar; ommaviy telefon/email ko‘rsatmaslik.

---

## 6. Arxitektura va Supabase ishlari

### 6.1. Ma’lumotlar ishonchliligi

- [ ] Lokal (AsyncStorage) va Supabase ma’lumotlarining **aniq egasini** belgilash: doimiy manba server, qurilma cache.
- [ ] Test/natija/jadval/to‘lovlar uchun serverda yagona holat.
- [ ] Offline o‘qish va qayta ulanib sinxronlash siyosatini aniqlash.
- [ ] Collision va duplicate requestlar uchun idempotent kalitlar.
- [ ] Ma’lumotlar bazasiga zarur indekslar va pagination.
- [ ] Hisobdan chiqishda shaxsiy cache tozalanishi; boshqa akkauntga o‘tishda ma’lumot aralashmasligi.

### 6.2. Supabase xavfsizlik tekshiruvi

- [ ] Har bir yangi jadval va Storage bucket uchun RLS / private access.
- [ ] RPC’lar ichida `auth.uid()` va guruh a’zoligi/ustozlik tekshiruvi.
- [ ] Service role key klient paketiga tushmasin.
- [ ] Xavfli ma’lumotlar logga yozilmasin.
- [ ] Fayl URL va storage object path orqali ruxsatsiz yuklashning oldi olinsin.
- [ ] Ma’lumotlarni eksport qilish/o‘chirish jarayonlari va foydalanuvchi roziligi.
- [ ] Auth’ning email verification va password recovery konfiguratsiyasini live loyihada tekshirish.

### 6.3. Texnik joylashuv (mavjud kodni saqlagan holda)

| Qatlam | Rejalashtirilgan ish |
|---|---|
| `src/screens/HomeScreen.tsx` | Onboardingdan keyingi holatga mos bosh sahifa |
| `src/screens/SearchScreen.tsx` | Mos tavsiyalar va filtrlash |
| `src/screens/DiscoveryScreens.tsx` | Ustoz/guruh profili va ariza tajribasi |
| `src/screens/StudentWorkspaceScreens.tsx` | Guruh kabineti va vazifalar havolasi |
| `src/screens/LearningScreens.tsx` | Bilimim/radar taqdimoti |
| `src/screens/MockTestsScreens.tsx` | Test oqimi va xatolik holatlari |
| `src/navigation.ts` | Yangi `Assignments`, `AssignmentDetail`, `Submission` routelarini rejalashtirish |
| `src/components/BottomNavigation.tsx` | Soddalashtirilgan nomlar/IA |
| `src/services/*`, `src/state/*` | Data fetching, progress sync, notification va assignment state |
| `supabase/migrations/*` | Vazifalar, javoblar, feedback va RLS migratsiyalari |
| `tests/*` | Unit/integration/E2E va ruxsatlarni regressiya sinovi |

**Qoida:** mavjud SQL/RPC nomlarini va eski foydalanuvchi ma’lumotlarini ko‘r-ko‘rona qayta nomlamaslik; har bir migratsiya oldidan backup va rollback rejasini tayyorlash.

---

## 7. Bosqichma-bosqich bajarish tartibi

### Sprint 0 — Audit va stabilizatsiya (`P0`)

- [ ] Toza branch yaratish, mavjud testlarni qayta ishga tushirish.
- [ ] Onboarding, auth, marketplace va Supabase holatini real konfiguratsiyada tekshirish.
- [ ] Student journey bo‘yicha xato va UX friction ro‘yxatini tuzish.
- [ ] Joriy versiya uchun Android test-build olish.

**Chiqish sharti:** kritik xatolar ro‘yxati va qayta ishlab bo‘ladigan test ssenariylari tayyor.

### Sprint 1 — Ishonchli MVP (`P0`)

- [ ] Auth, profil, ruxsatlar va sessiya oqimi.
- [ ] Ustoz qidirish → ariza → tasdiq → darsning jadvalda ko‘rinishi.
- [ ] RLS va akkauntlararo ma’lumot izolyatsiyasi.
- [ ] Ilova ichidagi muhim bildirishnomalar.
- [ ] Real Android/iOS tekshiruvlari.

**Chiqish sharti:** yangi o‘quvchi demo ma’lumotlarsiz birinchi haqiqiy guruhiga qo‘shila oladi.

### Sprint 2 — O‘quvchi uchun qulay kabinet (`P1`)

- [ ] Faol/yangi foydalanuvchiga mos bosh sahifa.
- [ ] Ustoz kartasi va qidiruv UX’ini soddalashtirish.
- [ ] Darslarim ichida jadval, test, to‘lov va materiallarni tushunarli guruhlash.
- [ ] “Bilimim” bo‘limining nomi va natija tarixi.

**Chiqish sharti:** faol o‘quvchi birinchi ekranidan keyingi darsini va eng muhim vazifasini topa oladi.

### Sprint 3 — Uy vazifalari (`P1`)

- [ ] DB/RLS/Storage migratsiyalari.
- [ ] O‘qituvchi tomonidan vazifa yaratish va yuborish.
- [ ] O‘quvchi tomonidan matn/fayl bilan topshirish.
- [ ] Feedback, tekshirish, qayta topshirish.
- [ ] Notification, test va permission audit.

**Chiqish sharti:** teacher→student→teacher jarayoni real akkauntlarda to‘liq yakunlanadi.

### Sprint 4 — Natija va chiqarish tayyorgarligi (`P0/P1`)

- [ ] Progressni Supabase bilan sync qilish.
- [ ] Empty/loading/error/offline holatlari.
- [ ] Accessibility, 320 px / 390 px, Android va iOS QA.
- [ ] Analitika va xatolik monitoringi (maxfiylikka rioya qilgan holda).
- [ ] Rollback tartibi, release checklist va pilot sinov.

**Chiqish sharti:** funksiyalar ishonchli, ma’lumotlar saqlanadi va kichik real pilot guruh bilan foydalanish mumkin.

### Sprint 5 — Faqat pilotdan keyin (`P2`)

- [ ] Individual mashq tavsiyasi va AI mentor prototipi.
- [ ] Maqsadga mos yangi ustoz/guruh tavsiyalari.
- [ ] O‘quvchi va o‘qituvchi uchun kengaytirilgan progress ko‘rsatkichlari.
- [ ] Monetizatsiya/referral gipotezalarini sinash.

**Shart:** asosiy foydalanuvchi oqimi, retention va xavfsizlik metrikalari tasdiqlangandan keyin.

---

## 8. Majburiy QA test ssenariylari

- [ ] Yangi akkaunt → maqsad → qidiruv → ariza → ustoz tasdig‘i → jadval.
- [ ] Bir arizani ikki marta yuborish / internet uzilganda qayta urinish.
- [ ] Rad etilgan yoki bekor qilingan ariza jadvalga kiritilmaydi.
- [ ] Ustoz tomonidan yuborilgan vazifani faqat tegishli guruh/o‘quvchi ko‘radi.
- [ ] O‘quvchi fayl topshiradi → ustoz tekshiradi → izoh qaytadi.
- [ ] Begona foydalanuvchi URL/RPC orqali boshqa o‘quvchining faylini ocholmaydi.
- [ ] Test natijalari ilova qayta ochilganda va boshqa qurilmada to‘g‘ri chiqadi.
- [ ] Hisobdan chiqish va boshqa akkauntga kirishda cache aralashmaydi.
- [ ] QR/kamera va push notification haqiqiy qurilmalarda tekshiriladi.
- [ ] 320 px / 390 px, yirik shrift, ekranni o‘qib berish vositalari va klaviatura.
- [ ] Kuchsiz internet, timeout, offline va qayta tiklanish.
- [ ] O‘quvchi chat/kontakt so‘rovidan voz kecha oladi, bloklash ishlaydi.
- [ ] O‘quvchi ustoz yozgan to‘lov qaydini bank to‘lov tasdig‘i deb qabul qilmaydi.

**Tavsiya etilgan avtomatik tekshiruvlar:** `npm run typecheck`, `npm test`, `npm run format:check`, `npm run supabase:check` (skriptlar mavjudligini `package.json`da tasdiqlash), mavjud Playwright E2E, zarur bo‘lsa Expo Web/Android/iOS bundle eksporti.

---

## 9. O‘lchanadigan mahsulot natijalari (KPI)

Bular dastlabki **maqsadli ko‘rsatkichlar**, joriy real natijalar emas. Pilotdan keyin qayta belgilanadi.

| Metrika | Ta’rif | Pilot uchun dastlabki maqsad |
|---|---|---|
| Activation | Profilni yakunlab, kamida bitta ustoz/guruhni mazmunli ko‘rganlar | ≥ 60% |
| First application | Ro‘yxatdan o‘tib 7 kun ichida ariza yuborganlar | ≥ 25% |
| Application response | Ustoz tomonidan 48 soatda javob berilgan arizalar | ≥ 80% |
| First lesson | Qabuldan so‘ng ilk darsda qatnashganlar | ≥ 60% |
| Homework completion | Muddatida topshirilgan vazifalar / berilgan vazifalar | ≥ 65% |
| D7 retention | Birinchi kundan 7 kun keyin qaytgan faol foydalanuvchilar | ≥ 25% |
| Critical incidents | Boshqa akkaunt ma’lumotiga ruxsatsiz kirish | 0 |

**Muhim:** past retentionni bildirishnoma sonini ko‘paytirish bilan emas, foydalanuvchiga haqiqiy ta’lim qiymati berish bilan tuzatish kerak.

---

## 10. Hozircha qilmaslik kerak bo‘lgan ishlar

- To‘liq AI repetitor, o‘z AI modelini o‘qitish, murakkab adaptiv Learning OS.
- Marketplace va dars jarayoni barqarorlashmasdan yangi katta modullarni boshlash.
- Reyting yoki progressni sun’iy hisoblash; soxta sharh va ko‘rish sonini chiqarish.
- Haqiqiy to‘lov gateway’i ulanmasdan kartadan to‘lov amalga oshgandek ko‘rsatish.
- Maktab o‘quvchilari uchun ommaviy telefon/email yoki ochiq profil katalogini yoqish.
- Bosh sahifani barcha mavjud modullar bilan ortiqcha to‘ldirish.
- Kod ishlashi va server migratsiyasi sinovdan o‘tmasdan `main`ga merge qilish.

---

## 11. Ishni boshlash uchun tayyor topshiriq (coding agent / developer brief)

> **Topshiriq:** `sardororolov2233-afk/Darsino` reposidagi O‘qi o‘quvchi tajribasini ushbu roadmap bo‘yicha yaxshila. Avval mavjud kod, `docs/*`, `src/state/*`, RPC va Supabase migratsiyalarini tahlil qilib, allaqachon ishlayotgan funksiyalarni qayta yozib yuborma. Birinchi navbatda `P0` oqimini real ma’lumotlar bilan barqarorlashtir: ro‘yxatdan o‘tish → mos ustoz → ariza → tasdiq → guruh → jadval. Keyin ikki holatli bosh sahifa va o‘quvchi kabinetini tartibga keltir. Shundan keyingina uy vazifalari uchun backend + RLS + Storage + React Native ekranlarini yangi branchda amalga oshir. Barcha o‘zgarishlar uchun testlar va migratsiya/rollback yo‘riqnomasi bo‘lsin. Har bir vazifa uchun o‘zgargan fayllar, tekshiruv natijalari va qolgan cheklovlarni ko‘rsat. **Real ma’lumotni yo‘qotma; `main`ga avtomatik merge qilma.**

---

## 12. Yakuniy MVP mezoni

Quyidagi jumla haqiqiy foydalanuvchi bilan sinovda rost bo‘lganda, o‘quvchi qismi dastlabki mahsulot sifatida tayyor hisoblanadi:

> **“Men O‘qiga kirdim, o‘zimga mos ustozni topdim, guruhga yozildim, jadvalimni ko‘rdim, darsda qatnashdim, vazifamni topshirdim va o‘z natijamni kuzata oldim.”**

**Keyingi qaror:** avval Sprint 0 va Sprint 1 bajariladi; dastlabki pilot natijalariga qarab qolgan vazifalar qayta saralanadi.
