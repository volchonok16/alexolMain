import img1 from "../assets/features/img-1.png";
import img2 from "../assets/features/img-2.png";
import img3 from "../assets/features/img-3.png";
import img4 from "../assets/features/img-4.png";

import bg from "../assets/features/bg.png";

export const Features = () => {
    return (
        <section className="px-4" style={{ backgroundImage: `url(${bg})` }}>
            <div className="flex justify-between mt-10">
                <div className="max-w-[780px]">
                    <p className="text-[32px]">Развитие медиа</p>
                    <p className="text-[20px] mt-5">
                        Alexol также активно работает над созданием медийного
                        контента, ориентированного на профессионалов из
                        различных индустрий. Мы стремимся делиться знаниями,
                        вдохновлять на новые свершения и быть в центре
                        информационной повестки.
                    </p>
                </div>
                <div className="w-[460px] h-[250px] relative">
                    <img
                        className="drop-shadow-xl w-full h-full"
                        src={img1}
                        alt=""
                    />
                </div>
            </div>
            <div className="flex justify-between mt-10">
                <div className="w-[460px] h-[250px] relative">
                    <img
                        className="drop-shadow-xl w-full h-full"
                        src={img2}
                        alt=""
                    />
                </div>
                <div className="max-w-[780px]">
                    <p className="text-[32px] text-right">Развитие площадок</p>
                    <p className="text-[20px] mt-5 text-right">
                        В планах компании — запуск сети современных
                        коворкинговых пространств в столице и не только, которые
                        будут не просто рабочими местами, а настоящими центрами
                        силы. Эти пространства станут местом для рождения идей,
                        развития бизнесов и формирования новых деловых связей. В
                        дополнение к рабочим зонам, мы также предложим площадки
                        для личных встреч и современные офисы, чтобы обеспечить
                        все необходимые условия для эффективной работы и
                        продуктивного общения.
                    </p>
                </div>
            </div>
            <div className="flex justify-between mt-10">
                <div className="max-w-[780px]">
                    <p className="text-[32px]">Новое приложение</p>
                    <p className="text-[20px] mt-5">
                        Мы работаем над созданием уникального приложения, над
                        которым трудятся не только IT-специалисты, но и эксперты
                        в области психологии и маркетинга. Наша цель — создать
                        продукт, который будет удобен и полезен для каждого
                        пользователя, благодаря инновационным решениям и
                        глубокой проработке всех аспектов использования. Следите
                        за нашими социальными сетями, чтобы узнать больше о
                        нашем прогрессе и быть в курсе всех новостей!
                    </p>
                </div>
                <div className="w-[460px] h-[250px] relative">
                    <img
                        className="drop-shadow-xl w-full h-full"
                        src={img3}
                        alt=""
                    />
                </div>
            </div>
            <div className="flex justify-between mt-10">
                <div className="w-[460px] h-[250px] relative">
                    <img
                        className="drop-shadow-xl w-full h-full"
                        src={img4}
                        alt=""
                    />
                </div>
                <div className="max-w-[780px]">
                    <p className="text-[32px] text-right">Мерч</p>
                    <p className="text-[20px] mt-5 text-right">
                        Развиваем мерч с уникальным стилем и вдохновляющими
                        цитатами! Наши эксклюзивные аксессуары и одежда сочетают
                        качество и мудрость великих умов, помогая вам выразить
                        свою индивидуальность и поднять настроение.
                        Присоединяйтесь и выделяйтесь с мудростью и
                        вдохновением!
                    </p>
                </div>
            </div>
        </section>
    );
};
