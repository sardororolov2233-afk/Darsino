export interface Tutor {
  id: string;
  name: string;
  initials: string;
  subject: string;
  subjects?: string[];
  category?: string;
  specialty: string;
  rating: number;
  reviews: number;
  area: string;
  district?: string;
  price: number;
  priceText?: string;
  monthlyText?: string;
  experience: number;
  students: number;
  studentsCount?: number;
  verified: boolean;
  freeTrial?: boolean;
  bio: string;
  modes: string[];
  tags?: string[];
  passRate?: string;
  distance?: string;
  avatar?: string;
  coords?: { top: string; left: string };
}

export interface StudyGroup {
  id: string;
  title: string;
  subject: string;
  tutorId: string;
  tutor: string;
  students: number;
  capacity: number;
  spots: number;
  days: string;
  time: string;
  price: number;
  mode: string;
  area: string;
  location: string;
  benefits: string[];
  lessons: number;
  duration: number;
  level?: string;
  monthlyFee?: string;
  maxQuota?: number;
  mastery?: number;
  attendanceRate?: number;
  room?: string;
  isOpenForEnrollment?: boolean;
  nextTopic?: string;
  radarPoints?: string;
}

export interface PracticeEvent {
  id: string;
  title: string;
  category: string;
  day: string;
  month: string;
  date: string;
  time: string;
  area: string;
  location: string;
  host: string;
  price: number;
  spots: number;
  description: string;
  benefits: string[];
  members?: string;
  nextEvent?: string;
  color?: string;
  icon?: string;
  tag?: string;
}

export interface StudyRoom {
  id: string;
  title: string;
  name?: string;
  area: string;
  district?: string;
  location: string;
  address?: string;
  capacity: number;
  price: number;
  pricePerHour?: number;
  amenities: string[];
  rating?: number;
  reviews?: number;
  distance?: string;
  coords?: { top: string; left: string };
  image?: string;
  slots?: string[];
}

export const tutors: Tutor[] = [
  {
    id: "dilnoza",
    name: "Dilnoza Karimova",
    initials: "DK",
    subject: "Ingliz tili",
    category: "Ingliz tili",
    subjects: ["Ingliz tili"],
    specialty: "IELTS 8.5",
    rating: 4.9,
    reviews: 128,
    area: "Yunusobod",
    district: "Yunusobod",
    price: 90000,
    priceText: "90 000 so‘m / soat",
    monthlyText: "700 000 so‘m / oy",
    experience: 6,
    students: 240,
    studentsCount: 240,
    passRate: "98%",
    verified: true,
    freeTrial: true,
    modes: ["Oflayn", "Onlayn"],
    tags: ["#IELTS_8.0", "#Speaking_Club", "#CEFR_C1"],
    bio: "IELTS 8.5 sohibi. Har bir darsda gapirish, fikrni aniq ifodalash va individual fikr-mulohazaga e’tibor beraman.",
    avatar:
      "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80",
    coords: { top: "55%", left: "68%" },
  },
  {
    id: "akmal",
    name: "Akmal Yusupov",
    initials: "AY",
    subject: "Matematika",
    category: "Matematika",
    subjects: ["Matematika"],
    specialty: "Abituriyent",
    rating: 4.8,
    reviews: 92,
    area: "Chilonzor",
    district: "Chilonzor",
    price: 75000,
    priceText: "75 000 so‘m / soat",
    monthlyText: "600 000 so‘m / oy",
    experience: 5,
    students: 210,
    studentsCount: 210,
    passRate: "94%",
    verified: true,
    freeTrial: true,
    modes: ["Oflayn", "Onlayn"],
    tags: ["#DTM_2026", "#Matematika"],
    bio: "Murakkab masalalarni sodda usullar bilan yechamiz. Kirish imtihoniga tayyorgarlik va mavzularni mustahkamlash.",
    avatar:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
    coords: { top: "32%", left: "42%" },
  },
  {
    id: "sardor",
    name: "Sardor Aliyev",
    initials: "SA",
    subject: "Matematika & Mantiq",
    category: "Matematika",
    subjects: ["Matematika", "Mantiq"],
    specialty: "DTM & Olimpiada",
    rating: 4.9,
    reviews: 142,
    experience: 7,
    distance: "0.8 km",
    district: "Chilonzor",
    area: "Chilonzor",
    price: 80000,
    priceText: "80 000 so‘m / soat",
    monthlyText: "650 000 so‘m / oy",
    students: 340,
    studentsCount: 340,
    passRate: "96%",
    verified: true,
    freeTrial: true,
    modes: ["Oflayn", "Onlayn"],
    tags: ["#DTM_2026", "#Olimpiada", "#SAT_Math"],
    bio: "Xalqaro matematika olimpiadalari g‘olibi. 500+ o‘quvchisi WIUT, INHA va Milliy universitet talabasi bo‘lgan.",
    avatar:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
    coords: { top: "32%", left: "42%" },
  },
  {
    id: "malika",
    name: "Malika Karimova",
    initials: "MK",
    subject: "Ingliz tili (IELTS 8.5)",
    category: "Ingliz tili",
    subjects: ["Ingliz tili"],
    specialty: "IELTS 8.5",
    rating: 5.0,
    reviews: 218,
    experience: 6,
    distance: "1.4 km",
    district: "Yunusobod",
    area: "Yunusobod",
    price: 95000,
    priceText: "95 000 so‘m / soat",
    monthlyText: "750 000 so‘m / oy",
    students: 510,
    studentsCount: 510,
    passRate: "98%",
    verified: true,
    freeTrial: true,
    modes: ["Oflayn", "Onlayn"],
    tags: ["#IELTS_8.0", "#Speaking_Club", "#CEFR_C1"],
    bio: "CELTA sertifikatiga ega mutaxassis. Qisqa 3 oyda IELTS 7.0+ natijaga olib chiqish bo‘yicha maxsus metodika muallifi.",
    avatar:
      "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80",
    coords: { top: "55%", left: "68%" },
  },
  {
    id: "javohir-rustamov",
    name: "Javohir Rustamov",
    initials: "JR",
    subject: "Fizika va Astronomiya",
    category: "Fizika",
    subjects: ["Fizika", "Astronomiya"],
    specialty: "DTM Fizika",
    rating: 4.8,
    reviews: 89,
    experience: 5,
    distance: "2.1 km",
    district: "Mirzo Ulug‘bek",
    area: "Mirzo Ulug‘bek",
    price: 70000,
    priceText: "70 000 so‘m / soat",
    monthlyText: "550 000 so‘m / oy",
    students: 195,
    studentsCount: 195,
    passRate: "92%",
    verified: true,
    freeTrial: false,
    modes: ["Oflayn"],
    tags: ["#Fizika_DTM", "#Tajribalar", "#Texnika"],
    bio: "Murakkab fizika qonunlarini real hayotiy tajribalar va 3D simulyatsiyalar orqali juda sodda tilda tushuntiraman.",
    avatar:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
    coords: { top: "24%", left: "74%" },
  },
  {
    id: "azizbek-nurmatov",
    name: "Azizbek Nurmatov",
    initials: "AN",
    subject: "Python, AI & Frontend",
    category: "IT",
    subjects: ["IT", "Dasturlash"],
    specialty: "Senior Software Engineer",
    rating: 4.9,
    reviews: 164,
    experience: 4,
    distance: "1.1 km",
    district: "Shayxontohur",
    area: "Shayxontohur",
    price: 110000,
    priceText: "110 000 so‘m / soat",
    monthlyText: "850 000 so‘m / oy",
    students: 420,
    studentsCount: 420,
    passRate: "95%",
    verified: true,
    freeTrial: true,
    modes: ["Onlayn"],
    tags: ["#Python", "#Sun’iy_Intellekt", "#React"],
    bio: "Senior Software Engineer. O‘quvchilarga noldan dasturlash, algoritmlar va real startap loyihalar qilishni o‘rgataman.",
    avatar:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80",
    coords: { top: "66%", left: "28%" },
  },
  {
    id: "nilufar-saidova",
    name: "Nilufar Saidova",
    initials: "NS",
    subject: "Kimyo va Biologiya",
    category: "Kimyo",
    subjects: ["Kimyo", "Biologiya"],
    specialty: "Tibbiyot DTM",
    rating: 4.7,
    reviews: 74,
    experience: 8,
    distance: "3.2 km",
    district: "Yakkasaroy",
    area: "Yakkasaroy",
    price: 65000,
    priceText: "65 000 so‘m / soat",
    monthlyText: "500 000 so‘m / oy",
    students: 280,
    studentsCount: 280,
    passRate: "91%",
    verified: false,
    freeTrial: true,
    modes: ["Oflayn", "Onlayn"],
    tags: ["#Tibbiyot_DTM", "#Organik_Kimyo"],
    bio: "Tibbiyot oliygohlariga tayyorlovchi maxsus intensiv kurs ustozi. Har hafta diagnostik radar testlar o‘tkaziladi.",
    avatar:
      "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80",
    coords: { top: "44%", left: "20%" },
  },
];

export const groups: StudyGroup[] = [
  {
    id: "ielts",
    title: "IELTS 6.5+ guruhi",
    subject: "Ingliz tili",
    tutorId: "dilnoza",
    tutor: "Dilnoza Karimova",
    students: 9,
    capacity: 12,
    spots: 3,
    days: "Du · Chor · Ju",
    time: "18:00–19:30",
    price: 450000,
    mode: "Oflayn",
    area: "Yunusobod",
    location: "Study Hub, 2-xona",
    lessons: 12,
    duration: 90,
    benefits: [
      "Speaking uchun real vaziyatlar",
      "Writing bo‘yicha individual tahlil",
      "Haftalik sinov va fikr-mulohaza",
    ],
  },
  {
    id: "math",
    title: "Matematika: abituriyent",
    subject: "Matematika",
    tutorId: "akmal",
    tutor: "Akmal Yusupov",
    students: 7,
    capacity: 10,
    spots: 3,
    days: "Se · Pa · Sh",
    time: "16:00–17:30",
    price: 350000,
    mode: "Oflayn",
    area: "Chilonzor",
    location: "Ziyo Space, 1-xona",
    lessons: 12,
    duration: 90,
    benefits: [
      "Asosiy formulalar va masalalar",
      "Kirish imtihoniga tayyorgarlik",
      "Haftalik test va natijalar tahlili",
    ],
  },
  {
    id: "speaking",
    title: "Erkin inglizcha suhbat",
    subject: "Ingliz tili",
    tutorId: "dilnoza",
    tutor: "Javohir Abdullayev",
    students: 6,
    capacity: 10,
    spots: 4,
    days: "Se · Pa",
    time: "19:00–20:00",
    price: 280000,
    mode: "Onlayn",
    area: "Toshkent",
    location: "Onlayn uchrashuv",
    lessons: 8,
    duration: 60,
    benefits: [
      "Kundalik mavzularda erkin suhbat",
      "Talaffuz ustida ishlash",
      "Kichik guruhda ko‘proq amaliyot",
    ],
  },
  {
    id: "g1",
    title: "DTM-101 Intensiv (Aniq fanlar)",
    subject: "Matematika",
    tutorId: "sardor",
    tutor: "Aliyev Temur",
    level: "Abituriyent Pro",
    students: 18,
    capacity: 20,
    spots: 2,
    days: "Du · Chor · Ju",
    time: "14:00–16:00",
    price: 650000,
    mode: "Oflayn",
    area: "Chilonzor",
    location: "Chilonzor C-Space, 204-xona",
    room: "Chilonzor C-Space, 204-xona",
    monthlyFee: "650 000 so‘m",
    isOpenForEnrollment: true,
    nextTopic: "Logarifmik tengsizliklar tizimi",
    radarPoints: "100,20 168,62 142,140 60,136 35,64",
    mastery: 89,
    attendanceRate: 95,
    lessons: 12,
    duration: 120,
    benefits: [
      "Logarifm va hosila amaliyoti",
      "Haftalik diagnostik test",
      "Individual yondashuv",
    ],
  },
  {
    id: "g2",
    title: "Milliy Sertifikat A+ Guruhi",
    subject: "Matematika",
    tutorId: "sardor",
    tutor: "Aliyev Temur",
    level: "Yuqori bosqich",
    students: 16,
    capacity: 16,
    spots: 0,
    days: "Se · Pa · Sh",
    time: "16:00–18:00",
    price: 750000,
    mode: "Oflayn",
    area: "Yunusobod",
    location: "Yunusobod EduHub, 12-xona",
    room: "Yunusobod EduHub, 12-xona",
    monthlyFee: "750 000 so‘m",
    isOpenForEnrollment: false,
    nextTopic: "Hosila va integralning fizik tatbiqi",
    radarPoints: "100,15 172,60 148,144 54,142 30,60",
    mastery: 93,
    attendanceRate: 98,
    lessons: 12,
    duration: 120,
    benefits: [
      "A+ sertifikat kafolati",
      "Olimpiada darajasidagi masalalar",
      "Mantiq va tahlil darslari",
    ],
  },
  {
    id: "g3",
    title: "SAT Math & Olimpiada (8-10 sinf)",
    subject: "Matematika",
    tutorId: "sardor",
    tutor: "Aliyev Temur",
    level: "Xalqaro daraja",
    students: 24,
    capacity: 30,
    spots: 6,
    days: "Du · Chor · Ju",
    time: "18:30–20:00",
    price: 600000,
    mode: "Onlayn",
    area: "Toshkent",
    location: "O‘qi Live Studio (Zoom/Interactive)",
    room: "O‘qi Live Studio (Zoom/Interactive)",
    monthlyFee: "600 000 so‘m",
    isOpenForEnrollment: true,
    nextTopic: "Combinatorics & Probability Tricks",
    radarPoints: "100,28 158,68 135,134 65,130 42,68",
    mastery: 84,
    attendanceRate: 91,
    lessons: 12,
    duration: 90,
    benefits: [
      "English medium math",
      "Desmos calculator shortcuts",
      "Mock SAT test har hafta",
    ],
  },
  {
    id: "g4",
    title: "5-7 sinf Prezident Maktabi Tayyorlov",
    subject: "Matematika",
    tutorId: "sardor",
    tutor: "Aliyev Temur",
    level: "Boshlang‘ich Olimpiada",
    students: 14,
    capacity: 15,
    spots: 1,
    days: "Se · Pa · Sh",
    time: "11:30–13:00",
    price: 550000,
    mode: "Oflayn",
    area: "Chilonzor",
    location: "Chilonzor C-Space, 105-xona",
    room: "Chilonzor C-Space, 105-xona",
    monthlyFee: "550 000 so‘m",
    isOpenForEnrollment: true,
    nextTopic: "Matnli va harakatga doir masalalar",
    radarPoints: "100,32 152,72 130,130 70,132 45,70",
    mastery: 81,
    attendanceRate: 94,
    lessons: 12,
    duration: 90,
    benefits: [
      "Tanqidiy fikrlash",
      "Mantiqiy jumboqlar",
      "Prezident maktabi namuna testlari",
    ],
  },
];

export const events: PracticeEvent[] = [
  {
    id: "readers-club",
    title: "Kitobxonlar & Zakovat Klubi",
    category: "Klub",
    day: "17",
    month: "OKT",
    date: "17 oktabr, shanba",
    time: "16:00–18:00",
    area: "Mirobod",
    location: "Toshkent Yoshlar Markazi",
    host: "Aliyev Temur",
    price: 0,
    spots: 30,
    members: "1,240 a’zo",
    nextEvent: "Shanba, 16:00 • Toshkent Yoshlar Markazi",
    color: "from-violet-600 to-purple-700",
    icon: "📚",
    tag: "Bepul uchrashuv",
    description:
      "Kitobxonlik, mantiqiy savollar va intelektual o‘yinlar do‘stona muhitda.",
    benefits: ["Kitob taqdimotlari", "Zakovat turniri", "Yangi tanishlar"],
  },
  {
    id: "speaking-society",
    title: "English Debate & Speaking Society",
    category: "Tadbir",
    day: "18",
    month: "OKT",
    date: "18 oktabr, yakshanba",
    time: "14:00–16:00",
    area: "Chilonzor",
    location: "C-Space Coworking",
    host: "Malika Karimova",
    price: 0,
    spots: 25,
    members: "2,850 a’zo",
    nextEvent: "Yakshanba, 14:00 • C-Space Coworking",
    color: "from-blue-600 to-indigo-700",
    icon: "🎙️",
    tag: "IELTS 7.0+ spikerlar",
    description:
      "IELTS speaking amaliyoti, munozaralar va erkin muloqot klubi.",
    benefits: [
      "Native speaker feedback",
      "Debat texnikalari",
      "Vocabulary boosting",
    ],
  },
  {
    id: "olympiad-math",
    title: "Respublika Matematika & AI Olimpiadasi",
    category: "Olimpiada",
    day: "25",
    month: "OKT",
    date: "25 oktabr, yakshanba",
    time: "10:00–14:00",
    area: "Mirobod",
    location: "Online & Offline final",
    host: "Sardor Aliyev",
    price: 35000,
    spots: 100,
    members: "5,400 ishtirokchi",
    nextEvent: "25-Oktabr • Online & Offline final",
    color: "from-emerald-500 to-teal-700",
    icon: "🏆",
    tag: "Sovrin: 15,000,000 so‘m",
    description:
      "Katta diagnostik olimpiada va AI vositalaridan foydalanish bo‘yicha bellashuv.",
    benefits: [
      "Diplom va sertifikat",
      "Pul mukofoti",
      "Iqtidorli o‘quvchilar reytingi",
    ],
  },
  {
    id: "speaking",
    title: "Speaking club: erkin suhbat",
    category: "Amaliy mashg‘ulot",
    day: "17",
    month: "OKT",
    date: "17 oktabr, shanba",
    time: "15:00–17:00",
    area: "Yunusobod",
    location: "Yoshlar markazi",
    host: "Dilnoza Karimova",
    price: 0,
    spots: 6,
    description:
      "Qiziqarli mavzular, yangi tanishlar va ingliz tilida gapirish uchun qulay muhit. B1–B2 daraja uchun.",
    benefits: [
      "Real vaziyatlar asosidagi mashqlar",
      "Juftlik va kichik guruhdagi suhbat",
      "Tadbirdan keyin fikr-mulohaza",
    ],
  },
  {
    id: "marketing",
    title: "Marketing amaliyoti: mini-loyiha yarating",
    category: "Amaliyot",
    day: "18",
    month: "OKT",
    date: "18 oktabr, yakshanba",
    time: "14:00–17:00",
    area: "Chilonzor",
    location: "Ziyo Space",
    host: "Madina Rasulova",
    price: 35000,
    spots: 8,
    description:
      "Haqiqiy brend uchun kichik marketing loyihasini yarating. G‘oyadan taqdimotgacha tajribali mentor bilan birga ishlang.",
    benefits: [
      "Amaliy marketing vazifalari",
      "Jamoa bilan loyiha yaratish",
      "Mentordan individual tavsiyalar",
    ],
  },
  {
    id: "portfolio",
    title: "Birinchi portfolio: IT masterklass",
    category: "Masterklass",
    day: "19",
    month: "OKT",
    date: "19 oktabr, dushanba",
    time: "17:00–19:00",
    area: "Mirzo Ulug‘bek",
    location: "IT Park",
    host: "Javohir Abdullayev",
    price: 50000,
    spots: 12,
    description:
      "Birinchi IT portfoliongizni tuzing, loyihalaringizni taqdim etishni o‘rganing va ish qidirish uchun amaliy tavsiyalar oling.",
    benefits: [
      "Portfolio tuzilishi va dizayni",
      "Loyihalarni taqdim etish",
      "Mutaxassisdan fikr-mulohaza",
    ],
  },
];

export const rooms: StudyRoom[] = [
  {
    id: "r1",
    title: "Chilonzor Smart Edu-Hub (204-xona)",
    name: "Chilonzor Smart Edu-Hub (204-xona)",
    area: "Chilonzor",
    district: "Chilonzor",
    location: "Chilonzor metro bekati yonida, Integro 3-qavat",
    address: "Chilonzor metro bekati yonida, Integro 3-qavat",
    capacity: 22,
    price: 60000,
    pricePerHour: 60000,
    rating: 4.9,
    reviews: 84,
    distance: "0.6 km",
    coords: { top: "36%", left: "38%" },
    image:
      "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=400&auto=format&fit=crop&q=80",
    amenities: [
      'Interaktiv doska 75"',
      "Konditsioner",
      "Optik Wi-Fi",
      "Kofe-breyk",
      "Proyektor",
    ],
    slots: ["09:00 - 11:00", "14:00 - 16:00", "16:00 - 18:00", "18:30 - 20:30"],
  },
  {
    id: "study-hub",
    title: "Study Hub · 2-xona",
    name: "Study Hub · 2-xona",
    area: "Yunusobod",
    district: "Yunusobod",
    location: "Toshkent, Yunusobod · Bodomzor",
    address: "Toshkent, Yunusobod · Bodomzor",
    capacity: 12,
    price: 80000,
    pricePerHour: 80000,
    rating: 4.9,
    reviews: 84,
    distance: "0.6 km",
    coords: { top: "36%", left: "38%" },
    amenities: ["Wi-Fi", "Doska", "Konditsioner"],
  },
  {
    id: "yunusobod-cspace",
    title: "Yunusobod C-Space Classroom #12",
    name: "Yunusobod C-Space Classroom #12",
    area: "Yunusobod",
    district: "Yunusobod",
    location: "Amir Temur shoh ko‘chasi, Bodomzor bekati",
    address: "Amir Temur shoh ko‘chasi, Bodomzor bekati",
    capacity: 16,
    price: 55000,
    pricePerHour: 55000,
    rating: 5.0,
    reviews: 112,
    distance: "1.8 km",
    coords: { top: "25%", left: "66%" },
    image:
      "https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&auto=format&fit=crop&q=80",
    amenities: [
      "Proyektor HD",
      "Magnit doska",
      "Wi-Fi 5G",
      "Chiroq generatori",
    ],
    slots: ["10:00 - 12:00", "14:00 - 16:00", "17:00 - 19:00"],
  },
  {
    id: "oybek-lektoriy",
    title: "Oybek Akademik Lektoriy Zali",
    name: "Oybek Akademik Lektoriy Zali",
    area: "Mirobod",
    district: "Mirobod",
    location: "Oybek metro, Business Plaza 2-qavat",
    address: "Oybek metro, Business Plaza 2-qavat",
    capacity: 45,
    price: 95000,
    pricePerHour: 95000,
    rating: 4.8,
    reviews: 67,
    distance: "2.4 km",
    coords: { top: "62%", left: "54%" },
    image:
      "https://images.unsplash.com/photo-1517502884422-41eaead166d4?w=400&auto=format&fit=crop&q=80",
    amenities: [
      "LED Ekran + Mikrofon",
      "45 o‘rindiq",
      "Konditsioner",
      "Olimpiada uchun mos",
    ],
    slots: ["11:00 - 13:00", "15:00 - 17:00", "17:00 - 19:00"],
  },
  {
    id: "beruniy-coworking",
    title: "Beruniy Talabalar Co-working Xonasi",
    name: "Beruniy Talabalar Co-working Xonasi",
    area: "Shayxontohur",
    district: "Shayxontohur",
    location: "Beruniy metro, Universitet ko‘chasi 14-uy",
    address: "Beruniy metro, Universitet ko‘chasi 14-uy",
    capacity: 14,
    price: 45000,
    pricePerHour: 45000,
    rating: 4.7,
    reviews: 49,
    distance: "3.1 km",
    coords: { top: "48%", left: "22%" },
    image:
      "https://images.unsplash.com/photo-1577896851231-70ef18881754?w=400&auto=format&fit=crop&q=80",
    amenities: ["Doska + Markerlar", "Wi-Fi", "Arzon narx", "Suv kulleri"],
    slots: ["08:30 - 10:30", "13:30 - 15:30", "16:00 - 18:00"],
  },
  {
    id: "ziyo",
    title: "Ziyo Space · 1-xona",
    name: "Ziyo Space · 1-xona",
    area: "Chilonzor",
    district: "Chilonzor",
    location: "Toshkent, Chilonzor · 6-kvartal",
    address: "Toshkent, Chilonzor · 6-kvartal",
    capacity: 8,
    price: 60000,
    pricePerHour: 60000,
    amenities: ["Wi-Fi", "Proyektor", "Doska"],
  },
];

export const INITIAL_TEACHER_STUDENTS = [
  {
    id: "s1",
    name: "Jasurbek Rahimov",
    groupId: "g1",
    groupName: "DTM-101 Intensiv",
    avatar:
      "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80",
    mastery: 94,
    trend: "+8%",
    status: "present" as "present" | "late" | "absent",
    weakTopic: "Ehtimollar nazariyasi",
    needsAttention: false,
    xp: 1450,
  },
  {
    id: "s2",
    name: "Madina Otaboyeva",
    groupId: "g1",
    groupName: "DTM-101 Intensiv",
    avatar:
      "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=120&auto=format&fit=crop&q=80",
    mastery: 91,
    trend: "+6%",
    status: "present" as "present" | "late" | "absent",
    weakTopic: "Stereometriya",
    needsAttention: false,
    xp: 1390,
  },
  {
    id: "s3",
    name: "Bekzod Tursunov",
    groupId: "g1",
    groupName: "DTM-101 Intensiv",
    avatar:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&auto=format&fit=crop&q=80",
    mastery: 62,
    trend: "-7%",
    status: "absent" as "present" | "late" | "absent",
    weakTopic: "Trigonometriya va Logarifm",
    needsAttention: true,
    xp: 780,
  },
  {
    id: "s4",
    name: "Nilufar Karimova",
    groupId: "g3",
    groupName: "SAT Math & Olimpiada",
    avatar:
      "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=120&auto=format&fit=crop&q=80",
    mastery: 67,
    trend: "-4%",
    status: "late" as "present" | "late" | "absent",
    weakTopic: "Funksiyalar grafigi",
    needsAttention: true,
    xp: 890,
  },
  {
    id: "s5",
    name: "Sardorbek Yo‘ldoshev",
    groupId: "g2",
    groupName: "Milliy Sertifikat A+",
    avatar:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80",
    mastery: 97,
    trend: "+11%",
    status: "present" as "present" | "late" | "absent",
    weakTopic: "Yo‘q (A’lo)",
    needsAttention: false,
    xp: 1820,
  },
];

export const INITIAL_BOOKINGS = [
  {
    id: "b1",
    roomName: "Chilonzor Smart Edu-Hub (204-xona)",
    groupName: "DTM-101 Intensiv (Aniq fanlar)",
    date: "Dush • Chor • Jum (Doimiy abonement)",
    timeSlot: "14:00 - 16:00",
    totalPrice: "120 000 so‘m / dars",
    status: "Tasdiqlangan",
  },
];

export const INITIAL_TEACHER_CLUBS = [
  {
    id: "c1",
    title: "Yakshanbalik Matematika & IQ Zakovat Klubi",
    type: "Doimiy klub",
    schedule: "Har yakshanba, 15:00",
    location: "Chilonzor Smart Edu-Hub (204-xona)",
    membersCount: 68,
    pendingRequests: 14,
    fee: "Bepul (O‘z o‘quvchilarim va yangi nomzodlar uchun)",
    badge: "Faol klub 🔥",
    color: "from-indigo-600 to-violet-700",
    colorHex: "#4F46E5",
    icon: "🧠",
  },
  {
    id: "c2",
    title: "DTM-2026 Katta Diagnostik Mock Olimpiadasi",
    type: "Olimpiada & Seminar",
    schedule: "25-Oktabr, 10:00",
    location: "Oybek Akademik Lektoriy Zali (45 o‘rin)",
    membersCount: 42,
    pendingRequests: 9,
    fee: "35 000 so‘m (Sovrin jamg‘armasi bilan)",
    badge: "Tez kunda 🏆",
    color: "from-emerald-600 to-teal-700",
    colorHex: "#0D9488",
    icon: "🏆",
  },
];

export const TRENDING_TAGS = [
  "#IELTS_8.0",
  "#DTM_Matematika",
  "#Bepul_Sinov_Darsi",
  "#Fizika_Olimpiada",
  "#Python_AI",
  "#Speaking_Club",
];

export const formatPrice = (price: number) =>
  `${String(price).replace(/\B(?=(\d{3})+(?!\d))/g, " ")} so‘m`;
