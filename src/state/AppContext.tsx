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
import * as Crypto from "expo-crypto";
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
  DEMO_TUTOR_EMAIL,
  DEMO_TUTOR_PHONE,
  DEMO_MODERATOR_EMAIL,
  DEMO_MODERATOR_PHONE,
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
  requireActorBackend,
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
  createPasswordAuth,
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
import { createSnapshotGate } from "../services/snapshotGate";
import type { AvatarPhoto } from "../services/avatar";
import { createDemoPasswordAuth } from "../services/demoPasswordAuth";

const storageKey = "@darsino/marketplace-v2";
const pendingRoleKey = "@darsino/pending-role";
const demoPasswordAuth = createDemoPasswordAuth({
  storage: AsyncStorage,
  hash: (value) =>
    Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, value),
  createSalt: () => Crypto.randomUUID(),
});
function knownDemoEmails(market: Marketplace) {
  return market.users.flatMap((user) => [
    ...(user.email ? [user.email] : []),
    ...(user.phone === DEMO_TUTOR_PHONE ? [DEMO_TUTOR_EMAIL] : []),
    ...(user.phone === DEMO_MODERATOR_PHONE ? [DEMO_MODERATOR_EMAIL] : []),
  ]);
}
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
  signUpWithPassword: (
    email: string,
    password: string,
    confirmation: string,
  ) => Promise<void>;
  signInWithPassword: (email: string, password: string) => Promise<void>;
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
  const snapshotGate = useRef(createSnapshotGate());
  const authUserId = useRef<string | null>(null);
  const passwordAttempt = useRef(0);
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
    const actor = actorRef.current;
    const ticket = snapshotGate.current.begin({
      epoch: epoch.current,
      revision: revision.current,
    });
    try {
      const snapshot = await fetchSnapshot();
      if (!snapshot.user.onboarded)
        snapshot.user.role =
          userRef.current.role === "tutor" ? "tutor" : "student";
      if (
        snapshot.user.id === actor &&
        snapshotGate.current.accept(ticket, {
          epoch: epoch.current,
          revision: revision.current,
        })
      )
        adopt(snapshot);
    } catch (error) {
      if (
        !snapshotGate.current.accept(ticket, {
          epoch: epoch.current,
          revision: revision.current,
        })
      )
        return;
      setSyncError(
        error instanceof Error ? error.message : "Sinxronlashda xato.",
      );
      throw error;
    }
  }, [adopt]);
  const loadLiveAccount = useCallback(async () => {
    const ticket = snapshotGate.current.begin({
      epoch: epoch.current,
      revision: revision.current,
    });
    try {
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
        snapshot.user.id === data.session.user.id &&
        snapshotGate.current.accept(ticket, {
          epoch: epoch.current,
          revision: revision.current,
        })
      )
        adopt(snapshot);
    } catch (error) {
      if (
        !snapshotGate.current.accept(ticket, {
          epoch: epoch.current,
          revision: revision.current,
        })
      )
        return;
      setSyncError(
        error instanceof Error ? error.message : "Akkauntni yuklab bo‘lmadi.",
      );
      throw error;
    }
  }, [adopt]);
  useEffect(() => {
    let live = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const client = supabase;
    const hydrate = () => loadLiveAccount().catch(() => {});
    const auth = client?.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        passwordAttempt.current++;
        epoch.current++;
        authUserId.current = null;
        actorRef.current = null;
        marketRef.current = emptyMarketplace();
        userRef.current = { ...blankUser };
        setActorId(null);
        setCurrentUser(userRef.current);
        setMarket(marketRef.current);
        setSyncError("");
        setCurrentFilters({ ...defaultFilters });
      } else if (
        session &&
        (event === "SIGNED_IN" ||
          event === "INITIAL_SESSION" ||
          event === "TOKEN_REFRESHED" ||
          event === "MFA_CHALLENGE_VERIFIED")
      ) {
        if (authUserId.current !== session.user.id) {
          authUserId.current = session.user.id;
          epoch.current++;
          actorRef.current = null;
          marketRef.current = emptyMarketplace();
          userRef.current = { ...blankUser };
          setActorId(null);
          setCurrentUser(userRef.current);
          setMarket(marketRef.current);
          setSyncError("");
          setCurrentFilters({ ...defaultFilters });
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
            if (live && !actorRef.current) setSyncError(error.message);
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
    const initialEpoch = epoch.current;
    initialize()
      .catch((e) => {
        if (live) {
          if (backendMode === "demo") setStorageError(true);
          else if (epoch.current === initialEpoch) setSyncError(e.message);
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
        readAccountSettings(market.accountSettings?.[user.id])
          .lessonReminders &&
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
      void refresh().catch(() => {});
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
          let ticket: ReturnType<typeof snapshotGate.current.begin> | undefined;
          const result = await mutateBackend(
            value,
            current,
            () => generation === epoch.current && actorRef.current === current,
            () => {
              ticket = snapshotGate.current.begin({
                epoch: epoch.current,
                revision: revision.current,
              });
            },
          );
          if (generation !== epoch.current || actorRef.current !== current)
            throw new Error("Akkaunt o‘zgardi. Amalni qayta boshlang.");
          const apply =
            ticket &&
            snapshotGate.current.accept(ticket, {
              epoch: epoch.current,
              revision: revision.current,
            });
          // Invalidate reads started during this command, including when its
          // own response loses to an already settled, newer refresh.
          revision.current++;
          if (result.user.id !== current)
            throw new Error("Server boshqa akkaunt ma’lumotini qaytardi.");
          if (apply) adopt(result);
          return result.id;
        });
      mutationQueue.current = operation;
      return operation;
    },
    [adopt],
  );
  const authenticateWithPassword = useCallback(
    async (
      kind: "signup" | "signin",
      value: string,
      password: string,
      confirmation?: string,
    ) => {
      const attempt = ++passwordAttempt.current;
      const email = normalizeEmail(value);
      const requestedRole = userRef.current.role;
      if (!validEmail(email))
        throw new Error("To‘g‘ri email manzilini kiriting.");
      const assertCurrent = () => {
        if (passwordAttempt.current !== attempt)
          throw new Error("Akkaunt o‘zgardi. Amalni qayta boshlang.");
      };
      await AsyncStorage.setItem(
        pendingRoleKey,
        requestedRole === "tutor" ? "tutor" : "student",
      );
      assertCurrent();
      if (backendMode === "demo") {
        const known = knownDemoEmails(marketRef.current);
        if (kind === "signup")
          await demoPasswordAuth.signUp(
            email,
            password,
            confirmation ?? "",
            known,
          );
        else await demoPasswordAuth.signIn(email, password, known);
        assertCurrent();
        const result = demoEmailAccount(
          marketRef.current,
          email,
          requestedRole,
        );
        adopt({ market: result.market, user: result.user });
        return;
      }
      const client = requireBackend();
      const auth = createPasswordAuth(client);
      const result =
        kind === "signup"
          ? await auth.signUp(email, password, confirmation ?? "")
          : await auth.signIn(email, password);
      assertCurrent();
      if (
        !result.session ||
        !result.user ||
        result.session.user.id !== result.user.id
      )
        throw new Error(
          "Kirish sessiyasi olinmadi. Email va parol bilan qayta kiring.",
        );
      const current = await client.auth.getSession();
      assertCurrent();
      if (current.error) throw new Error(current.error.message);
      if (current.data.session?.user.id !== result.user.id)
        throw new Error("Akkaunt o‘zgardi. Amalni qayta boshlang.");
      await loadLiveAccount();
      assertCurrent();
    },
    [adopt, loadLiveAccount],
  );
  const signUpWithPassword = useCallback(
    (email: string, password: string, confirmation: string) =>
      authenticateWithPassword("signup", email, password, confirmation),
    [authenticateWithPassword],
  );
  const signInWithPassword = useCallback(
    (email: string, password: string) =>
      authenticateWithPassword("signin", email, password),
    [authenticateWithPassword],
  );
  const signInWithProvider = useCallback(
    async (provider: SocialProvider) => {
      passwordAttempt.current++;
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
          const client = await requireActorBackend(actor);
          if (generation !== epoch.current || actor !== actorRef.current)
            throw new Error("Akkaunt o‘zgardi. Rasmni qayta tanlang.");
          const files = createFileService(client);
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
          if (generation !== epoch.current || actor !== actorRef.current)
            throw new Error("Akkaunt o‘zgardi. Rasmni qayta tanlang.");
          revision.current++;
          const ticket = snapshotGate.current.begin({
            epoch: epoch.current,
            revision: revision.current,
          });
          const snapshot = await fetchSnapshot();
          if (
            generation === epoch.current &&
            actorRef.current === actor &&
            snapshot.user.id === actor &&
            snapshotGate.current.accept(ticket, {
              epoch: epoch.current,
              revision: revision.current,
            })
          )
            adopt(snapshot);
          if (
            previous &&
            previous !== asset?.id &&
            generation === epoch.current &&
            actor === actorRef.current
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
    passwordAttempt.current++;
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
      signUpWithPassword,
      signInWithPassword,
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
    signUpWithPassword,
    signInWithPassword,
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
