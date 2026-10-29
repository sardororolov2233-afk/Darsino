import {
  sendHomeworkFile,
  HomeworkUploadError,
  type HomeworkPendingUpload,
} from "../services/homeworkFiles";
import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppState, Linking } from "react-native";
import * as Crypto from "expo-crypto";
import { encode } from "base64-arraybuffer";
import { requireActorBackend } from "../services/backend";
import { useApp } from "./AppContext";
import {
  emptyHomework,
  readHomework,
  homeworkSnapshot,
  assignmentAccess,
  ownsAssignments,
  saveAssignment,
  submitAssignment,
  reviewAssignment,
  HOMEWORK_LIMIT,
  HOMEWORK_MIME,
  type HomeworkSnapshot,
  type HomeworkStore,
  type HomeworkFile,
  type AssignmentDraft,
} from "./homework";
import type { Marketplace } from "./domain";
const DEMO = "@oqi/homework-demo-v1";
export const homeworkCacheKey = (actor: string) =>
  "@oqi/homework-cache-v1:" + encodeURIComponent(actor);
let demoQueue: Promise<unknown> = Promise.resolve();
type Upload = { bytes: ArrayBuffer; mimeType: string; originalName: string };
type ContextValue = {
  data: HomeworkSnapshot;
  ready: boolean;
  offline: boolean;
  error: string;
  refresh: () => Promise<void>;
  save: (draft: AssignmentDraft) => Promise<number>;
  submit: (
    id: string,
    assignment: string,
    content: string,
    files: string[],
  ) => Promise<string>;
  review: (
    id: string,
    status: "accepted" | "changes_requested",
    feedback: string,
  ) => Promise<void>;
  archive: (id: string) => Promise<void>;
  readEvents: () => Promise<void>;
  upload: (
    assignment: string,
    scope: "task" | "answer",
    input: Upload,
  ) => Promise<HomeworkFile>;
  pendingUpload: HomeworkFile | null;
  retryUpload: () => Promise<HomeworkFile>;
  removeFile: (id: string) => Promise<void>;
  openFile: (id: string) => Promise<void>;
};
const Context = createContext<ContextValue | null>(null);
export function HomeworkProvider({ children }: { children: React.ReactNode }) {
  const { user, authenticated, market, mode } = useApp();
  const account = authenticated ? user.id : "";
  const actor = useRef(account),
    latestMarket = useRef(market),
    revision = useRef(0);
  actor.current = account;
  latestMarket.current = market;
  const pending = useRef<HomeworkPendingUpload | null>(null);
  const [pendingUpload, setPendingUpload] = useState<HomeworkFile | null>(null);
  const snapshotRef = useRef<HomeworkSnapshot>(emptyHomework());
  const [state, setState] = useState({
    actor: "",
    data: emptyHomework() as HomeworkSnapshot,
    ready: false,
    offline: false,
    error: "",
  });
  const refresh = useCallback(async () => {
    const target = account,
      ticket = ++revision.current;
    if (!target) return;
    try {
      let data: HomeworkSnapshot;
      if (mode === "demo")
        data = homeworkSnapshot(
          readHomework(await AsyncStorage.getItem(DEMO)),
          latestMarket.current,
          target,
        );
      else {
        const client = await requireActorBackend(target);
        const response = await client.rpc("oqi_assignments_snapshot");
        if (response.error) throw new Error(response.error.message);
        data = response.data as HomeworkSnapshot;
      }
      if (actor.current !== target || ticket !== revision.current) return;
      snapshotRef.current = data;
      setState({ actor: target, data, ready: true, offline: false, error: "" });
      if (mode !== "demo")
        await AsyncStorage.setItem(
          homeworkCacheKey(target),
          JSON.stringify(data),
        ).catch(() => {});
    } catch (e) {
      if (actor.current !== target || ticket !== revision.current) return;
      const raw =
        mode === "demo"
          ? null
          : await AsyncStorage.getItem(homeworkCacheKey(target)).catch(
              () => null,
            );
      if (actor.current !== target || ticket !== revision.current) return;
      let cached: HomeworkSnapshot | undefined;
      try {
        if (raw) cached = readHomework(raw);
      } catch {
        /* Ignore invalid cache. */
      }
      setState((old) => ({
        actor: target,
        data:
          old.actor === target && old.ready
            ? old.data
            : cached || emptyHomework(),
        ready: (old.actor === target && old.ready) || !!cached,
        offline: true,
        error: e instanceof Error ? e.message : "Vazifalarni yuklab bo‘lmadi.",
      }));
    }
  }, [account, mode]);
  useEffect(() => {
    revision.current++;
    pending.current = null;
    setPendingUpload(null);
    setState({
      actor: account,
      data: emptyHomework(),
      ready: false,
      offline: false,
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
    const listener = AppState.addEventListener("change", (s) => {
      if (s === "active") void refresh();
    });
    return () => {
      clearInterval(timer);
      listener.remove();
    };
  }, [account, refresh]);
  async function perform<T>(
    rpc: string,
    args: object,
    local: (s: HomeworkStore, m: Marketplace, me: string) => T,
  ): Promise<T> {
    const target = account;
    if (!target || actor.current !== target)
      throw new Error("Avval akkauntga kiring.");
    let value: T;
    if (mode === "demo") {
      const pending = demoQueue
        .catch(() => {})
        .then(async () => {
          if (actor.current !== target) throw new Error("Akkaunt o‘zgardi.");
          const s = readHomework(await AsyncStorage.getItem(DEMO));
          const result = local(s, latestMarket.current, target);
          await AsyncStorage.setItem(DEMO, JSON.stringify(s));
          return result;
        });
      demoQueue = pending;
      value = await pending;
    } else {
      const client = await requireActorBackend(target),
        r = await client.rpc(rpc, args);
      if (r.error) throw new Error(r.error.message);
      value = r.data as T;
    }
    if (actor.current !== target) throw new Error("Akkaunt o‘zgardi.");
    await refresh();
    return value;
  }
  const visible =
    state.actor === account
      ? state
      : { data: emptyHomework(), ready: false, offline: false, error: "" };
  return (
    <Context.Provider
      value={{
        ...visible,
        refresh,
        save: async (input) => {
          const draft = {
            ...input,
            recipientIds: [...new Set(input.recipientIds)].sort(),
            fileIds: [...new Set(input.fileIds)].sort(),
          };
          await perform(
            "oqi_assignment_save",
            { p_assignment: draft },
            (s, m, me) => saveAssignment(s, m, me, draft),
          );
          return (
            snapshotRef.current.assignments.find((a) => a.id === draft.id)
              ?.revision || draft.revision
          );
        },
        submit: (id, assignment, content, files) =>
          perform(
            "oqi_assignment_submit",
            {
              p_id: id,
              p_assignment: assignment,
              p_content: content,
              p_files: files,
            },
            (s, m, me) =>
              submitAssignment(s, m, me, id, assignment, content, files),
          ),
        review: (id, status, feedback) =>
          perform(
            "oqi_assignment_review",
            { p_submission: id, p_status: status, p_feedback: feedback },
            (s, m, me) => reviewAssignment(s, m, me, id, status, feedback),
          ),
        archive: (id) =>
          perform(
            "oqi_assignment_archive",
            { p_assignment: id },
            (s, m, me) => {
              const a = s.assignments.find((a) => a.id === id);
              if (!a || !ownsAssignments(m, me, a.offeringId))
                throw new Error("Faqat o‘z vazifangizni yoping.");
              a.status = "archived";
              a.revision++;
            },
          ),
        readEvents: () =>
          perform("oqi_assignment_events_read", {}, (s, _, me) => {
            s.events
              .filter((e) => e.userId === me)
              .forEach((e) => (e.read = true));
          }),
        upload: async (assignment, scope, input) => {
          const target = account;
          if (!target || actor.current !== target)
            throw new Error("Avval akkauntga kiring.");
          if (
            !HOMEWORK_MIME.includes(input.mimeType) ||
            !input.bytes.byteLength ||
            input.bytes.byteLength > HOMEWORK_LIMIT
          )
            throw new Error("PDF yoki rasm, 10 MB gacha fayl tanlang.");
          if (mode === "demo")
            return perform("unused", {}, (s, m, me) => {
              const a = s.assignments.find((a) => a.id === assignment);
              if (
                !a ||
                !assignmentAccess(m, me, a) ||
                (scope === "task"
                  ? a.teacherId !== me || a.status !== "draft"
                  : a.teacherId === me || a.status !== "published")
              )
                throw new Error("Fayl yuklashga ruxsat yo‘q.");
              const f: HomeworkFile = {
                id: Crypto.randomUUID(),
                assignmentId: assignment,
                ownerId: me,
                scope,
                name: input.originalName,
                mime: input.mimeType,
                sizeBytes: input.bytes.byteLength,
                objectPath: "demo",
                state: "ready",
                demoUri: `data:${input.mimeType};base64,${encode(input.bytes)}`,
              };
              s.files.push(f);
              return f;
            });
          const client = await requireActorBackend(target);
          const prepared = await client.rpc("oqi_assignment_file_prepare", {
            p_assignment: assignment,
            p_scope: scope,
            p_name: input.originalName,
            p_mime: input.mimeType,
            p_size: input.bytes.byteLength,
          });
          if (prepared.error) throw new Error(prepared.error.message);
          const f = prepared.data as HomeworkFile;
          if (actor.current !== target) throw new Error("Akkaunt o‘zgardi.");
          try {
            const result = await sendHomeworkFile(
              client,
              { file: f, input },
              () => {
                if (actor.current !== target)
                  throw new Error("Akkaunt o‘zgardi.");
              },
            );
            pending.current = null;
            setPendingUpload(null);
            await refresh();
            return result;
          } catch (e) {
            if (actor.current === target && e instanceof HomeworkUploadError) {
              pending.current = e.pending;
              setPendingUpload(e.pending.file);
            }
            throw e;
          }
        },
        pendingUpload,
        retryUpload: async () => {
          const target = account,
            item = pending.current;
          if (!item || item.file.ownerId !== target || actor.current !== target)
            throw new Error("Qayta yuklanadigan fayl yo‘q.");
          const client = await requireActorBackend(target);
          const result = await sendHomeworkFile(
            client,
            item,
            () => {
              if (actor.current !== target)
                throw new Error("Akkaunt o‘zgardi.");
            },
            true,
          );
          pending.current = null;
          setPendingUpload(null);
          await refresh();
          return result;
        },
        removeFile: async (id) => {
          const target = account;
          if (mode === "demo")
            return perform("unused", {}, (s, _, me) => {
              const f = s.files.find((f) => f.id === id && f.ownerId === me);
              if (!f) throw new Error("Fayl topilmadi.");
              if (
                s.assignments.some((a) => a.fileIds.includes(id)) ||
                s.submissions.some((a) => a.fileIds.includes(id))
              )
                throw new Error(
                  "Biriktirilgan yoki topshirilgan faylni o‘chirib bo‘lmaydi.",
                );
              f.state = "deleted";
              delete f.demoUri;
            });
          const client = await requireActorBackend(target);
          const begin = await client.rpc("oqi_assignment_file_remove_begin", {
            p_file: id,
          });
          if (begin.error) throw new Error(begin.error.message);
          if (actor.current !== target) throw new Error("Akkaunt o‘zgardi.");
          const removed = await client.storage
            .from("oqi-homework")
            .remove([begin.data as string]);
          if (removed.error) throw new Error(removed.error.message);
          const end = await client.rpc("oqi_assignment_file_remove_end", {
            p_file: id,
          });
          if (end.error) throw new Error(end.error.message);
          if (pending.current?.file.id === id) {
            pending.current = null;
            setPendingUpload(null);
          }
          await refresh();
        },
        openFile: async (id) => {
          const target = account;
          if (!target) throw new Error("Avval akkauntga kiring.");
          let url: string;
          if (mode === "demo") {
            const s = readHomework(await AsyncStorage.getItem(DEMO));
            const f = homeworkSnapshot(
              s,
              latestMarket.current,
              target,
            ).files.find((f) => f.id === id);
            if (!f?.demoUri) throw new Error("Fayl topilmadi.");
            url = f.demoUri;
          } else {
            const client = await requireActorBackend(target);
            const f = visible.data.files.find((f) => f.id === id);
            if (!f) throw new Error("Fayl topilmadi.");
            const r = await client.storage
              .from("oqi-homework")
              .createSignedUrl(f.objectPath, 60, { download: true });
            if (r.error) throw new Error(r.error.message);
            url = r.data.signedUrl;
          }
          if (actor.current !== target) throw new Error("Akkaunt o‘zgardi.");
          await Linking.openURL(url);
        },
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useHomework() {
  const value = useContext(Context);
  if (!value) throw new Error("HomeworkProvider kerak.");
  return value;
}
