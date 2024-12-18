import Popup from "./Popup";

interface IDirProps {
  id: string;
  number: string;
  bullet: string;
  text: string;
  col: string;
  theme: string;
  isPopupOpen: boolean;
  openPopup: (event: React.MouseEvent<HTMLElement>) => void;
  closePopup: (event: React.MouseEvent<HTMLElement>) => void;
  onMouseEnterHandler: (event: React.MouseEvent<HTMLElement>) => void;
  onMouseLeaveHandler: (event: React.MouseEvent<HTMLElement>) => void;
}

const Direction: React.FC<IDirProps> = ({
    id,
    number,
    bullet,
    text,
    col,
    theme,
    isPopupOpen,
    openPopup,
    closePopup,
    onMouseEnterHandler,
    onMouseLeaveHandler,
}) => {
    const widthUser = window.innerWidth;

    const textColor = theme === "dark-theme" ? "text-white" : "text-dark-gray";
    const bg =
    theme === "dark-theme"
        ? "bg-gradient-to-r from-gray2 to-gray1"
        : "bg-white";

    return (
        <>
            {widthUser < 1024 ? (
                <>
                    <div
                        id={id}
                        className={`relative h-[125px] lg:h-[414px] content-center drop-shadow-xl ${bg} justify-items-center rounded-[20px] ${col} ${textColor} z-0`}
                        onClick={openPopup}
                    >
                        <div className="absolute top-[8px] lg:top-[20px] left-[8px] lg:left-[20px] h-[-20px] lg:h-auto w-[22px] lg:w-[80px] bg-gradient-to-r from-golden2 to-golden3 text-white text-[14px] lg:text-[48px] rounded-[5px] lg:rounded-[10px] text-center content-center">
                            {number}
                        </div>

                        <div className=" relative text-center text-[18px] lg:text-[36px] font-medium ">
                            {bullet}
                        </div>
                    </div>
                    {isPopupOpen && <Popup closePopup={closePopup} id={id} theme={theme} bullet={bullet} text={text} number={number} />}
                </>
            ) : (
                <div
                    id={id}
                    className={`h-[125px] lg:h-[414px] content-center drop-shadow-xl ${bg} justify-items-center rounded-[20px] ${col} ${textColor}`}
                    onMouseEnter={onMouseEnterHandler}
                    onMouseLeave={onMouseLeaveHandler}
                >
                    <div className="absolute top-[8px] lg:top-[20px] left-[8px] lg:left-[20px] h-[20px] lg:h-auto w-[22px] lg:w-[80px] bg-gradient-to-r from-golden2 to-golden3 text-white text-[14px] lg:text-[48px] rounded-[5px] lg:rounded-[10px] text-center content-center">
                        {number}
                    </div>
                    {isPopupOpen ? (
                        <div className=" justify-start p-5 gap-y-5 mt-8">
                            <div className="text-[18px] lg:text-[24px] font-medium ">
                                {bullet}
                            </div>
                            <div className="text-center lg:text-start text-[14px] lg:text-[18px]">
                                {text}
                            </div>
                        </div>
                    ) : (
                        <div className="text-center text-[18px] lg:text-[36px] font-medium ">
                            {bullet}
                        </div>
                    )}
                </div>
            )}
        </>
    );
};

export default Direction;
