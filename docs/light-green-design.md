# O‘qi — och yashil ranglar

2026-10-29. Foydalanuvchining ranglar haqidagi bevosita so‘rovi va yuborgan logotip ranglari asosida ilovaning umumiy palitrasi yangilandi. Biriktirilgan `oqi_oquvchi_rivojlantirish_rejasi.md` funksional rivojlantirish uchun kontekst sifatida o‘qildi; ushbu o‘zgarish dizaynga tegishli.

## Palitra

| Vazifa                                      | Rang                 |
| ------------------------------------------- | -------------------- |
| Asosiy tugmalar va katta kartalar           | Och yashil `#B5E6B8` |
| Yordamchi kartalar va tanlov foni           | `#EAF6EC`            |
| Yashil havolalar va faol belgilar           | `#266846`            |
| Logotipga mos to‘q ko‘k, asosiy tugma matni | `#124F6B`            |
| Asosiy matn                                 | `#203C37`            |
| Ikkinchi darajali matn                      | `#50645B`            |
| Sahifa foni                                 | `#F5F9F5`            |

Ranglar `src/theme.ts`da boshqariladi. Eski `purple`, `blueSoft`, `gold` tone nomlari mavjud komponentlar bilan moslik uchun saqlangan va yangi palitraga bog‘langan. Asosiy tugma foni hamda matni uchun alohida `action` / `onAction` ranglari ishlatiladi. Qizil xatolar, qarzdorlik ogohlantirishlari, Google/Apple belgilari va QR kodining kuchli kontrasti saqlangan.

Login va onboarding och fonga o‘tdi; tanlangan variantlar yashil, matnlar to‘q rangda. O‘quvchi maqsadi, ko‘rsatkichlari, guruh sahifasi, bilim natijalari, ustoz ko‘rsatkichlari, moliya, testlar, kalendar va chatlar bir xil rang tizimidan foydalanadi. Ochiq video kartalari ham och yashil. Chatdagi o‘z xabarlari och yashil fonda to‘q matn bilan ko‘rinadi.

## Ekranlar

- [O‘quvchi, 390 px](screenshots/green-student-390.png)
- [O‘quvchi, 320 px](screenshots/green-student-320.png)
- [Ustoz](screenshots/green-teacher-390.png)
- [Moliya](screenshots/green-finance-390.png)
- [Ro‘yxatdan o‘tish](screenshots/green-login-390.png)
- [Rol tanlash](screenshots/green-welcome-390.png)

Rasmlar izolyatsiyalangan demo ma’lumotlari bilan olingan.

## Tekshirish

- TypeScript va Prettier tekshiruvlari o‘tdi.
- Mavjud **26 brauzer ssenariysi** o‘tdi: onboarding, login, guruhga qabul, testlar, QR, chat, to‘lovlar va kalendar.
- Yakuniy manbadan **web, Android va iOS bundle eksportlari** tayyorlandi.
- 320 / 390 px o‘quvchi ekranlarida gorizontal chiqib ketish va JavaScript xatosi kuzatilmadi.
- Ranglar hisobida tugma matni / och yashil fon **6.36:1**, asosiy matn / och yashil fon **8.49:1**, yordamchi matn / och yashil fon **4.52:1**.

Telefon qurilmasidagi tekshiruv va yangi APK yig‘ish alohida bajariladi. Ranglar yangilanishida SQL migratsiyasi talab qilinmaydi.
