import { motion } from "motion/react";
import { Calendar, ArrowRight } from "lucide-react";
import { ImageWithFallback } from "./figma/ImageWithFallback";

export function News() {
  const articles = [
    {
      id: 1,
      category: "Аналитика",
      title: "Микросервисная архитектура: когда она действительно нужна",
      excerpt: "Разбираем реальные сценарии применения микросервисов и их альтернативы",
      date: "1 декабря 2025",
      image: "https://images.unsplash.com/photo-1626908013943-df94de54984c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx0ZWNobm9sb2d5JTIwaW5ub3ZhdGlvbiUyMGFic3RyYWN0fGVufDF8fHx8MTc2NTAwNzI4NHww&ixlib=rb-4.1.0&q=80&w=1080",
    },
    {
      id: 2,
      category: "IT-тренды",
      title: "AI в продакшн: от эксперимента к реальной пользе",
      excerpt: "Как правильно внедрять машинное обучение в бизнес-процессы",
      date: "25 ноября 2025",
      image: "https://images.unsplash.com/photo-1531498860502-7c67cf02f657?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzb2Z0d2FyZSUyMGRldmVsb3BtZW50JTIwY29kaW5nfGVufDF8fHx8MTc2NDkyMzgyNHww&ixlib=rb-4.1.0&q=80&w=1080",
    },
    {
      id: 3,
      category: "Кейсы",
      title: "Как мы оптимизировали систему и сократили время отклика на 300%",
      excerpt: "История проекта по рефакторингу высоконагруженной системы",
      date: "18 ноября 2025",
      image: "https://images.unsplash.com/photo-1726138388546-30955e45aaec?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxkaWdpdGFsJTIwdHJhbnNmb3JtYXRpb24lMjBidXNpbmVzc3xlbnwxfHx8fDE3NjQ5Mzg2MDd8MA&ixlib=rb-4.1.0&q=80&w=1080",
    },
  ];

  return (
    <section className="py-24 px-6">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <h2 className="mb-4">Новости и статьи</h2>
          <p className="text-[#A8B0C0] text-lg">
            Делимся опытом и инсайтами из мира разработки
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8">
          {articles.map((article, index) => (
            <ArticleCard key={article.id} article={article} index={index} />
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mt-12"
        >
          <button className="group inline-flex items-center gap-2 px-6 py-3 border border-[#0AE3FF]/30 rounded-lg hover:bg-[#0AE3FF]/10 hover:border-[#0AE3FF] transition-all duration-300">
            <span>Все статьи</span>
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
        </motion.div>
      </div>
    </section>
  );
}

function ArticleCard({ article, index }: { article: any; index: number }) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, delay: index * 0.1 }}
      className="group glass rounded-xl overflow-hidden hover:border-[#0AE3FF] transition-all duration-300 cursor-pointer"
    >
      <div className="relative h-56 overflow-hidden">
        <ImageWithFallback
          src={article.image}
          alt={article.title}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0A0C10] via-transparent to-transparent opacity-60" />
        <div className="absolute top-4 left-4 px-3 py-1 rounded-full glass text-sm">
          {article.category}
        </div>
      </div>

      <div className="p-6">
        <div className="flex items-center gap-2 text-sm text-[#A8B0C0] mb-3">
          <Calendar className="w-4 h-4" />
          <span>{article.date}</span>
        </div>
        
        <h3 className="mb-3 group-hover:text-[#0AE3FF] transition-colors">
          {article.title}
        </h3>
        
        <p className="text-[#A8B0C0] leading-relaxed">
          {article.excerpt}
        </p>
      </div>
    </motion.article>
  );
}
