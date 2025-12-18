import { ReactNode, HTMLAttributes } from 'react';
import './Card.scss';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  interactive?: boolean;
}

interface CardSubComponentProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export const Card = ({ children, interactive = false, className = '', ...props }: CardProps) => {
  const classes = ['card', interactive && 'card--interactive', className].filter(Boolean).join(' ');

  return (
    <div className={classes} {...props}>
      {children}
    </div>
  );
};

export const CardHeader = ({ children, className = '', ...props }: CardSubComponentProps) => (
  <div className={`card__header ${className}`} {...props}>
    {children}
  </div>
);

export const CardTitle = ({ children, className = '', ...props }: CardSubComponentProps) => (
  <h3 className={`card__title ${className}`} {...props}>
    {children}
  </h3>
);

export const CardDescription = ({ children, className = '', ...props }: CardSubComponentProps) => (
  <p className={`card__description ${className}`} {...props}>
    {children}
  </p>
);

export const CardContent = ({ children, className = '', ...props }: CardSubComponentProps) => (
  <div className={`card__content ${className}`} {...props}>
    {children}
  </div>
);

export const CardFooter = ({ children, className = '', ...props }: CardSubComponentProps) => (
  <div className={`card__footer ${className}`} {...props}>
    {children}
  </div>
);
