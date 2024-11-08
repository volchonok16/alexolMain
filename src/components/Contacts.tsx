import { socialMediaLinks } from "./constants";
import { DividerSolid } from "@/widgets/DividerSolid";

export const Contacts = () => {
    return (
        <section className="flex flex-col md:flex-row lg:flex-row items-center gap-[25px] md:gap-0 lg:gap-0 md:justify-between lg:justify-between pt-10 lg:pt-20">
            <div className="md:basis-[50%] lg:basis-[40%]">
                <p className="text-[24px] lg:text-[32px]">Контакты</p>
                <DividerSolid className="block lg:hidden w-[80px]" />
                <div className=" mt-4">
                    <p className="text-[20px] lg:text-[28px]">Адрес</p>
                    <p className="text-[16px] lg:text-[20px] mt-3">Россия., Москва.</p>
                    <p>Янковского 1 корпус 1</p>
                </div>
                <p className="text-[16px] lg:text-[20px] mt-5 font-normal">
          alexolcorp@gmail.com
                </p>
                <div className="mt-10 md:w-[300px] lg:w-[400px] flex flex-row flex-wrap items-center justify-center gap-7 self-center">
                    {socialMediaLinks.map((item) => {
                        const Logo = item.logo;
                        return (
                            <div
                                key={item.title}
                                className="flex-1 rounded-[10px] bg-gradient-to-r from-golden2 to-golden3 grow shadow-[8px_8px_8px_rgba(156,137,77,0.25)] transition-shadow duration-300 ease-in-out"
                            >
                                <div
                                    className="rounded-[10px] m-[1px] hover:shadow-[inset_4px_4px_8px_rgba(156,137,77,0.25)]"
                                    style={{
                                        background: `var(--background)`,
                                    }}
                                >
                                    <a
                                        href={item.link}
                                        className="p-2 m-[1px] hover:shadow-[0px_4px_10px_0px_#C0A570] text-center text-lg lg:text-xl leading-[17px] lg:leading-5 rounded-[10px] cursor-pointer flex flex-row gap-4 items-center justify-between"
                                    >
                                        <div className="bg-gradient-to-r from-golden2 to-golden3 bg-clip-text text-transparent">
                                            {item.title}
                                        </div>
                                        <Logo />
                                    </a>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
            <iframe
                className="md:basis-[50%] lg:basis-[45%] w-[340px] md:w-[500px] lg:w-[600px] h-[200px] md:h-[450px] lg:h-[450px]"
                src="https://www.google.com/maps/embed?pb=!1m16!1m12!1m3!1d562.1384628248043!2d37.47379414788874!3d55.696744050780374!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!2m1!1z0Y_QvdC60L7QstGB0LrQvtCz0L4gMSDQvNC-0YHQutCy0LA!5e0!3m2!1sru!2sru!4v1728413170852!5m2!1sru!2sru"
                loading="lazy"
            ></iframe>
        </section>
    );
};
