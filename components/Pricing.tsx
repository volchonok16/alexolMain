import { motion } from "motion/react";
import { Layers, Network, Monitor, Palette, Link2, Clock, BarChart3, Headphones } from "lucide-react";

export function Pricing() {
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
    <section className="py-24 px-6 bg-[#0C0F16]/30">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <h2 className="mb-4">Из чего формируется стоимость проекта</h2>
          <p className="text-[#A8B0C0] text-lg max-w-2xl mx-auto">
            Мы предлагаем честную оценку проекта с обоснованием
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {factors.map((factor, index) => (
            <FactorCard key={index} factor={factor} index={index} />
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="glass rounded-2xl p-8 md:p-12 text-center"
        >
          <div className="max-w-3xl mx-auto">
            <p className="text-lg text-[#A8B0C0] mb-6">
              Каждый проект уникален. Мы не работаем по шаблонам — мы проектируем архитектуру под конкретные задачи вашего бизнеса.
            </p>
            <div className="flex items-center justify-center gap-2 mb-8">
              <div className="h-px w-20 bg-gradient-to-r from-transparent to-[#0AE3FF]" />
              <p className="text-[#0AE3FF]">
                Минимальный порог сотрудничества — от 500 тыс. ₽
              </p>
              <div className="h-px w-20 bg-gradient-to-l from-transparent to-[#0AE3FF]" />
            </div>
            <button className="px-8 py-4 bg-gradient-to-r from-[#0AE3FF] to-[#1B91F7] rounded-lg hover:shadow-[0_0_30px_rgba(10,227,255,0.5)] transition-all duration-300">
              Получить расчёт
            </button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function FactorCard({ factor, index }: { factor: any; index: number }) {
  const Icon = factor.icon;
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.05 }}
      className="glass rounded-xl p-6 hover:border-[#0AE3FF] transition-all duration-300 group text-center"
    >
      <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-[#0AE3FF]/20 to-[#1B91F7]/20 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
        <Icon className="w-8 h-8 text-[#0AE3FF]" />
      </div>
      <p>{factor.label}</p>
    </motion.div>
  );
}
