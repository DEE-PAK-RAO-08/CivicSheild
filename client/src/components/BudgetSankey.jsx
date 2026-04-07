import React, { useMemo } from 'react';
import { motion } from 'framer-motion';

/**
 * BudgetSankey — SVG Budget Flow Diagram
 * Shows: Original Budget → Austerity Cut → Tier Distribution → Approved/Rejected
 * Animated flow paths with gradient colors
 */
export default function BudgetSankey({ austerityReport }) {
  const data = useMemo(() => {
    if (!austerityReport || !austerityReport.active) return null;

    const orig = austerityReport.originalBudget || 0;
    const cut = austerityReport.reductionAmount || 0;
    const remaining = austerityReport.newCeiling || 0;
    const tb = austerityReport.tierBreakdown || {};

    const tiers = ['Low', 'Mid', 'High'].map(t => ({
      name: t,
      approved: tb[t]?.approvedAmount || 0,
      rejected: tb[t]?.rejectedAmount || 0,
      approvedCount: tb[t]?.approved || 0,
      rejectedCount: tb[t]?.rejected || 0
    }));

    const totalApproved = tiers.reduce((s, t) => s + t.approved, 0);
    const totalRejected = tiers.reduce((s, t) => s + t.rejected, 0);

    return { orig, cut, remaining, tiers, totalApproved, totalRejected };
  }, [austerityReport]);

  if (!data) {
    return (
      <div className="glass" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-3)' }}>
        <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>💰</div>
        Activate Austerity Mode to see budget flow analysis
      </div>
    );
  }

  const W = 700, H = 320;
  const tierColors = { Low: '#00ff9d', Mid: '#ffd740', High: '#ff6d00' };

  // Normalize heights for SVG
  const maxVal = Math.max(data.orig, 1);
  const scale = (v) => Math.max(4, (v / maxVal) * 180);

  return (
    <div style={{ width: '100%', overflowX: 'auto' }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', maxWidth: '700px', height: 'auto' }}>
        <defs>
          <linearGradient id="flowGreen" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#00ff9d" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#00ff9d" stopOpacity="0.1" />
          </linearGradient>
          <linearGradient id="flowRed" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#ff1744" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#ff1744" stopOpacity="0.1" />
          </linearGradient>
          <linearGradient id="flowGold" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#ffd740" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#ffd740" stopOpacity="0.1" />
          </linearGradient>
        </defs>

        {/* Column Labels */}
        <text x="35" y="20" fill="#4a6080" fontFamily="Orbitron" fontSize="8" textAnchor="middle">ORIGINAL</text>
        <text x="220" y="20" fill="#4a6080" fontFamily="Orbitron" fontSize="8" textAnchor="middle">AFTER CUT</text>
        <text x="420" y="20" fill="#4a6080" fontFamily="Orbitron" fontSize="8" textAnchor="middle">BY TIER</text>
        <text x="620" y="20" fill="#4a6080" fontFamily="Orbitron" fontSize="8" textAnchor="middle">RESULT</text>

        {/* Column 1: Original Budget */}
        <rect x="10" y="40" width="50" height={scale(data.orig)} rx="4"
          fill="rgba(0,229,255,0.15)" stroke="#00e5ff" strokeWidth="1" />
        <text x="35" y={50 + scale(data.orig) / 2} fill="#fff" fontSize="9" textAnchor="middle" fontFamily="Rajdhani" fontWeight="700">
          ₹{(data.orig / 1000).toFixed(0)}K
        </text>

        {/* Flow: Original → Cut + Remaining */}
        <path d={`M 60 ${40 + scale(data.orig) * 0.3} C 120 ${40 + scale(data.orig) * 0.3}, 160 30, 195 40`}
          fill="none" stroke="#ff1744" strokeWidth="2" strokeDasharray="4,4" opacity="0.5" />
        <path d={`M 60 ${40 + scale(data.orig) * 0.6} C 120 ${40 + scale(data.orig) * 0.6}, 160 ${60 + scale(data.cut)}, 195 ${60 + scale(data.cut)}`}
          fill="none" stroke="#00e5ff" strokeWidth="2" opacity="0.4" />

        {/* Column 2: Cut + Remaining */}
        <rect x="195" y="30" width="50" height={scale(data.cut)} rx="4"
          fill="rgba(255,23,68,0.15)" stroke="#ff1744" strokeWidth="1" />
        <text x="220" y={35 + scale(data.cut) / 2} fill="#ff1744" fontSize="8" textAnchor="middle" fontFamily="Rajdhani" fontWeight="700">
          -₹{(data.cut / 1000).toFixed(0)}K
        </text>

        <rect x="195" y={40 + scale(data.cut)} width="50" height={scale(data.remaining)} rx="4"
          fill="rgba(0,229,255,0.15)" stroke="#00e5ff" strokeWidth="1" />
        <text x="220" y={50 + scale(data.cut) + scale(data.remaining) / 2} fill="#00e5ff" fontSize="9" textAnchor="middle" fontFamily="Rajdhani" fontWeight="700">
          ₹{(data.remaining / 1000).toFixed(0)}K
        </text>

        {/* Column 3: Tier Breakdown */}
        {data.tiers.map((tier, i) => {
          const tierTotal = tier.approved + tier.rejected;
          const barH = Math.max(8, scale(tierTotal));
          const yPos = 35 + i * 80;
          const color = tierColors[tier.name];

          return (
            <g key={tier.name}>
              {/* Flow curve from remaining to tier */}
              <path d={`M 245 ${50 + scale(data.cut) + scale(data.remaining) * (0.2 + i * 0.3)} C 320 ${50 + scale(data.cut) + scale(data.remaining) * (0.2 + i * 0.3)}, 370 ${yPos + barH / 2}, 395 ${yPos + barH / 2}`}
                fill="none" stroke={color} strokeWidth="1.5" opacity="0.3" />

              <rect x="395" y={yPos} width="50" height={barH} rx="4"
                fill={`${color}22`} stroke={color} strokeWidth="1" />
              <text x="420" y={yPos + barH / 2 + 3} fill={color} fontSize="8" textAnchor="middle" fontFamily="Orbitron" fontWeight="700">
                {tier.name.toUpperCase()}
              </text>
              <text x="420" y={yPos + barH + 12} fill="#4a6080" fontSize="7" textAnchor="middle" fontFamily="JetBrains Mono">
                {tier.approvedCount}✓ {tier.rejectedCount}✕
              </text>

              {/* Flow to approved/rejected */}
              {tier.approved > 0 && (
                <path d={`M 445 ${yPos + barH * 0.3} C 500 ${yPos + barH * 0.3}, 540 ${65}, 570 ${65}`}
                  fill="none" stroke="#00ff9d" strokeWidth="1" opacity="0.3" />
              )}
              {tier.rejected > 0 && (
                <path d={`M 445 ${yPos + barH * 0.7} C 500 ${yPos + barH * 0.7}, 540 ${200}, 570 ${200}`}
                  fill="none" stroke="#ff1744" strokeWidth="1" opacity="0.3" />
              )}
            </g>
          );
        })}

        {/* Column 4: Approved / Rejected */}
        <rect x="570" y="40" width="55" height={Math.max(10, scale(data.totalApproved))} rx="4"
          fill="rgba(0,255,157,0.15)" stroke="#00ff9d" strokeWidth="1" />
        <text x="597" y={50 + Math.max(10, scale(data.totalApproved)) / 2} fill="#00ff9d" fontSize="8" textAnchor="middle" fontFamily="Rajdhani" fontWeight="700">
          ✓ ₹{(data.totalApproved / 1000).toFixed(0)}K
        </text>

        <rect x="570" y={60 + scale(data.totalApproved)} width="55" height={Math.max(10, scale(data.totalRejected))} rx="4"
          fill="rgba(255,23,68,0.15)" stroke="#ff1744" strokeWidth="1" />
        <text x="597" y={70 + scale(data.totalApproved) + Math.max(10, scale(data.totalRejected)) / 2} fill="#ff1744" fontSize="8" textAnchor="middle" fontFamily="Rajdhani" fontWeight="700">
          ✕ ₹{(data.totalRejected / 1000).toFixed(0)}K
        </text>
      </svg>

      {/* Pareto Efficiency */}
      {austerityReport?.summary && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{
            marginTop: '1rem', padding: '0.8rem 1rem',
            background: 'rgba(0,255,157,0.08)', border: '1px solid rgba(0,255,157,0.2)',
            borderRadius: '8px', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem'
          }}
        >
          <span style={{ fontSize: '0.75rem', color: 'var(--text-3)', fontFamily: 'Orbitron', letterSpacing: '1px' }}>
            PARETO EFFICIENCY
          </span>
          <span style={{ fontSize: '0.85rem', color: 'var(--green)', fontWeight: 700, fontFamily: 'Rajdhani' }}>
            {austerityReport.summary.paretoEfficiency} of approved funds → Low-income tier
          </span>
        </motion.div>
      )}
    </div>
  );
}
