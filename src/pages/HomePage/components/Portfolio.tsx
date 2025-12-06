import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { ImageWithFallback } from "@/shared/ui";
import { useState } from "react";

export const Portfolio = () => {
  const [activeCategory, setActiveCategory] = useState("Все");

  const categories = [
    "Все",
    "eCommerce",
    "FinTech",
    "MedTech",
    "Производство",
    "Логистика",
    "Стартапы",
    "AI-решения",
    "ERP / CRM",
  ];

  const projects = [
    {
      id: 1,
      category: "eCommerce",
      title: "Платформа маркетплейса",
      description: "Высоконагруженная система с микросервисной архитектурой",
      result: "500K пользователей, 99.9% uptime",
      image: "https://images.unsplash.com/photo-1658297063569-162817482fb6?w=400",
    },
    {
      id: 2,
      category: "FinTech",
      title: "Аналитическая панель",
      description: "Real-time обработка финансовых данных и визуализация",
      result: "Обработка 10M транзакций/день",
      image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400",
    },
    {
      id: 3,
      category: "MedTech",
      title: "Медицинская информационная система",
      description: "Система управления клиникой с ЭМК и телемедициной",
      result: "15 клиник, 200+ врачей",
      image: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1f?w=400",
    },
  ];

  const filteredProjects = activeCategory === "Все" 
    ? projects 
    : projects.filter(p => p.category === activeCategory);

  return (
    <section className="portfolio">
      <div className="portfolio__container">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="portfolio__header"
        >
          <h2 className="portfolio__title">Решения и портфолио</h2>
          <p className="portfolio__description">
            Проектируем системы, которые работают под нагрузкой и помогают бизнесу расти
          </p>
        </motion.div>

        <div className="portfolio__filters">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`portfolio__filter ${
                activeCategory === category ? "portfolio__filter--active" : ""
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        <div className="portfolio__grid">
          {filteredProjects.map((project, index) => (
            <ProjectCard key={project.id} project={project} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
};

const ProjectCard = ({ project, index }: { project: any; index: number }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, delay: index * 0.1 }}
      className="project-card"
    >
      <div className="project-card__image">
        <ImageWithFallback
          src={project.image}
          alt={project.title}
          className="project-card__img"
        />
        <div className="project-card__overlay" />
        <div className="project-card__icon">
          <ArrowUpRight />
        </div>
      </div>
      
      <div className="project-card__content">
        <div className="project-card__category">
          {project.category}
        </div>
        <h3 className="project-card__title">{project.title}</h3>
        <p className="project-card__description">{project.description}</p>
        <div className="project-card__result">
          <p>{project.result}</p>
        </div>
      </div>
    </motion.div>
  );
};
