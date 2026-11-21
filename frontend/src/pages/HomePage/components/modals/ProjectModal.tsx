import { useEffect } from 'react';
import { Modal } from '@/shared/ui';
import { useLanguage } from '@/shared/contexts';
import { marketingCopy } from '@/shared/utils/marketingCopy';
import { useProjectModal } from '../../hooks/useProjectModal';
import './ProjectModal.scss';

interface ProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialEmail?: string;
}

export const ProjectModal = ({ isOpen, onClose, initialEmail }: ProjectModalProps) => {
  const { language } = useLanguage();
  const copy = marketingCopy[language].contact;
  const backendTopics = marketingCopy.ru.contact.topics as readonly string[];
  const { formData, handleChange, handleSubmit, isSuccess, isLoading, error, resetForm, prefillEmail } =
    useProjectModal();

  useEffect(() => {
    if (isOpen && initialEmail && formData.email !== initialEmail) {
      prefillEmail(initialEmail);
    }
  }, [isOpen, initialEmail, formData.email, prefillEmail]);

  useEffect(() => {
    if (isSuccess) {
      resetForm();
      onClose();
    }
  }, [isSuccess, onClose, resetForm]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={copy.title}>
      <form onSubmit={handleSubmit} className="project-modal__form">
        <div className="project-modal__field">
          <label className="project-modal__label" htmlFor="project-name">
            {copy.name} *
          </label>
          <input
            id="project-name"
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            className="project-modal__input"
            placeholder={language === 'ru' ? 'Иван Иванов' : 'Jane Smith'}
          />
        </div>

        <div className="project-modal__field">
          <label className="project-modal__label" htmlFor="project-email">
            {copy.email} *
          </label>
          <input
            id="project-email"
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
            className="project-modal__input"
            placeholder="name@company.com"
          />
        </div>

        <div className="project-modal__field">
          <label className="project-modal__label" htmlFor="project-phone">
            {copy.phone}
          </label>
          <input
            id="project-phone"
            type="tel"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            className="project-modal__input"
            placeholder={language === 'ru' ? '+7 (999) 123-45-67' : '+1 (555) 123-4567'}
          />
        </div>

        <div className="project-modal__field">
          <label className="project-modal__label" htmlFor="project-topic">
            {copy.topic}
          </label>
          <select
            id="project-topic"
            value={formData.budget}
            name="budget"
            onChange={handleChange}
            className="project-modal__input"
          >
            <option value="">{copy.choose}</option>
            {copy.topics.map(topic => {
              const index = (marketingCopy[language].contact.topics as readonly string[]).indexOf(topic);
              return (
                <option key={topic} value={backendTopics[index]}>
                  {topic}
                </option>
              );
            })}
          </select>
        </div>

        <div className="project-modal__field">
          <label className="project-modal__label" htmlFor="project-message">
            {copy.message} *
          </label>
          <textarea
            id="project-message"
            name="message"
            value={formData.message}
            onChange={handleChange}
            required
            rows={4}
            className="project-modal__textarea"
            placeholder={copy.placeholder}
          />
        </div>

        <label className="project-modal__consent">
          <input type="checkbox" required />
          <span>{copy.consent}</span>
        </label>

        <button type="submit" className="project-modal__submit" disabled={isLoading}>
          {isLoading ? copy.sending : copy.submit}
        </button>
        {error && (
          <p className="project-modal__error" role="alert">
            {copy.error}
          </p>
        )}
      </form>
    </Modal>
  );
};
