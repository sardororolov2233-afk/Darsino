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
  difficulty?: string;
  participants?: string;
  reward?: string;
  questionsCount?: number;
};

export const diagnostics: Diagnostic[] = [
  {
    id: "math-basics",
    title: "DTM Kompleks Diagnostika (Matematika + Fizika)",
    subject: "Matematika",
    icon: "triangle",
    minutes: 45,
    difficulty: "O‘rta-Yuqori",
    participants: "4,520 o‘quvchi",
    reward: "+150 XP",
    questionsCount: 30,
    questions: [
      {
        text: "2x + 5 = 17 bo‘lsa, x² + 4 ning qiymatini toping.",
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
    title: "Ingliz tili Level Check & IELTS Radar",
    subject: "Ingliz tili",
    icon: "globe",
    minutes: 20,
    difficulty: "Moslashuvchan",
    participants: "8,190 o‘quvchi",
    reward: "+120 XP",
    questionsCount: 25,
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
    title: "Mantiqiy Fikrlash va IQ Skaneri",
    subject: "Mantiq",
    icon: "zap",
    minutes: 15,
    difficulty: "Qiziqarli",
    participants: "6,300 o‘quvchi",
    reward: "+200 XP",
    questionsCount: 15,
    questions: [
      {
        text: "Erkin tushish tezlanishi (g) Yerda taxminan nechaga teng?",
        options: ["8.2 m/s²", "9.8 m/s²", "12.4 m/s²", "6.5 m/s²"],
        correct: 1,
        skill: "Bilim",
        explanation: "g ≈ 9.8 m/s².",
      },
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
  duration?: string;
  views?: string;
  isLive?: boolean;
  live?: boolean;
  thumbnail?: string;
  badge?: string;
};

export const openLessons: OpenLesson[] = [
  {
    id: "logarithms",
    title: "Logarifm asoslari — ochiq video dars",
    subject: "Matematika",
    author: "Khan Academy",
    icon: "log₂ x",
    color: "#4F46E5",
    url: "https://www.khanacademy.org/math/algebra-home/alg-exp-and-log/v/logarithms",
    summary:
      "Daraja va logarifm orasidagi bog‘lanishni video misollar bilan o‘rganing. So‘ng matematika testida bilimingizni tekshiring.",
    language: "Inglizcha",
    quizId: "math-basics",
    thumbnail:
      "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=400&auto=format&fit=crop&q=80",
  },
  {
    id: "present-continuous",
    title: "Present continuous — grammatika darsi",
    subject: "Ingliz tili",
    author: "British Council",
    icon: "am + ing",
    color: "#D97706",
    url: "https://learnenglishteens.britishcouncil.org/grammar/a1-a2-grammar/present-continuous",
    summary:
      "British Council ochiq manbasida hozirgi davomiy zamonning qoidalari, misollari va mashqlari.",
    language: "Inglizcha",
    quizId: "english-basics",
    thumbnail:
      "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=400&auto=format&fit=crop&q=80",
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
      "Khan Academy ochiq video manbasida kuch, massa va tezlanish orasidagi bog‘lanishni o‘rganing.",
    language: "Inglizcha",
    quizId: "physics-basics",
    thumbnail:
      "https://images.unsplash.com/photo-1636466497217-26a8cbeaf0aa?w=400&auto=format&fit=crop&q=80",
  },
];

export const clubs = [
  {
    id: "readers",
    name: "Kitobxonlar & Zakovat Klubi",
    title: "Kitobxonlar & Zakovat Klubi",
    category: "Klub",
    subject: "Kitobxonlik",
    icon: "book-open" as const,
    color: "#6D4CD4",
    members: "1,240 a’zo",
    nextEvent: "Shanba, 16:00 • Toshkent Yoshlar Markazi",
    tag: "Bepul uchrashuv",
    description:
      "O‘qigan kitoblaringizni muhokama qilish va mantiqiy savollar bilan mashq qilish uchun klub.",
    eventId: "readers-club",
  },
  {
    id: "speaking",
    name: "English Debate & Speaking Society",
    title: "English Debate & Speaking Society",
    category: "Tadbir",
    subject: "Ingliz tili",
    icon: "mic" as const,
    color: "#2563EB",
    members: "2,850 a’zo",
    nextEvent: "Yakshanba, 14:00 • C-Space Coworking",
    tag: "IELTS 7.0+ spikerlar",
    description:
      "Ingliz tilida erkin suhbat, munozara va yangi so‘zlarni amalda qo‘llash.",
    eventId: "speaking-society",
  },
  {
    id: "builders",
    name: "Respublika Matematika & AI Olimpiadasi",
    title: "Respublika Matematika & AI Olimpiadasi",
    category: "Olimpiada",
    subject: "Matematika",
    icon: "award" as const,
    color: "#0D9488",
    members: "5,400 ishtirokchi",
    nextEvent: "25-Oktabr • Online & Offline final",
    tag: "Sovrin: 15,000,000 so‘m",
    description:
      "Katta diagnostik olimpiada va zamonaviy AI vositalaridan foydalanish bellashuvi.",
    eventId: "olympiad-math",
  },
];
