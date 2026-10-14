# Darsino — Supabase bazasi va Storage

Bu paket repodagi Expo ilovasiga mos: telefon orqali kirish, o‘quvchi va repetitor profillari, moderator tekshiruvi, guruh / individual dars, ariza, jadval, qatnashchi, davomat, fikr, shaxsiy chat, bildirishnoma va fayllar.

**Asosiy fayl: [Darsino_Supabase_setup.sql](Darsino_Supabase_setup.sql).** Uni Supabase SQL Editor’da bir marta ishga tushiring. Fayl bo‘sh loyiha uchun bazani yaratadi; oldingi Darsino migratsiyasi qo‘llangan bo‘lsa, ma’lumotlarni saqlagan holda yangilaydi. Qayta ishga tushirish ham test qilingan. Begona yoki qisman yaratilgan Darsino sxemasini aniqlasa, tranzaksiya xato bilan to‘xtaydi.

SQL hali haqiqiy Supabase loyihangizga qo‘llanmagan. Loyiha URL / ochiq kaliti va SMS provayder sozlamalari sizning loyihangizdan olinadi.

## 1. O‘rnatish tartibi

1. Supabase loyihasini oching. SQL Editor’da `Darsino_Supabase_setup.sql` faylining **to‘liq matnini** loyiha administratori sifatida ishga tushiring. Supabase’ning tayyor `auth` va `storage` sxemalari kerak; oddiy PostgreSQL bazasining o‘zi yetmaydi.
2. Authentication’da Phone provider’ni yoqing, haqiqiy SMS provayderni ulang va OTP uzunligini **6** qilib sozlang. SQL SMS yuborish provayderini, uning kalitlarini yoki mobil push xizmatini avtomatik sozlamaydi. Dashboard’dagi test telefonlari faqat ishlab chiqish uchun.
3. Repodagi `.env.example` faylidan `.env` yarating:

   ```dotenv
   EXPO_PUBLIC_BACKEND_MODE=supabase
   EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=YOUR_PUBLISHABLE_OR_ANON_KEY
   ```

   Ilovaga publishable / anon kalit kiritiladi. **`service_role`, secret key, database paroli va SMS provayder kalitini ilovaga qo‘ymang.** `EXPO_PUBLIC_*` qiymatlar ilova to‘plamida ochiq bo‘ladi.

4. Ilovani qayta boshlang: `npm run web` yoki `npx expo start --clear`. Ochiq terminal ishlab turgan bo‘lsa, uni to‘xtatib qayta ishga tushiring.
5. Moderator uchun alohida telefon bilan ilovaga SMS orqali kiring. Supabase Authentication → Users’dan shu akkaunt UUID’sini oling. [admin/01_assign_moderator.sql](admin/01_assign_moderator.sql) ichidagi `target uuid := null` o‘rniga shu UUID’ni yozib, SQL Editor’da alohida bajaring. O‘zgartirilmagan fayl ataylab xato bilan to‘xtaydi; hech kimga tasodifan rol bermaydi.
6. [admin/02_healthcheck.sql](admin/02_healthcheck.sql) ni bajaring: 16 ta Darsino jadvalida RLS, 5 ta private bucket, 7 ta Storage policy, Auth trigger va Realtime’dagi 3 ta jadval ko‘rinadi. `*_core` hamda `owned_file` funksiyalarida `authenticated_allowed=false` bo‘lishi kerak.
7. Haqiqiy ikki akkaunt bilan tekshiring: repetitor ro‘yxatdan o‘tadi → moderator tasdiqlaydi → repetitor dars yaratadi → o‘quvchi ariza yuboradi → ustoz tasdiqlaydi → «Darslarim»da guruh paydo bo‘ladi. Live bazaga demo ustozlar yoki soxta Auth akkauntlari kiritilmaydi.

SQL Editor va CLI — ikkita muqobil yo‘l. Yangi CLI loyihasida `supabase link --project-ref YOUR_PROJECT_REF`, keyin `supabase db push` uchta migratsiyani tartib bilan qo‘llaydi. SQL Editor orqali allaqachon o‘rnatilgan loyihada `001` migratsiyani yana ko‘r-ko‘rona bajarmang: u dastlabki sxemani yaratadi. CLI’ga keyin o‘tsangiz, Supabase migration history’sini real qo‘llangan fayllar bilan avval moslang.

## 2. Jadvallar

| Jadval                    | Vazifasi                                                                           |
| ------------------------- | ---------------------------------------------------------------------------------- |
| `darsino_profiles`        | Auth UUID, tasdiqlangan telefon, rol, ism, hudud, fanlar, maqsad, avatar, bloklash |
| `darsino_tutors`          | Mutaxassislik, tajriba, tasdiqlash matni, narx, dars shakli va moderator qarori    |
| `darsino_offerings`       | Guruh / individual e’lon, ustoz, sig‘im, narx va muqova                            |
| `darsino_sessions`        | Aniq boshlanish / tugash vaqti va darsga bog‘lanish                                |
| `darsino_applications`    | O‘quvchi arizasi, qaror, izoh va individual dars so‘rovi                           |
| `darsino_enrollments`     | Tasdiqlangan a’zolik va faol / chiqarilgan holat                                   |
| `darsino_attendance`      | Darsdagi har bir o‘quvchining davomati                                             |
| `darsino_reviews`         | Tugagan, qatnashilgan dars uchun bir martalik baho va fikr                         |
| `darsino_messages`        | O‘quvchi–repetitor shaxsiy xabarlari                                               |
| `darsino_notifications`   | Shaxsiy ilova bildirishnomalari va o‘qilgan holati                                 |
| `darsino_favorites`       | Saqlangan repetitorlar                                                             |
| `darsino_files`           | Fayl egasi, private bucket / yo‘l, MIME, hajm, kontekst va yuklash holati          |
| `darsino_tutor_documents` | Diplom / sertifikat fayli, tekshiruv holati va moderator izohi                     |
| `darsino_message_files`   | Faylning aniq shaxsiy xabarga bog‘lanishi                                          |
| `darsino_lesson_files`    | Dars / mashg‘ulot materiali va ko‘rinish holati                                    |
| `darsino_catalog`         | Repodagi fan, hudud, maqsad va dars shakli uchun boshlang‘ich qiymatlar            |

Profil va e’lonning matnli maydonlari mavjud ilova kontraktini saqlash uchun `data jsonb` ichida qolgan; egalar, vaqtlar, rollar, arizalar va a’zolik alohida ustunlar / tashqi kalitlar orqali boshqariladi. Katalog boshlang‘ich qiymatlari mavjud UI satrlariga mos. UI hozir mavjud ro‘yxatlarini ishlatadi; `darsino_get_catalog()` yangi boshqariladigan forma uchun tayyor.

Xona band qilish va to‘lovlar oldingi talabga ko‘ra keyingi versiyada; bu paketda ular uchun ishlamaydigan jadvallar yaratilmaydi.

## 3. Storage bucketlari

Barchasi **private**. Faylning oddiy public URL’i ishlatilmaydi.

| Bucket                     | Limit  | MIME                           | Kim o‘qiydi                                                                                                  |
| -------------------------- | ------ | ------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| `darsino-avatars`          | 2 MiB  | JPEG, PNG, WebP                | Egasi; tasdiqlangan ustoz avatari kirgan foydalanuvchilarga, o‘quvchi avatari vakolatli suhbatdosh / ustozga |
| `darsino-verifications`    | 10 MiB | PDF, JPEG, PNG, WebP           | Egasi va moderator                                                                                           |
| `darsino-chat-files`       | 10 MiB | PDF, JPEG, PNG, WebP           | Yuboruvchi va fayl bog‘langan xabarning qabul qiluvchisi                                                     |
| `darsino-lesson-materials` | 20 MiB | PDF, rasmlar, DOCX, PPTX, XLSX | Dars egasi va faol tasdiqlangan a’zolar; yashirilgan material faqat egasiga                                  |
| `darsino-group-covers`     | 5 MiB  | JPEG, PNG, WebP                | Egasi; ochiq tasdiqlangan e’lonni ko‘ruvchilar va shu guruh a’zolari                                         |

SVG, HTML va bajariladigan fayllarga ruxsat yo‘q. Fayl yo‘lini server yaratadi: `<owner_uuid>/<file_uuid>.<mime_extension>`. Asl fayl nomi faqat ko‘rsatish uchun metadata’da saqlanadi. Yuklangan obyekt ustiga yozish taqiqlangan; yangilash uchun yangi fayl yuklanadi va bog‘lanish almashtiriladi. Qayta tekshiruvga yuborilgan repetitor hujjati profilni `pending` holatiga qaytaradi.

Bir akkauntda 1000 ta o‘chirilmagan fayl, oxirgi soatda ko‘pi bilan 20 ta ochiq yuklash rezervi va deklaratsiya qilingan hajmlar uchun 2 GiB rezerv limiti bor. Bu loyiha billing / global Storage kvotasi o‘rnini bosmaydi. MIME va hajm tekshiruvi fayl ichidagi zararli kontentni skanerlash emas; kerak bo‘lsa alohida skaner xizmati ulanadi.

## 4. Fayl API’sidan foydalanish

Ilovadagi tayyor klient: `src/services/files.ts`. Mavjud ekranlarda fayl tanlash tugmalari hali qo‘shilmagan; bu paket SQL, ruxsatlar, turlar va ulash xizmatini tayyorlaydi. Picker tanlangan faylni `ArrayBuffer`ga aylantirib ushbu xizmatga uzatadi. React Native uchun `Blob` / `FormData` o‘rniga `ArrayBuffer` ishlatiladi.

```ts
import { createFileService } from "./src/services/files";
import { requireBackend } from "./src/services/backend";

const files = createFileService(requireBackend());
const asset = await files.upload({
  purpose: "avatar",
  originalName: "avatar.png",
  mimeType: "image/png",
  bytes, // ArrayBuffer; native picker / web File.arrayBuffer() dan
});
await files.setAvatar(asset.id);
await refresh(); // useApp().refresh(): ruxsatlangan snapshotni yangilash
const url = await files.signedUrl(asset.id); // klient odatda 300 soniyalik URL oladi
```

| Amal                                     | Klient metodi / SQL RPC                                                                                        |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Fayl yo‘lini rezervlash                  | `darsino_prepare_upload(p_purpose,p_original_name,p_mime_type,p_size_bytes,p_conversation_id?,p_offering_id?)` |
| Yuklash                                  | `storage.from(bucketId).upload(objectPath,bytes,{contentType,upsert:false})`                                   |
| Haqiqiy Storage metadata’sini tekshirish | `files.finalize(id)` / `darsino_finalize_upload(p_file_id)`                                                    |
| Vakolatli metadata olish                 | `files.getFile(id)` / `darsino_get_file(p_file_id)`                                                            |
| Avatar qo‘yish / olib tashlash           | `files.setAvatar(idOrNull)` / `darsino_set_avatar(p_file_id)`                                                  |
| Guruh muqovasi                           | `files.setCover(offeringId,idOrNull)` / `darsino_set_cover(p_offering_id,p_file_id)`                           |
| Diplom / sertifikat yuborish             | `files.submitDocument(id,"certificate",label)` / `darsino_submit_document(p_file_id,p_document_type,p_label)`  |
| Chat faylini xabar qilish                | `files.sendMessage(id,text)` / `darsino_send_file_message(p_file_id,p_text)`                                   |
| Dars materialini bog‘lash                | `files.attachMaterial(id,title,sessionId?)` / `darsino_attach_lesson_file(p_file_id,p_title,p_session_id?)`    |
| Materialni yashirish / ko‘rsatish        | `files.manageMaterial(attachmentId,{published:false})` / `darsino_manage_lesson_file(...)`                     |
| Material bog‘lanishini olib tashlash     | `files.manageMaterial(attachmentId,{remove:true})`                                                             |
| Faylni o‘chirish                         | `files.remove(id)`: rezerv → Storage API remove → metadata yakunlash                                           |

Hujjat uchun `purpose:"verification"`; chat uchun `purpose:"chat", conversationId:"dm:STUDENT_UUID:TUTOR_UUID"`; material uchun `purpose:"material", offeringId`; muqova uchun `purpose:"cover", offeringId` uzatiladi. Ariza berish chat fayliga kirish bermaydi; fayl aniq shaxsiy xabarga bog‘lanishi kerak. Dars materiali esa faol a’zolikni talab qiladi.

Yuklash oqimi: `pending` → Storage API upload → `darsino_finalize_upload` → `ready` → kerakli obyektga bog‘lash. Bir soatlik eski rezerv orqali yangi upload rad etiladi. Upload o‘tib, finalize javobi yo‘qolsa `FileUploadError.asset.id` bilan `files.finalize(id)` ni qayta chaqirish mumkin. SQL commit bo‘lgan bo‘lishi mumkinligi uchun klient faylni yashirin ravishda o‘chirmaydi. Katta fayllarda xizmat hozir standard upload ishlatadi; Supabase 6 MB dan kattalar uchun ishonchlilik maqsadida TUS resumable upload’ni tavsiya qiladi.

O‘chirish oqimi: bog‘lanmagan faylga `darsino_begin_file_delete` → `deleting` → **Storage API remove** → `darsino_forget_file` → `deleted`. O‘chirish rezervi yangi bog‘lanishni to‘sadi; tarmoq xatosidan keyin `files.remove(id)` qayta chaqiriladi. Avatar / muqova avval almashtiriladi yoki `null` qilinadi, material bog‘lanishi olib tashlanadi. Jo‘natilgan chat fayli va `pending` / `approved` tekshiruv hujjatini oddiy egasi o‘chira olmaydi; rad etilgan hujjatni o‘chirish mumkin.

**`storage.objects`dan SQL bilan DELETE qilmang.** U yerda metadata turadi, faylning o‘zi boshqa saqlash qatlamida. Yuklash / o‘chirish faqat Storage API orqali bajariladi. Healthcheck eski ochiq rezervlarni ko‘rsatadi; avtomatik fayl o‘chirish rejalashtirilmagan.

Signed URL maxfiy havola sifatida ko‘riladi: uni DB, log yoki doimiy keshga yozmang. A’zolik bekor qilinsa yangi URL olish rad etiladi; avval berilgan signed URL muddati tugaguncha ishlashi mumkin. Klientning 300 soniyalik tanlovi server darajasida majburiy TTL cheklovi emas.

## 5. Ruxsatlar va Realtime

- Auth trigger profilni `student` sifatida yaratadi va telefon tasdiqlanganda sinxronlaydi. User metadata’dagi `role` qabul qilinmaydi. Tasdiqlanmagan telefon yoki administrator `darsino_profiles.is_suspended=true` qilgan akkaunt RPC / fayllardan foydalana olmaydi.
- `darsino_snapshot()` va `darsino_mutate(command)` mavjud ilova kontraktini saqlaydi. Qo‘shimcha `files`, `tutorDocuments`, `lessonFiles`, `avatarFileId`, `coverFileId`, `attachmentIds` keladi; snapshotda signed URL saqlanmaydi.
- Barcha 16 jadvalda RLS yoqilgan. Klient to‘g‘ridan-to‘g‘ri yozmaydi. Faqat notifications, messages va enrollments jadvallarida akkauntga tegishli `SELECT` bor; bu Realtime uchun. Qolgan ma’lumotlar vakolatlarni tekshiradigan RPC orqali olinadi.
- `darsino_snapshot_core`, `darsino_mutate_core` va ichki yordamchilarning bajarilish ruxsati klientdan olib tashlangan. Moderator roli faqat administrator SQL orqali beriladi.
- Storage’da ruxsat beruvchi policy bilan birga 4 ta restrictive guard bor. Boshqa ilovaning keng policy’si Darsino bucketlarini ochib yubormaydi; bu guardlar boshqa bucketlarning o‘z ruxsatlarini o‘zgartirmaydi. Data API exposed schemas ro‘yxatiga `auth` yoki `storage`ni qo‘shmang.
- `supabase_realtime` publication’iga faqat `darsino_notifications`, `darsino_messages`, `darsino_enrollments` qo‘shiladi. Ilova tegishli user filtrlari bilan INSERT / UPDATE’ni kuzatadi, yaqin voqealarni birlashtirib snapshotni qayta oladi; payloadni to‘g‘ridan-to‘g‘ri state’ga yozmaydi. Logout’da kanal yopiladi. WebSocket uzilsa 15 soniyalik polling va qo‘lda yangilash qoladi.
- SQL masofaviy mobil push yetkazib berishni yoqmaydi. Hozirgi ilovada in-app bildirishnomalar va foydalanuvchi yoqqan mahalliy dars eslatmalari bor.

## 6. Migratsiyalar va tekshirish

| Fayl                                       | Tarkibi                                                                                                  |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| `migrations/202610140001_marketplace.sql`  | Oldingi 11 asosiy jadval va marketplace RPC; tarixi o‘zgartirilmagan                                     |
| `migrations/202610140002_storage.sql`      | Auth trigger, faol akkaunt nazorati, 4 fayl jadvali, private bucketlar, Storage RLS, upload / delete RPC |
| `migrations/202610140003_api_realtime.sql` | Fayl bog‘lash, snapshot, katalog, moderator hujjat qarori va Realtime                                    |
| `Darsino_Supabase_setup.sql`               | Uchala migratsiyadan generatsiya qilinadigan SQL Editor fayli                                            |
| `admin/01_assign_moderator.sql`            | Aniq tasdiqlangan akkauntga moderator berish                                                             |
| `admin/02_healthcheck.sql`                 | Faqat o‘qiydigan sozlama va qolib ketgan rezerv diagnostikasi                                            |

```bash
npm ci
npm run supabase:bundle
npm run supabase:check
npm run typecheck
npm test
npm run test:ui
npm run export:all
npm run format:check
```

PostgreSQL funksiyalari, haqiqiy RLS va tranzaksiyalar PGlite’da tekshiriladi. Testdagi Supabase `auth` / `storage` jadvallari minimal fixture; ular haqiqiy SMS, Storage binary HTTP, signed URL yuklab olish yoki Realtime WebSocket serverini ishga tushirmaydi. Fayl klienti va Realtime unsubscribe / refresh tartibi alohida stub testlarda tekshiriladi. Production loyiha sozlangach, haqiqiy ikki akkaunt va fayl bilan shu oqimni qo‘shimcha tekshiring.

Rasmiy manbalar: [Phone Auth](https://supabase.com/docs/guides/auth/phone-login), [Auth users](https://supabase.com/docs/guides/auth/users), [Storage RLS](https://supabase.com/docs/guides/storage/security/access-control), [Storage schema](https://supabase.com/docs/guides/storage/schema/design), [ArrayBuffer upload](https://supabase.com/docs/reference/javascript/storage-from-upload), [Realtime Postgres Changes](https://supabase.com/docs/guides/realtime/postgres-changes).
