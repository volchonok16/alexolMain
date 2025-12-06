import { motion } from "motion/react";
import { Mail, Phone, MapPin, Clock } from "lucide-react";
import { useState } from "react";

export function Contact() {
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
    // Здесь будет логика отправки формы
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <section className="py-24 px-6 bg-[#0C0F16]/30">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <h2 className="mb-4">Свяжитесь с нами</h2>
          <p className="text-[#A8B0C0] text-lg">
            Обсудим ваш проект и подберём оптимальное решение
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-12">
          {/* Форма */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <div className="glass rounded-2xl p-8">
              <div className="mb-6 p-4 rounded-lg bg-[#0AE3FF]/10 border border-[#0AE3FF]/20">
                <p className="text-[#0AE3FF]">
                  💡 Нужна консультация? CTO подключится в течение 24 часов
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm mb-2 text-[#A8B0C0]">
                    Ваше имя *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 bg-[#0A0C10] border border-[#0AE3FF]/20 rounded-lg focus:border-[#0AE3FF] focus:outline-none transition-colors"
                    placeholder="Иван Иванов"
                  />
                </div>

                <div>
                  <label className="block text-sm mb-2 text-[#A8B0C0]">
                    Компания
                  </label>
                  <input
                    type="text"
                    name="company"
                    value={formData.company}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-[#0A0C10] border border-[#0AE3FF]/20 rounded-lg focus:border-[#0AE3FF] focus:outline-none transition-colors"
                    placeholder="ООО Технологии"
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm mb-2 text-[#A8B0C0]">
                      Email *
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 bg-[#0A0C10] border border-[#0AE3FF]/20 rounded-lg focus:border-[#0AE3FF] focus:outline-none transition-colors"
                      placeholder="email@example.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm mb-2 text-[#A8B0C0]">
                      Телефон
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      className="w-full px-4 py-3 bg-[#0A0C10] border border-[#0AE3FF]/20 rounded-lg focus:border-[#0AE3FF] focus:outline-none transition-colors"
                      placeholder="+7 (999) 123-45-67"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm mb-2 text-[#A8B0C0]">
                    Бюджет проекта
                  </label>
                  <select
                    name="budget"
                    value={formData.budget}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-[#0A0C10] border border-[#0AE3FF]/20 rounded-lg focus:border-[#0AE3FF] focus:outline-none transition-colors"
                  >
                    <option value="">Выберите диапазон</option>
                    <option value="500k-1m">500 тыс. - 1 млн ₽</option>
                    <option value="1m-3m">1 - 3 млн ₽</option>
                    <option value="3m-5m">3 - 5 млн ₽</option>
                    <option value="5m+">От 5 млн ₽</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm mb-2 text-[#A8B0C0]">
                    Описание задачи *
                  </label>
                  <textarea
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    required
                    rows={4}
                    className="w-full px-4 py-3 bg-[#0A0C10] border border-[#0AE3FF]/20 rounded-lg focus:border-[#0AE3FF] focus:outline-none transition-colors resize-none"
                    placeholder="Расскажите о вашем проекте..."
                  />
                </div>

                <button
                  type="submit"
                  className="w-full px-8 py-4 bg-gradient-to-r from-[#0AE3FF] to-[#1B91F7] rounded-lg hover:shadow-[0_0_30px_rgba(10,227,255,0.5)] transition-all duration-300"
                >
                  Отправить заявку
                </button>
              </form>
            </div>
          </motion.div>

          {/* Контактная информация */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="space-y-8"
          >
            <div className="glass rounded-2xl p-8">
              <h3 className="mb-6">Контактная информация</h3>
              
              <div className="space-y-6">
                <ContactItem
                  icon={Mail}
                  label="Email"
                  value="hello@techcompany.ru"
                />
                <ContactItem
                  icon={Phone}
                  label="Телефон"
                  value="+7 (495) 123-45-67"
                />
                <ContactItem
                  icon={MapPin}
                  label="Адрес"
                  value="Москва, ул. Технологическая, 1"
                />
                <ContactItem
                  icon={Clock}
                  label="Режим работы"
                  value="Пн-Пт: 10:00 - 19:00"
                />
              </div>
            </div>

            <div className="glass rounded-2xl p-8">
              <h3 className="mb-4">Назначить встречу</h3>
              <p className="text-[#A8B0C0] mb-6">
                Проведём онлайн-встречу, обсудим задачи и предложим решение
              </p>
              <button className="w-full px-6 py-3 border border-[#0AE3FF]/30 rounded-lg hover:bg-[#0AE3FF]/10 hover:border-[#0AE3FF] transition-all duration-300">
                Выбрать время
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function ContactItem({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-start gap-4">
      <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-[#0AE3FF]/20 to-[#1B91F7]/20 flex items-center justify-center flex-shrink-0">
        <Icon className="w-6 h-6 text-[#0AE3FF]" />
      </div>
      <div>
        <div className="text-[#A8B0C0] text-sm mb-1">{label}</div>
        <div>{value}</div>
      </div>
    </div>
  );
}
