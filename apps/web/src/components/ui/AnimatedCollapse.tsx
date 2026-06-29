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
  const heightDuration = shouldReduce ? 0.18 : 0.3;
  const opacityDuration = shouldReduce ? 0.12 : 0.18;
  const contentDuration = shouldReduce ? 0.14 : 0.2;
  const contentOffset = shouldReduce ? -2 : -8;
  const exitOffset = shouldReduce ? -1 : -4;

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
                duration: heightDuration,
                ease: [0.22, 1, 0.36, 1],
              },
              opacity: {
                duration: opacityDuration,
                delay: shouldReduce ? 0 : 0.04,
                ease: 'easeOut',
              },
            },
          }}
          exit={{
            height: 0,
            opacity: 0,
            transition: {
              height: {
                duration: shouldReduce ? 0.16 : 0.22,
                ease: [0.4, 0, 1, 1],
              },
              opacity: {
                duration: shouldReduce ? 0.1 : 0.12,
                ease: 'easeIn',
              },
            },
          }}
        >
          <motion.div
            className={innerClassName}
            style={innerStyle}
            initial={{ y: contentOffset, opacity: 0 }}
            animate={{
              y: 0,
              opacity: 1,
              transition: {
                duration: contentDuration,
                ease: [0.22, 1, 0.36, 1],
              },
            }}
            exit={{
              y: exitOffset,
              opacity: 0,
              transition: {
                duration: shouldReduce ? 0.1 : 0.12,
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
