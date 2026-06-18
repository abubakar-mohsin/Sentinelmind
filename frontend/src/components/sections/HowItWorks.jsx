import React from 'react';
import { motion } from 'framer-motion';

const SECTION_LABEL = {
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: '3px',
  textTransform: 'uppercase',
  color: '#3b82f6',
  marginBottom: 16,
};

const STEPS = [
  {
    num: '01',
    color: '#3b82f6',
    title: 'Event arrives',
    body: 'A login event hits the REST API. Normalized and published to the Kafka raw-events topic in milliseconds.',
  },
  {
    num: '02',
    color: '#f59e0b',
    title: 'Orchestrator reasons',
    body: 'Groq LLM queries the Neo4j knowledge graph, builds a hypothesis, and decides which agents to activate using the ReAct loop.',
  },
  {
    num: '03',
    color: '#ef4444',
    title: 'Agents activate in parallel',
    body: 'Anomaly Detection, Threat Intelligence, and Threat Classifier fire simultaneously over dedicated Kafka topics.',
  },
  {
    num: '04',
    color: '#10b981',
    title: 'Confidence calculated',
    body: 'Weighted formula: anomaly × 0.30 + threat intel × 0.40 + classifier × 0.30. Threshold: 92%. Demo produces 96.1%.',
  },
];

function StepContent({ step }) {
  return (
    <>
      <div style={{
        fontSize: 11,
        color: step.color,
        letterSpacing: '2px',
        textTransform: 'uppercase',
        marginBottom: 8,
        fontWeight: 600,
      }}>
        Step {step.num}
      </div>
      <div style={{ fontSize: 18, fontWeight: 600, color: '#f9fafb', marginBottom: 8 }}>
        {step.title}
      </div>
      <div style={{ fontSize: 13, color: '#4b5563', lineHeight: 1.6 }}>
        {step.body}
      </div>
    </>
  );
}

function StepPair({ leftStep, rightStep, pairIndex }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: pairIndex * 0.12 }}
      viewport={{ once: true }}
      style={{ display: 'grid', gridTemplateColumns: '1fr 60px 1fr', alignItems: 'stretch' }}
    >
      {/* Left card */}
      <div style={{
        background: '#111827',
        border: '1px solid #1f2937',
        borderRadius: '12px 0 0 12px',
        padding: 32,
      }}>
        <StepContent step={leftStep} />
      </div>

      {/* Connector arrow */}
      <div style={{
        background: '#0f172a',
        borderTop: '1px solid #1f2937',
        borderBottom: '1px solid #1f2937',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#3b82f6',
        fontSize: 18,
      }}>
        →
      </div>

      {/* Right card */}
      <div style={{
        background: '#111827',
        border: '1px solid #1f2937',
        borderLeft: 'none',
        borderRadius: '0 12px 12px 0',
        padding: 32,
      }}>
        <StepContent step={rightStep} />
      </div>
    </motion.div>
  );
}

export default function HowItWorks() {
  return (
    <section style={{ background: '#0a0e1a', padding: '100px 80px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 72 }}>
          <div style={SECTION_LABEL}>How It Works</div>
          <div style={{ fontSize: 48, fontWeight: 800, color: '#f9fafb', letterSpacing: '-2px' }}>
            Five steps. Under 10 seconds.
          </div>
          <div style={{ fontSize: 16, color: '#4b5563', marginTop: 12 }}>
            From suspicious signal to full containment — fully autonomous.
          </div>
        </div>

        {/* Steps 1+2 */}
        <StepPair leftStep={STEPS[0]} rightStep={STEPS[1]} pairIndex={0} />

        {/* Vertical connector */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: 0 }}>
          <div style={{ width: 1, height: 40, background: '#1f2937' }} />
        </div>

        {/* Steps 3+4 */}
        <StepPair leftStep={STEPS[2]} rightStep={STEPS[3]} pairIndex={1} />

        {/* Vertical connector */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: 0 }}>
          <div style={{ width: 1, height: 40, background: '#1f2937' }} />
        </div>

        {/* Step 5 — full width green */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.24 }}
          viewport={{ once: true }}
          style={{
            background: '#052e16',
            border: '1px solid #166534',
            borderRadius: 12,
            padding: '32px 40px',
            display: 'flex',
            alignItems: 'center',
            gap: 24,
          }}
        >
          {/* Pulsing green dot */}
          <motion.div
            animate={{ scale: [1, 1.4, 1], opacity: [1, 0.5, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: '#10b981',
              flexShrink: 0,
            }}
          />

          {/* Center text */}
          <div style={{ flex: 1 }}>
            <div style={{
              fontSize: 11,
              color: '#10b981',
              letterSpacing: '2px',
              textTransform: 'uppercase',
              marginBottom: 4,
              fontWeight: 600,
            }}>
              Step 05 — Automated Response
            </div>
            <div style={{ fontSize: 18, fontWeight: 600, color: '#f9fafb' }}>
              IP blocked. Session revoked. Password reset forced. Automatically.
            </div>
          </div>

          {/* ~8s */}
          <div style={{
            fontFamily: "'JetBrains Mono', 'Courier New', monospace",
            fontSize: 40,
            fontWeight: 800,
            color: '#10b981',
            marginLeft: 'auto',
            flexShrink: 0,
          }}>
            ~8s
          </div>
        </motion.div>

      </div>
    </section>
  );
}
