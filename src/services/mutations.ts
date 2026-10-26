import type { MarketCommand } from "../state/domain";

type RpcError = {
  message: string;
  code?: string;
  status?: number;
};
type MutationEnvelope = MarketCommand & {
  actorId: string;
  idempotencyKey: string;
};
type RpcResult<T> = { data: T | null; error: RpcError | null; status?: number };

function transient(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const failure = error as RpcError;
  if (
    /^(ECONNRESET|ECONNREFUSED|ETIMEDOUT|ENETUNREACH|EAI_AGAIN|UND_ERR_CONNECT_TIMEOUT|UND_ERR_SOCKET)$/.test(
      failure.code || "",
    )
  )
    return true;
  // Database permission, validation and conflict errors are never retried.
  if (failure.code) return false;
  if ([408, 500, 502, 503, 504].includes(failure.status || 0)) return true;
  return /failed to fetch|fetch failed|network request failed|networkerror|load failed|connection (?:reset|closed)|timed? ?out/i.test(
    failure.message || "",
  );
}

const pause = (milliseconds: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, milliseconds));

// A single call represents one user intent. Its immutable payload and key are
// reused after transport failures, including a response lost after SQL commit.
export async function executeMutation<T>(
  command: MarketCommand,
  actorId: string,
  options: {
    send: (command: MutationEnvelope) => PromiseLike<RpcResult<T>>;
    createId: () => string;
    isCurrent?: () => boolean;
    onAttempt?: () => void;
    wait?: (milliseconds: number) => Promise<void>;
    attempts?: number;
  },
): Promise<T> {
  const envelope = JSON.parse(
    JSON.stringify({ ...command, actorId, idempotencyKey: options.createId() }),
  ) as MutationEnvelope;
  const attempts = Math.min(3, Math.max(1, options.attempts || 3));
  for (let attempt = 0; attempt < attempts; attempt++) {
    if (options.isCurrent && !options.isCurrent())
      throw new Error("Akkaunt o‘zgardi. Amalni qayta boshlang.");
    try {
      options.onAttempt?.();
      const result = await options.send(envelope);
      if (options.isCurrent && !options.isCurrent())
        throw new Error("Akkaunt o‘zgardi. Amalni qayta boshlang.");
      if (result.error)
        throw Object.assign(new Error(result.error.message), result.error, {
          status: result.status || result.error.status,
        });
      if (result.data === null)
        throw new Error("Server amal natijasini qaytarmadi.");
      return result.data;
    } catch (error) {
      if (attempt + 1 >= attempts || !transient(error)) throw error;
      await (options.wait || pause)(250 * (attempt + 1));
    }
  }
  throw new Error("Server bilan bog‘lanib bo‘lmadi.");
}
