import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useLanguage } from '../contexts';

const pages = {
  ru: {
    '/': {
      title: 'Alexol — ИИ и автоматизация для бизнеса',
      description:
        'Помогаем компаниям разобраться в возможностях ИИ, обучить команды, оптимизировать процессы и внедрить программные решения. Москва и вся Россия.',
    },
    '/speeches': {
      title: 'Корпоративные выступления об ИИ — Alexol',
      description:
        'Корпоративные выступления и практикумы об искусственном интеллекте для руководителей и команд. Живые демонстрации и разбор задач бизнеса.',
    },
    '/news': {
      title: 'Новости и материалы — Alexol',
      description: 'Новости и материалы Alexol о разработке программного обеспечения и технологиях для бизнеса.',
    },
  },
  en: {
    '/': {
      title: 'Alexol — AI and business automation',
      description:
        'We help companies explore practical AI, train teams, improve processes and implement software solutions. Based in Moscow, working across Russia.',
    },
    '/speeches': {
      title: 'Corporate AI Talks & Workshops — Alexol',
      description:
        'Corporate AI talks and practical workshops for business leaders and teams. Live demonstrations and real-world business scenarios.',
    },
    '/news': {
      title: 'News & Insights — Alexol',
      description: 'Alexol news and insights on software development and technology for business.',
    },
  },
};

export const RouteMetadata = () => {
  const { pathname } = useLocation();
  const { language } = useLanguage();

  useEffect(() => {
    const page = pages[language][pathname as keyof (typeof pages)['ru']] ?? pages[language]['/'];
    const canonical = `https://alexol.io${pathname === '/' ? '/' : pathname}`;
    document.title = page.title;

    const setMeta = (selector: string, attribute: string, value: string) => {
      document.querySelector(selector)?.setAttribute(attribute, value);
    };

    setMeta('meta[name="description"]', 'content', page.description);
    setMeta('meta[property="og:title"]', 'content', page.title);
    setMeta('meta[property="og:description"]', 'content', page.description);
    setMeta('meta[property="og:url"]', 'content', canonical);
    setMeta('meta[property="twitter:title"]', 'content', page.title);
    setMeta('meta[property="twitter:description"]', 'content', page.description);
    setMeta('link[rel="canonical"]', 'href', canonical);
    setMeta('meta[property="og:locale"]', 'content', language === 'ru' ? 'ru_RU' : 'en_US');
  }, [pathname, language]);

  return null;
};
