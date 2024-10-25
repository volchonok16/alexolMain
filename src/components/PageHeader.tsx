// import { useEffect, useState } from "react";
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

  return (
    <div className="h-[90px] flex flex-row items-center gap-7">
      <Logo
        style={{
          filter: `var(--filterStyle)`,
        }}
        className="h-full"
      />
      <div className="flex flex-row items-center justify-center gap-7 flex-1">
        {menuItems.map((item) => (
          <div key={item} className="px-7 py-1 hover:bg-golden/25 text-center text-2xl hover:text-golden rounded-[10px] cursor-pointer">
            {item}
          </div>
        ))}
      </div>
      <Toggle
        style={{
          transform: `rotate(${rotateToggle}deg)`,
          filter: `var(--filterStyle)`,
        }}
        onClick={onChangeThemeHandler}
      />
    </div>
  );
};
