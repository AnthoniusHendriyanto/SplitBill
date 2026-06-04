import { useState, useEffect } from 'react';

export default function useIsMobile(breakpoint = 1024) {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < breakpoint);

  useEffect(() => {
    let frameId;
    const check = () => {
      cancelAnimationFrame(frameId);
      frameId = requestAnimationFrame(() => setIsMobile(window.innerWidth < breakpoint));
    };
    window.addEventListener('resize', check);
    return () => {
      window.removeEventListener('resize', check);
      cancelAnimationFrame(frameId);
    };
  }, [breakpoint]);

  return isMobile;
}
