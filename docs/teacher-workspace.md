# Ustoz paneli — 2026-10-26

[Dizayn manbalari](designs/stitch/README.md) — uchta Stitch ekranining HTML kodi va original PNG rasmlari. Ekranlar React Native’da qayta yaratilgan, ma’lumotlar mavjud marketplace va yangi Supabase classroom xizmatidan olinadi.

## Foydalanish

1. Tasdiqlangan ustoz hisobida **Boshqaruv** ochiladi. “Davomat” bugungi qatnashganlar / kutilgan qatnashuvlarni, “Qarzdorlar” tanlangan oydagi noyob qarzdorlar va umumiy summani ko‘rsatadi. Bir o‘quvchi ikki guruhdan qarzdor bo‘lsa bitta odam, ikkala guruhning summasi hisoblanadi. Kartalar batafsil sahifani ochadi.
2. **Yangi guruh**: dastlab nom, fan, sig‘im, narx va manzil kiritiladi. Keyingi bosqichda hafta kunlari, har kunning boshlanish soati, birinchi sana, darslar soni va davomiyligi tanlanadi. Jadval Toshkent vaqtida oldindan ko‘rsatiladi; yakuniy tasdiqlash barcha darslarni bir amalda yaratadi. “Dars jadvali” kartasi oldingi/keyingi kun va davomatga o‘tish tugmalariga ega.
3. **Test yuklash**: PDF/DOCX (20 MB gacha), qo‘lda savollar yoki mavjud O‘qi diagnostika bazasi. Test guruhi, fan, vaqt, savollar soni va javob kaliti belgilanadi. Qoralama saqlanadi, tahrirlanadi va e’lon qilinadi. Yangi test uchun “Yangi test yaratish” tugmasi bor. Yuklangan fayl savollari avtomatik tahlil qilinmaydi: kalitni ustoz belgilaydi.
4. O‘quvchi e’lon qilingan testni **Dars & Klub → Jadval** orqali ochadi. Birinchi boshlash vaqti serverda saqlanadi; sahifani qayta ochish vaqtni yangilamaydi. Javoblar qurilmada vaqtincha saqlanadi. Yakunlashda server natijani hisoblaydi. Ishlash boshlangan testni ustoz o‘zgartira olmaydi.
5. **O‘quvchilar**: haqiqiy test natijalaridan umumiy o‘zlashtirish, darajalar, 60% dan past natijalar filtri, guruh va ism bo‘yicha qidiruv. Natijasi yo‘q o‘quvchi “hali o‘lchanmagan” deb ko‘rsatiladi. Profil, test yuborish, shaxsiy chat va hisobot eksporti ishlaydi. Web’da CSV fayl, Android/iOS’da hisobot matni tizimning ulashish oynasiga beriladi.
6. **Guruh chat**: faol guruhlar, a’zolar soni, oxirgi xabar, o‘qilmaganlar, qidiruv va shaxsiy suhbatlar. “Shoshilinch xabar” tanlangan o‘z guruhlariga e’lon jo‘natadi; eng so‘nggi e’lon suhbat tepasida turadi. Guruhda matn, shaxsiy chatda mavjud PDF/rasm biriktirish ishlaydi. Ota-ona roli, SMS va avtomatik AI fayl tahlili ulanmagan.

O‘quv xonalari va klublar Boshqaruvdagi tezkor tugmalar orqali ochiladi. Ularning mavjud imkoniyatlari saqlangan.

## Ekranlar

Brauzerdagi demo oqimidan olingan [guruh chat](screenshots/teacher-group-chat.png) va [o‘quvchi natijasi](screenshots/teacher-student-detail.png). Bular yangi ilovaning ekranlari; [Stitch PNG rasmlari](designs/stitch/README.md) alohida saqlangan.

## Backend va tekshirish

`202610260001_teacher_workspace.sql` yangi migratsiyasi `mhqofwuawwnappstcekh` loyihasiga qo‘llandi. To‘rtta yangi jadvalda RLS bor; guruh xabarlari Realtime publication’iga ulangan. Anon RPC chaqiruvlari va ichki JSON yordamchilari yopiq. Mavjud bitta profil va nol guruh o‘zgarmagan; testlar jonli o‘quvchilar yoki test yozuvlarini yaratmagan.

`tests/classroom.test.ts` rejalashtirish, qarzdorlar, ko‘rsatkichlar va demo maxfiyligini; `tests/classroomDatabase.test.ts` haqiqiy SQL a’zolik nazorati, javob kalitlari, natija, vaqt, qayta yuborish va fayl nashrini tekshiradi. `tests/classroom.spec.ts` 320 px’dagi guruh yaratish va ustoz → o‘quvchi → ustoz test/chat oqimini brauzerda tekshiradi. Bu fizik Android/iOS qurilmasida bajarilgan sinov emas.

Mavjud APK ushbu o‘zgarishlarni o‘zidan-o‘zi olmaydi. [Build yo‘riqnomasi](build.md) bo‘yicha `main` kodidan yangi APK yig‘iladi:

```bash
git pull origin main
npx --yes eas-cli@latest build --platform android --profile preview --clear-cache
```
