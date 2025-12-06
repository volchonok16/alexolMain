import { useState } from "react";
import { Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import "./Header.scss";

export const Header = () => {
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
    <header className="header">
      <div className="header__container">
        <div className="header__logo">
          <span className="header__logo-highlight">TECH</span>
          <span>CORP</span>
        </div>

        <nav className="header__nav">
          {navItems.map((item) => (
            <a key={item.label} href={item.href} className="header__link">
              {item.label}
            </a>
          ))}
        </nav>

        <div className="header__cta">
          <button className="header__button">
            Обсудить проект
          </button>
        </div>

        <button onClick={() => setIsOpen(!isOpen)} className="header__menu-button">
          {isOpen ? <X /> : <Menu />}
        </button>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="header__mobile-menu"
          >
            <nav className="header__mobile-nav">
              {navItems.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className="header__mobile-link"
                >
                  {item.label}
                </a>
              ))}
              <button className="header__mobile-button">
                Обсудить проект
              </button>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};
