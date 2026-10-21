# Profil, sozlamalar va kontaktlar

Profil ixcham karta, ID/QR, haqiqiy ko‘rsatkichlar va menyudan iborat. Sozlamalar alohida oynalarda.

## Sozlamalar

- Interfeys tili: o‘zbekcha (uz), ruscha (ru), inglizcha (en), qozoqcha (kk), qirg‘izcha (ky). Saqlangan domen qiymatlari, foydalanuvchi xabarlari, ism va dars materiallari tarjima qilinmaydi.
- Maxfiylik: ID orqali topilish, profil hududi, rasm ko‘rinishi, xabar va taklif ruxsatlari. Email/telefon faqat egasiga qaytadi. E’lonning dars manzili profil hududidan alohida.
- Bloklash: ikki tomonda yangi xabarlar va takliflar serverda to‘xtatiladi; kontakt o‘chadi, kutilayotgan takliflar bekor qilinadi. Eski dars/to‘lov tarixi saqlanadi.
- Xavfsizlik: Supabase TOTP MFA, kirishda AAL2 talabi, Auth sessiyalari va boshqa sessiyalardan chiqish. MFA QR/kaliti faqat sozlash paytida xotirada turadi. Tiklash uchun support mavjud; MFA chetlab o‘tilmaydi.
- Bildirishnomalar: foydalanuvchi yoqqan mahalliy dars eslatmalarini boshqarish. SMS va masofaviy push provayderi kiritilmagan.
- Ma’lumotlar: akkauntga tegishli yozuvlar eksporti va qidiruv tarixini tozalash.
- Yordam: https://t.me/sardorbekuralov. Ilova o‘zidan avtomatik xabar yubormaydi.

## ID va QR

Har bir akkauntda noyob 5–24 belgili ochiq ID bor. QR faqat darsino://connect/ID havolasini kodlaydi; autentifikatsiya kaliti yoki shaxsiy ma’lumot saqlamaydi. O‘qi skaneri yoki ID maydoni profilni aniq ID bo‘yicha topadi. Kameraga ruxsat faqat skaner ochilib tugma bosilganda so‘raladi, mikrofon yoqilmaydi. QR ko‘rish kontakt yoki a’zolik yaratmaydi.

Kontakt so‘rovi qabul qilinishi kerak. Qarama-qarshi rol bilan dars suhbati saqlanadi; kontaktlar o‘zaro tasdiqlangach bir xil rollar ham yozisha oladi. Tasdiqlanmagan repetitor yozisha olmaydi. Server xabar ruxsatlarini har safar tekshiradi.

## Guruh takliflari

Tasdiqlangan ustoz o‘z kontaktlari yoki mavjud faol o‘quvchilarini o‘z guruhiga taklif qiladi. Taklif yuqori banner va Takliflar oynasida ustoz, guruh va narx bilan ko‘rinadi. Faqat qabul qiluvchi qabul/rad qiladi. Taklif 7 kun amal qiladi; joy band qilmaydi. Qabul qilishda guruh lock qilinib sig‘im, ustoz holati, kelgusi dars va bloklash qayta tekshiriladi. Takroriy qabul a’zolikni takrorlamaydi. Bekor qilingan/qabul qilingan taklif chiqarilgan o‘quvchini qaytadan qo‘shmaydi.

Lookup, kontakt so‘rovlari, taklif, xabar va shikoyatlar uchun server limitlari bor. Maxfiy jadvallarga bevosita yozish huquqi berilmaydi. Realtime faqat qatnashchi doirasida o‘qiladi.

## Sinxronlash va tuzatishlar

Jonli rejimda shaxsiy test progressi va xona rejalari ham akkaunt bo‘yicha serverga saqlanadi. Eski qurilma yozuvlari serverda yozuv bo‘lmasa ko‘chiriladi; revision tekshiruvi parallel qurilmadagi yozuvni indamay bosib ketishdan saqlaydi. Yangilanishda o‘zgarish eng so‘nggi nusxaga qo‘llanadi; takroriy konflikt foydalanuvchiga xato bilan qaytadi. Sinov rejimi lokal qoladi.

Qayta qabulda demo a’zoligi qayta ishlatiladi va eski takroriy a’zoliklar oylik hisobotda bittaga keltiriladi. Oldingi oyning saqlangan to‘lovini qayta qabuldan keyin ham tuzatish mumkin.

## O‘rnatish

Avvalgi migratsiyalari mavjud Supabase loyihasiga migrations/202610200002_account_connections.sql ni qo‘llang. To‘lov migratsiyasi ham bo‘lishi shart. Yangi loyiha uchun Darsino_Supabase_setup.sql qayta generatsiya qilingan.

MFA uchun Supabase Auth TOTP yoqilgan bo‘lishi kerak. Native QR skaneri uchun expo-camera qo‘shilgan: Android/iOS ilovasini qayta build qilish zarur. Kamera kerak bo‘lmasa ID bilan ishlash mumkin.

GitHub Actions typecheck, unit/PostgreSQL, eksport UI, brauzer va platform eksportlarini tekshiradi. Haqiqiy Supabase, MFA provayderi, boshqa fizik qurilma va kamera tekshiruvi alohida bajariladi.

## Tekshiruv natijasi — 2026-10-20

79 ta avtomatik/PostgreSQL testi, 4 ta eksport qilingan UI testi va 16 ta brauzer ssenariysi o‘tdi. TypeScript, Prettier, SQL bundle mosligi hamda web/Android/iOS eksportlari o‘tdi. Android manifestida kamera bor, mikrofon ruxsati bloklangan. Brauzer testlari 320 px ko‘rinish, besh til, kontakt roziligi va taklif bannerini qamraydi.

GitHub Actions workflow qo‘shildi, ammo ulangan hisobda ishchi jarayon tayinlanmadi va job qadamlar boshlanmasdan tugadi. Yuqoridagi tekshiruvlar alohida vaqtinchalik Vercel Sandbox muhitida bajarildi. Haqiqiy Supabase Auth/TOTP, fizika kamera qurilmasi va jonli loyiha migratsiyasi bu tekshiruvga kirmaydi.
