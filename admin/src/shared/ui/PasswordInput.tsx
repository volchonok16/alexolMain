import { useState, InputHTMLAttributes } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import './PasswordInput.scss';

type PasswordInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>;

export const PasswordInput = ({ className = '', ...props }: PasswordInputProps) => {
  const [show, setShow] = useState(false);

  return (
    <div className="password-wrapper">
      <input
        {...props}
        type={show ? 'text' : 'password'}
        className={className}
      />
      <button
        type="button"
        className="password-toggle"
        onClick={() => setShow(v => !v)}
        aria-label={show ? 'Скрыть пароль' : 'Показать пароль'}
        tabIndex={-1}
        disabled={props.disabled}
      >
        {show ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );
};
