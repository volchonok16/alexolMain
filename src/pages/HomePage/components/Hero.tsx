import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

export const Hero = () => {
  return (
    <section className="hero">
      <div className="hero__background">
        <div className="hero__gradient hero__gradient--primary" />
        <div className="hero__gradient hero__gradient--secondary" />
        <div className="hero__grid" />
      </div>

      <div className="hero__shape">
        <InteractiveShape />
      </div>

      <div className="hero__content">
        <div className="hero__inner">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className="hero__title">
              Будущее вашего бизнеса начинается с{" "}
              <span className="hero__highlight">
                правильных технологий
              </span>
            </h1>
          </motion.div>

          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="hero__description"
          >
            Мы разрабатываем ПО под ключ, усиливаем команды и создаём архитектуру, готовую к масштабированию.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="hero__actions"
          >
            <button className="hero__button hero__button--primary">
              Обсудить проект
              <ArrowRight />
            </button>
            
            <button className="hero__button hero__button--secondary">
              Посмотреть кейсы
            </button>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

const InteractiveShape = () => {
  return (
    <div className="relative w-full h-full flex items-center justify-center">
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
        <div className="absolute inset-0 border-2 border-[#0AE3FF]/30 rounded-full" style={{ transform: "rotateX(60deg)" }} />
        <div className="absolute inset-8 border-2 border-[#1B91F7]/30 rounded-full" style={{ transform: "rotateY(60deg)" }} />
        <div className="absolute inset-16 border-2 border-[#7BF7FF]/30 rounded-full" style={{ transform: "rotateZ(60deg)" }} />
        
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
