import React, { useEffect, useRef, useState } from 'react';

const DECISION_CFG = {
  INVESTIGATE_THREAT_INTEL:  { color: '#3b82f6', bg: 'rgba(59,130,246,0.12)',  border: 'rgba(59,130,246,0.3)' },
  INVESTIGATE_ANOMALY:       { color: '#eab308', bg: 'rgba(234,179,8,0.12)',   border: 'rgba(234,179,8,0.3)' },
  AUTHORIZE_RESPONSE:        { color: '#ef4444', bg: 'rgba(239,68,68,0.12)',   border: 'rgba(239,68,68,0.3)' },
  CLASSIFY_ATTACK:           { color: '#f97316', bg: 'rgba(249,115,22,0.12)',  border: 'rgba(249,115,22,0.3)' },
  DISMISS:                   { color: '#22c55e', bg: 'rgba(34,197,94,0.12)',   border: 'rgba(34,197,94,0.3)' },
  GATHER_MORE_INTEL:         { color: '#06b6d4', bg: 'rgba(6,182,212,0.12)',   border: 'rgba(6,182,212,0.3)' },
  CLASSIFICATION_COMPLETE:   { color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)',  border: 'rgba(139,92,246,0.3)' },
  RULE_BASED_DECISION:       { color: '#f97316', bg: 'rgba(249,115,22,0.12)',  border: 'rgba(249,115,22,0.3)' },
  RULE_BASED_FALLBACK:       { color: '#f97316', bg: 'rgba(249,115,22,0.12)',  border: 'rgba(249,115,22,0.3)' },
  RULE_BASED_CLASSIFICATION: { color: '#f97316', bg: 'rgba(249,115,22,0.12)',  border: 'rgba(249,115,22,0.3)' },
};

const FALLBACK_CFG = {
  color: '#94a3b8',
  bg: 'rgba(148,163,184,0.12)',
  border: 'rgba(148,163,184,0.3)',
};

function decisionConfig(decision) {
  return DECISION_CFG[decision] || FALLBACK_CFG;
}

function DataSourceBadge({ dataSource }) {
  if (!dataSource) return null;

  const isAi = dataSource === 'GROQ_AI';
  const color = isAi ? '#22c55e' : '#f97316';
  const border = isAi ? 'rgba(34,197,94,0.3)' : 'rgba(249,115,22,0.3)';
  const bg = isAi ? 'rgba(34,197,94,0.15)' : 'rgba(249,115,22,0.15)';

  return (
    <span style={{
      background: bg,
      color,
      border: `1px solid ${border}`,
      padding: '2px 10px',
      borderRadius: 20,
      fontSize: 10,
      fontWeight: 700,
      fontFamily: 'monospace',
      whiteSpace: 'nowrap',
    }}>
      {isAi ? 'REAL AI - Groq Llama 3.3 70B' : 'RULE-BASED FALLBACK - Not AI'}
    </span>
  );
}

function DecisionBadge({ decision }) {
  const c = decisionConfig(decision);

  return (
    <span style={{
      background: c.bg,
      color: c.color,
      border: `1px solid ${c.border}`,
      padding: '3px 12px',
      borderRadius: 20,
      fontSize: 11,
      fontWeight: 700,
      fontFamily: 'monospace',
      whiteSpace: 'nowrap',
    }}>
      {decision || 'CONTINUE'}
    </span>
  );
}

function ReasoningStep({ step, displayText, showCursor }) {
  const decision = step.decision || 'CONTINUE';
  const c = decisionConfig(decision);
  const agentLabel = step.agentName === 'OrchestratorAgent'
    ? 'ORCHESTRATOR'
    : step.agentName === 'ThreatClassifierAgent'
      ? 'THREAT CLASSIFIER'
      : (step.agentName || 'AGENT').toUpperCase();

  let ts = '';
  if (step.timestamp) {
    try {
      ts = new Date(step.timestamp).toLocaleTimeString('en-GB', { hour12: false });
    } catch (_) {
      ts = '';
    }
  }

  return (
    <div style={{ position: 'relative', paddingLeft: 24, marginBottom: 10 }}>
      <div style={{
        position: 'absolute',
        left: 0,
        top: 17,
        width: 9,
        height: 9,
        borderRadius: '50%',
        background: c.color,
        boxShadow: `0 0 10px ${c.color}66`,
        zIndex: 1,
      }} />

      <div style={{
        background: 'rgba(255,255,255,0.025)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: 8,
        padding: '12px 16px',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 10,
          flexWrap: 'wrap',
          gap: 8,
        }}>
          <span style={{
            fontSize: 11,
            fontWeight: 700,
            color: c.color,
            letterSpacing: '0.08em',
            fontFamily: 'monospace',
          }}>
            STEP {step.stepNumber} - {agentLabel} REASONING
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <DataSourceBadge dataSource={step.dataSource} />
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.32)', fontFamily: 'monospace' }}>
              {ts}
            </span>
          </div>
        </div>

        {step.situation && (
          <div style={{ marginBottom: 10 }}>
            <div style={{
              fontSize: 10,
              color: 'rgba(255,255,255,0.36)',
              letterSpacing: '0.08em',
              marginBottom: 5,
              fontFamily: 'monospace',
            }}>
              SITUATION ANALYZED
            </div>
            <div style={{
              fontSize: 11,
              color: 'rgba(255,255,255,0.5)',
              fontFamily: 'monospace',
              lineHeight: 1.55,
              background: 'rgba(0,0,0,0.25)',
              padding: '8px 10px',
              borderRadius: 6,
              maxHeight: 72,
              overflow: 'hidden',
            }}>
              {step.situation.length > 240 ? `${step.situation.slice(0, 240)}...` : step.situation}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
          <span style={{
            fontSize: 10,
            color: 'rgba(255,255,255,0.36)',
            letterSpacing: '0.08em',
            fontFamily: 'monospace',
            whiteSpace: 'nowrap',
          }}>
            DECISION
          </span>
          <DecisionBadge decision={decision} />
        </div>

        <div>
          <div style={{
            fontSize: 10,
            color: 'rgba(255,255,255,0.36)',
            letterSpacing: '0.08em',
            marginBottom: 5,
            fontFamily: 'monospace',
          }}>
            REASONING
          </div>
          <div style={{
            fontSize: 12,
            color: 'rgba(255,255,255,0.84)',
            fontFamily: 'monospace',
            lineHeight: 1.65,
            minHeight: 18,
            overflowWrap: 'anywhere',
          }}>
            {displayText}
            {showCursor && (
              <span style={{
                display: 'inline-block',
                width: 2,
                height: 13,
                background: c.color,
                marginLeft: 1,
                verticalAlign: 'middle',
                animation: 'smCursor 0.7s ease-in-out infinite',
              }} />
            )}
          </div>
        </div>
      </div>

      {decision === 'AUTHORIZE_RESPONSE' && (
        <div style={{
          marginTop: 6,
          background: 'rgba(239,68,68,0.12)',
          border: '1px solid rgba(239,68,68,0.24)',
          padding: '10px 16px',
          borderRadius: 6,
          animation: 'smPulseBanner 1s ease-in-out infinite',
        }}>
          <span style={{ color: '#ef4444', fontSize: 12, fontWeight: 700, fontFamily: 'monospace' }}>
            RESPONSE AUTHORIZED - Executing playbook
          </span>
        </div>
      )}
    </div>
  );
}

export default function AIReasoningPanel({ reasoningSteps = [], incidentActive = false }) {
  const [animIdx, setAnimIdx] = useState(-1);
  const [animText, setAnimText] = useState('');
  const intervalRef = useRef(null);
  const prevLenRef = useRef(0);

  useEffect(() => () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, []);

  useEffect(() => {
    const len = reasoningSteps.length;

    if (len === 0) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setAnimIdx(-1);
      setAnimText('');
      prevLenRef.current = 0;
      return;
    }

    if (len <= prevLenRef.current) return;
    prevLenRef.current = len;

    const lastIdx = len - 1;
    const fullText = reasoningSteps[lastIdx]?.reasoning || '';

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setAnimIdx(lastIdx);
    setAnimText('');

    if (!fullText) return;

    let charIdx = 0;
    intervalRef.current = setInterval(() => {
      charIdx += 1;
      setAnimText(fullText.slice(0, charIdx));
      if (charIdx >= fullText.length) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }, 15);
  }, [reasoningSteps]);

  const hasGroqAi = reasoningSteps.some(step => step.dataSource === 'GROQ_AI');
  const allRuleBased = reasoningSteps.length > 0 &&
    reasoningSteps.every(step => step.dataSource === 'RULE_BASED');

  return (
    <>
      <style>{`
        @keyframes smCursor { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes smPulseBanner { 0%,100%{opacity:1} 50%{opacity:0.58} }
        @keyframes smGridDrift { 0%{background-position:0 0} 100%{background-position:40px 40px} }
        @keyframes smDotPulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.45;transform:scale(0.75)} }
      `}</style>

      <div style={{
        background: '#0a0a0f',
        border: '1px solid rgba(139,92,246,0.3)',
        borderRadius: 8,
        padding: 20,
        width: '100%',
        boxSizing: 'border-box',
        minHeight: 160,
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 18,
          gap: 12,
          flexWrap: 'wrap',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {incidentActive && (
              <span style={{
                display: 'inline-block',
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: '#8b5cf6',
                boxShadow: '0 0 8px #8b5cf6',
                animation: 'smDotPulse 1.2s ease-in-out infinite',
              }} />
            )}
            <span style={{
              color: '#8b5cf6',
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: '0.1em',
              fontFamily: 'monospace',
            }}>
              AI REASONING ENGINE
            </span>
          </div>

          {allRuleBased ? (
            <span style={{
              color: '#f97316',
              fontSize: 11,
              fontFamily: 'monospace',
              fontWeight: 700,
            }}>
              RULE-BASED MODE - Groq unavailable
            </span>
          ) : (
            <span style={{
              color: hasGroqAi ? '#22c55e' : 'rgba(255,255,255,0.32)',
              fontSize: 11,
              fontFamily: 'monospace',
              fontWeight: hasGroqAi ? 700 : 500,
            }}>
              POWERED BY GROQ - Llama 3.3 70B
            </span>
          )}
        </div>

        {reasoningSteps.length === 0 ? (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 90,
            backgroundImage: 'linear-gradient(rgba(139,92,246,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(139,92,246,0.04) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
            animation: 'smGridDrift 8s linear infinite',
            borderRadius: 8,
          }}>
            <span style={{ color: 'rgba(255,255,255,0.24)', fontSize: 13, fontFamily: 'monospace' }}>
              Awaiting security event...
            </span>
          </div>
        ) : (
          <div style={{ position: 'relative' }}>
            {reasoningSteps.length > 1 && (
              <div style={{
                position: 'absolute',
                left: 4,
                top: 26,
                width: 1,
                bottom: 26,
                background: 'rgba(139,92,246,0.18)',
                zIndex: 0,
              }} />
            )}

            {reasoningSteps.map((step, idx) => {
              const isLatest = idx === animIdx;
              const displayText = isLatest ? animText : (step.reasoning || '');
              const showCursor = isLatest && animText.length < (step.reasoning || '').length;

              return (
                <ReasoningStep
                  key={`${step.timestamp || idx}-${idx}`}
                  step={step}
                  displayText={displayText}
                  showCursor={showCursor}
                />
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
