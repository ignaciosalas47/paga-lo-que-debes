import type { CSSProperties, ReactNode } from 'react';
import { useInView } from '../lib/useInView';

interface RiseProps {
  /** Milliseconds to wait before the entrance starts; used to stagger siblings. */
  delay?: number;
  className?: string;
  children: ReactNode;
}

/** Wraps content so it fades and rises into place the first time it scrolls into view. */
export function Rise({ delay = 0, className = '', children }: RiseProps) {
  const [ref, seen] = useInView<HTMLDivElement>(0.15);
  const classes = ['rise', seen ? 'rise--in' : '', className].filter(Boolean).join(' ');

  return (
    <div ref={ref} className={classes} style={{ '--delay': `${delay}ms` } as CSSProperties}>
      {children}
    </div>
  );
}
