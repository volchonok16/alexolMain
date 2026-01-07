import { Mail, Phone, Clock, Github, Linkedin, Twitter, LucideIcon } from 'lucide-react';
import './Footer.scss';
import { useTranslation } from '../utils/translations';

export const Footer = () => {
  const { t } = useTranslation();
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="footer__container">
        <div className="footer__grid">
          <div className="footer__brand">
            <div className="footer__logo">
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
            <p className="footer__description">{t('footer.description')}</p>
            <div className="footer__social">
              <SocialLink icon={Github} href="#" />
              <SocialLink icon={Linkedin} href="#" />
              <SocialLink icon={Twitter} href="#" />
            </div>
          </div>

          <div className="footer__column">
            <h4 className="footer__title">{t('footer.services')}</h4>
            <ul className="footer__links">
              <FooterLink label={t('footer.links.development')} href="#" />
              <FooterLink label={t('footer.links.outsourcing')} href="#" />
              <FooterLink label={t('footer.links.design')} href="#" />
              <FooterLink label={t('footer.links.ai')} href="#" />
              <FooterLink label={t('footer.links.consulting')} href="#" />
            </ul>
          </div>

          <div className="footer__column">
            <h4 className="footer__title">{t('footer.solutions')}</h4>
            <ul className="footer__links">
              <FooterLink label="eCommerce" href="#" />
              <FooterLink label="FinTech" href="#" />
              <FooterLink label="MedTech" href="#" />
              <FooterLink label="ERP/CRM" href="#" />
              <FooterLink label={t('footer.links.aiSolutions')} href="#" />
            </ul>
          </div>

          <div className="footer__column">
            <h4 className="footer__title">{t('footer.contacts')}</h4>
            <ul className="footer__contacts">
              <li className="footer__contact">
                <Mail className="footer__contact-icon" />
                <a href="mailto:support@alexol.io" className="footer__contact-link">
                  support@alexol.io
                </a>
              </li>
              <li className="footer__contact">
                <Phone className="footer__contact-icon" />
                <a href="tel:+79850901434" className="footer__contact-link">
                  +7 (985) 090-14-34
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="footer__bottom">
          <p className="footer__copyright">
            © {currentYear} Alexol. {t('footer.copyright')}
          </p>
          <div className="footer__legal">
            <a href="#" className="footer__legal-link">
              {t('footer.privacy')}
            </a>
            <a href="#" className="footer__legal-link">
              {t('footer.terms')}
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

const FooterLink = ({ label, href }: { label: string; href: string }) => {
  return (
    <li>
      <a href={href} className="footer__link">
        {label}
      </a>
    </li>
  );
};

const SocialLink = ({ icon: Icon, href }: { icon: LucideIcon; href: string }) => {
  return (
    <a href={href} className="footer__social-link">
      <Icon />
    </a>
  );
};
