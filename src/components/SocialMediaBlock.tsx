import {
    slogan1,
    slogan2,
    socialMediaLinks,
    socialMediaText,
} from "./constants";
import Block1 from "../common/assets/Block1.svg";
import Block2 from "../common/assets/Block2.svg";
import Block3 from "../common/assets/Block3.svg";
import Block4 from "../common/assets/Block4.svg";
import Block5 from "../common/assets/Block5.svg";
import Block6 from "../common/assets/Block6.svg";
import Block7 from "../common/assets/Block7.svg";
import Block8 from "../common/assets/Block8.svg";
import Background from "../common/assets/Background.svg";

export const SocialMediaBlock = () => {
    return (
        <div className="flex flex-row justify-between items-center relative">
            <div className="absolute sm:top-2 top-0 right-0">
                <Background className="w-[350px] h-auto lg:w-[786px]" />
                <div className="w-[350px] h-[250px] lg:w-[786px] lg:h-[548px] absolute top-0">
                    <Block1 className="cube cube--1 rotate-[-54] w-[37px] lg:w-[85px] h-auto" />
                    <Block2 className="cube cube--2 rotate-[-75] w-[37px] lg:w-[85px] h-auto" />
                    <Block3 className="cube cube--3 rotate-[45] w-[60px] lg:w-[138px] h-auto" />
                    <Block4 className="cube cube--4 rotate-[-54] w-[37px] lg:w-[85px] h-auto" />
                    <Block5 className="cube cube--5 rotate-[-60] w-[37px] lg:w-[85px] h-auto" />
                    <Block6 className="cube cube--6 rotate-[45] w-[60px] lg:w-[138px] h-auto" />
                    <Block7 className="cube cube--7 rotate-[-67] w-[37px] lg:w-[85px] h-auto" />
                    <Block8 className="cube cube--8 rotate-[-75] w-[37px] lg:w-[85px] h-auto" />
                </div>
            </div>
            <div className="flex flex-col items-center mt-[260px] md:mt-0 lg:mt-0 md:w-[400px]">
                <div className="text-2xl lg:text-5xl leading-[23px] lg:leading-[46px] mb-4 mt-2 lg:mt-20 text-nowrap">
                    {slogan1}
                </div>
                <div className="text-2xl lg:text-5xl leading-[23px] lg:leading-[46px] ps-[90px] lg:ps-[107px] mb-5 lg:mb-9 text-nowrap">
                    {slogan2}
                </div>
                <div className="w-[139px] h-[4px] bg-gradient-to-r from-golden2 to-golden3 self-center mb-5 lg:mb-10" />
                <div className="text-base lg:text-xl self-center mb-5 lg:mb-12">
                    {socialMediaText}
                </div>
                <div
                    id="Контент"
                    className="lg:w-[400px] flex flex-row flex-wrap items-center justify-center gap-7 self-center"
                >
                    {socialMediaLinks.map((item) => {
                        const Logo = item.logo;
                        return (
                            <div
                                key={item.title}
                                className="flex-1 rounded-[10px] bg-gradient-to-r from-golden2 to-golden3 grow shadow-[8px_8px_8px_rgba(156,137,77,0.25)] transition-shadow duration-300 ease-in-out "
                            >
                                <div
                                    className="rounded-[10px] m-[1px] hover:shadow-[inset_4px_4px_8px_rgba(156,137,77,0.25)]"
                                    style={{
                                        background: `var(--background)`,
                                    }}
                                >
                                    <a
                                        href={item.link}
                                        className="p-2 m-[1px] text-center text-lg lg:text-xl leading-[17px] lg:leading-5 rounded-[10px] cursor-pointer flex items-center flex-row gap-4 justify-between hover:shadow-[0px_4px_10px_0px_#C0A570]"
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
        </div>
    );
};
