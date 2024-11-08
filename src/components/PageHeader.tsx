import Logo from "../common/assets/Logo1.svg";
import Toggle from "../common/assets/Toggle.svg";
import { menuItems } from "./constants";

interface IProps {
  theme: string;
  setTheme: (value: string) => void;
}

export const PageHeader: React.FC<IProps> = ({ theme, setTheme }) => {
    const onChangeThemeHandler = () => {
        const newTheme = theme === "dark-theme" ? "light-theme" : "dark-theme";
        setTheme(newTheme);
        localStorage.setItem("theme", newTheme);
    };

    const rotateToggle = theme === "dark-theme" ? 180 : 0;

    const handleScrollToAnchor = (item: string) => {
        const anchor = document.getElementById(item);
        if (anchor) {
            anchor.scrollIntoView({ behavior: "smooth" });
        }
    };

    return (
        <div className="h-[100px] lg:h-[90px] flex flex-wrap justify-center items-center gap-4 lg:gap-7 relative">
            <Logo
                style={{
                    filter: `var(--filterStyle)`,
                }}
                className="w-[150px] h-auto lg:w-[288px]"
            />
            <div className="flex flex-row items-center justify-center gap-4 lg:gap-7 flex-1">
                {menuItems.map((item) => (
                    <div
                        key={item}
                        className="lg:px-7 lg:py-1 hover:bg-golden/25 text-center text-sm md:text-base lg:text-2xl hover:text-golden lg:rounded-[10px] rounded-[5px] cursor-pointer"
                        onClick={() => handleScrollToAnchor(item)}
                    >
                        {item}
                    </div>
                ))}
            </div>
            <Toggle
                style={{
                    transform: `rotate(${rotateToggle}deg)`,
                    filter: `var(--filterStyle)`,
                }}
                className="w-[40px] h-auto lg:w-[50px] absolute right-0 top-0"
                onClick={onChangeThemeHandler}
            />
        </div>
    );
};
