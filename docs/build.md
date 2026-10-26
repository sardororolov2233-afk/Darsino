# O‘qi — Android va iOS build

2026-10-25, Asia/Tashkent. React Native / Expo loyihasi native build uchun uchta [EAS profiliga](../eas.json) ega. Ushbu konfiguratsiya APK/IPA yaratilganini anglatmaydi: Expo akkaunti, EAS loyiha bog‘lanishi va imzolash ruxsatlari hali taqdim etilmagan.

## Profillar va identifikatorlar

| Profil        | Natija                                                                                             | Muhit         |
| ------------- | -------------------------------------------------------------------------------------------------- | ------------- |
| `development` | Metro bilan ishlaydigan development client, ichki tarqatish. SDK’ga mos `expo-dev-client` kerak.   | `development` |
| `preview`     | Android’da bevosita o‘rnatiladigan APK, ichki tarqatish. iOS’da qurilmaga ruxsatli internal build. | `preview`     |
| `production`  | Android’da Play Store uchun AAB, iOS’da store build. Build raqami avtomatik oshadi.                | `production`  |

Node **24.19.0** pin qilingan. Expo SDK **57**, React Native **0.86.3** va React **19.2.3** versiyalari `package-lock.json` bilan birga ishlatiladi; development client uchun SDK’ga mos `expo-dev-client` ham o‘rnatilgan. `expo-system-ui` ham o‘rnatilgan. Native kataloglar generatsiya qilinadi; build arxiviga lokal `android/` yoki `ios/` nusxalari kiritilmaydi.

Android package va iOS bundle ID: **`uz.darsino.app`**. OAuth/deep-link scheme: **`darsino`**. Ko‘rinadigan nom O‘qi bo‘lsa ham, mavjud akkaunt/provider sozlamalarini saqlash uchun bu identifikatorlar o‘zgartirilmaydi. Soxta Expo `owner` yoki `extra.eas.projectId` kiritilmagan; haqiqiy bog‘lanish `eas init` orqali yaratiladi.

## EAS muhitidagi ochiq sozlamalar

[`.easignore`](../.easignore) lokal `.env` va credential fayllarini arxivdan chiqaradi. Lokal `.env`ning mavjudligi cloud builder ham shu qiymatlarni olishini anglatmaydi. Build qilinadigan har bir EAS muhitida quyidagilarni haqiqiy qiymatlar bilan saqlang:

| O‘zgaruvchi                     | Qiymat                                                                     |
| ------------------------------- | -------------------------------------------------------------------------- |
| `EXPO_PUBLIC_BACKEND_MODE`      | `supabase`                                                                 |
| `EXPO_PUBLIC_SUPABASE_URL`      | `https://mhqofwuawwnappstcekh.supabase.co`                                 |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Loyihaning publishable yoki legacy anon kaliti. Qiymati Git’ga yozilmaydi. |

Bu qiymatlar ilova bundle’ida ochiq bo‘ladi; EAS’da public/plaintext konfiguratsiya sifatida saqlanadi. Uchala profil `EXPO_PUBLIC_BACKEND_MODE=supabase`ni aniq belgilaydi. `EAS_BUILD=true` bo‘lsa [app.config.ts](../app.config.ts) mode, URL yoki ochiq kalit yetishmaganda build’ni boshida to‘xtatadi; xabarda faqat o‘zgaruvchi nomlari bor. URL public HTTPS manzili, kalit esa `sb_publishable_*` yoki `role=anon` legacy JWT bo‘lishi kerak. URL ichidagi credential/query/hash hamda server/PAT kalitlari rad etiladi; qiymatlar xabarga chiqarilmaydi.

`service_role`, `sb_secret_*`, Supabase access token, SMTP paroli yoki AI kalitini `EXPO_PUBLIC_*`ga kiritmang. Bu tekshiruv kalitning format/rolini tekshiradi, serverdagi haqiqiyligini isbotlamaydi. EAS’dan tashqari lokal demo rejimi avvalgidek ishlaydi; lokal `EXPO_PUBLIC_BACKEND_MODE=demo` jonli URL/kalit bo‘lsa ham demo rejimini majburlaydi.

Android Google Maps uchun shu muhitga `EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_KEY` ham qo‘shiladi. Kalitni `uz.darsino.app` va build imzolash sertifikati bilan cheklang. U build vaqtida native konfiguratsiyaga kiradi; keyin o‘zgartirilsa yangi native build kerak. iOS Apple Maps’dan, web esa alohida xarita ko‘rinishidan foydalanadi.

## Akkaunt tayyor bo‘lgach bajariladigan buyruqlar

Quyidagi masofaviy buyruqlar **hali bajarilmagan**. Expo akkauntiga kirish yoki xavfsiz `EXPO_TOKEN` bindingi, loyiha egasining ruxsati va tegishli signing credential’lari mavjud bo‘lgach ishlatiladi:

```bash
npx --yes eas-cli@latest login
npx --yes eas-cli@latest whoami
npx --yes eas-cli@latest init
```

EAS dashboard’da `development`, `preview` va `production` muhitlarini yuqoridagi qiymatlar bilan to‘ldiring. CLI orqali qo‘shishda, masalan, quyidagi buyruq qiymatni interaktiv so‘raydi:

```bash
npx --yes eas-cli@latest env:create --environment preview --name EXPO_PUBLIC_SUPABASE_ANON_KEY --visibility plaintext
```

Sinov uchun Android APK:

```bash
npx --yes eas-cli@latest build --platform android --profile preview
```

Development client va production build’lar:

```bash
npx --yes eas-cli@latest build --platform android --profile development
npx --yes eas-cli@latest build --platform android --profile production
npx --yes eas-cli@latest build --platform ios --profile production
```

EAS Android keystore’ni akkaunt ruxsati bilan boshqarishi mumkin. iOS qurilma/store build’i uchun tegishli Apple Developer akkaunti va provisioning/signing kerak; internal iOS build qurilmalarni ro‘yxatga olishni ham talab qilishi mumkin. Signing fayllarini Git’ga qo‘ymang. Build’ni yaratish store’ga avtomatik nashr qilish emas; `eas submit` bu ishga qo‘shilmagan.

## Build oldidan va qurilmada tekshirish

```bash
npm ci
npm run typecheck
npm test
npm run supabase:check
npm run export:all
```

2026-10-25 da web/Android/iOS bundle eksportlari va vaqtinchalik checkout’da ikkala native loyiha uchun `prebuild --no-install` o‘tdi. Android/iOS JavaScript yoki Hermes eksporti APK/IPA kompilatsiyasi o‘rnini bosmaydi. Hozirgi cloud mashinada Android SDK va Xcode yo‘q; shu mashinada lokal native build bajarilgani da’vo qilinmaydi.

Qurilmada yangi akkaunt uchun **email + parol + parolni takrorlash**, keyingi kirishda **email + parol** tekshiriladi. Email tasdiqlash kodi va signup SMTP talab qilinmaydi; serverda avtomatik tasdiqlash yoqilgan bo‘lishi kerak. Kamida 8 belgili parol, xato parol, sessiyani tiklash va chiqishdan keyingi qayta kirish ham sinaladi. MFA yoqilgan akkauntning qo‘shimcha himoyasi saqlanadi.

Keyin kamera/QR, rasm va fayl tanlash, GPS/xarita, private video va mahalliy bildirishnomalar real qurilmada tekshiriladi. Supabase/AI holati [jonli hisobotda](supabase-live-verification.md) alohida yuritiladi.
