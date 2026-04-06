// ═══════════════════════════════════════════════════════
// CivicShield — Dashboard Controller
// ═══════════════════════════════════════════════════════

const SystemState = require('../services/systemState');
const LedgerService = require('../services/ledgerService');
const DataLoader = require('../services/dataLoader');
const ValidationPipeline = require('../services/validationPipeline');

class DashboardController {
  /**
   * GET /api/dashboard/stats
   */
  static getStats(req, res) {
    const state = SystemState.getState();
    const ledger = LedgerService.getLedger();
    
    // Budget burn by region
    const regionBurn = {};
    ledger.forEach(block => {
      const region = block.Region_Code || 'UNKNOWN';
      regionBurn[region] = (regionBurn[region] || 0) + block.Amount;
    });

    // Scheme distribution
    const schemeDistribution = {};
    ledger.forEach(block => {
      schemeDistribution[block.Scheme] = (schemeDistribution[block.Scheme] || 0) + 1;
    });

    res.json({
      systemStatus: state.status,
      budget: {
        initial: 1000000,
        remaining: state.budget_remaining,
        spent: 1000000 - state.budget_remaining,
        percentUsed: (((1000000 - state.budget_remaining) / 1000000) * 100).toFixed(1)
      },
      transactions: {
        total: state.total_transactions,
        approved: state.approved_count,
        rejected: state.rejected_count,
        approvalRate: SystemState.getApprovalRate()
      },
      ledger: {
        blocks: ledger.length,
        lastBlock: ledger.length > 0 ? ledger[ledger.length - 1].Timestamp : null
      },
      regionBurn,
      schemeDistribution,
      citizenCount: DataLoader.getCount()
    });
  }

  /**
   * GET /api/dashboard/fraud-analytics
   */
  static getFraudAnalytics(req, res) {
    const report = ValidationPipeline.generateFraudReport();
    res.json(report || { message: 'No transactions yet' });
  }
}

module.exports = DashboardController;
