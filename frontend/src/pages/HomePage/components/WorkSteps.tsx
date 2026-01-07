import { motion } from 'framer-motion';
import {
  MessageSquare,
  FileSearch,
  FileSignature,
  FileText,
  Palette,
  Code,
  Bug,
  Rocket,
  Wrench,
  LucideIcon,
} from 'lucide-react';
import { useTranslation } from '@/shared/utils/translations';

interface Step {
  icon: LucideIcon;
  key: string;
}

export const WorkSteps = () => {
  const { t } = useTranslation();

  const steps: Step[] = [
    { icon: MessageSquare, key: 'consultation' },
    { icon: FileSearch, key: 'estimation' },
    { icon: FileSignature, key: 'contract' },
    { icon: FileText, key: 'requirements' },
    { icon: Palette, key: 'design' },
    { icon: Code, key: 'development' },
    { icon: Bug, key: 'testing' },
    { icon: Rocket, key: 'launch' },
    { icon: Wrench, key: 'support' },
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
          <h2 className="work-steps__title">{t('workSteps.title')}</h2>
          <p className="work-steps__description">{t('workSteps.description')}</p>
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

const StepCard = ({ step, index }: { step: Step; index: number }) => {
  const { t } = useTranslation();
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
          <div className="step-card__number">
            {t('workSteps.step')} {index + 1}
          </div>
          <h4 className="step-card__title">{t(`workSteps.steps.${step.key}.title`)}</h4>
          <p className="step-card__description">{t(`workSteps.steps.${step.key}.description`)}</p>
        </div>
      </div>
    </motion.div>
  );
};

const StepTimeline = ({ step, index }: { step: Step; index: number }) => {
  const { t } = useTranslation();
  const Icon = step.icon;
  const isEven = index % 2 === 0;

  return (
    <motion.div
      initial={{ opacity: 0, x: isEven ? -50 : 50 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.8 }}
      className={`step-timeline ${isEven ? 'step-timeline--left' : 'step-timeline--right'}`}
    >
      <div className="step-timeline__content">
        <div className="step-timeline__card">
          <div className="step-timeline__number">
            {t('workSteps.step')} {index + 1}
          </div>
          <h4 className="step-timeline__title">{t(`workSteps.steps.${step.key}.title`)}</h4>
          <p className="step-timeline__description">{t(`workSteps.steps.${step.key}.description`)}</p>
        </div>
      </div>

      <div className="step-timeline__node">
        <Icon />
      </div>
    </motion.div>
  );
};
