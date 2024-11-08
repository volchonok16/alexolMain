interface IProps {
  className?: string;
}

export const DividerDots = (props: IProps) => {
    return (
        <div className={`${props.className} flex items-center`}>
            <div className="h-1 w-[80px] lg:w-[200px] bg-gradient-to-r from-[#97794D] to-[#E3CB8F]"></div>
            <div className="mx-2 rounded-full bg-gradient-to-r from-[#97794D] to-[#E3CB8F] w-[6px] h-[6px] lg:w-[11px] w-[6px] h-[6px] lg:h-[11px]"></div>
            <div className="mx-2 rounded-full bg-gradient-to-r from-[#97794D] to-[#E3CB8F] w-[6px] h-[6px] lg:w-[11px] w-[6px] h-[6px] lg:h-[11px]"></div>
            <div className="mx-2 rounded-full bg-gradient-to-r from-[#97794D] to-[#E3CB8F] w-[6px] h-[6px] lg:w-[11px] w-[6px] h-[6px] lg:h-[11px]"></div>
            <div className="h-1 w-[80px] lg:w-[200px] bg-gradient-to-r from-[#97794D] to-[#E3CB8F]"></div>
        </div>
    );
};
