import bgLight from "../assets/steps/steps-bg-light.png";
import bgDark from "../assets/steps/steps-bg-dark.png";

import smm from "../assets/steps/smm.png";
import media from "../assets/steps/media.png";
import partnership from "../assets/steps/partnership.png";
import landing from "../assets/steps/landing.png";
import web from "../assets/steps/web.png";
import brand from "../assets/steps/brand.png";

import ArrowSvg from "../assets/steps/arrow.svg";
import { DividerSolid } from "@/widgets/DividerSolid";
import { DividerDots } from "@/widgets/DividerDots";

interface IProps {
  theme: string;
}

export const Steps: React.FC<IProps> = ({ theme }) => {
  const bg = theme === "dark-theme" ? bgDark : bgLight;

  return (
    <>
      <div className="flex flex-col items-center mt-10 lg:mt-24">
        <DividerDots className="mb-5 lg:mb-10" />
        <p className="text-[24px] lg:text-[48px] lg:leading-normal">Наш путь</p>
        <DividerSolid className="w-[100px]" />
      </div>
      <section
        className="w-full h-[570px] lg:h-[920px] mt-5 lg:mt-12 py-5 grid grid-cols-[1fr_0.35fr_1fr] lg:grid-cols-[1fr_0.3fr_1fr_0.3fr_1fr] justify-items-center items-center"
        style={{
          background: `url(${bg})`,
        }}
      >
        <div className="flex flex-col items-center ">
          <img src={smm} alt="" className="w-[140px] lg:w-[331px] h-auto" />
          <p className="mt-4 text-[10px] lg:text-[20px] font-medium">
            Развитие SMM
          </p>
        </div>
        <ArrowSvg className="rotate-[-90deg] h-[40px] lg:h-[80px] " />
        <div className="flex flex-col items-center">
          <img src={media} alt="" className="w-[140px] lg:w-[331px] h-auto " />
          <p className="mt-4 text-[10px] lg:text-[20px] font-medium">
            Развитие медиа
          </p>
        </div>

        <ArrowSvg className="lg:rotate-[-90deg] h-[40px] lg:h-[80px] col-start-3 row-start-2 lg:col-auto lg:row-auto" />
        <div className="flex flex-col items-center col-start-3 row-start-3 lg:col-auto lg:row-auto">
          <img
            src={partnership}
            alt=""
            className="w-[140px] lg:w-[331px] h-auto"
          />
          <p className="mt-4 text-[10px] lg:text-[20px] font-medium">
            Поиск партнеров
          </p>
        </div>

        <div></div>
        <div></div>
        <div></div>
        <div></div>
        <ArrowSvg className="rotate-90 lg:rotate-0 h-[40px] lg:h-[80px] col-start-2 row-start-3 lg:col-auto lg:row-auto" />

        <div className="flex flex-col items-center col-start-3 row-start-5 lg:col-auto lg:row-auto">
          <img src={landing} alt="" className="w-[140px] lg:w-[331px] h-auto" />
          <p className="mt-4 text-[10px] lg:text-[20px] font-medium">
            Развитие бренда
          </p>
        </div>
        <ArrowSvg className="rotate-[-90deg] lg:rotate-90 h-[40px] lg:h-[80px] col-start-2 row-start-5 lg:col-auto lg:row-auto" />

        <div className="flex flex-col items-center col-start-1 row-start-5 lg:col-auto lg:row-auto w-[140px] lg:w-[331px] h-auto">
          <img src={web} alt="" className="" />
          <p className="mt-4 text-[10px] lg:text-[20px] font-medium">
            Разработка приложения
          </p>
        </div>
        <ArrowSvg className="lg:rotate-90 h-[40px] lg:h-[80px] col-start-1 row-start-4 lg:col-auto lg:row-auto" />

        <div className="flex flex-col items-center col-start-1 row-start-3 lg:col-auto lg:row-auto">
          <img src={brand} alt="" className="w-[140px] lg:w-[331px] h-auto" />
          <p className="mt-4 text-[10px] lg:text-[20px] font-medium">
            Создание лендинга
          </p>
        </div>
      </section>
    </>
  );
};
