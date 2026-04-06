import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const API = import.meta.env.PROD ? '' : 'http://localhost:5000';

export default function AttackLab() {
  const [tamperIdx, setTamperIdx] = useState(0);
  const [tamperAmt, setTamperAmt] = useState(999999);
  const [stressCount, setStressCount] = useState(50);
  const [result, setResult] = useState(null);
  const [attacking, setAttacking] = useState(false);
  const [attackType, setAttackType] = useState(null);

  const perform = async (path, body = null) => {
    setAttacking(true);
    setAttackType(path);
    setResult(null);
    try {
      const res = await fetch(`${API}/api/attacks/${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : null
      });
      setResult(await res.json());
    } catch {
      setResult({ error: true, message: 'Attack failed to reach server' });
    } finally {
      setAttacking(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div className="glass" style={{ padding: '1.5rem' }}>
        <h2 style={{ fontSize: '1.1rem' }}>🧪 EXPLOITATION & RESILIENCE LAB</h2>
        <p style={{ color: 'var(--text-3)', fontSize: '0.85rem', marginTop: '0.5rem', lineHeight: '1.6' }}>
          Execute simulated attacks against the CivicShield validation engine.
          These tools bypass standard input validation to inject raw malicious payloads,
          testing the cryptographic integrity of the hash-linked ledger and the sequential gate protocol.
        </p>
      </div>

      {/* GOD MODE: Stress Test */}
      <motion.div
        className="glass"
        style={{ padding: '1.5rem', borderColor: 'rgba(179,136,255,0.4)', background: 'rgba(179,136,255,0.05)' }}
        whileHover={{ borderColor: 'rgba(179,136,255,0.6)' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '1rem' }}>
          <span style={{ fontSize: '1.5rem' }}>⚡</span>
          <div>
            <h3 style={{ color: 'var(--purple)', fontSize: '0.9rem' }}>GOD MODE: CONCURRENCY STRESS TEST</h3>
            <p style={{ color: 'var(--text-3)', fontSize: '0.75rem' }}>
              Floods the validation engine with simultaneous asynchronous claims. Proves race-condition defense and strict budget constraints.
            </p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem', alignItems: 'flex-end' }}>
          <div>
            <label style={{ color: 'var(--purple)' }}>CONCURRENT REQUEST VOLUME</label>
            <input
              type="number" min="10" max="1000"
              value={stressCount}
              onChange={e => setStressCount(e.target.value)}
              style={{ borderColor: 'var(--purple)' }}
            />
          </div>
          <button
            className="btn btn-primary"
            style={{ 
              height: '48px', 
              fontSize: '0.8rem', 
              background: 'var(--purple)', 
              borderColor: 'var(--purple)', 
              color: '#fff',
              boxShadow: '0 0 15px rgba(179,136,255,0.4)'
            }}
            disabled={attacking}
            onClick={() => perform('stress-test', { count: parseInt(stressCount) })}
          >
            {attacking && attackType === 'stress-test' ? '⏳ DEPLOYING BOTS...' : '🚀 INITIATE GOD MODE BARRAGE'}
          </button>
        </div>
      </motion.div>

      {/* Attack 1: Ledger Tamper */}
      <motion.div
        className="glass"
        style={{ padding: '1.5rem', borderColor: 'rgba(255,23,68,0.2)' }}
        whileHover={{ borderColor: 'rgba(255,23,68,0.5)' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '1rem' }}>
          <span style={{ fontSize: '1.5rem' }}>⛓️</span>
          <div>
            <h3 style={{ color: 'var(--red)', fontSize: '0.9rem' }}>DIRECT LEDGER MODIFICATION</h3>
            <p style={{ color: 'var(--text-3)', fontSize: '0.75rem' }}>
              Simulates insider threat editing ledger.json — bypasses hash computation
            </p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr', gap: '1rem', alignItems: 'flex-end' }}>
          <div>
            <label>TARGET BLOCK</label>
            <input
              type="number" min="0"
              value={tamperIdx}
              onChange={e => setTamperIdx(e.target.value)}
            />
          </div>
          <div>
            <label>INJECTED AMOUNT (₹)</label>
            <input
              type="number"
              value={tamperAmt}
              onChange={e => setTamperAmt(e.target.value)}
            />
          </div>
          <button
            className="btn btn-danger"
            style={{ height: '48px', fontSize: '0.8rem' }}
            disabled={attacking}
            onClick={() => perform('tamper-ledger', { blockIndex: parseInt(tamperIdx), newAmount: parseInt(tamperAmt) })}
          >
            {attacking && attackType === 'tamper-ledger' ? '⏳ EXECUTING...' : '💀 EXECUTE TAMPER ATTACK'}
          </button>
        </div>
      </motion.div>

      {/* Attack 2: Phantom Identity */}
      <motion.div
        className="glass"
        style={{ padding: '1.5rem', borderColor: 'rgba(255,215,64,0.2)' }}
        whileHover={{ borderColor: 'rgba(255,215,64,0.5)' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '1rem' }}>
          <span style={{ fontSize: '1.5rem' }}>👻</span>
          <div>
            <h3 style={{ color: 'var(--gold)', fontSize: '0.9rem' }}>PHANTOM IDENTITY INJECTION</h3>
            <p style={{ color: 'var(--text-3)', fontSize: '0.75rem' }}>
              Generates cryptographically valid hash for non-existent citizen — tests Gate 1 rejection
            </p>
          </div>
        </div>

        <button
          className="btn btn-danger"
          style={{ width: '100%', borderColor: 'var(--gold)', color: 'var(--gold)', fontSize: '0.8rem' }}
          disabled={attacking}
          onClick={() => perform('fake-identity')}
        >
          {attacking && attackType === 'fake-identity' ? '⏳ GENERATING...' : '🎭 GENERATE PHANTOM IDENTITY'}
        </button>
      </motion.div>

      {/* Result */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ opacity: 0 }}
            className="glass"
            style={{
              padding: '1.5rem',
              borderColor: result.success ? 'var(--green)' : 'var(--red)',
              borderLeftWidth: '4px'
            }}
          >
            <h4 style={{
              fontSize: '0.85rem',
              color: result.success ? 'var(--green)' : 'var(--red)',
              marginBottom: '0.8rem'
            }}>
              📊 ATTACK EXECUTION REPORT
            </h4>
            <pre className="mono" style={{
              fontSize: '0.75rem',
              color: 'var(--text-2)',
              background: 'rgba(0,0,0,0.5)',
              padding: '1rem',
              borderRadius: 'var(--radius-sm)',
              overflow: 'auto',
              maxHeight: '300px',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all'
            }}>
              {JSON.stringify(result, null, 2)}
            </pre>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
