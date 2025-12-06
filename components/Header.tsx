import { useState } from "react";
import { Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export function Header() {
  const [isOpen, setIsOpen] = useState(false);

  const navItems = [
    { label: "О нас", href: "#about" },
    { label: "Услуги", href: "#services" },
    { label: "Решения", href: "#portfolio" },
    { label: "Кейсы", href: "#cases" },
    { label: "Новости", href: "#news" },
    { label: "Контакты", href: "#contact" },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 px-6 py-4 backdrop-blur-md bg-[#0A0C10]/80 border-b border-[#0AE3FF]/10">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Лого */}
        <div className="text-2xl tracking-tight">
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#0AE3FF] to-[#7BF7FF]">
            TECH
          </span>
          <span>CORP</span>
        </div>

        {/* Десктоп навигация */}
        <nav className="hidden lg:flex items-center gap-8">
          {navItems.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className="text-[#A8B0C0] hover:text-[#0AE3FF] transition-colors"
            >
              {item.label}
            </a>
          ))}
        </nav>

        {/* CTA кнопка */}
        <div className="hidden lg:block">
          <button className="px-6 py-2 bg-gradient-to-r from-[#0AE3FF] to-[#1B91F7] rounded-lg hover:shadow-[0_0_20px_rgba(10,227,255,0.4)] transition-all duration-300">
            Обсудить проект
          </button>
        </div>

        {/* Мобильная кнопка меню */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="lg:hidden w-10 h-10 flex items-center justify-center glass rounded-lg"
        >
          {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Мобильное меню */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="lg:hidden overflow-hidden"
          >
            <nav className="pt-6 pb-4 flex flex-col gap-4">
              {navItems.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className="text-[#A8B0C0] hover:text-[#0AE3FF] transition-colors py-2"
                >
                  {item.label}
                </a>
              ))}
              <button className="mt-4 px-6 py-3 bg-gradient-to-r from-[#0AE3FF] to-[#1B91F7] rounded-lg">
                Обсудить проект
              </button>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
