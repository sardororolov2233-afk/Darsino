import type { SupabaseClient } from "@supabase/supabase-js";
import type { AssistantHistory } from "../state/assistant";
export class AssistantServiceError extends Error {
  constructor(
    message: string,
    readonly confirmedFailure: boolean,
  ) {
    super(message);
  }
}
export function createAssistantService(client: SupabaseClient) {
  return {
    async history(
      conversationId: string | null = null,
    ): Promise<AssistantHistory> {
      const { data, error } = await client.rpc("oqi_ai_history", {
        p_conversation_id: conversationId,
      });
      if (error) throw new Error(error.message);
      return data as AssistantHistory;
    },
    async send(
      message: string,
      conversationId: string | null,
      requestId: string,
    ): Promise<{ reply: string; conversationId: string }> {
      const { data, error } = await client.functions.invoke("oqi-assistant", {
        body: { message, conversationId, requestId },
        timeout: 50000,
      });
      if (error) {
        let message =
          "AI bilan ulanish amalga oshmadi. Internetni tekshirib qayta urining.";
        if (error.context instanceof Response) {
          const body = await error.context.json().catch(() => null);
          if (typeof body?.error === "string") message = body.error;
        }
        throw new AssistantServiceError(
          message,
          error.context instanceof Response && error.context.status !== 429,
        );
      }
      if (
        typeof data?.reply !== "string" ||
        typeof data?.conversationId !== "string"
      )
        throw new Error("AI javobi kelmadi. Qayta urinib ko‘ring.");
      return data;
    },
  };
}
