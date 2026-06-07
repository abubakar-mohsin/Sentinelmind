import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

/* ── Data ───────────────────────────────────────── */

const RAW_NODES = [
  { id: 'attacker', label: '185.220.101.47',        sublabel: 'Tor Exit Node',   type: 'ip',      targetX: 150, targetY: 60  },
  { id: 'user',     label: 'ahmed@targetcorp.com',  sublabel: 'Finance · PK',    type: 'user',    targetX: 75,  targetY: 165 },
  { id: 'service',  label: 'AuthService',           sublabel: 'Criticality: High', type: 'service', targetX: 225, targetY: 165 },
];

const RAW_LINKS = [
  { source: 'attacker', target: 'user',    label: 'Credential Stuffing' },
  { source: 'attacker', target: 'service', label: 'Targets'             },
];

function hexPath(r = 13) {
  const pts = Array.from({ length: 6 }, (_, i) => {
    const angle = (Math.PI / 3) * i - Math.PI / 6;
    return `${(r * Math.cos(angle)).toFixed(2)},${(r * Math.sin(angle)).toFixed(2)}`;
  });
  return `M ${pts.join(' L ')} Z`;
}

/* ── Component ──────────────────────────────────── */

export default function TopologyMap({ attackActive, contained }) {
  const svgRef   = useRef(null);
  const initRef  = useRef(false);
  const pulseRef = useRef(null);

  /* One-time D3 init */
  useEffect(() => {
    if (initRef.current || !svgRef.current) return;
    initRef.current = true;

    const W = 300, H = 230;
    const svg = d3.select(svgRef.current);

    const nodes = RAW_NODES.map(d => ({ ...d, x: W/2, y: 110 }));
    const links = RAW_LINKS.map(d => ({ ...d }));

    const sim = d3.forceSimulation(nodes)
      .force('link',    d3.forceLink(links).id(d => d.id).distance(110))
      .force('charge',  d3.forceManyBody().strength(-200))
      .force('x',       d3.forceX(d => d.targetX).strength(0.12))
      .force('y',       d3.forceY(d => d.targetY).strength(0.12))
      .force('collide', d3.forceCollide(38));

    const linkSel = svg.append('g').selectAll('line').data(links).join('line')
      .attr('class', 'topo-link')
      .attr('stroke', 'rgba(255,255,255,0.07)')
      .attr('stroke-width', 1);

    const linkLabelStrokeSel = svg.append('g').selectAll('text').data(links).join('text')
      .attr('text-anchor', 'middle')
      .attr('font-family', "'Plus Jakarta Sans', system-ui, sans-serif")
      .attr('font-size', '9')
      .attr('stroke', '#18181B').attr('stroke-width', 4).attr('stroke-linejoin', 'round')
      .text(d => d.label);

    const linkLabelSel = svg.append('g').selectAll('text').data(links).join('text')
      .attr('text-anchor', 'middle')
      .attr('font-family', "'Plus Jakarta Sans', system-ui, sans-serif")
      .attr('font-size', '9')
      .attr('fill', '#52525B')
      .text(d => d.label);

    const nodeSel = svg.append('g').selectAll('g').data(nodes).join('g')
      .attr('class', d => `node node-${d.type}`);

    /* Attacker IP → hexagon */
    nodeSel.filter(d => d.type === 'ip')
      .append('path')
      .attr('class', 'shape ip-shape')
      .attr('d', hexPath(14))
      .attr('fill', 'rgba(239,68,68,0.12)')
      .attr('stroke', '#EF4444')
      .attr('stroke-width', 1.5);

    nodeSel.filter(d => d.type === 'ip')
      .append('text')
      .attr('class', 'ip-x')
      .attr('text-anchor', 'middle').attr('dominant-baseline', 'middle')
      .attr('font-size', '16').attr('fill', '#EF4444').attr('opacity', 0)
      .text('✕');

    /* User → circle */
    nodeSel.filter(d => d.type === 'user')
      .append('circle').attr('class', 'shape')
      .attr('r', 10)
      .attr('fill', 'rgba(245,158,11,0.12)')
      .attr('stroke', '#F59E0B').attr('stroke-width', 1.5);

    /* Service → rounded rect */
    nodeSel.filter(d => d.type === 'service')
      .append('rect').attr('class', 'shape')
      .attr('x', -10).attr('y', -10).attr('width', 20).attr('height', 20).attr('rx', 4)
      .attr('fill', 'rgba(99,102,241,0.10)')
      .attr('stroke', '#6366F1').attr('stroke-width', 1.5);

    const labelSel = svg.append('g').selectAll('g').data(nodes).join('g');

    labelSel.append('text')
      .attr('text-anchor', 'middle')
      .attr('font-family', "'Plus Jakarta Sans', system-ui, sans-serif")
      .attr('font-size', '9.5').attr('dy', '26')
      .attr('stroke', '#18181B').attr('stroke-width', 4).attr('stroke-linejoin', 'round')
      .text(d => d.label.length > 22 ? d.label.slice(0, 21) + '…' : d.label);

    labelSel.append('text')
      .attr('text-anchor', 'middle')
      .attr('font-family', "'Plus Jakarta Sans', system-ui, sans-serif")
      .attr('font-size', '8.5').attr('dy', '38')
      .attr('stroke', '#18181B').attr('stroke-width', 4).attr('stroke-linejoin', 'round')
      .text(d => d.sublabel);

    labelSel.append('text')
      .attr('text-anchor', 'middle')
      .attr('font-family', "'Plus Jakarta Sans', system-ui, sans-serif")
      .attr('font-size', '9.5').attr('fill', '#A1A1AA').attr('dy', '26')
      .text(d => d.label.length > 22 ? d.label.slice(0, 21) + '…' : d.label);

    labelSel.append('text')
      .attr('text-anchor', 'middle')
      .attr('font-family', "'Plus Jakarta Sans', system-ui, sans-serif")
      .attr('font-size', '8.5').attr('fill', '#52525B').attr('dy', '38')
      .text(d => d.sublabel);

    sim.on('tick', () => {
      linkSel
        .attr('x1', d => d.source.x).attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x).attr('y2', d => d.target.y);
      linkLabelStrokeSel
        .attr('x', d => (d.source.x + d.target.x) / 2)
        .attr('y', d => (d.source.y + d.target.y) / 2 - 5);
      linkLabelSel
        .attr('x', d => (d.source.x + d.target.x) / 2)
        .attr('y', d => (d.source.y + d.target.y) / 2 - 5);
      nodeSel.attr('transform', d => `translate(${d.x},${d.y})`);
      labelSel.attr('transform', d => `translate(${d.x},${d.y})`);
    });

    return () => sim.stop();
  }, []);

  /* Visual state updates */
  useEffect(() => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    const isAttacking = attackActive && !contained;

    svg.selectAll('.topo-link')
      .transition().duration(400)
      .attr('stroke',
        contained   ? 'rgba(34,197,94,0.35)' :
        isAttacking ? 'rgba(239,68,68,0.5)'  : 'rgba(255,255,255,0.07)')
      .attr('stroke-width', isAttacking ? 1.5 : 1)
      .attr('stroke-dasharray', isAttacking ? '4 2' : null);

    svg.selectAll('.ip-shape')
      .transition().duration(300)
      .attr('fill', contained ? 'rgba(82,82,91,0.15)' : 'rgba(239,68,68,0.12)')
      .attr('stroke', contained ? '#52525B' : '#EF4444');

    svg.selectAll('.ip-x')
      .transition().duration(300)
      .attr('opacity', contained ? 1 : 0);
  }, [attackActive, contained]);

  /* Pulse */
  useEffect(() => {
    const isAttacking = attackActive && !contained;
    if (isAttacking) {
      let bright = true;
      pulseRef.current = setInterval(() => {
        if (!svgRef.current) return;
        d3.select(svgRef.current).selectAll('.ip-shape')
          .attr('filter', bright
            ? 'drop-shadow(0 0 7px rgba(239,68,68,0.8))'
            : 'drop-shadow(0 0 2px rgba(239,68,68,0.3))');
        bright = !bright;
      }, 750);
    } else {
      clearInterval(pulseRef.current);
      if (svgRef.current) {
        d3.select(svgRef.current).selectAll('.ip-shape').attr('filter', null);
      }
    }
    return () => clearInterval(pulseRef.current);
  }, [attackActive, contained]);

  const stateLabel = attackActive && !contained ? 'Under Attack' : contained ? 'Contained' : 'Monitoring';
  const stateColor = attackActive && !contained ? 'var(--danger)' : contained ? 'var(--success)' : 'var(--text-4)';

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', minHeight: 200 }}>
      <div className="card-header">
        <span className="card-title">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="5" r="3"/><circle cx="5" cy="19" r="3"/><circle cx="19" cy="19" r="3"/>
            <path d="M12 8v3.5M7.5 16.5l4 2M16.5 16.5l-4 2"/>
          </svg>
          Network Topology
        </span>
        <span style={{ fontSize: 11.5, fontWeight: 600, color: stateColor }}>
          {stateLabel}
        </span>
      </div>

      <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
        <svg
          ref={svgRef}
          width="100%"
          height="100%"
          viewBox="0 0 300 230"
          style={{ display: 'block', overflow: 'visible' }}
        />
      </div>

      {/* Legend */}
      <div style={{
        padding: '8px 18px', borderTop: '1px solid var(--border)',
        display: 'flex', gap: 14, flexShrink: 0,
      }}>
        {[
          { sym: '⬡', color: '#EF4444', label: 'Attacker' },
          { sym: '●', color: '#F59E0B', label: 'User'     },
          { sym: '■', color: '#6366F1', label: 'Service'  },
        ].map(({ sym, color, label }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ color, fontSize: 10 }}>{sym}</span>
            <span style={{ fontSize: 11, color: 'var(--text-4)' }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
