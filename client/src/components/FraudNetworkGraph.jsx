import React, { useRef, useEffect, useState, useCallback } from 'react';

/**
 * FraudNetworkGraph — Force-Directed Graph (Custom Canvas)
 * Fruchterman-Reingold layout algorithm
 * Nodes = flagged identities, Edges = cross-region connections
 * Node size ∝ ₹ value at risk, color by risk level
 */
export default function FraudNetworkGraph({ clusters = [] }) {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const [hoveredNode, setHoveredNode] = useState(null);
  const [dimensions, setDimensions] = useState({ w: 600, h: 400 });
  const nodesRef = useRef([]);
  const edgesRef = useRef([]);

  // Build graph data from clusters
  useEffect(() => {
    const nodes = [];
    const edges = [];
    const regionNodes = new Map();

    clusters.forEach((cluster, ci) => {
      // Add identity node
      const idNode = {
        id: `id-${ci}`,
        type: 'identity',
        label: cluster.maskedHash || cluster.clusterId,
        riskScore: cluster.riskScore || 0,
        riskLevel: cluster.riskLevel || 'LOW',
        value: cluster.totalValueAtRisk || 0,
        schemes: cluster.schemes || [],
        x: dimensions.w / 2 + (Math.random() - 0.5) * 200,
        y: dimensions.h / 2 + (Math.random() - 0.5) * 200,
        vx: 0, vy: 0,
        radius: Math.max(12, Math.min(30, Math.sqrt((cluster.totalValueAtRisk || 1000) / 100))),
        cluster: ci
      };
      nodes.push(idNode);

      // Add/connect region nodes
      (cluster.regions || []).forEach(region => {
        if (!regionNodes.has(region)) {
          const rNode = {
            id: `reg-${region}`,
            type: 'region',
            label: region,
            x: dimensions.w / 2 + (Math.random() - 0.5) * 300,
            y: dimensions.h / 2 + (Math.random() - 0.5) * 300,
            vx: 0, vy: 0,
            radius: 8,
            riskScore: 0,
            riskLevel: 'REGION'
          };
          regionNodes.set(region, rNode);
          nodes.push(rNode);
        }
        edges.push({ source: idNode.id, target: `reg-${region}` });
      });
    });

    nodesRef.current = nodes;
    edgesRef.current = edges;
  }, [clusters, dimensions]);

  // Resize observer
  useEffect(() => {
    const container = canvasRef.current?.parentElement;
    if (!container) return;
    const ro = new ResizeObserver(entries => {
      for (const e of entries) {
        setDimensions({ w: e.contentRect.width, h: Math.max(300, e.contentRect.height) });
      }
    });
    ro.observe(container);
    return () => ro.disconnect();
  }, []);

  // Fruchterman-Reingold force simulation + render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const nodes = nodesRef.current;
    const edges = edgesRef.current;
    if (nodes.length === 0) return;

    const W = dimensions.w;
    const H = dimensions.h;
    canvas.width = W * window.devicePixelRatio;
    canvas.height = H * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    const area = W * H;
    const k = Math.sqrt(area / Math.max(1, nodes.length)) * 0.8; // optimal distance
    let temperature = W / 4;
    const cooling = 0.995;
    const minTemp = 0.5;

    const nodeMap = {};
    nodes.forEach(n => { nodeMap[n.id] = n; });

    const simulate = () => {
      // Repulsive forces (all pairs)
      for (let i = 0; i < nodes.length; i++) {
        nodes[i].vx = 0;
        nodes[i].vy = 0;
        for (let j = 0; j < nodes.length; j++) {
          if (i === j) continue;
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const dist = Math.max(1, Math.sqrt(dx * dx + dy * dy));
          const force = (k * k) / dist;
          nodes[i].vx += (dx / dist) * force;
          nodes[i].vy += (dy / dist) * force;
        }
      }

      // Attractive forces (edges)
      edges.forEach(e => {
        const src = nodeMap[e.source];
        const tgt = nodeMap[e.target];
        if (!src || !tgt) return;
        const dx = tgt.x - src.x;
        const dy = tgt.y - src.y;
        const dist = Math.max(1, Math.sqrt(dx * dx + dy * dy));
        const force = (dist * dist) / k;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        src.vx += fx * 0.5;
        src.vy += fy * 0.5;
        tgt.vx -= fx * 0.5;
        tgt.vy -= fy * 0.5;
      });

      // Apply forces with temperature limiting
      nodes.forEach(n => {
        const disp = Math.sqrt(n.vx * n.vx + n.vy * n.vy);
        if (disp > 0) {
          const capped = Math.min(disp, temperature);
          n.x += (n.vx / disp) * capped;
          n.y += (n.vy / disp) * capped;
        }
        // Keep in bounds
        n.x = Math.max(n.radius + 5, Math.min(W - n.radius - 5, n.x));
        n.y = Math.max(n.radius + 5, Math.min(H - n.radius - 5, n.y));
      });

      temperature = Math.max(minTemp, temperature * cooling);
    };

    const getRiskColor = (level) => {
      switch(level) {
        case 'CRITICAL': return '#ff1744';
        case 'HIGH': return '#ff6d00';
        case 'MEDIUM': return '#ffd740';
        case 'LOW': return '#00ff9d';
        case 'REGION': return '#00e5ff';
        default: return '#4a6080';
      }
    };

    const render = () => {
      simulate();

      ctx.clearRect(0, 0, W, H);

      // Draw background grid
      ctx.strokeStyle = 'rgba(0,229,255,0.03)';
      ctx.lineWidth = 1;
      for (let x = 0; x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
      for (let y = 0; y < H; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

      // Draw edges
      edges.forEach(e => {
        const src = nodeMap[e.source];
        const tgt = nodeMap[e.target];
        if (!src || !tgt) return;

        ctx.beginPath();
        ctx.moveTo(src.x, src.y);
        ctx.lineTo(tgt.x, tgt.y);
        ctx.strokeStyle = 'rgba(0,229,255,0.25)';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Animate particle along edge
        const t = ((Date.now() % 3000) / 3000);
        const px = src.x + (tgt.x - src.x) * t;
        const py = src.y + (tgt.y - src.y) * t;
        ctx.beginPath();
        ctx.arc(px, py, 2, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0,229,255,0.7)';
        ctx.fill();
      });

      // Draw nodes
      nodes.forEach(n => {
        const color = getRiskColor(n.riskLevel);

        // Glow
        const gradient = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.radius * 2);
        gradient.addColorStop(0, color.replace(')', ',0.3)').replace('rgb', 'rgba'));
        gradient.addColorStop(1, 'transparent');
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.radius * 2, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();

        // Circle
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2);
        ctx.fillStyle = `${color}22`;
        ctx.fill();
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.stroke();

        // Label
        ctx.fillStyle = '#fff';
        ctx.font = `${n.type === 'identity' ? 'bold ' : ''}${Math.max(9, n.radius * 0.6)}px "JetBrains Mono", monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(n.label, n.x, n.y);

        // Risk badge for identity nodes
        if (n.type === 'identity' && n.riskScore > 0) {
          ctx.font = 'bold 8px "Orbitron", sans-serif';
          ctx.fillStyle = color;
          ctx.fillText(`${n.riskScore}`, n.x, n.y + n.radius + 10);
        }
      });

      animRef.current = requestAnimationFrame(render);
    };

    render();
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [clusters, dimensions]);

  // Mouse interaction
  const handleMouse = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    const hit = nodesRef.current.find(n => {
      const dx = n.x - mx;
      const dy = n.y - my;
      return Math.sqrt(dx * dx + dy * dy) < n.radius + 5;
    });
    setHoveredNode(hit || null);
  }, []);

  if (clusters.length === 0) {
    return (
      <div className="glass" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-3)' }}>
        <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🕸️</div>
        Run a scan to visualize the identity fraud network
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', width: '100%', minHeight: '300px' }}>
      <canvas
        ref={canvasRef}
        style={{ width: '100%', height: '100%', minHeight: '300px', borderRadius: '12px', background: 'rgba(3,5,16,0.5)' }}
        onMouseMove={handleMouse}
        onMouseLeave={() => setHoveredNode(null)}
      />
      {hoveredNode && (
        <div style={{
          position: 'absolute', top: 10, right: 10,
          background: 'rgba(8,14,32,0.95)', border: '1px solid var(--cyan)',
          borderRadius: '8px', padding: '0.8rem', fontSize: '0.75rem',
          maxWidth: '200px', backdropFilter: 'blur(10px)'
        }}>
          <div style={{ color: 'var(--cyan)', fontFamily: 'Orbitron', fontSize: '0.6rem', marginBottom: '4px' }}>
            {hoveredNode.type === 'identity' ? '🎯 IDENTITY' : '📍 REGION'}
          </div>
          <div className="mono" style={{ color: '#fff', marginBottom: '4px' }}>{hoveredNode.label}</div>
          {hoveredNode.type === 'identity' && (
            <>
              <div style={{ color: 'var(--text-3)' }}>Risk: <span style={{ color: hoveredNode.riskLevel === 'CRITICAL' ? 'var(--red)' : 'var(--gold)' }}>{hoveredNode.riskScore}/100</span></div>
              <div style={{ color: 'var(--text-3)' }}>Value: <span style={{ color: 'var(--red)' }}>₹{hoveredNode.value?.toLocaleString()}</span></div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
