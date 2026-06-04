import { memo } from 'react';
import { cn } from '../utils/cn';

interface IconProps {
  name: string;
  className?: string;
}

function Icon({ name, className }: IconProps) {
  return (
    <span className={cn("material-symbols-outlined", className)} aria-hidden="true">{name}</span>
  );
}

export default memo(Icon);
