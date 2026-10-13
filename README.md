# Darsino

Berilgan 20 ekranli Figma dizayni asosidagi **React Native + Expo + TypeScript** mobil frontend. Interfeys o‘zbek tilida; Android, iOS va web uchun bitta kod bazasi ishlatiladi. Ranglar, Manrope shrifti va SVG logotiplar `Darsino_UI_20_screens (2).zip` materiallaridan olingan.

## Ishga tushirish

Node.js 24.3+ tavsiya etiladi. Node 20.19.4+ va 22.13+ ham qo‘llanadi.

```bash
npm ci
npm start
```

Expo Go’ning SDK 57 bilan mos versiyasida QR kod orqali oching. Android emulyatori uchun `npm run android`, macOS’dagi iOS simulyatori uchun `npm run ios`, brauzer uchun `npm run web` ishlating. Cloud muhitda mobil qurilmadan ulanish tarmoq imkoniyatlariga bog‘liq; brauzer tekshiruvi mobil o‘lchamda ham ishlaydi.

Kirish uchun istalgan to‘g‘ri O‘zbekiston telefon raqamini kiriting. **Demo tasdiqlash kodi: `421806`**. SMS yuborilmaydi.

## Tayyor funksiyalar

- Yuklanish, xush kelibsiz, rol tanlash, telefon va kod tekshiruvi, profil yaratish.
- Bosh sahifa va beshta bo‘limli pastki navigatsiya.
- Repetitorlarni ism, fan va hudud bo‘yicha qidirish; narx, reyting va dars shakli filtrlari; saralash.
- Repetitor profili, tanlanadigan sana/vaqt va sinov darsi so‘rovi.
- Guruhlar, guruh tafsilotlari va qo‘shilish so‘rovi.
- Amaliy tadbirlar, kategoriya tanlash, tafsilotlar va ishtirok so‘rovi.
- Xonalarni qidirish, qulaylik filtrlari, sana/vaqt/davomiylik tanlash va avtomatik bron narxi.
- So‘rov holati ekrani, dars jadvali, kalendar va yuborilgan so‘rovlar ro‘yxati.
- Chat qidiruvi, ustoz/guruh filtrlari va qurilmada saqlanadigan matnli suhbatlar.
- Profil tahriri, saqlangan e’lonlarni ochish/o‘chirish, yordam va chiqish.

Profil, so‘rovlar, saqlanganlar, filtrlar va xabarlar **AsyncStorage** orqali qurilmada saqlanadi. Hisobdan chiqish demo foydalanuvchi ma’lumotlarini tozalaydi. Darslar, narxlar va boshlang‘ich suhbatlar dizayndagi namuna ma’lumotlardir.

## Backend uchun ulanish nuqtalari

Bu loyiha frontend namunasidir. Haqiqiy autentifikatsiya/SMS, server orqali bron tasdiqlash, real chat, bildirishnoma, qo‘ng‘iroq, fayl uzatish va to‘lov xizmatlari ulanmagan. So‘rovlar avtomatik tasdiqlanmaydi, pul olinmaydi; yuborilgan xabarlar boshqa odamga yetkazilmaydi. Qo‘shimcha tillar va repetitor boshqaruv paneli hozircha mavjud emas.

`src/state/AppContext.tsx` dagi `completeOnboarding`, `submitRequest` va `sendMessage` keyinchalik API bilan bog‘lash uchun ajratilgan. Katalog namunalari `src/data/catalog.ts` da. Haqiqiy tokenlarni AsyncStorage’ga kiritish o‘rniga server autentifikatsiyasi uchun xavfsiz saqlashni alohida ulang.

## Tekshirish

```bash
npm run typecheck
npx playwright install chromium
npm test
npx expo export --platform all
```

Playwright testlari telefon/kod validatsiyasi, qidiruv/filtr, to‘rt turdagi so‘rov, xona narxi, chat, profil tahriri, chiqish va qayta ochilganda ma’lumotlar saqlanishini tekshiradi. Testlar Metro serverini avtomatik ishga tushiradi yoki ishlayotgan serverdan foydalanadi.

Cloud muhitdagi Chromium uchun:

```bash
PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium npm test -- --workers=2
```

Android/iOS JavaScript paketlari yig‘iladi; haqiqiy qurilma yoki simulyatorda alohida tekshirish tavsiya etiladi. APK/IPA ushbu tekshiruvda yaratilmaydi.

## Loyiha tuzilmasi

```text
App.tsx                       # Root stack va pastki tab navigatsiyasi
src/theme.ts                  # Dizayn ranglari va shriftlar
src/components/               # UI elementlari, SVG brand va illustratsiyalar
src/screens/AuthScreens.tsx   # 01–05
src/screens/HomeScreen.tsx    # 06
src/screens/DiscoveryScreens.tsx # 07–13, 15–16
src/screens/ActivityScreens.tsx  # 14, 17–20, profil tahriri
src/state/                    # Holat va qurilmada saqlash
src/data/catalog.ts           # Namuna katalogi
tests/frontend.spec.ts        # Brauzer orqali funksional testlar
```

[Figma dizayni](https://www.figma.com/design/I475KWRE4OwHs988phwTCG/Darsino?node-id=2-65)

Frontend elementlari haqiqiy native komponentlar orqali yaratilgan; ekranlar PNG tasvirlari sifatida ko‘rsatilmaydi.

Tayyor interfeys ko‘rinishlari: [xush kelibsiz](docs/screenshots/welcome.png), [bosh sahifa](docs/screenshots/home.png), [ustoz profili](docs/screenshots/tutor.png), [profil](docs/screenshots/profile.png).
