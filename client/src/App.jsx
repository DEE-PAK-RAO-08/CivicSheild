import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import LightPillar from './components/LightPillar';
import ClaimForm from './components/ClaimForm';
import AdminPanel from './components/AdminPanel';
import LedgerViewer from './components/LedgerViewer';
import RegistryViewer from './components/RegistryViewer';
import AttackLab from './components/AttackLab';
import EventStream from './components/EventStream';
import AnalyticsDashboard from './components/AnalyticsDashboard';
import Login from './components/Login';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from './firebase';

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
      {/* Background behind splash */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
        <LightPillar
          topColor="#5227FF"
          bottomColor="#FF9FFC"
          intensity={0.6}
          rotationSpeed={0.25}
          glowAmount={0.001}
          pillarWidth={3}
          pillarHeight={0.4}
          noiseIntensity={0.5}
          pillarRotation={25}
          interactive={false}
          mixBlendMode="screen"
          quality="high"
        />
      </div>

      <div className="splash-content">
        <motion.div
          initial={{ scale: 0.3, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
          className="splash-icon"
        >
          🛡️
        </motion.div>
        <motion.h1
          className="splash-title gradient-text"
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.9 }}
        >
          CIVICSHIELD
        </motion.h1>
        <motion.p
          className="splash-subtitle cyan-sub"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.0 }}
        >
          SEQUENTIAL VALIDATION ENGINE v2.0
        </motion.p>
        <motion.div
          initial={{ opacity: 0, width: 0 }}
          animate={{ opacity: 1, width: 'min(350px, 80vw)' }}
          transition={{ delay: 1.4, duration: 0.5 }}
          className="loading-bar-container"
        >
          <div className="loading-fill" />
        </motion.div>
        <motion.p
          className="splash-status"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.8 }}
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
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const API = import.meta.env.PROD ? '' : 'http://127.0.0.1:5000';
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

      {!showSplash && !user && (
        <>
          <div className="canvas-bg" style={{ pointerEvents: 'none' }}>
            <LightPillar
              topColor="#5227FF"
              bottomColor="#FF9FFC"
              intensity={0.4}
              rotationSpeed={0.2}
              glowAmount={0.001}
              pillarWidth={3}
              pillarHeight={0.4}
              noiseIntensity={0.5}
              pillarRotation={25}
              interactive={false}
              mixBlendMode="screen"
              quality="high"
            />
          </div>
          <Login />
        </>
      )}

      {!showSplash && user && (
        <div className="app-shell">
          {/* Background Layers — reactive to system status */}
          <div className="canvas-bg" style={{ pointerEvents: 'auto' }}>
            <LightPillar
              topColor={systemStatus === 'FROZEN' ? '#ff1744' : '#5227FF'}
              bottomColor={systemStatus === 'FROZEN' ? '#330000' : '#FF9FFC'}
              intensity={0.8}
              rotationSpeed={0.3}
              glowAmount={0.001}
              pillarWidth={3}
              pillarHeight={0.4}
              noiseIntensity={0.5}
              pillarRotation={25}
              interactive={false}
              mixBlendMode="screen"
              quality="high"
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
                  <h1 className="gradient-text brand-title">CIVICSHIELD</h1>
                  <div className="subtitle brand-subtitle">TAMPER-PROOF WELFARE ENGINE</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                <div className={`status-pill ${statusClass}`}>
                  <span className="dot" />
                  {systemStatus}
                </div>
                <button 
                  onClick={() => signOut(auth)} 
                  className="btn" 
                  style={{ padding: '0.4rem 0.8rem', fontSize: '0.7rem', height: 'auto', border: '1px solid var(--border)' }}
                >
                  LOGOUT
                </button>
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
