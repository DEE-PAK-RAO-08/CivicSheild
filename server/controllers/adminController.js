// ═══════════════════════════════════════════════════════
// CivicShield — Admin Controller
// Kill-Switch Admin Panel endpoints
// ═══════════════════════════════════════════════════════

const SystemState = require('../services/systemState');
const LedgerService = require('../services/ledgerService');
const DataLoader = require('../services/dataLoader');
const ValidationPipeline = require('../services/validationPipeline');
const CryptoService = require('../services/cryptoService');
const EventStream = require('../services/eventStream');

class AdminController {
  /**
   * GET /api/admin/status
   * Real-time system status for dashboard (auto-refreshes every 5s)
   */
  static getStatus(req, res) {
    const state = SystemState.getState();
    const ledger = LedgerService.getLedger();
    const txLog = ValidationPipeline.getLastTransactions(10);

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
      // Last 10 transactions — CitizenHash first 8 chars, scheme, amount, region, status, gate
      last_10_transactions: txLog.map(t => ({
        citizenHash: CryptoService.maskHash(t.citizenHash),
        Scheme_Eligibility: t.scheme,
        Scheme_Amount: t.amount,
        Region_Code: t.citizenData?.Region_Code || 'UNKNOWN',
        status: t.approved ? 'APPROVED' : 'REJECTED',
        failedGate: t.rejectionGate ? `Gate ${t.rejectionGate}` : null,
        rejectionReason: t.rejectionReason,
        timestamp: t.timestamp
      }))
    });
  }

  /**
   * POST /api/admin/pause
   * Emergency Pause — immediately blocks all transactions
   */
  static pause(req, res) {
    const result = SystemState.pause();
    if (result.error) {
      return res.status(400).json(result);
    }
    EventStream.broadcast('ADMIN_PAUSE', {
      message: 'System paused by administrator',
      timestamp: result.timestamp
    });
    res.json(result);
  }

  /**
   * POST /api/admin/resume
   * Resume — only from PAUSED state
   */
  static resume(req, res) {
    const result = SystemState.resume();
    if (result.error) {
      return res.status(400).json(result);
    }
    res.json(result);
  }

  /**
   * POST /api/admin/reset
   * Full system reset for demo
   */
  static reset(req, res) {
    SystemState.reset();
    LedgerService.reset();
    ValidationPipeline.reset();
    DataLoader.reload();
    EventStream.reset();

    EventStream.broadcast('SYSTEM_RESET', {
      message: 'System fully reset',
      timestamp: new Date().toISOString()
    });

    res.json({ status: 'ACTIVE', message: 'System fully reset', timestamp: new Date().toISOString() });
  }

  /**
   * GET /api/admin/tamper-report
   * Download structured JSON tamper report (when FROZEN)
   */
  static tamperReport(req, res) {
    const report = LedgerService.generateTamperReport();
    res.json(report);
  }

  /**
   * GET /api/admin/citizens
   * Registry Viewer — read-only table with live Claim_Count and Last_Claim_Date
   */
  static getCitizens(req, res) {
    const citizens = DataLoader.getAllCitizens();
    res.json(citizens);
  }

  /**
   * GET /api/admin/citizen-ids
   * List of citizen IDs for claim form dropdown
   */
  static getCitizenIds(req, res) {
    const ids = DataLoader.getCitizenIdList();
    res.json(ids);
  }

  /**
   * GET /api/admin/fraud-report
   * On-demand fraud pattern report
   */
  static getFraudReport(req, res) {
    const report = ValidationPipeline.generateFraudReport();
    res.json(report || { message: 'No transactions processed yet' });
  }
}

module.exports = AdminController;
