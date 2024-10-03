import { DividerSolid } from "@/widgets/DividerSolid";
import bg from "../assets/experts/bg.png";
import avatar1 from "../assets/experts/avatar-1.png";
import { useState } from "react";

export const Experts = () => {
    const [openDescId, setOpenDescId] = useState<number | null>(null);

    const onHoverAvatar = (id: number) => setOpenDescId(id);
    const onMouseLeave = () => setOpenDescId(null);

    return (
        <section className="w-full max-w-[1440px] h-[920px] mt-12 pt-12">
            <div className="flex flex-col items-center">
                <p className="text-[48px] leading-normal">Наши эксперты</p>
                <DividerSolid className="w-[130px]" />
                <p className="mt-8">
                    Каждый из наших сотрудников является экспертом в своей
                    области с опытом <b>более 5 лет</b>
                </p>
            </div>

            <div
                className="h-[500px] mt-8 pl-32 flex justify-center items-center"
                style={{ backgroundImage: `url(${bg})` }}
            >
                <div className="flex flex-wrap w-[768px] gap-8">
                    <div
                        className="w-[350px] cursor-pointer flex"
                        onMouseEnter={() => onHoverAvatar(1)}
                        onMouseLeave={onMouseLeave}
                    >
                        <img src={avatar1} alt="" />
                        {openDescId === 1 && (
                            <div className="w-[236px] h-[134px] rounded-lg px-4 py-2 ml-2 text-white bg-gradient-to-r from-[#1D2228] to-[#313944]">
                                <p>
                                    Топ-1 специалист в области аналитики, может
                                    самостоятельно поднять с 0 целую контору
                                </p>
                            </div>
                        )}
                    </div>
                    <div
                        className="w-[350px] cursor-pointer flex"
                        onMouseEnter={() => onHoverAvatar(2)}
                        onMouseLeave={onMouseLeave}
                    >
                        <img src={avatar1} alt="" />
                        {openDescId === 2 && (
                            <div className="w-[236px] h-[134px] rounded-lg px-4 py-2 ml-2 text-white bg-gradient-to-r from-[#1D2228] to-[#313944]">
                                <p>
                                    Топ-1 специалист в области аналитики, может
                                    самостоятельно поднять с 0 целую контору
                                </p>
                            </div>
                        )}
                    </div>
                    <div
                        className="w-[350px] cursor-pointer flex"
                        onMouseEnter={() => onHoverAvatar(3)}
                        onMouseLeave={onMouseLeave}
                    >
                        <img src={avatar1} alt="" />
                        {openDescId === 3 && (
                            <div className="w-[236px] h-[134px] rounded-lg px-4 py-2 ml-2 text-white bg-gradient-to-r from-[#1D2228] to-[#313944]">
                                <p>
                                    Топ-1 специалист в области аналитики, может
                                    самостоятельно поднять с 0 целую контору
                                </p>
                            </div>
                        )}
                    </div>
                    <div
                        className="w-[350px] cursor-pointer flex"
                        onMouseEnter={() => onHoverAvatar(4)}
                        onMouseLeave={onMouseLeave}
                    >
                        <img src={avatar1} alt="" />
                        {openDescId === 4 && (
                            <div className="w-[236px] h-[134px] rounded-lg px-4 py-2 ml-2 text-white bg-gradient-to-r from-[#1D2228] to-[#313944]">
                                <p>
                                    Топ-1 специалист в области аналитики, может
                                    самостоятельно поднять с 0 целую контору
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </section>
    );
};
