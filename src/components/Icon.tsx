import { memo } from 'react';
import { cn } from '../utils/cn';

interface IconProps {
  name: string;
  className?: string;
  style?: React.CSSProperties;
}

function Icon({ name, className, ...rest }: IconProps) {
  return (
    <span className={cn("material-symbols-outlined", className)} aria-hidden="true" {...rest}>{name}</span>
  );
}

export default memo(Icon);
