import { useEffect, useRef } from 'react';

const COLORS = ['#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ef4444', '#fbbf24'];
const COUNT   = 60;

const SEEDS = Array.from({ length: COUNT }, (_, i) => ({
  id:       i,
  color:    COLORS[i % COLORS.length],
  left:     `${(i * 1.7 % 97) + 1}%`,
  delay:    `${(i * 0.013) % 0.8}s`,
  duration: `${1.5 + (i * 0.017) % 1}s`,
  w:        `${6 + (i * 3 % 9)}px`,
  h:        `${6 + (i * 2 % 9)}px`,
  radius:   i % 3 === 0 ? '50%' : i % 3 === 1 ? '2px' : '1px',
}));

export const ConfettiEffect: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const done = useRef(false);

  useEffect(() => {
    const t = setTimeout(() => { if (!done.current) { done.current = true; onComplete(); } }, 2500);
    return () => clearTimeout(t);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 pointer-events-none z-50" aria-hidden="true">
      {SEEDS.map(p => (
        <div
          key={p.id}
          style={{
            position: 'absolute', top: 0, left: p.left,
            width: p.w, height: p.h,
            background: p.color, borderRadius: p.radius,
            animationName: 'confettiFall',
            animationDuration: p.duration,
            animationDelay: p.delay,
            animationFillMode: 'forwards',
            animationTimingFunction: 'cubic-bezier(0.25,0.46,0.45,0.94)',
          }}
        />
      ))}
    </div>
  );
};
