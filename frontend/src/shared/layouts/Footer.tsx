import { useState } from 'react';
import { Mail, Phone } from 'lucide-react';
import { OfferModal, BrandLogo, WhatsAppIcon, TelegramIcon } from '../ui';
import './Footer.scss';
import { useLanguage } from '../contexts';
import { marketingCopy } from '../utils/marketingCopy';

export const Footer = () => {
  const { language } = useLanguage();
  const copy = marketingCopy[language].footer;
  const currentYear = new Date().getFullYear();
  const [isOfferModalOpen, setIsOfferModalOpen] = useState(false);

  return (
    <footer className="footer">
      <div className="footer__container">
        <div className="footer__invite">
          <div>
            <span className="footer__eyebrow">ALEXOL / BUSINESS TECHNOLOGY</span>
            <h2>{copy.invite}</h2>
          </div>
          <a href="/#contact" className="footer__invite-action">
            {copy.inviteAction}
            <span aria-hidden="true">↗</span>
          </a>
        </div>
        <div className="footer__grid">
          <div className="footer__brand">
            <div className="footer__logo">
              <BrandLogo />
            </div>
            <p className="footer__description">{copy.description}</p>
            <p className="footer__base">{copy.base}</p>
            <div className="footer__social">
              <a
                href="https://wa.me/79095175557"
                className="footer__social-link"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="WhatsApp"
              >
                <WhatsAppIcon size={40} />
              </a>
              <a
                href="https://t.me/+Pa6BxvSbBUI0NjIy"
                className="footer__social-link"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Telegram"
              >
                <TelegramIcon size={40} />
              </a>
            </div>
          </div>

          <div className="footer__column">
            <h4 className="footer__title">{copy.services}</h4>
            <ul className="footer__links">
              <FooterLink label={copy.links[0]} href="/speeches" />
              <FooterLink label={copy.links[1]} href="/#services" />
              <FooterLink label={copy.links[2]} href="/#services" />
              <FooterLink label={copy.links[3]} href="/#services" />
            </ul>
          </div>

          <div className="footer__column">
            <h4 className="footer__title">{copy.solutions}</h4>
            <ul className="footer__links">
              {copy.softwareLinks.map(label => (
                <FooterLink key={label} label={label} href="/#development" />
              ))}
            </ul>
          </div>

          <div className="footer__column">
            <h4 className="footer__title">{copy.contacts}</h4>
            <ul className="footer__contacts">
              <li className="footer__contact">
                <div className="footer__contact-icon" aria-hidden>
                  <Mail size={22} strokeWidth={1.75} />
                </div>
                <a href="mailto:info@alexol.io" className="footer__contact-link">
                  info@alexol.io
                </a>
              </li>
              <li className="footer__contact">
                <div className="footer__contact-icon" aria-hidden>
                  <Phone size={22} strokeWidth={1.75} />
                </div>
                <a href="tel:+79095175557" className="footer__contact-link">
                  +7 (909) 517-55-57
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="footer__bottom">
          <p className="footer__copyright">
            © {currentYear} Alexol. {copy.copyright}
          </p>
          <div className="footer__legal">
            <button onClick={() => setIsOfferModalOpen(true)} className="footer__legal-link">
              {copy.offer}
            </button>
          </div>
        </div>
      </div>

      <OfferModal isOpen={isOfferModalOpen} onClose={() => setIsOfferModalOpen(false)} />
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
