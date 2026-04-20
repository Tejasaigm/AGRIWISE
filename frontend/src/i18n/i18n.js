// src/i18n/i18n.js
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import en from './locales/en.json';
import hi from './locales/hi.json';
import te from './locales/te.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: { en: { translation: en }, hi: { translation: hi }, te: { translation: te } },
    lng: localStorage.getItem('agriwise_lang') || 'en',
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
    detection: { order: ['localStorage','navigator'], lookupLocalStorage: 'agriwise_lang', cacheUserLanguage: true },
  });

export default i18n;
