import { DividerSolid } from "@/widgets/DividerSolid";
import { useState } from "react";

interface IProps {
  theme: string;
}

interface IState {
  "1": boolean;
  "2": boolean;
  "3": boolean;
}

export const Experts: React.FC<IProps> = ({ theme }) => {
    const [isPartnerOpen, setIsPartnerOpen] = useState<IState>({
        "1": false,
        "2": false,
        "3": false,
    });
    const bg = theme === "dark-theme" ? "bg-black1" : "bg-white";
    const border = theme === "dark-theme" ? "border-white" : "border-black";

    const handlePartnerOpen = (event: React.MouseEvent<HTMLElement>) => {
        const id = (event.target as HTMLElement).id as keyof IState;
        setIsPartnerOpen((prevState) => ({
            ...prevState,
            [id]: !prevState[id],
        }));
        console.log(isPartnerOpen);
    };

    return (
        <section className="mx-4">
            <div className="flex flex-col items-start">
                <p className="text-[24px] lg:text-[48px] lg:leading-normal">
          Наши партнёры
                </p>
                <DividerSolid className="w-[200px]" />
            </div>
            <div className="flex gap-10 flex-col my-10">
                <div
                    className={`flex flex-col justify-center relative min-h-[130px] ${bg} ${border} border-[1px] pl-[120px] pr-[20px] py-[40px] cursor-pointer rounded-[20px]`}
                    id="1"
                    onClick={handlePartnerOpen}
                >
                    <img
                        src="/icons/skypro.svg"
                        className=" absolute -left-[40px] top-[40px] h-[50px] w-[150px]"
                        alt=""
                    />
                    <div className="flex flex-col">
                        <h3 className="font-semibold text-[24px]">SkyPro</h3>
                        <p className="text-[14px]">Обучение IT</p>
                    </div>
                    {isPartnerOpen["1"] && (
                        <div className="flex flex-row pt-[40px] justify-between">
                            <div className="flex flex-col gap-[15px] max-w-[475px]">
                                <img className="h-[26px] w-[124px]" src="/icons/skylogo.svg"></img>
                                <div className="flex flex-col gap-[12px]">
                                    <h4 className="font-medium text-[24px]">Обучение IT профессии с нуля с гарантией новой работы</h4>
                                    <p className="text-[18px]">
                    Цель SkyPro — не просто продавать курсы людям, а обучать и
                    устраивать на реальную работу
                                    </p>
                                    <a className="underline" href="mailto:skypro@skyeng.ru">skypro@skyeng.ru</a>
                                </div>
                                <button className=" max-w-[200px] px-[20px] py-[10px] bg-gradient-to-r from-golden2 to-golden3 rounded-[10px] text-white">
                  Узнать подробнее
                                </button>
                            </div>
                            <div className={`grid grid-cols-6 grid-rows-2 px-[35px] gap-x-[50px] w-[612px] rounded-[20px] ${border} border-[1px]`}>
                                <div className="col-span-2 flex flex-row place-items-center gap-x-[12px]">
                                    <img className="w-[24px] h-[24px]" src="/icons/star.svg" alt="" />
                                    <p className="text-[20px]">Каждый может</p>
                                </div>
                                <div className="col-span-2 flex flex-row place-items-center gap-x-[12px]">
                                    <img className="w-[24px] h-[24px]" src="/icons/star.svg" alt="" />
                                    <p className="text-[20px]">Никогда не поздно</p>
                                </div>
                                <div className="col-span-2 flex flex-row place-items-center gap-x-[12px]">
                                    <img className="w-[24px] h-[24px]" src="/icons/star.svg" alt="" />
                                    <p className="text-[20px]">Учеба - это не больно</p>
                                </div>
                                <div className="col-span-6 flex justify-center place-items-center">
                                    <p className="text-[20px] px-[120px] text-center">Образование — это инвестиция в ваше будущее</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
           
            <div className="flex gap-10 flex-col my-10">
                <div
                    className={`flex flex-col justify-center relative min-h-[130px] ${bg} ${border} border-[1px] pl-[120px] pr-[20px] py-[40px] cursor-pointer rounded-[20px]`}
                    id="2"
                    onClick={handlePartnerOpen}
                >
                    <img
                        src="/icons/incub.svg"
                        className=" absolute -left-[40px] top-[40px] h-[50px] w-[150px]"
                        alt=""
                    />
                    <div className="flex flex-col">
                        <h3 className="font-semibold text-[24px]">IT-инкубатор</h3>
                        <p className="text-[14px]">IT карьера</p>
                    </div>
                    {isPartnerOpen["2"] && (
                        <div className="flex flex-row pt-[40px] justify-between">
                            <div className="flex flex-col gap-[15px] max-w-[475px]">
                                <img className="h-[26px] w-[114px]" src="/icons/incublogo.svg"></img>
                                <div className="flex flex-col gap-[12px]">
                                    <h4 className="font-medium text-[24px]">Образовательная экосистема для развития карьеры в IT</h4>
                                    <p className="text-[18px]">
                                    Обучение, тренажеры, поддержка 1 на 1 и дружное комьюнити созданное разработчиками для разработчиков
                                    </p>
                                    <a className="underline" href="mailto:support+229319@it-incubator.eu">support+229319@it-incubator.eu</a>
                                </div>
                                <button className=" max-w-[200px] px-[20px] py-[10px] bg-gradient-to-r from-golden2 to-golden3 rounded-[10px] text-white">
                  Узнать подробнее
                                </button>
                            </div>
                            <div className={`grid grid-cols-6 grid-rows-2 gap-x-[10px] max-w-[612px] items-center`}>
                                <div className={`col-span-2 flex flex-row place-items-center h-[100px] justify-center gap-x-[15px] px-[15px] py-[33px] rounded-[20px] shadow-2xl`}>
                                    <p className="text-center text-[16px] px-10">Гарантиия трудоустройства</p>
                                </div>
                                <div className={`col-span-2 flex flex-row place-items-center h-[100px] justify-center gap-x-[15px] px-[15px] py-[33px] rounded-[20px] shadow-2xl`}>
                                    <p className="text-[16px] text-center">Стажировка</p>
                                </div>
                                <div className={`col-span-2 flex flex-row place-items-center h-[100px] justify-center gap-x-[15px] px-[15px] py-[33px] rounded-[20px] shadow-2xl`}>
                                    
                                    <p className="text-[16px] text-center px-10">Активное комьюнити</p>
                                </div>
                                <div className="col-span-6 flex justify-center place-items-center">
                                    <p className="text-[20px] px-[160px] text-center">IT-Incubator — это честое инженерное IT-образование</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            <div className="flex gap-10 flex-col my-10">
                <div
                    className={`flex flex-col justify-center relative min-h-[130px] ${bg} ${border} border-[1px] pl-[120px] pr-[20px] py-[40px] cursor-pointer rounded-[20px]`}
                    id="3"
                    onClick={handlePartnerOpen}
                >
                    <img
                        src="/icons/prana.svg"
                        className=" absolute -left-[40px] top-[40px] h-[50px] w-[150px]"
                        alt=""
                    />
                    <div className="flex flex-col">
                        <h3 className="font-semibold text-[24px]">PRANA</h3>
                        <p className="text-[14px]">Психология</p>
                    </div>
                    {isPartnerOpen["3"] && (
                        <div className="flex flex-row pt-[40px] justify-between">
                            <div className="flex flex-col gap-[15px] max-w-[475px]">
                                <img className="h-[33px] w-[135px]" src="/icons/pranalogo.svg"></img>
                                <div className="flex flex-col gap-[12px]">
                                    <h4 className="font-medium text-[24px]">Центр психологии PRANA</h4>
                                    <p className="text-[18px]">
                                    Семейная, кризисная психологоя, психосоматика, психоанализ, коучинг. Быстрая помощь в решении проблемных ситуаций. Различные виды консультаций.
                                    </p>
                                    <a className="underline" href="mailto:prana.vedic.center@gmail.com">prana.vedic.center@gmail.com</a>
                                </div>
                                <button className=" max-w-[200px] px-[20px] py-[10px] bg-gradient-to-r from-golden2 to-golden3 rounded-[10px] text-white">
                  Узнать подробнее
                                </button>
                            </div>
                            <div className={`grid grid-cols-6 grid-rows-2  gap-[15px] w-[612px]`}>
                                <div className="col-span-2 row-span-2 flex flex-col justify-center  place-items-center gap-[10px] rounded-[20px] shadow-lg">
                                    <img className="w-[74px] h-[74px]" src="/icons/study.svg" alt="" />
                                    <p className="text-[20px]">Образование</p>
                                </div>
                                <div className="col-span-2 flex flex-col justify-center place-items-center gap-x-[12px] rounded-[20px] shadow-lg">
                                    <img className="w-[41px] h-[28px]" src="/icons/experience.svg" alt="" />
                                    <p className="text-[20px]">Опыт</p>
                                </div>
                                <div className="col-span-2 flex flex-col justify-center place-items-center gap-x-[12px] rounded-[20px] shadow-lg">
                                    <img className="w-[24px] h-[24px]" src="/icons/format.svg" alt="" />
                                    <p className="text-[20px]">Формат работы</p>
                                </div>
                                <div className="col-span-4 flex flex-row justify-center place-items-center rounded-[20px] shadow-lg">
                                    <img className="w-[55px] h-[55px]" src="/icons/time.svg" alt="" />
                                    <p className="text-[20px] text-center">Скорость работы</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            
        </section>
    );
};
