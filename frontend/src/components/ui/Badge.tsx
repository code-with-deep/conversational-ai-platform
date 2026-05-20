import { cn } from '../../lib/utils';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info' | 'outline';
  className?: string;
  dot?: boolean;
}

const Badge = ({ children, variant = 'secondary', className, dot }: BadgeProps) => {
  const variants = {
    primary: 'bg-accent-subtle text-accent-hover border-accent/20',
    secondary: 'bg-bg-elevated text-text-secondary border-border',
    success: 'bg-success-subtle text-success border-success/20',
    warning: 'bg-warning-subtle text-warning border-warning/20',
    danger: 'bg-danger-subtle text-danger border-danger/20',
    info: 'bg-info-subtle text-info border-info/20',
    outline: 'bg-transparent text-text-secondary border-border hover:border-text-tertiary',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border transition-colors',
        variants[variant],
        className
      )}
    >
      {dot && (
        <span className={cn('w-1.5 h-1.5 rounded-full animate-pulse', {
          'bg-accent': variant === 'primary',
          'bg-success': variant === 'success',
          'bg-warning': variant === 'warning',
          'bg-danger': variant === 'danger',
          'bg-info': variant === 'info',
          'bg-text-tertiary': variant === 'secondary' || variant === 'outline',
        })} />
      )}
      {children}
    </span>
  );
};

export default Badge;
