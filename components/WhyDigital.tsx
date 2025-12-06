import { motion } from "motion/react";
import { TrendingDown, Users, Eye, Shield, Zap, TrendingUp } from "lucide-react";

export function WhyDigital() {
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
    <section className="py-24 px-6 relative overflow-hidden">
      {/* Фоновый элемент */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#1B91F7] blur-[150px]" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-[#0AE3FF] blur-[150px]" />
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <h2 className="mb-6">
            Технологии — это не расход.{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#0AE3FF] to-[#7BF7FF]">
              Это рост, масштаб и контроль.
            </span>
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {benefits.map((benefit, index) => (
            <BenefitCard key={index} benefit={benefit} index={index} />
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center"
        >
          <button className="px-8 py-4 bg-gradient-to-r from-[#0AE3FF] to-[#1B91F7] rounded-lg hover:shadow-[0_0_30px_rgba(10,227,255,0.5)] transition-all duration-300">
            Получить консультацию
          </button>
        </motion.div>
      </div>
    </section>
  );
}

function BenefitCard({ benefit, index }: { benefit: any; index: number }) {
  const Icon = benefit.icon;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, delay: index * 0.1 }}
      className="glass rounded-xl p-6 hover:border-[#0AE3FF] transition-all duration-300 group"
    >
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-[#0AE3FF]/20 to-[#1B91F7]/20 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
          <Icon className="w-6 h-6 text-[#0AE3FF]" />
        </div>
        <p className="pt-2">{benefit.title}</p>
      </div>
    </motion.div>
  );
}
