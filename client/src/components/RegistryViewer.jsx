import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

const API = import.meta.env.PROD ? '' : 'http://127.0.0.1:5000';

export default function RegistryViewer() {
  const [citizens, setCitizens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 50;

  useEffect(() => {
    fetch(`${API}/api/admin/citizens`)
      .then(r => r.json())
      .then(data => { setCitizens(data); setLoading(false); })
      .catch(() => {});
  }, []);

  const filtered = citizens.filter(c =>
    c.CitizenHash.toLowerCase().includes(search.toLowerCase()) ||
    c.Region_Code.toLowerCase().includes(search.toLowerCase()) ||
    c.Scheme_Eligibility.toLowerCase().includes(search.toLowerCase())
  );

  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div className="glass" style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.1rem' }}>👥 CITIZEN REGISTRY</h2>
          <p style={{ color: 'var(--text-3)', fontSize: '0.8rem', marginTop: '0.3rem' }}>
            {citizens.length} records loaded from CivicShield_Dataset.xlsx
          </p>
        </div>
        <span className="badge badge-green">{citizens.length} ACTIVE</span>
      </div>

      {/* Search */}
      <input
        type="text"
        placeholder="🔍 Search by hash, region, or scheme..."
        value={search}
        onChange={e => { setSearch(e.target.value); setPage(0); }}
        style={{ background: 'var(--bg-panel)', border: '1px solid var(--border)' }}
      />

      {/* Table */}
      <div className="glass" style={{ padding: '0', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-3)' }}>Fetching secure registry...</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Citizen Hash</th>
                  <th>Region</th>
                  <th>Tier</th>
                  <th>Scheme</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Aadhaar</th>
                  <th>Claims</th>
                  <th>Last Claim</th>
                </tr>
              </thead>
              <tbody>
                {paged.map((c, i) => (
                  <motion.tr
                    key={i}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.02 }}
                  >
                    <td className="mono" style={{ fontSize: '0.8rem' }}>{c.CitizenHash}</td>
                    <td>{c.Region_Code}</td>
                    <td><span className="badge badge-cyan">{c.Income_Tier}</span></td>
                    <td>{c.Scheme_Eligibility}</td>
                    <td className="mono">₹{c.Scheme_Amount}</td>
                    <td>
                      <span className={c.Account_Status === 'Active' ? 'badge badge-green' : 'badge badge-red'}>
                        {c.Account_Status}
                      </span>
                    </td>
                    <td>{c.Aadhaar_Linked ? '✅' : '❌'}</td>
                    <td style={{
                      color: c.Claim_Count > 3 ? 'var(--red)' : c.Claim_Count === 3 ? 'var(--gold)' : 'var(--text-1)',
                      fontWeight: 'bold',
                      fontFamily: 'JetBrains Mono'
                    }}>
                      {c.Claim_Count}/3
                    </td>
                    <td className="mono" style={{ fontSize: '0.75rem' }}>
                      {c.Last_Claim_Date ? new Date(c.Last_Claim_Date).toLocaleDateString() : '—'}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          {Array.from({ length: totalPages }, (_, i) => (
            <button
              key={i}
              onClick={() => setPage(i)}
              className="btn"
              style={{
                padding: '0.4rem 0.8rem',
                fontSize: '0.75rem',
                background: i === page ? 'var(--cyan)' : 'transparent',
                color: i === page ? 'var(--bg-void)' : 'var(--text-3)',
                border: `1px solid ${i === page ? 'var(--cyan)' : 'var(--border)'}`,
                borderRadius: '4px'
              }}
            >
              {i + 1}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
