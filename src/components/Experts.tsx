import { DividerSolid } from "@/widgets/DividerSolid";
import bg from "../assets/experts/bg.png";
import avatar1 from "../assets/experts/avatar-1.png";
import avatar2 from "../assets/experts/avatar-2.png";
import avatar3 from "../assets/experts/avatar-3.png";
import avatar4 from "../assets/experts/avatar-4.png";
import { useState } from "react";
import { DividerDots } from "@/widgets/DividerDots";

export const Experts = () => {
    const [openDescId, setOpenDescId] = useState<number | null>(null);

    const onHoverAvatar = (id: number) => setOpenDescId(id);
    const onMouseLeave = () => setOpenDescId(null);

    return (
        <section className="w-full max-w-[1440px] h-[300px] lg:h-[750px] mt-10 lg:mt-24">
            <div className="flex flex-col items-center">
                <DividerDots className="hidden lg:flex lg:mb-10" />
                <p className="text-[24px] lg:text-[48px] lg:leading-normal">
          Наши эксперты
                </p>
                <DividerSolid className="w-[200px]" />
                <p className="mt-8 text-center text-[12px] lg:text-[20px]">
          Каждый из наших сотрудников является экспертом в своей области с
          опытом <b>более 5 лет</b>
                </p>
            </div>

            <div
                className="h-[170px] lg:h-[500px] w-full mt-2 lg:mt-8 flex justify-center items-center"
                style={{
                    background: `url(${bg}) no-repeat center / contain`,
                }}
            >
                <div className="flex flex-wrap justify-center w-[300px] lg:w-[768px] gap-x-24 gap-y-2 lg:gap-x-80 lg:gap-y-40">
                    {experts.map((el, idx) => (
                        <div
                            key={idx}
                            className="
             cursor-pointer relative"
                            onMouseEnter={() => onHoverAvatar(idx)}
                            onMouseLeave={onMouseLeave}
                        >
                            <img
                                src={el.img}
                                className="relative h-[64px] lg:h-[105px] w-[60px] lg:w-[100px]"
                                style={{ zIndex: openDescId === idx ? 4 : 2, borderRadius: "5px" }}
                            />
                            {openDescId === idx && (
                                <div className={`absolute top-[15px] lg:top-[30px] ${el.position} lg:left-[30px] pl-[20px] lg:pl-[40px] w-[230px] lg:w-[340px] h-[130px] lg:h-[160px] rounded-lg px-2 lg:px-4 py-1 lg:py-2 lg:ml-2 text-white bg-gradient-to-r from-[#1D2228] to-[#313944]`} style={{zIndex: 3}}>
                                    <p className="text-[12px] lg:text-[18px] pl-7 lg:pl-12 font-bold">{el.name}</p>
                                    <p className="text-[10px] lg:text-[13px] min-h-[35px] pl-7 lg:pl-12 text-[#5F6164]">
                                        {el.spec}
                                    </p>
                                    <p className="text-[10px] mt-1 lg:mt-4">{el.desc}</p>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

const experts = [
    {
        id: 1,
        img: avatar2,
        name: "Анна Журавлева",
        spec: "Эксперт Психологии",
        desc: "В своей практической работе использует методы психоанализа, кризисной и семейной психологии, психосоматики и гештальт терапии.",
        position: "left-[20px]",
    },
    {
        id: 2,
        img: avatar1,
        name: "Александр Тараскин",
        spec: "CEO",
        desc: "В свой практике использует весь наработанный экспертный опыт в областе аналитики. А так же опыт управления командами.",
        position: "right-[30px]",
    },
    {
        id: 3,
        img: avatar3,
        name: "Иван Капусткин",
        spec: "Руководитель технического департамента",
        desc: "В своей практики использует свой многолетний опыт разработки frontend и backend, опыт обучения сотрудников и их развития",
        position: "left-[20px]",
    },
    {
        id: 4,
        img: avatar4,
        name: "Олег Осипов",
        spec: "Руководитель юридического департамента ",
        desc: "Использует в своей работе анализ актуальной судебной практики, нестандартные и стандартные логические пути решения",
        position: "right-[30px]",
    },
];
