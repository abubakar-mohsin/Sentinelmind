import React, { useState, useRef, useEffect } from 'react';

/**
 * GraphInsights — AI-generated intelligence analysis of the security knowledge graph.
 * Uses a separate Groq API call (POST /api/graph/insights) to answer:
 *   "What does this graph tell us?"
 * 
 * Distinct from the AI Reasoning Panel which answers:
 *   "What is happening right now?"
 */
export default function GraphInsights({ graphNodes, graphEdges }) {
  const [insights,    setInsights]    = useState(null);
  const [loading,     setLoading]     = useState(false);
  const [source,      setSource]      = useState(null);
  const [streamIdx,   setStreamIdx]   = useState(-1);
  const [streamText,  setStreamText]  = useState('');
  const intervalRef = useRef(null);

  /* ── Typewriter streaming effect ── */
  useEffect(() => {
    if (!insights || streamIdx < 0 || streamIdx >= insights.length) return;

    const fullText = insights[streamIdx];
    let charIdx = 0;
    setStreamText('');

    intervalRef.current = setInterval(() => {
      charIdx++;
      setStreamText(fullText.slice(0, charIdx));
      if (charIdx >= fullText.length) {
        clearInterval(intervalRef.current);
      }
    }, 12);

    return () => clearInterval(intervalRef.current);
  }, [insights, streamIdx]);

  async function analyzeGraph() {
    setLoading(true);
    setInsights(null);
    setStreamIdx(-1);
    setStreamText('');

    try {
      const API_BASE = process.env.REACT_APP_API_URL || '';
      const headers = new Headers();
      headers.set('Authorization', 'Basic ' + btoa('admin:sentinelmind'));
      headers.set('Content-Type', 'application/json');

      const res = await fetch(`${API_BASE}/api/graph/insights`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          nodes: graphNodes || [],
          edges: graphEdges || [],
        }),
      });

      if (!res.ok) throw new Error('Failed to generate insights');
      const data = await res.json();

      setInsights(data.insights || []);
      setSource(data.source || 'UNKNOWN');
      setStreamIdx(0); // Start streaming first insight
    } catch (err) {
      console.error('[GraphInsights] error:', err);
      setInsights(['Error: ' + err.message]);
      setSource('ERROR');
    } finally {
      setLoading(false);
    }
  }

  /* ── Advance to next insight after streaming completes ── */
  useEffect(() => {
    if (!insights || streamIdx < 0) return;
    if (streamText.length > 0 && streamText === insights[streamIdx]) {
      const nextTimer = setTimeout(() => {
        if (streamIdx < insights.length - 1) {
          setStreamIdx(s => s + 1);
        }
      }, 400);
      return () => clearTimeout(nextTimer);
    }
  }, [streamText, insights, streamIdx]);

  const allStreamed = insights && streamIdx >= insights.length - 1 &&
    streamText === (insights[insights.length - 1] || '');

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#8B5CF6" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2a10 10 0 1 0 10 10" />
            <path d="M12 2v10l6.93 4" />
            <circle cx="12" cy="12" r="1" />
          </svg>
          AI Graph Intelligence
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {source && (
            <span className={`badge ${source === 'GROQ_AI' ? 'badge-brand' : 'badge-neutral'}`}
              style={{ fontSize: 10, display: 'flex', alignItems: 'center', gap: 4 }}>
              {source === 'GROQ_AI' ? (
                <>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>
                  Groq AI
                </>
              ) : (
                <>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.3 15.3a2.4 2.4 0 0 1 0 3.4l-2.6 2.6a2.4 2.4 0 0 1-3.4 0L2.7 8.7a2.41 2.41 0 0 1 0-3.4l2.6-2.6a2.41 2.41 0 0 1 3.4 0Z"/><path d="m14.5 12.5 2-2"/><path d="m11.5 9.5 2-2"/><path d="m8.5 6.5 2-2"/><path d="m17.5 15.5 2-2"/></svg>
                  Rule-Based
                </>
              )}
            </span>
          )}
          <button className="btn btn-primary btn-sm" onClick={analyzeGraph}
            disabled={loading}
            style={{ fontSize: 11, gap: 5 }}>
            {loading ? (
              <>
                <span className="dot-pulse-brand" style={{ width: 5, height: 5 }} />
                Analyzing…
              </>
            ) : (
              <>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                Analyze Graph
              </>
            )}
          </button>
        </div>
      </div>

      <div style={{ padding: '14px 18px', minHeight: 80 }}>
        {!insights && !loading && (
          <div style={{
            textAlign: 'center', padding: '20px 0', color: 'var(--text-4)', fontSize: 13,
          }}>
            Click <strong>Analyze Graph</strong> to generate AI intelligence insights about the current threat landscape.
          </div>
        )}

        {loading && (
          <div style={{
            textAlign: 'center', padding: '20px 0', color: 'var(--accent)', fontSize: 13,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}>
            <span className="dot-pulse-brand" style={{ width: 6, height: 6 }} />
            Analyzing graph structure with Groq AI…
          </div>
        )}

        {insights && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {insights.map((insight, idx) => {
              const isStreaming = idx === streamIdx;
              const isComplete = idx < streamIdx;
              const isPending  = idx > streamIdx;

              return (
                <div key={idx} style={{
                  display: 'flex', gap: 10, alignItems: 'flex-start',
                  padding: '10px 14px',
                  background: isStreaming ? 'rgba(139,92,246,0.06)' : 'var(--bg-elevated)',
                  border: `1px solid ${isStreaming ? 'rgba(139,92,246,0.2)' : 'var(--border)'}`,
                  borderRadius: 8,
                  opacity: isPending ? 0.3 : 1,
                  transition: 'all 0.3s ease',
                }}>
                  <span style={{
                    fontSize: 11, fontWeight: 700, color: 'var(--accent)',
                    background: 'var(--accent-dim)', borderRadius: '50%',
                    width: 22, height: 22, display: 'flex', alignItems: 'center',
                    justifyContent: 'center', flexShrink: 0, marginTop: 1,
                  }}>
                    {idx + 1}
                  </span>
                  <span style={{
                    fontSize: 13, color: 'var(--text-2)', lineHeight: 1.5,
                  }}>
                    {isStreaming ? streamText : isComplete ? insight : '…'}
                    {isStreaming && <span className="reasoning-cursor">▎</span>}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
