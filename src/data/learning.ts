export const SKILLS = [
  "Bilim",
  "Mantiq",
  "Hisoblash",
  "Tahlil",
  "Qo‘llash",
] as const;
export type Skill = (typeof SKILLS)[number];
export type Question = {
  text: string;
  options: string[];
  correct: number;
  skill: Skill;
  explanation: string;
};
export type Diagnostic = {
  id: string;
  title: string;
  subject: string;
  icon: "triangle" | "globe" | "zap";
  minutes: number;
  questions: Question[];
};
export const diagnostics: Diagnostic[] = [
  {
    id: "math-basics",
    title: "Matematika: bilimlarni tekshirish",
    subject: "Matematika",
    icon: "triangle",
    minutes: 5,
    questions: [
      {
        text: "2x + 5 = 17 bo‘lsa, x² + 4 nechaga teng?",
        options: ["36", "40", "42", "32"],
        correct: 1,
        skill: "Hisoblash",
        explanation: "2x = 12, x = 6. Demak, 6² + 4 = 40.",
      },
      {
        text: "2, 6, 18, 54, … ketma-ketligida keyingi son?",
        options: ["108", "144", "162", "216"],
        correct: 2,
        skill: "Mantiq",
        explanation: "Har bir had avvalgisidan 3 marta katta: 54 × 3 = 162.",
      },
      {
        text: "log₂ 8 ning qiymati nechaga teng?",
        options: ["2", "3", "4", "6"],
        correct: 1,
        skill: "Bilim",
        explanation: "2³ = 8 bo‘lgani uchun log₂ 8 = 3.",
      },
      {
        text: "Guruhdagi 20 o‘quvchining 60% i testdan o‘tdi. Nechtasi o‘ta olmadi?",
        options: ["6", "8", "10", "12"],
        correct: 1,
        skill: "Tahlil",
        explanation: "O‘ta olmaganlar 40%: 20 × 0.4 = 8 nafar.",
      },
      {
        text: "200 000 so‘mlik kursga 15% chegirma berildi. Yangi narx?",
        options: ["150 000", "170 000", "180 000", "185 000"],
        correct: 1,
        skill: "Qo‘llash",
        explanation: "Chegirma 30 000 so‘m. 200 000 − 30 000 = 170 000 so‘m.",
      },
    ],
  },
  {
    id: "english-basics",
    title: "Ingliz tili: grammatika va mantiq",
    subject: "Ingliz tili",
    icon: "globe",
    minutes: 5,
    questions: [
      {
        text: "Hozir sodir bo‘layotgan harakatni tanlang.",
        options: [
          "I study every day.",
          "I am studying now.",
          "I studied yesterday.",
          "I will study tomorrow.",
        ],
        correct: 1,
        skill: "Bilim",
        explanation:
          "Present continuous: am/is/are + fe’l-ing. “Now” hozirgi harakatni bildiradi.",
      },
      {
        text: "Despite the heavy rain, …",
        options: [
          "we went for a walk.",
          "although we went out.",
          "because it was cold.",
          "so we stayed home.",
        ],
        correct: 0,
        skill: "Mantiq",
        explanation:
          "Despite qarama-qarshi mazmunni bog‘laydi: yomg‘irga qaramay sayrga chiqdik.",
      },
      {
        text: "A lesson starts at 14:20 and lasts 45 minutes. When does it end?",
        options: ["14:55", "15:00", "15:05", "15:15"],
        correct: 2,
        skill: "Hisoblash",
        explanation: "14:20 ga 45 daqiqa qo‘shilsa, 15:05 bo‘ladi.",
      },
      {
        text: "“I have lived here for five years” nimani bildiradi?",
        options: [
          "Bu yerga ertaga ko‘chaman.",
          "Faqat besh yil oldin yashaganman.",
          "Besh yildan beri shu yerda yashayman.",
          "Bu yerda besh marta bo‘lganman.",
        ],
        correct: 2,
        skill: "Tahlil",
        explanation:
          "Present perfect va “for” o‘tmishda boshlangan, hozirgacha davom etgan holatni ifodalaydi.",
      },
      {
        text: "Ustozdan odob bilan yordam so‘rash uchun qaysi gap mos?",
        options: [
          "You help!",
          "Help me now!",
          "Could you explain this, please?",
          "Why you no help?",
        ],
        correct: 2,
        skill: "Qo‘llash",
        explanation: "“Could you …, please?” odobli iltimos qilish usulidir.",
      },
    ],
  },
  {
    id: "physics-basics",
    title: "Fizika: harakat va kuch",
    subject: "Fizika",
    icon: "zap",
    minutes: 5,
    questions: [
      {
        text: "SI tizimida kuchning o‘lchov birligi?",
        options: ["Joul", "Nyuton", "Vatt", "Paskal"],
        correct: 1,
        skill: "Bilim",
        explanation: "Kuch nyuton (N) bilan o‘lchanadi: 1 N = 1 kg·m/s².",
      },
      {
        text: "Jismga ta’sir etuvchi natijaviy kuch nol. Jism qanday harakat qilishi mumkin?",
        options: [
          "Faqat tezlanadi.",
          "Faqat sekinlashadi.",
          "Tinch turadi yoki to‘g‘ri chiziqli tekis harakat qiladi.",
          "Albatta aylanadi.",
        ],
        correct: 2,
        skill: "Mantiq",
        explanation:
          "Nyutonning birinchi qonuniga ko‘ra natijaviy kuch nol bo‘lsa, tezlik o‘zgarmaydi.",
      },
      {
        text: "2 kg massali jismga 10 N natijaviy kuch ta’sir qilsa, tezlanish?",
        options: ["2 m/s²", "5 m/s²", "10 m/s²", "20 m/s²"],
        correct: 1,
        skill: "Hisoblash",
        explanation: "F = ma, shuning uchun a = 10 / 2 = 5 m/s².",
      },
      {
        text: "Tezlik–vaqt grafigida tezlik o‘zgarmas. Tezlanish qanday?",
        options: ["Musbat", "Manfiy", "Nol", "Aniqlab bo‘lmaydi"],
        correct: 2,
        skill: "Tahlil",
        explanation:
          "Tezlanish tezlikning vaqt bo‘yicha o‘zgarishi. Tezlik o‘zgarmasa, a = 0.",
      },
      {
        text: "Avtobus keskin tormozlaganda yo‘lovchi oldinga og‘adi. Sababi?",
        options: [
          "Inersiya",
          "Ishqalanish yo‘qligi",
          "Og‘irlik kamayishi",
          "Havo bosimi",
        ],
        correct: 0,
        skill: "Qo‘llash",
        explanation:
          "Yo‘lovchi tanasi oldingi harakat holatini inersiya tufayli saqlashga intiladi.",
      },
    ],
  },
];
export type OpenLesson = {
  id: string;
  title: string;
  subject: string;
  author: string;
  icon: string;
  color: string;
  url: string;
  summary: string;
  language: string;
  quizId: string;
};
// These are external educational resources; O‘qi does not host their videos or claim their authorship.
export const openLessons: OpenLesson[] = [
  {
    id: "logarithms",
    title: "Logarifmlarni tushunamiz",
    subject: "Matematika",
    author: "Khan Academy",
    icon: "log₂ x",
    color: "#4F46E5",
    url: "https://www.khanacademy.org/math/algebra-home/alg-exp-and-log/v/logarithms",
    summary:
      "Daraja va logarifm orasidagi bog‘lanishni video misollar bilan o‘rganing. So‘ng matematika testida bilimingizni tekshiring.",
    language: "Inglizcha",
    quizId: "math-basics",
  },
  {
    id: "present-continuous",
    title: "Present continuous: hozirgi davomiy zamon",
    subject: "Ingliz tili",
    author: "British Council",
    icon: "am + ing",
    color: "#D97706",
    url: "https://learnenglishteens.britishcouncil.org/grammar/a1-a2-grammar/present-continuous",
    summary:
      "Hozir sodir bo‘layotgan harakatlar haqida gapirishni mashq qiling. Manbada video, matn va interaktiv mashqlar bor.",
    language: "Inglizcha",
    quizId: "english-basics",
  },
  {
    id: "newtons-law",
    title: "Nyutonning ikkinchi qonuni",
    subject: "Fizika",
    author: "Khan Academy",
    icon: "F = ma",
    color: "#0D9488",
    url: "https://www.khanacademy.org/v/newton-s-second-law-of-motion",
    summary:
      "Kuch, massa va tezlanish orasidagi bog‘lanishni o‘rganing. Formulani kundalik vaziyatlarga qo‘llab ko‘ring.",
    language: "Inglizcha",
    quizId: "physics-basics",
  },
];
export const clubs = [
  {
    id: "readers",
    title: "Kitobxonlar va Zakovat",
    subject: "Kitobxonlik",
    icon: "book-open" as const,
    color: "#6D4CD4",
    description:
      "O‘qigan kitoblaringizni muhokama qilish va mantiqiy savollar bilan mashq qilish uchun klub g‘oyasi.",
    eventId: undefined,
  },
  {
    id: "speaking",
    title: "English Speaking Society",
    subject: "Ingliz tili",
    icon: "mic" as const,
    color: "#2563EB",
    description:
      "Ingliz tilida erkin suhbat, munozara va yangi so‘zlarni amalda qo‘llash.",
    eventId: "speaking",
  },
  {
    id: "builders",
    title: "IT va loyiha ustaxonasi",
    subject: "IT",
    icon: "code" as const,
    color: "#0D9488",
    description:
      "Ilk portfoliongizni yarating, g‘oyalarni muhokama qiling va kichik loyihalar ustida ishlang.",
    eventId: "portfolio",
  },
];
