import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

import type { Language } from '@/shared/utils/translations';

const meta = {
  ru: {
    title: 'Alexol — ИИ и автоматизация для бизнеса',
    description:
      'Помогаем компаниям разобраться в возможностях ИИ, обучить команды, оптимизировать процессы и внедрить программные решения. Москва и вся Россия.',
    keywords:
      'внедрение ИИ в бизнес, автоматизация бизнес-процессов, аудит процессов, обучение ИИ сотрудников, разработка ПО на заказ, Alexol, Алексол',
    lang: 'ru',
    ogLocale: 'ru_RU',
  },
  en: {
    title: 'Alexol — AI and business automation',
    description:
      'We help companies explore practical AI, train teams, improve processes and implement software solutions.',
    keywords:
      'business AI implementation, process automation, process audit, corporate AI training, custom software development, Alexol',
    lang: 'en',
    ogLocale: 'en_US',
  },
};

const updateMeta = (lang: Language) => {
  const m = meta[lang];
  document.documentElement.setAttribute('lang', m.lang);
  const routeContent =
    lang === 'ru'
      ? {
          '/': [m.title, m.description],
          '/speeches': [
            'Корпоративные выступления об ИИ — Alexol',
            'Корпоративные выступления и практикумы об искусственном интеллекте для руководителей и команд. Живые демонстрации и разбор задач бизнеса.',
          ],
        }
      : {
          '/': [m.title, m.description],
          '/speeches': [
            'Corporate AI Talks & Workshops — Alexol',
            'Corporate AI talks and practical workshops for business leaders and teams. Live demonstrations and real-world business scenarios.',
          ],
        };
  const [title, description] = routeContent[window.location.pathname as keyof typeof routeContent] ?? routeContent['/'];
  document.title = title;
  document.querySelector('meta[name="title"]')?.setAttribute('content', title);
  document.querySelector('meta[name="description"]')?.setAttribute('content', description);
  document.querySelector('meta[name="keywords"]')?.setAttribute('content', m.keywords);
  document.querySelector('meta[property="og:title"]')?.setAttribute('content', title);
  document.querySelector('meta[property="og:description"]')?.setAttribute('content', description);
  document.querySelector('meta[property="twitter:title"]')?.setAttribute('content', title);
  document.querySelector('meta[property="twitter:description"]')?.setAttribute('content', description);
  document.querySelector('meta[property="og:locale"]')?.setAttribute('content', m.ogLocale);
  const canonical = `${window.location.origin}${window.location.pathname}`;
  document.querySelector('meta[property="og:url"]')?.setAttribute('content', canonical);
  document.querySelector('link[rel="canonical"]')?.setAttribute('href', canonical);
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
