import React from 'react';
import { motion } from 'framer-motion';

const SECTION_LABEL = {
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: '3px',
  textTransform: 'uppercase',
  color: '#3b82f6',
  marginBottom: 24,
};

const CARDS = [
  {
    accentColor: '#ef4444',
    layerLabel: 'CODE LAYER',
    bigNumber: '74%',
    title: 'Breaches start at the application layer',
    body: 'SQL injection, broken auth, hardcoded credentials — injected at development time and invisible to every runtime tool.',
  },
  {
    accentColor: '#f59e0b',
    layerLabel: 'DEPENDENCY LAYER',
    bigNumber: '1 in 8',
    title: 'Open source packages have a known vulnerability',
    body: '"colourama" vs "colorama". Edit distance: 1. Downloaded 50,000 times before detection. Your scanner missed it.',
  },
  {
    accentColor: '#3b82f6',
    layerLabel: 'RUNTIME LAYER',
    bigNumber: '81%',
    title: 'Of intrusions use no malware at all',
    body: 'XZ Utils. SolarWinds. Log4Shell. Already inside using valid credentials. No signature-based tool catches this.',
  },
];

export default function TheProblem() {
  return (
    <section style={{ background: '#0a0e1a', padding: '100px 80px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>

        {/* Part A — Header */}
        <div style={{ marginBottom: 64, textAlign: 'center' }}>
          <div style={SECTION_LABEL}>The Problem</div>

          <motion.div
            initial={{ opacity: 0, y: 32 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            style={{ fontSize: 64, fontWeight: 800, color: '#f9fafb', letterSpacing: '-2px', lineHeight: 1 }}
          >
            194 days.
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 32 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.12 }}
            viewport={{ once: true }}
            style={{ fontSize: 64, fontWeight: 800, color: '#1f2937', letterSpacing: '-2px', lineHeight: 1 }}
          >
            That's how long it takes to find a breach.
          </motion.div>

          <p style={{
            fontSize: 16,
            color: '#4b5563',
            maxWidth: 520,
            margin: '20px auto 0',
            lineHeight: 1.7,
          }}>
            73 more days to contain it. Most companies run 40–50 disconnected security tools — and none of them talk to each other.
          </p>
        </div>

        {/* Part B — Three problem cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 1,
          background: '#1f2937',
          border: '1px solid #1f2937',
          borderRadius: 16,
          overflow: 'hidden',
          marginBottom: 32,
        }}>
          {CARDS.map((card, index) => (
            <motion.div
              key={card.layerLabel}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              viewport={{ once: true }}
              style={{ background: '#0a0e1a', padding: '40px 32px' }}
            >
              <div style={{
                width: 32,
                height: 2,
                background: card.accentColor,
                marginBottom: 28,
              }} />
              <div style={{
                fontSize: 11,
                color: '#4b5563',
                letterSpacing: '2px',
                textTransform: 'uppercase',
                marginBottom: 12,
              }}>
                {card.layerLabel}
              </div>
              <div style={{
                fontSize: 52,
                fontWeight: 800,
                color: card.accentColor,
                fontFamily: "'JetBrains Mono', 'Courier New', monospace",
                lineHeight: 1,
                marginBottom: 16,
              }}>
                {card.bigNumber}
              </div>
              <div style={{
                fontSize: 15,
                fontWeight: 600,
                color: '#f9fafb',
                marginBottom: 12,
              }}>
                {card.title}
              </div>
              <div style={{ fontSize: 13, color: '#4b5563', lineHeight: 1.7 }}>
                {card.body}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Part C — Bridge statement */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          style={{
            padding: '28px 32px',
            background: '#111827',
            border: '1px solid #1f2937',
            borderRadius: 12,
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: 18, fontWeight: 600, color: '#f9fafb' }}>
            SentinelMind covers all three layers simultaneously.
          </div>
          <div style={{ fontSize: 14, color: '#4b5563', marginTop: 6 }}>
            One platform. One knowledge graph. One orchestrator. Under 10 seconds.
          </div>
        </motion.div>

      </div>
    </section>
  );
}
