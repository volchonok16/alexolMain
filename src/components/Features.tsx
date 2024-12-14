import img1 from "../assets/features/img-1.png";
import img2 from "../assets/features/img-2.png";
import img3 from "../assets/features/img-3.png";
import img4 from "../assets/features/img-4.png";
import imgSm1 from "../assets/features/img-sm-1.png";
import imgSm2 from "../assets/features/img-sm-2.png";
import imgSm3 from "../assets/features/img-sm-3.png";
import imgSm4 from "../assets/features/img-sm-4.png";

interface IProps {
  theme: string;
}

export const Features: React.FC<IProps> = ({ theme }) => {
    const textColor =
    theme === "dark-theme" ? "lg:text-white" : "lg:text-dark-gray";

    return (
        <section id="Наши продукты" className={`text-white ${textColor}`}>
            <div className="grid grid-cols-6 grid-rows-2 gap-10">
                <div className="content-center col-span-2">
                    <p className="text-[46px]">Направления роста и развития</p>
                </div>
                <div className=" relative h-[414px] content-center col-span-2 drop-shadow-xl bg-white justify-items-center rounded-[20px]">
                    <div className=" absolute top-[20px] left-[20px] w-[80px] bg-gradient-to-r from-golden2 to-golden3 text-white text-[48px] rounded-[10px] text-center content-center">
            1
                    </div>
                    <div className="text-[36px] font-medium ">IT-сфера</div>
                </div>
                <div className=" relative h-[414px] content-center col-span-2 drop-shadow-xl bg-white justify-items-center rounded-[20px]">
                    <div className=" absolute top-[20px] left-[20px] w-[80px] bg-gradient-to-r from-golden2 to-golden3 text-white text-[48px] rounded-[10px] text-center content-center">
            2
                    </div>
                    <div className="text-[36px] font-medium ">Мерч</div>
                </div>
                <div className=" relative h-[414px] content-center col-span-3 drop-shadow-xl bg-white justify-items-center rounded-[20px]">
                    <div className=" absolute top-[20px] left-[20px] w-[80px] bg-gradient-to-r from-golden2 to-golden3 text-white text-[48px] rounded-[10px] text-center content-center">
            3
                    </div>
                    <div className="text-[36px] font-medium ">Коворкинги</div>
                </div>
                <div className=" relative h-[414px] content-center col-span-3 drop-shadow-xl bg-white justify-items-center rounded-[20px]">
                    <div className=" absolute top-[20px] left-[20px] w-[80px] bg-gradient-to-r from-golden2 to-golden3 text-white text-[48px] rounded-[10px] text-center content-center">
            4
                    </div>
                    <div className="text-[36px] font-medium ">Социальные медиа</div>
                </div>
          
            </div>
            <div className="flex justify-center lg:justify-between mt-10 ">
                <div
                    className="group w-[355px] h-auto lg:w-[780px] absolute lg:static flex-col text-center lg:text-left shadow-[8px_8px_16px_0px_rgba(8, 12, 0)]"
                    style={{ zIndex: 10 }}
                >
                    <p className="text-[30px] lg:text-[32px] mt-[60px] lg:mt-0 opacity-100 transition-opacity duration-300 group-hover:opacity-0 lg:group-hover:opacity-100">
            Развитие медиа
                    </p>
                    <p className="text-[12px] lg:text-[20px] mt-5 opacity-0 lg:opacity-100 absolute lg:static right-[20px] left-[10px] top-[20px] transition-opacity duration-300 group-hover:opacity-100">
            Alexol также активно работает над созданием медийного контента,
            ориентированного на профессионалов из различных индустрий. Мы
            стремимся делиться знаниями, вдохновлять на новые свершения и быть в
            центре информационной повестки.
                    </p>
                </div>
                <div className="w-[355px] h-auto lg:w-[460px] lg:h-[250px] relative ">
                    <img
                        className="drop-shadow-xl w-full h-full hidden lg:block"
                        src={img1}
                        alt=""
                    />
                    <img
                        className="drop-shadow-xl w-full h-full block lg:hidden"
                        src={imgSm1}
                        alt=""
                    />
                </div>
            </div>

            <div className="flex justify-center lg:justify-between mt-10">
                <div className="w-[355px] h-auto lg:w-[460px] lg:h-[250px] relative">
                    <img
                        className="drop-shadow-xl w-full h-full hidden lg:block"
                        src={img2}
                        alt=""
                    />
                    <img
                        className="drop-shadow-xl w-full h-full block lg:hidden"
                        src={imgSm2}
                        alt=""
                    />
                </div>
                <div
                    className="group w-[355px] h-auto lg:w-[780px] absolute lg:static flex-col text-center lg:text-right"
                    style={{ zIndex: 10 }}
                >
                    <p className="text-[30px] lg:text-[32px] mt-[90px] lg:mt-0 opacity-100 transition-opacity duration-300 group-hover:opacity-0 lg:group-hover:opacity-100">
            Развитие площадок
                    </p>
                    <p className="text-[12px] lg:text-[20px] mt-5 opacity-0 lg:opacity-100 absolute lg:static right-[20px] left-[10px] top-[6px] transition-opacity duration-300 group-hover:opacity-100">
            В планах компании — запуск сети современных коворкинговых
            пространств в столице и не только, которые будут не просто рабочими
            местами, а настоящими центрами силы. Эти пространства станут местом
            для рождения идей, развития бизнесов и формирования новых деловых
            связей. В дополнение к рабочим зонам, мы также предложим площадки
            для личных встреч и современные офисы, чтобы обеспечить все
            необходимые условия для эффективной работы и продуктивного общения.
                    </p>
                </div>
            </div>
            <div className="flex justify-center lg:justify-between mt-10">
                <div
                    className="group w-[355px] h-auto lg:w-[780px] absolute lg:static flex-col text-center lg:text-left"
                    style={{ zIndex: 10 }}
                >
                    <p className="text-[30px] lg:text-[32px] mt-[80px] lg:mt-0 opacity-100 transition-opacity duration-300 group-hover:opacity-0 lg:group-hover:opacity-100">
            Новое приложение
                    </p>
                    <p className="text-[12px] lg:text-[20px] mt-5 opacity-0 lg:opacity-100 absolute lg:static right-[20px] left-[10px] top-[0px] transition-opacity duration-300 group-hover:opacity-100">
            Мы работаем над созданием уникального приложения, над которым
            трудятся не только IT-специалисты, но и эксперты в области
            психологии и маркетинга. Наша цель — создать продукт, который будет
            удобен и полезен для каждого пользователя, благодаря инновационным
            решениям и глубокой проработке всех аспектов использования. Следите
            за нашими социальными сетями, чтобы узнать больше о нашем прогрессе
            и быть в курсе всех новостей!
                    </p>
                </div>
                <div className="w-[355px] h-auto lg:w-[460px] lg:h-[250px] relative">
                    <img
                        className="drop-shadow-xl w-full h-full hidden lg:block"
                        src={img3}
                        alt=""
                    />
                    <img
                        className="drop-shadow-xl w-full h-full block lg:hidden"
                        src={imgSm3}
                        alt=""
                    />
                </div>
            </div>
            <div className="flex justify-center lg:justify-between mt-10">
                <div className="w-[355px] h-auto lg:w-[460px] lg:h-[250px] relative">
                    <img
                        className="drop-shadow-xl w-full h-full hidden lg:block"
                        src={img4}
                        alt=""
                    />
                    <img
                        className="drop-shadow-xl w-full h-full block lg:hidden"
                        src={imgSm4}
                        alt=""
                    />
                </div>
                <div
                    className="group w-[355px] h-auto lg:w-[780px] absolute lg:static flex-col text-center lg:text-right"
                    style={{ zIndex: 10 }}
                >
                    <p className="text-[30px] lg:text-[32px] mt-[70px] lg:mt-0 opacity-100 transition-opacity duration-300 group-hover:opacity-0 lg:group-hover:opacity-100">
            Мерч
                    </p>
                    <p className="text-[12px] lg:text-[20px] mt-5 opacity-0 lg:opacity-100 absolute lg:static right-[20px] left-[10px] top-[10px] transition-opacity duration-300 group-hover:opacity-100">
            Развиваем мерч с уникальным стилем и вдохновляющими цитатами! Наши
            эксклюзивные аксессуары и одежда сочетают качество и мудрость
            великих умов, помогая вам выразить свою индивидуальность и поднять
            настроение. Присоединяйтесь и выделяйтесь с мудростью и
            вдохновением!
                    </p>
                </div>
            </div>
        </section>
    );
};
