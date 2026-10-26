import type { SupabaseClient } from "@supabase/supabase-js";

// Events only invalidate the RPC snapshot; payloads never enter client state.
// Polling remains as a fallback when a WebSocket is unavailable or reconnecting.
export function subscribeToMarketplace(
  client: SupabaseClient,
  userId: string,
  refresh: () => void,
) {
  let active = true;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const invalidate = () => {
    if (!active || timer) return;
    timer = setTimeout(() => {
      timer = undefined;
      if (active) refresh();
    }, 200);
  };
  const channel = client.channel(`darsino:${userId}`);
  const filters = [
    ["darsino_notifications", `user_id=eq.${userId}`],
    ["darsino_messages", `recipient_id=eq.${userId}`],
    ["darsino_messages", `sender_id=eq.${userId}`],
    ["darsino_enrollments", `student_id=eq.${userId}`],
    ["darsino_group_invitations", `student_id=eq.${userId}`],
    ["darsino_group_invitations", `tutor_id=eq.${userId}`],
    ["darsino_contact_requests", `recipient_id=eq.${userId}`],
    ["darsino_contact_requests", `sender_id=eq.${userId}`],
  ];
  for (const [table, filter] of filters) {
    for (const event of ["INSERT", "UPDATE"] as const)
      channel.on(
        "postgres_changes",
        { schema: "public", table, event, filter },
        invalidate,
      );
  }
  channel.subscribe((status) => {
    if (status === "SUBSCRIBED") invalidate();
  });
  return () => {
    active = false;
    clearTimeout(timer);
    void client.removeChannel(channel).catch(() => {});
  };
}
