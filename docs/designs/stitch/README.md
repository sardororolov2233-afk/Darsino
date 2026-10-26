# O‘qi Ustoz — Stitch manbalari

Foydalanuvchi bergan `17161676683493291412` loyihasidan 2026-10-26 kuni Stitch MCP `get_screen` orqali HTML va rasm manzillari olindi; fayllar `curl -L` bilan yuklandi. API kaliti saqlanmagan.

| Ekran                      | Stitch ID                          | HTML                                           | Rasm                                         |
| -------------------------- | ---------------------------------- | ---------------------------------------------- | -------------------------------------------- |
| Mock test yuklash          | `3be8b283da854947b95b38c74775d381` | [mock-test.html](mock-test.html)               | [mock-test.png](mock-test.png)               |
| Guruh chat                 | `d0b7bfe2c52346458fa73f5b2833b366` | [group-chat.html](group-chat.html)             | [group-chat.png](group-chat.png)             |
| O‘quvchilar o‘zlashtirishi | `ca6f0ccfbf9640b396ba2d6167dc8e6f` | [student-progress.html](student-progress.html) | [student-progress.png](student-progress.png) |

HTML fayllari dizayn manbasi; React Native ilovasi ularni ishga tushirmaydi. Ekranlar native komponentlarga moslashtirilgan. Dizayndagi namuna raqamlar o‘rnida haqiqiy guruh, to‘lov, davomat va test natijalari ishlatiladi. PDF/DOCX hajmi mavjud private Storage qoidasi bo‘yicha 20 MB. Avtomatik AI tahlili o‘rnida ustoz javob kalitini kiritadi; SMS va ota-ona rollari ulanmagan. Tayyor testlar ilovadagi diagnostika katalogidan olinadi.
