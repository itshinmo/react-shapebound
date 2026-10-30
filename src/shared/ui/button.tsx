import { Link } from 'react-router';

import { buttonClassName } from './button-styles';

import type { ButtonSize, ButtonVariant } from './button-styles';
import type { ButtonHTMLAttributes, ComponentProps, ReactNode, Ref } from 'react';

interface ButtonStyleProps {
  readonly variant?: ButtonVariant;
  readonly size?: ButtonSize;
  readonly className?: string;
  readonly children: ReactNode;
}

type ButtonProps = ButtonStyleProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'ref'> & {
    readonly ref?: Ref<HTMLButtonElement>;
  };

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  type = 'button',
  ref,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      ref={ref}
      type={type}
      className={buttonClassName({ variant, size, className })}
      {...props}
    >
      {children}
    </button>
  );
}

type LinkButtonProps = ButtonStyleProps &
  Omit<ComponentProps<typeof Link>, 'to' | 'className' | 'children'> & {
    readonly to: string;
  };

export function LinkButton({
  to,
  variant = 'primary',
  size = 'md',
  className,
  children,
  ...props
}: LinkButtonProps) {
  return (
    <Link to={to} className={buttonClassName({ variant, size, className })} {...props}>
      {children}
    </Link>
  );
}
