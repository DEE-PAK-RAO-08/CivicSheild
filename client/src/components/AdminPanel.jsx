import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

const API = import.meta.env.PROD ? '' : 'http://localhost:5000';

export default function AdminPanel() {
  const [stats, setStats] = useState(null);

  const fetchStats = async () => {
    try {
      const res = await fetch(`${API}/api/admin/status`);
      setStats(await res.json());
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    fetchStats();
    const intv = setInterval(fetchStats, 5000);
    return () => clearInterval(intv);
  }, []);

  const action = async (endpoint) => {
    try {
      const res = await fetch(`${API}/api/admin/${endpoint}`, { method: 'POST' });
      const data = await res.json();
      if (data.error) alert(data.error);
      fetchStats();
    } catch { alert('Network error'); }
  };

  const downloadReport = async () => {
    const res = await fetch(`${API}/api/admin/tamper-report`);
    const data = await res.json();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tamper-report-${Date.now()}.json`;
    a.click();
  };

  if (!stats) return <div className="glass" style={{ padding: '2rem', textAlign: 'center' }}>Connecting to CivicShield...</div>;

  const statusClass = stats.status === 'ACTIVE' ? 'active' :
    stats.status === 'FROZEN' ? 'frozen' : 'paused';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Master Status */}
      <motion.div
        className="glass"
        style={{ padding: '2rem', textAlign: 'center' }}
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
      >
        <div style={{ fontSize: '0.7rem', color: 'var(--text-3)', letterSpacing: '4px', fontFamily: 'Orbitron', marginBottom: '0.5rem' }}>
          SYSTEM STATUS
        </div>
        <h2 style={{
          fontSize: '2.5rem',
          color: stats.status === 'ACTIVE' ? 'var(--green)' : stats.status === 'FROZEN' ? 'var(--red)' : 'var(--gold)',
          textShadow: stats.status === 'ACTIVE' ? '0 0 30px rgba(0,255,157,0.3)' :
            stats.status === 'FROZEN' ? '0 0 30px rgba(255,23,68,0.3)' : '0 0 30px rgba(255,215,64,0.3)'
        }}>
          {stats.status}
        </h2>
        {stats.frozen_reason && (
          <p style={{ color: 'var(--red)', fontSize: '0.85rem', marginTop: '0.5rem' }}>
            REASON: {stats.frozen_reason}
          </p>
        )}

        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '1.5rem', flexWrap: 'wrap' }}>
          {stats.status === 'ACTIVE' ? (
            <button className="btn btn-danger" onClick={() => action('pause')}>⚠️ EMERGENCY PAUSE</button>
          ) : stats.status === 'PAUSED' ? (
            <button className="btn btn-success" onClick={() => action('resume')}>▶️ RESUME SYSTEM</button>
          ) : null}
          <button className="btn btn-danger" onClick={() => action('reset')}>🔄 FACTORY RESET</button>
          {stats.status === 'FROZEN' && (
            <button className="btn btn-primary" onClick={downloadReport} style={{ fontSize: '0.75rem' }}>
              📥 DOWNLOAD TAMPER REPORT
            </button>
          )}
        </div>
      </motion.div>

      {/* Stats Grid */}
      <div className="stats-grid">
        <motion.div className="glass stat-card" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }}>
          <div className="stat-label">Budget Remaining</div>
          <div className="stat-value" style={{ color: stats.budget_remaining < 200000 ? 'var(--red)' : 'var(--green)' }}>
            {stats.budget_formatted}
          </div>
        </motion.div>
        <motion.div className="glass stat-card" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.15 }}>
          <div className="stat-label">Total Processed</div>
          <div className="stat-value" style={{ color: 'var(--cyan)' }}>{stats.total_transactions}</div>
        </motion.div>
        <motion.div className="glass stat-card" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}>
          <div className="stat-label">Approval Rate</div>
          <div className="stat-value">{stats.approval_rate}%</div>
        </motion.div>
        <motion.div className="glass stat-card" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.25 }}>
          <div className="stat-label">Rejected</div>
          <div className="stat-value" style={{ color: 'var(--red)' }}>{stats.rejected_count}</div>
        </motion.div>
        <motion.div className="glass stat-card" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }}>
          <div className="stat-label">Ledger Blocks</div>
          <div className="stat-value" style={{ color: 'var(--purple)' }}>{stats.ledger_blocks}</div>
        </motion.div>
        <motion.div className="glass stat-card" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.35 }}>
          <div className="stat-label">Citizens Loaded</div>
          <div className="stat-value">{stats.citizen_count}</div>
        </motion.div>
      </div>

      {/* Transaction Table */}
      <div className="glass" style={{ padding: '1.5rem' }}>
        <h3 style={{ fontSize: '0.85rem', marginBottom: '1rem' }}>📜 RECENT TRANSACTIONS</h3>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Citizen Hash</th>
                <th>Scheme</th>
                <th>Amount</th>
                <th>Region</th>
                <th>Status</th>
                <th>Detail</th>
              </tr>
            </thead>
            <tbody>
              {stats.last_10_transactions.map((tx, i) => (
                <tr key={i}>
                  <td className="mono" style={{ fontSize: '0.75rem' }}>{new Date(tx.timestamp).toLocaleTimeString()}</td>
                  <td className="mono">{tx.citizenHash}</td>
                  <td>{tx.Scheme_Eligibility}</td>
                  <td className="mono">₹{tx.Scheme_Amount}</td>
                  <td>{tx.Region_Code}</td>
                  <td>
                    <span className={tx.status === 'APPROVED' ? 'badge badge-green' : 'badge badge-red'}>
                      {tx.status}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.8rem', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {tx.status === 'APPROVED' ? 'All 3 gates passed' : tx.rejectionReason}
                  </td>
                </tr>
              ))}
              {stats.last_10_transactions.length === 0 && (
                <tr><td colSpan="7" style={{ textAlign: 'center', color: 'var(--text-3)', padding: '2rem' }}>
                  No transactions processed yet
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
