import React, { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LANGUAGES, type Language } from "../state/account";
import { translate } from "./translate";

type LocaleContext = { ready: boolean; language: Language; setLanguage: (language: Language) => void };
const Context = createContext<LocaleContext>({ ready: false, language: "uz", setLanguage: () => {} });
export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [language, update] = useState<Language>("uz");
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    let active = true;
    AsyncStorage.getItem("@oqi/language").then((saved) => {
      if (active && LANGUAGES.some((l) => l.code === saved)) update(saved as Language);
    }).catch(() => {}).finally(() => { if (active) setHydrated(true); });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    if (!hydrated) return;
    void AsyncStorage.setItem("@oqi/language", language).catch(() => {});
    if (typeof document !== "undefined") document.documentElement.lang = language;
  }, [language, hydrated]);
  return <Context.Provider value={{ ready: hydrated, language, setLanguage: update }}>{children}</Context.Provider>;
}
export function useI18n() {
  const context = useContext(Context);
  return { ...context, t: (text: string) => translate(text, context.language) };
}
export function localizedChildren(children: React.ReactNode, language: Language): React.ReactNode {
  return React.Children.map(children, (child) => typeof child === "string" ? translate(child, language) : child);
}
