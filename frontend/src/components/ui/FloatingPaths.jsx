import React from 'react';
import { motion } from 'framer-motion';

/**
 * FloatingPaths — animated SVG path background for the hero section.
 * Renders 36 curved paths that animate continuously, giving the impression
 * of moving signal traces or threat vectors — fitting the cybersecurity theme.
 *
 * Adapted from the BackgroundPaths pattern to work with the project's dark
 * design system (no Tailwind, plain inline styles).
 */

function FloatingPaths({ position }) {
  const paths = Array.from({ length: 36 }, (_, i) => ({
    id: i,
    d: `M-${380 - i * 5 * position} -${189 + i * 6}C-${
      380 - i * 5 * position
    } -${189 + i * 6} -${312 - i * 5 * position} ${216 - i * 6} ${
      152 - i * 5 * position
    } ${343 - i * 6}C${616 - i * 5 * position} ${470 - i * 6} ${
      684 - i * 5 * position
    } ${875 - i * 6} ${684 - i * 5 * position} ${875 - i * 6}`,
    // Indigo-tinted paths on the dark background — evokes signal/data traces
    opacity: 0.04 + i * 0.018,
    width: 0.5 + i * 0.03,
  }));

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      <svg
        style={{ width: '100%', height: '100%' }}
        viewBox="0 0 696 316"
        fill="none"
        aria-hidden="true"
      >
        {paths.map((path) => (
          <motion.path
            key={path.id}
            d={path.d}
            stroke="rgba(99,102,241,1)"
            strokeWidth={path.width}
            strokeOpacity={path.opacity}
            initial={{ pathLength: 0.3, opacity: 0.4 }}
            animate={{
              pathLength: 1,
              opacity: [0.2, path.opacity, 0.2],
              pathOffset: [0, 1, 0],
            }}
            transition={{
              duration: 20 + (path.id % 7) * 3,
              repeat: Infinity,
              ease: 'linear',
            }}
          />
        ))}
      </svg>
    </div>
  );
}

/**
 * AnimatedHeadline — animates each letter of each word with a spring entrance.
 * Used to give the hero headline a dramatic staggered reveal.
 */
export function AnimatedHeadline({ text, className, style }) {
  const words = text.split(' ');

  return (
    <span className={className} style={style}>
      {words.map((word, wordIndex) => (
        <span
          key={wordIndex}
          style={{ display: 'inline-block', marginRight: '0.25em' }}
        >
          {word.split('').map((letter, letterIndex) => (
            <motion.span
              key={`${wordIndex}-${letterIndex}`}
              initial={{ y: 60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{
                delay: wordIndex * 0.12 + letterIndex * 0.03,
                type: 'spring',
                stiffness: 160,
                damping: 22,
              }}
              style={{ display: 'inline-block' }}
            >
              {letter}
            </motion.span>
          ))}
        </span>
      ))}
    </span>
  );
}

export default FloatingPaths;
