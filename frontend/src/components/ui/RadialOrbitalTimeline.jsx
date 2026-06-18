import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from './Badge';
import { Card, CardContent, CardHeader, CardTitle } from './Card';

function RadialOrbitalTimeline({ timelineData }) {
  const [selectedId, setSelectedId] = useState(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const containerRef = useRef(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      setDimensions({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const cx = dimensions.width / 2;
  const cy = dimensions.height / 2;
  const radius = Math.min(cx, cy) * 0.62;
  const count = timelineData.length;

  const nodePositions = timelineData.map((_, i) => {
    const angle = (i / count) * 2 * Math.PI - Math.PI / 2;
    return {
      x: cx + radius * Math.cos(angle),
      y: cy + radius * Math.sin(angle),
    };
  });

  const selectedItem = selectedId ? timelineData.find((d) => d.id === selectedId) : null;
  const isDimmed = useCallback(
    (id) => {
      const relatedIds = selectedItem ? selectedItem.relatedIds : [];
      return selectedId !== null && id !== selectedId && !relatedIds.includes(id);
    },
    [selectedId, selectedItem]
  );

  // Build unique connection pairs to draw lines for related nodes
  const connectionLines = [];
  if (selectedItem) {
    selectedItem.relatedIds.forEach((rid) => {
      const fromIdx = timelineData.findIndex((d) => d.id === selectedId);
      const toIdx = timelineData.findIndex((d) => d.id === rid);
      if (fromIdx !== -1 && toIdx !== -1) {
        connectionLines.push({ from: fromIdx, to: toIdx });
      }
    });
  }

  const handleNodeClick = (id) => {
    setSelectedId((prev) => (prev === id ? null : id));
  };

  // Determine card side based on node x position
  const getCardStyle = () => {
    if (!selectedItem) return {};
    const idx = timelineData.findIndex((d) => d.id === selectedId);
    const pos = nodePositions[idx];
    if (!pos) return {};
    const onRight = pos.x < cx;
    return onRight
      ? { left: '50%', transform: 'translateX(8px)' }
      : { right: '50%', transform: 'translateX(-8px)' };
  };

  const ORBIT_RADII = [radius * 0.38, radius * 0.72, radius * 1.0];

  return (
    <div
      ref={containerRef}
      className="w-full relative overflow-hidden"
      style={{ height: 700, background: '#0a0e1a' }}
    >
      {/* SVG layer: orbital rings + connection lines */}
      <svg
        className="absolute inset-0 pointer-events-none"
        width={dimensions.width}
        height={dimensions.height}
      >
        {/* Orbital rings */}
        {ORBIT_RADII.map((r, i) => (
          <circle
            key={i}
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke="rgba(255,255,255,0.04)"
            strokeWidth="1"
            strokeDasharray="4 6"
          />
        ))}

        {/* Connection lines for related nodes */}
        {connectionLines.map(({ from, to }, i) => {
          const a = nodePositions[from];
          const b = nodePositions[to];
          if (!a || !b) return null;
          return (
            <line
              key={i}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke="#3b82f6"
              strokeWidth="1"
              strokeOpacity="0.35"
              strokeDasharray="4 4"
            />
          );
        })}
      </svg>

      {/* Center orb */}
      <div
        className="absolute"
        style={{
          left: cx - 36,
          top: cy - 36,
          width: 72,
          height: 72,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #1d4ed8, #3b82f6, #0ea5e9)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10,
          boxShadow: '0 0 40px rgba(59,130,246,0.35)',
        }}
      >
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{ background: 'inherit' }}
          animate={{ scale: [1, 1.25, 1], opacity: [0.7, 0.3, 0.7] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        />
        <svg
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="white"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ position: 'relative', zIndex: 1 }}
        >
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      </div>

      {/* Agent nodes */}
      {timelineData.map((item, i) => {
        const pos = nodePositions[i];
        const IconComp = item.icon;
        const dimmed = isDimmed(item.id);
        const selected = selectedId === item.id;
        const circumference = 2 * Math.PI * 22;
        const filled = (item.energy / 100) * circumference;

        return (
          <motion.div
            key={item.id}
            className="absolute"
            style={{
              left: pos.x - 28,
              top: pos.y - 28,
              width: 56,
              height: 56,
              zIndex: 20,
              cursor: 'pointer',
            }}
            animate={{ opacity: dimmed ? 0.2 : 1 }}
            transition={{ duration: 0.25 }}
            onClick={() => handleNodeClick(item.id)}
          >
            {/* Energy ring */}
            <svg
              width="56"
              height="56"
              viewBox="0 0 56 56"
              className="absolute inset-0"
              style={{ transform: 'rotate(-90deg)' }}
            >
              <circle cx="28" cy="28" r="22" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="2" />
              <circle
                cx="28"
                cy="28"
                r="22"
                fill="none"
                stroke={selected ? '#3b82f6' : '#1d4ed8'}
                strokeWidth="2"
                strokeDasharray={`${filled} ${circumference - filled}`}
                strokeLinecap="round"
              />
            </svg>

            {/* Node body */}
            <div
              className="absolute"
              style={{
                inset: 6,
                borderRadius: '50%',
                background: selected
                  ? 'linear-gradient(135deg, #1e3a8a, #1d4ed8)'
                  : 'rgba(15,23,42,0.95)',
                border: `1px solid ${selected ? 'rgba(59,130,246,0.6)' : 'rgba(255,255,255,0.1)'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: selected ? '0 0 16px rgba(59,130,246,0.4)' : 'none',
              }}
            >
              <IconComp
                size={16}
                color={selected ? '#93c5fd' : '#64748b'}
              />
            </div>

            {/* Label below node */}
            <div
              style={{
                position: 'absolute',
                top: '100%',
                left: '50%',
                transform: 'translateX(-50%)',
                marginTop: 6,
                textAlign: 'center',
                whiteSpace: 'nowrap',
                pointerEvents: 'none',
              }}
            >
              <div style={{ fontSize: 10, fontWeight: 600, color: selected ? '#93c5fd' : '#94a3b8' }}>
                {item.title}
              </div>
              <div style={{ fontSize: 9, color: '#475569' }}>{item.date}</div>
            </div>
          </motion.div>
        );
      })}

      {/* Detail card */}
      <AnimatePresence>
        {selectedItem && (
          <motion.div
            key={selectedId}
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.92 }}
            transition={{ duration: 0.2 }}
            className="absolute"
            style={{
              top: cy - 120,
              width: 280,
              zIndex: 30,
              ...getCardStyle(),
            }}
          >
            <Card>
              <CardHeader style={{ paddingBottom: 8 }}>
                <div className="flex items-center gap-2" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <Badge variant="default" style={{ fontSize: 10 }}>
                    {selectedItem.category}
                  </Badge>
                  <span style={{ fontSize: 10, color: '#64748b' }}>{selectedItem.date}</span>
                </div>
                <CardTitle>{selectedItem.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.6, marginBottom: 12 }}>
                  {selectedItem.content}
                </p>

                {/* Energy bar */}
                <div style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#64748b', marginBottom: 4 }}>
                    <span>Activity</span>
                    <span style={{ color: '#3b82f6' }}>{selectedItem.energy}%</span>
                  </div>
                  <div style={{ height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 2 }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${selectedItem.energy}%`,
                        background: 'linear-gradient(90deg, #1d4ed8, #3b82f6)',
                        borderRadius: 2,
                        transition: 'width 0.5s ease',
                      }}
                    />
                  </div>
                </div>

                {/* Related nodes */}
                {selectedItem.relatedIds.length > 0 && (
                  <div>
                    <div style={{ fontSize: 10, color: '#64748b', marginBottom: 6 }}>Connected agents</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {selectedItem.relatedIds.map((rid) => {
                        const rel = timelineData.find((d) => d.id === rid);
                        return rel ? (
                          <Badge key={rid} variant="outline" style={{ fontSize: 9, cursor: 'pointer' }}
                            onClick={(e) => { e.stopPropagation(); handleNodeClick(rid); }}>
                            {rel.title}
                          </Badge>
                        ) : null;
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Click-outside to deselect */}
      {selectedId && (
        <div
          className="absolute inset-0"
          style={{ zIndex: 5 }}
          onClick={() => setSelectedId(null)}
        />
      )}
    </div>
  );
}

export default RadialOrbitalTimeline;
