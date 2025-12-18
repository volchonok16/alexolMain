import { useState } from 'react';
import { Menu, X, Sun, Moon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ProjectModal } from '@/pages/HomePage/components/modals';
import { useTheme, useLanguage } from '@/shared/contexts';
import { useTranslation } from '@/shared/utils/translations';
import './Header.scss';

export const Header = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const { language, setLanguage } = useLanguage();
  const { t } = useTranslation();

  const toggleLanguage = () => {
    setLanguage(language === 'ru' ? 'en' : 'ru');
  };

  const navItems = [
    { label: t('header.nav.about'), href: '#about' },
    { label: t('header.nav.services'), href: '#services' },
    { label: t('header.nav.solutions'), href: '#portfolio' },
    { label: t('header.nav.cases'), href: '#cases' },
    { label: t('header.nav.news'), href: '#news' },
    { label: t('header.nav.contact'), href: '#contact' },
  ];

  return (
    <>
      <header className="header">
        <div className="header__container">
          <div className="header__logo">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 416 80" preserveAspectRatio="xMidYMid meet">
              <path
                className="alexol-accent"
                d="M40,0 L74.64,20 L74.64,60 L40,80 L5.36,60 L5.36,20 Z M40,15 L18.35,27.50 L18.35,52.50 L40,65 L61.65,52.50 L61.65,27.50 Z"
              />
              <circle className="alexol-primary" cx="40" cy="40" r="8" />
              <g transform="translate(100, 0)">
                <path
                  className="alexol-primary"
                  d="M40,0 L80,80 L66,80 L56,60 L24,60 L14,80 L0,80 L40,0 Z M40,24 L30,48 L50,48 Z"
                />
                <path className="alexol-primary" d="M90,0 L104,0 L104,80 L90,80 Z" />
                <path
                  className="alexol-primary"
                  d="M156,54 L128,54 C128.50,61 133,67 142,67 C148,67 153,64 155,59 L168,61 C165,70 155,79 142,79 C125,79 114,66 114,54 C114,41 125,28 141,28 C158,28 168,41 168,54 L168,54 Z M155,46 C154,39 149,37 141,37 C133,37 129,40 128,46 L155,46 Z"
                />
                <path
                  className="alexol-primary"
                  d="M176,29 L192,29 L204,47 L216,29 L232,29 L212,54 L233,80 L217,80 L204,61 L191,80 L175,80 L196,54 Z"
                />
                <path
                  className="alexol-primary"
                  d="M266,28 C283,28 294,41 294,54 C294,67 283,80 266,80 C249,80 238,67 238,54 C238,41 249,28 266,28 Z M266,39 C257,39 252,45 252,54 C252,63 257,69 266,69 C275,69 280,63 280,54 C280,45 275,39 266,39 Z"
                />
                <path className="alexol-primary" d="M308,0 L322,0 L322,80 L308,80 Z" />
              </g>
            </svg>
          </div>

          <nav className="header__nav">
            {navItems.map(item => (
              <a key={item.label} href={item.href} className="header__link">
                {item.label}
              </a>
            ))}
          </nav>

          <div className="header__cta">
            <button onClick={toggleLanguage} className="header__lang-toggle">
              <span className="header__lang-flag">
                {language === 'ru' ? (
                  <svg viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg">
                    <path fill="#CE2028" d="M36 27a4 4 0 0 1-4 4H4a4 4 0 0 1-4-4v-4h36v4z" />
                    <path fill="#22408C" d="M0 13h36v10H0z" />
                    <path fill="#EEE" d="M32 5H4a4 4 0 0 0-4 4v4h36V9a4 4 0 0 0-4-4z" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg">
                    <path
                      fill="#00247D"
                      d="M0 9.059V13h5.628zM4.664 31H13v-5.837zM23 25.164V31h8.335zM0 23v3.941L5.63 23zM31.337 5H23v5.837zM36 26.942V23h-5.631zM36 13V9.059L30.371 13zM13 5H4.664L13 10.837z"
                    />
                    <path
                      fill="#CF1B2B"
                      d="M25.14 23l9.712 6.801a3.977 3.977 0 0 0 .99-1.749L28.627 23H25.14zM13 23h-2.141l-9.711 6.8c.521.53 1.189.909 1.938 1.085L13 23.943V23zm10-10h2.141l9.711-6.8a3.988 3.988 0 0 0-1.937-1.085L23 12.057V13zm-12.141 0L1.148 6.2a3.994 3.994 0 0 0-.991 1.749L7.372 13h3.487z"
                    />
                    <path
                      fill="#EEE"
                      d="M36 21H21v10h2v-5.836L31.335 31H32a3.99 3.99 0 0 0 2.852-1.199L25.14 23h3.487l7.215 5.052c.093-.337.158-.686.158-1.052v-.058L30.369 23H36v-2zM0 21v2h5.63L0 26.941V27c0 1.091.439 2.078 1.148 2.8l9.711-6.8H13v.943l-9.914 6.941c.294.07.598.116.914.116h.664L13 25.163V31h2V21H0zM36 9a3.983 3.983 0 0 0-1.148-2.8L25.141 13H23v-.943l9.915-6.942A4.001 4.001 0 0 0 32 5h-.663L23 10.837V5h-2v10h15v-2h-5.629L36 9.059V9zM13 5v5.837L4.664 5H4a3.985 3.985 0 0 0-2.852 1.2l9.711 6.8H7.372L.157 7.949A3.968 3.968 0 0 0 0 9v.059L5.628 13H0v2h15V5h-2z"
                    />
                    <path fill="#CF1B2B" d="M21 15V5h-6v10H0v6h15v10h6V21h15v-6z" />
                  </svg>
                )}
              </span>
              <span className="header__lang-code">{language.toUpperCase()}</span>
            </button>
            <button onClick={toggleTheme} className="header__theme-toggle">
              {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <button onClick={() => setIsModalOpen(true)} className="header__button">
              {t('header.discussProject')}
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
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="header__mobile-menu"
            >
              <nav className="header__mobile-nav">
                {navItems.map(item => (
                  <a key={item.label} href={item.href} onClick={() => setIsOpen(false)} className="header__mobile-link">
                    {item.label}
                  </a>
                ))}
                
                <div className="header__mobile-controls">
                  <button onClick={toggleLanguage} className="header__lang-toggle">
                    <span className="header__lang-flag">
                      {language === 'ru' ? (
                        <svg viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg">
                          <path fill="#CE2028" d="M36 27a4 4 0 0 1-4 4H4a4 4 0 0 1-4-4v-4h36v4z" />
                          <path fill="#22408C" d="M0 13h36v10H0z" />
                          <path fill="#EEE" d="M32 5H4a4 4 0 0 0-4 4v4h36V9a4 4 0 0 0-4-4z" />
                        </svg>
                      ) : (
                        <svg viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg">
                          <path
                            fill="#00247D"
                            d="M0 9.059V13h5.628zM4.664 31H13v-5.837zM23 25.164V31h8.335zM0 23v3.941L5.63 23zM31.337 5H23v5.837zM36 26.942V23h-5.631zM36 13V9.059L30.371 13zM13 5H4.664L13 10.837z"
                          />
                          <path
                            fill="#CF1B2B"
                            d="M25.14 23l9.712 6.801a3.977 3.977 0 0 0 .99-1.749L28.627 23H25.14zM13 23h-2.141l-9.711 6.8c.521.53 1.189.909 1.938 1.085L13 23.943V23zm10-10h2.141l9.711-6.8a3.988 3.988 0 0 0-1.937-1.085L23 12.057V13zm-12.141 0L1.148 6.2a3.994 3.994 0 0 0-.991 1.749L7.372 13h3.487z"
                          />
                          <path
                            fill="#EEE"
                            d="M36 21H21v10h2v-5.836L31.335 31H32a3.99 3.99 0 0 0 2.852-1.199L25.14 23h3.487l7.215 5.052c.093-.337.158-.686.158-1.052v-.058L30.369 23H36v-2zM0 21v2h5.63L0 26.941V27c0 1.091.439 2.078 1.148 2.8l9.711-6.8H13v.943l-9.914 6.941c.294.07.598.116.914.116h.664L13 25.163V31h2V21H0zM36 9a3.983 3.983 0 0 0-1.148-2.8L25.141 13H23v-.943l9.915-6.942A4.001 4.001 0 0 0 32 5h-.663L23 10.837V5h-2v10h15v-2h-5.629L36 9.059V9zM13 5v5.837L4.664 5H4a3.985 3.985 0 0 0-2.852 1.2l9.711 6.8H7.372L.157 7.949A3.968 3.968 0 0 0 0 9v.059L5.628 13H0v2h15V5h-2z"
                          />
                          <path fill="#CF1B2B" d="M21 15V5h-6v10H0v6h15v10h6V21h15v-6z" />
                        </svg>
                      )}
                    </span>
                    <span className="header__lang-code">{language.toUpperCase()}</span>
                  </button>
                  
                  <button onClick={toggleTheme} className="header__theme-toggle">
                    {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
                  </button>
                </div>
                
                <button onClick={() => setIsModalOpen(true)} className="header__mobile-button">
                  {t('header.discussProject')}
                </button>
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <ProjectModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
};
