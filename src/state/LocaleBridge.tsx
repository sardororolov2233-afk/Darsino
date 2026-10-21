import { useEffect } from "react";
import { useApp } from "./AppContext";
import { useI18n } from "../i18n";
import { readAccountSettings } from "./account";
export function LocaleBridge() {
  const { user, market, signedIn } = useApp();
  const { setLanguage, ready } = useI18n();
  const settings = market.accountSettings?.[user.id];
  useEffect(() => {
    if (ready && signedIn) setLanguage(readAccountSettings(settings).language);
  }, [ready, signedIn, user.id, settings?.language, setLanguage]);
  return null;
}
