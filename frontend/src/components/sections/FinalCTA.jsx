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

const STATUS_ITEMS = [
  'Kafka streaming',
  'Neo4j connected',
  'Groq LLM active',
  '8 agents online',
];

export default function FinalCTA() {
  return (
    <section style={{ background: '#0a0e1a', padding: '120px 80px' }}>
      <div style={{ maxWidth: 760, margin: '0 auto', textAlign: 'center' }}>

        {/* Section label */}
        <div style={SECTION_LABEL}>See It Live</div>

        {/* Headline */}
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          <div style={{
            fontSize: 56,
            fontWeight: 800,
            color: '#f9fafb',
            letterSpacing: '-2px',
            lineHeight: 1.1,
          }}>
            Watch it contain a real attack.
          </div>
          <div style={{
            fontSize: 56,
            fontWeight: 800,
            color: '#1f2937',
            letterSpacing: '-2px',
            lineHeight: 1.1,
          }}>
            In under 10 seconds.
          </div>
        </motion.div>

        {/* Subtext */}
        <p style={{
          fontSize: 16,
          color: '#4b5563',
          margin: '20px auto 48px',
          maxWidth: 560,
          lineHeight: 1.7,
        }}>
          No setup. No API keys required. One click launches a live credential stuffing scenario and you watch every agent fire in real time.
        </p>

        {/* CTA buttons */}
        <div style={{
          display: 'flex',
          gap: 12,
          justifyContent: 'center',
          alignItems: 'center',
          marginBottom: 48,
        }}>
          <motion.button
            whileHover={{ scale: 1.03, boxShadow: '0 8px 30px rgba(59,130,246,0.4)' }}
            whileTap={{ scale: 0.97 }}
            onClick={() => { window.location.href = '/login'; }}
            style={{
              background: '#3b82f6',
              color: 'white',
              border: 'none',
              padding: '14px 28px',
              borderRadius: 8,
              fontSize: 15,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              whiteSpace: 'nowrap',
            }}
          >
            Launch live demo →
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.03, borderColor: '#3b82f6', color: '#f9fafb' }}
            whileTap={{ scale: 0.97 }}
            onClick={() => window.open('https://github.com/abubakar-mohsin/Sentinelmind', '_blank')}
            style={{
              background: 'transparent',
              color: '#9ca3af',
              border: '1px solid #1f2937',
              padding: '14px 28px',
              borderRadius: 8,
              fontSize: 15,
              fontWeight: 500,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              whiteSpace: 'nowrap',
              transition: 'all 0.2s',
            }}
          >
            View on GitHub
          </motion.button>
        </div>

        {/* System status bar */}
        <div style={{
          padding: '20px 32px',
          background: '#111827',
          border: '1px solid #1f2937',
          borderRadius: 12,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 40,
          flexWrap: 'wrap',
        }}>
          {STATUS_ITEMS.map((label, index) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <motion.div
                animate={{ scale: [1, 1.4, 1], opacity: [1, 0.5, 1] }}
                transition={{ duration: 2, repeat: Infinity, delay: index * 0.4 }}
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: '#10b981',
                  flexShrink: 0,
                }}
              />
              <span style={{
                fontSize: 12,
                color: '#4b5563',
                fontFamily: "'JetBrains Mono', 'Courier New', monospace",
              }}>
                {label}
              </span>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
