import { useEffect, useRef } from 'react';

interface CountUpProps {
  value: number;
  decimals?: number;
  duration?: number;
  animateOnMount?: boolean;
  suffix?: string;
  className?: string;
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function CountUp({ value, decimals = 2, duration = 900, animateOnMount = false, suffix = '', className }: CountUpProps) {
  const spanRef  = useRef<HTMLSpanElement>(null);
  const fromRef  = useRef<number | null>(null);
  const rafRef   = useRef<number | null>(null);
  const mounted  = useRef(false);

  useEffect(() => {
    const el = spanRef.current;
    if (!el) return;

    const isFirstMount = !mounted.current;
    mounted.current = true;

    if (prefersReducedMotion() || (isFirstMount && !animateOnMount)) {
      el.textContent = value.toFixed(decimals) + suffix;
      fromRef.current = value;
      return;
    }

    const start = fromRef.current ?? (isFirstMount ? 0 : value);
    fromRef.current = value;

    if (start === value) return;

    if (rafRef.current) cancelAnimationFrame(rafRef.current);

    const startTime = performance.now();
    const diff = value - start;

    function frame(now: number) {
      const t = Math.min((now - startTime) / duration, 1);
      const current = start + diff * easeOutCubic(t);
      el!.textContent = current.toFixed(decimals) + suffix;
      if (t < 1) rafRef.current = requestAnimationFrame(frame);
      else { el!.textContent = value.toFixed(decimals) + suffix; fromRef.current = value; }
    }

    rafRef.current = requestAnimationFrame(frame);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [value, decimals, duration, animateOnMount, suffix]);

  return <span ref={spanRef} className={className}>{value.toFixed(decimals)}{suffix}</span>;
}
