type SecureStoreApi = {
  getItemAsync: (key: string) => Promise<string | null>;
  setItemAsync: (key: string, value: string) => Promise<void>;
  deleteItemAsync: (key: string) => Promise<void>;
};
type Manifest = { generation: string; count: number };
// Writes commit a manifest only after all chunks exist. Per-key queues protect token refresh.
export function createChunkedStorage(store: SecureStoreApi) {
  const queues = new Map<string, Promise<unknown>>();
  function serialize<T>(name: string, operation: () => Promise<T>) {
    const result = (queues.get(name) || Promise.resolve())
      .catch(() => {})
      .then(operation);
    queues.set(name, result);
    return result;
  }
  async function removeChunks(name: string, raw: string | null) {
    if (!raw) return;
    const manifest = JSON.parse(raw) as Manifest;
    await Promise.all(
      Array.from({ length: manifest.count }, (_, i) =>
        store.deleteItemAsync(`${name}.${manifest.generation}.${i}`),
      ),
    );
  }
  return {
    getItem(name: string) {
      return serialize(name, async () => {
        const raw = await store.getItemAsync(name);
        if (!raw) return null;
        const manifest = JSON.parse(raw) as Manifest;
        if (
          !Number.isInteger(manifest.count) ||
          manifest.count < 1 ||
          manifest.count > 512
        )
          return null;
        const parts = await Promise.all(
          Array.from({ length: manifest.count }, (_, i) =>
            store.getItemAsync(`${name}.${manifest.generation}.${i}`),
          ),
        );
        return parts.some((p) => p === null) ? null : parts.join("");
      });
    },
    setItem(name: string, value: string) {
      return serialize(name, async () => {
        const old = await store.getItemAsync(name),
          chars = Array.from(value),
          generation = `${Date.now()}${Math.random().toString(36).slice(2)}`;
        const parts = Array.from(
          { length: Math.max(1, Math.ceil(chars.length / 350)) },
          (_, i) => chars.slice(i * 350, (i + 1) * 350).join(""),
        );
        if (parts.length > 512)
          throw new Error("Sessiya ma’lumoti juda katta.");
        try {
          const chunks = await Promise.allSettled(
            parts.map((part, i) =>
              store.setItemAsync(`${name}.${generation}.${i}`, part),
            ),
          );
          const failure = chunks.find(
            (chunk): chunk is PromiseRejectedResult =>
              chunk.status === "rejected",
          );
          if (failure) throw failure.reason;
          await store.setItemAsync(
            name,
            JSON.stringify({ generation, count: parts.length }),
          );
        } catch (e) {
          await removeChunks(
            name,
            JSON.stringify({ generation, count: parts.length }),
          );
          throw e;
        }
        await removeChunks(name, old);
      });
    },
    removeItem(name: string) {
      return serialize(name, async () => {
        const old = await store.getItemAsync(name);
        await store.deleteItemAsync(name);
        await removeChunks(name, old);
      });
    },
  };
}
