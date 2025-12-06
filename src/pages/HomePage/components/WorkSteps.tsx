import { motion } from "framer-motion";
import { MessageSquare, FileSearch, FileSignature, FileText, Palette, Code, Bug, Rocket, Wrench } from "lucide-react";

export const WorkSteps = () => {
  const steps = [
    { icon: MessageSquare, title: "Вводная консультация", description: "Обсуждаем задачи и цели проекта" },
    { icon: FileSearch, title: "Предварительная оценка", description: "Анализируем объём и формируем смету" },
    { icon: FileSignature, title: "Подписание договора", description: "Фиксируем условия и гарантии" },
    { icon: FileText, title: "Аналитика и ТЗ", description: "Детализируем требования и сценарии" },
    { icon: Palette, title: "UI/UX дизайн", description: "Проектируем интерфейсы и прототипы" },
    { icon: Code, title: "Разработка", description: "Пишем код с соблюдением стандартов" },
    { icon: Bug, title: "Тестирование", description: "Проверяем функционал и производительность" },
    { icon: Rocket, title: "Запуск", description: "Разворачиваем и передаём в продакшн" },
    { icon: Wrench, title: "Поддержка", description: "Сопровождаем и развиваем систему" },
  ];

  return (
    <section className="work-steps">
      <div className="work-steps__container">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="work-steps__header"
        >
          <h2 className="work-steps__title">Этапы работы</h2>
          <p className="work-steps__description">
            Прозрачный процесс от идеи до запуска
          </p>
        </motion.div>

        {/* Мобильная версия - карточки */}
        <div className="work-steps__grid work-steps__grid--mobile">
          {steps.map((step, index) => (
            <StepCard key={index} step={step} index={index} />
          ))}
        </div>

        {/* Десктоп версия - timeline */}
        <div className="work-steps__timeline">
          <div className="work-steps__line" />
          
          <div className="work-steps__timeline-items">
            {steps.map((step, index) => (
              <StepTimeline key={index} step={step} index={index} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

const StepCard = ({ step, index }: { step: any; index: number }) => {
  const Icon = step.icon;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, delay: index * 0.1 }}
      className="step-card"
    >
      <div className="step-card__content">
        <div className="step-card__icon">
          <Icon />
        </div>
        <div className="step-card__info">
          <div className="step-card__number">Шаг {index + 1}</div>
          <h4 className="step-card__title">{step.title}</h4>
          <p className="step-card__description">{step.description}</p>
        </div>
      </div>
    </motion.div>
  );
};

const StepTimeline = ({ step, index }: { step: any; index: number }) => {
  const Icon = step.icon;
  const isEven = index % 2 === 0;
  
  return (
    <motion.div
      initial={{ opacity: 0, x: isEven ? -50 : 50 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.8 }}
      className={`step-timeline ${isEven ? "step-timeline--left" : "step-timeline--right"}`}
    >
      <div className="step-timeline__content">
        <div className="step-timeline__card">
          <div className="step-timeline__number">Шаг {index + 1}</div>
          <h4 className="step-timeline__title">{step.title}</h4>
          <p className="step-timeline__description">{step.description}</p>
        </div>
      </div>
      
      <div className="step-timeline__node">
        <Icon />
      </div>
    </motion.div>
  );
};
