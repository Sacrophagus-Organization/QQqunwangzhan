import { useEffect, useRef, useCallback } from 'react';

/**
 * Processes HTML content to replace img src with data-src for lazy loading.
 * Adds blur-up placeholder and required CSS classes.
 */
export function processContentForLazyImages(html: string): string {
  if (!html || typeof html !== 'string') return html;

  // SVG placeholder (dark blue-gray, matches the site theme)
  const placeholder =
    'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 400 300%22%3E%3Crect fill=%22%23111827%22 width=%22400%22 height=%22300%22/%3E%3C/svg%3E';

  return html.replace(
    /<img\s+([^>]*?)src\s*=\s*"([^"]+)"([^>]*?)>/g,
    (match, _before, src, _after) => {
      // Skip if already a data URI placeholder or empty SVG
      if (src.startsWith('data:image/svg')) return match;
      // Skip small inline icons
      if (src.startsWith('data:') && src.length < 200) return match;

      // Add lazy-image class if not already present
      const hasLazyClass = /class\s*=\s*"([^"]*lazy-image[^"]*)"/.test(match);
      let newMatch = match;
      if (!hasLazyClass) {
        if (/class\s*=\s*"/.test(match)) {
          newMatch = match.replace(/class\s*=\s*"/, 'class="lazy-image ');
        } else {
          newMatch = match.replace('<img ', '<img class="lazy-image" ');
        }
      }
      // Replace src with placeholder, move real src to data-src
      newMatch = newMatch.replace(
        new RegExp(`src\\s*=\\s*"${src.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`),
        `src="${placeholder}" data-src="${src}"`
      );
      return newMatch;
    }
  );
}

/**
 * Sets up IntersectionObserver to lazy-load images within a container.
 * Images with data-src attribute will be loaded when they enter the viewport.
 */
export function useImageLazyLoad(
  containerRef: React.RefObject<HTMLElement | null>,
  deps: any[] = []
) {
  const observerRef = useRef<IntersectionObserver | null>(null);

  const observe = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    // Disconnect previous observer
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const img = entry.target as HTMLImageElement;
            const dataSrc = img.getAttribute('data-src');
            if (dataSrc) {
              // Preload the image, then swap
              const tempImg = new Image();
              tempImg.onload = () => {
                img.src = dataSrc;
                img.removeAttribute('data-src');
                img.classList.add('lazy-loaded');
                observer.unobserve(img);
              };
              tempImg.onerror = () => {
                // Keep placeholder on error
                observer.unobserve(img);
              };
              tempImg.src = dataSrc;
            }
          }
        });
      },
      {
        rootMargin: '150px', // Load 150px before entering viewport
        threshold: 0.01,
      }
    );

    observerRef.current = observer;

    // Find all lazy images in container
    const lazyImages = container.querySelectorAll('img[data-src]');
    lazyImages.forEach((img) => observer.observe(img));
  }, [containerRef]);

  useEffect(() => {
    observe();

    // Re-observe when dependencies change (e.g., new messages loaded)
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [observe, ...deps]);

  return { refresh: observe };
}
