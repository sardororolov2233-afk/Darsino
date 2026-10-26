import { useRef, useState } from "react";
import { AppText, Card } from "./ui";
import { C } from "../theme";

export function useAction() {
  const pending = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  async function run<T>(
    operation: () => Promise<T>,
    onSuccess?: (value: T) => void,
  ) {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      const value = await operation();
      onSuccess?.(value);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Amal bajarilmadi. Qayta urinib ko‘ring.",
      );
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  return { busy, error, success, run, setSuccess, setError };
}
export function Feedback({
  error,
  success,
}: {
  error?: string;
  success?: string;
}) {
  if (!error && !success) return null;
  return (
    <Card style={{ backgroundColor: error ? C.errorSoft : C.greenSoft }}>
      <AppText
        color={error ? C.error : C.green}
        accessibilityLiveRegion="polite"
      >
        {error || success}
      </AppText>
    </Card>
  );
}
