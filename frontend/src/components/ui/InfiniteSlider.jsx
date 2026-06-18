import React, { useState, useEffect, useRef } from 'react';
import { motion, useMotionValue, animate } from 'framer-motion';
import useMeasure from 'react-use-measure';

/**
 * InfiniteSlider — continuously scrolls its children in a seamless loop.
 * direction='left'  → items scroll left  (enter from right)
 * direction='right' → items scroll right (enter from left)
 * Slows on hover.
 */
function InfiniteSlider({
  children,
  duration = 35,
  gap = 20,
  durationOnHover = 80,
  direction = 'left',
}) {
  const [firstRef, { width: firstSetWidth }] = useMeasure();
  const xVal = useMotionValue(direction === 'right' ? 0 : 0);
  const [hovering, setHovering] = useState(false);
  const controlsRef = useRef(null);
  const childArray = React.Children.toArray(children);

  useEffect(() => {
    if (!firstSetWidth) return;

    const dist = firstSetWidth + gap;
    // left: 0 → -dist   right: -dist → 0
    const from = direction === 'right' ? -dist : 0;
    const to   = direction === 'right' ? 0     : -dist;

    xVal.set(from);

    controlsRef.current = animate(xVal, [from, to], {
      ease: 'linear',
      duration,
      repeat: Infinity,
      repeatType: 'loop',
      repeatDelay: 0,
    });

    return () => controlsRef.current?.stop();
  }, [firstSetWidth, gap, duration, direction, xVal]);

  useEffect(() => {
    if (!controlsRef.current) return;
    controlsRef.current.speed = hovering ? duration / durationOnHover : 1;
  }, [hovering, duration, durationOnHover]);

  return (
    <div
      style={{ overflow: 'hidden', width: '100%' }}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      <motion.div style={{ x: xVal, display: 'flex', gap, width: 'max-content' }}>
        <div ref={firstRef} style={{ display: 'flex', gap }}>
          {childArray}
        </div>
        <div style={{ display: 'flex', gap }}>
          {childArray}
        </div>
      </motion.div>
    </div>
  );
}

export default InfiniteSlider;
