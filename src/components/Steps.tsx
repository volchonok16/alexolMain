import bg from "../assets/steps/steps-bg.png";
import smm from "../assets/steps/smm.png";
import media from "../assets/steps/media.png";
import partnership from "../assets/steps/partnership.png";
import landing from "../assets/steps/landing.png";
import web from "../assets/steps/web.png";
import brand from "../assets/steps/brand.png";

import ArrowSvg from "../assets/steps/arrow.svg";
import { DividerSolid } from "@/widgets/DividerSolid";
import { DividerDots } from "@/widgets/DividerDots";

export const Steps = () => {
  return (
    <>
      <div className="flex flex-col items-center mt-12">
        <DividerDots className="mb-10" />
        <p className="text-[48px] leading-normal">Наш путь</p>
        <DividerSolid className="w-[130px]" />
      </div>
      <section
        className="w-full max-w-[1440px] h-[920px] mt-12 pt-12"
        style={{
          background: `url(${bg}) var(--background-block-steps)`,
          backgroundBlendMode: "overlay",
        }}
      >
        <div className="flex justify-around items-center">
          <div className="flex flex-col items-center">
            <img src={smm} alt="" />
            <p className="mt-4 text-[20px] font-medium">Развитие SMM</p>
          </div>
          <ArrowSvg className="rotate-[-90deg]" />
          <div className="flex flex-col items-center">
            <img src={media} alt="" />
            <p className="mt-4 text-[20px] font-medium">Развитие медиа</p>
          </div>
          <ArrowSvg className="rotate-[-90deg]" />
          <div className="flex flex-col items-center">
            <img src={partnership} alt="" />
            <p className="mt-4 text-[20px] font-medium">Поиск партнеров</p>
          </div>
        </div>

        <div className="flex justify-around items-center my-16">
          <div className="w-[332px]"></div>
          <div className="w-[81px]"></div>
          <div className="w-[332px]"></div>
          <div className="w-[81px]"></div>
          <div className="w-[332px] flex justify-center">
            <ArrowSvg />
          </div>
        </div>

        <div className="flex justify-around items-center">
          <div className="flex flex-col items-center">
            <img src={landing} alt="" />
            <p className="mt-4 text-[20px] font-medium">Развитие бренда</p>
          </div>
          <ArrowSvg className="rotate-90" />

          <div className="flex flex-col items-center">
            <img src={web} alt="" />
            <p className="mt-4 text-[20px] font-medium">
              Разработка приложения
            </p>
          </div>
          <ArrowSvg className="rotate-90" />

          <div className="flex flex-col items-center">
            <img src={brand} alt="" />
            <p className="mt-4 text-[20px] font-medium">Создание лендинга</p>
          </div>
        </div>
      </section>
    </>
  );
};
