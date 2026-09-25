import type { ButtonHTMLAttributes, ReactNode } from 'react';

type ActionButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  tooltip: string;
  variant?: 'danger' | 'success' | 'primary' | 'muted';
  children: ReactNode;
};

const variantClass = {
  danger: 'admin-btn-danger',
  success: 'admin-btn-success',
  primary: 'admin-btn-primary',
  muted: 'admin-btn-muted',
} as const;

/** Action button with an accessible hover/focus tooltip explaining the effect. */
export function ActionButton({
  tooltip,
  variant = 'danger',
  children,
  className = '',
  type = 'button',
  ...props
}: ActionButtonProps) {
  return (
    <span className="group relative inline-flex">
      <button type={type} className={`${variantClass[variant]} ${className}`} {...props}>
        {children}
      </button>
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 w-max max-w-xs -translate-x-1/2 rounded-lg bg-surface-dark px-3 py-2 text-xs leading-relaxed text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100"
      >
        {tooltip}
        <span className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-surface-dark" />
      </span>
    </span>
  );
}
