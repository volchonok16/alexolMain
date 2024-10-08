import { FC, ReactNode } from "react";

export interface LayoutProps {
    children: ReactNode;
}

const Layout: FC<LayoutProps> = (props) => {
    const { children } = props;

    return (
        <div className="w-100 h-100 bg-white">
            <div className="overflow-x-hidden sm:max-w-[1440px] mx-auto">
                <div className="flex flex-col items-center min-h-screen w-full mb-10 sm:mb-20 text-dark-gray pt-9">
                    {/* <PageHeader /> */}
                    <div className="flex-1 w-full">{children}</div>
                </div>
            </div>
        </div>
    );
};

export default Layout;
