import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

export const About = () => {
  return (
    <section className="about">
      <div className="about__container">
        <div className="about__grid">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="about__title">
              Мы превращаем сложные задачи в{" "}
              <span className="about__highlight">
                работающие технологические решения
              </span>
            </h2>
            
            <p className="about__description">
              Мы — команда инженеров, аналитиков и проектных менеджеров, которые берут на себя полный цикл разработки. Помогаем компаниям внедрять инновации, снижать операционные затраты и запускать цифровые продукты быстрее.
            </p>
            
            <button className="about__button">
              <span>Подробнее о нас</span>
              <ArrowRight />
            </button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="about__metrics"
          >
            <MetricCard number="7+" label="лет опыта" delay={0} />
            <MetricCard number="150+" label="реализованных проектов" delay={0.1} />
            <MetricCard number="12" label="отраслей" delay={0.2} />
            <MetricCard number="40+" label="senior-специалистов" delay={0.3} />
          </motion.div>
        </div>
      </div>
    </section>
  );
};

const MetricCard = ({ number, label, delay }: { number: string; label: string; delay: number }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, delay }}
      className="metric-card"
    >
      <div className="metric-card__number">{number}</div>
      <div className="metric-card__label">{label}</div>
    </motion.div>
  );
};
