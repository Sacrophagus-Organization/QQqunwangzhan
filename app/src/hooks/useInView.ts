import { useEffect, useRef, useState } from 'react';

/**
 * 滚动进入视口检测 Hook，配合 `.reveal` / `.in-view` 动画类使用。
 * once 默认 true（只触发一次）。
 */
export function useInView<T extends HTMLElement = HTMLDivElement>(
  options?: IntersectionObserverInit & { once?: boolean }
) {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);
  const once = options?.once ?? true;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          if (once) observer.disconnect();
        } else if (!once) {
          setInView(false);
        }
      },
      {
        threshold: options?.threshold ?? 0.15,
        rootMargin: options?.rootMargin ?? '0px 0px -40px 0px',
      }
    );
    observer.observe(el);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [once, options?.threshold, options?.rootMargin]);

  return { ref, inView };
}
