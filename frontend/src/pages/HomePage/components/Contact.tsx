import { motion } from "framer-motion";
import { Mail, Phone, MapPin, Clock } from "lucide-react";
import { useState } from "react";

export const Contact = () => {
  const [formData, setFormData] = useState({
    name: "",
    company: "",
    email: "",
    phone: "",
    budget: "",
    message: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Form submitted:", formData);
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
          <h2 className="contact__title">Свяжитесь с нами</h2>
          <p className="contact__description">
            Обсудим ваш проект и подберём оптимальное решение
          </p>
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
              <div className="contact__notice">
                <p>💡 Нужна консультация? CTO подключится в течение 24 часов</p>
              </div>

              <form onSubmit={handleSubmit} className="contact__form-fields">
                <div className="contact__field">
                  <label className="contact__label">Ваше имя *</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="contact__input"
                    placeholder="Иван Иванов"
                  />
                </div>

                <div className="contact__field">
                  <label className="contact__label">Компания</label>
                  <input
                    type="text"
                    name="company"
                    value={formData.company}
                    onChange={handleChange}
                    className="contact__input"
                    placeholder="ООО Технологии"
                  />
                </div>

                <div className="contact__field-group">
                  <div className="contact__field">
                    <label className="contact__label">Email *</label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      className="contact__input"
                      placeholder="email@example.com"
                    />
                  </div>

                  <div className="contact__field">
                    <label className="contact__label">Телефон</label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      className="contact__input"
                      placeholder="+7 (999) 123-45-67"
                    />
                  </div>
                </div>

                <div className="contact__field">
                  <label className="contact__label">Бюджет проекта</label>
                  <select
                    name="budget"
                    value={formData.budget}
                    onChange={handleChange}
                    className="contact__select"
                  >
                    <option value="">Выберите диапазон</option>
                    <option value="500k-1m">500 тыс. - 1 млн ₽</option>
                    <option value="1m-3m">1 - 3 млн ₽</option>
                    <option value="3m-5m">3 - 5 млн ₽</option>
                    <option value="5m+">От 5 млн ₽</option>
                  </select>
                </div>

                <div className="contact__field">
                  <label className="contact__label">Описание задачи *</label>
                  <textarea
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    required
                    rows={4}
                    className="contact__textarea"
                    placeholder="Расскажите о вашем проекте..."
                  />
                </div>

                <button type="submit" className="contact__submit">
                  Отправить заявку
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
              <h3 className="contact__info-title">Контактная информация</h3>
              
              <div className="contact__info-items">
                <ContactItem icon={Mail} label="Email" value="hello@techcompany.ru" />
                <ContactItem icon={Phone} label="Телефон" value="+7 (495) 123-45-67" />
                <ContactItem icon={MapPin} label="Адрес" value="Москва, ул. Технологическая, 1" />
                <ContactItem icon={Clock} label="Режим работы" value="Пн-Пт: 10:00 - 19:00" />
              </div>
            </div>

            <div className="contact__meeting">
              <h3 className="contact__meeting-title">Назначить встречу</h3>
              <p className="contact__meeting-text">
                Проведём онлайн-встречу, обсудим задачи и предложим решение
              </p>
              <button className="contact__meeting-button">
                Выбрать время
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

const ContactItem = ({ icon: Icon, label, value }: { icon: any; label: string; value: string }) => {
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
