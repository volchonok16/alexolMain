import { AlertCircle } from 'lucide-react';
import { useTranslation } from '@/shared/utils/translations';
import './ErrorState.scss';

interface ErrorStateProps {
  title?: string;
  description?: string;
  buttonText?: string;
  onButtonClick?: () => void;
}

export const ErrorState = ({
  title,
  description,
  buttonText,
  onButtonClick = () => window.location.reload(),
}: ErrorStateProps) => {
  const { t } = useTranslation();

  return (
    <div className="error-state">
      <div className="error-state__icon">
        <AlertCircle size={40} />
      </div>
      <h3 className="error-state__title">{title ?? t('news.error')}</h3>
      <p className="error-state__description">{description ?? t('news.errorDescription')}</p>
      <button onClick={onButtonClick} className="error-state__button">
        {buttonText ?? t('news.reload')}
      </button>
    </div>
  );
};
