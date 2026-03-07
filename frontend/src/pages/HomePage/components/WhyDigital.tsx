import { useState } from 'react';
import { TrendingDown, Users, Eye, Shield, Zap, TrendingUp, LucideIcon } from 'lucide-react';
import { ConsultationModal } from './modals';
import { useTranslation } from '@/shared/utils/translations';
import { Reveal } from '@/shared/ui/Reveal';

interface Benefit {
  icon: LucideIcon;
  key: string;
}

export const WhyDigital = () => {
  const { t } = useTranslation();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const benefits: Benefit[] = [
    { icon: TrendingDown, key: 'automation' },
    { icon: Users, key: 'simplification' },
    { icon: Eye, key: 'transparency' },
    { icon: Shield, key: 'reliability' },
    { icon: Zap, key: 'adaptation' },
    { icon: TrendingUp, key: 'efficiency' },
  ];

  return (
    <section className="why-digital">
      <div className="why-digital__background">
        <div className="why-digital__gradient why-digital__gradient--left" />
        <div className="why-digital__gradient why-digital__gradient--right" />
      </div>

      <div className="why-digital__container">
        <Reveal className="why-digital__header">
          <h2 className="why-digital__title">
            {t('whyDigital.title')} <span className="why-digital__highlight">{t('whyDigital.titleHighlight')}</span>
          </h2>
        </Reveal>

        <div className="why-digital__grid">
          {benefits.map((benefit, index) => (
            <BenefitCard key={index} benefit={benefit} index={index} />
          ))}
        </div>

        <Reveal className="why-digital__cta">
          <button onClick={() => setIsModalOpen(true)} className="why-digital__button">
            {t('whyDigital.button')}
          </button>
        </Reveal>
      </div>

      <ConsultationModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </section>
  );
};

const BenefitCard = ({ benefit, index }: { benefit: Benefit; index: number }) => {
  const { t } = useTranslation();
  const Icon = benefit.icon;

  return (
    <Reveal delay={index * 0.1} className="benefit-card">
      <div className="benefit-card__content">
        <div className="benefit-card__icon">
          <Icon />
        </div>
        <p className="benefit-card__title">{t(`whyDigital.benefits.${benefit.key}`)}</p>
      </div>
    </Reveal>
  );
};
