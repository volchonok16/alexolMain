import { useState, useMemo } from 'react';
import { Modal, Select } from '@/shared/ui';
import { useTranslation } from '@/shared/utils/translations';
import './PricingModal.scss';

interface PricingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type AppType = 'landing' | 'corporate' | 'ecommerce' | 'crm' | 'mobile' | 'desktop' | 'api' | 'ai';

export const PricingModal = ({ isOpen, onClose }: PricingModalProps) => {
  const { t, getOptions } = useTranslation();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    appType: 'landing' as AppType,
    complexity: 5,
  });

  const estimatedPrice = useMemo(() => {
    if (!formData.appType) return 0;

    const pricing: Record<AppType, { base: number; perUnit: number; label: string }> = {
      landing: { base: 75000, perUnit: 25000, label: 'страниц' },
      corporate: { base: 150000, perUnit: 40000, label: 'разделов' },
      ecommerce: { base: 400000, perUnit: 75000, label: 'функций' },
      crm: { base: 500000, perUnit: 100000, label: 'модулей' },
      mobile: { base: 300000, perUnit: 60000, label: 'экранов' },
      desktop: { base: 350000, perUnit: 75000, label: 'модулей' },
      api: { base: 200000, perUnit: 50000, label: 'эндпоинтов' },
      ai: { base: 600000, perUnit: 125000, label: 'моделей' },
    };

    const config = pricing[formData.appType];
    return config.base + formData.complexity * config.perUnit;
  }, [formData.appType, formData.complexity]);

  const getComplexityLabel = () => {
    if (!formData.appType) return 'единиц';
    const labels: Record<AppType, string> = {
      landing: 'страниц',
      corporate: 'разделов',
      ecommerce: 'функций (каталог, корзина, оплата и т.д.)',
      crm: 'модулей (клиенты, задачи, аналитика и т.д.)',
      mobile: 'экранов',
      desktop: 'модулей',
      api: 'эндпоинтов',
      ai: 'моделей/интеграций',
    };
    return labels[formData.appType];
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Pricing form submitted:', { ...formData, estimatedPrice });
    onClose();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.type === 'range' ? parseInt(e.target.value) : e.target.value;
    setFormData({
      ...formData,
      [e.target.name]: value,
    });
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      maximumFractionDigits: 0,
    }).format(price);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('pricingModal.title')}>
      <form onSubmit={handleSubmit} className="pricing-modal__form">
        <div className="pricing-modal__field">
          <label className="pricing-modal__label">{t('pricingModal.name')} *</label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            className="pricing-modal__input"
            placeholder={t('pricingModal.namePlaceholder')}
          />
        </div>

        <div className="pricing-modal__field">
          <label className="pricing-modal__label">{t('pricingModal.email')} *</label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
            className="pricing-modal__input"
            placeholder={t('pricingModal.emailPlaceholder')}
          />
        </div>

        <div className="pricing-modal__field">
          <label className="pricing-modal__label">{t('pricingModal.phone')}</label>
          <input
            type="tel"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            className="pricing-modal__input"
            placeholder={t('pricingModal.phonePlaceholder')}
          />
        </div>

        <div className="pricing-modal__field">
          <label className="pricing-modal__label">{t('pricingModal.appType')} *</label>
          <Select
            options={getOptions('pricingModal.appTypes')}
            value={formData.appType}
            onChange={value => setFormData({ ...formData, appType: value as AppType })}
            placeholder={t('pricingModal.appTypePlaceholder')}
          />
        </div>

        {formData.appType && (
          <div className="pricing-modal__field">
            <label className="pricing-modal__label">
              {t('pricingModal.complexity')} {getComplexityLabel()}: {formData.complexity}
            </label>
            <input
              type="range"
              name="complexity"
              min="1"
              max="20"
              value={formData.complexity}
              onChange={handleChange}
              className="pricing-modal__slider"
            />
            <div className="pricing-modal__value">
              {formData.complexity} {getComplexityLabel()}
            </div>
          </div>
        )}

        {formData.appType && (
          <div className="pricing-modal__estimate">
            <div className="pricing-modal__estimate-label">{t('pricingModal.estimate')}</div>
            <div className="pricing-modal__estimate-price">{formatPrice(estimatedPrice)}</div>
          </div>
        )}

        <button type="submit" className="pricing-modal__submit">
          {t('pricingModal.submit')}
        </button>
      </form>
    </Modal>
  );
};
