// ═══════════════════════════════════════════════════════
// CivicShield Server v2.0
// Tamper-Proof Welfare Disbursement Validation System
// SDG 16 & SDG 1 Compliant
// ═══════════════════════════════════════════════════════

const express = require('express');
const cors = require('cors');
const config = require('./config');

// Services
const DataLoader = require('./services/dataLoader');
const LedgerService = require('./services/ledgerService');
const EventStream = require('./services/eventStream');

// Middleware
const systemGuard = require('./middleware/systemGuard');

// Controllers
const ClaimController = require('./controllers/claimController');
const AdminController = require('./controllers/adminController');
const DashboardController = require('./controllers/dashboardController');
const LedgerController = require('./controllers/ledgerController');
const AttackController = require('./controllers/attackController');
const AnalyticsController = require('./controllers/analyticsController');

const app = express();

// ── Middleware ──
app.use(cors());
app.use(express.json());
app.use(systemGuard);

// ══════════════════════════════════════════
// STARTUP: Load CivicShield_Dataset.xlsx
// ══════════════════════════════════════════
try {
  DataLoader.load();
  LedgerService.init();
} catch (error) {
  console.error('❌ FATAL: Failed to load dataset:', error.message);
  console.error('   Ensure CivicShield_Dataset.xlsx is in server/data/');
  process.exit(1);
}

// ══════════════════════════════════════════
// ROUTES
// ══════════════════════════════════════════

// ── Event Stream (SSE) ──
app.get('/api/events/stream', (req, res) => {
  EventStream.addClient(res);
});

app.get('/api/events', (req, res) => {
  EventStream.addClient(res);
});

app.get('/api/events/recent', (req, res) => {
  const count = parseInt(req.query.count) || 50;
  res.json(EventStream.getRecent(count));
});

// ── Claims ──
app.post('/api/claims/process', ClaimController.processClaim);
app.get('/api/claims/history', ClaimController.getHistory);

// ── Ledger ──
app.get('/api/ledger', LedgerController.getLedger);
app.get('/api/ledger/verify', LedgerController.verifyLedger);
app.get('/api/ledger/:id', LedgerController.getBlock);

// ── Dashboard ──
app.get('/api/dashboard/stats', DashboardController.getStats);
app.get('/api/dashboard/fraud-analytics', DashboardController.getFraudAnalytics);

// ── Admin / Kill-Switch Panel ──
app.get('/api/admin/status', AdminController.getStatus);
app.post('/api/admin/pause', AdminController.pause);
app.post('/api/admin/resume', AdminController.resume);
app.post('/api/admin/reset', AdminController.reset);
app.get('/api/admin/tamper-report', AdminController.tamperReport);
app.get('/api/admin/citizens', AdminController.getCitizens);
app.get('/api/admin/citizen-ids', AdminController.getCitizenIds);
app.get('/api/admin/fraud-report', AdminController.getFraudReport);

// Track 1 — Fraud Cluster Scanning (Union-Find DSU + Benford's Law)
app.get('/api/admin/fraud-rings', AdminController.getFraudRings);
app.post('/api/admin/fraud-scan', AdminController.fraudScan);
app.get('/api/admin/fraud-rings/export', AdminController.fraudRingsExport);

// Track 2 — Austerity Mode (Greedy Knapsack Priority Queue)
app.post('/api/admin/austerity', AdminController.activateAusterity);
app.get('/api/admin/austerity-report', AdminController.getAusterityReport);

// Track 3 — Attack Timeline (EWMA + FSM + Jaccard)
app.get('/api/admin/attack-timeline', AdminController.getAttackTimeline);
app.get('/api/admin/attack-timeline/export', AdminController.getAttackTimelineExport);
app.get('/api/admin/surge-status', AdminController.getSurgeStatus);

// ── Attack Simulation Lab (Hackathon Demo) ──
app.post('/api/attacks/tamper-ledger', AttackController.tamperLedger);
app.post('/api/attacks/fake-identity', AttackController.fakeIdentity);
app.post('/api/attacks/stress-test', AttackController.stressTest);

// ── Analytics (Innovation — Beyond Spec) ──
app.get('/api/analytics/region-heatmap', AnalyticsController.getRegionHeatmap);
app.get('/api/analytics/anomaly-detection', AnalyticsController.getAnomalies);
app.get('/api/analytics/citizen-trust/:hash', AnalyticsController.getCitizenTrust);
app.get('/api/analytics/summary', AnalyticsController.getSummary);

// ── Health Check ──
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    system: 'CivicShield v2.0',
    uptime: process.uptime(),
    citizensLoaded: DataLoader.getCount(),
    timestamp: new Date().toISOString()
  });
});

// ── Serve React Frontend (Production) ──
const path = require('path');
app.use(express.static(path.join(__dirname, '../client/dist')));
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API route not found' });
  }
  res.sendFile(path.join(__dirname, '../client/dist', 'index.html'));
});

// ── Start Server ──
app.listen(config.PORT, '0.0.0.0', () => {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║                                                          ║');
  console.log('║   🛡️  CivicShield v2.0 — Tamper-Proof Welfare System     ║');
  console.log('║   Sequential Validation Engine Online                     ║');
  console.log('║                                                          ║');
  console.log(`║   🌐 Server: http://127.0.0.1:${config.PORT}                       ║`);
  console.log(`║   💰 Budget: ₹${config.INITIAL_BUDGET.toLocaleString('en-IN').padEnd(15)}                    ║`);
  console.log(`║   👥 Citizens: ${String(DataLoader.getCount()).padEnd(5)} loaded from XLSX             ║`);
  console.log('║   🔒 SHA-256 Hashing: Active                             ║');
  console.log('║   ⛓️  Hash-Linked Ledger: Ready                           ║');
  console.log('║   🚦 3-Gate Pipeline: Armed                               ║');
  console.log('║                                                          ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log('');

  EventStream.broadcast('SYSTEM_ONLINE', {
    message: 'CivicShield v2.0 online and operational',
    budget: config.INITIAL_BUDGET,
    citizens: DataLoader.getCount(),
    timestamp: new Date().toISOString()
  });
});
