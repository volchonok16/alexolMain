import { FC, ReactNode } from "react";

export interface LayoutProps {
  children: ReactNode;
}

const Layout: FC<LayoutProps> = (props) => {
  const { children } = props;

  return (
    <div
      className="w-100 h-100"
      style={{
        backgroundColor: `var(--background)`,
        color: `var(--color-text)`,
      }}
    >
      <div className="overflow-x-hidden sm:max-w-[1440px] mx-auto">
        <div className="px-4 flex flex-col items-center min-h-screen w-full pt-9">
          {/* <PageHeader /> */}
          <div className="flex-1 w-full">{children}</div>
        </div>
      </div>
    </div>
  );
};

export default Layout;
