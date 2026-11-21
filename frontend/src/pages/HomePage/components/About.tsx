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
        </div>
      </div>
    </section>
  );
};
