'use client';

import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { useEffect, useState } from 'react';

interface AnimatedProgressRingProps {
  progress: number; // 0-100
  size?: number;
  strokeWidth?: number;
  color?: string;
  backgroundColor?: string;
  showPercentage?: boolean;
  showCheckmark?: boolean;
  label?: string;
  animate?: boolean;
}

export function AnimatedProgressRing({
  progress,
  size = 120,
  strokeWidth = 8,
  color = '#10b981',
  backgroundColor = '#e5e7eb',
  showPercentage = true,
  showCheckmark = false,
  label,
  animate: shouldAnimate = true,
}: AnimatedProgressRingProps) {
  const [displayProgress, setDisplayProgress] = useState(0);
  const motionProgress = useMotionValue(0);

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  // Animated stroke dash offset
  const strokeDashoffset = useTransform(
    motionProgress,
    [0, 100],
    [circumference, 0]
  );

  useEffect(() => {
    if (shouldAnimate) {
      // Animate from current to target
      const animation = animate(motionProgress, progress, {
        duration: 1.5,
        ease: [0.4, 0, 0.2, 1], // Custom easing
        onUpdate: (latest) => {
          setDisplayProgress(Math.round(latest));
        },
      });

      return () => animation.stop();
    } else {
      motionProgress.set(progress);
      setDisplayProgress(Math.round(progress));
    }
  }, [progress, shouldAnimate, motionProgress]);

  const isComplete = progress >= 100;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={backgroundColor}
          strokeWidth={strokeWidth}
        />

        {/* Animated progress circle */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={isComplete && showCheckmark ? '#10b981' : color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          style={{ strokeDashoffset }}
          initial={false}
        />
      </svg>

      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {showCheckmark && isComplete ? (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.5, type: 'spring', stiffness: 200 }}
          >
            <svg className="h-8 w-8 text-green-500\" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </motion.div>
        ) : (
          <>
            {showPercentage && (
              <motion.span
                className="text-xl font-bold"
                style={{ color }}
                initial={shouldAnimate ? { opacity: 0, y: 10 } : { opacity: 1, y: 0 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                {displayProgress}%
              </motion.span>
            )}
            {label && (
              <span className="text-xs text-gray-500 mt-1">{label}</span>
            )}
          </>
        )}
      </div>
    </div>
  );
}
