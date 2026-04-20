// src/hooks/useLanguage.js
import { useTranslation } from 'react-i18next';

export const LANGUAGES = [
  { code: 'en', label: 'English', flag: '🇬🇧', speechCode: 'en-IN' },
  { code: 'hi', label: 'हिंदी',   flag: '🇮🇳', speechCode: 'hi-IN' },
  { code: 'te', label: 'తెలుగు', flag: '🇮🇳', speechCode: 'te-IN' },
];

export function useLanguage() {
  const { i18n } = useTranslation();
  const changeLanguage = (code) => { i18n.changeLanguage(code); localStorage.setItem('agriwise_lang', code); };
  const currentLang = LANGUAGES.find(l => l.code === i18n.language) || LANGUAGES[0];
  return { currentLang, changeLanguage, languages: LANGUAGES };
}
