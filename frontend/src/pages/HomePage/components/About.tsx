import { useTranslation } from '@/shared/utils/translations';
import { Reveal } from '@/shared/ui/Reveal';

export const About = () => {
  const { t } = useTranslation();

  return (
    <section className="about">
      <div className="about__container">
        <div className="about__grid">
          <Reveal>
            <h2 className="about__title">
              {t('about.title')} <span className="about__highlight">{t('about.titleHighlight')}</span>
            </h2>
            <p className="about__description">{t('about.description')}</p>
          </Reveal>

          <Reveal className="about__metrics">
            <MetricCard number="7+" label={t('about.metrics.years')} delay={0} />
            <MetricCard number="150+" label={t('about.metrics.projects')} delay={0.1} />
            <MetricCard number="12" label={t('about.metrics.industries')} delay={0.2} />
            <MetricCard number="40+" label={t('about.metrics.specialists')} delay={0.3} />
          </Reveal>
        </div>
      </div>
    </section>
  );
};

const MetricCard = ({ number, label, delay }: { number: string; label: string; delay: number }) => (
  <Reveal delay={delay} className="metric-card">
    <div className="metric-card__number">{number}</div>
    <div className="metric-card__label">{label}</div>
  </Reveal>
);
