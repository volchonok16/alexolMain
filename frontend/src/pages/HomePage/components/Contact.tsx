import { useState } from 'react';
import { Mail, Phone, Clock, LucideIcon } from 'lucide-react';
import { useContactForm } from '../hooks/useContactForm';
import { MeetingModal } from './modals';
import { useTranslation } from '../../../shared/utils/translations';
import { Select } from '../../../shared/ui/Select/Select';
import { Reveal } from '@/shared/ui/Reveal';

export const Contact = () => {
  const { t, getOptions } = useTranslation();
  const { formData, handleChange, handleSubmit } = useContactForm();
  const [isMeetingModalOpen, setIsMeetingModalOpen] = useState(false);

  return (
    <section className="contact">
      <div className="contact__container">
        <Reveal className="contact__header">
          <h2 className="contact__title">{t('contact.title')}</h2>
          <p className="contact__description">{t('contact.description')}</p>
        </Reveal>

        <div className="contact__grid">
          <Reveal className="contact__form-wrapper">
            <div className="contact__form">
              <form onSubmit={handleSubmit} className="contact__form-fields">
                <div className="contact__field">
                  <label className="contact__label">{t('contact.name')} *</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="contact__input"
                    placeholder={t('contact.namePlaceholder')}
                  />
                </div>

                <div className="contact__field">
                  <label className="contact__label">{t('contact.company')}</label>
                  <input
                    type="text"
                    name="company"
                    value={formData.company}
                    onChange={handleChange}
                    className="contact__input"
                    placeholder={t('contact.companyPlaceholder')}
                  />
                </div>

                <div className="contact__field-group">
                  <div className="contact__field">
                    <label className="contact__label">{t('contact.email')} *</label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      className="contact__input"
                      placeholder={t('contact.emailPlaceholder')}
                    />
                  </div>

                  <div className="contact__field">
                    <label className="contact__label">{t('contact.phone')}</label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      className="contact__input"
                      placeholder={t('contact.phonePlaceholder')}
                    />
                  </div>
                </div>

                <div className="contact__field">
                  <label className="contact__label">{t('contact.budget')}</label>
                  <Select
                    options={getOptions('projectModal.budgetOptions')}
                    value={formData.budget}
                    onChange={value => handleChange({ target: { name: 'budget', value } } as React.ChangeEvent<HTMLSelectElement>)}
                    placeholder={t('contact.budgetPlaceholder')}
                  />
                </div>

                <div className="contact__field">
                  <label className="contact__label">{t('contact.message')} *</label>
                  <textarea
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    required
                    rows={4}
                    className="contact__textarea"
                    placeholder={t('contact.messagePlaceholder')}
                  />
                </div>

                <button type="submit" className="contact__submit">
                  {t('contact.submit')}
                </button>
              </form>
            </div>
          </Reveal>

          <Reveal delay={0.1} className="contact__info">
            <div className="contact__info-card">
              <h3 className="contact__info-title">{t('contact.infoTitle')}</h3>
              <div className="contact__info-items">
                <ContactItem
                  icon={Mail}
                  label={t('contact.labels.email')}
                  value="support@alexol.io"
                  href="mailto:support@alexol.io"
                />
                <ContactItem
                  icon={Phone}
                  label={t('contact.labels.phone')}
                  value="+7 (909) 517-55-57"
                  href="tel:+79095175557"
                />
                <ContactItem icon={Clock} label={t('contact.labels.schedule')} value={t('contact.values.schedule')} />
              </div>
            </div>

            <div className="contact__meeting">
              <h3 className="contact__meeting-title">{t('contact.meetingTitle')}</h3>
              <p className="contact__meeting-text">{t('contact.meetingText')}</p>
              <button onClick={() => setIsMeetingModalOpen(true)} className="contact__meeting-button">
                {t('contact.meetingButton')}
              </button>
            </div>
          </Reveal>
        </div>
      </div>

      <MeetingModal isOpen={isMeetingModalOpen} onClose={() => setIsMeetingModalOpen(false)} />
    </section>
  );
};

const ContactItem = ({
  icon: Icon,
  label,
  value,
  href,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  href?: string;
}) => (
  <div className="contact-item">
    <div className="contact-item__icon">
      <Icon />
    </div>
    <div className="contact-item__content">
      <div className="contact-item__label">{label}</div>
      {href ? (
        <a href={href} className="contact-item__value contact-item__value--link">
          {value}
        </a>
      ) : (
        <div className="contact-item__value">{value}</div>
      )}
    </div>
  </div>
);
