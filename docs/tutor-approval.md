# O‘qituvchi arizasi va admin tasdig‘i

O‘qituvchi ro‘yxatdan o‘tayotganda aloqa telefoni va sertifikat majburiy. PDF, JPG/JPEG, PNG yoki WebP qabul qilinadi; Supabase private Storage’da hajm 10 MB gacha. `90 123 45 67`, `998901234567` va `+998901234567` kiritmalari `+998901234567` shakliga keltiriladi. Telefon aloqa uchun saqlanadi, SMS kodi orqali tasdiqlangani da’vo qilinmaydi. Sertifikat izohi ixtiyoriy; fayl o‘rniga matn yoki havola yuborib bo‘lmaydi.

## Oqim

1. Email/parol yoki mavjud social kirishdan keyingi o‘qituvchi onboarding’ida telefon, sertifikat va pedagogik ma’lumotlar to‘ldiriladi. Faylni yuklashning o‘zi ariza yaratmaydi. Upload/finalize xatosida qayta urinish mumkin; fayl tayyor bo‘lmaguncha yakuniy ariza serverda qabul qilinmaydi.
2. Yakuniy saqlash bitta tranzaksiyada profilni, private ariza ma’lumotini, sertifikat hujjatini va admin bildirishnomasini yaratadi. Status `pending`; o‘qituvchi “Admin tasdig‘i kutilmoqda” sahifasini ko‘radi. Unda holatni yangilash, hujjatni ko‘rish, ma’lumotlarni tuzatish, sozlamalar va chiqish bor. Ustoz kabineti va yangi guruh ochish imkoniyati berilmaydi.
3. Mavjud `moderator` roli ilovadagi admin hisoblanadi. Admin **Tekshiruv** navbatidan arizani ochadi: telefon, tajriba, fanlar, sertifikat fayli va avvalgi hujjat holatlari ko‘rinadi. PDF/rasm mavjud private fayl ko‘ruvchisi orqali ochiladi.
4. Admin tasdiqlasa profil va kutilayotgan hujjatlar `approved` bo‘ladi, o‘qituvchiga bildirishnoma keladi. Keyingi snapshot/yangilashda ustoz kabineti ochiladi. Serverdagi guruh, test, e’lon, material va qabul amallari ham tasdiqlangan ustoz talabini saqlaydi.
5. Admin rad etishda sabab yozadi. O‘qituvchi sababni ko‘radi, arizani tuzatib qayta yuboradi. Qayta yuborilgan profil `pending` bo‘ladi. Tasdiqlangan profilni qayta tekshiruvga yuborish ham vaqtincha faoliyatni yopadi.

Brauzer sinovidan: [sertifikat yuklash](screenshots/tutor-certificate-upload-320.png), [admin tasdig‘ini kutish](screenshots/tutor-pending-review-320.png), [admin tekshiruvi](screenshots/tutor-admin-review-320.png).

## Maxfiylik va migratsiya

`202610260002_tutor_applications.sql` qo‘shimcha migratsiya: `oqi_tutor_applications` jadvali telefon va joriy sertifikat ID’sini alohida saqlaydi. Unda RLS yoqilgan; klientning to‘g‘ridan-to‘g‘ri SELECT/yozish huquqlari yo‘q. Snapshot bu ma’lumotlarni faqat profil egasi yoki adminga qo‘shadi. Public tutor JSON’iga telefon va sertifikat ID’si yozilmaydi. Private sertifikat fayliga ham egasi va admin kiradi.

Yakunlangan buyruqning ayni idempotency key bilan qayta kelishi avvalgi receipt’ni qaytaradi: ko‘rib chiqilgan profilni yana `pending` qilmaydi, admin xabarini takrorlamaydi. Eski ichki snapshot/mutation/document yordamchilari klientga yopiq. Sertifikat holati, egasi, maqsadi va MIME turi serverda tekshiriladi. Mavjud tasdiqlangan profillar migratsiya sababli bekor qilinmaydi; yangi ariza yoki qayta yuborishda yangi talablar majburiy. Eski hujjatsiz kutilayotgan arizani admin tasdiqlay olmaydi, avval o‘qituvchi uni to‘ldiradi.

## Tekshirish

`tests/tutorApplication.test.ts` telefon normalizatsiyasi, majburiy maydonlar, rollback, egaga tegishli tayyor fayl, admin huquqi, maxfiylik, idempotent retry, rad etish va qayta yuborishni tekshiradi. `tests/tutorApplication.spec.ts` 320 px brauzerda haqiqiy fayl picker’i bilan signup → PDF upload → kutish → admin ko‘rishi → rad etish → tuzatish → tasdiqlash → faol kabinet oqimini bajaradi. Mavjud onboarding, fayl RLS va kvota testlari ham yangi talablar bilan ishlaydi.

Demo rejimida sertifikat shu qurilma/brauzerda saqlanadi (1 MB gacha); bu serverga haqiqiy upload emas. Jonli rejimdagi limit 10 MB. Android/iOS physical device va jonli OAuth/Storage HTTP tekshiruvlari lokal SQL/demo brauzer testidan alohida.

Ilgari o‘rnatilgan APK yangilanmaydi; [build yo‘riqnomasi](build.md) bo‘yicha `main`dan yangi APK yig‘iladi.
