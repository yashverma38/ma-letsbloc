import type { SupportedLang } from './sarvam';

export type LangOption = {
  code: SupportedLang;
  label: string;          // shown in UI
  translateTo?: string;   // language name passed to the translator; undefined = use template as-is
};

export const LANG_OPTIONS: LangOption[] = [
  { code: 'hi-IN', label: 'Hinglish' },                                    // default — no translation
  { code: 'hi-IN', label: 'Hindi',    translateTo: 'Hindi (Roman script)' },
  { code: 'en-IN', label: 'Indian English', translateTo: 'Indian English' },
  { code: 'ta-IN', label: 'Tamil',    translateTo: 'Tamil (Roman script)' },
  { code: 'bn-IN', label: 'Bengali',  translateTo: 'Bengali (Roman script)' },
  { code: 'mr-IN', label: 'Marathi',  translateTo: 'Marathi (Roman script)' },
  { code: 'pa-IN', label: 'Punjabi',  translateTo: 'Punjabi (Roman script)' },
  { code: 'te-IN', label: 'Telugu',   translateTo: 'Telugu (Roman script)' },
  { code: 'gu-IN', label: 'Gujarati', translateTo: 'Gujarati (Roman script)' },
];

export function findLang(key: string): LangOption {
  return LANG_OPTIONS.find((o) => `${o.code}|${o.label}` === key) || LANG_OPTIONS[0];
}
