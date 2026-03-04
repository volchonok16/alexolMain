import { motion } from 'framer-motion';
import { Code, Users, Palette, Brain, Wrench, Building2, LucideIcon } from 'lucide-react';
import { useTranslation } from '../../../shared/utils/translations';
import { useMotionConfig } from '@/shared/hooks/useMotionConfig';

interface Service {
  icon: LucideIcon;
  key: string;
}

export const Services = () => {
  const { t } = useTranslation();
  const { motionConfig } = useMotionConfig();

  const services: Service[] = [
    { icon: Code, key: 'development' },
    { icon: Users, key: 'outsourcing' },
    { icon: Palette, key: 'design' },
    { icon: Brain, key: 'ai' },
    { icon: Wrench, key: 'support' },
    { icon: Building2, key: 'consulting' },
  ];

  return (
    <section className="services">
      <div className="services__container">
        <motion.div
          initial={motionConfig.initial}
          whileInView={motionConfig.animate}
          viewport={motionConfig.viewport}
          transition={motionConfig.transition}
          className="services__header"
        >
          <h2 className="services__title">{t('services.title')}</h2>
          <div className="services__divider" />
        </motion.div>

        <div className="services__grid">
          {services.map((service, index) => (
            <ServiceCard key={service.key} service={service} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
};

const ServiceCard = ({ service, index }: { service: Service; index: number }) => {
  const { t } = useTranslation();
  const { motionConfig, motionDelay } = useMotionConfig();
  const Icon = service.icon;

  return (
    <motion.div
      initial={motionConfig.initial}
      whileInView={motionConfig.animate}
      viewport={motionConfig.viewport}
      transition={motionDelay(index * 0.1)}
      className="service-card"
    >
      <div className="service-card__glow" />

      <div className="service-card__content">
        <div className="service-card__icon">
          <Icon />
        </div>

        <h3 className="service-card__title">{t(`services.items.${service.key}.title`)}</h3>
        <p className="service-card__description">{t(`services.items.${service.key}.description`)}</p>
      </div>
    </motion.div>
  );
};
