import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as d3 from 'd3';

/* ══════════════════════════════════════════════════════════════════
   NODE STYLING CONFIG — shapes, colors, icons per node type
   ══════════════════════════════════════════════════════════════════ */

const NODE_CONFIG = {
  User:            { shape: 'circle',  color: '#F59E0B', bg: 'rgba(245,158,11,0.12)', r: 16, iconSvg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>' },
  IP:              { shape: 'hexagon', color: '#EF4444', bg: 'rgba(239,68,68,0.12)',  r: 16, iconSvg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/><path d="M2 12h20"/></svg>' },
  Incident:        { shape: 'diamond', color: '#8B5CF6', bg: 'rgba(139,92,246,0.12)', r: 18, iconSvg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>' },
  AttackTechnique: { shape: 'pentagon',color: '#06B6D4', bg: 'rgba(6,182,212,0.12)',  r: 16, iconSvg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>' },
  AttackTactic:    { shape: 'pentagon',color: '#0EA5E9', bg: 'rgba(14,165,233,0.12)', r: 14, iconSvg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M12 11h4"/><path d="M12 16h4"/><path d="M8 11h.01"/><path d="M8 16h.01"/></svg>' },
  Department:      { shape: 'rect',    color: '#3B82F6', bg: 'rgba(59,130,246,0.10)', r: 16, iconSvg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="16" height="20" x="4" y="2" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/><path d="M12 10h.01"/><path d="M12 14h.01"/><path d="M16 10h.01"/><path d="M16 14h.01"/><path d="M8 10h.01"/><path d="M8 14h.01"/></svg>' },
  Asset:           { shape: 'rect',    color: '#22C55E', bg: 'rgba(34,197,94,0.10)',  r: 16, iconSvg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>' },
  ThreatActor:     { shape: 'hexagon', color: '#DC2626', bg: 'rgba(220,38,38,0.15)', r: 18, iconSvg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="12" r="1"/><circle cx="15" cy="12" r="1"/><path d="M8 20v2h8v-2"/><path d="m12.5 17-.5-1-.5 1h1z"/><path d="M16 20a2 2 0 0 0 1.56-3.25 8 8 0 1 0-11.12 0A2 2 0 0 0 8 20"/></svg>' },
  Service:         { shape: 'rect',    color: '#6366F1', bg: 'rgba(99,102,241,0.10)', r: 15, iconSvg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>' },
};

const DEFAULT_CONFIG = { shape: 'circle', color: '#71717A', bg: 'rgba(113,113,122,0.12)', r: 14, iconSvg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/></svg>' };

function getNodeConfig(type) {
  return NODE_CONFIG[type] || DEFAULT_CONFIG;
}

/* ── SVG path generators ─────────────────────────────── */
function hexPath(r) {
  return Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 3) * i - Math.PI / 6;
    return `${(r * Math.cos(a)).toFixed(2)},${(r * Math.sin(a)).toFixed(2)}`;
  }).join(' L ');
}

function pentagonPath(r) {
  return Array.from({ length: 5 }, (_, i) => {
    const a = (Math.PI * 2 / 5) * i - Math.PI / 2;
    return `${(r * Math.cos(a)).toFixed(2)},${(r * Math.sin(a)).toFixed(2)}`;
  }).join(' L ');
}

function diamondPath(r) {
  return `0,${-r} ${r},0 0,${r} ${-r},0`;
}

/* ══════════════════════════════════════════════════════════════════
   THREAT GRAPH COMPONENT
   ══════════════════════════════════════════════════════════════════ */

export default function ThreatGraph({ graphEvents, incidentId, incidentActive, contained, currentActor }) {
  const svgRef     = useRef(null);
  const simRef     = useRef(null);
  const nodesRef   = useRef([]);
  const edgesRef   = useRef([]);
  const seenNodes  = useRef(new Set());
  const seenEdges  = useRef(new Set());
  const initRef    = useRef(false);
  const containerRef = useRef(null);

  const [blastRadius, setBlastRadius] = useState(null);
  const [replayMode,  setReplayMode]  = useState(false);
  const [replayStep,  setReplayStep]  = useState(0);
  const [graphLoaded, setGraphLoaded] = useState(false);
  const [dimensions,  setDimensions]  = useState({ width: 900, height: 500 });

  /* ── Track container dimensions ── */
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      if (width > 0 && height > 0) {
        setDimensions({ width, height });
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  /* ── Fetch baseline graph on mount ── */
  useEffect(() => {
    async function fetchGraph() {
      try {
        const API_BASE = process.env.REACT_APP_API_URL || '';
        const headers = new Headers();
        headers.set('Authorization', 'Basic ' + btoa('admin:sentinelmind'));
        const res = await fetch(`${API_BASE}/api/graph`, { headers });
        if (!res.ok) throw new Error('Failed');
        const data = await res.json();
        if (data.nodes) {
          data.nodes.forEach(n => {
            if (!seenNodes.current.has(n.id)) {
              seenNodes.current.add(n.id);
              nodesRef.current.push({ ...n, x: undefined, y: undefined });
            }
          });
        }
        if (data.edges) {
          data.edges.forEach(e => {
            const key = `${e.source}-${e.type}-${e.target}`;
            if (!seenEdges.current.has(key)) {
              seenEdges.current.add(key);
              edgesRef.current.push(e);
            }
          });
        }
        setGraphLoaded(true);
      } catch (err) {
        console.error('[ThreatGraph] Failed to fetch graph:', err);
        setGraphLoaded(true); // render empty state
      }
    }
    fetchGraph();
  }, []);

  /* ── Fetch blast radius ── */
  useEffect(() => {
    if (!currentActor) return;
    async function fetchBlast() {
      try {
        const API_BASE = process.env.REACT_APP_API_URL || '';
        const headers = new Headers();
        headers.set('Authorization', 'Basic ' + btoa('admin:sentinelmind'));
        const res = await fetch(`${API_BASE}/api/graph/blast-radius/${encodeURIComponent(currentActor)}`, { headers });
        if (res.ok) {
          const data = await res.json();
          setBlastRadius(data);
        }
      } catch (err) {
        console.error('[ThreatGraph] Blast radius fetch failed:', err);
      }
    }
    fetchBlast();
  }, [currentActor, contained]);

  /* ── Process GRAPH_UPDATED WebSocket events ── */
  useEffect(() => {
    if (replayMode) return;
    if (!graphEvents || graphEvents.length === 0) return;
    const latest = graphEvents[graphEvents.length - 1];
    if (!latest.details) return;

    const newNodes = latest.details.newNodes || [];
    const newEdges = latest.details.newEdges || [];
    let changed = false;

    newNodes.forEach(n => {
      if (!seenNodes.current.has(n.id)) {
        seenNodes.current.add(n.id);
        nodesRef.current.push({ ...n, x: undefined, y: undefined, isNew: true });
        changed = true;
      }
    });

    newEdges.forEach(e => {
      const key = `${e.source}-${e.type}-${e.target}`;
      if (!seenEdges.current.has(key)) {
        seenEdges.current.add(key);
        edgesRef.current.push({ ...e, isNew: true });
        changed = true;
      }
    });

    if (changed) {
      renderGraph();
    }
  }, [graphEvents, replayMode]);

  /* ── Main D3 render ── */
  const renderGraph = useCallback(() => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const { width: W, height: H } = dimensions;

    // Build D3-compatible data (deep copy to avoid mutation)
    const nodes = nodesRef.current.map(n => ({ ...n }));
    const edges = edgesRef.current
      .map(e => ({ ...e }))
      .filter(e => {
        const hasSource = nodes.some(n => n.id === e.source);
        const hasTarget = nodes.some(n => n.id === e.target);
        return hasSource && hasTarget;
      });

    // Defs for glow filters
    const defs = svg.append('defs');
    
    // New node glow
    const newGlow = defs.append('filter').attr('id', 'newNodeGlow');
    newGlow.append('feDropShadow').attr('dx', 0).attr('dy', 0)
      .attr('stdDeviation', 6).attr('flood-color', '#8B5CF6').attr('flood-opacity', 0.8);
    
    // Attack glow
    const attackGlow = defs.append('filter').attr('id', 'attackGlow');
    attackGlow.append('feDropShadow').attr('dx', 0).attr('dy', 0)
      .attr('stdDeviation', 8).attr('flood-color', '#EF4444').attr('flood-opacity', 0.6);

    // Contained glow
    const containedGlow = defs.append('filter').attr('id', 'containedGlow');
    containedGlow.append('feDropShadow').attr('dx', 0).attr('dy', 0)
      .attr('stdDeviation', 4).attr('flood-color', '#22C55E').attr('flood-opacity', 0.5);

    // Arrow markers
    ['TARGETS', 'INVOLVES_IP', 'USES_TECHNIQUE', 'BELONGS_TO', 'HAS_ACCESS_TO',
     'CONNECTED_TO', 'OPERATES_FROM', 'COMMUNICATES_WITH', 'TARGETED', 'BLOCKED', 'AFFECTED_BY', 'USES'].forEach(type => {
      defs.append('marker')
        .attr('id', `arrow-${type}`)
        .attr('viewBox', '0 -5 10 10').attr('refX', 25).attr('refY', 0)
        .attr('markerWidth', 6).attr('markerHeight', 6).attr('orient', 'auto')
        .append('path').attr('d', 'M0,-5L10,0L0,5')
        .attr('fill', 'rgba(255,255,255,0.15)');
    });

    // Zoom behavior
    const g = svg.append('g');
    const zoom = d3.zoom()
      .scaleExtent([0.3, 3])
      .on('zoom', (e) => g.attr('transform', e.transform));
    svg.call(zoom);

    // Force simulation
    const sim = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(edges).id(d => d.id).distance(120).strength(0.4))
      .force('charge', d3.forceManyBody().strength(-350))
      .force('center', d3.forceCenter(W / 2, H / 2))
      .force('collide', d3.forceCollide(55))
      .force('x', d3.forceX(W / 2).strength(0.04))
      .force('y', d3.forceY(H / 2).strength(0.04));

    simRef.current = sim;

    // ── Draw edges ──
    const linkSel = g.append('g').attr('class', 'graph-links')
      .selectAll('line').data(edges).join('line')
      .attr('stroke', d => d.isNew ? 'rgba(139,92,246,0.6)' : 'rgba(255,255,255,0.08)')
      .attr('stroke-width', d => d.isNew ? 1.5 : 1)
      .attr('stroke-dasharray', d => d.type === 'BLOCKED' ? '4 2' : null)
      .attr('marker-end', d => `url(#arrow-${d.type})`);

    // Edge labels (background stroke + foreground text)
    const edgeLabelStroke = g.append('g').selectAll('text').data(edges).join('text')
      .attr('text-anchor', 'middle')
      .attr('font-family', "Inter, system-ui, sans-serif")
      .attr('font-size', '8')
      .attr('stroke', '#18181B').attr('stroke-width', 3).attr('stroke-linejoin', 'round')
      .text(d => d.type.replace(/_/g, ' '));

    const edgeLabelSel = g.append('g').selectAll('text').data(edges).join('text')
      .attr('text-anchor', 'middle')
      .attr('font-family', "Inter, system-ui, sans-serif")
      .attr('font-size', '8')
      .attr('fill', d => d.isNew ? 'rgba(139,92,246,0.7)' : 'rgba(255,255,255,0.18)')
      .text(d => d.type.replace(/_/g, ' '));

    // ── Draw nodes ──
    const nodeSel = g.append('g').attr('class', 'graph-nodes')
      .selectAll('g').data(nodes).join('g')
      .attr('class', d => `graph-node graph-node-${d.type}`)
      .call(d3.drag()
        .on('start', (e, d) => { if (!e.active) sim.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
        .on('drag', (e, d) => { d.fx = e.x; d.fy = e.y; })
        .on('end', (e, d) => { if (!e.active) sim.alphaTarget(0); d.fx = null; d.fy = null; })
      );

    // Draw shapes based on type
    nodeSel.each(function(d) {
      const el = d3.select(this);
      const cfg = getNodeConfig(d.type);

      if (cfg.shape === 'hexagon') {
        el.append('path').attr('d', `M ${hexPath(cfg.r)} Z`)
          .attr('fill', cfg.bg).attr('stroke', cfg.color).attr('stroke-width', 1.5);
      } else if (cfg.shape === 'diamond') {
        el.append('polygon').attr('points', diamondPath(cfg.r))
          .attr('fill', cfg.bg).attr('stroke', cfg.color).attr('stroke-width', 1.5);
      } else if (cfg.shape === 'pentagon') {
        el.append('path').attr('d', `M ${pentagonPath(cfg.r)} Z`)
          .attr('fill', cfg.bg).attr('stroke', cfg.color).attr('stroke-width', 1.5);
      } else if (cfg.shape === 'rect') {
        el.append('rect')
          .attr('x', -cfg.r).attr('y', -cfg.r * 0.7)
          .attr('width', cfg.r * 2).attr('height', cfg.r * 1.4).attr('rx', 4)
          .attr('fill', cfg.bg).attr('stroke', cfg.color).attr('stroke-width', 1.5);
      } else {
        el.append('circle').attr('r', cfg.r)
          .attr('fill', cfg.bg).attr('stroke', cfg.color).attr('stroke-width', 1.5);
      }

      // Add actual SVG icon via foreignObject
      const iconSize = cfg.r * 1.1; // size proportional to radius
      el.append('foreignObject')
        .attr('x', -iconSize/2).attr('y', -iconSize/2)
        .attr('width', iconSize).attr('height', iconSize)
        .html(`<div style="width:100%;height:100%;color:${cfg.color};display:flex;align-items:center;justify-content:center;">${cfg.iconSvg}</div>`);

      // New node glow animation
      if (d.isNew) {
        el.attr('filter', 'url(#newNodeGlow)').attr('opacity', 0)
          .transition().duration(600).attr('opacity', 1);
      }
    });

    // Node labels (background mask + foreground)
    const labelLayer = g.append('g');
    
    // Background stroke
    labelLayer.selectAll('text.label-bg').data(nodes).join('text')
      .attr('class', 'label-bg')
      .attr('text-anchor', 'middle').attr('dy', d => getNodeConfig(d.type).r + 14)
      .attr('font-family', "Inter, system-ui, sans-serif")
      .attr('font-size', '9').attr('font-weight', '500')
      .attr('stroke', '#18181B').attr('stroke-width', 4).attr('stroke-linejoin', 'round')
      .text(d => {
        const label = d.label || d.id;
        return label.length > 18 ? label.slice(0, 17) + '…' : label;
      });

    // Foreground text
    labelLayer.selectAll('text.label-fg').data(nodes).join('text')
      .attr('class', 'label-fg')
      .attr('text-anchor', 'middle').attr('dy', d => getNodeConfig(d.type).r + 14)
      .attr('font-family', "Inter, system-ui, sans-serif")
      .attr('font-size', '9').attr('font-weight', '500')
      .attr('fill', d => d.isNew ? '#C4B5FD' : '#A1A1AA')
      .text(d => {
        const label = d.label || d.id;
        return label.length > 18 ? label.slice(0, 17) + '…' : label;
      });

    // Type badge under label
    labelLayer.selectAll('text.type-bg').data(nodes).join('text')
      .attr('class', 'type-bg')
      .attr('text-anchor', 'middle').attr('dy', d => getNodeConfig(d.type).r + 25)
      .attr('font-family', "Inter, system-ui, sans-serif")
      .attr('font-size', '7')
      .attr('stroke', '#18181B').attr('stroke-width', 3).attr('stroke-linejoin', 'round')
      .text(d => d.type);

    labelLayer.selectAll('text.type-fg').data(nodes).join('text')
      .attr('class', 'type-fg')
      .attr('text-anchor', 'middle').attr('dy', d => getNodeConfig(d.type).r + 25)
      .attr('font-family', "Inter, system-ui, sans-serif")
      .attr('font-size', '7')
      .attr('fill', d => getNodeConfig(d.type).color)
      .text(d => d.type);

    // Simulation tick
    sim.on('tick', () => {
      // Bound nodes
      // Disable hard bounds so they don't clip off when resizing or when forces push them out. Let zoom/pan handle it.
      // Alternatively, apply soft center forces which we already do.

      linkSel
        .attr('x1', d => d.source.x).attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x).attr('y2', d => d.target.y);

      edgeLabelStroke
        .attr('x', d => (d.source.x + d.target.x) / 2)
        .attr('y', d => (d.source.y + d.target.y) / 2 - 4);
      edgeLabelSel
        .attr('x', d => (d.source.x + d.target.x) / 2)
        .attr('y', d => (d.source.y + d.target.y) / 2 - 4);

      nodeSel.attr('transform', d => `translate(${d.x},${d.y})`);

      labelLayer.selectAll('text.label-bg, text.label-fg')
        .attr('x', (d, i) => nodes[i % nodes.length].x)
        .attr('y', (d, i) => nodes[i % nodes.length].y);
      labelLayer.selectAll('text.type-bg, text.type-fg')
        .attr('x', (d, i) => nodes[i % nodes.length].x)
        .attr('y', (d, i) => nodes[i % nodes.length].y);
    });

  }, [dimensions]);

  /* ── Initial render when graph loads ── */
  useEffect(() => {
    if (graphLoaded && !initRef.current) {
      initRef.current = true;
      renderGraph();
    }
  }, [graphLoaded, renderGraph]);

  /* ── Attack state visual updates ── */
  useEffect(() => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);

    if (contained) {
      svg.selectAll('.graph-node-Incident')
        .select('polygon, path, circle, rect')
        .transition().duration(600)
        .attr('stroke', '#22C55E').attr('fill', 'rgba(34,197,94,0.12)')
        .attr('filter', 'url(#containedGlow)');
      svg.selectAll('.graph-node-IP')
        .select('path')
        .transition().duration(600)
        .attr('stroke', '#52525B').attr('fill', 'rgba(82,82,91,0.12)');
    } else if (incidentActive) {
      svg.selectAll('.graph-node-Incident')
        .select('polygon, path, circle, rect')
        .attr('filter', 'url(#attackGlow)');
    }
  }, [incidentActive, contained]);

  const applyReplayStep = useCallback((step) => {
    if (!graphEvents || graphEvents.length === 0 || step < 0) return;

    // Start with baseline nodes/edges (no isNew attribute)
    const baselineNodes = nodesRef.current.filter(n => !n.isNew);
    const baselineEdges = edgesRef.current.filter(e => !e.isNew);

    const tempSeenNodes = new Set(baselineNodes.map(n => n.id));
    const tempSeenEdges = new Set(baselineEdges.map(e => `${e.source}-${e.type}-${e.target}`));

    const activeNodes = [...baselineNodes];
    const activeEdges = [...baselineEdges];

    // Process all events from 0 up to current step
    for (let i = 0; i <= step && i < graphEvents.length; i++) {
      const evt = graphEvents[i];
      if (evt && evt.details) {
        const newNodes = evt.details.newNodes || [];
        const newEdges = evt.details.newEdges || [];

        newNodes.forEach(n => {
          if (!tempSeenNodes.has(n.id)) {
            tempSeenNodes.add(n.id);
            activeNodes.push({ ...n, x: undefined, y: undefined, isNew: true });
          }
        });

        newEdges.forEach(e => {
          const key = `${e.source}-${e.type}-${e.target}`;
          if (!tempSeenEdges.has(key)) {
            tempSeenEdges.add(key);
            activeEdges.push({ ...e, isNew: true });
          }
        });
      }
    }

    nodesRef.current = activeNodes;
    edgesRef.current = activeEdges;
    seenNodes.current = tempSeenNodes;
    seenEdges.current = tempSeenEdges;

    renderGraph();
  }, [graphEvents, renderGraph]);

  /* ── Replay functionality ── */
  useEffect(() => {
    if (!replayMode || !graphEvents || graphEvents.length === 0) return;
    if (replayStep >= graphEvents.length) {
      setReplayMode(false);
      return;
    }
    const timer = setTimeout(() => {
      const nextStep = replayStep + 1;
      if (nextStep < graphEvents.length) {
        setReplayStep(nextStep);
        applyReplayStep(nextStep);
      } else {
        setReplayMode(false);
      }
    }, 1200);
    return () => clearTimeout(timer);
  }, [replayMode, replayStep, graphEvents, applyReplayStep]);

  function startReplay() {
    setReplayStep(0);
    setReplayMode(true);
    applyReplayStep(0);
  }

  /* ── Build legend from current node types ── */
  const nodeTypes = [...new Set(nodesRef.current.map(n => n.type))];

  const stateLabel = incidentActive && !contained ? 'Under Attack' : contained ? 'Contained' : 'Monitoring';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* ── Main Graph Card ── */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', minHeight: 600, height: 600 }}>
        <div className="card-header">
          <span className="card-title">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="5" r="3"/><circle cx="5" cy="19" r="3"/><circle cx="19" cy="19" r="3"/>
              <path d="M12 8v3.5M7.5 16.5l4 2M16.5 16.5l-4 2"/>
            </svg>
            Threat Relationship Graph
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {graphEvents && graphEvents.length > 0 && (
              <button className="btn btn-ghost btn-sm" onClick={startReplay}
                style={{ fontSize: 11 }}>
                ▶ Replay Incident
              </button>
            )}
            <span className={`badge badge-${incidentActive && !contained ? 'danger' : contained ? 'success' : 'neutral'}`} style={{ fontSize: 11, fontWeight: 600 }}>{stateLabel}</span>
          </div>
        </div>

        <div ref={containerRef} style={{ flex: 1, minHeight: 0, position: 'relative', overflow: 'hidden' }}>
          <svg ref={svgRef} width="100%" height="100%" viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
            style={{ display: 'block', background: 'transparent' }} />

          {replayMode && (
            <div style={{
              position: 'absolute', top: 12, left: 12,
              background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)',
              borderRadius: 8, padding: '6px 14px',
              fontSize: 12, fontWeight: 600, color: '#C4B5FD',
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <span className="dot-pulse-brand" style={{ width: 6, height: 6 }} />
              Replaying step {replayStep + 1} / {graphEvents?.length || 0}
            </div>
          )}
        </div>

        {/* Legend */}
        <div style={{
          padding: '8px 18px', borderTop: '1px solid var(--border)',
          display: 'flex', gap: 14, flexWrap: 'wrap', flexShrink: 0,
        }}>
          {nodeTypes.map(type => {
            const cfg = getNodeConfig(type);
            return (
              <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ color: cfg.color, width: 14, height: 14, display: 'inline-flex' }} dangerouslySetInnerHTML={{ __html: cfg.iconSvg }} />
                <span style={{ fontSize: 11, color: 'var(--text-4)' }}>{type}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Blast Radius Card ── */}
      {blastRadius && blastRadius.length > 0 && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>
              </svg>
              Blast Radius
            </span>
            <span className="badge badge-danger" style={{ fontSize: 11 }}>
              {blastRadius.length} system{blastRadius.length !== 1 ? 's' : ''} exposed
            </span>
          </div>
          <div style={{ padding: '12px 18px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {blastRadius.map(asset => (
              <div key={asset.id || asset.name} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '8px 14px', background: 'var(--bg-elevated)',
                borderRadius: 8, border: '1px solid var(--border)',
              }}>
                <div style={{ color: 'var(--text-4)', width: 18, height: 18 }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>{asset.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)' }}>
                    {asset.dataClassification} · {asset.criticality}
                  </div>
                </div>
                <span className={`badge badge-${asset.criticality === 'CRITICAL' ? 'danger' : 'warning'}`}
                  style={{ fontSize: 10 }}>
                  {asset.criticality}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
