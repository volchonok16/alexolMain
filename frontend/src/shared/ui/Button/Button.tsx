import { ButtonHTMLAttributes, ReactNode } from 'react';
import './Button.scss';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'small' | 'medium' | 'large';
  children: ReactNode;
}

export const Button = ({ variant = 'primary', size = 'medium', children, className = '', ...props }: ButtonProps) => {
  const classes = ['button', `button--${variant}`, size !== 'medium' && `button--${size}`, className]
    .filter(Boolean)
    .join(' ');

  return (
    <button className={classes} {...props}>
      {children}
    </button>
  );
};
