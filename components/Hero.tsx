import { motion } from "motion/react";
import { ArrowRight } from "lucide-react";

export function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden px-6 py-20">
      {/* Анимированный фон */}
      <div className="absolute inset-0 z-0">
        {/* Градиентные круги */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#0AE3FF] opacity-20 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#1B91F7] opacity-20 blur-[120px] rounded-full animate-pulse delay-700" />
        
        {/* Цифровая сетка */}
        <div className="absolute inset-0 opacity-10">
          <div className="h-full w-full" style={{
            backgroundImage: 'linear-gradient(rgba(10, 227, 255, 0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(10, 227, 255, 0.2) 1px, transparent 1px)',
            backgroundSize: '60px 60px'
          }} />
        </div>
      </div>

      {/* 3D Абстрактная фигура */}
      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1/2 h-[600px] hidden lg:block">
        <InteractiveShape />
      </div>

      {/* Контент */}
      <div className="relative z-10 max-w-7xl mx-auto w-full">
        <div className="max-w-3xl">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className="mb-6">
              Будущее вашего бизнеса начинается с{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#0AE3FF] to-[#7BF7FF]">
                правильных технологий
              </span>
            </h1>
          </motion.div>

          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-xl text-[#A8B0C0] mb-10 max-w-2xl"
          >
            Мы разрабатываем ПО под ключ, усиливаем команды и создаём архитектуру, готовую к масштабированию.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="flex flex-col sm:flex-row gap-4"
          >
            <button className="group px-8 py-4 bg-gradient-to-r from-[#0AE3FF] to-[#1B91F7] rounded-lg hover:shadow-[0_0_30px_rgba(10,227,255,0.5)] transition-all duration-300 flex items-center justify-center gap-2">
              <span>Обсудить проект</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
            
            <button className="px-8 py-4 glass rounded-lg border border-[#0AE3FF]/30 hover:border-[#0AE3FF] hover:bg-[#0AE3FF]/10 transition-all duration-300">
              Посмотреть кейсы
            </button>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function InteractiveShape() {
  return (
    <div className="relative w-full h-full flex items-center justify-center">
      {/* Главный многогранник */}
      <motion.div
        className="relative w-96 h-96"
        animate={{
          rotateY: 360,
          rotateX: 15,
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "linear"
        }}
        style={{ transformStyle: "preserve-3d" }}
      >
        {/* Внешнее кольцо */}
        <div className="absolute inset-0 border-2 border-[#0AE3FF]/30 rounded-full" style={{ transform: "rotateX(60deg)" }} />
        <div className="absolute inset-8 border-2 border-[#1B91F7]/30 rounded-full" style={{ transform: "rotateY(60deg)" }} />
        <div className="absolute inset-16 border-2 border-[#7BF7FF]/30 rounded-full" style={{ transform: "rotateZ(60deg)" }} />
        
        {/* Центральная сфера */}
        <motion.div 
          className="absolute inset-0 m-auto w-32 h-32 bg-gradient-to-br from-[#0AE3FF] to-[#1B91F7] rounded-full blur-2xl opacity-40"
          animate={{
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        
        {/* Световые точки */}
        {[...Array(12)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 bg-[#0AE3FF] rounded-full"
            style={{
              left: `${50 + 40 * Math.cos(i * 30 * Math.PI / 180)}%`,
              top: `${50 + 40 * Math.sin(i * 30 * Math.PI / 180)}%`,
            }}
            animate={{
              opacity: [0.3, 1, 0.3],
              scale: [1, 1.5, 1],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              delay: i * 0.1,
              ease: "easeInOut"
            }}
          />
        ))}
      </motion.div>
    </div>
  );
}
