// ═══════════════════════════════════════════════════════
// CivicShield — Admin Controller v3.0
// Kill-Switch, Fraud Clusters, Austerity, Attack Timeline
// ═══════════════════════════════════════════════════════

const SystemState = require('../services/systemState');
const LedgerService = require('../services/ledgerService');
const DataLoader = require('../services/dataLoader');
const ValidationPipeline = require('../services/validationPipeline');
const CryptoService = require('../services/cryptoService');
const EventStream = require('../services/eventStream');
const FraudClusterService = require('../services/fraudClusterService');

class AdminController {
  /**
   * GET /api/admin/status
   */
  static getStatus(req, res) {
    const state = SystemState.getState();
    const ledger = LedgerService.getLedger();
    const txLog = ValidationPipeline.getLastTransactions(10);
    const FraudEngine = require('../services/fraudEngine');
    const surgeStatus = FraudEngine.getSurgeStatus();

    res.json({
      status: state.status,
      budget_remaining: state.budget_remaining,
      budget_formatted: `₹${state.budget_remaining.toLocaleString('en-IN')}`,
      total_transactions: state.total_transactions,
      approved_count: state.approved_count,
      rejected_count: state.rejected_count,
      approval_rate: SystemState.getApprovalRate(),
      frozen_reason: state.frozen_reason,
      freeze_timestamp: state.freeze_timestamp,
      ledger_blocks: ledger.length,
      citizen_count: DataLoader.getCount(),
      last_10_transactions: txLog.map(t => ({
        citizenHash: CryptoService.maskHash(t.citizenHash),
        Scheme_Eligibility: t.scheme,
        Scheme_Amount: t.amount,
        Region_Code: t.citizenData?.Region_Code || 'UNKNOWN',
        Income_Tier: t.citizenData?.Income_Tier || 'UNKNOWN',
        status: t.approved ? 'APPROVED' : 'REJECTED',
        failedGate: t.rejectionGate ? `Gate ${t.rejectionGate}` : null,
        rejectionReason: t.rejectionReason,
        timestamp: t.timestamp
      })),
      austerity: SystemState.getAusterityStats(),
      pending_queue: require('../services/claimQueue').getQueueSize(),
      surge_active: surgeStatus.isActive,
      surge_alert: surgeStatus.latestAlert ? surgeStatus.latestAlert.details : null
    });
  }

  /**
   * POST /api/admin/pause
   */
  static pause(req, res) {
    const result = SystemState.pause();
    if (result.error) return res.status(400).json(result);
    EventStream.broadcast('ADMIN_PAUSE', { message: 'System paused by administrator', timestamp: result.timestamp });
    res.json(result);
  }

  /**
   * POST /api/admin/resume
   */
  static resume(req, res) {
    const result = SystemState.resume();
    if (result.error) return res.status(400).json(result);
    res.json(result);
  }

  /**
   * POST /api/admin/reset
   */
  static reset(req, res) {
    SystemState.reset();
    LedgerService.reset();
    ValidationPipeline.reset();
    DataLoader.reload();
    EventStream.reset();

    EventStream.broadcast('SYSTEM_RESET', { message: 'System fully reset', timestamp: new Date().toISOString() });
    res.json({ status: 'ACTIVE', message: 'System fully reset', timestamp: new Date().toISOString() });
  }

  /**
   * GET /api/admin/tamper-report
   */
  static tamperReport(req, res) {
    res.json(LedgerService.generateTamperReport());
  }

  /**
   * GET /api/admin/citizens
   */
  static getCitizens(req, res) {
    res.json(DataLoader.getAllCitizens());
  }

  /**
   * GET /api/admin/citizen-ids
   */
  static getCitizenIds(req, res) {
    res.json(DataLoader.getCitizenIdList());
  }

  /**
   * GET /api/admin/fraud-report
   */
  static getFraudReport(req, res) {
    const report = ValidationPipeline.generateFraudReport();
    res.json(report || { message: 'No transactions processed yet' });
  }

  // ═══════════════════════════════════════════
  // TRACK 1 — FRAUD CLUSTERS (Union-Find DSU)
  // ═══════════════════════════════════════════

  /**
   * GET /api/admin/fraud-rings
   * Returns enriched cluster data with risk scores + Benford analysis
   */
  static getFraudRings(req, res) {
    const lastScan = FraudClusterService.getLastScan();
    if (lastScan) {
      return res.json(lastScan);
    }
    // First time — do a quick scan
    const report = FraudClusterService.runScan(DataLoader);
    res.json(report);
  }

  /**
   * POST /api/admin/fraud-scan
   * Run a fresh identity graph scan using Union-Find DSU
   */
  static fraudScan(req, res) {
    const report = FraudClusterService.runScan(DataLoader);
    res.json(report);
  }

  /**
   * GET /api/admin/fraud-rings/export
   * Download structured JSON export
   */
  static fraudRingsExport(req, res) {
    const data = FraudClusterService.exportJSON();
    res.json(data);
  }

  // ═══════════════════════════════════════════
  // TRACK 2 — AUSTERITY MODE (Greedy Knapsack)
  // ═══════════════════════════════════════════

  /**
   * POST /api/admin/austerity
   * Trigger 20% budget cut + queue reordering by priority
   */
  static activateAusterity(req, res) {
    const result = SystemState.triggerAusterity();
    if (result.error) return res.status(400).json(result);

    // Reorder queue with greedy knapsack priority scoring
    const ClaimQueue = require('../services/claimQueue');
    ClaimQueue.sortForAusterity();

    res.json(result);
  }

  /**
   * GET /api/admin/austerity-report
   * Full austerity analytics with tier breakdown + Pareto efficiency
   */
  static getAusterityReport(req, res) {
    const report = SystemState.getAusterityReport();
    res.json(report);
  }

  // ═══════════════════════════════════════════
  // TRACK 3 — ATTACK TIMELINE (Temporal Anomaly)
  // ═══════════════════════════════════════════

  /**
   * GET /api/admin/attack-timeline
   * Structured timeline with all required export fields
   */
  static getAttackTimeline(req, res) {
    const FraudEngine = require('../services/fraudEngine');
    res.json(FraudEngine.getTimeline());
  }

  /**
   * GET /api/admin/attack-timeline/export
   * Download structured JSON with: Region_Code, Scheme_Eligibility,
   * FlaggedIdentities, WindowStart, WindowEnd, ClaimsInWindow,
   * TotalDisbursementValueProtected
   */
  static getAttackTimelineExport(req, res) {
    const FraudEngine = require('../services/fraudEngine');
    res.json({
      timeline: FraudEngine.getTimelineExport(),
      exportedAt: new Date().toISOString(),
      format: 'CivicShield Attack Timeline Report v3.0'
    });
  }

  /**
   * GET /api/admin/surge-status
   * Live surge status for real-time banner display
   */
  static getSurgeStatus(req, res) {
    const FraudEngine = require('../services/fraudEngine');
    res.json(FraudEngine.getSurgeStatus());
  }
}

module.exports = AdminController;
