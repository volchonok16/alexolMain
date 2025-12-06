import { motion } from "framer-motion";
import { Layers, Network, Monitor, Palette, Link2, Clock, BarChart3, Headphones } from "lucide-react";

export const Pricing = () => {
  const factors = [
    { icon: Layers, label: "Объём функционала" },
    { icon: Network, label: "Сложность архитектуры" },
    { icon: Monitor, label: "Количество платформ" },
    { icon: Palette, label: "Дизайн" },
    { icon: Link2, label: "Интеграции" },
    { icon: Clock, label: "Требуемые сроки" },
    { icon: BarChart3, label: "Нагрузка и масштаб" },
    { icon: Headphones, label: "Поддержка" },
  ];

  return (
    <section className="pricing">
      <div className="pricing__container">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="pricing__header"
        >
          <h2 className="pricing__title">Из чего формируется стоимость проекта</h2>
          <p className="pricing__description">
            Мы предлагаем честную оценку проекта с обоснованием
          </p>
        </motion.div>

        <div className="pricing__grid">
          {factors.map((factor, index) => (
            <FactorCard key={index} factor={factor} index={index} />
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="pricing__summary"
        >
          <div className="pricing__summary-content">
            <p className="pricing__summary-text">
              Каждый проект уникален. Мы не работаем по шаблонам — мы проектируем архитектуру под конкретные задачи вашего бизнеса.
            </p>
            <div className="pricing__threshold">
              <p>Минимальный порог сотрудничества — от 500 тыс. ₽</p>
            </div>
            <button className="pricing__button">
              Получить расчёт
            </button>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

const FactorCard = ({ factor, index }: { factor: any; index: number }) => {
  const Icon = factor.icon;
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.05 }}
      className="factor-card"
    >
      <div className="factor-card__icon">
        <Icon />
      </div>
      <p className="factor-card__label">{factor.label}</p>
    </motion.div>
  );
};
