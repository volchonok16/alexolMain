import { useTranslation } from '../../../shared/utils/translations';
import { Reveal } from '@/shared/ui/Reveal';
import { Icon3D, type Icon3DType } from '@/shared/ui/Icon3D';

interface Service {
  icon: Icon3DType;
  key: string;
}

export const Services = () => {
  const { t } = useTranslation();

  const services: Service[] = [
    { icon: 'development', key: 'development' },
    { icon: 'outsourcing', key: 'outsourcing' },
    { icon: 'design', key: 'design' },
    { icon: 'ai', key: 'ai' },
    { icon: 'support', key: 'support' },
    { icon: 'consulting', key: 'consulting' },
  ];

  return (
    <section className="services">
      <div className="services__container">
        <Reveal className="services__header">
          <h2 className="services__title">{t('services.title')}</h2>
          <div className="services__divider" />
        </Reveal>

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

  return (
    <Reveal delay={index * 0.1} className="service-card">
      <div className="service-card__glow" />
      <div className="service-card__content">
        <div className="service-card__icon">
          <Icon3D type={service.icon} spin={false} />
        </div>
        <h3 className="service-card__title">{t(`services.items.${service.key}.title`)}</h3>
        <p className="service-card__description">{t(`services.items.${service.key}.description`)}</p>
      </div>
    </Reveal>
  );
};
