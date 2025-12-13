import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { useState, useCallback, useRef, useMemo } from "react";
import { TechModule } from "./TechModule";
import { InteractiveGrid } from "./InteractiveGrid";
import { useTypewriter } from "@/shared/hooks/useTypewriter";

interface Module {
  id: string;
  name: string;
  icon: string;
  x: number;
  y: number;
  connections: string[];
  title: string;
  description: string;
  cta: string;
}

const modules: Module[] = [
  {
    id: "ai",
    name: "AI",
    icon: "🤖",
    x: 20,
    y: 30,
    connections: ["python", "cloud", "data"],
    title: "AI & Data Science",
    description: "Превращаем данные в ваше преимущество",
    cta: "Узнать о наших AI-решениях",
  },
  {
    id: "python",
    name: "Python",
    icon: "🐍",
    x: 70,
    y: 20,
    connections: ["ai", "data", "web"],
    title: "Python Development",
    description: "Мощные backend-решения на Python",
    cta: "Обсудить Python-проект",
  },
  {
    id: "cloud",
    name: "Cloud",
    icon: "☁️",
    x: 80,
    y: 60,
    connections: ["ai", "security", "mobile"],
    title: "Cloud Infrastructure",
    description: "Масштабируемая облачная архитектура",
    cta: "Перейти в облако",
  },
  {
    id: "mobile",
    name: "Mobile",
    icon: "📱",
    x: 15,
    y: 70,
    connections: ["web", "cloud"],
    title: "Mobile Development",
    description: "Нативные и кроссплатформенные приложения",
    cta: "Создать мобильное приложение",
  },
  {
    id: "web",
    name: "Web",
    icon: "🌐",
    x: 85,
    y: 40,
    connections: ["python", "mobile", "security"],
    title: "Web Development",
    description: "Современные веб-приложения и сервисы",
    cta: "Разработать веб-решение",
  },
  {
    id: "security",
    name: "Security",
    icon: "🔒",
    x: 40,
    y: 80,
    connections: ["cloud", "web"],
    title: "Cybersecurity",
    description: "Защита данных и инфраструктуры",
    cta: "Обеспечить безопасность",
  },
  {
    id: "data",
    name: "Data",
    icon: "📊",
    x: 60,
    y: 35,
    connections: ["ai", "python"],
    title: "Data Analytics",
    description: "Аналитика и визуализация данных",
    cta: "Анализировать данные",
  },
];

export const Hero = () => {
  const [hoveredModule, setHoveredModule] = useState<string | null>(null);
  const [activeModule, setActiveModule] = useState<Module | null>(null);
  const [emailInput, setEmailInput] = useState("");
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const lastUpdateRef = useRef(0);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLElement>) => {
    const now = Date.now();
    if (now - lastUpdateRef.current < 16) return;

    lastUpdateRef.current = now;
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  }, []);

  const defaultTitle = "Создаем цифровые решения будущего";
  const defaultDescription = "Мы разрабатываем ПО под ключ, усиливаем команды и создаём архитектуру, готовую к масштабированию";
  const defaultCta = "Обсудить проект";

  const currentTitleText = useMemo(() => {
    if (activeModule) {
      return `${activeModule.name} → ${activeModule.description}`;
    }
    return defaultTitle;
  }, [activeModule]);

  const displayTitle = useTypewriter(currentTitleText, 30);
  const currentCta = activeModule?.cta || defaultCta;

  const handleModuleClick = (module: Module) => {
    setActiveModule(activeModule?.id === module.id ? null : module);
  };

  const getConnectedModules = (moduleId: string) => {
    const module = modules.find((m) => m.id === moduleId);
    return module?.connections || [];
  };

  const codeLines = Math.min(Math.floor(emailInput.length / 3), 10);

  return (
    <section className="hero" onMouseMove={handleMouseMove}>
      <div className="hero__background">
        <InteractiveGrid mousePos={mousePos} />
        <div className="hero__gradient hero__gradient--primary" />
        <div className="hero__gradient hero__gradient--secondary" />

        {emailInput && (
          <div className="hero__code">
            {Array.from({ length: codeLines }).map((_, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 0.3, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className="hero__code-line"
              >
                {i === 0 && "def createSolutionFor(business):"}
                {i === 1 && "    analyze_requirements()"}
                {i === 2 && "    design_architecture()"}
                {i === 3 && "    implement_solution()"}
                {i > 3 && `    # Step ${i}...`}
              </motion.div>
            ))}
          </div>
        )}

        <svg className="hero__connections">
          {hoveredModule &&
            getConnectedModules(hoveredModule).map((connId) => {
              const from = modules.find((m) => m.id === hoveredModule);
              const to = modules.find((m) => m.id === connId);
              if (!from || !to) return null;

              return (
                <motion.line
                  key={`${hoveredModule}-${connId}`}
                  x1={`${from.x}%`}
                  y1={`${from.y}%`}
                  x2={`${to.x}%`}
                  y2={`${to.y}%`}
                  stroke="var(--color-primary)"
                  strokeWidth="2"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 0.6 }}
                  exit={{ pathLength: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                />
              );
            })}
        </svg>

        <div className="hero__modules">
          {modules.map((module) => (
            <TechModule
              key={module.id}
              module={module}
              isHovered={hoveredModule === module.id}
              isActive={activeModule?.id === module.id}
              isConnected={
                hoveredModule
                  ? getConnectedModules(hoveredModule).includes(module.id)
                  : false
              }
              onHover={setHoveredModule}
              onClick={handleModuleClick}
            />
          ))}
        </div>
      </div>

      <div className="hero__content">
        <div className="hero__inner">
          <h1 className="hero__title">
            {displayTitle}
            <span className="hero__cursor">|</span>
          </h1>

          {!activeModule && (
            <motion.p
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="hero__description"
            >
              {defaultDescription}
            </motion.p>
          )}

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="hero__actions"
          >
            <div className="hero__email-wrapper">
              <input
                type="email"
                placeholder="Ваш email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                className="hero__email-input"
              />
            </div>

            <button className="hero__button hero__button--primary">
              {currentCta}
              <ArrowRight />
            </button>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
