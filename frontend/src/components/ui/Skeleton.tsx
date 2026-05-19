import { cn } from '../../lib/utils';

interface SkeletonProps {
  className?: string;
  variant?: 'rect' | 'circle' | 'text';
}

const Skeleton = ({ className, variant = 'rect' }: SkeletonProps) => {
  return (
    <div
      className={cn(
        'skeleton',
        {
          'rounded-md': variant === 'rect',
          'rounded-full': variant === 'circle',
          'h-4 w-full rounded': variant === 'text',
        },
        className
      )}
    />
  );
};

export default Skeleton;
