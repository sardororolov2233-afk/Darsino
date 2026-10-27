# O‘qi: yagona interfeys, o‘quvchi kabineti va QR kontaktlar

2026-10-27, Asia/Tashkent. Figma vositalari ushbu sessiyada mavjud bo‘lmagani sababli mavjud Stitch manbalari va foydalanuvchi yuborgan ekran asosida React Native interfeysi yangilandi. Figma fayli yoki loyiha linki yaratilgani da’vo qilinmaydi.

## Dizayn

Asosiy amal rangi `#4430ED`, matn va katta umumlashtiruvchi kartalar to‘q ko‘k, fon och kulrang, ijobiy holatlar yashil. Manrope shriftlari saqlandi; sarlavha 24/32, asosiy matn 15/24. Umumiy kartalar, forma maydonlari, tugmalar, sarlavhalar va pastki navigatsiya bitta uslubga keltirildi. Oq sarlavhalarda QR, chat va bildirishnomalar ochiladi. Ustozning test yuborish amali saqlangan.

AI yordamchi boshqaruvi o‘quvchi sarlavhasida. Suzuvchi tugma standart holatda yopiq, shuning uchun kartalar va “Barchasi” tugmalarini to‘smaydi. AI oynasidagi ko‘chirish belgisi orqali uni yoqish/o‘chirish mumkin; oldingi surish, joylashuvni saqlash va klaviaturadan ochish imkoniyatlari bor.

Guruh yaratish va dars vaqtini o‘zgartirishda kalendar hamda soat/daqiqa tanlagichi bor. Qo‘lda sana/vaqt kiritish ham saqlangan. Hisobot, kalendar va soat oynalari kichik ekranlar uchun tekshiriladi.

Yangilangan ekranlar: [o‘quvchi 390 px](screenshots/workspace-student-390.png), [o‘quvchi 320 px](screenshots/workspace-student-320.png), [ustoz boshqaruvi](screenshots/workspace-teacher-390.png), [moliya](screenshots/workspace-finance-390.png). Rasmlar izolyatsiyalangan demo yozuvlari bilan olingan.

## O‘qituvchi kategoriyalari

| Tugma                      | Ochiladigan bo‘lim                                                                                     |
| -------------------------- | ------------------------------------------------------------------------------------------------------ |
| Davomat                    | O‘z guruhlari bo‘yicha darslar va davomat                                                              |
| Oylik to‘lovlar            | **Daromad va to‘lovlar**: oy, guruh, olingan daromad, qarz, so‘nggi 4 oy va o‘quvchilar to‘lov daftari |
| Qarzdorlar                 | Tanlangan oyda noyob qarzdor o‘quvchilar va guruhlar bo‘yicha summalar                                 |
| Yangi arizalar             | Guruhga kirish arizalari                                                                               |
| Barcha guruhlar            | Guruh boshqaruvi                                                                                       |
| O‘quv xonalari / Klublarim | Mavjud xonalar va klub boshqaruvi                                                                      |
| Test yuklash / Guruh chat  | Haqiqiy guruh testlari va suhbatlar                                                                    |

Moliyaviy sahifada to‘lovni qayd etish, tasdiqlab bekor qilish, eslatma, oy/guruh/status/qidiruv filtrlari va CSV eksport bor. CSV formulaga o‘xshash foydalanuvchi kiritmalarini xavfsiz matn sifatida saqlaydi. Bu ustozning hisob daftari; karta orqali pul yechish yoki payment gateway ulanmagan.

## O‘quvchi kabineti

Bosh sahifa haqiqiy faol a’zolik, kutilayotgan mock testlar, davomat va joriy oy qarzini ko‘rsatadi. O‘quvchi o‘z guruhini ochib jadval, ustoz materiallari, testlar, to‘lov holati va guruh chatiga o‘tadi. Ustoz yuborgan shaxsiy diagnostika topshiriqlari ham saqlangan.

Radar endi “tez kunda” oynasi emas: mustaqil diagnostika va guruh mock testlari natijalari, o‘rtacha foiz, o‘lchangan ko‘nikmalar va tarixni ko‘rsatadi. Natija yo‘q bo‘lsa “hali o‘lchanmagan” holati turadi. Mustaqil natija ustozga avtomatik ulashilmaydi; avvalgi rozilik bilan yuborish oqimi saqlanadi.

Ochiq video kartalari tanlangan darsni, “Barchasi” esa video kutubxonasini ochadi. Namuna ko‘rishlar va “jonli efir” sonlari bosh sahifadan olib tashlangan; ochiq manba darslari aniq belgilangan. Hudud tugmasi foydalanuvchining hududini qo‘llaydi.

## WeChat usulidagi QR

1. Bir foydalanuvchi **Profil → ID va QR** orqali o‘z kodini ko‘rsatadi.
2. Ikkinchisi sarlavhadagi QR skaneri yoki **Kontaktlar → QR skanerlash**ni ochadi. Kamera yoki galereyadagi QR rasmi ishlaydi.
3. Koddan faqat `darsino://connect/PUBLIC_ID` olinadi. Ilova profilni haqiqiy `darsino_find_account` RPC orqali, ayni akkaunt sessiyasi bilan qidiradi.
4. Kontakt taklifi yuboriladi. Ikkinchi foydalanuvchi qabul qilgach ikki tomon bir-birini kontaktlarda ko‘radi; chat va ustozning guruhga taklifi mavjud qoidalar bilan ishlaydi.

O‘z QR kodi, boshqa ilova kodi, noto‘g‘ri kod, kamera ruxsati va kamera xatosi uchun tushunarli holatlar bor. Kamera sahifa fokusdan chiqqanda yoki ilova fon rejimiga o‘tganda to‘xtaydi. Tasvir serverga yuborilmaydi. ID orqali topish yopilgan akkaunt yoki bloklangan aloqa maxfiylik qoidalarini saqlaydi.

Web’da brauzerning QR API’si bo‘lmasa ZXing WASM ishlaydi. `scripts/prepare-qr-scanner.mjs` install/export vaqtida locked dependency’dan dekoder va litsenziyani `public/qr/`ga ko‘chiradi. WASM shu ilovaning o‘z manzilidan yuklanadi; CDN va tashqi tarmoq zarur emas. Android/iOS’da Expo Camera’ning qurilmadagi dekoderi ishlaydi. Kamera ruxsatisiz galereya orqali skanerlash mumkin.

## Tekshirish va amaliy chegaralar

- `tests/workspacePolish.test.ts`: moliya hisoblari, tarix, CSV, o‘quvchi ko‘rsatkichlari va QR payload chegaralari.
- `tests/workspacePolish.spec.ts`: moliyaga to‘g‘ri o‘tish, ustoz qayd etgan to‘lovning o‘quvchida ko‘rinishi, o‘quvchi guruhidagi amallar, kalendar/soat va kichik ekranlar.
- `tests/qrCamera.spec.ts`: haqiqiy QR matritsasidan Y4M kamera kadrlari tayyorlanib Chromium’ning video kirishiga beriladi. Ikkala rol bir-birini topadi, taklif yuboriladi va qabul qilinadi. Ilovaning o‘z SVG QR kodidan olingan PNG ham haqiqiy dekoder bilan o‘qiladi. Barcha tashqi HTTP manzillari bloklangan holda lokal WASM ishlashi tekshiriladi. Dekoder yoki skaner callback’i mock qilinmaydi. Bu fizik telefon testi emas.

Jonli Supabase’da alohida vaqtinchalik akkauntlar bilan parolli kirish, ikki tomonlama public ID qidiruvi, telefon/email maxfiyligi, kontakt roziligi, shaxsiy chat, guruh taklifi va qabul, guruh e’loni hamda to‘lovning o‘quvchida ko‘rinishi tekshirildi. Teacher fixture administrator orqali faqat sinov uchun tasdiqlangan; bu test onboarding/sertifikat tekshiruvini almashtirmaydi. Asl foydalanuvchilarga xabar yuborilmadi. Barcha vaqtinchalik Auth akkauntlari va yozuvlari tozalandi, avvalgi **3 profil** saqlandi. Yangi SQL migratsiya talab qilinmadi.

Yangi ko‘rinish va native skanerni telefonda sinash uchun [EAS yo‘riqnomasi](build.md) bo‘yicha yangilangan APK kerak. `npm ci` QR dekoderini ham tayyorlaydi.

Yakuniy lokal tekshiruvlar: **136 asosiy test**, **4 eksport qilingan UI testi**, **26 brauzer oqimi**, TypeScript, format va web/Android/iOS bundle eksportlari muvaffaqiyatli o‘tdi.
