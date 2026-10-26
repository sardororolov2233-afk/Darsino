# O‘qi — birinchi kirish

2026-10-25: kirish email/parol oqimiga yangilanadi; email kodi talab qilinmaydi. 2026-10-16 dizayni — to‘q ko‘k fon, yumaloq kartalar va ko‘k tanlov holati — saqlanadi. Brend O‘qi bo‘lib qoladi.

## O‘quvchi oqimi

1. **O‘qi kim uchun?** — O‘quvchi yoki O‘qituvchi. Kartani bosish akkaunt oynasini ochadi.
2. **Akkaunt** — yangi foydalanuvchi email, kamida 8 belgili parol va parolni takrorlash bilan ro‘yxatdan o‘tadi. Mavjud foydalanuvchi email/parol bilan kiradi. Email kodi va tasdiqlash xati so‘ralmaydi; server avtomatik tasdiqlash bilan sessiya beradi. Mavjud akkaunt o‘z roli bilan qaytadi; onboarding tugallangan bo‘lsa qayta so‘ralmaydi. Ixtiyoriy OAuth asosiy email/parol oqimidan alohida.
3. **Maqsadingiz nima?** — ikki ustunda IELTS olish, CEFR olish, Milliy sertifikat, Universitetga kirish, Malakaviy ko‘nikmaga ega bo‘lish. Oxirgi karta to‘liq enni egallaydi. Bitta asosiy maqsad tanlanadi. Milliy sertifikat / universitet / malakaviy yo‘nalishda bir yoki bir nechta fan tanlanadi. IELTS / CEFR uchun Ingliz tili belgilanadi.
4. **Qanday tayyorlanasiz?** — Oflayn yoki Onlayn; Mustaqil yoki Ustoz bilan; viloyat, keyin tegishli tuman/shahar. Viloyat o‘zgarsa tuman tozalanadi. Ro‘yxat ichida qidirish bor.
5. **Siz bilan tanishamiz** — alohida ism va familiya, ixtiyoriy rasm, tanlovlar xulosasi va **Saqlash**. Rasm tanlansa avval yuklanadi, keyin profil yakunlanadi. Xatoda foydalanuvchi shu bosqichda qoladi; bosh sahifa faqat profil muvaffaqiyatli saqlanganda ochiladi.

O‘qituvchi uchun shu dizayn saqlanadi: tayyorlaydigan maqsadi va dars beradigan fanlari, dars shakli/hudud, qo‘shimcha malaka bosqichi, oxirida ism/familiya/rasm. Avvalgi tekshiruv talablari saqlanadi: yangi ustoz kabinetga kiradi, ammo moderator tasdiqlamaguncha dars e’lon qila olmaydi.

## Saqlash va backend

- Tugallanmagan matnli tanlovlar `@oqi/onboarding-v1/<user-id>/<role>` kaliti bilan shu qurilmada saqlanadi. Tanlangan, hali yuklanmagan rasm xotirada turadi; ilova qayta ochilsa uni qayta tanlash kerak.
- `studyMode` va `studySupport` profilga qo‘shildi. Demo rejimda mavjud akkaunt keshida, Supabase rejimda `darsino_profiles.study_mode/study_support` ustunlarida saqlanadi. Bu ikki qiymat boshqa foydalanuvchining snapshot’iga chiqarilmaydi.
- Live bazaga `supabase/migrations/202610160003_onboarding_preferences.sql` yoki yangilangan `supabase/Darsino_Supabase_setup.sql` qo‘llanishi kerak. Migratsiya eski akkauntlarni qaytadan onboarding qilishga majburlamaydi; eski profil tahrirlari yangi tanlovlarni o‘chirmaydi.
- Hududlar ilova ichidagi katalogdan olinadi: [MIMAXUZ/uzbekistan-regions-data](https://github.com/MIMAXUZ/uzbekistan-regions-data), 2026-10-16 kuni olingan nusxa. Umumiy toifa qatori olib tashlandi, apostrof/imlo tuzatildi; Bo‘ston nomi [hokimlik sahifasi](https://gov.uz/oz/buston) bilan tekshirildi. Hudud ma’lumotlari uchun avtomatik yangilanish xizmati yo‘q.

## Bosh sahifa

Kunlik topshiriq / XP / streak bloki o‘rnida **Mening maqsadim** kartasi turadi: maqsad nomi, fanlar, tayyorgarlik usuli, hudud va mos dars/ustozga o‘tish tugmasi. Bilim radari alohida bo‘lim sifatida qolgan; o‘zgarish XP hisoblash mexanizmini o‘chirmaydi.

## 2026-10-16 tekshiruvlari tarixi

- 66 ta Node/Postgres testi: yangi tanlov validatsiyasi, saqlash, ruxsatlar, eski tahrirlarda qiymatni saqlash va qayta SQL o‘rnatish.
- 4 ta eksport qilingan bundle UI testi: o‘quvchi arizasi/tasdiqlash, Google/Apple rol tanlovi, avatar, yangi ustoz moderatsiyasi.
- Chromium 320 px: rol → akkaunt → maqsad → fanlar → usul → viloyat/tuman → rasm/ism/familiya → Saqlash → maqsad kartasi. Bo‘sh tanlovlar, maqsad o‘zgartirish, viloyat o‘zgartirish, qoralama va yakuniy profilni qayta yuklash tekshirildi.
- Live Supabase / OAuth / native rasm pickeri real qurilmada ushbu ish doirasida sinovdan o‘tkazilmagan. Demo login real email yubormaydi.

Ko‘rinishlar: [rol](screenshots/onboarding-role-320.png), [akkaunt](screenshots/onboarding-account-320.png), [maqsadlar](screenshots/onboarding-goals-320.png), [tayyorgarlik](screenshots/onboarding-preferences-320.png), [profil](screenshots/onboarding-profile-320.png), [bosh sahifa](screenshots/onboarding-home-320.png).

Bu eski rasmlar va test sanog‘i yangi parolli kirish tekshiruvi o‘rnini bosmaydi. Joriy natijalar [tekshiruv](verification.md) va [jonli hisobotda](supabase-live-verification.md) qayd etiladi.
