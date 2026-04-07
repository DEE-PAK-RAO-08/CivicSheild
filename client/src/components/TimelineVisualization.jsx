import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * TimelineVisualization — Chronological Attack Timeline
 * Vertical timeline with connecting line, color-coded milestone nodes
 * Expandable detail cards with window timestamps and analytics
 */
export default function TimelineVisualization({ timeline = [], onDownload }) {
  if (timeline.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-3)', fontSize: '0.85rem' }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>⏱️</div>
        No temporal anomalies recorded yet.<br />
        <span style={{ fontSize: '0.75rem' }}>Submit claims to trigger detection modules.</span>
      </div>
    );
  }

  const getTypeStyle = (type) => {
    switch (type) {
      case 'SURGE_DETECTED':
      case 'COORDINATED_SURGE':
        return { color: '#ffd740', bg: 'rgba(255,215,64,0.08)', border: 'rgba(255,215,64,0.3)', icon: '⚡' };
      case 'COOLING_WINDOW_GAMING':
        return { color: '#ff1744', bg: 'rgba(255,23,68,0.08)', border: 'rgba(255,23,68,0.3)', icon: '🎮' };
      case 'COORDINATED_RING':
        return { color: '#b388ff', bg: 'rgba(179,136,255,0.08)', border: 'rgba(179,136,255,0.3)', icon: '🕸️' };
      default:
        return { color: '#00e5ff', bg: 'rgba(0,229,255,0.08)', border: 'rgba(0,229,255,0.3)', icon: '🔍' };
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div style={{ fontSize: '0.7rem', color: 'var(--text-3)', fontFamily: 'Orbitron' }}>
          {timeline.length} ANOMALIES DETECTED
        </div>
        {onDownload && (
          <button className="btn btn-primary" onClick={onDownload} style={{ fontSize: '0.55rem', padding: '0.4rem 0.8rem' }}>
            📥 EXPORT JSON
          </button>
        )}
      </div>

      {/* Timeline */}
      <div style={{ position: 'relative', paddingLeft: '30px', maxHeight: '500px', overflowY: 'auto', paddingRight: '0.5rem' }}>
        {/* Vertical Line */}
        <div style={{
          position: 'absolute', left: '13px', top: 0, bottom: 0, width: '2px',
          background: 'linear-gradient(to bottom, var(--cyan), transparent)',
          opacity: 0.3
        }} />

        <AnimatePresence>
          {timeline.map((entry, i) => {
            const style = getTypeStyle(entry.type);
            return (
              <motion.div
                key={`${entry.timestamp}-${i}`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05, duration: 0.3 }}
                style={{ position: 'relative', marginBottom: '1rem' }}
              >
                {/* Timeline Node */}
                <div style={{
                  position: 'absolute', left: '-24px', top: '12px',
                  width: '12px', height: '12px', borderRadius: '50%',
                  background: style.color, border: `2px solid ${style.color}`,
                  boxShadow: `0 0 8px ${style.color}40`,
                  zIndex: 2
                }} />

                {/* Card */}
                <div style={{
                  background: style.bg, border: `1px solid ${style.border}`,
                  borderRadius: '8px', padding: '0.8rem 1rem',
                  borderLeft: `3px solid ${style.color}`
                }}>
                  {/* Header row */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.4rem', flexWrap: 'wrap', gap: '0.3rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span>{style.icon}</span>
                      <span style={{ color: style.color, fontSize: '0.7rem', fontWeight: 700, fontFamily: 'Orbitron', letterSpacing: '1px' }}>
                        {entry.type}
                      </span>
                    </div>
                    <span className="mono" style={{ fontSize: '0.6rem', color: 'var(--text-3)' }}>
                      {entry.timestamp ? new Date(entry.timestamp).toLocaleTimeString() : ''}
                    </span>
                  </div>

                  {/* Affected group */}
                  <div style={{ fontSize: '0.8rem', color: '#fff', marginBottom: '0.4rem', fontWeight: 600 }}>
                    {entry.affectedGroup}
                  </div>

                  {/* Details */}
                  <p style={{ fontSize: '0.7rem', color: 'var(--text-2)', margin: '0 0 0.5rem 0', lineHeight: 1.4 }}>
                    {entry.details}
                  </p>

                  {/* Analytics Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '0.4rem', fontSize: '0.65rem' }}>
                    {entry.ClaimsInWindow != null && (
                      <div style={{ background: 'rgba(0,0,0,0.3)', padding: '0.3rem 0.5rem', borderRadius: '4px' }}>
                        <span style={{ color: 'var(--text-3)' }}>Claims: </span>
                        <span className="mono" style={{ color: style.color }}>{entry.ClaimsInWindow}</span>
                      </div>
                    )}
                    {entry.TotalDisbursementValueProtected > 0 && (
                      <div style={{ background: 'rgba(0,0,0,0.3)', padding: '0.3rem 0.5rem', borderRadius: '4px' }}>
                        <span style={{ color: 'var(--text-3)' }}>₹ Protected: </span>
                        <span className="mono" style={{ color: 'var(--green)' }}>₹{entry.TotalDisbursementValueProtected.toLocaleString()}</span>
                      </div>
                    )}
                    {entry.analytics?.zScore != null && (
                      <div style={{ background: 'rgba(0,0,0,0.3)', padding: '0.3rem 0.5rem', borderRadius: '4px' }}>
                        <span style={{ color: 'var(--text-3)' }}>Z-Score: </span>
                        <span className="mono" style={{ color: entry.analytics.zScore > 2 ? 'var(--red)' : 'var(--gold)' }}>
                          {entry.analytics.zScore}
                        </span>
                      </div>
                    )}
                    {entry.analytics?.shannonEntropy != null && (
                      <div style={{ background: 'rgba(0,0,0,0.3)', padding: '0.3rem 0.5rem', borderRadius: '4px' }}>
                        <span style={{ color: 'var(--text-3)' }}>Entropy: </span>
                        <span className="mono" style={{ color: entry.analytics.shannonEntropy < 1 ? 'var(--red)' : 'var(--green)' }}>
                          H={entry.analytics.shannonEntropy}
                        </span>
                      </div>
                    )}
                    {entry.WindowStart && (
                      <div style={{ background: 'rgba(0,0,0,0.3)', padding: '0.3rem 0.5rem', borderRadius: '4px', gridColumn: '1 / -1' }}>
                        <span style={{ color: 'var(--text-3)' }}>Window: </span>
                        <span className="mono" style={{ color: 'var(--cyan)', fontSize: '0.6rem' }}>
                          {new Date(entry.WindowStart).toLocaleTimeString()} → {new Date(entry.WindowEnd).toLocaleTimeString()}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Flagged Identities */}
                  {entry.FlaggedIdentities && entry.FlaggedIdentities.length > 0 && (
                    <div style={{ marginTop: '0.4rem', display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                      {entry.FlaggedIdentities.slice(0, 6).map((id, j) => (
                        <span key={j} className="mono" style={{
                          fontSize: '0.55rem', padding: '0.15rem 0.4rem',
                          background: 'rgba(0,0,0,0.4)', borderRadius: '3px',
                          color: 'var(--cyan)', border: '1px solid rgba(0,229,255,0.2)'
                        }}>
                          {id}
                        </span>
                      ))}
                      {entry.FlaggedIdentities.length > 6 && (
                        <span style={{ fontSize: '0.55rem', color: 'var(--text-3)' }}>
                          +{entry.FlaggedIdentities.length - 6} more
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
