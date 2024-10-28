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
    <section className="w-full max-w-[1440px] h-[750px] mt-12 pt-12">
      <div className="flex flex-col items-center">
        <DividerDots className="mb-10" />
        <p className="text-[48px] leading-normal">Наши эксперты</p>
        <DividerSolid className="w-[200px]" />
        <p className="mt-8">
          Каждый из наших сотрудников является экспертом в своей области с
          опытом <b>более 5 лет</b>
        </p>
      </div>

      <div
        className="h-[500px] mt-8 pl-32 flex justify-center items-center"
        style={{ backgroundImage: `url(${bg})` }}
      >
        <div className="flex flex-wrap w-[768px] gap-8">
          {experts.map((el, idx) => (
            <div
              key={idx}
              className="w-[350px] h-[200px] cursor-pointer flex relative"
              onMouseEnter={() => onHoverAvatar(idx)}
              onMouseLeave={onMouseLeave}
            >
              <img
                src={el.img}
                className="absolute z-10 h-[105px] w-[100px]"
                style={{ zIndex: "10", borderRadius: "5px" }}
              />
              {openDescId === idx && (
                <div className="absolute z-[1] top-[30px] left-[30px] pl-[40px] w-[340px] h-[160px] rounded-lg px-4 py-2 ml-2 text-white bg-gradient-to-r from-[#1D2228] to-[#313944]">
                  <p className="text-[18px] pl-12 font-bold">{el.name}</p>
                  <p className="text-[13px] min-h-[35px] pl-12 text-[#5F6164]">
                    {el.spec}
                  </p>
                  <p className="text-[10px] mt-4">{el.desc}</p>
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
  },
  {
    id: 2,
    img: avatar1,
    name: "Александр Тараскин",
    spec: "CEO",
    desc: "В свой практике использует весь наработанный экспертный опыт в областе аналитики. А так же опыт управления командами.",
  },
  {
    id: 3,
    img: avatar3,
    name: "Иван Капусткин",
    spec: "Руководитель технического департамента",
    desc: "В своей практики использует свой многолетний опыт разработки frontend и backend, опыт обучения сотрудников и их развития",
  },
  {
    id: 4,
    img: avatar4,
    name: "Олег Осипов",
    spec: "Руководитель юридического департамента ",
    desc: "Использует в своей работе анализ актуальной судебной практики, нестандартные и стандартные логические пути решения",
  },
];
