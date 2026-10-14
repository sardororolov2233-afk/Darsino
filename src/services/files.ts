import type { SupabaseClient } from "@supabase/supabase-js";
import type { FileAsset, FilePurpose, TutorDocument } from "../state/domain";

export type UploadInput = {
  purpose: FilePurpose;
  originalName: string;
  mimeType: string;
  // ArrayBuffer works for both Expo native and web. The picker supplies the bytes.
  bytes: ArrayBuffer;
  conversationId?: string;
  offeringId?: string;
};

export class FileUploadError extends Error {
  constructor(
    message: string,
    readonly asset: FileAsset,
    readonly stage: "upload" | "finalize",
  ) {
    super(message);
    this.name = "FileUploadError";
  }
}

function checked<T>(result: {
  data: unknown;
  error: { message: string } | null;
}): T {
  if (result.error) throw new Error(result.error.message);
  return result.data as T;
}

// Dependency injection keeps credentials and React Native initialization out of tests.
// In the app: createFileService(requireBackend()). Always call refresh() after linking.
export function createFileService(client: SupabaseClient) {
  const rpc = async <T>(name: string, args?: Record<string, unknown>) =>
    checked<T>(await client.rpc(name, args));
  const getFile = (fileId: string) =>
    rpc<FileAsset>("darsino_get_file", { p_file_id: fileId });
  const finalize = (fileId: string) =>
    rpc<FileAsset>("darsino_finalize_upload", { p_file_id: fileId });

  return {
    getFile,
    finalize,
    async upload(input: UploadInput): Promise<FileAsset> {
      if (!input.bytes.byteLength)
        throw new Error("Bo‘sh faylni yuklab bo‘lmaydi.");
      const asset = await rpc<FileAsset>("darsino_prepare_upload", {
        p_purpose: input.purpose,
        p_original_name: input.originalName,
        p_mime_type: input.mimeType,
        p_size_bytes: input.bytes.byteLength,
        p_conversation_id: input.conversationId ?? null,
        p_offering_id: input.offeringId ?? null,
      });
      const { error } = await client.storage
        .from(asset.bucketId)
        .upload(asset.objectPath, input.bytes, {
          contentType: asset.mimeType,
          cacheControl: "60",
          upsert: false,
        });
      if (error) throw new FileUploadError(error.message, asset, "upload");
      try {
        return await finalize(asset.id);
      } catch (error) {
        // A lost response may follow a successful commit. Keep the id so callers
        // can retry finalize; never silently delete a potentially completed upload.
        throw new FileUploadError(
          error instanceof Error
            ? error.message
            : "Yuklashni yakunlab bo‘lmadi.",
          asset,
          "finalize",
        );
      }
    },
    async signedUrl(fileId: string, expiresIn = 300): Promise<string> {
      const asset = await getFile(fileId);
      if (asset.state !== "ready") throw new Error("Fayl hali tayyor emas.");
      const seconds = Math.max(1, Math.min(300, Math.floor(expiresIn) || 300));
      return checked<{ signedUrl: string }>(
        await client.storage
          .from(asset.bucketId)
          .createSignedUrl(asset.objectPath, seconds),
      ).signedUrl;
    },
    async remove(fileId: string): Promise<void> {
      // Reserve deletion first. SQL refuses assets still attached to a message,
      // pending/approved certificate, avatar, cover or class material.
      const asset = await rpc<FileAsset>("darsino_begin_file_delete", {
        p_file_id: fileId,
      });
      checked(
        await client.storage.from(asset.bucketId).remove([asset.objectPath]),
      );
      await rpc<void>("darsino_forget_file", { p_file_id: fileId });
    },
    setAvatar: (fileId: string | null) =>
      rpc<void>("darsino_set_avatar", { p_file_id: fileId }),
    setCover: (offeringId: string, fileId: string | null) =>
      rpc<void>("darsino_set_cover", {
        p_offering_id: offeringId,
        p_file_id: fileId,
      }),
    submitDocument: (
      fileId: string,
      documentType: TutorDocument["documentType"],
      label: string,
    ) =>
      rpc<string>("darsino_submit_document", {
        p_file_id: fileId,
        p_document_type: documentType,
        p_label: label,
      }),
    sendMessage: (fileId: string, text = "") =>
      rpc<string>("darsino_send_file_message", {
        p_file_id: fileId,
        p_text: text,
      }),
    attachMaterial: (fileId: string, title: string, sessionId?: string) =>
      rpc<string>("darsino_attach_lesson_file", {
        p_file_id: fileId,
        p_title: title,
        p_session_id: sessionId ?? null,
      }),
    manageMaterial: (
      attachmentId: string,
      options: { published?: boolean; remove?: boolean },
    ) =>
      rpc<void>("darsino_manage_lesson_file", {
        p_attachment_id: attachmentId,
        p_published: options.published ?? true,
        p_remove: options.remove ?? false,
      }),
    catalog: () =>
      rpc<
        {
          kind: "subject" | "goal" | "area" | "mode";
          value: string;
          sortOrder: number;
        }[]
      >("darsino_get_catalog"),
  };
}
