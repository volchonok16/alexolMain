import { AlertCircle } from 'lucide-react';
import './ErrorState.scss';

interface ErrorStateProps {
  title?: string;
  description?: string;
  buttonText?: string;
  onButtonClick?: () => void;
}

export const ErrorState = ({
  title = 'Что-то пошло не так',
  description = 'Не удалось загрузить данные. Попробуйте обновить страницу.',
  buttonText = 'Обновить',
  onButtonClick = () => window.location.reload(),
}: ErrorStateProps) => {
  return (
    <div className="error-state">
      <div className="error-state__icon">
        <AlertCircle size={40} />
      </div>
      <h3 className="error-state__title">{title}</h3>
      <p className="error-state__description">{description}</p>
      <button onClick={onButtonClick} className="error-state__button">
        {buttonText}
      </button>
    </div>
  );
};
