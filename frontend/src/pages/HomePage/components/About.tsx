import { motion } from 'framer-motion';
import { useTranslation } from '@/shared/utils/translations';
import { motionConfig, motionConfigX } from '@/shared/hooks/useMotionConfig';

export const About = () => {
  const { t } = useTranslation();

  return (
    <section className="about">
      <div className="about__container">
        <div className="about__grid">
          <motion.div
            initial={motionConfigX('left').initial}
            whileInView={motionConfigX('left').animate}
            viewport={motionConfigX('left').viewport}
            transition={motionConfigX('left').transition}
          >
            <h2 className="about__title">
              {t('about.title')} <span className="about__highlight">{t('about.titleHighlight')}</span>
            </h2>

            <p className="about__description">{t('about.description')}</p>
          </motion.div>

          <motion.div
            initial={motionConfigX('right').initial}
            whileInView={motionConfigX('right').animate}
            viewport={motionConfigX('right').viewport}
            transition={motionConfigX('right').transition}
            className="about__metrics"
          >
            <MetricCard number="7+" label={t('about.metrics.years')} delay={0} />
            <MetricCard number="150+" label={t('about.metrics.projects')} delay={0.1} />
            <MetricCard number="12" label={t('about.metrics.industries')} delay={0.2} />
            <MetricCard number="40+" label={t('about.metrics.specialists')} delay={0.3} />
          </motion.div>
        </div>
      </div>
    </section>
  );
};

const MetricCard = ({ number, label, delay }: { number: string; label: string; delay: number }) => {
  return (
    <motion.div
      initial={motionConfig.initial}
      whileInView={motionConfig.animate}
      viewport={motionConfig.viewport}
      transition={{ ...motionConfig.transition, delay }}
      className="metric-card"
    >
      <div className="metric-card__number">{number}</div>
      <div className="metric-card__label">{label}</div>
    </motion.div>
  );
};
