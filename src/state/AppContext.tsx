import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppState as NativeAppState, Platform } from "react-native";
import {
  blankUser,
  publicGroups,
  publicTutors,
  type MarketCommand,
  type Marketplace,
  type ProfileInput,
  type RequestInput,
  type TutorInput,
  type User,
  type Filters,
} from "./domain";
import { defaultFilters, validPhone } from "./model";
import {
  DEMO_CODE,
  demoAccount,
  demoMarketplace,
  emptyMarketplace,
} from "./demo";
import { applyMarketCommand } from "./marketplace";
import {
  backendMode,
  fetchSnapshot,
  mutateBackend,
  requireBackend,
  supabase,
  type Snapshot,
} from "../services/backend";
import {
  reconcileReminders,
  registerReminderHandler,
} from "../services/reminders";
import { migrateLegacyDemo, readDemoCache } from "./migration";
import { subscribeToMarketplace } from "../services/realtime";

const storageKey = "@darsino/marketplace-v2";
type AppContextType = {
  ready: boolean;
  signedIn: boolean;
  authenticated: boolean;
  user: User;
  market: Marketplace;
  mode: "demo" | "supabase";
  storageError: boolean;
  syncError: string;
  filters: Filters;
  tutors: ReturnType<typeof publicTutors>;
  groups: ReturnType<typeof publicGroups>;
  requests: Marketplace["applications"];
  favorites: string[];
  messages: Record<string, Marketplace["messages"]>;
  notifications: Marketplace["notifications"];
  setUser: (value: Partial<User>) => void;
  setFilters: (value: Partial<Filters>) => void;
  refresh: () => Promise<void>;
  requestCode: (phone: string) => Promise<void>;
  verifyCode: (code: string) => Promise<boolean>;
  completeOnboarding: (
    profile: ProfileInput,
    tutor?: TutorInput,
  ) => Promise<void>;
  command: (command: MarketCommand) => Promise<string | undefined>;
  signOut: () => Promise<void>;
  submitRequest: (request: RequestInput) => Promise<string>;
  sendMessage: (conversationId: string, text: string) => Promise<void>;
  toggleFavorite: (id: string) => Promise<void>;
};
const Context = createContext<AppContextType | null>(null);
export function AppProvider({ children }: { children: React.ReactNode }) {
  const [market, setMarket] = useState<Marketplace>(() =>
    backendMode === "demo" ? demoMarketplace() : emptyMarketplace(),
  );
  const [user, setCurrentUser] = useState<User>({ ...blankUser });
  const [actorId, setActorId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState(false);
  const [syncError, setSyncError] = useState("");
  const [filters, setCurrentFilters] = useState<Filters>({ ...defaultFilters });
  const marketRef = useRef(market),
    userRef = useRef(user),
    actorRef = useRef(actorId);
  const epoch = useRef(0),
    revision = useRef(0),
    mutationQueue = useRef<Promise<unknown>>(Promise.resolve()),
    writes = useRef<Promise<unknown>>(Promise.resolve());
  const reminderJobs = useRef<Promise<unknown>>(Promise.resolve());
  marketRef.current = market;
  userRef.current = user;
  actorRef.current = actorId;
  const adopt = useCallback((snapshot: Snapshot) => {
    marketRef.current = snapshot.market;
    userRef.current = snapshot.user;
    actorRef.current = snapshot.user.id;
    setMarket(snapshot.market);
    setCurrentUser(snapshot.user);
    setActorId(snapshot.user.id);
    setSyncError("");
  }, []);
  const refresh = useCallback(async () => {
    if (backendMode === "demo" || !actorRef.current) return;
    const generation = epoch.current,
      currentRevision = revision.current;
    const snapshot = await fetchSnapshot();
    if (generation === epoch.current && currentRevision === revision.current)
      adopt(snapshot);
  }, [adopt]);
  useEffect(() => {
    let live = true;
    const initialize = async () => {
      if (backendMode === "demo") {
        const raw = await AsyncStorage.getItem(storageKey);
        const legacy = raw
          ? null
          : await AsyncStorage.getItem("@darsino/frontend-v1");
        if ((!raw && !legacy) || !live) return;
        const value = raw ? readDemoCache(raw) : migrateLegacyDemo(legacy!);
        marketRef.current = value.market;
        setMarket(value.market);
        const active = value.market.users.find((u) => u.id === value.actorId);
        if (active) adopt({ market: value.market, user: active });
      } else {
        const { data, error } = await requireBackend().auth.getSession();
        if (error) throw error;
        if (data.session && live) {
          const snapshot = await fetchSnapshot();
          if (live) adopt(snapshot);
        }
      }
    };
    initialize()
      .catch((e) => {
        if (live) {
          if (backendMode === "demo") setStorageError(true);
          else setSyncError(e.message);
        }
      })
      .finally(() => {
        if (live) setReady(true);
      });
    return () => {
      live = false;
    };
  }, [adopt]);
  useEffect(() => {
    if (backendMode !== "demo" || !ready) return;
    const raw = JSON.stringify({ market, actorId });
    writes.current = writes.current
      .catch(() => {})
      .then(() => AsyncStorage.setItem(storageKey, raw))
      .catch(() => setStorageError(true));
  }, [market, actorId, ready]);
  useEffect(() => {
    registerReminderHandler().catch(() => {});
  }, []);
  const reminderPlan = JSON.stringify(
    market.sessions.filter(
      (s) =>
        user.role === "student" &&
        actorId &&
        market.enrollments.some(
          (e) =>
            e.studentId === actorId &&
            e.offeringId === s.offeringId &&
            e.active,
        ),
    ),
  );
  useEffect(() => {
    if (!ready) return;
    reminderJobs.current = reminderJobs.current
      .catch(() => {})
      .then(() => reconcileReminders(JSON.parse(reminderPlan)))
      .catch(() => {});
  }, [reminderPlan, ready]);
  useEffect(() => {
    const client = supabase;
    if (!client || !actorId) return;
    const sync = () => {
      refresh().catch((e) => setSyncError(e.message));
    };
    const timer = setInterval(sync, 15000);
    const stopRealtime = subscribeToMarketplace(client, actorId, sync);
    const subscription = NativeAppState.addEventListener("change", (state) => {
      if (state === "active") {
        client.auth.startAutoRefresh();
        sync();
      } else if (Platform.OS !== "web") client.auth.stopAutoRefresh();
    });
    const auth = client.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        epoch.current++;
        actorRef.current = null;
        setActorId(null);
        setCurrentUser({ ...blankUser });
        setMarket(emptyMarketplace());
      }
    });
    return () => {
      clearInterval(timer);
      stopRealtime();
      subscription.remove();
      auth.data.subscription.unsubscribe();
    };
  }, [actorId, refresh]);
  const command = useCallback(
    (value: MarketCommand): Promise<string | undefined> => {
      const generation = epoch.current;
      const operation = mutationQueue.current
        .catch(() => {})
        .then(async () => {
          const current = actorRef.current;
          if (!current || generation !== epoch.current)
            throw new Error("Avval akkauntga kiring.");
          revision.current++;
          if (backendMode === "demo") {
            const result = applyMarketCommand(
              marketRef.current,
              current,
              value,
            );
            const account = result.market.users.find((u) => u.id === current)!;
            adopt({ market: result.market, user: account });
            return result.id;
          }
          const result = await mutateBackend(value, current);
          revision.current++;
          if (generation === epoch.current) adopt(result);
          return result.id;
        });
      mutationQueue.current = operation;
      return operation;
    },
    [adopt],
  );
  const requestCode = useCallback(async (phone: string) => {
    if (!validPhone(phone))
      throw new Error(
        "+998 bilan boshlanadigan to‘g‘ri telefon raqamini kiriting.",
      );
    if (backendMode === "supabase") {
      const { error } = await requireBackend().auth.signInWithOtp({ phone });
      if (error) throw new Error(error.message);
    }
    setCurrentUser((u) => ({ ...u, phone }));
    userRef.current = { ...userRef.current, phone };
  }, []);
  const verifyCode = useCallback(
    async (code: string) => {
      if (backendMode === "supabase") {
        const requestedRole = userRef.current.role;
        const { error } = await requireBackend().auth.verifyOtp({
          phone: userRef.current.phone,
          token: code,
          type: "sms",
        });
        if (error)
          throw new Error(
            "Kod tasdiqlanmadi. SMSdagi kodni tekshiring yoki yangisini so‘rang.",
          );
        const snapshot = await fetchSnapshot();
        if (!snapshot.user.onboarded)
          snapshot.user.role = requestedRole === "tutor" ? "tutor" : "student";
        adopt(snapshot);
        return snapshot.user.onboarded;
      }
      if (code !== DEMO_CODE)
        throw new Error(`Sinov rejimida kod: ${DEMO_CODE}`);
      const result = demoAccount(
        marketRef.current,
        userRef.current.phone,
        userRef.current.role,
      );
      adopt({ market: result.market, user: result.user });
      return result.user.onboarded;
    },
    [adopt],
  );
  const completeOnboarding = useCallback(
    async (profile: ProfileInput, tutor?: TutorInput) => {
      await command({
        type: "profile",
        profile,
        role: userRef.current.role === "tutor" ? "tutor" : "student",
        tutor,
      });
    },
    [command],
  );
  const signOut = useCallback(async () => {
    if (supabase) {
      const { error } = await supabase.auth.signOut();
      if (error) throw new Error(error.message);
    }
    epoch.current++;
    actorRef.current = null;
    userRef.current = { ...blankUser };
    setActorId(null);
    setCurrentUser({ ...blankUser });
    setCurrentFilters({ ...defaultFilters });
    setSyncError("");
    if (backendMode === "supabase") {
      marketRef.current = emptyMarketplace();
      setMarket(marketRef.current);
    }
  }, []);
  const value = useMemo<AppContextType>(() => {
    const ownMessages = market.messages.filter(
      (m) => m.senderId === user.id || m.recipientId === user.id,
    );
    const messages: AppContextType["messages"] = {};
    for (const m of ownMessages)
      (messages[m.conversationId] ||= []).push({
        ...m,
        mine: m.senderId === user.id,
      });
    return {
      ready,
      signedIn: !!actorId && user.onboarded,
      authenticated: !!actorId,
      user,
      market,
      mode: backendMode,
      storageError,
      syncError,
      filters,
      tutors: publicTutors(market),
      groups: publicGroups(market),
      requests: market.applications.filter(
        (r) => r.studentId === user.id || r.tutorId === user.id,
      ),
      favorites: market.favorites[user.id] || [],
      messages,
      notifications: market.notifications
        .filter((n) => n.userId === user.id)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
      setUser: (patch) =>
        setCurrentUser((u) => ({
          ...u,
          ...patch,
          id: u.id,
          onboarded: u.onboarded,
          role: u.onboarded ? u.role : patch.role || u.role,
        })),
      setFilters: (patch) => setCurrentFilters((f) => ({ ...f, ...patch })),
      refresh,
      requestCode,
      verifyCode,
      completeOnboarding,
      command,
      signOut,
      submitRequest: async (request) => {
        const id = await command({ type: "request", request });
        if (!id) throw new Error("Ariza saqlanmadi.");
        return id;
      },
      sendMessage: async (conversationId, text) => {
        await command({ type: "message", conversationId, text });
      },
      toggleFavorite: async (id) => {
        await command({ type: "favorite", id });
      },
    };
  }, [
    ready,
    actorId,
    user,
    market,
    storageError,
    syncError,
    filters,
    refresh,
    requestCode,
    verifyCode,
    completeOnboarding,
    command,
    signOut,
  ]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useApp() {
  const context = useContext(Context);
  if (!context) throw new Error("useApp must be used within AppProvider");
  return context;
}
