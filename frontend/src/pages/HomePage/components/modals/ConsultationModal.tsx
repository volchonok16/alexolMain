import { useState } from 'react';
import { Modal } from '@/shared/ui';
import { useTranslation } from '@/shared/utils/translations';
import './ConsultationModal.scss';

interface ConsultationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ConsultationModal = ({ isOpen, onClose }: ConsultationModalProps) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    message: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Consultation form submitted:', formData);
    onClose();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('consultationModal.title')}>
      <form onSubmit={handleSubmit} className="consultation-modal__form">
        <div className="consultation-modal__field">
          <label className="consultation-modal__label">{t('consultationModal.name')} *</label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            className="consultation-modal__input"
            placeholder={t('consultationModal.namePlaceholder')}
          />
        </div>

        <div className="consultation-modal__field">
          <label className="consultation-modal__label">{t('consultationModal.email')} *</label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
            className="consultation-modal__input"
            placeholder={t('consultationModal.emailPlaceholder')}
          />
        </div>

        <div className="consultation-modal__field">
          <label className="consultation-modal__label">{t('consultationModal.phone')}</label>
          <input
            type="tel"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            className="consultation-modal__input"
            placeholder={t('consultationModal.phonePlaceholder')}
          />
        </div>

        <div className="consultation-modal__field">
          <label className="consultation-modal__label">{t('consultationModal.message')}</label>
          <textarea
            name="message"
            value={formData.message}
            onChange={handleChange}
            rows={4}
            className="consultation-modal__textarea"
            placeholder={t('consultationModal.messagePlaceholder')}
          />
        </div>

        <button type="submit" className="consultation-modal__submit">
          {t('consultationModal.submit')}
        </button>
      </form>
    </Modal>
  );
};
