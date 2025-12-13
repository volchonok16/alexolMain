import { ReactNode } from "react";
import { LucideIcon } from "lucide-react";
import "./IconCard.scss";

interface IconCardProps {
  icon: LucideIcon;
  label: string;
  value: string | ReactNode;
}

export const IconCard = ({ icon: Icon, label, value }: IconCardProps) => {
  return (
    <div className="icon-card">
      <div className="icon-card__icon-wrapper">
        <Icon />
      </div>
      <div className="icon-card__content">
        <div className="icon-card__label">{label}</div>
        <div className="icon-card__value">{value}</div>
      </div>
    </div>
  );
};
