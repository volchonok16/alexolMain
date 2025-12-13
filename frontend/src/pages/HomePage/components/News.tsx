import { motion } from "framer-motion";
import { Calendar, ArrowRight } from "lucide-react";
import { ImageWithFallback } from "@/shared/ui";

export const News = () => {
  const articles = [
    {
      id: 1,
      category: "Аналитика",
      title: "Микросервисная архитектура: когда она действительно нужна",
      excerpt: "Разбираем реальные сценарии применения микросервисов и их альтернативы",
      date: "1 декабря 2025",
      image: "https://images.unsplash.com/photo-1626908013943-df94de54984c?w=400",
    },
    {
      id: 2,
      category: "IT-тренды",
      title: "AI в продакшн: от эксперимента к реальной пользе",
      excerpt: "Как правильно внедрять машинное обучение в бизнес-процессы",
      date: "25 ноября 2025",
      image: "https://images.unsplash.com/photo-1531498860502-7c67cf02f657?w=400",
    },
    {
      id: 3,
      category: "Кейсы",
      title: "Как мы оптимизировали систему и сократили время отклика на 300%",
      excerpt: "История проекта по рефакторингу высоконагруженной системы",
      date: "18 ноября 2025",
      image: "https://images.unsplash.com/photo-1726138388546-30955e45aaec?w=400",
    },
  ];

  return (
    <section className="news">
      <div className="news__container">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="news__header"
        >
          <h2 className="news__title">Новости и статьи</h2>
          <p className="news__description">
            Делимся опытом и инсайтами из мира разработки
          </p>
        </motion.div>

        <div className="news__grid">
          {articles.map((article, index) => (
            <ArticleCard key={article.id} article={article} index={index} />
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="news__cta"
        >
          <button className="news__button">
            <span>Все статьи</span>
            <ArrowRight />
          </button>
        </motion.div>
      </div>
    </section>
  );
};

const ArticleCard = ({ article, index }: { article: any; index: number }) => {
  return (
    <motion.article
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, delay: index * 0.1 }}
      className="article-card"
    >
      <div className="article-card__image">
        <ImageWithFallback
          src={article.image}
          alt={article.title}
          className="article-card__img"
        />
        <div className="article-card__overlay" />
        <div className="article-card__category">
          {article.category}
        </div>
      </div>

      <div className="article-card__content">
        <div className="article-card__date">
          <Calendar />
          <span>{article.date}</span>
        </div>
        
        <h3 className="article-card__title">
          {article.title}
        </h3>
        
        <p className="article-card__excerpt">
          {article.excerpt}
        </p>
      </div>
    </motion.article>
  );
};
