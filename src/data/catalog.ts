export interface Tutor {
  id: string;
  name: string;
  initials: string;
  subject: string;
  specialty: string;
  rating: number;
  reviews: number;
  area: string;
  price: number;
  experience: number;
  students: number;
  verified: boolean;
  bio: string;
  modes: string[];
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
}
export interface StudyRoom {
  id: string;
  title: string;
  area: string;
  location: string;
  capacity: number;
  price: number;
  amenities: string[];
}

export const tutors: Tutor[] = [
  {
    id: "dilnoza",
    name: "Dilnoza Karimova",
    initials: "DK",
    subject: "Ingliz tili",
    specialty: "IELTS",
    rating: 4.9,
    reviews: 128,
    area: "Yunusobod",
    price: 90000,
    experience: 6,
    students: 240,
    verified: true,
    modes: ["Oflayn", "Onlayn"],
    bio: "IELTS 8.5. Har bir darsda gapirish, fikrni aniq ifodalash va individual fikr-mulohazaga e’tibor beraman.",
  },
  {
    id: "azizbek",
    name: "Azizbek Komilov",
    initials: "AK",
    subject: "Ingliz tili",
    specialty: "CEFR",
    rating: 4.8,
    reviews: 76,
    area: "Mirzo Ulug‘bek",
    price: 80000,
    experience: 4,
    students: 180,
    verified: true,
    modes: ["Oflayn", "Onlayn"],
    bio: "CEFR imtihoniga tayyorlanish, grammatika va so‘z boyligini rivojlantirish. Sizning maqsadingizga mos individual darslar.",
  },
  {
    id: "javohir",
    name: "Javohir Abdullayev",
    initials: "JA",
    subject: "Ingliz tili",
    specialty: "Speaking",
    rating: 4.9,
    reviews: 64,
    area: "Chilonzor",
    price: 70000,
    experience: 5,
    students: 160,
    verified: true,
    modes: ["Onlayn"],
    bio: "Kundalik suhbat va erkin gapirish uchun amaliy ingliz tili. Qiziqarli mavzular orqali o‘zingizga ishonch bilan so‘zlang.",
  },
  {
    id: "akmal",
    name: "Akmal Yusupov",
    initials: "AY",
    subject: "Matematika",
    specialty: "Abituriyent",
    rating: 4.8,
    reviews: 92,
    area: "Chilonzor",
    price: 75000,
    experience: 5,
    students: 210,
    verified: true,
    modes: ["Oflayn", "Onlayn"],
    bio: "Murakkab masalalarni sodda usullar bilan yechamiz. Kirish imtihoniga tayyorgarlik va mavzularni mustahkamlash uchun individual yondashuv.",
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
    tutorId: "javohir",
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
];

export const events: PracticeEvent[] = [
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
    id: "study-hub",
    title: "Study Hub · 2-xona",
    area: "Yunusobod",
    location: "Toshkent, Yunusobod · 12-mavze",
    capacity: 12,
    price: 80000,
    amenities: ["Wi-Fi", "Proyektor"],
  },
  {
    id: "ziyo",
    title: "Ziyo Space · 1-xona",
    area: "Chilonzor",
    location: "Toshkent, Chilonzor · 6-kvartal",
    capacity: 8,
    price: 60000,
    amenities: ["Wi-Fi", "Proyektor", "Doska"],
  },
];

export const formatPrice = (price: number) =>
  `${String(price).replace(/\B(?=(\d{3})+(?!\d))/g, " ")} so‘m`;
