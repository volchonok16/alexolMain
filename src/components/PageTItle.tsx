import { DividerDots } from "@/widgets/DividerDots";
import { DividerSolid } from "@/widgets/DividerSolid";

import bgRight from "../assets/title/bg-right.png";
import bgLeft from "../assets/title/bg-left.png";

export const PageTitle = () => {
  return (
    <section className="relative w-[768px] h-[500px] mx-auto text-center">
      <img
        src={bgLeft}
        alt="background-left"
        className="absolute top-[-40px] left-[-450px]"
      />
      <img
        src={bgRight}
        alt="background-right"
        className="absolute top-10 right-[-350px]"
      />

      <p className="mx-auto text-[48px] w-[520px] leading-10">
        Alexol — это больше, чем просто стартап.
      </p>
      <DividerSolid className="mx-auto mt-10 w-[270px]" />

      <p className="text-[20px] mt-20">
        Мы создаем будущее комфорта через инновации и технологии, разрабатывая
        решения, которые упрощают вашу жизнь и помогают добиваться большего. Наш
        подход сочетает креативность, передовые IT-разработки и глубокое
        понимание потребностей людей.
      </p>

      <div className="flex justify-center mt-20">
        <DividerDots />
      </div>
    </section>
  );
};
