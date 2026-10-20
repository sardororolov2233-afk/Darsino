import AsyncStorage from "@react-native-async-storage/async-storage";
import { backendMode, requireBackend } from "./backend";

type Kind = "learning" | "teacher";
type Remote = { data: object | null; revision: number };
export const workspaceKey = (kind: Kind, account: string) =>
  "@oqi/" + kind + "-v1:" + encodeURIComponent(account);
async function readRemote(kind: Kind, account: string): Promise<Remote> {
  const { data, error } = await requireBackend().rpc(
    "darsino_private_state_read",
    {
      p_kind: kind,
      p_actor_id: account,
    },
  );
  if (error) throw new Error(error.message);
  return data as Remote;
}
async function writeRemote(
  kind: Kind,
  account: string,
  data: object,
  revision: number,
): Promise<Remote> {
  const result = await requireBackend().rpc("darsino_private_state_write", {
    p_kind: kind,
    p_data: data,
    p_revision: revision,
    p_actor_id: account,
  });
  if (result.error) throw new Error(result.error.message);
  return result.data as Remote;
}
export async function readPrivateWorkspace<T extends object>(
  kind: Kind,
  account: string,
  decode: (raw: string | null) => T,
): Promise<string | null> {
  const key = workspaceKey(kind, account);
  if (backendMode === "demo") return AsyncStorage.getItem(key);
  let remote = await readRemote(kind, account);
  if (remote.data === null) {
    const raw = await AsyncStorage.getItem(key);
    if (raw) {
      const local = decode(raw);
      try {
        remote = await writeRemote(kind, account, local, 0);
      } catch (e) {
        if (!(e instanceof Error) || !e.message.includes("WORKSPACE_CONFLICT"))
          throw e;
        remote = await readRemote(kind, account);
      }
    }
  }
  const raw = remote.data === null ? null : JSON.stringify(remote.data);
  decode(raw);
  if (raw) await AsyncStorage.setItem(key, raw).catch(() => {});
  return raw;
}
export async function updatePrivateWorkspace<T extends object>(
  kind: Kind,
  account: string,
  decode: (raw: string | null) => T,
  change: (previous: T) => T,
): Promise<T> {
  const key = workspaceKey(kind, account);
  if (backendMode === "demo") {
    const data = change(decode(await AsyncStorage.getItem(key)));
    await AsyncStorage.setItem(key, JSON.stringify(data));
    return data;
  }
  for (let attempt = 0; attempt < 3; attempt++) {
    const remote = await readRemote(kind, account);
    const raw =
      remote.data === null
        ? await AsyncStorage.getItem(key)
        : JSON.stringify(remote.data);
    const data = change(decode(raw));
    try {
      await writeRemote(kind, account, data, remote.revision);
      await AsyncStorage.setItem(key, JSON.stringify(data)).catch(() => {});
      return data;
    } catch (e) {
      if (!(e instanceof Error) || !e.message.includes("WORKSPACE_CONFLICT"))
        throw e;
    }
  }
  throw new Error("Ma’lumot boshqa qurilmada o‘zgardi. Qayta urinib ko‘ring.");
}
