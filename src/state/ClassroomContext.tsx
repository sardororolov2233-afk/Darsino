import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Crypto from "expo-crypto";
import { AppState } from "react-native";
import { useApp } from "./AppContext";
import { requireActorBackend, requireBackend } from "../services/backend";
import {
  canAccessClass,
  demoClassroomSnapshot,
  emptyClassroom,
  gradeMock,
  normalizeMockDraft,
  readDemoClassroom,
  type ClassroomSnapshot,
  type DemoClassroom,
  type GroupMessage,
  type MockAttempt,
  type MockDraft,
  type MockTest,
} from "./classroom";
import type { Marketplace } from "./domain";

const DEMO_KEY = "@oqi/classroom-demo-v1";
let demoQueue: Promise<unknown> = Promise.resolve();
type ContextValue = {
  data: ClassroomSnapshot;
  ready: boolean;
  error: string;
  refresh: () => Promise<void>;
  messages: (group: string, before?: string) => Promise<GroupMessage[]>;
  send: (
    group: string,
    text: string,
    id: string,
    announcement?: boolean,
  ) => Promise<GroupMessage>;
  markRead: (group: string, until: string) => Promise<void>;
  saveTest: (draft: MockDraft) => Promise<MockTest>;
  beginTest: (id: string) => Promise<MockAttempt>;
  submitTest: (id: string, answers: (number | null)[]) => Promise<MockAttempt>;
};
const Context = createContext<ContextValue | null>(null);
export function ClassroomProvider({ children }: { children: React.ReactNode }) {
  const { user, authenticated, market, mode } = useApp();
  const account = authenticated ? user.id : "";
  const actor = useRef(account),
    latestMarket = useRef(market),
    revision = useRef(0);
  actor.current = account;
  latestMarket.current = market;
  const [state, setState] = useState({
    actor: "",
    data: emptyClassroom(),
    ready: false,
    error: "",
  });
  const refresh = useCallback(async () => {
    const target = account,
      ticket = ++revision.current;
    if (!target) return;
    try {
      const data =
        mode === "demo"
          ? demoClassroomSnapshot(
              readDemoClassroom(await AsyncStorage.getItem(DEMO_KEY)),
              latestMarket.current,
              target,
            )
          : await (async () => {
              const client = await requireActorBackend(target);
              const { data, error } = await client.rpc(
                "oqi_classroom_snapshot",
              );
              if (error) throw new Error(error.message);
              return data as ClassroomSnapshot;
            })();
      if (actor.current === target && ticket === revision.current)
        setState({ actor: target, data, ready: true, error: "" });
    } catch (error) {
      if (actor.current === target && ticket === revision.current)
        setState((old) => ({
          actor: target,
          data: old.actor === target ? old.data : emptyClassroom(),
          ready: old.actor === target && old.ready,
          error:
            error instanceof Error
              ? error.message
              : "Sinf ma’lumotlari yuklanmadi.",
        }));
    }
  }, [account, mode]);
  useEffect(() => {
    revision.current++;
    setState({
      actor: account,
      data: emptyClassroom(),
      ready: false,
      error: "",
    });
    if (account) void refresh();
  }, [account, refresh]);
  useEffect(() => {
    if (account) void refresh();
  }, [market, account, refresh]);
  useEffect(() => {
    if (!account) return;
    const timer = setInterval(() => void refresh(), 15000);
    const listener = AppState.addEventListener("change", (next) => {
      if (next === "active") void refresh();
    });
    const channel =
      mode === "supabase"
        ? requireBackend()
            .channel(`oqi-classroom:${account}`)
            .on(
              "postgres_changes",
              {
                event: "INSERT",
                schema: "public",
                table: "oqi_group_messages",
              },
              () => void refresh(),
            )
            .subscribe()
        : null;
    return () => {
      clearInterval(timer);
      listener.remove();
      if (channel) void requireBackend().removeChannel(channel);
    };
  }, [account, mode, refresh]);
  async function perform<T>(
    rpc: string,
    parameters: object,
    local: (store: DemoClassroom, market: Marketplace, actor: string) => T,
  ): Promise<T> {
    const target = account;
    if (!target || actor.current !== target)
      throw new Error("Avval akkauntga kiring.");
    let result: T;
    if (mode === "demo") {
      const operation = demoQueue
        .catch(() => {})
        .then(async () => {
          if (actor.current !== target)
            throw new Error("Akkaunt o‘zgardi. Amalni qayta boshlang.");
          const store = readDemoClassroom(await AsyncStorage.getItem(DEMO_KEY));
          const value = local(store, latestMarket.current, target);
          await AsyncStorage.setItem(DEMO_KEY, JSON.stringify(store));
          return value;
        });
      demoQueue = operation;
      result = await operation;
    } else {
      const client = await requireActorBackend(target);
      const response = await client.rpc(rpc, parameters);
      if (response.error) throw new Error(response.error.message);
      result = response.data as T;
    }
    if (actor.current !== target)
      throw new Error("Akkaunt o‘zgardi. Amalni qayta boshlang.");
    await refresh();
    return result;
  }
  const owned = (m: Marketplace, me: string, group: string) => {
    if (
      !m.offerings.some((g) => g.id === group && g.tutorId === me) ||
      !m.tutorProfiles.some(
        (p) => p.userId === me && p.verification === "approved",
      )
    )
      throw new Error("O‘z guruhingiz va tasdiqlangan ustoz profili kerak.");
  };
  const access = (m: Marketplace, me: string, group: string) => {
    if (!canAccessClass(m, me, group))
      throw new Error("Bu guruhga ruxsat yo‘q.");
  };
  const visible =
    state.actor === account
      ? state
      : { data: emptyClassroom(), ready: false, error: "" };
  return (
    <Context.Provider
      value={{
        ...visible,
        refresh,
        messages: async (group, before) => {
          const target = account;
          if (!target) throw new Error("Avval akkauntga kiring.");
          let rows: GroupMessage[];
          if (mode === "demo") {
            access(latestMarket.current, target, group);
            const store = readDemoClassroom(
              await AsyncStorage.getItem(DEMO_KEY),
            );
            const all = store.messages.filter((m) => m.offeringId === group);
            const boundary = before
              ? all.findIndex((m) => m.id === before)
              : all.length;
            rows = all.slice(Math.max(0, boundary - 50), boundary);
          } else {
            const client = await requireActorBackend(target);
            const { data, error } = await client.rpc(
              "oqi_group_messages_read",
              { p_group: group, p_before: before || null, p_limit: 50 },
            );
            if (error) throw new Error(error.message);
            rows = data as GroupMessage[];
          }
          if (actor.current !== target) throw new Error("Akkaunt o‘zgardi.");
          return rows;
        },
        send: (group, text, id, announcement = false) =>
          perform(
            "oqi_group_message_send",
            {
              p_group: group,
              p_id: id,
              p_text: text,
              p_announcement: announcement,
            },
            (s, m, me) => {
              access(m, me, group);
              if (announcement) owned(m, me, group);
              const clean = text.trim();
              if (!clean || clean.length > 2000)
                throw new Error("Xabar 1–2000 belgi bo‘lsin.");
              const existing = s.messages.find((v) => v.id === id);
              if (existing) {
                if (
                  existing.senderId !== me ||
                  existing.offeringId !== group ||
                  existing.text !== clean ||
                  existing.announcement !== announcement
                )
                  throw new Error(
                    "Xabar kaliti boshqa amal uchun ishlatilgan.",
                  );
                return existing;
              }
              if (
                s.messages.filter(
                  (v) =>
                    v.senderId === me &&
                    Date.parse(v.createdAt) > Date.now() - 60000,
                ).length >= 60
              )
                throw new Error(
                  "So‘rovlar limiti tugadi. Keyinroq urinib ko‘ring.",
                );
              const message: GroupMessage = {
                id,
                offeringId: group,
                senderId: me,
                senderName:
                  m.users.find((u) => u.id === me)?.name || "O‘quvchi",
                text: clean,
                announcement,
                createdAt: new Date().toISOString(),
              };
              s.messages.push(message);
              return message;
            },
          ),
        markRead: (group, until) =>
          perform(
            "oqi_group_mark_read",
            { p_group: group, p_until: until },
            (s, m, me) => {
              access(m, me, group);
              const time = new Date(
                Math.min(Date.now(), Date.parse(until)),
              ).toISOString();
              s.reads[`${me}:${group}`] = [
                s.reads[`${me}:${group}`] || "",
                time,
              ]
                .sort()
                .at(-1)!;
            },
          ),
        saveTest: (input) => {
          const draft = normalizeMockDraft(input);
          return perform(
            "oqi_mock_test_save",
            { p_test: draft },
            (s, m, me) => {
              owned(m, me, draft.offeringId);
              const index = s.tests.findIndex((t) => t.id === draft.id),
                old = s.tests[index];
              if (old && old.tutorId !== me)
                throw new Error("Boshqa ustoz testini o‘zgartirib bo‘lmaydi.");
              if (old && s.attempts.some((a) => a.testId === old.id)) {
                if (
                  Object.keys(draft).every(
                    (key) =>
                      JSON.stringify(draft[key as keyof MockDraft]) ===
                      JSON.stringify(old[key as keyof MockTest]),
                  )
                )
                  return old;
                throw new Error(
                  "Ishlash boshlangan testni o‘zgartirib bo‘lmaydi.",
                );
              }
              const test: MockTest = {
                ...draft,
                tutorId: me,
                createdAt: old?.createdAt || new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              };
              if (index >= 0) s.tests[index] = test;
              else s.tests.unshift(test);
              return test;
            },
          );
        },
        beginTest: (id) =>
          perform("oqi_mock_begin", { p_test: id }, (s, m, me) => {
            const test = s.tests.find(
              (t) => t.id === id && t.status === "published",
            );
            if (
              !test ||
              !m.users.some((u) => u.id === me && u.role === "student")
            )
              throw new Error("Bu testni ishlashga ruxsat yo‘q.");
            access(m, me, test.offeringId);
            const prior = s.attempts.find(
              (a) => a.testId === id && a.studentId === me,
            );
            if (prior) return prior;
            const attempt: MockAttempt = {
              id: Crypto.randomUUID(),
              testId: id,
              studentId: me,
              startedAt: new Date().toISOString(),
              answers: null,
              correctCount: null,
              score: null,
              maxScore: null,
              percentage: null,
              completedAt: null,
            };
            s.attempts.push(attempt);
            return attempt;
          }),
        submitTest: (id, answers) =>
          perform(
            "oqi_mock_submit",
            { p_test: id, p_answers: answers },
            (s, m, me) => {
              const test = s.tests.find(
                  (t) => t.id === id && t.status === "published",
                ),
                attempt = s.attempts.find(
                  (a) => a.testId === id && a.studentId === me,
                );
              if (!test || !attempt) throw new Error("Avval testni boshlang.");
              access(m, me, test.offeringId);
              if (attempt.completedAt) {
                if (JSON.stringify(attempt.answers) !== JSON.stringify(answers))
                  throw new Error(
                    "Natija saqlangan. Javoblarni qayta o‘zgartirib bo‘lmaydi.",
                  );
                return attempt;
              }
              if (
                Date.now() >
                Date.parse(attempt.startedAt) + test.minutes * 60000 + 20000
              )
                throw new Error("Test vaqti yakunlandi.");
              Object.assign(attempt, gradeMock(test, answers), {
                answers,
                completedAt: new Date().toISOString(),
              });
              return attempt;
            },
          ),
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useClassroom() {
  const value = useContext(Context);
  if (!value) throw new Error("ClassroomProvider kerak.");
  return value;
}
