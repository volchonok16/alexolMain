import { InputHTMLAttributes } from 'react';
import './Input.scss';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = ({ label, error, className = '', ...props }: InputProps) => {
  const inputClasses = ['input', error && 'input--error', className].filter(Boolean).join(' ');

  if (label || error) {
    return (
      <div className="input-wrapper">
        {label && <label className="input-wrapper__label">{label}</label>}
        <input className={inputClasses} {...props} />
        {error && <span className="input-wrapper__error">{error}</span>}
      </div>
    );
  }

  return <input className={inputClasses} {...props} />;
};
