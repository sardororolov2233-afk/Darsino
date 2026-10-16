import { createClient } from "npm:@supabase/supabase-js@2.117.3";
import { createGateway, generateText } from "npm:ai@7.0.142";
import { createAssistantHandler } from "../_shared/assistantHandler.ts";

const url = Deno.env.get("SUPABASE_URL") || "";
const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
const serverKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const gatewayKey = Deno.env.get("AI_GATEWAY_API_KEY") || "";
const model = Deno.env.get("AI_MODEL") || "";
const clientFor = (token: string) =>
  createClient(url, anonKey, {
    global: { headers: { Authorization: token } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
const handler = createAssistantHandler({
  configured: !!(url && anonKey && serverKey && gatewayKey && model),
  async authenticate(token) {
    const { data, error } = await clientFor(token).auth.getUser(token.slice(7));
    return error ? null : data.user?.id || null;
  },
  async begin(token, requestId, conversationId, message) {
    const { data, error } = await clientFor(token).rpc("oqi_ai_begin_request", {
      p_request_id: requestId,
      p_conversation_id: conversationId,
      p_message: message,
    });
    if (error) throw new Error(error.message);
    return data;
  },
  async generate(messages) {
    const gateway = createGateway({ apiKey: gatewayKey });
    const { text } = await generateText({
      model: gateway(model),
      messages,
      system:
        "Siz O‘qi ilovasidagi o‘quvchining ta’lim yordamchisisiz. Odatda o‘zbek tilida sodda, tushunarli javob bering. Masalani bosqichma-bosqich tushuntiring, zarur bo‘lsa bitta aniqlashtiruvchi savol bering. Dars mavzulari, tillar, mashqlar va o‘qish rejalariga yordam bering. Bilmagan ma’lumotni to‘qimang. Sizda o‘quvchining baholari, shaxsiy fayllari yoki ustozlar bazasiga kirish yo‘q; bunday imkoniyat bor deb aytmang. Tashqi amallar bajarmaysiz. Javobni taxminan 600 so‘zdan oshirmang.",
      maxOutputTokens: 900,
      maxRetries: 0,
      abortSignal: AbortSignal.timeout(35000),
    });
    return text;
  },
  async finish(userId, requestId, reply) {
    const server = createClient(url, serverKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { error } = await server.rpc("oqi_ai_finish_request", {
      p_user_id: userId,
      p_request_id: requestId,
      p_reply: reply,
    });
    if (error) throw new Error("Cannot finalize assistant response");
  },
});
Deno.serve(handler);
