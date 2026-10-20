import { memo } from 'react';
import { cn } from '../utils/cn';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circle';
}

function Skeleton({ className, variant = 'text' }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'animate-pulse bg-card rounded-xl',
        variant === 'circle' ? 'rounded-full' : 'rounded-xl',
        className
      )}
    />
  );
}

export default memo(Skeleton);
