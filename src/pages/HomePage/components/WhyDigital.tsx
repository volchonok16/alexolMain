import { motion } from "framer-motion";
import { TrendingDown, Users, Eye, Shield, Zap, TrendingUp } from "lucide-react";

export const WhyDigital = () => {
  const benefits = [
    {
      icon: TrendingDown,
      title: "Автоматизация снижает операционные затраты",
    },
    {
      icon: Users,
      title: "Упрощение клиентского пути",
    },
    {
      icon: Eye,
      title: "Контроль и прозрачность процессов",
    },
    {
      icon: Shield,
      title: "Снижение зависимости от человеческого фактора",
    },
    {
      icon: Zap,
      title: "Быстрая адаптация к рынку",
    },
    {
      icon: TrendingUp,
      title: "Повышение эффективности сотрудников",
    },
  ];

  return (
    <section className="why-digital">
      <div className="why-digital__background">
        <div className="why-digital__gradient why-digital__gradient--left" />
        <div className="why-digital__gradient why-digital__gradient--right" />
      </div>

      <div className="why-digital__container">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="why-digital__header"
        >
          <h2 className="why-digital__title">
            Технологии — это не расход.{" "}
            <span className="why-digital__highlight">
              Это рост, масштаб и контроль.
            </span>
          </h2>
        </motion.div>

        <div className="why-digital__grid">
          {benefits.map((benefit, index) => (
            <BenefitCard key={index} benefit={benefit} index={index} />
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="why-digital__cta"
        >
          <button className="why-digital__button">
            Получить консультацию
          </button>
        </motion.div>
      </div>
    </section>
  );
};

const BenefitCard = ({ benefit, index }: { benefit: any; index: number }) => {
  const Icon = benefit.icon;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, delay: index * 0.1 }}
      className="benefit-card"
    >
      <div className="benefit-card__content">
        <div className="benefit-card__icon">
          <Icon />
        </div>
        <p className="benefit-card__title">{benefit.title}</p>
      </div>
    </motion.div>
  );
};
