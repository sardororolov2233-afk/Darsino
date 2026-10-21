import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { AppState } from "react-native";
import {
  readPrivateWorkspace,
  updatePrivateWorkspace,
} from "../services/privateWorkspace";
import { useApp } from "./AppContext";
import {
  emptyTeacherWorkspace,
  prepareRoomPlan,
  readTeacherWorkspace,
  type TeacherWorkspace,
} from "./teacher";
import { uid } from "./domain";
type TeacherContextValue = {
  data: TeacherWorkspace;
  ready: boolean;
  error: string;
  addRoomPlan: (input: Parameters<typeof prepareRoomPlan>[3]) => Promise<void>;
  removeRoomPlan: (id: string) => Promise<void>;
};
const Context = createContext<TeacherContextValue | null>(null);
export function TeacherProvider({ children }: { children: React.ReactNode }) {
  const { user, signedIn, market } = useApp();
  const account = signedIn && user.role === "tutor" ? user.id : "";
  const [snapshot, setSnapshot] = useState({
    account: "",
    data: emptyTeacherWorkspace(),
    ready: false,
    error: "",
  });
  const current = useRef(snapshot),
    identity = useRef(account),
    latestMarket = useRef(market);
  identity.current = account;
  latestMarket.current = market;
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  useEffect(() => {
    let active = true;
    current.current = {
      account,
      data: emptyTeacherWorkspace(),
      ready: false,
      error: "",
    };
    setSnapshot(current.current);
    if (!account) return;
    queue.current
      .catch(() => {})
      .then(() =>
        readPrivateWorkspace("teacher", account, readTeacherWorkspace),
      )
      .then((raw) => {
        if (!active) return;
        current.current = {
          account,
          data: readTeacherWorkspace(raw),
          ready: true,
          error: "",
        };
        setSnapshot(current.current);
      })
      .catch(() => {
        if (active) {
          current.current = {
            account,
            data: emptyTeacherWorkspace(),
            ready: false,
            error: "Xona rejalarini o‘qib bo‘lmadi. Ilovani qayta oching.",
          };
          setSnapshot(current.current);
        }
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
              "teacher",
              account,
              readTeacherWorkspace,
            );
            if (!active || identity.current !== account) return;
            current.current = {
              account,
              data: readTeacherWorkspace(raw),
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
  const update = (change: (data: TeacherWorkspace) => TeacherWorkspace) => {
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
          throw new Error("Ustoz ma’lumotlari yuklanishini kuting.");
        const data = await updatePrivateWorkspace(
          "teacher",
          target,
          readTeacherWorkspace,
          change,
        );
        if (identity.current !== target) return;
        current.current = { account: target, data, ready: true, error: "" };
        setSnapshot(current.current);
      });
    queue.current = pending;
    return pending;
  };
  const visible =
    snapshot.account === account
      ? snapshot
      : { data: emptyTeacherWorkspace(), ready: false, error: "" };
  return (
    <Context.Provider
      value={{
        ...visible,
        addRoomPlan: (input) =>
          update((data) => ({
            ...data,
            roomPlans: [
              ...data.roomPlans,
              {
                ...prepareRoomPlan(
                  latestMarket.current,
                  account,
                  data.roomPlans,
                  input,
                ),
                id: uid("room-plan"),
              },
            ].slice(-100),
          })),
        removeRoomPlan: (id) =>
          update((data) => ({
            ...data,
            roomPlans: data.roomPlans.filter((p) => p.id !== id),
          })),
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useTeacher() {
  const value = useContext(Context);
  if (!value) throw new Error("TeacherProvider kerak.");
  return value;
}
