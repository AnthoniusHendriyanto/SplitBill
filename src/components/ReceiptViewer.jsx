import { memo, useState, useRef, useCallback, useEffect } from 'react';
import Icon from './Icon';
import { cn } from '../utils/cn';

function ReceiptViewer({ src, alt, className }) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const start = useRef({ x: 0, y: 0 });
  const lastPan = useRef({ x: 0, y: 0 });
  const containerRef = useRef(null);

  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const delta = -Math.sign(e.deltaY) * 0.1;
    setZoom(prev => Math.max(0.25, Math.min(5, prev + delta)));
  }, []);

  const handleMouseDown = useCallback((e) => {
    if (e.button !== 0 || zoom <= 1) return;
    setIsPanning(true);
    start.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
    lastPan.current = { ...pan };
  }, [zoom, pan]);

  const handleMouseMove = useCallback((e) => {
    if (!isPanning) return;
    setPan({ x: e.clientX - start.current.x, y: e.clientY - start.current.y });
  }, [isPanning]);

  const stopPan = useCallback(() => setIsPanning(false), []);

  const handleDoubleClick = useCallback(() => {
    setZoom(prev => prev >= 2 ? 1 : 2.5);
    setPan({ x: 0, y: 0 });
  }, []);

  const reset = useCallback(() => { setZoom(1); setPan({ x: 0, y: 0 }); }, []);

  useEffect(() => { window.addEventListener('mouseup', stopPan); return () => window.removeEventListener('mouseup', stopPan); }, [stopPan]);

  return (
    <div ref={containerRef} className={cn('relative overflow-hidden rounded-xl bg-surface-raised select-none group', className)}>
      <div onWheel={handleWheel} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onDoubleClick={handleDoubleClick}
        className="w-full h-full flex items-center justify-center"
        style={{ cursor: isPanning ? 'grabbing' : zoom > 1 ? 'grab' : 'default' }}
      >
        <img src={src} alt={alt} draggable={false}
          className="max-w-full max-h-full pointer-events-none transition-transform duration-200 ease-out"
          style={{ transform: `translate(${pan.x}px,${pan.y}px) scale(${zoom})` }}
        />
      </div>
      <div className={cn(
        'absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-surface-elevated rounded-xl px-2 py-1 border border-border transition-opacity duration-200',
        zoom !== 1 ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 focus-within:opacity-100'
      )}>
        <button onClick={reset} className="w-6 h-6 flex items-center justify-center text-tertiary hover:text-primary transition-colors border-none bg-transparent cursor-pointer outline-none text-[10px]" title="Reset zoom">
          <Icon name="zoom_out_map" className="text-[10px]" />
        </button>
        <span className="text-[10px] font-numeric font-medium text-primary w-10 text-center">{Math.round(zoom * 100)}%</span>
        <button onClick={reset} className="w-6 h-6 flex items-center justify-center text-tertiary hover:text-primary transition-colors border-none bg-transparent cursor-pointer outline-none text-[10px]" title="Fit to screen">
          <Icon name="fit_screen" className="text-[10px]" />
        </button>
      </div>
    </div>
  );
}

export default memo(ReceiptViewer);
