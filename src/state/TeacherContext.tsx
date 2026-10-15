import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
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
        AsyncStorage.getItem(`@oqi/teacher-v1:${encodeURIComponent(account)}`),
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
        const data = change(current.current.data);
        await AsyncStorage.setItem(
          `@oqi/teacher-v1:${encodeURIComponent(target)}`,
          JSON.stringify(data),
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
