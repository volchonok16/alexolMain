import { FC, ReactNode } from "react";

export interface PopupProps {
  children: ReactNode;
}

const Popup: FC<PopupProps> = (props) => {
    const { children } = props;

    return (
        <div
            className=" fixed inset-0 ease-in-out duration-300 z-50"
        >
            <div className="w-screen bg-slate-500 p-8 rounded-lg shadow-lg z-30">
                {children} 
            </div>
            
        </div>
    );
};

export default Popup;