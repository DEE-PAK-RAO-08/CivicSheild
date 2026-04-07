import React, { useMemo } from 'react';
import { motion } from 'framer-motion';

/**
 * ThreatRadar — SVG Spider/Radar Chart
 * 5 Axes: Surge Risk, Cooling Gaming, Identity Rings, Budget Drain, Scheme Probing
 * Animated expansion, pulse on active threats, dual overlay
 */
const AXES = [
  { key: 'surge', label: 'SURGE RISK', color: '#ffd740' },
  { key: 'cooling', label: 'COOLING GAMING', color: '#ff1744' },
  { key: 'rings', label: 'IDENTITY RINGS', color: '#b388ff' },
  { key: 'budget', label: 'BUDGET DRAIN', color: '#ff6d00' },
  { key: 'probing', label: 'SCHEME PROBING', color: '#00e5ff' }
];

export default function ThreatRadar({ threatData = {} }) {
  const cx = 150, cy = 150, maxR = 110;
  const n = AXES.length;
  const angleStep = (2 * Math.PI) / n;
  const startAngle = -Math.PI / 2; // Start from top

  const values = useMemo(() => ({
    surge: Math.min(100, threatData.surgeScore || 0),
    cooling: Math.min(100, threatData.coolingScore || 0),
    rings: Math.min(100, threatData.ringsScore || 0),
    budget: Math.min(100, threatData.budgetScore || 0),
    probing: Math.min(100, threatData.probingScore || 0)
  }), [threatData]);

  // Baseline (hypothetical "normal" posture for dual overlay)
  const baseline = { surge: 20, cooling: 10, rings: 15, budget: 30, probing: 10 };

  const getPoint = (axisIdx, value) => {
    const angle = startAngle + axisIdx * angleStep;
    const r = (value / 100) * maxR;
    return { x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r };
  };

  const getPolygonPath = (vals) => {
    return AXES.map((axis, i) => {
      const p = getPoint(i, vals[axis.key] || 0);
      return `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`;
    }).join(' ') + ' Z';
  };

  const overallThreat = Math.round(
    Object.values(values).reduce((s, v) => s + v, 0) / AXES.length
  );
  const threatLevel = overallThreat >= 60 ? 'CRITICAL' : overallThreat >= 40 ? 'HIGH' : overallThreat >= 20 ? 'MEDIUM' : 'LOW';
  const threatColor = overallThreat >= 60 ? '#ff1744' : overallThreat >= 40 ? '#ff6d00' : overallThreat >= 20 ? '#ffd740' : '#00ff9d';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
      <svg viewBox="0 0 300 300" style={{ width: '100%', maxWidth: '300px', height: 'auto' }}>
        {/* Grid rings */}
        {[20, 40, 60, 80, 100].map(level => (
          <polygon
            key={level}
            points={AXES.map((_, i) => {
              const p = getPoint(i, level);
              return `${p.x},${p.y}`;
            }).join(' ')}
            fill="none"
            stroke="rgba(0,229,255,0.08)"
            strokeWidth="0.5"
          />
        ))}

        {/* Axis lines */}
        {AXES.map((axis, i) => {
          const p = getPoint(i, 100);
          return (
            <line key={axis.key} x1={cx} y1={cy} x2={p.x} y2={p.y}
              stroke="rgba(0,229,255,0.12)" strokeWidth="0.5" />
          );
        })}

        {/* Baseline overlay (ghosted) */}
        <motion.path
          d={getPolygonPath(baseline)}
          fill="rgba(0,229,255,0.05)"
          stroke="rgba(0,229,255,0.15)"
          strokeWidth="1"
          strokeDasharray="3,3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1 }}
        />

        {/* Current threat polygon */}
        <motion.path
          d={getPolygonPath(values)}
          fill={`${threatColor}15`}
          stroke={threatColor}
          strokeWidth="2"
          initial={{ d: getPolygonPath({ surge: 0, cooling: 0, rings: 0, budget: 0, probing: 0 }) }}
          animate={{ d: getPolygonPath(values) }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
        />

        {/* Axis value dots + labels */}
        {AXES.map((axis, i) => {
          const p = getPoint(i, values[axis.key]);
          const labelP = getPoint(i, 120);
          const isActive = values[axis.key] > 40;

          return (
            <g key={axis.key}>
              {/* Value dot */}
              <motion.circle
                cx={p.x} cy={p.y} r={isActive ? 5 : 3}
                fill={axis.color}
                initial={{ r: 0 }}
                animate={{ r: isActive ? 5 : 3 }}
                transition={{ delay: i * 0.1 + 0.5, duration: 0.5 }}
              />
              {isActive && (
                <motion.circle
                  cx={p.x} cy={p.y} r={8}
                  fill="none" stroke={axis.color} strokeWidth="1" opacity="0.5"
                  animate={{ r: [8, 14, 8], opacity: [0.5, 0, 0.5] }}
                  transition={{ repeat: Infinity, duration: 2, delay: i * 0.2 }}
                />
              )}

              {/* Axis label */}
              <text x={labelP.x} y={labelP.y}
                fill={axis.color}
                fontSize="6" fontFamily="Orbitron" fontWeight="700"
                textAnchor="middle" dominantBaseline="middle"
              >
                {axis.label}
              </text>

              {/* Value text */}
              <text x={p.x} y={p.y - 10}
                fill="#fff" fontSize="7" fontFamily="JetBrains Mono"
                textAnchor="middle"
              >
                {values[axis.key]}
              </text>
            </g>
          );
        })}

        {/* Center threat level */}
        <text x={cx} y={cy - 5} fill={threatColor} fontSize="10" fontFamily="Orbitron" fontWeight="800" textAnchor="middle">
          {overallThreat}
        </text>
        <text x={cx} y={cy + 8} fill="#4a6080" fontSize="6" fontFamily="Orbitron" textAnchor="middle">
          THREAT
        </text>
      </svg>

      {/* Threat level badge */}
      <motion.div
        style={{
          padding: '0.3rem 1rem', borderRadius: '100px',
          background: `${threatColor}15`, border: `1px solid ${threatColor}40`,
          color: threatColor, fontFamily: 'Orbitron', fontSize: '0.65rem',
          fontWeight: 700, letterSpacing: '2px'
        }}
        animate={overallThreat > 50 ? { opacity: [1, 0.5, 1] } : {}}
        transition={{ repeat: Infinity, duration: 1.5 }}
      >
        THREAT LEVEL: {threatLevel}
      </motion.div>
    </div>
  );
}
