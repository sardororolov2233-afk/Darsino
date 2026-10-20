import type { Language } from "../state/account";
import { translationRows } from "./catalog";
export type TranslationRow = readonly [string, string, string, string, string];
const languages: Language[] = ["uz", "ru", "en", "kk", "ky"];
const dictionaries = Object.fromEntries(languages.map((language, i) => [
  language, new Map(translationRows.map((row) => [row[0], row[i]])),
])) as Record<Language, Map<string, string>>;
const escape = (value: string) => value.replace(/[.*+?^$()|[\]\\]/g, "\\$&");
const templates = translationRows.filter((row) => /\{[a-zA-Z]+\}/.test(row[0])).map((row) => {
  const keys = [...row[0].matchAll(/\{([a-zA-Z]+)\}/g)].map((m) => m[1]);
  const pieces = row[0].split(/\{[a-zA-Z]+\}/);
  return { row, keys, pattern: new RegExp("^" + pieces.map(escape).join("(.+?)") + "$") };
});
export function translate(text: string, language: Language): string {
  if (language === "uz" || !text.trim()) return text;
  const clean = text.replace(/\s+/g, " ").trim();
  const direct = dictionaries[language].get(clean);
  if (direct !== undefined) return text.replace(/\S[\s\S]*\S|\S/, direct);
  for (const { row, keys, pattern } of templates) {
    const match = clean.match(pattern);
    if (!match) continue;
    let result = row[languages.indexOf(language)];
    for (let i = 0; i < keys.length; i++) result = result.replaceAll("{" + keys[i] + "}", match[i + 1]);
    return result;
  }
  return text;
}
export function untranslated(language: Language, text: string) {
  return language !== "uz" && !dictionaries[language].has(text.trim());
}
