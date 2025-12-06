import { motion } from "motion/react";
import { ArrowRight } from "lucide-react";

export function About() {
  return (
    <section className="py-24 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Текстовый блок */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="mb-6">
              Мы превращаем сложные задачи в{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#0AE3FF] to-[#7BF7FF]">
                работающие технологические решения
              </span>
            </h2>
            
            <p className="text-lg text-[#A8B0C0] mb-8 leading-relaxed">
              Мы — команда инженеров, аналитиков и проектных менеджеров, которые берут на себя полный цикл разработки. Помогаем компаниям внедрять инновации, снижать операционные затраты и запускать цифровые продукты быстрее.
            </p>
            
            <button className="group inline-flex items-center gap-2 px-6 py-3 border border-[#0AE3FF]/30 rounded-lg hover:bg-[#0AE3FF]/10 hover:border-[#0AE3FF] transition-all duration-300">
              <span>Подробнее о нас</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </motion.div>

          {/* Визуальный блок с метриками */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="grid grid-cols-2 gap-6"
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
}

function MetricCard({ number, label, delay }: { number: string; label: string; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, delay }}
      className="glass rounded-xl p-8 hover:border-[#0AE3FF] transition-all duration-300 group"
    >
      <div className="text-4xl mb-2 text-transparent bg-clip-text bg-gradient-to-br from-[#0AE3FF] to-[#7BF7FF] group-hover:scale-110 transition-transform">
        {number}
      </div>
      <div className="text-[#A8B0C0]">{label}</div>
    </motion.div>
  );
}
