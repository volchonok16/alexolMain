import { useEffect } from 'react';
import { Modal, Select } from '@/shared/ui';
import { useTranslation } from '@/shared/utils/translations';
import { usePricingModal } from '../../hooks/usePricingModal';
import './PricingModal.scss';

interface PricingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PricingModal = ({ isOpen, onClose }: PricingModalProps) => {
  const { t, getOptions } = useTranslation();
  const { formData, calculatedPrice, handleChange, handleSubmit, isSuccess, resetForm } = usePricingModal();

  useEffect(() => {
    if (isSuccess) {
      resetForm();
      onClose();
    }
  }, [isSuccess]);

  const getComplexityLabel = () => {
    if (!formData.appType) return 'единиц';
    const labels: Record<string, string> = {
      landing: 'страниц',
      corporate: 'разделов',
      ecommerce: 'функций (каталог, корзина, оплата и т.д.)',
      crm: 'модулей (клиенты, задачи, аналитика и т.д.)',
      mobile: 'экранов',
      desktop: 'модулей',
      api: 'эндпоинтов',
      ai: 'моделей/интеграций',
    };
    return labels[formData.appType] || 'единиц';
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
            value={getOptions('pricingModal.appTypes').find(opt => opt.value === formData.appType)?.label || ''}
            onChange={value => {
              const option = getOptions('pricingModal.appTypes').find(opt => opt.label === value);
              handleChange({ target: { name: 'appType', value: option?.value || value } });
            }}
            placeholder={t('pricingModal.appTypePlaceholder')}
          />
        </div>

        {formData.appType && (
          <div className="pricing-modal__field">
            <label className="pricing-modal__label">
              {t('pricingModal.complexity')} {getComplexityLabel()}: {formData.pageCount}
            </label>
            <input
              type="range"
              name="pageCount"
              min="1"
              max="20"
              value={formData.pageCount}
              onChange={handleChange}
              className="pricing-modal__slider"
            />
            <div className="pricing-modal__value">
              {formData.pageCount} {getComplexityLabel()}
            </div>
          </div>
        )}

        {formData.appType && (
          <div className="pricing-modal__estimate">
            <div className="pricing-modal__estimate-label">{t('pricingModal.estimate')}</div>
            <div className="pricing-modal__estimate-price">{formatPrice(calculatedPrice)}</div>
          </div>
        )}

        <button type="submit" className="pricing-modal__submit">
          {t('pricingModal.submit')}
        </button>
      </form>
    </Modal>
  );
};
