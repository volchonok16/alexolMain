import { useState } from 'react';
import { PricingModal } from './modals/PricingModal';
import { useTranslation } from '@/shared/utils/translations';
import { Reveal } from '@/shared/ui/Reveal';
import { Icon3D, type Icon3DType } from '@/shared/ui/Icon3D';

interface Factor {
  icon: Icon3DType;
  key: string;
}

const EMPHASIZED_ICONS = new Set<Icon3DType>(['integrations', 'clock', 'headphones']);

export const Pricing = () => {
  const { t } = useTranslation();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const factors: Factor[] = [
    { icon: 'functionality', key: 'functionality' },
    { icon: 'architecture', key: 'architecture' },
    { icon: 'platforms', key: 'platforms' },
    { icon: 'design', key: 'design' },
    { icon: 'integrations', key: 'integrations' },
    { icon: 'clock', key: 'timeline' },
    { icon: 'scale', key: 'scale' },
    { icon: 'headphones', key: 'support' },
  ];

  return (
    <section className="pricing">
      <div className="pricing__container">
        <Reveal className="pricing__header">
          <h2 className="pricing__title">{t('pricing.title')}</h2>
          <p className="pricing__description">{t('pricing.description')}</p>
        </Reveal>

        <div className="pricing__grid">
          {factors.map((factor, index) => (
            <FactorCard key={factor.key} factor={factor} index={index} />
          ))}
        </div>

        <Reveal className="pricing__summary">
          <div className="pricing__summary-content">
            <p className="pricing__summary-text">{t('pricing.summary')}</p>
            <div className="pricing__threshold">
              <p>{t('pricing.threshold')}</p>
            </div>
            <button onClick={() => setIsModalOpen(true)} className="pricing__button">
              {t('pricing.button')}
            </button>
          </div>
        </Reveal>
      </div>

      <PricingModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </section>
  );
};

const FactorCard = ({ factor, index }: { factor: Factor; index: number }) => {
  const { t } = useTranslation();

  return (
    <Reveal delay={index * 0.05} className="factor-card">
      <div className={`factor-card__icon${EMPHASIZED_ICONS.has(factor.icon) ? ' factor-card__icon--emphasized' : ''}`}>
        <Icon3D type={factor.icon} spin={false} />
      </div>
      <p className="factor-card__label">{t(`pricing.factors.${factor.key}`)}</p>
    </Reveal>
  );
};
