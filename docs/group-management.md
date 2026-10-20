# Guruhlar, oylik to‘lovlar va testlar

Ustoz: **Guruhlar → Boshqarish**. Barcha kartalar va hisobotlar haqiqiy guruh a’zolaridan olinadi; katalogdagi oldindan band o‘rinlar alohida ko‘rsatiladi.

- **O‘quvchilar:** ism va familiya, oylik summa, to‘lov holati va sanasi, yozish va eslatish amallari. Kichik ekranda jadval yon tomonga suriladi. Oylar alohida; to‘lagan/qarzdor va ism filtrlari mavjud. «To‘ladi» belgisi qayta tuzatiladi. Guruhdan chiqqan o‘quvchining saqlangan oylik yozuvi hisobotda qoladi.
- **Davomat:** darsni sanasi bilan tanlash, kelgusi jadvalni o‘zgartirish, boshlangan darsda qatnashgan/qatnashmagan deb belgilash, qatnashchini chiqarish.
- **Testlar:** barcha faol a’zolar yoki tanlangan bitta o‘quvchiga diagnostika yuborish, javob kutilayotgan va ulashilgan natijalarni ko‘rish. Bir martalik yuborish davomida takror bosish va qisman yuborishdan keyin qayta urinish hisobga olinadi.
- **Materiallar:** guruhning mavjud yopiq fayl/video oqimi.

O‘quvchi **Dars & Klub → Darslarim → To‘lovlar** bo‘limida faqat o‘z hisobini ko‘radi. To‘lovni ustoz qayd etganda yoki eslatganda bildirishnoma keladi. «Radar»da ishga tushish xabari va ustoz yuborgan testlar bor; chatdan ham test bajarish va natijani ulashish mumkin.

## Mavjud Supabase bazasini yangilash

1. SQL Editor’da `supabase/migrations/202610200001_group_payments.sql` ni bajaring. Avvalgi migratsiyalar o‘rnatilgan bo‘lishi kerak. Yangi loyiha uchun `supabase/Darsino_Supabase_setup.sql` to‘liq o‘rnatuvchidan foydalaning.
2. Yangilangan ilovani ishga tushiring. Yangi jadval mavjud `darsino_snapshot()` va `darsino_mutate(command)` bilan ishlaydi; yangi environment kaliti yo‘q.

Bu to‘lovlarni qayd etish hisoboti: karta orqali pul o‘tkazish yoki bank tasdig‘i emas. Summa guruh narxidan olinadi; qayd etilgan summa keyin ham saqlanadi. Eslatma har o‘quvchi/guruh/oy uchun 24 soatda bir marta ilova ichidagi bildirishnomaga yuboriladi. To‘langan va bepul guruhlarga eslatma yuborilmaydi. O‘quvchi guruhga qo‘shilishidan oldingi oy uchun qarz yaratilmaydi.

## Tekshirish

`npm test` PostgreSQL RPC ruxsatlari, oylik yozuvlar, takroriy so‘rovlar, eslatma oraliqlari va oldingi funksiyalarning saqlanishini tekshiradi. `tests/payments.spec.ts` brauzerda to‘lov, eslatma, o‘quvchi hisobi, shaxsiy test, natija ulashish, davomat va 320px filtrlarni tekshiradi. Native qurilma, haqiqiy email/OAuth va tashqi push provayderi bu mahalliy testlarning qamroviga kirmaydi.
