import { Mail, Phone, MapPin, Github, Linkedin, Twitter } from "lucide-react";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-[#0AE3FF]/10 bg-[#0C0F16]/50 px-6 py-16">
      <div className="max-w-7xl mx-auto">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
          {/* О компании */}
          <div>
            <div className="text-2xl mb-4 tracking-tight">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#0AE3FF] to-[#7BF7FF]">
                TECH
              </span>
              <span>CORP</span>
            </div>
            <p className="text-[#A8B0C0] mb-6">
              Мы создаём цифровые продукты, которые делают бизнес управляемым, эффективным и современным.
            </p>
            <div className="flex gap-4">
              <SocialLink icon={Github} href="#" />
              <SocialLink icon={Linkedin} href="#" />
              <SocialLink icon={Twitter} href="#" />
            </div>
          </div>

          {/* Услуги */}
          <div>
            <h4 className="mb-4">Услуги</h4>
            <ul className="space-y-3">
              <FooterLink label="Разработка ПО" href="#" />
              <FooterLink label="Аутсорс/Аутстафф" href="#" />
              <FooterLink label="UI/UX дизайн" href="#" />
              <FooterLink label="AI/ML интеграции" href="#" />
              <FooterLink label="Консалтинг" href="#" />
            </ul>
          </div>

          {/* Решения */}
          <div>
            <h4 className="mb-4">Решения</h4>
            <ul className="space-y-3">
              <FooterLink label="eCommerce" href="#" />
              <FooterLink label="FinTech" href="#" />
              <FooterLink label="MedTech" href="#" />
              <FooterLink label="ERP/CRM" href="#" />
              <FooterLink label="AI-решения" href="#" />
            </ul>
          </div>

          {/* Контакты */}
          <div>
            <h4 className="mb-4">Контакты</h4>
            <ul className="space-y-3">
              <li className="flex items-center gap-3 text-[#A8B0C0]">
                <Mail className="w-4 h-4 text-[#0AE3FF]" />
                <a href="mailto:hello@techcompany.ru" className="hover:text-[#0AE3FF] transition-colors">
                  hello@techcompany.ru
                </a>
              </li>
              <li className="flex items-center gap-3 text-[#A8B0C0]">
                <Phone className="w-4 h-4 text-[#0AE3FF]" />
                <a href="tel:+74951234567" className="hover:text-[#0AE3FF] transition-colors">
                  +7 (495) 123-45-67
                </a>
              </li>
              <li className="flex items-start gap-3 text-[#A8B0C0]">
                <MapPin className="w-4 h-4 text-[#0AE3FF] mt-1 flex-shrink-0" />
                <span>Москва, ул. Технологическая, 1</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Нижняя строка */}
        <div className="pt-8 border-t border-[#0AE3FF]/10 flex flex-col md:flex-row justify-between items-center gap-4 text-[#A8B0C0] text-sm">
          <p>© {currentYear} TECHCORP. Все права защищены.</p>
          <div className="flex gap-6">
            <a href="#" className="hover:text-[#0AE3FF] transition-colors">
              Политика конфиденциальности
            </a>
            <a href="#" className="hover:text-[#0AE3FF] transition-colors">
              Условия использования
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterLink({ label, href }: { label: string; href: string }) {
  return (
    <li>
      <a
        href={href}
        className="text-[#A8B0C0] hover:text-[#0AE3FF] transition-colors"
      >
        {label}
      </a>
    </li>
  );
}

function SocialLink({ icon: Icon, href }: { icon: any; href: string }) {
  return (
    <a
      href={href}
      className="w-10 h-10 rounded-lg glass flex items-center justify-center hover:border-[#0AE3FF] hover:bg-[#0AE3FF]/10 transition-all duration-300"
    >
      <Icon className="w-5 h-5" />
    </a>
  );
}
