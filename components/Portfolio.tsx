import { motion } from "motion/react";
import { ArrowUpRight } from "lucide-react";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { useState } from "react";

export function Portfolio() {
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
      image: "https://images.unsplash.com/photo-1658297063569-162817482fb6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxlY29tbWVyY2UlMjBvbmxpbmUlMjBzaG9wcGluZ3xlbnwxfHx8fDE3NjQ5MjIzMDl8MA&ixlib=rb-4.1.0&q=80&w=1080",
    },
    {
      id: 2,
      category: "FinTech",
      title: "Аналитическая панель",
      description: "Real-time обработка финансовых данных и визуализация",
      result: "Обработка 10M транзакций/день",
      image: "https://images.unsplash.com/photo-1761850167081-473019536383?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmaW5hbmNpYWwlMjB0ZWNobm9sb2d5JTIwZGFzaGJvYXJkfGVufDF8fHx8MTc2NTAyMDE4N3ww&ixlib=rb-4.1.0&q=80&w=1080",
    },
    {
      id: 3,
      category: "MedTech",
      title: "Медицинская информационная система",
      description: "Система управления клиникой с ЭМК и телемедициной",
      result: "15 клиник, 200+ врачей",
      image: "https://images.unsplash.com/photo-1758691462848-ba1e929da259?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtZWRpY2FsJTIwdGVjaG5vbG9neSUyMGhlYWx0aGNhcmV8ZW58MXx8fHwxNzY0OTM0NjM3fDA&ixlib=rb-4.1.0&q=80&w=1080",
    },
    {
      id: 4,
      category: "Производство",
      title: "MES система для завода",
      description: "Управление производственными процессами и оборудованием",
      result: "30% рост эффективности",
      image: "https://images.unsplash.com/photo-1764835994645-3faa2c40f708?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmYWN0b3J5JTIwbWFudWZhY3R1cmluZyUyMGF1dG9tYXRpb258ZW58MXx8fHwxNzY1MDIwMTg4fDA&ixlib=rb-4.1.0&q=80&w=1080",
    },
    {
      id: 5,
      category: "Логистика",
      title: "Система управления складом",
      description: "WMS с интеграцией IoT и роботизированными системами",
      result: "50% сокращение времени комплектации",
      image: "https://images.unsplash.com/photo-1761195696590-3490ea770aa1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxsb2dpc3RpY3MlMjB3YXJlaG91c2UlMjB0ZWNobm9sb2d5fGVufDF8fHx8MTc2NDk1Nzg0N3ww&ixlib=rb-4.1.0&q=80&w=1080",
    },
    {
      id: 6,
      category: "Стартапы",
      title: "MVP для SaaS-стартапа",
      description: "От идеи до запуска за 3 месяца",
      result: "Привлечение $2M инвестиций",
      image: "https://images.unsplash.com/photo-1704440263700-e63c995b5dba?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzdGFydHVwJTIwb2ZmaWNlJTIwd29ya3NwYWNlfGVufDF8fHx8MTc2NTAyMDE4OXww&ixlib=rb-4.1.0&q=80&w=1080",
    },
    {
      id: 7,
      category: "AI-решения",
      title: "AI-ассистент для клиентского сервиса",
      description: "NLP-бот с интеграцией в CRM и каналы коммуникации",
      result: "70% автоматизация запросов",
      image: "https://images.unsplash.com/photo-1717501218534-156f33c28f8d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhcnRpZmljaWFsJTIwaW50ZWxsaWdlbmNlJTIwbmV1cmFsJTIwbmV0d29ya3xlbnwxfHx8fDE3NjQ5MzQ3MzV8MA&ixlib=rb-4.1.0&q=80&w=1080",
    },
    {
      id: 8,
      category: "ERP / CRM",
      title: "Enterprise CRM система",
      description: "Кастомизированная CRM с модульной архитектурой",
      result: "1500+ пользователей, 5 филиалов",
      image: "https://images.unsplash.com/photo-1759752394755-1241472b589d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxidXNpbmVzcyUyMHNvZnR3YXJlJTIwZGFzaGJvYXJkfGVufDF8fHx8MTc2NDk2MzExMXww&ixlib=rb-4.1.0&q=80&w=1080",
    },
  ];

  const filteredProjects = activeCategory === "Все" 
    ? projects 
    : projects.filter(p => p.category === activeCategory);

  return (
    <section className="py-24 px-6">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-12"
        >
          <h2 className="mb-4">Решения и портфолио</h2>
          <p className="text-[#A8B0C0] text-lg max-w-2xl mx-auto">
            Проектируем системы, которые работают под нагрузкой и помогают бизнесу расти
          </p>
        </motion.div>

        {/* Фильтр категорий */}
        <div className="flex flex-wrap justify-center gap-3 mb-12">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`px-6 py-2 rounded-full transition-all duration-300 ${
                activeCategory === category
                  ? "bg-gradient-to-r from-[#0AE3FF] to-[#1B91F7] text-white"
                  : "glass hover:border-[#0AE3FF]"
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Проекты */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((project, index) => (
            <ProjectCard key={project.id} project={project} index={index} />
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mt-12"
        >
          <button className="px-8 py-4 glass rounded-lg border border-[#0AE3FF]/30 hover:border-[#0AE3FF] hover:bg-[#0AE3FF]/10 transition-all duration-300">
            Все работы
          </button>
        </motion.div>
      </div>
    </section>
  );
}

function ProjectCard({ project, index }: { project: any; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, delay: index * 0.1 }}
      className="group glass rounded-xl overflow-hidden hover:border-[#0AE3FF] transition-all duration-300 cursor-pointer"
    >
      <div className="relative h-48 overflow-hidden">
        <ImageWithFallback
          src={project.image}
          alt={project.title}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0A0C10] via-transparent to-transparent opacity-60" />
        <div className="absolute top-4 right-4 w-10 h-10 rounded-full bg-[#0AE3FF]/20 flex items-center justify-center backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity">
          <ArrowUpRight className="w-5 h-5 text-[#0AE3FF]" />
        </div>
      </div>
      
      <div className="p-6">
        <div className="text-xs text-[#0AE3FF] mb-2 uppercase tracking-wider">
          {project.category}
        </div>
        <h3 className="mb-2">{project.title}</h3>
        <p className="text-[#A8B0C0] mb-4">{project.description}</p>
        <div className="pt-4 border-t border-[#0AE3FF]/10">
          <p className="text-sm text-[#7BF7FF]">{project.result}</p>
        </div>
      </div>
    </motion.div>
  );
}
