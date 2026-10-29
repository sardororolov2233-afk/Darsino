import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { AppState } from "react-native";
import {
  readPrivateWorkspace,
  isWorkspaceCached,
  updatePrivateWorkspace,
} from "../services/privateWorkspace";
import { useApp } from "./AppContext";
import {
  emptyLearning,
  readLearning,
  retainAttempts,
  type LearningState,
} from "./learning";
import { diagnostics, openLessons, clubs } from "../data/learning";
import { uid } from "./domain";

type LearningContextType = {
  data: LearningState;
  ready: boolean;
  error: string;
  finishQuiz: (
    id: string,
    answers: number[],
    attemptId?: string,
  ) => Promise<void>;
  refresh: () => Promise<void>;
  offline: boolean;
  completeLesson: (id: string) => Promise<void>;
  toggleClub: (id: string) => Promise<void>;
  rememberSearch: (query: string) => Promise<void>;
  clearSearches: () => Promise<void>;
};
const Context = createContext<LearningContextType | null>(null);
export function LearningProvider({ children }: { children: React.ReactNode }) {
  const { user, signedIn } = useApp();
  const account = signedIn ? user.id : "";
  const [snapshot, setSnapshot] = useState({
    account: "",
    data: emptyLearning(),
    ready: false,
    error: "",
  });
  const current = useRef(snapshot);
  const identity = useRef(account);
  identity.current = account;
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  useEffect(() => {
    let active = true;
    current.current = {
      account,
      data: emptyLearning(),
      ready: false,
      error: "",
    };
    setSnapshot(current.current);
    if (!account) return;
    queue.current
      .catch(() => {})
      .then(() => readPrivateWorkspace("learning", account, readLearning))
      .then((raw) => {
        if (!active) return;
        current.current = {
          account,
          data: readLearning(raw),
          ready: true,
          error: "",
        };
        setSnapshot(current.current);
      })
      .catch(() => {
        if (!active) return;
        current.current = {
          account,
          data: emptyLearning(),
          ready: false,
          error: "O‘quv progressini o‘qib bo‘lmadi. Ilovani qayta oching.",
        };
        setSnapshot(current.current);
      });
    return () => {
      active = false;
    };
  }, [account]);
  useEffect(() => {
    if (!account) return;
    let active = true;
    const sync = () => {
      queue.current = queue.current
        .catch(() => {})
        .then(async () => {
          if (!active || identity.current !== account || !current.current.ready)
            return;
          try {
            const raw = await readPrivateWorkspace(
              "learning",
              account,
              readLearning,
            );
            if (!active || identity.current !== account) return;
            current.current = {
              account,
              data: readLearning(raw),
              ready: true,
              error: "",
            };
            setSnapshot(current.current);
          } catch (e) {
            if (!active || identity.current !== account) return;
            current.current = {
              ...current.current,
              error: e instanceof Error ? e.message : "Sinxronlashda xato.",
            };
            setSnapshot(current.current);
          }
        });
    };
    const timer = setInterval(sync, 30000);
    const listener = AppState.addEventListener("change", (state) => {
      if (state === "active") sync();
    });
    return () => {
      active = false;
      clearInterval(timer);
      listener.remove();
    };
  }, [account]);
  const update = useCallback(
    (change: (data: LearningState) => LearningState) => {
      const target = account;
      const pending = queue.current
        .catch(() => {})
        .then(async () => {
          if (
            !target ||
            identity.current !== target ||
            current.current.account !== target ||
            !current.current.ready
          )
            throw new Error("O‘quv progressi yuklanishini kuting.");
          const data = await updatePrivateWorkspace(
            "learning",
            target,
            readLearning,
            change,
          );
          if (identity.current !== target) return;
          current.current = { account: target, data, ready: true, error: "" };
          setSnapshot(current.current);
        });
      queue.current = pending;
      return pending;
    },
    [account],
  );
  const finishQuiz = (
    id: string,
    answers: number[],
    attemptId = uid("quiz"),
  ) => {
    const completedAt = new Date().toISOString();
    return update((data) => {
      const test = diagnostics.find((t) => t.id === id);
      if (
        !test ||
        answers.length !== test.questions.length ||
        answers.some(
          (v, i) =>
            !Number.isInteger(v) ||
            v < 0 ||
            v >= test.questions[i].options.length,
        )
      )
        throw new Error("Barcha savollarga javob bering.");
      const previous = data.attempts.find((a) => a.id === attemptId);
      if (previous) {
        if (
          previous.testId !== id ||
          JSON.stringify(previous.answers) !== JSON.stringify(answers)
        )
          throw new Error("Natija kaliti boshqa urinishga tegishli.");
        return data;
      }
      return {
        ...data,
        attempts: retainAttempts([
          ...data.attempts,
          {
            id: attemptId,
            testId: id,
            answers: [...answers],
            completedAt,
          },
        ]),
      };
    });
  };
  const completeLesson = (id: string) =>
    update((data) => {
      if (!openLessons.some((l) => l.id === id))
        throw new Error("Dars topilmadi.");
      return {
        ...data,
        completedLessons: {
          ...data.completedLessons,
          [id]: data.completedLessons[id] || new Date().toISOString(),
        },
      };
    });
  const toggleClub = (id: string) =>
    update((data) => {
      if (!clubs.some((c) => c.id === id)) throw new Error("Klub topilmadi.");
      return {
        ...data,
        followedClubs: data.followedClubs.includes(id)
          ? data.followedClubs.filter((v) => v !== id)
          : [...data.followedClubs, id],
      };
    });
  const visible =
    snapshot.account === account
      ? snapshot
      : { data: emptyLearning(), ready: false, error: "" };
  return (
    <Context.Provider
      value={{
        ...visible,
        offline: isWorkspaceCached("learning", account),
        refresh: async () => {
          const target = account;
          if (!target) throw new Error("Avval akkauntga kiring.");
          const operation = queue.current
            .catch(() => {})
            .then(async () => {
              const raw = await readPrivateWorkspace(
                "learning",
                target,
                readLearning,
              );
              if (identity.current !== target) return;
              current.current = {
                account: target,
                data: readLearning(raw),
                ready: true,
                error: "",
              };
              setSnapshot(current.current);
            });
          queue.current = operation;
          return operation;
        },
        finishQuiz,
        completeLesson,
        toggleClub,
        rememberSearch: (query) =>
          update((data) => ({
            ...data,
            recentSearches: query.trim()
              ? [
                  query.trim().slice(0, 100),
                  ...data.recentSearches.filter(
                    (q) => q !== query.trim().slice(0, 100),
                  ),
                ].slice(0, 6)
              : data.recentSearches,
          })),
        clearSearches: () =>
          update((data) => ({ ...data, recentSearches: [] })),
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useLearning() {
  const value = useContext(Context);
  if (!value) throw new Error("LearningProvider kerak.");
  return value;
}
