interface IProps {
  className?: string;
}

export const DividerSolid = (props: IProps) => {
  const { className } = props;

  return (
    <div
      className={`${className} h-1 w-[270px] bg-gradient-to-r from-[#97794D] to-[#E3CB8F]`}
    />
  );
};
