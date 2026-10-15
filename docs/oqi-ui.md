# O‘qi interfeysi

Darsino Expo ilovasi foydalanuvchi yuborgan `o_qi_interaktiv_mobil_ilova_prototipi.tsx` uslubida qayta ishlangan. Prototipdagi HTML/Tailwind maketi React Native komponentlariga moslashtirildi.

## Ekranlar

| Bosh                          | Qidiruv                            | Radar                           |
| ----------------------------- | ---------------------------------- | ------------------------------- |
| ![Bosh](screenshots/home.png) | ![Qidiruv](screenshots/search.png) | ![Radar](screenshots/radar.png) |

| Darslar                             | Klublar                           | Profil                             |
| ----------------------------------- | --------------------------------- | ---------------------------------- |
| ![Darslar](screenshots/lessons.png) | ![Klublar](screenshots/clubs.png) | ![Profil](screenshots/profile.png) |

Rasmlar 390 × 844 o‘lchamdagi Chromium brauzerida namuna akkaunti bilan olingan. 320 px ekran ham alohida tekshirilgan.

## Mavjud jarayonlarga ulanish

Besh asosiy bo‘lim: **Bosh → Qidirish → Radar → Darslarim → Profil**. Chat yuqoridagi xabar tugmasi va profil orqali ochiladi. Repetitorning arizalar, darslar, chat va profil kabinetlari hamda moderatorning tekshiruv jarayoni saqlangan.

Ustoz kartasi haqiqiy marketplace ma’lumotlarini, narx va sharhlardan hisoblangan reytingni oladi. Guruhga yuborilgan ariza tasdiqlanmaguncha jadvalga dars qo‘shilmaydi. Mavjud email, Google, Apple va profil rasmi jarayonlari davom etadi.

## Qo‘shilgan imkoniyatlarning chegaralari

| Imkoniyat      | Amalga oshirilgan holat                                                                                                               |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Global qidiruv | Bir nechta so‘z, fan, teg va tur bo‘yicha kataloglarni qidirish; ustozlar uchun narx, hudud, shakl, reyting va saqlanganlar filtrlari |
| Xarita         | Toshkent tumanlari bo‘yicha interaktiv sxema; aniq GPS yoki masofa berilmaydi; ko‘rsatilmagan hududlar uchun ro‘yxat mavjud           |
| Radar          | Uch fan, har birida beshta savol, javob izohi, besh ko‘nikma grafigi; faqat yakunlangan test saqlanadi                                |
| XP             | Testdagi eng yaxshi natija; dars birinchi marta o‘rganilganda +50 XP; takrorlash orqali ball cheksiz oshmaydi                         |
| Kunlik maqsad  | Uchta alohida dars/test; kunlar Asia/Tashkent bo‘yicha hisoblanadi                                                                    |
| Video darslar  | Manbada ochiladi; foydalanuvchi qaytib «O‘rgandim» deb belgilaydi                                                                     |
| Klublar        | Namuna katalogi; qurilmada kuzatish, rasmiy a’zolik va tadbir bronini anglatmaydi                                                     |
| Progress       | Har akkauntga alohida AsyncStorage; Supabase progress sinxronlashuvi hali ulanmagan                                                   |

Ko‘rinadigan brend va ilova ikonasi **O‘qi**. Mavjud baza, saqlangan sessiyalar va OAuth sozlamalarini saqlash uchun `darsino_*` SQL/RPC, `@darsino/*` marketplace kalitlari, `uz.darsino.app` paket identifikatori va `darsino://` qaytish sxemasi saqlangan. Repo nomi o‘zgartirilmagan.

## Tekshiruv

- TypeScript: `npm run typecheck`.
- Mavjud marketplace / Auth / Storage testlari: 46 ta muvaffaqiyatli.
- Radar, XP, vaqt zonasi, noto‘g‘ri kesh va qidiruv uchun 5 ta yangi test muvaffaqiyatli.
- Haqiqiy eksport qilingan Expo bundle bilan 4 ta JSDOM UI testi.
- Chromium: ariza → tasdiqlash → jadval; email va bo‘sh qidiruv; test → radar → reload → boshqa akkaunt; 320 px qidiruv → xarita → filtr → qidiruv tarixi.
- Expo Web, iOS va Android bundle eksporti. Bu native qurilmada bajarilgan sinov yoki App Store / Play Store buildi emas.
- SQL bundle va migratsiyalar mosligi: `npm run supabase:check`.

Ochiq video manbalar: [Khan Academy — logarifmlar](https://www.khanacademy.org/math/algebra-home/alg-exp-and-log/v/logarithms), [Khan Academy — Nyutonning ikkinchi qonuni](https://www.khanacademy.org/v/newton-s-second-law-of-motion), [British Council — present continuous](https://learnenglishteens.britishcouncil.org/grammar/a1-a2-grammar/present-continuous).
