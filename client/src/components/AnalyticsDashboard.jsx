import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const API = import.meta.env.PROD ? '' : 'http://localhost:5000';

export default function AnalyticsDashboard() {
  const [summary, setSummary] = useState(null);
  const [anomalies, setAnomalies] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = async () => {
    try {
      const [sumRes, anomRes] = await Promise.all([
        fetch(`${API}/api/analytics/summary`),
        fetch(`${API}/api/analytics/anomaly-detection`)
      ]);
      setSummary(await sumRes.json());
      setAnomalies(await anomRes.json());
      setLoading(false);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchAnalytics();
    const interval = setInterval(fetchAnalytics, 10000); // 10s refresh for analytics
    return () => clearInterval(interval);
  }, []);

  if (loading || !summary || !anomalies) {
    return <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-3)' }}>Analyzing threat intelligence data...</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div className="glass" style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.1rem', color: 'var(--cyan)' }}>🧠 THREAT INTELLIGENCE & ANALYTICS</h2>
          <p style={{ color: 'var(--text-3)', fontSize: '0.8rem', marginTop: '0.3rem' }}>
            Advanced behavioral analysis and anomaly detection engine
          </p>
        </div>
        <div className={`status-pill ${anomalies.threatLevel === 'CRITICAL' || anomalies.threatLevel === 'HIGH' ? 'frozen' : 'active'}`}>
          <span className="dot" />
          THREAT LEVEL: {anomalies.threatLevel}
        </div>
      </div>

      {/* Anomalies Alert Area */}
      <AnimatePresence>
        {anomalies.totalAnomalies > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass"
            style={{
              padding: '1.5rem',
              borderColor: anomalies.threatLevel === 'CRITICAL' ? 'rgba(255,23,68,0.5)' : 'rgba(255,215,64,0.5)',
              background: anomalies.threatLevel === 'CRITICAL' ? 'rgba(255,23,68,0.1)' : 'rgba(255,215,64,0.05)'
            }}
          >
            <h3 style={{
              color: anomalies.threatLevel === 'CRITICAL' ? 'var(--red)' : 'var(--gold)',
              fontSize: '0.9rem',
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <span>⚠️</span> DETECTED SYSTEM ANOMALIES
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {anomalies.anomalies.map((anom, idx) => (
                <div key={idx} className="mono" style={{
                  padding: '0.8rem',
                  background: 'rgba(0,0,0,0.5)',
                  borderLeft: `3px solid ${anom.severity === 'CRITICAL' || anom.severity === 'HIGH' ? 'var(--red)' : 'var(--gold)'}`,
                  fontSize: '0.8rem',
                  display: 'flex',
                  justifyContent: 'space-between'
                }}>
                  <span><strong>[{anom.type}]</strong> {anom.message}</span>
                  <span style={{ color: 'var(--text-3)', fontSize: '0.7rem' }}>
                    {new Date(anom.detectedAt).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
        {/* Rejection Breakdown */}
        <div className="glass" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '0.85rem', marginBottom: '1rem', color: 'var(--text-2)' }}>🚫 REJECTION ANALYSIS</h3>
          {Object.keys(summary.rejectionBreakdown).length === 0 ? (
            <div style={{ color: 'var(--text-3)', fontSize: '0.8rem', textAlign: 'center', padding: '1rem' }}>No rejections recorded yet.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
              {Object.entries(summary.rejectionBreakdown).map(([reason, count]) => {
                const percentage = ((count / summary.transactions.rejected) * 100).toFixed(1);
                return (
                  <div key={reason}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.3rem' }}>
                      <span className="mono" style={{ color: 'var(--red)' }}>{reason}</span>
                      <span className="mono">{count} ({percentage}%)</span>
                    </div>
                    <div style={{ width: '100%', height: '4px', background: 'var(--bg-dark)', borderRadius: '2px', overflow: 'hidden' }}>
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        transition={{ duration: 1, ease: 'easeOut' }}
                        style={{ height: '100%', background: 'var(--red)' }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Scheme Distribution */}
        <div className="glass" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '0.85rem', marginBottom: '1rem', color: 'var(--text-2)' }}>💰 FUNDS DISTRIBUTION</h3>
          {Object.keys(summary.schemeDistribution).length === 0 ? (
            <div style={{ color: 'var(--text-3)', fontSize: '0.8rem', textAlign: 'center', padding: '1rem' }}>No funds disbursed yet.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {Object.entries(summary.schemeDistribution).map(([scheme, amount]) => {
                const totalSpent = summary.budget.spent;
                const percentage = totalSpent > 0 ? ((amount / totalSpent) * 100).toFixed(1) : 0;
                
                // Color mapping
                const color = scheme === 'Health' ? 'var(--cyan)' : scheme === 'Pension' ? 'var(--purple)' : 'var(--green)';

                return (
                  <div key={scheme}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.3rem' }}>
                      <span style={{ fontWeight: 600 }}>{scheme}</span>
                      <span className="mono">₹{amount.toLocaleString('en-IN')} ({percentage}%)</span>
                    </div>
                    <div style={{ width: '100%', height: '6px', background: 'var(--bg-dark)', borderRadius: '3px', overflow: 'hidden' }}>
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        transition={{ duration: 1, ease: 'easeOut' }}
                        style={{ height: '100%', background: color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Trust Inquiry Tool */}
      <TrustSearchTool />
    </div>
  );
}

function TrustSearchTool() {
  const [searchHash, setSearchHash] = useState('');
  const [trustData, setTrustData] = useState(null);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState(null);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchHash) return;
    
    setSearching(true);
    setError(null);
    setTrustData(null);
    
    try {
      const res = await fetch(`${API}/api/analytics/citizen-trust/${searchHash}`);
      if (!res.ok) {
        if (res.status === 404) throw new Error('Citizen hash not found in registry');
        throw new Error('Server error');
      }
      setTrustData(await res.json());
    } catch (err) {
      setError(err.message);
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="glass" style={{ padding: '1.5rem' }}>
      <h3 style={{ fontSize: '0.85rem', marginBottom: '1rem', color: 'var(--text-2)' }}>🔍 CITIZEN TRUST SCORING</h3>
      
      <form onSubmit={handleSearch} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', marginBottom: '1.5rem' }}>
        <div style={{ flex: 1 }}>
          <label>ENTER CITIZEN HASH (RAW ID WILL NOT WORK)</label>
          <input 
            type="text" 
            value={searchHash} 
            onChange={(e) => setSearchHash(e.target.value)} 
            placeholder="e.g., 6dd5fe5a26baab600fd725..." 
          />
        </div>
        <button type="submit" className="btn btn-primary" disabled={searching}>
          {searching ? 'SCANNING...' : 'CALCULATE SCORE'}
        </button>
      </form>

      {error && (
        <div style={{ color: 'var(--red)', fontSize: '0.8rem', padding: '1rem', background: 'var(--red-dim)', borderRadius: '4px' }}>
          {error}
        </div>
      )}

      {trustData && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}
        >
          {/* Main Score Component */}
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center',
            width: '150px',
            height: '150px',
            borderRadius: '50%',
            border: `4px solid ${trustData.riskLevel === 'LOW' ? 'var(--green)' : trustData.riskLevel === 'MEDIUM' ? 'var(--gold)' : 'var(--red)'}`,
            background: 'var(--bg-dark)'
          }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-3)', fontFamily: 'Orbitron', letterSpacing: '2px' }}>TRUST SCORE</span>
            <span style={{ 
              fontSize: '3rem', 
              fontWeight: 700, 
              color: trustData.riskLevel === 'LOW' ? 'var(--green)' : trustData.riskLevel === 'MEDIUM' ? 'var(--gold)' : 'var(--red)' 
            }}>
              {trustData.trustScore}
            </span>
            <span className={`badge badge-${trustData.riskLevel === 'LOW' ? 'green' : trustData.riskLevel === 'MEDIUM' ? 'gold' : 'red'}`} style={{ marginTop: '0.5rem' }}>
              {trustData.riskLevel} RISK
            </span>
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.85rem' }}>
              <div><span style={{ color: 'var(--text-3)' }}>Hash:</span> <span className="mono">{trustData.citizenHash}</span></div>
              <div><span style={{ color: 'var(--text-3)' }}>Region:</span> {trustData.profile.region}</div>
              <div><span style={{ color: 'var(--text-3)' }}>Approved Claims:</span> <span style={{ color: 'var(--green)' }}>{trustData.transactionHistory.approved}</span></div>
              <div><span style={{ color: 'var(--text-3)' }}>Rejected Attempts:</span> <span style={{ color: 'var(--red)' }}>{trustData.transactionHistory.rejected}</span></div>
            </div>

            {trustData.indicators.length > 0 && (
              <div style={{ marginTop: '0.5rem' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-3)', textTransform: 'uppercase' }}>Key Drivers</span>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                  {trustData.indicators.map((ind, i) => (
                    <span key={i} className="mono" style={{ 
                      fontSize: '0.7rem', 
                      padding: '0.3rem 0.6rem', 
                      background: ind.impact > 0 ? 'var(--green-dim)' : 'var(--red-dim)',
                      color: ind.impact > 0 ? 'var(--green)' : 'var(--red)',
                      borderRadius: '4px',
                      border: `1px solid ${ind.impact > 0 ? 'rgba(0,255,157,0.3)' : 'rgba(255,23,68,0.3)'}`
                    }}>
                      {ind.impact > 0 ? '+' : ''}{ind.impact} | {ind.flag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
}
