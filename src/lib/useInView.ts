import { useEffect, useRef, useState } from 'react';

/**
 * Reports once whether the referenced element has entered the viewport.
 * The observer disconnects after the first intersection, so the element animates only once.
 *
 * @param threshold Fraction of the element that must be visible to count as seen.
 * @returns A ref to attach to the element and whether it has been seen.
 */
export function useInView<T extends Element>(threshold = 0.2) {
  const ref = useRef<T>(null);
  const [seen, setSeen] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        setSeen(true);
        observer.disconnect();
      },
      { threshold },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [threshold]);

  return [ref, seen] as const;
}
