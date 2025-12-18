import { motion } from 'framer-motion';
import { Mail, Phone, MapPin, Clock, LucideIcon } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from '../../../shared/utils/translations';

export const Contact = () => {
  const { t, getOptions } = useTranslation();
  const [formData, setFormData] = useState({
    name: '',
    company: '',
    email: '',
    phone: '',
    budget: '',
    message: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Form submitted:', formData);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <section className="contact">
      <div className="contact__container">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="contact__header"
        >
          <h2 className="contact__title">{t('contact.title')}</h2>
          <p className="contact__description">{t('contact.description')}</p>
        </motion.div>

        <div className="contact__grid">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="contact__form-wrapper"
          >
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
                  <select name="budget" value={formData.budget} onChange={handleChange} className="contact__select">
                    <option value="">{t('contact.budgetPlaceholder')}</option>
                    {getOptions('projectModal.budgetOptions').map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
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
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="contact__info"
          >
            <div className="contact__info-card">
              <h3 className="contact__info-title">{t('contact.infoTitle')}</h3>

              <div className="contact__info-items">
                <ContactItem icon={Mail} label={t('contact.labels.email')} value="hello@techcompany.ru" />
                <ContactItem icon={Phone} label={t('contact.labels.phone')} value="+7 (495) 123-45-67" />
                <ContactItem icon={MapPin} label={t('contact.labels.address')} value={t('contact.values.address')} />
                <ContactItem icon={Clock} label={t('contact.labels.schedule')} value={t('contact.values.schedule')} />
              </div>
            </div>

            <div className="contact__meeting">
              <h3 className="contact__meeting-title">{t('contact.meetingTitle')}</h3>
              <p className="contact__meeting-text">{t('contact.meetingText')}</p>
              <button className="contact__meeting-button">{t('contact.meetingButton')}</button>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

const ContactItem = ({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) => {
  return (
    <div className="contact-item">
      <div className="contact-item__icon">
        <Icon />
      </div>
      <div className="contact-item__content">
        <div className="contact-item__label">{label}</div>
        <div className="contact-item__value">{value}</div>
      </div>
    </div>
  );
};
