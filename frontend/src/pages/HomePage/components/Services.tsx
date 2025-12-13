import { motion } from "framer-motion";
import { Code, Users, Palette, Brain, Wrench, Building2 } from "lucide-react";

export const Services = () => {
  const services = [
    {
      icon: Code,
      title: "Заказная разработка ПО",
      description: "Web, Mobile, Desktop, API, интеграции, enterprise-решения.",
    },
    {
      icon: Users,
      title: "Аутсорс / аутстафф",
      description: "Усиливаем команды senior-разработчиками, берём сложные модули.",
    },
    {
      icon: Palette,
      title: "UI/UX дизайн",
      description: "Дизайн-системы, интерфейсы, продуктовая аналитика.",
    },
    {
      icon: Brain,
      title: "AI/ML интеграции",
      description: "Чат-боты, автоматизация процессов, предиктивная аналитика.",
    },
    {
      icon: Wrench,
      title: "Техподдержка и сопровождение",
      description: "SLA, развитие, оптимизация.",
    },
    {
      icon: Building2,
      title: "Архитектурный консалтинг",
      description: "Проектирование систем, аудит, техническая стратегия.",
    },
  ];

  return (
    <section className="services">
      <div className="services__container">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="services__header"
        >
          <h2 className="services__title">Наши компетенции</h2>
          <div className="services__divider" />
        </motion.div>

        <div className="services__grid">
          {services.map((service, index) => (
            <ServiceCard key={index} service={service} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
};

const ServiceCard = ({ service, index }: { service: any; index: number }) => {
  const Icon = service.icon;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, delay: index * 0.1 }}
      className="service-card"
    >
      <div className="service-card__glow" />
      
      <div className="service-card__content">
        <div className="service-card__icon">
          <Icon />
        </div>
        
        <h3 className="service-card__title">{service.title}</h3>
        <p className="service-card__description">{service.description}</p>
      </div>
    </motion.div>
  );
};
