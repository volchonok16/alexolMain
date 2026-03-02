import { useState } from 'react';
import { motion } from 'framer-motion';
import { Layers, Network, Monitor, Palette, Link2, Clock, BarChart3, Headphones, LucideIcon } from 'lucide-react';
import { PricingModal } from './modals/PricingModal';
import { useTranslation } from '@/shared/utils/translations';
import { motionConfig } from '@/shared/hooks/useMotionConfig';

interface Factor {
  icon: LucideIcon;
  key: string;
}

export const Pricing = () => {
  const { t } = useTranslation();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const factors: Factor[] = [
    { icon: Layers, key: 'functionality' },
    { icon: Network, key: 'architecture' },
    { icon: Monitor, key: 'platforms' },
    { icon: Palette, key: 'design' },
    { icon: Link2, key: 'integrations' },
    { icon: Clock, key: 'timeline' },
    { icon: BarChart3, key: 'scale' },
    { icon: Headphones, key: 'support' },
  ];

  return (
    <section className="pricing">
      <div className="pricing__container">
        <motion.div
          initial={motionConfig.initial}
          whileInView={motionConfig.animate}
          viewport={motionConfig.viewport}
          transition={motionConfig.transition}
          className="pricing__header"
        >
          <h2 className="pricing__title">{t('pricing.title')}</h2>
          <p className="pricing__description">{t('pricing.description')}</p>
        </motion.div>

        <div className="pricing__grid">
          {factors.map((factor, index) => (
            <FactorCard key={factor.key} factor={factor} index={index} />
          ))}
        </div>

        <motion.div
          initial={motionConfig.initial}
          whileInView={motionConfig.animate}
          viewport={motionConfig.viewport}
          transition={motionConfig.transition}
          className="pricing__summary"
        >
          <div className="pricing__summary-content">
            <p className="pricing__summary-text">{t('pricing.summary')}</p>
            <div className="pricing__threshold">
              <p>{t('pricing.threshold')}</p>
            </div>
            <button onClick={() => setIsModalOpen(true)} className="pricing__button">
              {t('pricing.button')}
            </button>
          </div>
        </motion.div>
      </div>

      <PricingModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </section>
  );
};

const FactorCard = ({ factor, index }: { factor: Factor; index: number }) => {
  const { t } = useTranslation();
  const Icon = factor.icon;

  return (
    <motion.div
      initial={motionConfig.initial}
      whileInView={motionConfig.animate}
      viewport={motionConfig.viewport}
      transition={{ ...motionConfig.transition, delay: index * 0.05 }}
      className="factor-card"
    >
      <div className="factor-card__icon">
        <Icon />
      </div>
      <p className="factor-card__label">{t(`pricing.factors.${factor.key}`)}</p>
    </motion.div>
  );
};
