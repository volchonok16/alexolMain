import Carousel from "react-multi-carousel";
import "react-multi-carousel/lib/styles.css";

import incubatorImg from "../assets/partners/it-inclubator.png";
import incubatorLogo from "../assets/partners/it-inclubator-logo.png";
import skyproImg from "../assets/partners/sky-pro.png";
import skyproLogo from "../assets/partners/sky-pro-logo.png";
import pranaImg from "../assets/partners/prana.png";
import pranaLogo from "../assets/partners/prana-logo.png";
import bg from "../assets/partners/bg.png";
import { DividerSolid } from "@/widgets/DividerSolid";

import VkLogo from "../assets/vk.svg";
import WhatsAppLogo from "../assets/whatsapp.svg";
import InstLogo from "../assets/inst.svg";
import TgLogo from "../assets/tg.svg";
import { Link } from "react-router-dom";

export const Partners = () => {
  return (
    <section className="mt-10">
      <p className="text-center mb-10 text-[36px]">Наши партнеры</p>
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
        className="drop-shadow-md"
      >
        {partnersInfo.map((el) => {
          return (
            <div
              className="flex justify-between text-right px-20 py-5 rounded-2xl"
              style={{ background: `url(${bg})`, backgroundSize: "100% 100%" }}
            >
              <div>
                <img className="w-[600px]" src={el.img} />
              </div>
              <div className="flex flex-col items-end w-[450px]">
                <img src={el.logo} />
                <DividerSolid className="my-10" />
                <p className="text-[24px]">{el.title}</p>
                <p className="mt-5">{el.desc}</p>
                <p className="text-[24px] cursor-pointer mt-5">{el.mail}</p>
                <div className="flex justify-end gap-4 mt-5">
                  <Link to={el.socials.vk} target="_blank">
                    <VkLogo className="cursor-pointer" />
                  </Link>
                  <Link to={el.socials.wa} target="_blank">
                    <WhatsAppLogo className="cursor-pointer" />
                  </Link>
                  <Link to={el.socials.inst} target="_blank">
                    <InstLogo className="cursor-pointer" />
                  </Link>
                  <Link to={el.socials.tg} target="_blank">
                    <TgLogo className="cursor-pointer" />
                  </Link>
                </div>
                <Link to={el.site} target="_blank">
                  <button
                    className="py-2 px-4 bg-gradient-to-r rounded-lg text-white mt-4"
                    style={{
                      background: "linear-gradient(0.25turn, #97794D, #E3CB8F)",
                    }}
                  >
                    Узнать подробнее
                  </button>
                </Link>
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
    logo: incubatorLogo,
    title: "Образовательная экосистема для развития карьеры в IT",
    desc: "Обучение, тренажеры, поддержка 1 на 1 и дружное комьюнити созданное разработчиками для разработчиков",
    mail: "support+229319@it-incubator.eu",
    site: "https://it-incubator.io/",
    socials: {
      vk: "https://vk.com/it.incubator?roistat_visit=244395",
      wa: "https://api.whatsapp.com/send/?phone=375445657493&text&type=phone_number&app_absent=0&roistat_visit=245016",
      inst: "https://www.instagram.com/it.incubator?roistat_visit=245016",
      tg: "https://t.me/ITIncubatorSandbox?roistat_visit=245016",
      viber: "viber://chat?number=%2B375291341548",
    },
  },
  {
    id: 2,
    img: skyproImg,
    logo: skyproLogo,
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
    logo: pranaLogo,
    title: "Центр психологии PRANA",
    desc: "Семейная, кризисная психология, психосоматика, псхоанализ, коучинг",
    mail: "prana.vedic.center@gmail.com",
    site: "https://prana-psychology.ru/",
    socials: {
      vk: "https://vk.com/prana_vedic_center",
      wa: "https://wa.me/79082227821",
      inst: "https://instagram.com/prana_vedic_centr?igshid=MzRlODBiNWFlZA==",
      tg: "https://tg.me",
    },
  },
];
