import { DividerSolid } from "@/widgets/DividerSolid";
import { DividerDots } from "@/widgets/DividerDots";


interface IProps {
  theme: string;
}

export const Steps: React.FC<IProps> = ({ theme }) => {
    const bg = theme === "dark-theme" ? 'bg-gradient-to-r from-gray1 to-gray2' : 'bg-white' ;
    const border = theme === 'dark-theme' ? 'border-white' : 'border-black';
    const logo = theme === 'dark-theme' ? '/icons/logo_white.svg' : '/icons/logo.svg'
    const widthUser=innerWidth;

    return (
        <>
            <div className="flex flex-col items-center mt-10 lg:mt-24">
                <DividerDots className="mb-5 lg:mb-10" />
                <p className="text-[24px] lg:text-[48px] lg:leading-normal">Наш путь</p>
                <DividerSolid className="w-[100px]" />
            </div>
            <section id="Наш путь" className="mx-4">
                <div className="flex flex-row items-center justify-between flex-wrap gap-[40px] mt-[40px]">
                    <div className={`${bg} flex flex-col items-center justify-center lg:w-[415px] p-[7px] lg:h-[260px] gap-[6px] lg:gap-[20px] rounded-[20px] border-[1px] ${border} `}>
                        <img className="w-[20px] lg:w-[70px] h-[20px] lg:h-[70px]" src='/icons/media.svg' alt="" />
                        <div className=" flex flex-col gap-[6px] lg:gap-[15px] items-center px-[35px] lg:px-[60px]">
                            <h3 className="font-semibold text-[18px] lg:text-[24px]">Развитие медиа</h3>
                            <p className="text-center text-[14px]">Создаем качественный контент, который интересен нашей аудитории</p>
                        </div>
                    </div>
                    <div className={`${bg} flex flex-col items-center justify-center lg:w-[415px] p-[7px] lg:h-[260px] gap-[6px] lg:gap-[20px] rounded-[20px] border-[1px] ${border} `}>
                        <img className="w-[20px] lg:w-[70px] h-[20px] lg:h-[70px]" src='/icons/partners.svg' alt="" />
                        <div className=" flex flex-col gap-[6px] lg:gap-[15px] items-center px-[35px] lg:px-[60px]">
                            <h3 className="font-semibold text-[18px] lg:text-[24px]">Поиск партнёров</h3>
                            <p className="text-center text-[14px]">Объединяем усилия с ведущими компаниями в своей сфере</p>
                        </div>
                    </div>
                    <div className={`${bg} flex flex-col items-center justify-center lg:w-[415px] p-[7px] lg:h-[260px] gap-[6px] lg:gap-[20px] rounded-[20px] border-[1px] ${border} `}>
                        <img className="w-[20px] lg:w-[70px] h-[20px] lg:h-[70px]" src='/icons/app.svg' alt="" />
                        <div className=" flex flex-col gap-[6px] lg:gap-[15px] items-center px-[35px] lg:px-[40px]">
                            <h3 className="font-semibold text-[18px] lg:text-[24px]">Разработка приложений</h3>
                            <p className="text-center text-[14px]">Создаем инновационное приложение, которое упростит жизнь пользователей</p>
                        </div>
                    </div>
                    <div className={`${bg} flex flex-col items-center justify-center lg:w-[415px] p-[7px] lg:h-[260px] gap-[6px] lg:gap-[20px] rounded-[20px] border-[1px] ${border} `}>
                        <img className="w-[20px] lg:w-[70px] h-[20px] lg:h-[70px]" src='/icons/merch.svg' alt="" />
                        <div className=" flex flex-col gap-[6px] lg:gap-[15px] items-center px-[35px] lg:px-[60px]">
                            <h3 className="font-semibold text-[18px] lg:text-[24px]">Создание мерча</h3>
                            <p className="text-center text-[14px]">Выпускаем продукцию, отражающую ценности бренда</p>
                        </div>
                    </div>
                    <div className={`${bg} flex flex-col items-center justify-center lg:w-[415px] p-[7px] lg:h-[260px] gap-[6px] lg:gap-[20px] rounded-[20px] border-[1px] ${border} `}>
                        <img className="w-[20px] lg:w-[70px] h-[20px] lg:h-[70px]" src='/icons/lending.svg' alt="" />
                        <div className=" flex flex-col gap-[6px] lg:gap-[15px] items-center px-[35px] lg:px-[60px]">
                            <h3 className="font-semibold text-[18px] lg:text-[24px]">Создание лендинга</h3>
                            <p className="text-center text-[14px]">Разрабатываем привлекательный сайт, который расскажет о нашей компании</p>
                        </div>
                    </div>
                    
                    
                    {widthUser>1024 && <div className={`flex flex-col items-center w-[415px] gap-[20px]`}>
                        <img className="w-[295px] h-[90px]" src={logo} alt="" />
                    </div>} 
                </div>
                <div className="mt-10 flex justify-center">
                    <DividerDots className=" hidden lg:flex lg:mb-10" />
                </div>
            </section>
        </>
    );
};

