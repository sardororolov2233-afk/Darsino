export type ChatMessage = { role: "user" | "assistant"; content: string };
export type Reservation = {
  conversationId: string;
  status?: "reserved" | "pending" | "completed" | "failed" | "expired";
  messages?: ChatMessage[];
  reply?: string;
};
export type AssistantDependencies = {
  configured: boolean;
  authenticate: (token: string) => Promise<string | null>;
  begin: (
    token: string,
    requestId: string,
    conversationId: string | null,
    message: string,
  ) => Promise<Reservation>;
  generate: (messages: ChatMessage[]) => Promise<string>;
  finish: (
    userId: string,
    requestId: string,
    reply: string | null,
  ) => Promise<void>;
};
const uuid =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization,x-client-info,apikey,content-type",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
  "Cache-Control": "no-store",
};
export function createAssistantHandler(deps: AssistantDependencies) {
  return async (request: Request): Promise<Response> => {
    const json = (status: number, data: unknown) =>
      new Response(JSON.stringify(data), {
        status,
        headers: { ...cors, "Content-Type": "application/json; charset=utf-8" },
      });
    if (request.method === "OPTIONS")
      return new Response(null, { status: 204, headers: cors });
    if (request.method !== "POST")
      return json(405, { error: "Faqat POST so‘rovi mumkin." });
    const token = request.headers.get("Authorization");
    if (!token?.startsWith("Bearer "))
      return json(401, { error: "Akkauntingizga qayta kiring." });
    if (!deps.configured)
      return json(503, {
        error: "AI yordamchi hali sozlanmagan. Birozdan keyin urinib ko‘ring.",
      });
    let input: Record<string, unknown>;
    try {
      // Bound the actual stream too: Content-Length can be omitted or forged.
      const reader = request.body?.getReader();
      if (!reader) return json(400, { error: "Savolni kiriting." });
      const chunks: Uint8Array[] = [];
      let size = 0;
      while (true) {
        const chunk = await reader.read();
        if (chunk.done) break;
        size += chunk.value.byteLength;
        if (size > 12000) {
          await reader.cancel();
          return json(413, { error: "So‘rov juda katta." });
        }
        chunks.push(chunk.value);
      }
      const bytes = new Uint8Array(size);
      let offset = 0;
      for (const chunk of chunks) {
        bytes.set(chunk, offset);
        offset += chunk.byteLength;
      }
      const decoded = JSON.parse(new TextDecoder().decode(bytes));
      if (!decoded || Array.isArray(decoded) || typeof decoded !== "object")
        throw new Error();
      input = decoded;
    } catch {
      return json(400, { error: "So‘rov formati noto‘g‘ri." });
    }
    const { requestId, conversationId = null, message } = input;
    if (
      typeof requestId !== "string" ||
      !uuid.test(requestId) ||
      (conversationId !== null &&
        (typeof conversationId !== "string" || !uuid.test(conversationId))) ||
      typeof message !== "string" ||
      !message.trim() ||
      message.length > 2000
    )
      return json(400, {
        error:
          "Savol 1–2000 belgidan iborat bo‘lsin. So‘rov identifikatorini tekshiring.",
      });
    let userId: string | null;
    try {
      userId = await deps.authenticate(token);
    } catch {
      return json(503, {
        error: "Kirishni tekshirib bo‘lmadi. Qayta urining.",
      });
    }
    if (!userId) return json(401, { error: "Akkauntingizga qayta kiring." });
    let reservation: Reservation;
    try {
      reservation = await deps.begin(
        token,
        requestId,
        conversationId,
        message.trim(),
      );
    } catch (e) {
      // Database transport errors and implementation details are never public.
      // Only these explicit SQLSTATEs identify safe, expected domain failures.
      const code = e && typeof e === "object" && "code" in e ? e.code : null;
      if (code === "OQ400")
        return json(400, { error: "Savol 1–2000 belgidan iborat bo‘lsin." });
      if (code === "OQ403")
        return json(403, {
          error: "AI yordamchidan foydalanish huquqingiz yo‘q.",
        });
      if (code === "OQ429")
        return json(429, {
          error: "AI so‘rov limiti tugadi. Birozdan keyin qayta urining.",
        });
      return json(503, {
        error: "Savolni hozir yuborib bo‘lmadi. Qayta urinib ko‘ring.",
      });
    }
    if (reservation.status === "pending")
      return json(429, {
        error: "Bu so‘rov bajarilmoqda. Biroz kutib, qayta urining.",
        code: "request_pending",
      });
    if (reservation.status === "failed" || reservation.status === "expired")
      return json(409, {
        error: "Avvalgi so‘rov yakunlanmadi. Savolingizni qayta yuboring.",
        code: "request_failed",
      });
    if (reservation.reply)
      return json(200, {
        conversationId: reservation.conversationId,
        reply: reservation.reply,
      });
    try {
      const reply = (await deps.generate(reservation.messages || []))
        .trim()
        .slice(0, 8000);
      if (!reply) throw new Error("Empty generation");
      await deps.finish(userId, requestId, reply);
      return json(200, { conversationId: reservation.conversationId, reply });
    } catch {
      // Provider errors can contain credentials or request internals. Never echo them.
      // A finalize response can be lost after its transaction committed. Recover
      // the saved response before marking a genuinely unfinished request failed.
      const saved = await deps
        .begin(token, requestId, conversationId, message.trim())
        .catch(() => null);
      if (saved?.reply)
        return json(200, {
          conversationId: saved.conversationId,
          reply: saved.reply,
        });
      await deps.finish(userId, requestId, null).catch(() => {});
      return json(502, {
        error: "AI javobini olib bo‘lmadi. Qayta urinib ko‘ring.",
      });
    }
  };
}
