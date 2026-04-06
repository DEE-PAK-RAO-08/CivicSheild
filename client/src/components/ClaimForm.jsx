import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const API = import.meta.env.PROD ? '' : 'http://localhost:5000';

export default function ClaimForm({ systemStatus }) {
  const [citizens, setCitizens] = useState([]);
  const [form, setForm] = useState({ citizenId: '', scheme: '', amount: '' });
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [schemeDropdownOpen, setSchemeDropdownOpen] = useState(false);
  const [gateStage, setGateStage] = useState(0); // 0=idle, 1-3=scanning, 4=done
  const inputRef = React.useRef(null);

  useEffect(() => {
    fetch(`${API}/api/admin/citizen-ids`)
      .then(r => r.json())
      .then(data => setCitizens(data.slice(0, 150)))
      .catch(() => {});
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (systemStatus !== 'ACTIVE') return;

    setProcessing(true);
    setResult(null);

    // Cinematic gate-by-gate animation
    setGateStage(1);
    await sleep(700);
    setGateStage(2);
    await sleep(700);
    setGateStage(3);
    await sleep(700);

    try {
      const res = await fetch(`${API}/api/claims/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      setResult(data);
      setGateStage(4);
    } catch (err) {
      setResult({ error: true, message: 'Network error' });
      setGateStage(0);
    } finally {
      setProcessing(false);
    }
  };

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  const getGateClass = (gate) => {
    if (!result) {
      if (gateStage === gate) return 'scanning';
      if (gateStage > gate) return 'passed';
      return 'idle';
    }
    if (result.pipeline) {
      const g = result.pipeline[`gate${gate}`];
      if (g?.passed) return 'passed';
      if (result.rejectionGate === gate) return 'failed';
    }
    if (gateStage >= gate && !result.rejectionGate) return 'passed';
    return 'idle';
  };

  const getLineClass = (afterGate) => {
    if (!result) {
      return gateStage > afterGate ? 'active' : '';
    }
    const g = result.pipeline?.[`gate${afterGate}`];
    if (g?.passed) return 'active';
    if (result.rejectionGate === afterGate) return 'failed';
    return '';
  };

  return (
    <div className="glass" style={{ padding: '2rem' }}>
      <h2 style={{ fontSize: '1.1rem', marginBottom: '0.3rem' }}>📋 CLAIM SUBMISSION TERMINAL</h2>
      <p style={{ color: 'var(--text-3)', fontSize: '0.85rem', marginBottom: '2rem' }}>
        Process welfare claims through the 3-Gate Sequential Validation Engine
      </p>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.2rem' }}>
          <div>
            <label>CITIZEN IDENTITY (RAW ID)</label>
            <div style={{ position: 'relative' }} ref={inputRef}>
              <input
                type="text"
                placeholder="Enter 12-digit Citizen_ID..."
                value={form.citizenId}
                onChange={e => {
                  setForm({ ...form, citizenId: e.target.value });
                  setDropdownOpen(true);
                }}
                onFocus={() => setDropdownOpen(true)}
                onBlur={() => setTimeout(() => setDropdownOpen(false), 200)}
                required
              />
              <AnimatePresence>
                {dropdownOpen && citizens.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, scaleY: 0.9 }}
                    animate={{ opacity: 1, y: 0, scaleY: 1 }}
                    exit={{ opacity: 0, y: -10, scaleY: 0.9 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      width: '100%',
                      maxHeight: '250px',
                      overflowY: 'auto',
                      backgroundColor: '#070b19',
                      border: '1px solid var(--cyan)',
                      borderTop: 'none',
                      borderRadius: '0 0 var(--radius-sm) var(--radius-sm)',
                      boxShadow: '0 10px 30px rgba(0, 229, 255, 0.2)',
                      zIndex: 9999,
                      transformOrigin: 'top'
                    }}
                  >
                    {citizens
                      .filter(c => c.id.includes(form.citizenId) || c.hash.includes(form.citizenId))
                      .map((c, i) => (
                        <motion.div
                          key={c.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.02 }}
                          style={{
                            padding: '0.8rem 1rem',
                            cursor: 'pointer',
                            borderBottom: '1px solid rgba(255,255,255,0.05)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.2rem'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(0, 229, 255, 0.1)'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                          onClick={() => {
                            setForm({ ...form, citizenId: c.id });
                            setDropdownOpen(false);
                          }}
                        >
                          <span className="mono" style={{ color: 'var(--text-1)', fontSize: '0.85rem' }}>{c.id}</span>
                          <span className="mono" style={{ color: 'var(--text-3)', fontSize: '0.7rem' }}>{c.hash}</span>
                        </motion.div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label>SCHEME ELIGIBILITY</label>
              <div style={{ position: 'relative' }}>
                <div
                  style={{
                    backgroundColor: 'rgba(0,0,0,0.4)',
                    border: '1px solid var(--border)',
                    padding: '0.8rem 1rem',
                    borderRadius: 'var(--radius-sm)',
                    color: form.scheme ? '#fff' : 'var(--text-3)',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                  onClick={() => setSchemeDropdownOpen(!schemeDropdownOpen)}
                >
                  {form.scheme ? form.scheme : 'Select Scheme'}
                  <span style={{ fontSize: '0.8rem', transform: schemeDropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▼</span>
                </div>
                
                <AnimatePresence>
                  {schemeDropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -10, scaleY: 0.9 }}
                      animate={{ opacity: 1, y: 0, scaleY: 1 }}
                      exit={{ opacity: 0, y: -10, scaleY: 0.9 }}
                      transition={{ duration: 0.2, ease: "easeOut" }}
                      style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        width: '100%',
                        backgroundColor: '#070b19',
                        border: '1px solid var(--cyan)',
                        borderTop: 'none',
                        borderRadius: '0 0 var(--radius-sm) var(--radius-sm)',
                        boxShadow: '0 10px 30px rgba(0, 229, 255, 0.2)',
                        zIndex: 9999,
                        transformOrigin: 'top'
                      }}
                    >
                      {[
                        { val: 'Health', label: 'Health (₹5,000)' },
                        { val: 'Pension', label: 'Pension (₹2,000)' },
                        { val: 'Food', label: 'Food (₹1,000)' }
                      ].map((s, i) => (
                        <motion.div
                          key={s.val}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.05 }}
                          style={{
                            padding: '0.8rem 1rem',
                            cursor: 'pointer',
                            borderBottom: '1px solid rgba(255,255,255,0.05)',
                            color: 'var(--text-1)'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(0, 229, 255, 0.1)'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                          onClick={() => {
                            setForm({ ...form, scheme: s.val });
                            setSchemeDropdownOpen(false);
                          }}
                        >
                          {s.label}
                        </motion.div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
            <div>
              <label>DISBURSEMENT AMOUNT (₹)</label>
              <input
                type="number"
                placeholder="Exact amount..."
                value={form.amount}
                onChange={e => setForm({ ...form, amount: e.target.value })}
                required
              />
            </div>
          </div>
        </div>

        <button type="submit" className="btn btn-primary" disabled={processing || systemStatus !== 'ACTIVE'}>
          {processing ? '⏳ PROCESSING PIPELINE...' : '🛡️ INITIATE SEQUENTIAL VALIDATION'}
        </button>
      </form>

      {/* GATE PIPELINE VISUAL */}
      <AnimatePresence>
        {(processing || result) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={{ marginTop: '2rem', borderTop: '1px solid var(--border)', paddingTop: '2rem' }}
          >
            <h3 style={{ fontSize: '0.9rem', marginBottom: '0.5rem', color: 'var(--cyan)' }}>
              🛡️ TRUST PIPELINE VERIFICATION
            </h3>

            {/* Pre-gate rejection */}
            {result && !result.pipeline && result.rejectionReason && (
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                style={{
                  padding: '1rem',
                  background: 'var(--red-dim)',
                  border: '1px solid var(--red)',
                  borderRadius: 'var(--radius-sm)',
                  marginBottom: '1rem'
                }}
              >
                <strong style={{ color: 'var(--red)' }}>PRE-GATE REJECTION:</strong>{' '}
                <span className="mono" style={{ fontSize: '0.85rem' }}>{result.rejectionReason}</span>
              </motion.div>
            )}

            {/* Pipeline Track */}
            <div className="pipeline-track">
              <div className={`gate-circle ${getGateClass(1)}`}>
                <span className="gate-num">{getGateClass(1) === 'passed' ? '✓' : getGateClass(1) === 'failed' ? '✕' : '1'}</span>
                <span className="gate-lbl">ELIGIBILITY</span>
              </div>
              <div className={`gate-line ${getLineClass(1)}`} />

              <div className={`gate-circle ${getGateClass(2)}`}>
                <span className="gate-num">{getGateClass(2) === 'passed' ? '✓' : getGateClass(2) === 'failed' ? '✕' : '2'}</span>
                <span className="gate-lbl">BUDGET</span>
              </div>
              <div className={`gate-line ${getLineClass(2)}`} />

              <div className={`gate-circle ${getGateClass(3)}`}>
                <span className="gate-num">{getGateClass(3) === 'passed' ? '✓' : getGateClass(3) === 'failed' ? '✕' : '3'}</span>
                <span className="gate-lbl">FREQUENCY</span>
              </div>
            </div>

            {/* Result Card */}
            {result && (
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                style={{
                  marginTop: '1.5rem',
                  padding: '1.5rem',
                  background: 'rgba(0,0,0,0.5)',
                  borderRadius: 'var(--radius-sm)',
                  borderLeft: `4px solid ${result.approved ? 'var(--green)' : 'var(--red)'}`
                }}
              >
                <h3 style={{
                  color: result.approved ? 'var(--green)' : 'var(--red)',
                  fontSize: '1.1rem',
                  marginBottom: '1rem'
                }}>
                  {result.approved ? '✅ DISBURSEMENT APPROVED — LEDGER UPDATED' : '❌ DISBURSEMENT REJECTED'}
                </h3>

                {!result.approved && result.rejectionReason && (
                  <div className="mono" style={{
                    padding: '0.8rem',
                    background: 'var(--red-dim)',
                    borderRadius: '4px',
                    fontSize: '0.85rem',
                    marginBottom: '1rem'
                  }}>
                    <strong>GATE {result.rejectionGate} FAILURE:</strong> {result.rejectionReason}
                  </div>
                )}

                {result.approved && result.transaction && (
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '0.8rem',
                    fontSize: '0.85rem'
                  }}>
                    <div className="mono"><strong style={{ color: 'var(--text-3)' }}>TXN_ID:</strong> {result.transaction.id}</div>
                    <div className="mono"><strong style={{ color: 'var(--text-3)' }}>CITIZEN:</strong> {result.citizenHash}</div>
                    <div className="mono"><strong style={{ color: 'var(--text-3)' }}>BLOCK:</strong> {result.transaction.currentHash}</div>
                    <div className="mono" style={{ color: 'var(--green)' }}>
                      <strong>BUDGET LEFT:</strong> ₹{result.budgetRemaining?.toLocaleString('en-IN')}
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
