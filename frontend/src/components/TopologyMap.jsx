import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

/*
 * TopologyMap — Live D3 force-directed network topology.
 *
 * Behaviour:
 *   NOMINAL:  User + Service nodes connected by a thin neutral line.
 *   ATTACK:   Attacker IP node fades+scales in with enter transition.
 *             Attack edges pulse red via dasharray animation.
 *   CONTAINED: Attacker node dims and shows containment marker (X).
 *
 * No emojis. Pure D3 SVG elements.
 */

const BASE_NODES = [
  { id: 'user',    label: 'ahmed@targetcorp.com', sublabel: 'Finance · PK', type: 'user',
    targetX: 75,  targetY: 160 },
  { id: 'service', label: 'AuthService',           sublabel: 'Criticality: High', type: 'service',
    targetX: 225, targetY: 160 },
];

const ATTACKER_NODE = {
  id: 'attacker', label: '185.220.101.47', sublabel: 'Tor Exit Node', type: 'ip',
  targetX: 150, targetY: 55,
};

const BASE_LINKS = [
  { source: 'user', target: 'service', label: 'AuthService', passive: true },
];

const ATTACK_LINKS = [
  { source: 'attacker', target: 'user',    label: 'Credential Stuffing', attack: true },
  { source: 'attacker', target: 'service', label: 'Targets',             attack: true },
];

function hexPath(r = 13) {
  const pts = Array.from({ length: 6 }, (_, i) => {
    const angle = (Math.PI / 3) * i - Math.PI / 6;
    return `${(r * Math.cos(angle)).toFixed(2)},${(r * Math.sin(angle)).toFixed(2)}`;
  });
  return `M ${pts.join(' L ')} Z`;
}

export default function TopologyMap({ attackActive, contained }) {
  const svgRef     = useRef(null);
  const simRef     = useRef(null);
  const nodesRef   = useRef([...BASE_NODES]);
  const linksRef   = useRef([...BASE_LINKS]);
  const stateRef   = useRef('NOMINAL'); // 'NOMINAL' | 'ATTACK' | 'CONTAINED'
  const pulseRef   = useRef(null);

  /* ── Initial D3 setup ── */
  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    /* Layers */
    const linkLayer      = svg.append('g').attr('class', 'link-layer');
    const linkLabelLayer = svg.append('g').attr('class', 'link-label-layer');
    const nodeLayer      = svg.append('g').attr('class', 'node-layer');
    const labelLayer     = svg.append('g').attr('class', 'label-layer');

    function drawAll() {
      const nodes = nodesRef.current;
      const links = linksRef.current.map(l => ({
        ...l,
        source: typeof l.source === 'string' ? nodes.find(n => n.id === l.source) : l.source,
        target: typeof l.target === 'string' ? nodes.find(n => n.id === l.target) : l.target,
      })).filter(l => l.source && l.target);

      /* ── Links ── */
      const linkSel = linkLayer.selectAll('line').data(links, d => `${d.source.id}-${d.target.id}`);
      linkSel.exit().remove();
      const linkEnter = linkSel.enter().append('line')
        .attr('class', 'topo-link')
        .attr('stroke-width', 1)
        .attr('stroke', 'rgba(255,255,255,0.07)');
      linkEnter.merge(linkSel);

      /* ── Link labels ── */
      const lblBgSel = linkLabelLayer.selectAll('text.bg').data(links, d => `${d.source.id}-${d.target.id}`);
      lblBgSel.exit().remove();
      lblBgSel.enter().append('text').attr('class', 'bg')
        .attr('text-anchor', 'middle').attr('font-family', 'Inter,system-ui,sans-serif')
        .attr('font-size', '9').attr('stroke', 'var(--bg-root)').attr('stroke-width', 4)
        .attr('stroke-linejoin', 'round').text(d => d.label);

      const lblSel = linkLabelLayer.selectAll('text.fg').data(links, d => `${d.source.id}-${d.target.id}`);
      lblSel.exit().remove();
      lblSel.enter().append('text').attr('class', 'fg')
        .attr('text-anchor', 'middle').attr('font-family', 'Inter,system-ui,sans-serif')
        .attr('font-size', '9').attr('fill', 'var(--text-3)').text(d => d.label);

      /* ── Node groups ── */
      const nodeSel = nodeLayer.selectAll('g.node-g').data(nodes, d => d.id);
      nodeSel.exit().transition().duration(300).style('opacity', 0).remove();

      const nodeEnter = nodeSel.enter().append('g').attr('class', d => `node-g node-${d.type}`)
        .style('opacity', 0)
        .call(d3.drag()
          .on('start', (evt, d) => { if (!evt.active) simRef.current?.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
          .on('drag',  (evt, d) => { d.fx = evt.x; d.fy = evt.y; })
          .on('end',   (evt, d) => { if (!evt.active) simRef.current?.alphaTarget(0); d.fx = null; d.fy = null; })
        );
      nodeEnter.transition().duration(400).style('opacity', 1);

      /* Attacker hex */
      nodeEnter.filter(d => d.type === 'ip')
        .append('path').attr('class', 'ip-shape')
        .attr('d', hexPath(14))
        .attr('fill', 'rgba(239,68,68,0.12)').attr('stroke', 'var(--danger)').attr('stroke-width', 1.5);

      /* Containment X marker — hidden by default */
      nodeEnter.filter(d => d.type === 'ip')
        .append('line').attr('class', 'ip-x-h')
        .attr('x1', -7).attr('y1', -7).attr('x2', 7).attr('y2', 7)
        .attr('stroke', 'var(--danger)').attr('stroke-width', 2).attr('stroke-linecap', 'round')
        .attr('opacity', 0);
      nodeEnter.filter(d => d.type === 'ip')
        .append('line').attr('class', 'ip-x-v')
        .attr('x1', 7).attr('y1', -7).attr('x2', -7).attr('y2', 7)
        .attr('stroke', 'var(--danger)').attr('stroke-width', 2).attr('stroke-linecap', 'round')
        .attr('opacity', 0);

      /* User circle */
      nodeEnter.filter(d => d.type === 'user')
        .append('circle').attr('class', 'shape')
        .attr('r', 10)
        .attr('fill', 'rgba(245,158,11,0.12)').attr('stroke', 'var(--warning)').attr('stroke-width', 1.5);

      /* Service rect */
      nodeEnter.filter(d => d.type === 'service')
        .append('rect').attr('class', 'shape')
        .attr('x', -10).attr('y', -10).attr('width', 20).attr('height', 20).attr('rx', 4)
        .attr('fill', 'rgba(59,130,246,0.10)').attr('stroke', 'var(--accent)').attr('stroke-width', 1.5);

      /* ── Labels ── */
      const labelSel = labelLayer.selectAll('g.label-g').data(nodes, d => d.id);
      labelSel.exit().remove();

      const labelEnter = labelSel.enter().append('g').attr('class', 'label-g').style('opacity', 0);
      labelEnter.transition().duration(400).style('opacity', 1);

      labelEnter.append('text')
        .attr('text-anchor', 'middle').attr('font-family', 'Inter,system-ui,sans-serif')
        .attr('font-size', '9.5').attr('dy', '26')
        .attr('stroke', 'var(--bg-root)').attr('stroke-width', 4).attr('stroke-linejoin', 'round')
        .text(d => d.label.length > 22 ? d.label.slice(0, 21) + '…' : d.label);

      labelEnter.append('text')
        .attr('text-anchor', 'middle').attr('font-family', 'Inter,system-ui,sans-serif')
        .attr('font-size', '9.5').attr('fill', 'var(--text-2)').attr('dy', '26')
        .text(d => d.label.length > 22 ? d.label.slice(0, 21) + '…' : d.label);

      labelEnter.append('text')
        .attr('text-anchor', 'middle').attr('font-family', 'Inter,system-ui,sans-serif')
        .attr('font-size', '8.5').attr('fill', 'var(--text-3)').attr('dy', '38')
        .text(d => d.sublabel);

      /* ── Force sim ── */
      if (simRef.current) simRef.current.stop();

      simRef.current = d3.forceSimulation(nodes)
        .force('link',    d3.forceLink(links).id(d => d.id).distance(110))
        .force('charge',  d3.forceManyBody().strength(-200))
        .force('x',       d3.forceX(d => d.targetX).strength(0.12))
        .force('y',       d3.forceY(d => d.targetY).strength(0.12))
        .force('collide', d3.forceCollide(38))
        .on('tick', () => {
          linkLayer.selectAll('line')
            .attr('x1', d => d.source.x).attr('y1', d => d.source.y)
            .attr('x2', d => d.target.x).attr('y2', d => d.target.y);
          linkLabelLayer.selectAll('text')
            .attr('x', d => (d.source.x + d.target.x) / 2)
            .attr('y', d => (d.source.y + d.target.y) / 2 - 5);
          nodeLayer.selectAll('g.node-g').attr('transform', d => `translate(${d.x},${d.y})`);
          labelLayer.selectAll('g.label-g').attr('transform', d => `translate(${d.x},${d.y})`);
        });
    }

    drawAll();
    svgRef._drawAll = drawAll; // store for state updates

    return () => simRef.current?.stop();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── React to attackActive / contained state changes ── */
  useEffect(() => {
    if (!svgRef.current) return;
    const nextState = attackActive && !contained ? 'ATTACK' : contained ? 'CONTAINED' : 'NOMINAL';
    if (nextState === stateRef.current) return;
    stateRef.current = nextState;

    const svg = d3.select(svgRef.current);

    if (nextState === 'ATTACK') {
      /* Add attacker node + attack links */
      if (!nodesRef.current.find(n => n.id === 'attacker')) {
        nodesRef.current = [...nodesRef.current, { ...ATTACKER_NODE, x: 150, y: 115 }];
      }
      nodesRef.current = nodesRef.current.map(n =>
        n.id === 'attacker' ? { ...n, targetX: 150, targetY: 55 } : n
      );
      linksRef.current = [...BASE_LINKS, ...ATTACK_LINKS];
    } else if (nextState === 'CONTAINED') {
      /* Keep attacker but dim it */
      linksRef.current = [...BASE_LINKS, ...ATTACK_LINKS];
    } else {
      /* Remove attacker */
      nodesRef.current = [...BASE_NODES];
      linksRef.current = [...BASE_LINKS];
    }

    /* Redraw */
    if (svgRef._drawAll) svgRef._drawAll();

    /* Update link colours */
    svg.selectAll('.topo-link')
      .transition().duration(400)
      .attr('stroke', d =>
        d.attack && nextState === 'ATTACK'     ? 'rgba(239,68,68,0.55)' :
        d.attack && nextState === 'CONTAINED'  ? 'rgba(239,68,68,0.2)'  :
        'rgba(255,255,255,0.07)'
      )
      .attr('stroke-width',  d => (d.attack && nextState === 'ATTACK') ? 1.5 : 1)
      .attr('stroke-dasharray', d => (d.attack && nextState === 'ATTACK') ? '5 3' : null);

    /* IP shape state */
    svg.selectAll('.ip-shape')
      .transition().duration(300)
      .attr('fill', nextState === 'CONTAINED' ? 'rgba(82,82,91,0.15)' : 'rgba(239,68,68,0.12)')
      .attr('stroke', nextState === 'CONTAINED' ? 'var(--text-3)' : 'var(--danger)');

    /* Containment X */
    const xOpacity = nextState === 'CONTAINED' ? 1 : 0;
    svg.selectAll('.ip-x-h, .ip-x-v').transition().duration(300).attr('opacity', xOpacity);

    /* Pulse interval */
    clearInterval(pulseRef.current);
    if (nextState === 'ATTACK') {
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
      svg.selectAll('.ip-shape').attr('filter', null);
    }
  }, [attackActive, contained]);

  /* Cleanup pulse on unmount */
  useEffect(() => () => clearInterval(pulseRef.current), []);

  const stateLabel = attackActive && !contained ? 'Under Attack' : contained ? 'Contained' : 'Monitoring';
  const stateColor = attackActive && !contained ? 'var(--danger)' : contained ? 'var(--success)' : 'var(--text-4)';

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', minHeight: 200 }}>
      <div className="card-header">
        <span className="card-title">
          {/* Network icon — pure SVG, no lucide import to keep D3 file light */}
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="5" r="3"/><circle cx="5" cy="19" r="3"/><circle cx="19" cy="19" r="3"/>
            <path d="M12 8v3.5M7.5 16.5l4 2M16.5 16.5l-4 2"/>
          </svg>
          Network Topology
        </span>
        <span style={{ fontSize: 11.5, fontWeight: 600, color: stateColor, letterSpacing: '0.04em' }}>
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
      <div style={{ padding: '8px 18px', borderTop: '1px solid var(--border)', display: 'flex', gap: 14, flexShrink: 0 }}>
        {[
          { color: 'var(--danger)',  label: 'Attacker IP' },
          { color: 'var(--warning)', label: 'User'        },
          { color: 'var(--accent)',  label: 'Service'     },
        ].map(({ color, label }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: color, display: 'inline-block' }} />
            <span style={{ fontSize: 11, color: 'var(--text-4)' }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
