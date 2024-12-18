interface IPopupProps {
  bullet: string;
  text: string;
  number: string;
  id:string,
  closePopup: (event: React.MouseEvent<HTMLElement>) => void;
  theme: string;
}

const Popup: React.FC<IPopupProps> = ({closePopup,id, bullet, text, number, theme }) => {
    const textColor = theme === "dark-theme" ? "text-white" : "text-dark-gray";
    const bg =
    theme === "dark-theme"
        ? "bg-gradient-to-r from-gray2 to-gray1"
        : "bg-white";

    return (
        <div className="fixed w-[95vw] h-[1000px] z-40 bg-black bg-opacity-50">
            <div
                className={`absolute flex top-[20%]  gap-[20px]  justify-start z-50 flex-col items-start rounded-lg shadow-lg  py-[20px] px-[13px] ${bg} ${textColor}`}
            >
                <div className="top-[8px]  left-[8px] h-[-50px] w-[50px]  bg-gradient-to-r from-golden2 to-golden3 text-white text-[30px]  rounded-[10px] lg:rounded-[10px] text-center content-center">
                    {number}
                </div>
                <div id={id} className="absolute top-[8px]  right-[8px] h-[-20px] w-[20px]  bg-gradient-to-r from-golden2 to-golden3 text-white text-[10px]  rounded-[10px] lg:rounded-[10px] text-center content-center"
                    onClick={closePopup}
                >
        X
                </div>
                <div className="text-[18px] lg:text-[36px] font-medium">{bullet}</div>
                <div className="text-[14px] lg:text-[18px]">{text}</div>
            </div>
        </div>
    );
};

export default Popup;
