import { useLanguage } from '../contexts';

const translations = {
  header: {
    nav: {
      about: { ru: 'О нас', en: 'About' },
      services: { ru: 'Услуги', en: 'Services' },
      solutions: { ru: 'Решения', en: 'Solutions' },
      cases: { ru: 'Кейсы', en: 'Cases' },
      news: { ru: 'Новости', en: 'News' },
      contact: { ru: 'Контакты', en: 'Contact' },
    },
    discussProject: { ru: 'Обсудить проект', en: 'Discuss Project' },
  },
  hero: {
    title: {
      ru: 'Разработка программного обеспечения любой сложности',
      en: 'Custom Software Development of Any Complexity',
    },
    description: {
      ru: 'Профессиональная разработка Web, Mobile, Enterprise решений. Полный цикл от аналитики до внедрения',
      en: 'Professional development of Web, Mobile, Enterprise solutions. Full cycle from analysis to implementation',
    },
    cta: { ru: 'Обсудить проект', en: 'Discuss Project' },
    emailPlaceholder: { ru: 'Ваш email', en: 'Your email' },
    modules: {
      web: {
        title: { ru: 'Веб-приложения', en: 'Web Applications' },
        description: { ru: 'Сайты, порталы, SaaS-платформы', en: 'Websites, portals, SaaS platforms' },
        cta: { ru: 'Создать веб-приложение', en: 'Create web application' },
      },
      enterprise: {
        title: { ru: 'Enterprise-системы', en: 'Enterprise Systems' },
        description: { ru: 'ERP, CRM, корпоративные решения', en: 'ERP, CRM, corporate solutions' },
        cta: { ru: 'Разработать систему', en: 'Develop system' },
      },
      ecommerce: {
        title: { ru: 'Электронная коммерция', en: 'E-commerce' },
        description: { ru: 'Интернет-магазины, маркетплейсы', en: 'Online stores, marketplaces' },
        cta: { ru: 'Запустить магазин', en: 'Launch store' },
      },
      mobile: {
        title: { ru: 'Мобильные приложения', en: 'Mobile Applications' },
        description: { ru: 'iOS, Android, кроссплатформа', en: 'iOS, Android, cross-platform' },
        cta: { ru: 'Создать приложение', en: 'Create application' },
      },
      ai: {
        title: { ru: 'AI и машинное обучение', en: 'AI & Machine Learning' },
        description: { ru: 'Чат-боты, аналитика, автоматизация', en: 'Chatbots, analytics, automation' },
        cta: { ru: 'Внедрить AI', en: 'Implement AI' },
      },
      cloud: {
        title: { ru: 'Облачные решения', en: 'Cloud Solutions' },
        description: { ru: 'Инфраструктура, DevOps, масштабирование', en: 'Infrastructure, DevOps, scaling' },
        cta: { ru: 'Перейти в облако', en: 'Move to cloud' },
      },
      frontend: {
        title: { ru: 'Frontend', en: 'Frontend' },
        description: { ru: 'React, TypeScript, современные UI', en: 'React, TypeScript, modern UI' },
        cta: { ru: 'Разработать интерфейс', en: 'Develop interface' },
      },
      backend: {
        title: { ru: 'Backend', en: 'Backend' },
        description: { ru: 'Python, Node.js, API, базы данных', en: 'Python, Node.js, API, databases' },
        cta: { ru: 'Создать backend', en: 'Create backend' },
      },
    },
  },
  trustLine: {
    title: {
      ru: 'Реализованные проекты для компаний различных отраслей',
      en: 'Completed projects for companies across industries',
    },
  },
  about: {
    title: { ru: 'Превращаем бизнес-задачи в', en: 'We transform business challenges into' },
    titleHighlight: { ru: 'эффективные программные решения', en: 'effective software solutions' },
    description: {
      ru: 'Alexol — компания по разработке программного обеспечения на заказ. Специализируемся на создании сложных корпоративных систем, веб-приложений и мобильных решений. Обеспечиваем полный цикл разработки: от аналитики и проектирования до внедрения и технической поддержки.',
      en: 'Alexol is a custom software development company. We specialize in creating complex enterprise systems, web applications, and mobile solutions. We provide a full development cycle: from analysis and design to implementation and technical support.',
    },
    button: { ru: 'О компании', en: 'About company' },
    metrics: {
      years: { ru: 'лет опыта', en: 'years of experience' },
      projects: { ru: 'реализованных проектов', en: 'completed projects' },
      industries: { ru: 'отраслей', en: 'industries' },
      specialists: { ru: 'senior-специалистов', en: 'senior specialists' },
    },
  },
  services: {
    title: { ru: 'Услуги компании', en: 'Company Services' },
    items: {
      development: {
        title: { ru: 'Разработка ПО на заказ', en: 'Custom Software Development' },
        description: {
          ru: 'Создание корпоративных систем, веб и мобильных приложений под ключ с учетом специфики вашего бизнеса.',
          en: 'Turnkey development of enterprise systems, web and mobile applications tailored to your business needs.',
        },
      },
      outsourcing: {
        title: { ru: 'Аутсорсинг разработки', en: 'Development Outsourcing' },
        description: {
          ru: 'Передача разработки на аутсорс. Выделенные команды разработчиков для усиления вашего IT-отдела.',
          en: 'Outsourcing development. Dedicated development teams to strengthen your IT department.',
        },
      },
      design: {
        title: { ru: 'Проектирование интерфейсов', en: 'Interface Design' },
        description: {
          ru: 'Разработка UI/UX дизайна, создание дизайн-систем и прототипирование пользовательских интерфейсов.',
          en: 'UI/UX design development, design systems creation and user interface prototyping.',
        },
      },
      ai: {
        title: { ru: 'Внедрение AI/ML решений', en: 'AI/ML Solutions Implementation' },
        description: {
          ru: 'Интеграция искусственного интеллекта и машинного обучения для автоматизации бизнес-процессов.',
          en: 'Integration of artificial intelligence and machine learning to automate business processes.',
        },
      },
      support: {
        title: { ru: 'Техническая поддержка', en: 'Technical Support' },
        description: {
          ru: 'Сопровождение программного обеспечения, устранение инцидентов, развитие и модернизация систем.',
          en: 'Software maintenance, incident resolution, system development and modernization.',
        },
      },
      consulting: {
        title: { ru: 'IT-консалтинг', en: 'IT Consulting' },
        description: {
          ru: 'Технический аудит, проектирование архитектуры, разработка стратегии цифровой трансформации.',
          en: 'Technical audit, architecture design, digital transformation strategy development.',
        },
      },
    },
  },
  portfolio: {
    title: { ru: 'Решения и портфолио', en: 'Solutions & Portfolio' },
    description: {
      ru: 'Представлены некоторые из наших работ. Большинство проектов под NDA',
      en: 'Some of our work is presented. Most projects are under NDA',
    },
    filters: {
      all: { ru: 'Все', en: 'All' },
    },
    showMore: { ru: 'Показать ещё', en: 'Show more' },
    showLess: { ru: 'Скрыть', en: 'Show less' },
    projects: {
      portalToBitcoin: {
        description: { ru: 'Промо-платформа для BonusBlock', en: 'Promo platform for BonusBlock' },
        result: { ru: 'Quests & Rewards система', en: 'Quests & Rewards system' },
      },
      elysNetwork: {
        description: { ru: 'Промо-платформа для BonusBlock', en: 'Promo platform for BonusBlock' },
        result: { ru: 'DeFi проект', en: 'DeFi project' },
      },
      xion: {
        description: { ru: 'Промо-платформа для BonusBlock', en: 'Promo platform for BonusBlock' },
        result: { ru: 'Web3 инфраструктура', en: 'Web3 infrastructure' },
      },
      bonusBlock: {
        description: { ru: 'Основная платформа', en: 'Main platform' },
        result: { ru: '15+ интегрированных проектов', en: '15+ integrated projects' },
      },
      kiteAi: {
        description: { ru: 'AI-платформа testnet', en: 'AI platform testnet' },
        result: { ru: 'AI + Blockchain интеграция', en: 'AI + Blockchain integration' },
      },
      agoric: {
        description: { ru: 'Промо-платформа для BonusBlock', en: 'Promo platform for BonusBlock' },
        result: { ru: 'Smart Contracts платформа', en: 'Smart Contracts platform' },
      },
      workwear: {
        title: { ru: 'Интернет-магазин спецодежды', en: 'Workwear Online Store' },
        description: { ru: 'Магазин камуфляжа и тактической одежды', en: 'Camouflage and tactical clothing store' },
        result: { ru: 'Каталог, корзина, оплата', en: 'Catalog, cart, payment' },
      },
      oneWish: {
        title: { ru: 'OneWish - женское белье', en: 'OneWish - Lingerie' },
        description: { ru: 'Интернет-магазин с админ-панелью', en: 'Online store with admin panel' },
        result: { ru: 'Полный цикл: каталог, корзина, CMS', en: 'Full cycle: catalog, cart, CMS' },
      },
      computerClub: {
        title: { ru: 'ПО для компьютерного клуба', en: 'Computer Club Software' },
        description: { ru: 'Система управления компьютерным клубом', en: 'Computer club management system' },
        result: { ru: 'Бронирование, тарифы, аналитика', en: 'Booking, tariffs, analytics' },
      },
      telegramBot: {
        title: { ru: 'Telegram-бот парсер авто', en: 'Telegram Car Parser Bot' },
        description: { ru: 'Парсинг объявлений с зарубежных сайтов', en: 'Parsing ads from foreign websites' },
        result: { ru: 'Автоматический мониторинг и уведомления', en: 'Automatic monitoring and notifications' },
      },
    },
  },
  whyDigital: {
    title: { ru: 'Инвестиции в ПО —', en: 'Software investment is' },
    titleHighlight: { ru: 'это инвестиции в развитие бизнеса', en: 'an investment in business growth' },
    button: { ru: 'Запросить консультацию', en: 'Request Consultation' },
    benefits: {
      automation: {
        ru: 'Автоматизация процессов и снижение операционных издержек',
        en: 'Process automation and operational cost reduction',
      },
      simplification: {
        ru: 'Оптимизация бизнес-процессов и клиентского опыта',
        en: 'Business process and customer experience optimization',
      },
      transparency: {
        ru: 'Полный контроль и прозрачность операционной деятельности',
        en: 'Complete control and operational transparency',
      },
      reliability: {
        ru: 'Минимизация рисков и повышение надежности систем',
        en: 'Risk minimization and system reliability improvement',
      },
      adaptation: {
        ru: 'Гибкость и быстрая адаптация к изменениям рынка',
        en: 'Flexibility and rapid market adaptation',
      },
      efficiency: {
        ru: 'Масштабирование бизнеса без пропорционального роста затрат',
        en: 'Business scaling without proportional cost growth',
      },
    },
  },
  pricing: {
    title: { ru: 'Формирование стоимости проекта', en: 'Project Cost Formation' },
    description: {
      ru: 'Прозрачная оценка с детальным обоснованием каждого этапа работ',
      en: 'Transparent estimation with detailed justification of each work stage',
    },
    factors: {
      functionality: { ru: 'Объём функционала', en: 'Functionality scope' },
      architecture: { ru: 'Сложность архитектуры', en: 'Architecture complexity' },
      platforms: { ru: 'Количество платформ', en: 'Number of platforms' },
      design: { ru: 'Дизайн', en: 'Design' },
      integrations: { ru: 'Интеграции', en: 'Integrations' },
      timeline: { ru: 'Требуемые сроки', en: 'Required timeline' },
      scale: { ru: 'Нагрузка и масштаб', en: 'Load and scale' },
      support: { ru: 'Поддержка', en: 'Support' },
    },
    summary: {
      ru: 'Индивидуальный подход к каждому проекту. Разрабатываем архитектуру и решения под конкретные бизнес-задачи заказчика.',
      en: 'Individual approach to each project. We develop architecture and solutions for specific customer business tasks.',
    },
    threshold: { ru: 'Минимальный бюджет проекта — от 50 тыс. ₽', en: 'Minimum project budget — from $500' },
    button: { ru: 'Запросить коммерческое предложение', en: 'Request Commercial Offer' },
  },
  pricingModal: {
    title: { ru: 'Получить расчет', en: 'Get Estimate' },
    name: { ru: 'Ваше имя', en: 'Your name' },
    namePlaceholder: { ru: 'Иван Иванов', en: 'John Doe' },
    email: { ru: 'Email', en: 'Email' },
    emailPlaceholder: { ru: 'email@example.com', en: 'email@example.com' },
    phone: { ru: 'Телефон', en: 'Phone' },
    phonePlaceholder: { ru: '+7 (999) 123-45-67', en: '+1 (555) 123-4567' },
    appType: { ru: 'Тип приложения', en: 'Application type' },
    appTypePlaceholder: { ru: 'Выберите тип', en: 'Select type' },
    appTypes: {
      landing: { ru: 'Лендинг', en: 'Landing' },
      corporate: { ru: 'Корпоративный сайт', en: 'Corporate website' },
      ecommerce: { ru: 'Интернет-магазин', en: 'E-commerce' },
      crm: { ru: 'CRM/ERP система', en: 'CRM/ERP system' },
      mobile: { ru: 'Мобильное приложение', en: 'Mobile app' },
      desktop: { ru: 'Десктоп приложение', en: 'Desktop app' },
      api: { ru: 'API/Backend', en: 'API/Backend' },
      ai: { ru: 'AI/ML решение', en: 'AI/ML solution' },
    },
    complexity: { ru: 'Количество', en: 'Quantity' },
    estimate: { ru: 'Приблизительная стоимость', en: 'Estimated cost' },
    submit: { ru: 'Отправить заявку', en: 'Submit request' },
  },
  consultationModal: {
    title: { ru: 'Получить консультацию', en: 'Get Consultation' },
    name: { ru: 'Ваше имя', en: 'Your name' },
    namePlaceholder: { ru: 'Иван Иванов', en: 'John Doe' },
    email: { ru: 'Email', en: 'Email' },
    emailPlaceholder: { ru: 'email@example.com', en: 'email@example.com' },
    phone: { ru: 'Телефон', en: 'Phone' },
    phonePlaceholder: { ru: '+7 (999) 123-45-67', en: '+1 (555) 123-4567' },
    message: { ru: 'Ваш вопрос', en: 'Your question' },
    messagePlaceholder: { ru: 'Расскажите, что вас интересует...', en: 'Tell us what interests you...' },
    submit: { ru: 'Отправить заявку', en: 'Submit request' },
  },
  workSteps: {
    title: { ru: 'Этапы работы', en: 'Work Process' },
    description: { ru: 'Прозрачный процесс от идеи до запуска', en: 'Transparent process from idea to launch' },
    step: { ru: 'Шаг', en: 'Step' },
    steps: {
      consultation: {
        title: { ru: 'Вводная консультация', en: 'Initial Consultation' },
        description: { ru: 'Обсуждаем задачи и цели проекта', en: 'Discuss project goals and objectives' },
      },
      estimation: {
        title: { ru: 'Предварительная оценка', en: 'Preliminary Estimate' },
        description: { ru: 'Анализируем объём и формируем смету', en: 'Analyze scope and prepare estimate' },
      },
      contract: {
        title: { ru: 'Подписание договора', en: 'Contract Signing' },
        description: { ru: 'Фиксируем условия и гарантии', en: 'Fix terms and guarantees' },
      },
      requirements: {
        title: { ru: 'Аналитика и ТЗ', en: 'Analysis & Requirements' },
        description: { ru: 'Детализируем требования и сценарии', en: 'Detail requirements and scenarios' },
      },
      design: {
        title: { ru: 'UI/UX дизайн', en: 'UI/UX Design' },
        description: { ru: 'Проектируем интерфейсы и прототипы', en: 'Design interfaces and prototypes' },
      },
      development: {
        title: { ru: 'Разработка', en: 'Development' },
        description: { ru: 'Пишем код с соблюдением стандартов', en: 'Write code following standards' },
      },
      testing: {
        title: { ru: 'Тестирование', en: 'Testing' },
        description: { ru: 'Проверяем функционал и производительность', en: 'Test functionality and performance' },
      },
      launch: {
        title: { ru: 'Запуск', en: 'Launch' },
        description: { ru: 'Разворачиваем и передаём в продакшн', en: 'Deploy and release to production' },
      },
      support: {
        title: { ru: 'Поддержка', en: 'Support' },
        description: { ru: 'Сопровождаем и развиваем систему', en: 'Maintain and evolve the system' },
      },
    },
  },
  news: {
    title: { ru: 'Новости компании', en: 'Company News' },
    description: {
      ru: 'Актуальная информация о реализованных проектах и технологических решениях',
      en: 'Current information about completed projects and technological solutions',
    },
    loading: { ru: 'Загрузка...', en: 'Loading...' },
    error: { ru: 'Не удалось загрузить новости', en: 'Failed to load news' },
    errorDescription: {
      ru: 'Попробуйте обновить страницу или вернитесь позже',
      en: 'Try refreshing the page or come back later',
    },
    empty: { ru: 'Скоро здесь появятся новые материалы', en: 'New content coming soon' },
    allArticles: { ru: 'Все статьи', en: 'All Articles' },
    reload: { ru: 'Обновить', en: 'Reload' },
  },
  contact: {
    title: { ru: 'Начать сотрудничество', en: 'Start Cooperation' },
    description: {
      ru: 'Оставьте заявку, и мы свяжемся с вами для обсуждения проекта',
      en: 'Submit a request and we will contact you to discuss the project',
    },
    notice: {
      ru: '💼 Ответим на вашу заявку в течение 24 часов в рабочие дни',
      en: '💼 We will respond to your request within 24 hours on business days',
    },
    name: { ru: 'Ваше имя', en: 'Your name' },
    namePlaceholder: { ru: 'Иван Иванов', en: 'John Doe' },
    company: { ru: 'Компания', en: 'Company' },
    companyPlaceholder: { ru: 'ООО Технологии', en: 'Tech Company LLC' },
    email: { ru: 'Email', en: 'Email' },
    emailPlaceholder: { ru: 'email@example.com', en: 'email@example.com' },
    phone: { ru: 'Телефон', en: 'Phone' },
    phonePlaceholder: { ru: '+7 (999) 123-45-67', en: '+1 (555) 123-4567' },
    budget: { ru: 'Бюджет проекта', en: 'Project Budget' },
    budgetPlaceholder: { ru: 'Выберите диапазон', en: 'Select range' },
    message: { ru: 'Описание задачи', en: 'Task Description' },
    messagePlaceholder: { ru: 'Расскажите о вашем проекте...', en: 'Tell us about your project...' },
    submit: { ru: 'Отправить заявку', en: 'Submit Request' },
    infoTitle: { ru: 'Контактная информация', en: 'Contact Information' },
    meetingTitle: { ru: 'Назначить встречу', en: 'Schedule a Meeting' },
    meetingText: {
      ru: 'Проведём онлайн-встречу, обсудим задачи и предложим решение',
      en: "We'll hold an online meeting, discuss tasks and propose a solution",
    },
    meetingButton: { ru: 'Выбрать время', en: 'Choose Time' },
    labels: {
      email: { ru: 'Email', en: 'Email' },
      phone: { ru: 'Телефон', en: 'Phone' },
      schedule: { ru: 'Режим работы', en: 'Working Hours' },
    },
    values: {
      schedule: { ru: 'Пн-Вс: 08:00 - 22:00', en: 'Mon-Sun: 08:00 - 22:00' },
    },
  },
  footer: {
    description: {
      ru: 'Профессиональная разработка программного обеспечения на заказ. Реализуем проекты любой сложности с гарантией качества и соблюдением сроков.',
      en: 'Professional custom software development. We implement projects of any complexity with quality guarantee and deadline compliance.',
    },
    services: { ru: 'Услуги', en: 'Services' },
    solutions: { ru: 'Решения', en: 'Solutions' },
    contacts: { ru: 'Контакты', en: 'Contacts' },
    copyright: { ru: 'Все права защищены.', en: 'All rights reserved.' },
    offer: { ru: 'Публичная оферта', en: 'Public Offer' },
    links: {
      development: { ru: 'Разработка ПО', en: 'Software Development' },
      outsourcing: { ru: 'Аутсорс/Аутстафф', en: 'Outsourcing/Outstaffing' },
      design: { ru: 'UI/UX дизайн', en: 'UI/UX Design' },
      ai: { ru: 'AI/ML интеграции', en: 'AI/ML Integrations' },
      consulting: { ru: 'Консалтинг', en: 'Consulting' },
      aiSolutions: { ru: 'AI-решения', en: 'AI Solutions' },
    },
  },
  projectModal: {
    title: { ru: 'Обсудить проект', en: 'Discuss Project' },
    name: { ru: 'Ваше имя', en: 'Your name' },
    namePlaceholder: { ru: 'Иван Иванов', en: 'John Doe' },
    email: { ru: 'Email', en: 'Email' },
    emailPlaceholder: { ru: 'email@example.com', en: 'email@example.com' },
    phone: { ru: 'Телефон', en: 'Phone' },
    phonePlaceholder: { ru: '+7 (999) 123-45-67', en: '+1 (555) 123-4567' },
    budget: { ru: 'Бюджет проекта', en: 'Project Budget' },
    budgetPlaceholder: { ru: 'Выберите диапазон', en: 'Select range' },
    budgetOptions: {
      option0: { ru: '50 - 200 тыс. ₽', en: '$500 - $2K' },
      option05: { ru: '200 - 500 тыс. ₽', en: '$2K - $5K' },
      option1: { ru: '500 тыс. - 1 млн ₽', en: '$5K - $10K' },
      option2: { ru: '1 - 3 млн ₽', en: '$10K - $30K' },
      option3: { ru: '3 - 5 млн ₽', en: '$30K - $50K' },
      option4: { ru: 'От 5 млн ₽', en: '$50K+' },
    },
    message: { ru: 'Описание задачи', en: 'Task Description' },
    messagePlaceholder: { ru: 'Расскажите о вашем проекте...', en: 'Tell us about your project...' },
    submit: { ru: 'Отправить заявку', en: 'Submit Request' },
    required: { ru: '*', en: '*' },
  },
} as const;

export type Language = 'ru' | 'en';

export { translations };

export const useTranslation = () => {
  const { language } = useLanguage();

  const t = (path: string): string => {
    const keys = path.split('.');
    let value: typeof translations | { ru: string; en: string } | undefined = translations;

    for (const key of keys) {
      value = value?.[key as keyof typeof value] as typeof translations | { ru: string; en: string } | undefined;
    }

    return (value as { ru: string; en: string })?.[language] || path;
  };

  const getOptions = (path: string): Array<{ value: string; label: string }> => {
    const keys = path.split('.');
    let value: typeof translations | Record<string, { ru: string; en: string }> | undefined = translations;

    for (const key of keys) {
      value = value?.[key as keyof typeof value] as
        | typeof translations
        | Record<string, { ru: string; en: string }>
        | undefined;
    }

    if (!value) return [];

    return Object.entries(value as Record<string, { ru: string; en: string }>).map(([key, val]) => ({
      value: key,
      label: val[language] || key,
    }));
  };

  return { t, getOptions };
};
