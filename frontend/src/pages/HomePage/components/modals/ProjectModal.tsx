import { useState } from 'react';
import { Modal, Select } from '@/shared/ui';
import { useTranslation } from '@/shared/utils/translations';
import './ProjectModal.scss';

interface ProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProjectModal = ({ isOpen, onClose }: ProjectModalProps) => {
  const { t, getOptions } = useTranslation();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    budget: '',
    message: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Form submitted:', formData);
    onClose();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('projectModal.title')}>
      <form onSubmit={handleSubmit} className="project-modal__form">
        <div className="project-modal__field">
          <label className="project-modal__label">
            {t('projectModal.name')} {t('projectModal.required')}
          </label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            className="project-modal__input"
            placeholder={t('projectModal.namePlaceholder')}
          />
        </div>

        <div className="project-modal__field">
          <label className="project-modal__label">
            {t('projectModal.email')} {t('projectModal.required')}
          </label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
            className="project-modal__input"
            placeholder={t('projectModal.emailPlaceholder')}
          />
        </div>

        <div className="project-modal__field">
          <label className="project-modal__label">{t('projectModal.phone')}</label>
          <input
            type="tel"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            className="project-modal__input"
            placeholder={t('projectModal.phonePlaceholder')}
          />
        </div>

        <div className="project-modal__field">
          <label className="project-modal__label">{t('projectModal.budget')}</label>
          <Select
            options={getOptions('projectModal.budgetOptions')}
            value={formData.budget}
            onChange={value => setFormData({ ...formData, budget: value })}
            placeholder={t('projectModal.budgetPlaceholder')}
          />
        </div>

        <div className="project-modal__field">
          <label className="project-modal__label">
            {t('projectModal.message')} {t('projectModal.required')}
          </label>
          <textarea
            name="message"
            value={formData.message}
            onChange={handleChange}
            required
            rows={4}
            className="project-modal__textarea"
            placeholder={t('projectModal.messagePlaceholder')}
          />
        </div>

        <button type="submit" className="project-modal__submit">
          {t('projectModal.submit')}
        </button>
      </form>
    </Modal>
  );
};
