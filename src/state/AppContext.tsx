import { readAccountSettings } from "./account";
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
import { defaultFilters } from "./model";
import {
  DEMO_CODE,
  demoEmailAccount,
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
import {
  createEmailAuth,
  normalizeEmail,
  validEmail,
} from "../services/authFlow";
import {
  onOAuthRedirect,
  restoreOAuthRedirect,
  signInSocial,
  type SocialProvider,
} from "../services/auth";
import { createFileService } from "../services/files";
import type { AvatarPhoto } from "../services/avatar";

const storageKey = "@darsino/marketplace-v2";
const pendingRoleKey = "@darsino/pending-role";
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
  requestCode: (email: string) => Promise<void>;
  verifyCode: (code: string) => Promise<boolean>;
  signInWithProvider: (provider: SocialProvider) => Promise<void>;
  updateAvatar: (photo: AvatarPhoto | null) => Promise<void>;
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
  const authUserId = useRef<string | null>(null);
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
    if (!snapshot.user.onboarded)
      snapshot.user.role =
        userRef.current.role === "tutor" ? "tutor" : "student";
    if (generation === epoch.current && currentRevision === revision.current)
      adopt(snapshot);
  }, [adopt]);
  const loadLiveAccount = useCallback(async () => {
    const generation = epoch.current,
      currentRevision = revision.current;
    const { data, error } = await requireBackend().auth.getSession();
    if (error) throw error;
    if (!data.session) return;
    const snapshot = await fetchSnapshot();
    if (!snapshot.user.onboarded) {
      const requestedRole = await AsyncStorage.getItem(pendingRoleKey);
      snapshot.user.role = requestedRole === "tutor" ? "tutor" : "student";
      const name =
        data.session.user.user_metadata?.full_name ||
        data.session.user.user_metadata?.name;
      if (!snapshot.user.name && typeof name === "string")
        snapshot.user.name = name.slice(0, 100);
    }
    if (
      generation === epoch.current &&
      currentRevision === revision.current &&
      snapshot.user.id === data.session.user.id
    )
      adopt(snapshot);
  }, [adopt]);
  useEffect(() => {
    let live = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const client = supabase;
    const hydrate = () =>
      loadLiveAccount().catch((error) => {
        if (live) setSyncError(error.message);
      });
    const auth = client?.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        epoch.current++;
        authUserId.current = null;
        actorRef.current = null;
        marketRef.current = emptyMarketplace();
        userRef.current = { ...blankUser };
        setActorId(null);
        setCurrentUser(userRef.current);
        setMarket(marketRef.current);
      } else if (
        session &&
        (event === "SIGNED_IN" || event === "INITIAL_SESSION" || event === "TOKEN_REFRESHED" || event === "MFA_CHALLENGE_VERIFIED")
      ) {
        if (authUserId.current !== session.user.id) {
          authUserId.current = session.user.id;
          epoch.current++;
          actorRef.current = null;
          marketRef.current = emptyMarketplace();
          setActorId(null);
          setMarket(marketRef.current);
        }
        // Do not await Supabase methods inside its Auth callback (SDK lock).
        if (!actorRef.current)
          timer = setTimeout(() => {
            if (live) void hydrate();
          }, 0);
      }
    });
    const stopRedirect = client
      ? onOAuthRedirect(
          client,
          () => {
            if (live) void hydrate();
          },
          (error) => {
            if (live) setSyncError(error.message);
          },
        )
      : undefined;
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
        await restoreOAuthRedirect(requireBackend());
        if (live) await loadLiveAccount();
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
      epoch.current++;
      clearTimeout(timer);
      auth?.data.subscription.unsubscribe();
      stopRedirect?.();
    };
  }, [adopt, loadLiveAccount]);
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
        readAccountSettings(market.accountSettings?.[user.id]).lessonReminders &&
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
    return () => {
      clearInterval(timer);
      stopRealtime();
      subscription.remove();
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
  const requestCode = useCallback(async (value: string) => {
    const email = normalizeEmail(value);
    if (!validEmail(email))
      throw new Error("To‘g‘ri email manzilini kiriting.");
    await AsyncStorage.setItem(
      pendingRoleKey,
      userRef.current.role === "tutor" ? "tutor" : "student",
    );
    if (backendMode === "supabase") {
      await createEmailAuth(requireBackend()).request(email);
    }
    setCurrentUser((u) => ({ ...u, email }));
    userRef.current = { ...userRef.current, email };
  }, []);
  const verifyCode = useCallback(
    async (code: string) => {
      if (backendMode === "supabase") {
        await createEmailAuth(requireBackend()).verify(
          userRef.current.email || "",
          code,
        );
        await loadLiveAccount();
        return userRef.current.onboarded;
      }
      if (code !== DEMO_CODE)
        throw new Error(`Sinov rejimida kod: ${DEMO_CODE}`);
      const result = demoEmailAccount(
        marketRef.current,
        userRef.current.email || "",
        userRef.current.role,
      );
      adopt({ market: result.market, user: result.user });
      return result.user.onboarded;
    },
    [adopt, loadLiveAccount],
  );
  const signInWithProvider = useCallback(
    async (provider: SocialProvider) => {
      await AsyncStorage.setItem(
        pendingRoleKey,
        userRef.current.role === "tutor" ? "tutor" : "student",
      );
      if (backendMode === "demo") {
        const result = demoEmailAccount(
          marketRef.current,
          `${provider}@darsino.demo`,
          userRef.current.role,
        );
        adopt({ market: result.market, user: result.user });
        return;
      }
      if (await signInSocial(requireBackend(), provider))
        await loadLiveAccount();
    },
    [adopt, loadLiveAccount],
  );
  const updateAvatar = useCallback(
    (photo: AvatarPhoto | null): Promise<void> => {
      const generation = epoch.current,
        actor = actorRef.current;
      const operation = mutationQueue.current
        .catch(() => {})
        .then(async () => {
          if (
            !actor ||
            actor !== actorRef.current ||
            generation !== epoch.current
          )
            throw new Error("Avval akkauntga kiring.");
          revision.current++;
          if (backendMode === "demo") {
            const users = marketRef.current.users.map((u) =>
              u.id === actor ? { ...u, demoAvatarUri: photo?.previewUri } : u,
            );
            adopt({
              market: { ...marketRef.current, users },
              user: users.find((u) => u.id === actor)!,
            });
            return;
          }
          const files = createFileService(requireBackend());
          const previous = userRef.current.avatarFileId;
          const asset = photo
            ? await files.upload({
                purpose: "avatar",
                originalName: "avatar.jpg",
                mimeType: "image/jpeg",
                bytes: photo.bytes,
              })
            : null;
          if (generation !== epoch.current || actor !== actorRef.current)
            throw new Error("Akkaunt o‘zgardi. Rasmni qayta tanlang.");
          await files.setAvatar(asset?.id || null);
          revision.current++;
          const snapshot = await fetchSnapshot();
          if (generation === epoch.current && snapshot.user.id === actor)
            adopt(snapshot);
          if (
            previous &&
            previous !== asset?.id &&
            generation === epoch.current
          )
            await files.remove(previous).catch(() => {}); // Already detached; cleanup may be retried later.
        });
      mutationQueue.current = operation;
      return operation;
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
      await AsyncStorage.removeItem(pendingRoleKey);
    },
    [command],
  );
  const signOut = useCallback(async () => {
    if (supabase) {
      const { error } = await supabase.auth.signOut({ scope: "local" });
      if (error) throw new Error(error.message);
    }
    epoch.current++;
    authUserId.current = null;
    actorRef.current = null;
    userRef.current = { ...blankUser };
    setActorId(null);
    setCurrentUser({ ...blankUser });
    setCurrentFilters({ ...defaultFilters });
    setSyncError("");
    await AsyncStorage.removeItem(pendingRoleKey);
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
      setUser: (patch) => {
        const u = userRef.current;
        const next = {
          ...u,
          ...patch,
          id: u.id,
          onboarded: u.onboarded,
          role: u.onboarded ? u.role : patch.role || u.role,
        };
        userRef.current = next;
        setCurrentUser(next);
        if (!u.onboarded && patch.role)
          void AsyncStorage.setItem(
            pendingRoleKey,
            next.role === "tutor" ? "tutor" : "student",
          ).catch(() => setStorageError(true));
      },
      setFilters: (patch) => setCurrentFilters((f) => ({ ...f, ...patch })),
      refresh,
      requestCode,
      verifyCode,
      signInWithProvider,
      updateAvatar,
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
    signInWithProvider,
    updateAvatar,
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
