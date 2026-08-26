import { useState } from 'react';
import { OfferModal, BrandLogo } from '../ui';
import './Footer.scss';
import { useTranslation } from '../utils/translations';
import { Icon3D, type Icon3DType } from '@/shared/ui/Icon3D';

export const Footer = () => {
  const { t } = useTranslation();
  const currentYear = new Date().getFullYear();
  const [isOfferModalOpen, setIsOfferModalOpen] = useState(false);

  return (
    <footer className="footer">
      <div className="footer__container">
        <div className="footer__grid">
          <div className="footer__brand">
            <div className="footer__logo">
              <BrandLogo />
            </div>
            <p className="footer__description">{t('footer.description')}</p>
            <div className="footer__social">
              <SocialLink icon="chat" href="https://wa.me/79095175557" />
              <SocialLink icon="telegram" href="https://t.me/alexolcorp" />
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
                <div className="footer__contact-icon">
                  <Icon3D type="mail" spin={false} />
                </div>
                <a href="mailto:support@alexol.io" className="footer__contact-link">
                  support@alexol.io
                </a>
              </li>
              <li className="footer__contact">
                <div className="footer__contact-icon">
                  <Icon3D type="phone" spin={false} />
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
            © {currentYear} Alexol. {t('footer.copyright')}
          </p>
          <div className="footer__legal">
            <button onClick={() => setIsOfferModalOpen(true)} className="footer__legal-link">
              {t('footer.offer')}
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

const SocialLink = ({ icon, href }: { icon: Icon3DType; href: string }) => {
  return (
    <a href={href} className="footer__social-link" target="_blank" rel="noopener noreferrer">
      <Icon3D type={icon} spin={false} />
    </a>
  );
};
