import { DividerDots } from "@/widgets/DividerDots";
import { DividerSolid } from "@/widgets/DividerSolid";

import bgRight from "../assets/title/bg-right.png";
import bgLeft from "../assets/title/bg-left.png";

export const PageTitle = () => {
    return (
        <section className="relative lg:w-[768px] lg:h-[500px] mx-auto text-right lg:text-center">
            <img
                src={bgLeft}
                alt="background-left"
                className="absolute w-[180px] lg:w-[400px] h-auto top-[50px] left-[-50px] md:top-[-1px] lg:top-[-40px] lg:left-[-450px]"
            />
            <img
                src={bgRight}
                alt="background-right"
                className="absolute top-10 right-[-350px]"
            />

            <p className="mx-auto text-[24px] leading-[23px] lg:text-[48px] lg:w-[520px] lg:leading-10 mt-[40px] lg:mt-[100px]">
        1
            </p>
            <DividerSolid className="mx-auto mt-5 lg:mt-10 w-[100px] lg:w-[270px]" />

            <p className=" text-[12px] ml-[100px] lg:ml-0 lg:text-[20px] mt-8 lg:mt-20">
        Мы создаем будущее комфорта через инновации и технологии, разрабатывая
        решения, которые упрощают вашу жизнь и помогают добиваться большего. Наш
        подход сочетает креативность, передовые IT-разработки и глубокое
        понимание потребностей людей.
            </p>

            <div className="flex justify-center mt-8 lg:mt-20">
                <DividerDots />
            </div>
        </section>
    );
};
