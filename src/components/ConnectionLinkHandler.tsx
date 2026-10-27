import { useEffect, useState } from "react";
import { Linking } from "react-native";
import { parseContactQr } from "../state/account";
export function ConnectionLinkHandler({
  signedIn,
  ready,
  onOpen,
}: {
  signedIn: boolean;
  ready: boolean;
  onOpen: (id: string) => void;
}) {
  const [pending, setPending] = useState("");
  useEffect(() => {
    let active = true;
    const receive = (url: string | null) => {
      if (!active || !url || !/^darsino:\/\/connect\//i.test(url)) return;
      const id = parseContactQr(url);
      if (id) setPending(id);
    };
    void Linking.getInitialURL()
      .then(receive)
      .catch(() => {});
    const listener = Linking.addEventListener("url", ({ url }) => receive(url));
    return () => {
      active = false;
      listener.remove();
    };
  }, []);
  useEffect(() => {
    if (pending && signedIn && ready) {
      onOpen(pending);
      setPending("");
    }
  }, [pending, signedIn, ready, onOpen]);
  return null;
}
