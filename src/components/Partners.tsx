import Carousel from "react-multi-carousel";
import "react-multi-carousel/lib/styles.css";

import incubatorImg from "../assets/partners/it-inclubator.png";
import incubatorLogoLight from "../assets/partners/it-inclubator-logo-lignt.png";
import incubatorLogoDark from "../assets/partners/it-inclubator-logo-dark.png";
import skyproImg from "../assets/partners/sky-pro.png";
import skyProLogoLight from "../assets/partners/sky-pro-logo-light.png";
import skyProLogoDark from "../assets/partners/sky-pro-logo-dark.png";
import pranaImg from "../assets/partners/prana.png";
import pranaLogoLight from "../assets/partners/prana-logo-light.png";
import pranaLogoDark from "../assets/partners/prana-logo-dark.png";
import bgLight from "../assets/partners/bg-light.png";
import bgDark from "../assets/partners/bg-dark.png";
import { DividerSolid } from "@/widgets/DividerSolid";

import VkLogo from "../assets/vk.svg";
import WhatsAppLogo from "../assets/whatsapp.svg";
import ViberLogo from "../assets/viber.svg";
import InstLogo from "../assets/inst.svg";
import TgLogo from "../assets/tg.svg";
import { Link } from "react-router-dom";

interface IProps {
  theme: string;
}

export const Partners: React.FC<IProps> = ({ theme }) => {
  return (
    <section id="Сотрудничество" className="mt-5 lg:mt-10">
      <Carousel
        responsive={{
          desktop: {
            breakpoint: {
              max: 3000,
              min: 1024,
            },
            items: 1,
            partialVisibilityGutter: 40,
          },
          mobile: {
            breakpoint: {
              max: 464,
              min: 0,
            },
            items: 1,
            partialVisibilityGutter: 30,
          },
          tablet: {
            breakpoint: {
              max: 1024,
              min: 464,
            },
            items: 2,
            partialVisibilityGutter: 30,
          },
        }}
        rewind={false}
        rtl={false}
        arrows={false}
        showDots={true}
        slidesToSlide={1}
        swipeable
        autoPlay={true}
        autoPlaySpeed={10000}
        infinite={true}
        customTransition="transform 0.5s ease-in-out"
        transitionDuration={500}
        className="drop-shadow-md "
      >
        {partnersInfo.map((el) => {
          const logoForTheme =
            theme === "dark-theme" ? el.logoDark : el.logoLight;

          const bg = theme === "dark-theme" ? bgDark : bgLight;

          return (
            <div
              key={el.id}
              className="flex justify-between text-center lg:text-right px-5 lg:px-10 py-2 lg:py-5 h-[560px] items-center lg:items-start"
              style={{
                background: `url(${bg}) no-repeat center / cover`,
                borderRadius: "48px",
                backgroundBlendMode: "overlay",
                backgroundSize: "100% 100%",
              }}
            >
              <div className="hidden lg:block">
                <img className="w-[600px]" src={el.img} />
              </div>
              <div className="flex flex-col items-center lg:items-end w-[500px]">
                <div className="flex flex-col items-center lg:items-end">
                  <p className="text-[24px] lg:text-[48px] leading-normal">
                    Наши партнеры
                  </p>
                  <DividerSolid className="w-[130px]" />
                </div>
                <img
                  src={logoForTheme} className="w-[50%] lg:w-[80%] h-auto"
                />
                <p className="text-[16px] lg:text-[26px] font-medium">
                  {el.title}
                </p>
                <div className="block lg:hidden">
                  <img className="w-[300px] lg:w-[600px] h-auto" src={el.img} />
                </div>

                <p className="text-[12px] lg:text-[24px] font-normal mt-2 lg:mt-5">
                  {el.desc}
                </p>
                <p className="text-[12px] lg:text-[24px] cursor-pointer mt-2 lg:mt-5">
                  {el.mail}
                </p>
                <div className="flex flex-col lg:flex-row lg:justify-end items-center gap-4 mt-2 lg:mt-5">
                  <Link to={el.site} target="_blank">
                    <button
                      className="py-2 px-4 bg-gradient-to-r rounded-lg text-white"
                      style={{
                        background:
                          "linear-gradient(0.25turn, #97794D, #E3CB8F)",
                      }}
                    >
                      Узнать подробнее
                    </button>
                  </Link>
                  <div className="flex gap-4"> 
                    <Link to={el.socials.vk} target="_blank">
                      <VkLogo className="cursor-pointer" />
                    </Link>
                    {el.socials.wa && (
                      <Link to={el.socials.wa} target="_blank">
                        <WhatsAppLogo className="cursor-pointer" />
                      </Link>
                    )}
                    {el.socials.viber && (
                      <Link to={el.socials.viber} target="_blank">
                        <ViberLogo className="cursor-pointer" />
                      </Link>
                    )}
                    <Link to={el.socials.inst} target="_blank">
                      <InstLogo className="cursor-pointer" />
                    </Link>
                    <Link to={el.socials.tg} target="_blank">
                      <TgLogo className="cursor-pointer" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </Carousel>
    </section>
  );
};

const partnersInfo = [
  {
    id: 1,
    img: incubatorImg,
    logoLight: incubatorLogoLight,
    logoDark: incubatorLogoDark,
    title: "Образовательная экосистема для развития карьеры в IT",
    desc: "Обучение, тренажеры, поддержка 1 на 1 и дружное комьюнити созданное разработчиками для разработчиков",
    mail: "support+229319@it-incubator.eu",
    site: "https://it-incubator.io/",
    socials: {
      vk: "https://vk.com/it.incubator?roistat_visit=244395",
      wa: "https://api.whatsapp.com/send/?phone=375445657493&text&type=phone_number&app_absent=0&roistat_visit=245016",
      viber: "viber://chat?number=%2B375291341548",
      inst: "https://www.instagram.com/it.incubator?roistat_visit=245016",
      tg: "https://t.me/ITIncubatorSandbox?roistat_visit=245016",
    },
  },
  {
    id: 2,
    img: skyproImg,
    logoLight: skyProLogoLight,
    logoDark: skyProLogoDark,
    title: "Обучение IT-профессиям с нуля с гарантией новой работы",
    desc: "Цель Skypro — не просто продавать курсы людям, а обучать и устраивать на реальную работу",
    mail: "skypro@skyeng.ru",
    site: "https://sky.pro/",
    socials: {
      vk: "https://vk.com/skypro.university?roistat_visit=3751984",
      wa: "https://wa.me/74951378599",
      inst: "https://instagram.com",
      tg: "https://t.me/skyprouniversity?roistat_visit=3751984",
    },
  },
  {
    id: 2,
    img: pranaImg,
    logoLight: pranaLogoLight,
    logoDark: pranaLogoDark,
    title: "Центр психологии PRANA",
    desc: "Семейная, кризисная психология, психосоматика, психоанализ, коучинг. Быстрая помощь в решении проблемных ситуаций.Различные виды консультаций.",
    mail: "prana.vedic.center@gmail.com",
    site: "https://prana-psychology.ru/",
    socials: {
      vk: "https://vk.com/prana_vedic_center",
      inst: "https://instagram.com/prana_vedic_centr?igshid=MzRlODBiNWFlZA==",
      tg: "https://tg.me",
    },
  },
];
