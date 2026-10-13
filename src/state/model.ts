export type User = {
  name: string;
  phone: string;
  city: string;
  role: "student" | "tutor" | "owner";
  interests: string[];
};
export type BookingRequest = {
  id: string;
  kind: "lesson" | "group" | "event" | "room";
  title: string;
  subtitle: string;
  time: string;
  status: "pending" | "approved";
  price?: number;
  conversationId?: string;
};
export type Message = {
  id: string;
  text: string;
  time: string;
  mine: boolean;
  file?: string;
};
export type Filters = {
  subject: string;
  area: string;
  mode: string;
  minPrice: number;
  maxPrice: number;
  minRating: number;
};
export type AppState = {
  signedIn: boolean;
  user: User;
  favorites: string[];
  requests: BookingRequest[];
  messages: Record<string, Message[]>;
  filters: Filters;
};
export const defaultFilters: Filters = {
  subject: "Ingliz tili",
  area: "Barcha tumanlar",
  mode: "Barchasi",
  minPrice: 50000,
  maxPrice: 150000,
  minRating: 4.5,
};
export const initialState: AppState = {
  signedIn: false,
  user: {
    name: "",
    phone: "",
    city: "Toshkent",
    role: "student",
    interests: ["Ingliz tili"],
  },
  favorites: [],
  requests: [],
  filters: defaultFilters,
  messages: {
    dilnoza: [
      {
        id: "d1",
        text: "Salom, Sardor! Bugun Speaking darsimiz 18:00 da. Tayyor bo‘lsangiz, shu yerga yozing.",
        time: "17:02",
        mine: false,
      },
      {
        id: "d2",
        text: "Salom, ustoz. Tayyorman! Qaysi mavzuni tayyorlab boray?",
        time: "17:05",
        mine: true,
      },
      {
        id: "d3",
        text: "Bugungi mavzu — “Travel”. Quyidagi mashqlarni ko‘rib chiqing.",
        time: "17:06",
        mine: false,
      },
      {
        id: "d4",
        text: "Speaking_practice.pdf",
        file: "Speaking_practice.pdf",
        time: "17:06",
        mine: false,
      },
      {
        id: "d5",
        text: "Rahmat, hozir ko‘rib chiqaman.",
        time: "17:07",
        mine: true,
      },
    ],
    ielts: [
      {
        id: "i1",
        text: "Ertangi mashg‘ulot: IELTS Writing Task 2. Daftaringizni olib keling.",
        time: "09:18",
        mine: false,
      },
    ],
    azizbek: [
      {
        id: "a1",
        text: "Ha, payshanba kuni bo‘sh vaqtim bor.",
        time: "Kecha",
        mine: false,
      },
    ],
    speaking: [
      {
        id: "s1",
        text: "17-oktabr uchun yangi dastur: Travel & Culture.",
        time: "Kecha",
        mine: false,
      },
    ],
  },
};
export type Action =
  | { type: "hydrate"; state: Partial<AppState> }
  | { type: "user"; user: Partial<User> }
  | { type: "login" }
  | { type: "logout" }
  | { type: "favorite"; id: string }
  | { type: "filters"; filters: Partial<Filters> }
  | { type: "request"; request: BookingRequest }
  | { type: "message"; conversation: string; message: Message };
export function appReducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "hydrate":
      return {
        ...state,
        ...action.state,
        user: { ...state.user, ...action.state.user },
        filters: { ...state.filters, ...action.state.filters },
      };
    case "user":
      return { ...state, user: { ...state.user, ...action.user } };
    case "login":
      return { ...state, signedIn: true };
    case "logout":
      return {
        ...initialState,
        messages: initialState.messages,
        user: { ...initialState.user },
      };
    case "favorite":
      return {
        ...state,
        favorites: state.favorites.includes(action.id)
          ? state.favorites.filter((id) => id !== action.id)
          : [...state.favorites, action.id],
      };
    case "filters":
      return { ...state, filters: { ...state.filters, ...action.filters } };
    case "request":
      return { ...state, requests: [action.request, ...state.requests] };
    case "message":
      return {
        ...state,
        messages: {
          ...state.messages,
          [action.conversation]: [
            ...(state.messages[action.conversation] || []),
            action.message,
          ],
        },
      };
  }
}
export function validPhone(value: string) {
  return /^[0-9]{9}$/.test(value.replace(/\D/g, ""));
}
export function initials(name: string) {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "SO"
  );
}
