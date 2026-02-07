import { useEffect } from 'react';
import { Modal } from '@/shared/ui';
import { useTranslation } from '@/shared/utils/translations';
import { useConsultationModal } from '../../hooks/useConsultationModal';
import './MeetingModal.scss';

interface MeetingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MeetingModal = ({ isOpen, onClose }: MeetingModalProps) => {
  const { t } = useTranslation();
  const { formData, handleChange, handleSubmit, isSuccess, resetForm } = useConsultationModal();

  useEffect(() => {
    if (isSuccess) {
      resetForm();
      onClose();
    }
  }, [isSuccess]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('contact.meetingTitle')}>
      <form onSubmit={handleSubmit} className="meeting-modal__form">
        <div className="meeting-modal__field">
          <label className="meeting-modal__label">{t('consultationModal.name')} *</label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            className="meeting-modal__input"
            placeholder={t('consultationModal.namePlaceholder')}
          />
        </div>

        <div className="meeting-modal__field">
          <label className="meeting-modal__label">{t('consultationModal.email')} *</label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
            className="meeting-modal__input"
            placeholder={t('consultationModal.emailPlaceholder')}
          />
        </div>

        <div className="meeting-modal__field">
          <label className="meeting-modal__label">{t('consultationModal.phone')}</label>
          <input
            type="tel"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            className="meeting-modal__input"
            placeholder={t('consultationModal.phonePlaceholder')}
          />
        </div>

        <div className="meeting-modal__field">
          <label className="meeting-modal__label">{t('consultationModal.message')}</label>
          <textarea
            name="message"
            value={formData.message}
            onChange={handleChange}
            rows={4}
            className="meeting-modal__textarea"
            placeholder={t('consultationModal.messagePlaceholder')}
          />
        </div>

        <button type="submit" className="meeting-modal__submit">
          {t('consultationModal.submit')}
        </button>
      </form>
    </Modal>
  );
};
