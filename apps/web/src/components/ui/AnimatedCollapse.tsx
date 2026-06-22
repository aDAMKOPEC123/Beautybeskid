import type { CSSProperties, ReactNode } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';

type AnimatedCollapseProps = {
  open: boolean;
  children: ReactNode;
  className?: string;
  innerClassName?: string;
  style?: CSSProperties;
  innerStyle?: CSSProperties;
};

export function AnimatedCollapse({
  open,
  children,
  className,
  innerClassName,
  style,
  innerStyle,
}: AnimatedCollapseProps) {
  const shouldReduce = useReducedMotion();

  if (shouldReduce) {
    if (!open) return null;

    return (
      <div className={className} style={style}>
        <div className={innerClassName} style={innerStyle}>
          {children}
        </div>
      </div>
    );
  }

  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.div
          className={cn('overflow-hidden', className)}
          style={style}
          initial={{ height: 0, opacity: 0 }}
          animate={{
            height: 'auto',
            opacity: 1,
            transition: {
              height: {
                duration: 0.3,
                ease: [0.22, 1, 0.36, 1],
              },
              opacity: {
                duration: 0.18,
                delay: 0.04,
                ease: 'easeOut',
              },
            },
          }}
          exit={{
            height: 0,
            opacity: 0,
            transition: {
              height: {
                duration: 0.22,
                ease: [0.4, 0, 1, 1],
              },
              opacity: {
                duration: 0.12,
                ease: 'easeIn',
              },
            },
          }}
        >
          <motion.div
            className={innerClassName}
            style={innerStyle}
            initial={{ y: -8, opacity: 0 }}
            animate={{
              y: 0,
              opacity: 1,
              transition: {
                duration: 0.2,
                ease: [0.22, 1, 0.36, 1],
              },
            }}
            exit={{
              y: -4,
              opacity: 0,
              transition: {
                duration: 0.12,
                ease: 'easeIn',
              },
            }}
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
