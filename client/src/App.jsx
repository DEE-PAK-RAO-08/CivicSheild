import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import RippleGrid from './components/RippleGrid';
import ClaimForm from './components/ClaimForm';
import AdminPanel from './components/AdminPanel';
import LedgerViewer from './components/LedgerViewer';
import RegistryViewer from './components/RegistryViewer';
import AttackLab from './components/AttackLab';
import EventStream from './components/EventStream';
import AnalyticsDashboard from './components/AnalyticsDashboard';

const TABS = [
  { id: 'claim', label: 'Submit Claim', icon: '📋' },
  { id: 'admin', label: 'Admin Console', icon: '⚙️' },
  { id: 'registry', label: 'Registry', icon: '👥' },
  { id: 'ledger', label: 'Blockchain', icon: '⛓️' },
  { id: 'analytics', label: 'Intelligence', icon: '🧠' },
  { id: 'attack', label: 'Attack Lab', icon: '🧪' },
];

// Grid color changes based on system status
const STATUS_GRID_COLORS = {
  ACTIVE: '#00e5ff',
  PAUSED: '#ffd740',
  FROZEN: '#ff1744',
  BUDGET_EXHAUSTED: '#ff6d00'
};

function SplashScreen({ onFinish }) {
  useEffect(() => {
    const timer = setTimeout(onFinish, 3200);
    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <motion.div
      className="splash"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.8 }}
    >
      {/* Ripple Grid behind splash */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
        <RippleGrid
          enableRainbow={false}
          gridColor="#00e5ff"
          rippleIntensity={0.06}
          gridSize={12}
          gridThickness={18}
          mouseInteraction={true}
          mouseInteractionRadius={1.5}
          opacity={0.6}
        />
      </div>

      <div style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
        <motion.div
          initial={{ scale: 0.3, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
          style={{ fontSize: '5rem', marginBottom: '1rem' }}
        >
          🛡️
        </motion.div>
        <motion.h1
          className="gradient-text"
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.9 }}
        >
          CIVICSHIELD
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.0 }}
          style={{
            color: '#4a6080',
            fontFamily: 'Orbitron',
            fontSize: '0.65rem',
            letterSpacing: '6px',
            marginTop: '0.5rem'
          }}
        >
          SEQUENTIAL VALIDATION ENGINE v2.0
        </motion.p>
        <motion.div
          initial={{ opacity: 0, width: 0 }}
          animate={{ opacity: 1, width: 300 }}
          transition={{ delay: 1.4, duration: 0.5 }}
          className="loading-bar"
          style={{ marginTop: '2.5rem', marginLeft: 'auto', marginRight: 'auto' }}
        >
          <div className="fill" />
        </motion.div>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.6 }}
          transition={{ delay: 1.8 }}
          style={{
            color: '#4a6080',
            fontSize: '0.7rem',
            letterSpacing: '3px',
            marginTop: '1rem',
            fontFamily: 'Orbitron'
          }}
        >
          INITIALIZING CRYPTOGRAPHIC PROTOCOLS...
        </motion.p>
      </div>
    </motion.div>
  );
}

function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [activeTab, setActiveTab] = useState('claim');
  const [systemStatus, setSystemStatus] = useState('ACTIVE');

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const API = import.meta.env.PROD ? '' : 'http://localhost:5000';
        const res = await fetch(`${API}/api/admin/status`);
        const data = await res.json();
        if (data.status) setSystemStatus(data.status);
      } catch { /* server not ready */ }
    };
    fetchStatus();
    const intv = setInterval(fetchStatus, 5000);
    return () => clearInterval(intv);
  }, []);

  const statusClass = systemStatus === 'ACTIVE' ? 'active'
    : systemStatus === 'FROZEN' || systemStatus === 'BUDGET_EXHAUSTED' ? 'frozen'
    : 'paused';

  const gridColor = STATUS_GRID_COLORS[systemStatus] || STATUS_GRID_COLORS.ACTIVE;

  return (
    <>
      <AnimatePresence>
        {showSplash && <SplashScreen onFinish={() => setShowSplash(false)} />}
      </AnimatePresence>

      {!showSplash && (
        <div className="app-shell">
          {/* RippleGrid Background — reactive to system status */}
          <div className="canvas-bg" style={{ pointerEvents: 'auto' }}>
            <RippleGrid
              enableRainbow={false}
              gridColor={gridColor}
              rippleIntensity={systemStatus === 'FROZEN' ? 0.12 : 0.05}
              gridSize={10}
              gridThickness={15}
              mouseInteraction={true}
              mouseInteractionRadius={1.2}
              opacity={systemStatus === 'FROZEN' ? 0.5 : 0.35}
              glowIntensity={systemStatus === 'FROZEN' ? 0.2 : 0.1}
            />
          </div>

          {/* Freeze Banners */}
          {systemStatus === 'FROZEN' && (
            <div className="freeze-banner red">
              🚨 CRITICAL: LEDGER INTEGRITY COMPROMISED — ALL DISBURSEMENTS HALTED
            </div>
          )}
          {systemStatus === 'BUDGET_EXHAUSTED' && (
            <div className="freeze-banner gold">
              💰 SYSTEM LOCKED — BUDGET COMPLETELY EXHAUSTED
            </div>
          )}

          <div
            className="app-content"
            style={{
              paddingTop: (systemStatus === 'FROZEN' || systemStatus === 'BUDGET_EXHAUSTED') ? '45px' : 0
            }}
          >
            {/* Top Bar */}
            <header className="topbar">
              <div className="topbar-logo">
                <span className="shield-icon">🛡️</span>
                <div>
                  <h1 className="gradient-text">CIVICSHIELD</h1>
                  <div className="subtitle">TAMPER-PROOF WELFARE ENGINE</div>
                </div>
              </div>
              <div className={`status-pill ${statusClass}`}>
                <span className="dot" />
                {systemStatus}
              </div>
            </header>

            {/* Navigation */}
            <nav className="nav-tabs">
              {TABS.map(tab => (
                <button
                  key={tab.id}
                  className={`nav-tab ${activeTab === tab.id ? 'active' : ''}`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  <span style={{ marginRight: '0.4rem' }}>{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </nav>

            {/* Content Grid */}
            <main className="main-content">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35 }}
                style={{ minWidth: 0 }}
              >
                {activeTab === 'claim' && <ClaimForm systemStatus={systemStatus} />}
                {activeTab === 'admin' && <AdminPanel />}
                {activeTab === 'registry' && <RegistryViewer />}
                {activeTab === 'ledger' && <LedgerViewer />}
                {activeTab === 'analytics' && <AnalyticsDashboard />}
                {activeTab === 'attack' && <AttackLab />}
              </motion.div>

              <EventStream />
            </main>
          </div>
        </div>
      )}
    </>
  );
}

export default App;
