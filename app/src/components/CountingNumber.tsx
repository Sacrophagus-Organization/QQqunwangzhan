import { useState, useEffect, useRef } from 'react';

interface CountingNumberProps {
  value: number | string;
  duration?: number;
}

export function CountingNumber({ value, duration = 800 }: CountingNumberProps) {
  const [display, setDisplay] = useState(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (typeof value === 'string' || value === 0) {
      setDisplay(0);
      return;
    }

    const startTime = performance.now();
    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(eased * value));
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [value, duration]);

  if (typeof value === 'string') return <span>{value}</span>;
  return <span>{display}</span>;
}
