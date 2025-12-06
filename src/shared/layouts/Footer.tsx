import { Mail, Phone, MapPin, Github, Linkedin, Twitter } from "lucide-react";
import "./Footer.scss";

export const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="footer__container">
        <div className="footer__grid">
          <div className="footer__brand">
            <div className="footer__logo">
              <span className="footer__logo-highlight">TECH</span>
              <span>CORP</span>
            </div>
            <p className="footer__description">
              Мы создаём цифровые продукты, которые делают бизнес управляемым, эффективным и современным.
            </p>
            <div className="footer__social">
              <SocialLink icon={Github} href="#" />
              <SocialLink icon={Linkedin} href="#" />
              <SocialLink icon={Twitter} href="#" />
            </div>
          </div>

          <div className="footer__column">
            <h4 className="footer__title">Услуги</h4>
            <ul className="footer__links">
              <FooterLink label="Разработка ПО" href="#" />
              <FooterLink label="Аутсорс/Аутстафф" href="#" />
              <FooterLink label="UI/UX дизайн" href="#" />
              <FooterLink label="AI/ML интеграции" href="#" />
              <FooterLink label="Консалтинг" href="#" />
            </ul>
          </div>

          <div className="footer__column">
            <h4 className="footer__title">Решения</h4>
            <ul className="footer__links">
              <FooterLink label="eCommerce" href="#" />
              <FooterLink label="FinTech" href="#" />
              <FooterLink label="MedTech" href="#" />
              <FooterLink label="ERP/CRM" href="#" />
              <FooterLink label="AI-решения" href="#" />
            </ul>
          </div>

          <div className="footer__column">
            <h4 className="footer__title">Контакты</h4>
            <ul className="footer__contacts">
              <li className="footer__contact">
                <Mail className="footer__contact-icon" />
                <a href="mailto:hello@techcompany.ru" className="footer__contact-link">
                  hello@techcompany.ru
                </a>
              </li>
              <li className="footer__contact">
                <Phone className="footer__contact-icon" />
                <a href="tel:+74951234567" className="footer__contact-link">
                  +7 (495) 123-45-67
                </a>
              </li>
              <li className="footer__contact footer__contact--address">
                <MapPin className="footer__contact-icon" />
                <span>Москва, ул. Технологическая, 1</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="footer__bottom">
          <p className="footer__copyright">© {currentYear} TECHCORP. Все права защищены.</p>
          <div className="footer__legal">
            <a href="#" className="footer__legal-link">
              Политика конфиденциальности
            </a>
            <a href="#" className="footer__legal-link">
              Условия использования
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

const SocialLink = ({ icon: Icon, href }: { icon: any; href: string }) => {
  return (
    <a href={href} className="footer__social-link">
      <Icon />
    </a>
  );
};
