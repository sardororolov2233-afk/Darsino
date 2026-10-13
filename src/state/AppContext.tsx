import React, {
  createContext,
  useContext,
  useEffect,
  useReducer,
  useState,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  appReducer,
  initialState,
  type AppState,
  type BookingRequest,
  type Filters,
  type User,
} from "./model";
type AppContextType = AppState & {
  ready: boolean;
  setUser: (user: Partial<User>) => void;
  completeOnboarding: () => void;
  signOut: () => void;
  toggleFavorite: (id: string) => void;
  setFilters: (filters: Partial<Filters>) => void;
  submitRequest: (request: Omit<BookingRequest, "id" | "status">) => string;
  sendMessage: (conversation: string, text: string) => void;
  storageError: boolean;
};
const Context = createContext<AppContextType | null>(null);
const storageKey = "@darsino/frontend-v1";
export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState(false);
  useEffect(() => {
    let live = true;
    AsyncStorage.getItem(storageKey)
      .then((raw) => {
        if (raw && live) {
          const parsed = JSON.parse(raw);
          if (
            typeof parsed?.signedIn === "boolean" &&
            parsed?.user &&
            Array.isArray(parsed?.favorites) &&
            Array.isArray(parsed?.requests) &&
            parsed?.messages
          )
            dispatch({ type: "hydrate", state: parsed });
        }
      })
      .catch(() => {
        if (live) setStorageError(true);
      })
      .finally(() => {
        if (live) setReady(true);
      });
    return () => {
      live = false;
    };
  }, []);
  useEffect(() => {
    if (ready)
      AsyncStorage.setItem(storageKey, JSON.stringify(state)).catch(() =>
        setStorageError(true),
      );
  }, [state, ready]);
  const value: AppContextType = {
    ...state,
    ready,
    storageError,
    setUser: (user) => dispatch({ type: "user", user }),
    completeOnboarding: () => dispatch({ type: "login" }),
    signOut: () => dispatch({ type: "logout" }),
    toggleFavorite: (id) => dispatch({ type: "favorite", id }),
    setFilters: (filters) => dispatch({ type: "filters", filters }),
    submitRequest: (request) => {
      const id = `request-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      dispatch({
        type: "request",
        request: { ...request, id, status: "pending" },
      });
      return id;
    },
    sendMessage: (conversation, text) => {
      const clean = text.trim();
      if (!clean) return;
      const time = new Intl.DateTimeFormat("uz-UZ", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Asia/Tashkent",
      }).format(new Date());
      dispatch({
        type: "message",
        conversation,
        message: { id: `message-${Date.now()}`, text: clean, time, mine: true },
      });
    },
  };
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useApp() {
  const context = useContext(Context);
  if (!context) throw new Error("useApp must be used within AppProvider");
  return context;
}
