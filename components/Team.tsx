import { motion } from "motion/react";
import { ImageWithFallback } from "./figma/ImageWithFallback";

export function Team() {
  const techStack = [
    { name: "React", category: "Frontend" },
    { name: "TypeScript", category: "Frontend" },
    { name: "Node.js", category: "Backend" },
    { name: "Python", category: "Backend" },
    { name: "PostgreSQL", category: "Backend" },
    { name: "MongoDB", category: "Backend" },
    { name: "Docker", category: "DevOps" },
    { name: "Kubernetes", category: "DevOps" },
    { name: "AWS", category: "DevOps" },
    { name: "TensorFlow", category: "AI/ML" },
    { name: "React Native", category: "Mobile" },
    { name: "Swift", category: "Mobile" },
  ];

  return (
    <section className="py-24 px-6 bg-[#0C0F16]/30">
      <div className="max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Фото и текст */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-r from-[#0AE3FF]/20 to-[#1B91F7]/20 blur-2xl rounded-2xl" />
              <div className="relative glass rounded-2xl p-8">
                <div className="w-32 h-32 rounded-xl overflow-hidden mb-6 border-2 border-[#0AE3FF]/30">
                  <ImageWithFallback
                    src="https://images.unsplash.com/photo-1737575655055-e3967cbefd03?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9mZXNzaW9uYWwlMjBkZXZlbG9wZXIlMjBwb3J0cmFpdHxlbnwxfHx8fDE3NjQ5OTIyMjB8MA&ixlib=rb-4.1.0&q=80&w=1080"
                    alt="CTO"
                    className="w-full h-full object-cover"
                  />
                </div>
                
                <div className="text-[#0AE3FF] text-sm mb-2">Chief Technology Officer</div>
                <h3 className="mb-4">Инженерное мышление и ответственность за архитектуру</h3>
                <p className="text-[#A8B0C0] leading-relaxed">
                  Наши решения выдерживают нагрузку и растут вместе с бизнесом. Мы используем проверенный стек технологий и придерживаемся культуры чистого кода.
                </p>
              </div>
            </div>
          </motion.div>

          {/* Стек технологий */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <h3 className="mb-8">Наш технологический стек</h3>
            
            <div className="space-y-8">
              {["Frontend", "Backend", "DevOps", "Mobile", "AI/ML"].map((category) => (
                <div key={category}>
                  <div className="text-[#0AE3FF] text-sm mb-3 uppercase tracking-wider">
                    {category}
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {techStack
                      .filter(tech => tech.category === category)
                      .map((tech, index) => (
                        <motion.div
                          key={tech.name}
                          initial={{ opacity: 0, scale: 0.8 }}
                          whileInView={{ opacity: 1, scale: 1 }}
                          viewport={{ once: true }}
                          transition={{ duration: 0.5, delay: index * 0.1 }}
                          className="glass px-4 py-2 rounded-lg hover:border-[#0AE3FF] transition-all duration-300 cursor-default"
                        >
                          {tech.name}
                        </motion.div>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
