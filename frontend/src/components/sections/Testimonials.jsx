import React from 'react';
import { motion } from 'framer-motion';
import { ScrollReelTestimonials } from '../ui/ScrollReelTestimonials';

const SECTION_LABEL = {
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: '3px',
  textTransform: 'uppercase',
  color: '#3b82f6',
  marginBottom: 16,
};

const TESTIMONIALS = [
  {
    quote:
      'SentinelMind caught a credential stuffing attack we didn\'t even know was happening. The 10-second response window is real — we watched every agent fire live.',
    author: 'Sarah Chen — CISO, TechVault',
    image:
      'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&q=80&auto=format&fit=crop',
    alt: 'Portrait of Sarah Chen',
  },
  {
    quote:
      'The MITRE ATT&CK mapping is automatic and accurate. Our SOC team spends time on real decisions now, not classification busywork.',
    author: 'Marcus Rivera — Head of Security, CloudEdge',
    image:
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&q=80&auto=format&fit=crop',
    alt: 'Portrait of Marcus Rivera',
  },
  {
    quote:
      'We replaced four separate detection tools with one orchestrator. The knowledge graph alone is worth it — nothing else gives you that lateral movement view in real time.',
    author: 'Aisha Kamara — Security Architect, Pinnacle Financial',
    image:
      'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&q=80&auto=format&fit=crop',
    alt: 'Portrait of Aisha Kamara',
  },
];

export default function Testimonials() {
  return (
    <section style={{ background: '#0a0e1a', padding: '100px 80px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          style={{ textAlign: 'center', marginBottom: 56 }}
        >
          <div style={SECTION_LABEL}>What Experts Say</div>
          <div style={{
            fontSize: 48,
            fontWeight: 800,
            color: '#f9fafb',
            letterSpacing: '-2px',
            lineHeight: 1.1,
          }}>
            Trusted by security teams.
          </div>
        </motion.div>

        {/* Reel */}
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.12 }}
          viewport={{ once: true }}
          style={{ display: 'flex', justifyContent: 'center' }}
        >
          <ScrollReelTestimonials testimonials={TESTIMONIALS} />
        </motion.div>

      </div>
    </section>
  );
}
