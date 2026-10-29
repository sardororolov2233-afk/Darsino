import type { SupabaseClient } from "@supabase/supabase-js";
import type { HomeworkFile } from "../state/homework";
export type HomeworkUploadInput = {
  bytes: ArrayBuffer;
  mimeType: string;
  originalName: string;
};
export type HomeworkPendingUpload = {
  file: HomeworkFile;
  input: HomeworkUploadInput;
};
export class HomeworkUploadError extends Error {
  constructor(
    message: string,
    readonly pending: HomeworkPendingUpload,
  ) {
    super(message);
    this.name = "HomeworkUploadError";
  }
}
export async function sendHomeworkFile(
  client: SupabaseClient,
  pending: HomeworkPendingUpload,
  checkActor: () => void,
  retry = false,
): Promise<HomeworkFile> {
  const { file, input } = pending;
  try {
    checkActor();
    // Finalize first on retry: the prior response may have been lost after commit.
    if (retry) {
      const ready = await client.rpc("oqi_assignment_file_ready", {
        p_file: file.id,
      });
      if (!ready.error) {
        checkActor();
        return { ...file, state: "ready" };
      }
    }
    checkActor();
    const uploaded = await client.storage
      .from("oqi-homework")
      .upload(file.objectPath, input.bytes, {
        contentType: file.mime,
        upsert: false,
        cacheControl: "60",
      });
    if (uploaded.error) {
      // Storage may already contain the immutable object after an ambiguous timeout.
      const ready = await client.rpc("oqi_assignment_file_ready", {
        p_file: file.id,
      });
      if (ready.error) throw new Error(uploaded.error.message);
    } else {
      checkActor();
      const ready = await client.rpc("oqi_assignment_file_ready", {
        p_file: file.id,
      });
      if (ready.error) throw new Error(ready.error.message);
    }
    checkActor();
    return { ...file, state: "ready" };
  } catch (e) {
    throw new HomeworkUploadError(
      e instanceof Error ? e.message : "Fayl yuklanmadi.",
      pending,
    );
  }
}
