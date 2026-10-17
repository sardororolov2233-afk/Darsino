export type AssistantMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};
export type AssistantHistory = {
  conversationId: string | null;
  messages: AssistantMessage[];
};
export type AssistantPosition = { x: number; y: number };
export function clampAssistantPosition(
  point: AssistantPosition,
  width: number,
  height: number,
  top = 0,
  bottom = 0,
): AssistantPosition {
  return {
    x: Math.max(
      12,
      Math.min(
        Math.max(12, width - 72),
        Number.isFinite(point.x) ? point.x : width - 72,
      ),
    ),
    y: Math.max(
      top + 12,
      Math.min(
        Math.max(top + 12, height - bottom - 148),
        Number.isFinite(point.y) ? point.y : height * 0.6,
      ),
    ),
  };
}
