import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import FraudNetworkGraph from './FraudNetworkGraph';
import BudgetSankey from './BudgetSankey';
import ThreatRadar from './ThreatRadar';
import TimelineVisualization from './TimelineVisualization';

const API = import.meta.env.PROD ? '' : 'http://127.0.0.1:5000';

const ADMIN_TABS = [
  { id: 'command', label: 'COMMAND', icon: '📡' },
  { id: 'clusters', label: 'CLUSTERS', icon: '🕸️' },
  { id: 'austerity', label: 'AUSTERITY', icon: '✂️' },
  { id: 'threats', label: 'THREATS', icon: '🎯' },
  { id: 'forensic', label: 'FORENSIC', icon: '🔬' }
];

export default function AdminPanel() {
  const [stats, setStats] = useState(null);
  const [activeTab, setActiveTab] = useState('command');
  const [fraudScan, setFraudScan] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [timeline, setTimeline] = useState([]);
  const [austerityReport, setAusterityReport] = useState(null);
  const [surgeStatus, setSurgeStatus] = useState(null);
  const [surgeMessage, setSurgeMessage] = useState(null);

  // ── Data Fetchers ──
  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/admin/status`);
      const data = await res.json();
      setStats(data);
      if (data.surge_alert && data.surge_active) setSurgeMessage(data.surge_alert);
    } catch (e) { console.error(e); }
  }, []);

  const fetchFraudScan = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/admin/fraud-rings`);
      setFraudScan(await res.json());
    } catch (e) { console.error(e); }
  }, []);

  const runFraudScan = useCallback(async () => {
    setScanning(true);
    try {
      const res = await fetch(`${API}/api/admin/fraud-scan`, { method: 'POST' });
      setFraudScan(await res.json());
    } catch (e) { console.error(e); }
    setScanning(false);
  }, []);

  const fetchTimeline = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/admin/attack-timeline`);
      setTimeline(await res.json());
    } catch (e) { console.error(e); }
  }, []);

  const fetchAusterityReport = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/admin/austerity-report`);
      setAusterityReport(await res.json());
    } catch (e) { console.error(e); }
  }, []);

  const fetchSurgeStatus = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/admin/surge-status`);
      setSurgeStatus(await res.json());
    } catch (e) { console.error(e); }
  }, []);

  useEffect(() => {
    fetchStats();
    const intv = setInterval(fetchStats, 3000);
    return () => clearInterval(intv);
  }, [fetchStats]);

  useEffect(() => {
    if (activeTab === 'clusters') fetchFraudScan();
    if (activeTab === 'threats') { fetchTimeline(); fetchSurgeStatus(); }
    if (activeTab === 'austerity') fetchAusterityReport();
    if (activeTab === 'forensic') { fetchSurgeStatus(); fetchTimeline(); fetchFraudScan(); }
  }, [activeTab]);

  // ── Actions ──
  const action = async (endpoint) => {
    try {
      const res = await fetch(`${API}/api/admin/${endpoint}`, { method: 'POST' });
      const data = await res.json();
      if (data.error) alert(data.error);
      fetchStats();
      if (endpoint === 'austerity') {
        fetchAusterityReport();
      }
    } catch { alert('Network error'); }
  };

  const downloadReport = async (type) => {
    const endpoints = {
      tamper: 'tamper-report',
      rings: 'fraud-rings/export',
      timeline: 'attack-timeline/export',
      austerity: 'austerity-report'
    };
    const filenames = { tamper: 'tamper-report', rings: 'fraud-cluster-report', timeline: 'attack-timeline', austerity: 'austerity-report' };
    try {
      const res = await fetch(`${API}/api/admin/${endpoints[type]}`);
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filenames[type]}-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch { alert('Download failed'); }
  };

  if (!stats) return (
    <div className="glass" style={{ padding: '2rem', textAlign: 'center' }}>
      <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1.5 }}>
        Connecting to Command Center...
      </motion.div>
    </div>
  );

  // ── Threat Data for Radar ──
  const threatData = {
    surgeScore: surgeStatus?.totalSurges ? Math.min(100, surgeStatus.totalSurges * 25) : 0,
    coolingScore: surgeStatus?.totalGamers ? Math.min(100, surgeStatus.totalGamers * 35) : 0,
    ringsScore: fraudScan?.clustersDetected ? Math.min(100, fraudScan.clustersDetected * 20) : 0,
    budgetScore: stats ? Math.min(100, Math.round((1 - stats.budget_remaining / 1000000) * 100)) : 0,
    probingScore: stats?.rejected_count ? Math.min(100, stats.rejected_count * 10) : 0
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

      {/* ── SURGE ALERT BANNER ── */}
      <AnimatePresence>
        {surgeMessage && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="surge-banner-live"
          >
            <motion.span animate={{ opacity: [1, 0.4, 1] }} transition={{ repeat: Infinity, duration: 0.8 }}>🚨</motion.span>
            {' '}{surgeMessage}
            <button onClick={() => setSurgeMessage(null)} style={{ marginLeft: '1rem', background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: '0.8rem' }}>✕</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── TAB BAR ── */}
      <div className="admin-tab-bar">
        {ADMIN_TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`admin-tab-btn ${activeTab === tab.id ? 'active' : ''}`}
          >
            <span>{tab.icon}</span> {tab.label}
          </button>
        ))}
      </div>

      {/* ── TAB CONTENT ── */}
      <AnimatePresence mode="wait">

        {/* ═══ TAB 1: COMMAND CENTER ═══ */}
        {activeTab === 'command' && (
          <motion.div key="cmd" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

            {/* Status Header */}
            <div className="glass" style={{ padding: '1.5rem', textAlign: 'center', border: stats.austerity?.active ? '1px solid var(--gold)' : '1px solid var(--border)' }}>
              <div style={{ fontSize: '0.55rem', color: 'var(--text-3)', letterSpacing: '2px', fontFamily: 'Orbitron', marginBottom: '0.5rem' }}>
                {stats.austerity?.active ? '⚠️ AUSTERITY MODE ACTIVE' : 'STANDARD PROTOCOL'}
              </div>

              {/* Animated Status */}
              <motion.h2
                key={stats.status}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                style={{
                  fontSize: '2rem',
                  color: stats.status === 'ACTIVE' ? 'var(--green)' : stats.status === 'FROZEN' ? 'var(--red)' : 'var(--gold)',
                }}
              >
                {stats.status}
              </motion.h2>

              {/* Budget Gauge */}
              <div style={{ margin: '1rem auto 0', maxWidth: '200px' }}>
                <svg viewBox="0 0 120 70" style={{ width: '100%' }}>
                  <path d="M 10 60 A 50 50 0 0 1 110 60" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" strokeLinecap="round" />
                  <motion.path
                    d="M 10 60 A 50 50 0 0 1 110 60"
                    fill="none"
                    stroke={stats.austerity?.active ? '#ffd740' : '#00e5ff'}
                    strokeWidth="8" strokeLinecap="round"
                    strokeDasharray="157"
                    initial={{ strokeDashoffset: 157 }}
                    animate={{ strokeDashoffset: 157 * (1 - stats.budget_remaining / 1000000) }}
                    transition={{ duration: 1.5, ease: 'easeOut' }}
                  />
                  <text x="60" y="50" fill="#fff" fontSize="11" fontFamily="Rajdhani" fontWeight="700" textAnchor="middle">
                    {stats.budget_formatted}
                  </text>
                  <text x="60" y="62" fill="#4a6080" fontSize="6" fontFamily="Orbitron" textAnchor="middle">BUDGET</text>
                </svg>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', marginTop: '1rem', flexWrap: 'wrap' }}>
                {stats.status === 'ACTIVE' && (
                  <>
                    <button className="btn btn-danger" onClick={() => action('pause')} style={{ fontSize: '0.55rem', padding: '0.4rem 0.8rem' }}>⏸ PAUSE</button>
                    {!stats.austerity?.active && (
                      <button className="btn btn-warning" onClick={() => action('austerity')} style={{ fontSize: '0.55rem', padding: '0.4rem 0.8rem' }}>✂️ AUSTERITY</button>
                    )}
                  </>
                )}
                {stats.status === 'PAUSED' && <button className="btn btn-success" onClick={() => action('resume')} style={{ fontSize: '0.55rem', padding: '0.4rem 0.8rem' }}>▶ RESUME</button>}
                <button className="btn btn-danger" onClick={() => action('reset')} style={{ fontSize: '0.55rem', padding: '0.4rem 0.8rem' }}>🔄 RESET</button>
                <button className="btn btn-primary" onClick={() => downloadReport('tamper')} style={{ fontSize: '0.55rem', padding: '0.4rem 0.8rem' }}>📥 LEDGER</button>
              </div>

              {stats.pending_queue > 0 && (
                <div style={{ marginTop: '0.7rem', color: 'var(--cyan)', fontSize: '0.7rem', fontFamily: 'JetBrains Mono' }}>
                  <motion.span animate={{ opacity: [1, 0.3, 1] }} transition={{ repeat: Infinity, duration: 1 }}>●</motion.span>
                  {' '}IN QUEUE: {stats.pending_queue} Pending
                </div>
              )}
            </div>

            {/* Stats Grid */}
            <div className="stats-grid admin-stats-grid">
              <div className="glass stat-card"><div className="stat-label">Processed</div><div className="stat-value">{stats.total_transactions}</div></div>
              <div className="glass stat-card"><div className="stat-label">Approved</div><div className="stat-value" style={{ color: 'var(--green)' }}>{stats.approved_count}</div></div>
              <div className="glass stat-card"><div className="stat-label">Rejected</div><div className="stat-value" style={{ color: 'var(--red)' }}>{stats.rejected_count}</div></div>
              <div className="glass stat-card"><div className="stat-label">Rate</div><div className="stat-value">{stats.approval_rate}%</div></div>
            </div>

            {/* Transaction Stream */}
            <div className="glass" style={{ padding: '1rem' }}>
              <h3 style={{ fontSize: '0.65rem', marginBottom: '0.5rem', fontFamily: 'Orbitron', color: 'var(--text-3)' }}>📜 LIVE TRANSACTION STREAM</h3>
              <div style={{ maxHeight: '220px', overflowY: 'auto' }}>
                <table className="data-table" style={{ fontSize: '0.7rem' }}>
                  <thead>
                    <tr><th>Time</th><th>Identity</th><th>Tier</th><th>Scheme</th><th>Result</th></tr>
                  </thead>
                  <tbody>
                    {(stats.last_10_transactions || []).map((tx, i) => (
                      <tr key={i}>
                        <td className="mono">{new Date(tx.timestamp).toLocaleTimeString()}</td>
                        <td className="mono" title={tx.citizenHash}>{tx.citizenHash}</td>
                        <td><span style={{ color: tx.Income_Tier === 'Low' ? 'var(--green)' : tx.Income_Tier === 'High' ? 'var(--red)' : 'var(--gold)', fontWeight: 'bold' }}>{tx.Income_Tier}</span></td>
                        <td style={{ maxWidth: '80px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tx.Scheme_Eligibility}</td>
                        <td><span className={tx.status === 'APPROVED' ? 'badge badge-green' : 'badge badge-red'}>{tx.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {/* ═══ TAB 2: FRAUD CLUSTERS ═══ */}
        {activeTab === 'clusters' && (
          <motion.div key="clusters" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

            {/* Scan Controls */}
            <div className="glass" style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div>
                <h3 style={{ fontSize: '0.8rem', fontFamily: 'Orbitron', color: 'var(--cyan)' }}>🕸️ IDENTITY GRAPH ANALYSIS</h3>
                <p style={{ fontSize: '0.65rem', color: 'var(--text-3)', marginTop: '2px' }}>Union-Find DSU + Benford's Law Forensics</p>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="btn btn-success" onClick={runFraudScan} disabled={scanning} style={{ fontSize: '0.55rem', padding: '0.4rem 0.8rem' }}>
                  {scanning ? (
                    <motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>⟳</motion.span>
                  ) : '🔍'}{' '}{scanning ? 'SCANNING...' : 'RUN SCAN'}
                </button>
                <button className="btn btn-primary" onClick={() => downloadReport('rings')} style={{ fontSize: '0.55rem', padding: '0.4rem 0.8rem' }}>📥 JSON</button>
              </div>
            </div>

            {/* Scan Results Summary */}
            {fraudScan && fraudScan.clustersDetected != null && (
              <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))' }}>
                <div className="glass stat-card">
                  <div className="stat-label">Clusters</div>
                  <div className="stat-value" style={{ fontSize: '1.3rem', color: 'var(--red)' }}>{fraudScan.clustersDetected}</div>
                </div>
                <div className="glass stat-card">
                  <div className="stat-label">₹ At Risk</div>
                  <div className="stat-value" style={{ fontSize: '1.1rem', color: 'var(--red)' }}>₹{(fraudScan.totalValueAtRisk || 0).toLocaleString()}</div>
                </div>
                <div className="glass stat-card">
                  <div className="stat-label">Records</div>
                  <div className="stat-value" style={{ fontSize: '1.3rem' }}>{fraudScan.totalRecordsAnalyzed}</div>
                </div>
                <div className="glass stat-card">
                  <div className="stat-label">Scan Time</div>
                  <div className="stat-value" style={{ fontSize: '1.1rem', color: 'var(--cyan)' }}>{fraudScan.scanDurationMs}ms</div>
                </div>
              </div>
            )}

            {/* Network Graph */}
            <div className="glass" style={{ padding: '1rem' }}>
              <h4 style={{ fontSize: '0.6rem', fontFamily: 'Orbitron', color: 'var(--text-3)', marginBottom: '0.5rem' }}>FORCE-DIRECTED NETWORK GRAPH</h4>
              <FraudNetworkGraph clusters={fraudScan?.clusters || []} />
            </div>

            {/* Cluster Cards */}
            {fraudScan?.clusters && fraudScan.clusters.length > 0 && (
              <div className="cluster-grid">
                {fraudScan.clusters.map((cluster, i) => (
                  <motion.div
                    key={cluster.clusterId}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="glass"
                    style={{
                      padding: '1rem',
                      borderLeft: `3px solid ${cluster.riskLevel === 'CRITICAL' ? 'var(--red)' : cluster.riskLevel === 'HIGH' ? '#ff6d00' : 'var(--gold)'}`,
                    }}
                  >
                    {/* Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <span className="mono" style={{ fontSize: '0.65rem', color: 'var(--cyan)' }}>{cluster.clusterId}</span>
                      <span className={`badge badge-${cluster.riskLevel === 'CRITICAL' || cluster.riskLevel === 'HIGH' ? 'red' : 'gold'}`}>
                        {cluster.riskScore}/100 {cluster.riskLevel}
                      </span>
                    </div>

                    {/* Identity Hash */}
                    <div className="mono" style={{ fontSize: '0.8rem', color: '#fff', marginBottom: '0.5rem' }}>{cluster.maskedHash}</div>

                    {/* Details */}
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-2)', lineHeight: 1.5 }}>
                      <div><strong>Regions:</strong> {(cluster.regions || []).map(r => (
                        <span key={r} style={{ background: 'rgba(0,229,255,0.1)', padding: '0.1rem 0.3rem', borderRadius: '3px', marginLeft: '0.2rem', fontSize: '0.6rem' }}>{r}</span>
                      ))}</div>
                      <div style={{ marginTop: '0.3rem' }}><strong>Schemes:</strong> {(cluster.schemes || []).join(', ')}</div>
                      <div style={{ marginTop: '0.3rem' }}><strong>Value at Risk:</strong> <span style={{ color: 'var(--red)', fontWeight: 700 }}>₹{(cluster.totalValueAtRisk || 0).toLocaleString()}</span></div>
                      {cluster.dateRange?.earliest && (
                        <div style={{ marginTop: '0.3rem', fontSize: '0.6rem', color: 'var(--text-3)' }}>
                          <strong>Period:</strong> {new Date(cluster.dateRange.earliest).toLocaleDateString()} → {new Date(cluster.dateRange.latest).toLocaleDateString()}
                        </div>
                      )}
                    </div>

                    {/* Benford's Law Result */}
                    {cluster.benfordAnalysis?.valid && (
                      <div style={{
                        marginTop: '0.5rem', padding: '0.4rem', borderRadius: '4px', fontSize: '0.6rem',
                        background: cluster.benfordAnalysis.isAnomalous ? 'rgba(255,23,68,0.1)' : 'rgba(0,255,157,0.08)',
                        border: `1px solid ${cluster.benfordAnalysis.isAnomalous ? 'rgba(255,23,68,0.3)' : 'rgba(0,255,157,0.2)'}`,
                        color: cluster.benfordAnalysis.isAnomalous ? 'var(--red)' : 'var(--green)'
                      }}>
                        {cluster.benfordAnalysis.isAnomalous ? '🔴' : '🟢'} Benford's Law: χ²={cluster.benfordAnalysis.chiSquared} {cluster.benfordAnalysis.isAnomalous ? '(ANOMALOUS)' : '(NORMAL)'}
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            )}

            {/* Benford Global Analysis */}
            {fraudScan?.benfordGlobalAnalysis?.valid && (
              <div className="glass" style={{ padding: '1rem' }}>
                <h4 style={{ fontSize: '0.65rem', fontFamily: 'Orbitron', color: 'var(--text-3)', marginBottom: '0.5rem' }}>📊 BENFORD'S LAW — GLOBAL DATASET ANALYSIS</h4>
                <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'flex-end', height: '80px' }}>
                  {(fraudScan.benfordGlobalAnalysis.distribution || []).map(d => (
                    <div key={d.digit} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', height: '60px', justifyContent: 'flex-end', gap: '1px' }}>
                        <div style={{ width: '60%', height: `${d.observedPct * 2}px`, background: 'var(--cyan)', borderRadius: '2px 2px 0 0', minHeight: '2px' }} />
                        <div style={{ width: '60%', height: `${d.expectedPct * 2}px`, background: 'rgba(255,255,255,0.15)', borderRadius: '2px 2px 0 0', minHeight: '2px' }} />
                      </div>
                      <span style={{ fontSize: '0.55rem', color: 'var(--text-3)' }}>{d.digit}</span>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '0.5rem', fontSize: '0.55rem', color: 'var(--text-3)' }}>
                  <span><span style={{ display: 'inline-block', width: 8, height: 8, background: 'var(--cyan)', borderRadius: 2, marginRight: 4 }}/>Observed</span>
                  <span><span style={{ display: 'inline-block', width: 8, height: 8, background: 'rgba(255,255,255,0.15)', borderRadius: 2, marginRight: 4 }}/>Expected (Benford)</span>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* ═══ TAB 3: AUSTERITY COMMAND ═══ */}
        {activeTab === 'austerity' && (
          <motion.div key="austerity" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

            <div className="glass" style={{ padding: '1.5rem', textAlign: 'center' }}>
              <h3 style={{ fontSize: '0.8rem', fontFamily: 'Orbitron', color: stats.austerity?.active ? 'var(--gold)' : 'var(--text-2)' }}>
                ✂️ DYNAMIC BUDGET REALLOCATION
              </h3>
              <p style={{ fontSize: '0.65rem', color: 'var(--text-3)', marginTop: '4px' }}>Greedy Knapsack Priority Queue Optimization</p>

              <div style={{
                margin: '1rem auto', padding: '0.8rem 2rem', borderRadius: '8px',
                background: stats.austerity?.active ? 'rgba(255,215,64,0.1)' : 'rgba(0,229,255,0.05)',
                border: `1px solid ${stats.austerity?.active ? 'rgba(255,215,64,0.3)' : 'var(--border)'}`,
                display: 'inline-block'
              }}>
                <span style={{
                  fontFamily: 'Orbitron', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '2px',
                  color: stats.austerity?.active ? 'var(--gold)' : 'var(--text-3)'
                }}>
                  {stats.austerity?.active ? '⚠️ AUSTERITY ENGAGED' : 'STANDBY'}
                </span>
              </div>

              {!stats.austerity?.active && stats.status === 'ACTIVE' && (
                <div style={{ marginTop: '1rem' }}>
                  <button className="btn btn-warning" onClick={() => action('austerity')} style={{ fontSize: '0.6rem', padding: '0.5rem 1.5rem' }}>
                    ✂️ ENGAGE AUSTERITY MODE (−20% BUDGET)
                  </button>
                </div>
              )}
            </div>

            {/* Sankey Diagram */}
            {austerityReport && (
              <div className="glass" style={{ padding: '1rem' }}>
                <h4 style={{ fontSize: '0.65rem', fontFamily: 'Orbitron', color: 'var(--text-3)', marginBottom: '0.5rem' }}>BUDGET FLOW ANALYSIS</h4>
                <BudgetSankey austerityReport={austerityReport} />
              </div>
            )}

            {/* Tier Breakdown */}
            {austerityReport?.tierBreakdown && (
              <div className="glass" style={{ padding: '1rem' }}>
                <h4 style={{ fontSize: '0.65rem', fontFamily: 'Orbitron', color: 'var(--text-3)', marginBottom: '0.8rem' }}>INCOME TIER BREAKDOWN</h4>
                {['Low', 'Mid', 'High'].map(tier => {
                  const data = austerityReport.tierBreakdown[tier] || {};
                  const total = (data.approved || 0) + (data.rejected || 0);
                  const approvedPct = total > 0 ? ((data.approved || 0) / total * 100).toFixed(0) : 0;
                  const tierColor = tier === 'Low' ? 'var(--green)' : tier === 'Mid' ? 'var(--gold)' : 'var(--red)';

                  return (
                    <div key={tier} style={{ marginBottom: '0.8rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', marginBottom: '0.3rem' }}>
                        <span style={{ color: tierColor, fontWeight: 700, fontFamily: 'Orbitron', fontSize: '0.6rem' }}>{tier.toUpperCase()}</span>
                        <span className="mono" style={{ fontSize: '0.65rem', color: 'var(--text-2)' }}>
                          {data.approved || 0}✓ / {data.rejected || 0}✕  |  ₹{(data.approvedAmount || 0).toLocaleString()} approved
                        </span>
                      </div>
                      <div style={{ width: '100%', height: '8px', background: 'var(--bg-dark)', borderRadius: '4px', overflow: 'hidden', display: 'flex' }}>
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${approvedPct}%` }}
                          transition={{ duration: 1 }}
                          style={{ height: '100%', background: tierColor, borderRadius: '4px 0 0 4px' }}
                        />
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${100 - approvedPct}%` }}
                          transition={{ duration: 1 }}
                          style={{ height: '100%', background: 'rgba(255,23,68,0.4)', borderRadius: '0 4px 4px 0' }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Rejection Log */}
            {austerityReport?.rejectedTransactions?.length > 0 && (
              <div className="glass" style={{ padding: '1rem' }}>
                <h4 style={{ fontSize: '0.65rem', fontFamily: 'Orbitron', color: 'var(--text-3)', marginBottom: '0.5rem' }}>AUSTERITY REJECTION LOG</h4>
                <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                  <table className="data-table" style={{ fontSize: '0.65rem' }}>
                    <thead><tr><th>Hash</th><th>Tier</th><th>Amount</th><th>Reason</th><th>Time</th></tr></thead>
                    <tbody>
                      {austerityReport.rejectedTransactions.map((tx, i) => (
                        <tr key={i}>
                          <td className="mono">{tx.maskedHash}</td>
                          <td><span style={{ color: tx.tier === 'Low' ? 'var(--green)' : tx.tier === 'High' ? 'var(--red)' : 'var(--gold)' }}>{tx.tier}</span></td>
                          <td className="mono">₹{tx.amount?.toLocaleString()}</td>
                          <td><span className="badge badge-red" style={{ fontSize: '0.5rem' }}>{tx.reason}</span></td>
                          <td className="mono" style={{ fontSize: '0.55rem' }}>{tx.timestamp ? new Date(tx.timestamp).toLocaleTimeString() : ''}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div style={{ marginTop: '0.5rem', textAlign: 'right' }}>
                  <button className="btn btn-primary" onClick={() => downloadReport('austerity')} style={{ fontSize: '0.5rem', padding: '0.3rem 0.6rem' }}>📥 EXPORT</button>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* ═══ TAB 4: THREAT DETECTION ═══ */}
        {activeTab === 'threats' && (
          <motion.div key="threats" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

            <div className="glass" style={{ padding: '1rem' }}>
              <h3 style={{ fontSize: '0.8rem', fontFamily: 'Orbitron', color: 'var(--cyan)' }}>🎯 TEMPORAL ANOMALY DETECTION</h3>
              <p style={{ fontSize: '0.65rem', color: 'var(--text-3)', marginTop: '2px' }}>EWMA Z-Score · Shannon Entropy · FSM Cooling Analysis</p>
            </div>

            {/* Threat Radar + Stats */}
            <div className="threat-radar-section">
              <div className="glass threat-radar-box">
                <ThreatRadar threatData={threatData} />
              </div>
              <div className="threat-stats-column">
                <div className="stats-grid threat-mini-stats">
                  <div className="glass stat-card"><div className="stat-label">Surges</div><div className="stat-value">{surgeStatus?.totalSurges || 0}</div></div>
                  <div className="glass stat-card"><div className="stat-label">Gamers</div><div className="stat-value">{surgeStatus?.totalGamers || 0}</div></div>
                  <div className="glass stat-card"><div className="stat-label">Tracked</div><div className="stat-value">{surgeStatus?.fsmStats?.totalTracked || 0}</div></div>
                </div>

                {/* FSM State Distribution */}
                {surgeStatus?.fsmStats?.stateDistribution && (
                  <div className="glass" style={{ padding: '0.8rem' }}>
                    <h4 style={{ fontSize: '0.55rem', fontFamily: 'Orbitron', color: 'var(--text-3)', marginBottom: '0.4rem' }}>FSM STATE DISTRIBUTION</h4>
                    <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                      {Object.entries(surgeStatus.fsmStats.stateDistribution).filter(([,v]) => v > 0).map(([state, count]) => (
                        <span key={state} className="mono" style={{
                          fontSize: '0.55rem', padding: '0.2rem 0.4rem', borderRadius: '3px',
                          background: state === 'FRAUD_HOLD' ? 'var(--red-dim)' : state === 'GAMING_DETECTED' ? 'rgba(255,215,64,0.1)' : 'rgba(0,229,255,0.05)',
                          color: state === 'FRAUD_HOLD' ? 'var(--red)' : state === 'GAMING_DETECTED' ? 'var(--gold)' : 'var(--text-2)',
                          border: '1px solid rgba(255,255,255,0.05)'
                        }}>
                          {state}: {count}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Attack Timeline */}
            <div className="glass" style={{ padding: '1rem' }}>
              <h4 style={{ fontSize: '0.65rem', fontFamily: 'Orbitron', color: 'var(--text-3)', marginBottom: '0.5rem' }}>ATTACK TIMELINE</h4>
              <TimelineVisualization timeline={timeline} onDownload={() => downloadReport('timeline')} />
            </div>
          </motion.div>
        )}

        {/* ═══ TAB 5: FORENSIC LAB ═══ */}
        {activeTab === 'forensic' && (
          <motion.div key="forensic" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

            <div className="glass" style={{ padding: '1.5rem' }}>
              <h3 style={{ fontSize: '0.8rem', fontFamily: 'Orbitron', color: 'var(--purple)' }}>🔬 CROSS-CORRELATION FORENSIC LAB</h3>
              <p style={{ fontSize: '0.65rem', color: 'var(--text-3)', marginTop: '4px' }}>Jaccard Similarity · Composite Threat Assessment · Attack Classification</p>
            </div>

            {/* Correlation Matrix */}
            {surgeStatus?.correlationHistory?.length > 0 ? (
              surgeStatus.correlationHistory.map((corr, i) => (
                <div key={i} className="glass" style={{ padding: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <span style={{ fontFamily: 'Orbitron', fontSize: '0.6rem', color: 'var(--text-3)' }}>CORRELATION #{i + 1}</span>
                    <span className={`badge badge-${corr.threatLevel === 'CRITICAL' || corr.threatLevel === 'HIGH' ? 'red' : corr.threatLevel === 'MEDIUM' ? 'gold' : 'green'}`}>
                      THREAT: {corr.threatScore}/100 ({corr.threatLevel})
                    </span>
                  </div>

                  {/* Jaccard Meter */}
                  <div style={{ marginBottom: '0.8rem' }}>
                    <div style={{ fontSize: '0.6rem', color: 'var(--text-3)', marginBottom: '0.3rem' }}>JACCARD SIMILARITY INDEX</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div style={{ flex: 1, height: '6px', background: 'var(--bg-dark)', borderRadius: '3px', overflow: 'hidden' }}>
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${corr.jaccardIndex * 100}%` }}
                          style={{ height: '100%', background: corr.isCorrelated ? 'var(--red)' : 'var(--green)', borderRadius: '3px' }}
                        />
                      </div>
                      <span className="mono" style={{ fontSize: '0.7rem', color: corr.isCorrelated ? 'var(--red)' : 'var(--green)', minWidth: '40px' }}>
                        {(corr.jaccardIndex * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>

                  {/* Classification */}
                  <div style={{
                    padding: '0.5rem', borderRadius: '4px', fontSize: '0.7rem',
                    background: corr.isCorrelated ? 'rgba(255,23,68,0.08)' : 'rgba(0,255,157,0.05)',
                    border: `1px solid ${corr.isCorrelated ? 'rgba(255,23,68,0.2)' : 'rgba(0,255,157,0.15)'}`,
                    color: corr.isCorrelated ? 'var(--red)' : 'var(--green)'
                  }}>
                    <strong>Classification:</strong> {corr.classification}
                    <span className="mono" style={{ float: 'right', fontSize: '0.6rem' }}>
                      Overlap: {corr.overlapCount} identities
                    </span>
                  </div>

                  {/* Factor Breakdown */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', marginTop: '0.5rem', fontSize: '0.6rem' }}>
                    <div style={{ background: 'rgba(0,0,0,0.3)', padding: '0.3rem 0.5rem', borderRadius: '4px', textAlign: 'center' }}>
                      <div style={{ color: 'var(--text-3)' }}>Surge</div>
                      <div className="mono" style={{ color: 'var(--gold)' }}>{corr.factors?.surgeScore || 0}</div>
                    </div>
                    <div style={{ background: 'rgba(0,0,0,0.3)', padding: '0.3rem 0.5rem', borderRadius: '4px', textAlign: 'center' }}>
                      <div style={{ color: 'var(--text-3)' }}>Gaming</div>
                      <div className="mono" style={{ color: 'var(--red)' }}>{corr.factors?.gamingScore || 0}</div>
                    </div>
                    <div style={{ background: 'rgba(0,0,0,0.3)', padding: '0.3rem 0.5rem', borderRadius: '4px', textAlign: 'center' }}>
                      <div style={{ color: 'var(--text-3)' }}>Correlation</div>
                      <div className="mono" style={{ color: 'var(--purple)' }}>{corr.factors?.correlationBonus || 0}</div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="glass" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-3)' }}>
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🔬</div>
                <div style={{ fontSize: '0.8rem' }}>No cross-correlation data available yet.</div>
                <div style={{ fontSize: '0.65rem', marginTop: '0.3rem' }}>Process claims to trigger detection modules and generate correlations.</div>
              </div>
            )}

            {/* Summary Stats */}
            <div className="glass" style={{ padding: '1rem' }}>
              <h4 style={{ fontSize: '0.6rem', fontFamily: 'Orbitron', color: 'var(--text-3)', marginBottom: '0.5rem' }}>ALGORITHM INVENTORY</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.5rem', fontSize: '0.65rem' }}>
                {[
                  { name: 'Union-Find DSU', status: 'ACTIVE', desc: 'O(α(n)) identity clustering' },
                  { name: "Benford's Law", status: 'ACTIVE', desc: 'Chi-squared forensic analysis' },
                  { name: 'EWMA Z-Score', status: 'ACTIVE', desc: 'Surge detection (μ+2σ)' },
                  { name: 'Shannon Entropy', status: 'ACTIVE', desc: 'Coordinated attack detection' },
                  { name: 'FSM Analyzer', status: 'ACTIVE', desc: '5-state cooling window model' },
                  { name: 'Jaccard Similarity', status: 'ACTIVE', desc: 'Cross-module correlation' }
                ].map(algo => (
                  <div key={algo.name} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem', background: 'rgba(0,0,0,0.2)', borderRadius: '4px' }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--green)', boxShadow: '0 0 4px var(--green)', flexShrink: 0 }} />
                    <div>
                      <div style={{ fontWeight: 700, color: 'var(--cyan)', fontFamily: 'Orbitron', fontSize: '0.55rem' }}>{algo.name}</div>
                      <div style={{ color: 'var(--text-3)', fontSize: '0.55rem' }}>{algo.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
