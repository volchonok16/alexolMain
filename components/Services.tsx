import { motion } from "motion/react";
import { Code, Users, Palette, Brain, Wrench, Building2 } from "lucide-react";

export function Services() {
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
    <section className="py-24 px-6 bg-[#0C0F16]/30">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <h2 className="mb-4">Наши компетенции</h2>
          <div className="w-20 h-1 bg-gradient-to-r from-[#0AE3FF] to-[#7BF7FF] mx-auto rounded-full" />
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((service, index) => (
            <ServiceCard key={index} service={service} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}

function ServiceCard({ service, index }: { service: any; index: number }) {
  const Icon = service.icon;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, delay: index * 0.1 }}
      className="glass rounded-xl p-8 hover:border-[#0AE3FF] transition-all duration-300 group relative overflow-hidden"
    >
      {/* Фоновое свечение при hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0AE3FF]/0 to-[#1B91F7]/0 group-hover:from-[#0AE3FF]/10 group-hover:to-[#1B91F7]/5 transition-all duration-300" />
      
      <div className="relative z-10">
        <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-[#0AE3FF]/20 to-[#1B91F7]/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
          <Icon className="w-7 h-7 text-[#0AE3FF]" />
        </div>
        
        <h3 className="mb-3">{service.title}</h3>
        <p className="text-[#A8B0C0] leading-relaxed">{service.description}</p>
      </div>
    </motion.div>
  );
}
