import { useState } from "react";
import Direction from "./Direction";

interface IProps {
  theme: string;
}

export const Features: React.FC<IProps> = ({ theme }) => {
    const textColor = theme === "dark-theme" ? "text-white" : "text-dark-gray";
    const bg = theme==='dark-theme' ? 'bg-black1' : 'bg-white';

    const [isPopupOpen, setIsPopupOpen] = useState({
        'it': false,
        'merch': false,
        'cowork': false,
        'sm': false,
    });

    const openPopup = (event: React.MouseEvent<HTMLElement>) => {
        setIsPopupOpen((prevState) => ({
            ...prevState,
            [(event.target as HTMLElement).id]: true,
        }));
    };
    const closePopup = (event: React.MouseEvent<HTMLElement>) => {
        setIsPopupOpen((prevState) => ({
            ...prevState,
            [(event.target as HTMLElement).id]: false,
        }));
    };

    const onMouseEnterHandler = (event: React.MouseEvent<HTMLElement>) => {
        setIsPopupOpen((prevState) => ({
            ...prevState,
            [(event.target as HTMLElement).id]: true,
        }));
    };
    const onMouseLeaveHandler = (event: React.MouseEvent<HTMLElement>) => {
        setIsPopupOpen((prevState) => ({
            ...prevState,
            [(event.target as HTMLElement).id]: false,
        }));
    };

    return (
        <section id="Наши продукты" className={`${textColor} ${bg}`}>
            <div className="grid grid-cols-6 grid-rows-3 lg:grid-rows-2 gap-10">
                <div className="content-center col-span-6 lg:col-span-2">
                    <p className=" text-center lg:text-start text-[22px] lg:text-[46px]">
            Направления роста и развития
                    </p>
                </div>
                {directions.map((el) => (
                    <Direction
                        id={el.id}
                        number={el.number}
                        bullet={el.bullet}
                        text={el.text}
                        col={el.col}
                        theme={theme}
                        isPopupOpen={isPopupOpen[el.id as keyof typeof isPopupOpen]}
                        openPopup={openPopup}
                        closePopup={closePopup}
                        onMouseEnterHandler={onMouseEnterHandler}
                        onMouseLeaveHandler={onMouseLeaveHandler}
                    />
                ))}
            </div>
        </section>
    );
};

const directions = [
    {
        id: "it",
        number: "1",
        bullet: "IT-сфера",
        text: "Мы планируем разрабатывать приложения, которые будут направлены на помощь людям в разных сферах.  В разработку приложений вовлечены дизайнеры и психологи, чтобы сделать их удобными для наших клиентов. Получайте новые знания и навыки в любое время и в любом месте с нашими приложениями!",
        col: "col-span-3 lg:col-span-2",
    },
    {
        id: "merch",
        number: "2",
        bullet: "Мерч",
        text: "Уникальные чашки, футболки и кружки с вдохновляющими цитатами заставляют поверить в себя. Вы можете выбрать ваши любимые цитаты сами и нацелить себя на продуктивность и позитив.",
        col: "col-span-3 lg:col-span-2",
    },
    {
        id: "cowork",
        number: "3",
        bullet: "Коворкинг",
        text: "Удобные офисы для работы, пространства для общения, обучения и вдохновения.  Вы сможете учиться совместно с единомышленниками, находить друзей и производить креативные идеи для ваших бизнесов. Конечно, всем нужен отдых, поэтому в наших коворкинг зонах можно будет поиграть в настольные игры и вкусно перекусить. Особенности наших пространств помогут  как погрузиться в рабочий процесс, так и отвлечься и отдохнуть — вместе за успехом!",
        col: "col-span-3",
    },
    {
        id: "sm",
        number: "4",
        bullet: "Социальные медиа",
        text: "Мы разрабатываем медиаконтент в социальных сетях, на сайтах и видеохостингах. Уникальная информация помогает нашим клиентам погрузиться в мир IT, посмотреть интервью с лидерами мнений и узнать много нового и интересного!",
        col: "col-span-3",
    },
];
