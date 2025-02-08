import { DividerDots } from "@/widgets/DividerDots";
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
    const bgBlock =
        theme === "dark-theme"
            ? "bg-gradient-to-r from-gray1 to-gray2"
            : "bg-white";
    const border = theme === "dark-theme" ? "border-white" : "border-black";
    const skyPath =
        theme === "dark-theme"
            ? "/icons/skylogoblack.svg"
            : "/icons/skylogo.svg";
    const incubPath =
        theme === "dark-theme"
            ? "/icons/incublogoblack.svg"
            : "/icons/incublogo.svg";
    const pranaPath =
        theme === "dark-theme"
            ? "/icons/pranalogoblack.svg"
            : "/icons/pranalogo.svg";
    const starPath =
        theme === "dark-theme"
            ? "/icons/starwhite.svg"
            : "/icons/starblack.svg";
    const widthDevice = window.innerWidth;

    const handlePartner1Open = () => {
        setIsPartnerOpen((prevState) => ({
            ...prevState,
            1: !prevState[1],
        }));
    };
    const handlePartner2Open = () => {
        setIsPartnerOpen((prevState) => ({
            ...prevState,
            2: !prevState[2],
        }));
    };
    const handlePartner3Open = () => {
        setIsPartnerOpen((prevState) => ({
            ...prevState,
            3: !prevState[3],
        }));
    };

    return (
        <section>
            <div className="flex flex-col items-start">
                <p className="text-[24px] lg:text-[48px] lg:leading-normal">
                    Наши партнёры
                </p>
                <DividerSolid className="w-[200px]" />
            </div>
            <div className="flex gap-10 flex-col my-10">
                <div
                    className={`z-20 flex flex-col justify-center relative min-h-[130px] ${bg} ${border} border-[1px] pl-[15px] lg:pl-[120px] pr-[15px] py-[40px] cursor-pointer rounded-[20px]`}
                    id="1"
                    onClick={handlePartner1Open}
                >
                    <img
                        src="/icons/skypro.svg"
                        className=" absolute -left-[25px] top-[40px] h-[50px] w-[150px]"
                        alt=""
                    />
                    <div className="flex flex-col pl-[110px] lg:pl-[0]">
                        <h3 className="font-semibold text-[18px] lg:text-[24px]">
                            SkyPro
                        </h3>
                        <p className="text-[12px] lg:text-[14px]">
                            Обучение IT
                        </p>
                    </div>
                    {isPartnerOpen["1"] && (
                        <div className="flex flex-col lg:flex-row pt-[40px] justify-between animate-slide-in-blurred-top">
                            <div className="flex flex-col gap-[15px] max-w-[475px]">
                                <img
                                    className="h-[26px] w-[124px]"
                                    src={skyPath}
                                ></img>
                                <div className="flex flex-col gap-[12px]">
                                    <h4 className="font-medium text-[18px] lg:text-[24px]">
                                        Обучение IT профессии с нуля с гарантией
                                        новой работы
                                    </h4>
                                    <p className="text-[14px] lg:text-[18px]">
                                        Цель SkyPro — не просто продавать курсы
                                        людям, а обучать и устраивать на
                                        реальную работу
                                    </p>
                                    <a
                                        className="underline"
                                        href="mailto:skypro@skyeng.ru"
                                    >
                                        skypro@skyeng.ru
                                    </a>
                                </div>
                                {widthDevice > 1024 && (
                                    <button className=" max-w-[200px] px-[20px] py-[10px] bg-gradient-to-r from-golden2 to-golden3 rounded-[10px] text-white">
                                        Узнать подробнее
                                    </button>
                                )}
                            </div>
                            <div
                                className={`flex flex-wrap justify-center lg:grid grid-cols-6 grid-rows-2 my-[25px] py-[15px] px-[15px] lg:px-[35px] gap-[25px] lg:gap-x-[50px] lg:w-[612px] rounded-[20px] ${border} border-[1px]`}
                            >
                                <div className="w-[110px] lg:w-auto  lg:col-span-2 flex flex-row place-items-center gap-x-[12px]">
                                    <img
                                        className="w-[15px] lg:w-[24px] h-[15px] lg:h-[24px]"
                                        src={starPath}
                                        alt=""
                                    />
                                    <p className="text-[16px] lg:text-[20px]">
                                        Каждый может
                                    </p>
                                </div>
                                <div className="w-[110px] lg:w-auto  col-span-2 flex flex-row place-items-center gap-x-[12px]">
                                    <img
                                        className="w-[15px] lg:w-[24px] h-[15px] lg:h-[24px]"
                                        src={starPath}
                                        alt=""
                                    />
                                    <p className="text-[16px] lg:text-[20px]">
                                        Никогда не поздно
                                    </p>
                                </div>
                                <div className="w-[110px] lg:w-auto col-span-2 flex flex-row place-items-center gap-x-[12px]">
                                    <img
                                        className="w-[15px] lg:w-[24px] h-[15px] lg:h-[24px]"
                                        src={starPath}
                                        alt=""
                                    />
                                    <p className="text-[16px] lg:text-[20px]">
                                        Учеба - это не больно
                                    </p>
                                </div>
                                <div className="col-span-6 flex justify-center place-items-center">
                                    <p className="text-[16px] lg:text-[20px] text-center">
                                        Образование — это инвестиция в ваше
                                        будущее
                                    </p>
                                </div>
                            </div>
                            {widthDevice < 1024 && (
                                <button className="self-center max-w-[200px] px-[20px] py-[10px] bg-gradient-to-r from-golden2 to-golden3 rounded-[10px] text-white">
                                    Узнать подробнее
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <div className="flex gap-10 flex-col my-10">
                <div
                    className={`flex flex-col justify-center relative min-h-[130px] ${bg} ${border} border-[1px] pl-[15px] lg:pl-[120px] pr-[20px] py-[40px] cursor-pointer rounded-[20px]`}
                    id="2"
                    onClick={handlePartner2Open}
                >
                    <img
                        src="/icons/incub.svg"
                        className=" absolute -left-[25px] top-[40px] h-[50px] w-[150px]"
                        alt=""
                    />
                    <div className="flex flex-col pl-[110px] lg:pl-[0]">
                        <h3 className="font-semibold  text-[18px] lg:text-[24px]">
                            IT-инкубатор
                        </h3>
                        <p className="text-[12px] lg:text-[14px]">IT карьера</p>
                    </div>
                    {isPartnerOpen["2"] && (
                        <div className="flex flex-col lg:flex-row pt-[40px] justify-between animate-slide-in-blurred-top">
                            <div className="flex flex-col gap-[15px] max-w-[475px]">
                                <img
                                    className="h-[26px] w-[114px]"
                                    src={incubPath}
                                ></img>
                                <div className="flex flex-col gap-[12px]">
                                    <h4 className="font-medium text-[18px] lg:text-[24px]">
                                        Образовательная экосистема для развития
                                        карьеры в IT
                                    </h4>
                                    <p className="text-[14px] lg:text-[18px]">
                                        Обучение, тренажеры, поддержка 1 на 1 и
                                        дружное комьюнити созданное
                                        разработчиками для разработчиков
                                    </p>
                                    <a
                                        className="underline"
                                        href="mailto:support+229319@it-incubator.eu"
                                    >
                                        support+229319@it-incubator.eu
                                    </a>
                                </div>
                                {widthDevice > 1024 && (
                                    <button className=" max-w-[200px] px-[20px] py-[10px] bg-gradient-to-r from-golden2 to-golden3 rounded-[10px] text-white">
                                        Узнать подробнее
                                    </button>
                                )}
                            </div>
                            <div
                                className={`flex flex-wrap justify-center lg:grid grid-cols-6 grid-rows-2 gap-x-[15px] max-w-[612px] items-center gap-[15px] my-[20px]`}
                            >
                                <div
                                    className={`w-1/2 lg:w-auto col-span-2 flex flex-row place-items-center h-[70px] lg:h-[100px] justify-center gap-x-[15px] px-[15px] py-[33px] rounded-[20px] shadow-2xl ${bgBlock}`}
                                >
                                    <p className="text-center text-[14px] lg:text-[16px] leading-[17px] lg:px-10">
                                        Гарантиия трудоустройства
                                    </p>
                                </div>
                                <div
                                    className={` lg:w-auto col-span-2 flex flex-row place-items-center  h-[70px] lg:h-[100px] justify-center gap-x-[15px] px-[15px] py-[33px] rounded-[20px] shadow-2xl ${bgBlock}`}
                                >
                                    <p className="text-[14px] lg:text-[16px] leading-[17px] text-center">
                                        Стажировка
                                    </p>
                                </div>
                                <div
                                    className={`w-[220px] lg:w-auto col-span-2 flex flex-row place-items-center h-[70px] lg:h-[100px] justify-center gap-x-[15px] px-[15px] py-[33px] rounded-[20px] shadow-2xl ${bgBlock}`}
                                >
                                    <p className="text-[14px] lg:text-[16px] leading-[17px] text-center lg:px-10">
                                        Активное комьюнити
                                    </p>
                                </div>
                                <div className="col-span-6 flex justify-center place-items-center">
                                    <p className="text-[18px] lg:text-[20px] lg:px-[160px] text-center">
                                        IT-Incubator — это честое инженерное
                                        IT-образование
                                    </p>
                                </div>
                            </div>
                            {widthDevice < 1024 && (
                                <button className="self-center max-w-[200px] px-[20px] py-[10px] bg-gradient-to-r from-golden2 to-golden3 rounded-[10px] text-white">
                                    Узнать подробнее
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>
            <div className="flex gap-10 flex-col my-10">
                <div
                    className={`flex flex-col justify-center relative min-h-[130px] ${bg} ${border} border-[1px]  pl-[15px] lg:pl-[120px] pr-[20px] py-[40px] cursor-pointer rounded-[20px]`}
                    id="3"
                    onClick={handlePartner3Open}
                >
                    <img
                        src="/icons/prana.svg"
                        className=" absolute -left-[25px] top-[40px] h-[50px] w-[150px]"
                        alt=""
                    />
                    <div className="flex flex-col pl-[110px] lg:pl-[0]">
                        <h3 className="font-semibold text-[24px]">PRANA</h3>
                        <p className="text-[14px]">Психология</p>
                    </div>
                    {isPartnerOpen["3"] && (
                        <div className="flex flex-col lg:flex-row pt-[40px] justify-between animate-slide-in-blurred-top">
                            <div className="flex flex-col gap-[15px] max-w-[475px]">
                                <img
                                    className="h-[33px] w-[135px]"
                                    src={pranaPath}
                                ></img>
                                <div className="flex flex-col gap-[12px]">
                                    <h4 className="font-medium text-[18] lg:text-[24px]">
                                        Центр психологии PRANA
                                    </h4>
                                    <p className="text-[14px] lg:text-[18px]">
                                        Семейная, кризисная психологоя,
                                        психосоматика, психоанализ, коучинг.
                                        Быстрая помощь в решении проблемных
                                        ситуаций. Различные виды консультаций.
                                    </p>
                                    <a
                                        className="underline"
                                        href="mailto:prana.vedic.center@gmail.com"
                                    >
                                        prana.vedic.center@gmail.com
                                    </a>
                                </div>
                                {widthDevice > 1024 && (
                                    <button className=" max-w-[200px] px-[20px] py-[10px] bg-gradient-to-r from-golden2 to-golden3 rounded-[10px] text-white">
                                        Узнать подробнее
                                    </button>
                                )}
                            </div>
                            <div className="grid grid-cols-6 grid-rows-3 lg:grid-rows-2  gap-[15px] lg:w-[612px] my-[20px]">
                                <div
                                    className={`col-span-3 row-span-2 lg:col-span-2 lg:row-span-2 flex flex-col justify-center  place-items-center gap-[10px] lg:rounded-[15px] rounded-[5px] shadow-lg ${bgBlock}`}
                                >
                                    <img
                                        className="w-[25] lg:w-[74px] h-[25px] lg:h-[74px]"
                                        src="/icons/study.svg"
                                        alt=""
                                    />
                                    <p className="text-[13px] lg:text-[20px]">
                                        Образование
                                    </p>
                                </div>
                                <div
                                    className={`col-span-3 row-span-1 lg:col-span-2 flex flex-col justify-center place-items-center gap-x-[12px] rounded-[5px] lg:rounded-[15px] shadow-lg ${bgBlock}`}
                                >
                                    <img
                                        className="w-[27px] lg:w-[41px] h-[16px] lg:h-[28px]"
                                        src="/icons/experience.svg"
                                        alt=""
                                    />
                                    <p className="text-[13px] lg:text-[20px]">
                                        Опыт
                                    </p>
                                </div>
                                <div
                                    className={`col-span-3 row-span-1 lg:col-span-2 flex flex-col justify-center place-items-center gap-x-[12px] rounded-[5px] lg:rounded-[15px] shadow-lg ${bgBlock}`}
                                >
                                    <img
                                        className="w-[25px] h-[25px]"
                                        src="/icons/format.svg"
                                        alt=""
                                    />
                                    <p className="text-[13px] lg:text-[20px]">
                                        Формат работы
                                    </p>
                                </div>
                                <div
                                    className={`col-span-6 row-span-1 lg:col-span-4 flex flex-row justify-center place-items-center rounded-[5px] lg:rounded-[15px] shadow-lg gap-[10px] ${bgBlock}`}
                                >
                                    <img
                                        className="w-[34px] lg:w-[55px] h-[27px] lg:h-[55px]"
                                        src="/icons/time.svg"
                                        alt=""
                                    />
                                    <p className="text-[13px] lg:text-[20px] text-center">
                                        Скорость работы
                                    </p>
                                </div>
                            </div>
                            {widthDevice < 1024 && (
                                <button className="self-center max-w-[200px] px-[20px] py-[10px] bg-gradient-to-r from-golden2 to-golden3 rounded-[10px] text-white">
                                    Узнать подробнее
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>
            <div className="flex justify-center">
                <DividerDots />
            </div>
        </section>
    );
};
