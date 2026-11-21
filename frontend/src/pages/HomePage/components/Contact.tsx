import { useCallback, useEffect, useState } from 'react';
import { Mail, Phone, Clock, LucideIcon, Check, AlertCircle } from 'lucide-react';
import { useContactForm } from '../hooks/useContactForm';
import { MeetingModal } from './modals';
import { useLanguage } from '@/shared/contexts';
import { marketingCopy } from '@/shared/utils/marketingCopy';
import { Reveal } from '@/shared/ui/Reveal';

const contactDetails = {
  ru: {
    infoTitle: 'Контактная информация',
    meetingTitle: 'Назначить встречу',
    meetingText: 'Проведём онлайн-встречу, обсудим задачу и наметим возможный следующий шаг.',
    meetingButton: 'Выбрать время',
    emailLabel: 'Почта',
    phoneLabel: 'Телефон',
    scheduleLabel: 'График',
    scheduleValue: 'Пн–Вс: 08:00–22:00',
  },
  en: {
    infoTitle: 'Contact details',
    meetingTitle: 'Schedule a meeting',
    meetingText: 'We can meet online, discuss your needs and outline a practical next step.',
    meetingButton: 'Choose a time',
    emailLabel: 'Email',
    phoneLabel: 'Phone',
    scheduleLabel: 'Hours',
    scheduleValue: 'Mon–Sun: 08:00–22:00',
  },
} as const;

export const Contact = () => {
  const { language } = useLanguage();
  const copy = marketingCopy[language].contact;
  const details = contactDetails[language];
  const { formData, handleChange, handleSubmit, isLoading, isSuccess, error } = useContactForm();
  const [isMeetingModalOpen, setIsMeetingModalOpen] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState('');
  const normalizeTopic = useCallback(
    (topic: string) => {
      const currentTopics = marketingCopy[language].contact.topics as readonly string[];
      const index = currentTopics.indexOf(topic);
      return language === 'en' && index >= 0 ? marketingCopy.ru.contact.topics[index] : topic;
    },
    [language]
  );

  const handleTopic = useCallback(
    (event: Event) => {
      const topic = normalizeTopic((event as CustomEvent<string>).detail);
      setSelectedTopic(topic);
      handleChange({ target: { name: 'budget', value: topic } });
    },
    [handleChange, normalizeTopic]
  );

  useEffect(() => {
    window.addEventListener('alexol:contact-topic', handleTopic);
    return () => window.removeEventListener('alexol:contact-topic', handleTopic);
  }, [handleTopic]);

  useEffect(() => {
    if (isSuccess) setSelectedTopic('');
  }, [isSuccess]);

  return (
    <section className="contact">
      <div className="contact__container">
        <Reveal className="contact__header">
          <h2 className="contact__title">{copy.title}</h2>
          <p className="contact__description">{copy.description}</p>
        </Reveal>

        <div className="contact__grid">
          <Reveal className="contact__form-wrapper">
            <div className="contact__form">
              <form onSubmit={handleSubmit} className="contact__form-fields">
                <div className="contact__field">
                  <label className="contact__label" htmlFor="contact-name">
                    {copy.name} *
                  </label>
                  <input
                    id="contact-name"
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="contact__input"
                    placeholder={language === 'ru' ? 'Иван Иванов' : 'Jane Smith'}
                  />
                </div>

                <div className="contact__field">
                  <label className="contact__label" htmlFor="contact-company">
                    {copy.company}
                  </label>
                  <input
                    id="contact-company"
                    type="text"
                    name="company"
                    value={formData.company}
                    onChange={handleChange}
                    className="contact__input"
                    placeholder={language === 'ru' ? 'Название компании' : 'Company name'}
                  />
                </div>

                <div className="contact__field-group">
                  <div className="contact__field">
                    <label className="contact__label" htmlFor="contact-email">
                      {copy.email} *
                    </label>
                    <input
                      id="contact-email"
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      className="contact__input"
                      placeholder="name@company.com"
                    />
                  </div>

                  <div className="contact__field">
                    <label className="contact__label" htmlFor="contact-phone">
                      {copy.phone}
                    </label>
                    <input
                      id="contact-phone"
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      className="contact__input"
                      placeholder={language === 'ru' ? '+7 (999) 123-45-67' : '+1 (555) 123-4567'}
                    />
                  </div>
                </div>

                <div className="contact__field">
                  <label className="contact__label" htmlFor="contact-topic">
                    {copy.topic}
                  </label>
                  <select
                    id="contact-topic"
                    value={
                      selectedTopic
                        ? (copy.topics[(marketingCopy.ru.contact.topics as readonly string[]).indexOf(selectedTopic)] ??
                          '')
                        : ''
                    }
                    name="budget"
                    onChange={event => {
                      const topic = normalizeTopic(event.target.value);
                      setSelectedTopic(topic);
                      handleChange({ target: { name: 'budget', value: topic } });
                    }}
                    className="contact__input"
                  >
                    <option value="">{copy.choose}</option>
                    {copy.topics.map(topic => (
                      <option key={topic} value={normalizeTopic(topic)}>
                        {topic}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="contact__field">
                  <label className="contact__label" htmlFor="contact-message">
                    {copy.message} *
                  </label>
                  <textarea
                    id="contact-message"
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    required
                    rows={4}
                    className="contact__textarea"
                    placeholder={copy.placeholder}
                  />
                </div>

                <label className="contact__consent">
                  <input type="checkbox" required />
                  <span>{copy.consent}</span>
                </label>

                <button type="submit" className="contact__submit" disabled={isLoading}>
                  {isLoading ? copy.sending : copy.submit}
                </button>
                {isSuccess && (
                  <p className="contact__feedback contact__feedback--success" role="status">
                    <Check size={16} /> {copy.success}
                  </p>
                )}
                {error && (
                  <p className="contact__feedback contact__feedback--error" role="alert">
                    <AlertCircle size={16} /> {copy.error}
                  </p>
                )}
              </form>
            </div>
          </Reveal>

          <Reveal delay={0.1} className="contact__info">
            <div className="contact__info-card">
              <h3 className="contact__info-title">{details.infoTitle}</h3>
              <div className="contact__info-items">
                <ContactItem
                  icon={Mail}
                  label={details.emailLabel}
                  value="support@alexol.io"
                  href="mailto:support@alexol.io"
                />
                <ContactItem
                  icon={Phone}
                  label={details.phoneLabel}
                  value="+7 (909) 517-55-57"
                  href="tel:+79095175557"
                />
                <ContactItem icon={Clock} label={details.scheduleLabel} value={details.scheduleValue} />
              </div>
            </div>

            <div className="contact__meeting">
              <h3 className="contact__meeting-title">{details.meetingTitle}</h3>
              <p className="contact__meeting-text">{details.meetingText}</p>
              <button onClick={() => setIsMeetingModalOpen(true)} className="contact__meeting-button">
                {details.meetingButton}
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
