import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

import type { Language } from '@/shared/utils/translations';

const meta = {
  ru: {
    title: 'Alexol — Разработка ПО на заказ',
    description: 'Профессиональная разработка Web, Mobile, Enterprise решений. Полный цикл от аналитики до внедрения. 7+ лет опыта, 150+ проектов.',
    keywords: 'разработка ПО на заказ, веб-разработка, мобильные приложения, enterprise решения, аутсорсинг разработки, UI/UX дизайн, AI/ML интеграции, alexol, алексол',
    lang: 'ru',
    ogLocale: 'ru_RU',
  },
  en: {
    title: 'Alexol — Custom Software Development',
    description: 'Professional development of Web, Mobile, Enterprise solutions. Full cycle from analysis to implementation. 7+ years of experience, 150+ projects.',
    keywords: 'custom software development, web development, mobile apps, enterprise solutions, outsourcing, UI/UX design, AI/ML integrations, alexol',
    lang: 'en',
    ogLocale: 'en_US',
  },
};

const updateMeta = (lang: Language) => {
  const m = meta[lang];
  document.documentElement.setAttribute('lang', m.lang);
  document.title = m.title;
  document.querySelector('meta[name="title"]')?.setAttribute('content', m.title);
  document.querySelector('meta[name="description"]')?.setAttribute('content', m.description);
  document.querySelector('meta[name="keywords"]')?.setAttribute('content', m.keywords);
  document.querySelector('meta[property="og:title"]')?.setAttribute('content', m.title);
  document.querySelector('meta[property="og:description"]')?.setAttribute('content', m.description);
  document.querySelector('meta[property="og:locale"]')?.setAttribute('content', m.ogLocale);
  document.querySelector('meta[property="twitter:title"]')?.setAttribute('content', m.title);
  document.querySelector('meta[property="twitter:description"]')?.setAttribute('content', m.description);
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('language');
    if (saved && (saved === 'ru' || saved === 'en')) return saved as Language;

    const browserLang = navigator.language.toLowerCase();
    return browserLang.startsWith('ru') ? 'ru' : 'en';
  });

  useEffect(() => {
    localStorage.setItem('language', language);
    updateMeta(language);
  }, [language]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
  };

  return <LanguageContext.Provider value={{ language, setLanguage }}>{children}</LanguageContext.Provider>;
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
};
