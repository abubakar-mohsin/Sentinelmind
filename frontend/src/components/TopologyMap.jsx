import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

/* ─────────────────────────── Data ─────────────────────────── */

const RAW_NODES = [
  { id: 'attacker', label: '185.220.101.47',         sublabel: 'TOR EXIT NODE',     type: 'ip'      },
  { id: 'user',     label: 'ahmed@targetcorp.com',   sublabel: 'FINANCE  //  PK',   type: 'user'    },
  { id: 'service',  label: 'AuthService',            sublabel: 'CRITICALITY: HIGH', type: 'service' },
];

const RAW_LINKS = [
  { source: 'attacker', target: 'user',    label: 'CREDENTIAL STUFFING' },
  { source: 'attacker', target: 'service', label: 'TARGETS'             },
];

/* ─────────────────────────── Shapes ───────────────────────── */

// Flat-topped hexagon path, radius r
function hexPath(r = 14) {
  const pts = Array.from({ length: 6 }, (_, i) => {
    const angle = (Math.PI / 3) * i - Math.PI / 6;
    return `${(r * Math.cos(angle)).toFixed(2)},${(r * Math.sin(angle)).toFixed(2)}`;
  });
  return `M ${pts.join(' L ')} Z`;
}

/* ─────────────────────────── Component ─────────────────────── */

export default function TopologyMap({ attackActive, contained }) {
  const svgRef    = useRef(null);
  const initRef   = useRef(false);
  const pulseRef  = useRef(null);

  /* One-time D3 initialisation */
  useEffect(() => {
    if (initRef.current || !svgRef.current) return;
    initRef.current = true;

    const W = 316, H = 256;
    const svg = d3.select(svgRef.current);

    const nodes = RAW_NODES.map(d => ({ ...d }));
    const links = RAW_LINKS.map(d => ({ ...d }));

    const sim = d3.forceSimulation(nodes)
      .force('link',    d3.forceLink(links).id(d => d.id).distance(120))
      .force('charge',  d3.forceManyBody().strength(-220))
      .force('center',  d3.forceCenter(W / 2, H / 2))
      .force('collide', d3.forceCollide(42));

    /* Links */
    const linkSel = svg.append('g').selectAll('line').data(links).join('line')
      .attr('class', 'topo-link')
      .attr('stroke', 'rgba(0,245,255,0.12)')
      .attr('stroke-width', 1);

    const linkLabelSel = svg.append('g').selectAll('text').data(links).join('text')
      .attr('text-anchor', 'middle')
      .attr('font-family', "'JetBrains Mono', monospace")
      .attr('font-size', '8')
      .attr('fill', '#4A5568')
      .text(d => d.label);

    /* Nodes */
    const nodeSel = svg.append('g').selectAll('g').data(nodes).join('g')
      .attr('class', d => `node node-${d.type}`);

    // Attacker IP → hexagon
    nodeSel.filter(d => d.type === 'ip')
      .append('path')
      .attr('class', 'shape ip-shape')
      .attr('d', hexPath(14))
      .attr('fill', 'rgba(255,45,85,0.10)')
      .attr('stroke', '#FF2D55')
      .attr('stroke-width', 1.5);

    // Contained X overlay
    nodeSel.filter(d => d.type === 'ip')
      .append('text')
      .attr('class', 'ip-x')
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .attr('font-size', '18')
      .attr('fill', '#FF2D55')
      .attr('opacity', 0)
      .text('✕');

    // User → circle
    nodeSel.filter(d => d.type === 'user')
      .append('circle')
      .attr('class', 'shape')
      .attr('r', 10)
      .attr('fill', 'rgba(255,184,0,0.10)')
      .attr('stroke', '#FFB800')
      .attr('stroke-width', 1.5);

    // Service → square
    nodeSel.filter(d => d.type === 'service')
      .append('rect')
      .attr('class', 'shape')
      .attr('x', -10).attr('y', -10)
      .attr('width', 20).attr('height', 20)
      .attr('fill', 'rgba(0,245,255,0.07)')
      .attr('stroke', '#00F5FF')
      .attr('stroke-width', 1.5);

    /* Labels */
    const labelSel = svg.append('g').selectAll('g').data(nodes).join('g').attr('class', 'node-label');

    labelSel.append('text')
      .attr('text-anchor', 'middle')
      .attr('font-family', "'JetBrains Mono', monospace")
      .attr('font-size', '9')
      .attr('fill', '#C8D0DC')
      .attr('dy', '28')
      .text(d => d.label.length > 22 ? d.label.slice(0, 21) + '…' : d.label);

    labelSel.append('text')
      .attr('text-anchor', 'middle')
      .attr('font-family', "'JetBrains Mono', monospace")
      .attr('font-size', '8')
      .attr('fill', '#4A5568')
      .attr('dy', '39')
      .text(d => d.sublabel);

    sim.on('tick', () => {
      linkSel
        .attr('x1', d => d.source.x).attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x).attr('y2', d => d.target.y);

      linkLabelSel
        .attr('x', d => (d.source.x + d.target.x) / 2)
        .attr('y', d => (d.source.y + d.target.y) / 2 - 5);

      nodeSel.attr('transform', d => `translate(${d.x},${d.y})`);
      labelSel.attr('transform', d => `translate(${d.x},${d.y})`);
    });

    return () => sim.stop();
  }, []);

  /* Visual state updates (no simulation restart) */
  useEffect(() => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    const isAttacking = attackActive && !contained;

    // Links
    svg.selectAll('.topo-link')
      .transition().duration(400)
      .attr('stroke',
        contained    ? 'rgba(0,255,136,0.35)' :
        isAttacking  ? 'rgba(255,45,85,0.55)' :
                       'rgba(0,245,255,0.12)')
      .attr('stroke-width', isAttacking ? 1.5 : 1)
      .attr('stroke-dasharray', isAttacking ? '4 2' : null);

    // IP shape
    svg.selectAll('.ip-shape')
      .transition().duration(300)
      .attr('fill',
        contained ? 'rgba(74,85,104,0.18)' : 'rgba(255,45,85,0.10)')
      .attr('stroke',
        contained ? '#4A5568' : '#FF2D55');

    // X overlay
    svg.selectAll('.ip-x')
      .transition().duration(300)
      .attr('opacity', contained ? 1 : 0);
  }, [attackActive, contained]);

  /* Pulse animation via interval (CSS filter on SVG elements) */
  useEffect(() => {
    const isAttacking = attackActive && !contained;
    if (isAttacking) {
      let bright = true;
      pulseRef.current = setInterval(() => {
        if (!svgRef.current) return;
        d3.select(svgRef.current).selectAll('.ip-shape')
          .attr('filter', bright
            ? 'drop-shadow(0 0 8px rgba(255,45,85,0.9))'
            : 'drop-shadow(0 0 2px rgba(255,45,85,0.3))');
        bright = !bright;
      }, 750);
    } else {
      clearInterval(pulseRef.current);
      if (svgRef.current) {
        d3.select(svgRef.current).selectAll('.ip-shape')
          .attr('filter', contained ? 'none' : null);
      }
    }
    return () => clearInterval(pulseRef.current);
  }, [attackActive, contained]);

  return (
    <div className="panel" style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
      <div className="panel-header">
        <span>⬡ NETWORK TOPOLOGY</span>
        <span style={{
          fontSize: 9, color: attackActive && !contained
            ? 'var(--red)'
            : contained ? 'var(--green)' : 'var(--text-3)',
          letterSpacing: '0.10em',
        }}>
          {attackActive && !contained ? 'UNDER ATTACK' : contained ? 'CONTAINED' : 'MONITORING'}
        </span>
      </div>

      <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
        <svg
          ref={svgRef}
          width="100%"
          height="100%"
          viewBox="0 0 316 256"
          style={{ display: 'block', overflow: 'visible' }}
        />
      </div>

      {/* Legend */}
      <div style={{
        padding:        '6px 14px',
        borderTop:      '1px solid var(--border)',
        display:        'flex',
        gap:            12,
        flexShrink:     0,
      }}>
        {[
          { shape: '⬡', color: 'var(--red)',    label: 'ATTACKER IP'  },
          { shape: '●', color: 'var(--yellow)',  label: 'USER'         },
          { shape: '■', color: 'var(--cyan)',    label: 'SERVICE'      },
        ].map(({ shape, color, label }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ color, fontSize: 10 }}>{shape}</span>
            <span style={{ fontSize: 9, color: 'var(--text-3)', letterSpacing: '0.06em' }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
