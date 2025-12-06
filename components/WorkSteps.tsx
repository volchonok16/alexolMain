import { motion } from "motion/react";
import { MessageSquare, FileSearch, FileSignature, FileText, Palette, Code, Bug, Rocket, Wrench } from "lucide-react";

export function WorkSteps() {
  const steps = [
    { icon: MessageSquare, title: "Вводная консультация", description: "Обсуждаем задачи и цели проекта" },
    { icon: FileSearch, title: "Предварительная оценка", description: "Анализируем объём и формируем смету" },
    { icon: FileSignature, title: "Подписание договора", description: "Фиксируем условия и гарантии" },
    { icon: FileText, title: "Аналитика и ТЗ", description: "Детализируем требования и сценарии" },
    { icon: Palette, title: "UI/UX дизайн", description: "Проектируем интерфейсы и прототипы" },
    { icon: Code, title: "Разработка", description: "Пишем код с соблюдением стандартов" },
    { icon: Bug, title: "Тестирование", description: "Проверяем функционал и производительность" },
    { icon: Rocket, title: "Запуск", description: "Разворачиваем и передаём в продакшн" },
    { icon: Wrench, title: "Поддержка", description: "Сопровождаем и развиваем систему" },
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
          <h2 className="mb-4">Этапы работы</h2>
          <p className="text-[#A8B0C0] text-lg">
            Прозрачный процесс от идеи до запуска
          </p>
        </motion.div>

        {/* Мобильная версия - карточки */}
        <div className="grid md:grid-cols-3 gap-6 lg:hidden">
          {steps.map((step, index) => (
            <StepCard key={index} step={step} index={index} />
          ))}
        </div>

        {/* Десктоп версия - линейная */}
        <div className="hidden lg:block relative">
          {/* Центральная линия */}
          <div className="absolute left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-[#0AE3FF] to-transparent" />
          
          <div className="space-y-16">
            {steps.map((step, index) => (
              <StepTimeline key={index} step={step} index={index} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function StepCard({ step, index }: { step: any; index: number }) {
  const Icon = step.icon;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, delay: index * 0.1 }}
      className="glass rounded-xl p-6 hover:border-[#0AE3FF] transition-all duration-300"
    >
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-[#0AE3FF]/20 to-[#1B91F7]/20 flex items-center justify-center flex-shrink-0">
          <Icon className="w-6 h-6 text-[#0AE3FF]" />
        </div>
        <div className="flex-1">
          <div className="text-[#0AE3FF] text-sm mb-1">Шаг {index + 1}</div>
          <h4 className="mb-2">{step.title}</h4>
          <p className="text-[#A8B0C0] text-sm">{step.description}</p>
        </div>
      </div>
    </motion.div>
  );
}

function StepTimeline({ step, index }: { step: any; index: number }) {
  const Icon = step.icon;
  const isEven = index % 2 === 0;
  
  return (
    <motion.div
      initial={{ opacity: 0, x: isEven ? -50 : 50 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.8 }}
      className={`relative flex items-center ${isEven ? "justify-end" : "justify-start"}`}
    >
      <div className={`w-[45%] ${isEven ? "pr-12 text-right" : "pl-12"}`}>
        <div className="glass rounded-xl p-6 hover:border-[#0AE3FF] transition-all duration-300">
          <div className="text-[#0AE3FF] text-sm mb-2">Шаг {index + 1}</div>
          <h4 className="mb-2">{step.title}</h4>
          <p className="text-[#A8B0C0]">{step.description}</p>
        </div>
      </div>
      
      {/* Центральный узел */}
      <div className="absolute left-1/2 -translate-x-1/2 w-14 h-14 rounded-full bg-gradient-to-br from-[#0AE3FF] to-[#1B91F7] flex items-center justify-center shadow-[0_0_30px_rgba(10,227,255,0.5)]">
        <Icon className="w-7 h-7 text-white" />
      </div>
    </motion.div>
  );
}
