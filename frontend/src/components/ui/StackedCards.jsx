import React, { useRef, useState, useEffect } from 'react';
import { motion, useScroll, useTransform, useSpring } from 'framer-motion';

/**
 * StackedCards — scroll-driven card collapse animation.
 * Phase 1: 4 cards fill the viewport side-by-side.
 * Phase 2: Cards collapse left into a stack as the user scrolls.
 * Phase 3: Stack + text panel revealed. Click arrows to cycle cards.
 */

const CARDS = [
  {
    id: 1,
    bg: '#0d1117',
    topLabel: '( CODE · LAYER )',
    bottomLabel: '( APPLICATION · SECURITY )',
    centerNum: '01',
    overlayText: '74%',
    overlayColor: '#ef4444',
    isShield: false,
  },
  {
    id: 2,
    bg: '#0a0e1a',
    topLabel: '( DEPENDENCY · LAYER )',
    bottomLabel: '( SUPPLY · CHAIN )',
    centerNum: '02',
    overlayText: '1 in 8',
    overlayColor: '#f59e0b',
    isShield: false,
  },
  {
    id: 3,
    bg: '#111827',
    topLabel: '( RUNTIME · LAYER )',
    bottomLabel: '( BEHAVIORAL · DETECTION )',
    centerNum: '03',
    overlayText: '81%',
    overlayColor: '#3b82f6',
    isShield: false,
  },
  {
    id: 4,
    bg: '#0f172a',
    topLabel: '( UNIFIED · PLATFORM )',
    bottomLabel: '( SENTINELMIND )',
    centerNum: null,
    overlayText: null,
    overlayColor: null,
    isShield: true,
  },
];

const labelStyle = {
  fontFamily: 'monospace',
  fontSize: 11,
  color: '#4b5563',
  letterSpacing: '0.08em',
  userSelect: 'none',
};

function CardCenter({ card }) {
  if (card.isShield) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="80" height="80" viewBox="0 0 24 24" fill="#3b82f6" aria-hidden="true">
          <path d="M12 2L4 6v6c0 5.5 3.8 10.7 8 12 4.2-1.3 8-6.5 8-12V6l-8-4z" />
        </svg>
      </div>
    );
  }
  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{
        fontFamily: 'monospace',
        fontSize: 120,
        fontWeight: 800,
        color: '#1f2937',
        lineHeight: 1,
        userSelect: 'none',
      }}>
        {card.centerNum}
      </span>
      <span style={{
        position: 'absolute',
        fontFamily: 'monospace',
        fontSize: 48,
        fontWeight: 700,
        color: card.overlayColor,
        userSelect: 'none',
      }}>
        {card.overlayText}
      </span>
    </div>
  );
}

/* ── Scroll-driven collapse animation ── */

function useCardTransform(scrollYProgress, startProgress, endProgress, startXVw) {
  const raw = useTransform(scrollYProgress, [startProgress, endProgress], [startXVw, 0]);
  const scale = useTransform(scrollYProgress, [startProgress, endProgress], [1, 0.94]);
  const dimOpacity = useTransform(scrollYProgress, [startProgress, endProgress], [0, 0.3]);
  const springCfg = { stiffness: 80, damping: 20 };
  const x = useSpring(raw, springCfg);
  const s = useSpring(scale, springCfg);
  const dim = useSpring(dimOpacity, springCfg);
  return { x, scale: s, dimOpacity: dim };
}

export default function StackedCards() {
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end'],
  });

  // Each card collapses in its 25% scroll window.
  // Card 4 collapses first (75vw from left edge), card 3 at 50vw, card 2 at 25vw.
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1440;
  const card4 = useCardTransform(scrollYProgress, 0,    0.25, vw * 0.75);
  const card3 = useCardTransform(scrollYProgress, 0.25, 0.5,  vw * 0.50);
  const card2 = useCardTransform(scrollYProgress, 0.5,  0.75, vw * 0.25);

  // Right text panel fades in during 70-100%
  const textOpacityRaw = useTransform(scrollYProgress, [0.7, 1.0], [0, 1]);
  const textYRaw       = useTransform(scrollYProgress, [0.7, 1.0], [20, 0]);
  const textOpacity    = useSpring(textOpacityRaw, { stiffness: 80, damping: 20 });
  const textY          = useSpring(textYRaw,       { stiffness: 80, damping: 20 });

  // Stack depth progress (0 = spread, 1 = fully stacked)
  const stackProgress = useTransform(scrollYProgress, [0.75, 1.0], [0, 1]);

  // Drive pointer-events from a real state value — useTransform can't be used on non-motion props.
  const [isStacked, setIsStacked] = useState(false);
  useEffect(() => {
    return stackProgress.on('change', v => setIsStacked(v > 0.5));
  }, [stackProgress]);


  // Click-to-cycle state
  const [order, setOrder] = useState([0, 1, 2, 3]); // indices into CARDS
  const [exiting, setExiting] = useState(false);

  function cycleForward() {
    if (exiting) return;
    setExiting(true);
    setTimeout(() => {
      setOrder(prev => {
        const next = [...prev];
        next.push(next.shift());
        return next;
      });
      setExiting(false);
    }, 500);
  }

  function cycleBackward() {
    if (exiting) return;
    setExiting(true);
    setTimeout(() => {
      setOrder(prev => {
        const next = [...prev];
        next.unshift(next.pop());
        return next;
      });
      setExiting(false);
    }, 500);
  }

  const cardTransforms = [null, card2, card3, card4]; // index 0 = card1 (never moves)

  return (
    /* Tall container — 500vh gives enough scroll distance */
    <div ref={containerRef} style={{ height: '500vh', position: 'relative', background: '#0a0e1a' }}>
      {/* Sticky viewport — cards stay visible while scrolling */}
      <div style={{
        position: 'sticky',
        top: 0,
        height: '100vh',
        overflow: 'hidden',
        background: '#0a0e1a',
        display: 'flex',
      }}>

        {/* ── Card spread / collapse layer ── */}
        <motion.div style={{ position: 'absolute', inset: 0, display: 'flex', opacity: useTransform(scrollYProgress, [0.85, 1.0], [1, 0]) }}>
          {CARDS.map((card, idx) => {
            const tf = cardTransforms[idx];

            return (
              <motion.div
                key={card.id}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '25vw',
                  height: '100%',
                  background: card.bg,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '40px 0',
                  x: tf ? tf.x : idx * vw * 0.25,
                  scale: tf ? tf.scale : 1,
                  zIndex: idx === 0 ? 1 : idx === 1 ? 2 : idx === 2 ? 3 : 4,
                  transformOrigin: 'left center',
                }}
              >
                <span style={labelStyle}>{card.topLabel}</span>
                <CardCenter card={card} />
                <span style={labelStyle}>{card.bottomLabel}</span>

                {/* Dim overlay — darkens card as it collapses */}
                {tf && (
                  <motion.div style={{
                    position: 'absolute',
                    inset: 0,
                    background: '#000',
                    opacity: tf.dimOpacity,
                    pointerEvents: 'none',
                  }} />
                )}
              </motion.div>
            );
          })}
        </motion.div>

        {/* ── Fully stacked interactive layer (visible after scroll) ── */}
        <motion.div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            opacity: stackProgress,
            pointerEvents: isStacked ? 'auto' : 'none',
          }}
        >
          {/* Left: card stack */}
          <div style={{
            width: '45%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 24,
          }}>
            {/* Stack of cards with depth offsets */}
            <div style={{ position: 'relative', width: 260, height: 340 }}>
              {[...order].reverse().map((cardIdx, stackPos) => {
                const card = CARDS[cardIdx];
                const fromTop = order.length - 1 - stackPos; // 0 = top card
                const isTop = fromTop === 0;
                const isExitingCard = isTop && exiting;

                return (
                  <motion.div
                    key={`stack-${card.id}`}
                    animate={isExitingCard ? {
                      x: '-120%',
                      rotate: -8,
                      opacity: 0,
                    } : {
                      x: fromTop * 6,
                      y: fromTop * 8,
                      rotate: 0,
                      opacity: 1,
                    }}
                    transition={{
                      type: 'spring',
                      stiffness: 160,
                      damping: 22,
                      duration: 0.5,
                    }}
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background: card.bg,
                      borderRadius: 12,
                      border: '1px solid rgba(255,255,255,0.08)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '24px 16px',
                      zIndex: order.length - fromTop,
                      boxShadow: isTop
                        ? '0 24px 48px rgba(0,0,0,0.6)'
                        : '0 8px 24px rgba(0,0,0,0.4)',
                    }}
                  >
                    <span style={labelStyle}>{card.topLabel}</span>
                    <CardCenter card={card} />
                    <span style={labelStyle}>{card.bottomLabel}</span>
                  </motion.div>
                );
              })}
            </div>

            {/* Navigation arrows */}
            <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
              {['←', '→'].map((arrow, i) => (
                <ArrowButton key={arrow} label={arrow} onClick={i === 0 ? cycleBackward : cycleForward} />
              ))}
            </div>
          </div>

          {/* Right: text panel */}
          <motion.div
            style={{
              width: '55%',
              padding: '0 64px 0 32px',
              opacity: textOpacity,
              y: textY,
            }}
          >
            <p style={{
              fontFamily: 'monospace',
              fontSize: 11,
              color: '#3b82f6',
              textTransform: 'uppercase',
              letterSpacing: '3px',
              marginBottom: 20,
            }}>
              THE PROBLEM
            </p>

            <div style={{
              fontFamily: 'monospace',
              fontSize: 96,
              fontWeight: 800,
              color: '#f9fafb',
              lineHeight: 1,
            }}>
              194
            </div>
            <div style={{ fontSize: 18, color: '#4b5563', marginTop: 4 }}>
              days average
            </div>

            <div style={{ width: 40, height: 2, background: '#1f2937', margin: '24px 0' }} />

            <p style={{ fontSize: 15, color: '#4b5563', lineHeight: 1.8, maxWidth: 420 }}>
              73 more days to contain it.
            </p>
            <p style={{ fontSize: 15, color: '#4b5563', lineHeight: 1.8, maxWidth: 420, marginTop: 16 }}>
              Most companies run 40 to 50 disconnected security tools. Each tool sees one
              fragment of an attack. None of them share context. A human analyst must connect
              the dots — manually, slowly, under a flood of alerts.
            </p>
            <p style={{ fontSize: 15, color: '#4b5563', lineHeight: 1.8, maxWidth: 420, marginTop: 16 }}>
              SentinelMind unifies detection across all three layers under one AI orchestrator
              that responds in under 10 seconds.
            </p>
          </motion.div>
        </motion.div>

      </div>
    </div>
  );
}

function ArrowButton({ label, onClick }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: '#111827',
        border: `1px solid ${hovered ? '#3b82f6' : '#1f2937'}`,
        color: hovered ? '#f9fafb' : '#9ca3af',
        width: 40,
        height: 40,
        borderRadius: '50%',
        cursor: 'pointer',
        fontSize: 16,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.2s',
      }}
    >
      {label}
    </button>
  );
}
