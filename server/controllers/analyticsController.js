// ═══════════════════════════════════════════════════════
// CivicShield — Analytics Controller (Innovation Feature)
// Regional Heatmap, Anomaly Detection, Trust Scoring
// ═══════════════════════════════════════════════════════

const ValidationPipeline = require('../services/validationPipeline');
const DataLoader = require('../services/dataLoader');
const SystemState = require('../services/systemState');
const LedgerService = require('../services/ledgerService');
const CryptoService = require('../services/cryptoService');

class AnalyticsController {
  /**
   * GET /api/analytics/region-heatmap
   * Budget burn and rejection rates by region
   */
  static getRegionHeatmap(req, res) {
    const ledger = LedgerService.getLedger();
    const txLog = ValidationPipeline.getTransactionLog();

    const regionData = {};

    // Count approved by region
    ledger.forEach(block => {
      const r = block.Region_Code || 'UNKNOWN';
      if (!regionData[r]) regionData[r] = { approved: 0, rejected: 0, totalAmount: 0, schemes: {} };
      regionData[r].approved += 1;
      regionData[r].totalAmount += block.Amount;
      regionData[r].schemes[block.Scheme] = (regionData[r].schemes[block.Scheme] || 0) + 1;
    });

    // Count rejected by region
    txLog.filter(t => !t.approved).forEach(t => {
      const r = t.citizenData?.Region_Code || 'UNKNOWN';
      if (!regionData[r]) regionData[r] = { approved: 0, rejected: 0, totalAmount: 0, schemes: {} };
      regionData[r].rejected += 1;
    });

    // Calculate risk score per region
    Object.keys(regionData).forEach(r => {
      const d = regionData[r];
      const total = d.approved + d.rejected;
      d.rejectionRate = total > 0 ? ((d.rejected / total) * 100).toFixed(1) : '0.0';
      d.riskScore = total > 0
        ? Math.min(100, Math.round((d.rejected / total) * 100 + (d.totalAmount / 10000) * 10))
        : 0;
    });

    res.json({
      regions: regionData,
      generatedAt: new Date().toISOString()
    });
  }

  /**
   * GET /api/analytics/anomaly-detection
   * Pattern-based anomaly alerts
   */
  static getAnomalies(req, res) {
    const txLog = ValidationPipeline.getTransactionLog();
    const anomalies = [];

    // Detect: Same citizen attempting multiple times in short window
    const citizenAttempts = {};
    txLog.forEach(t => {
      const h = CryptoService.maskHash(t.citizenHash);
      if (!citizenAttempts[h]) citizenAttempts[h] = [];
      citizenAttempts[h].push(t);
    });

    Object.entries(citizenAttempts).forEach(([hash, attempts]) => {
      if (attempts.length >= 3) {
        anomalies.push({
          type: 'RAPID_CLAIM_PATTERN',
          severity: 'HIGH',
          citizenHash: hash,
          attempts: attempts.length,
          message: `Citizen ${hash} attempted ${attempts.length} claims — possible automated script`,
          detectedAt: new Date().toISOString()
        });
      }
    });

    // Detect: Unusual scheme-amount patterns
    const rejectedForMismatch = txLog.filter(t =>
      !t.approved && t.rejectionReason && t.rejectionReason.includes('mismatch')
    );
    if (rejectedForMismatch.length >= 2) {
      anomalies.push({
        type: 'SCHEME_PROBING',
        severity: 'MEDIUM',
        count: rejectedForMismatch.length,
        message: `${rejectedForMismatch.length} claims rejected for scheme/amount mismatch — possible probing attack`,
        detectedAt: new Date().toISOString()
      });
    }

    // Detect: Budget approaching exhaustion (< 20%)
    const state = SystemState.getState();
    const budgetPercent = (state.budget_remaining / 1000000) * 100;
    if (budgetPercent < 20 && budgetPercent > 0) {
      anomalies.push({
        type: 'BUDGET_WARNING',
        severity: 'CRITICAL',
        remaining: state.budget_remaining,
        percentLeft: budgetPercent.toFixed(1),
        message: `Budget at ${budgetPercent.toFixed(1)}% — approaching exhaustion`,
        detectedAt: new Date().toISOString()
      });
    }

    // Detect: High rejection rate
    if (state.total_transactions > 5) {
      const rejRate = (state.rejected_count / state.total_transactions) * 100;
      if (rejRate > 60) {
        anomalies.push({
          type: 'HIGH_REJECTION_RATE',
          severity: 'HIGH',
          rate: rejRate.toFixed(1),
          message: `Rejection rate at ${rejRate.toFixed(1)}% — possible coordinated attack pattern`,
          detectedAt: new Date().toISOString()
        });
      }
    }

    res.json({
      anomalies,
      totalAnomalies: anomalies.length,
      threatLevel: anomalies.some(a => a.severity === 'CRITICAL') ? 'CRITICAL' :
        anomalies.some(a => a.severity === 'HIGH') ? 'HIGH' :
        anomalies.length > 0 ? 'MEDIUM' : 'LOW',
      generatedAt: new Date().toISOString()
    });
  }

  /**
   * GET /api/analytics/citizen-trust/:hash
   * Trust score for individual citizen
   */
  static getCitizenTrust(req, res) {
    const { hash } = req.params;
    const txLog = ValidationPipeline.getTransactionLog();
    const citizen = DataLoader.findByHash(hash);

    if (!citizen) {
      return res.status(404).json({ error: 'Citizen not found' });
    }

    const citizenTxns = txLog.filter(t => t.citizenHash === hash);
    const approved = citizenTxns.filter(t => t.approved).length;
    const rejected = citizenTxns.filter(t => !t.approved).length;

    // Trust score algorithm (0-100)
    let trust = 100;
    // Penalty for rejections
    trust -= rejected * 15;
    // Penalty for high claim count
    if (citizen.Claim_Count > 2) trust -= (citizen.Claim_Count - 2) * 10;
    // Bonus for clean record
    if (rejected === 0 && approved > 0) trust += 5;
    // Floor at 0
    trust = Math.max(0, Math.min(100, trust));

    const riskLevel = trust >= 80 ? 'LOW' : trust >= 50 ? 'MEDIUM' : trust >= 20 ? 'HIGH' : 'CRITICAL';

    res.json({
      citizenHash: CryptoService.maskHash(hash),
      trustScore: trust,
      riskLevel,
      transactionHistory: {
        total: citizenTxns.length,
        approved,
        rejected
      },
      profile: {
        region: citizen.Region_Code,
        scheme: citizen.Scheme_Eligibility,
        claimCount: citizen.Claim_Count,
        accountStatus: citizen.Account_Status
      },
      indicators: [
        rejected > 0 ? { flag: 'PREVIOUS_REJECTIONS', detail: `${rejected} rejected claims`, impact: -15 * rejected } : null,
        citizen.Claim_Count >= 3 ? { flag: 'MAX_CLAIMS_REACHED', detail: `Claim count: ${citizen.Claim_Count}/3`, impact: -10 } : null,
        approved > 0 && rejected === 0 ? { flag: 'CLEAN_RECORD', detail: 'All claims approved', impact: +5 } : null,
      ].filter(Boolean),
      generatedAt: new Date().toISOString()
    });
  }

  /**
   * GET /api/analytics/summary
   * Full analytics summary for dashboard
   */
  static getSummary(req, res) {
    const state = SystemState.getState();
    const ledger = LedgerService.getLedger();
    const txLog = ValidationPipeline.getTransactionLog();

    // Rejection reasons breakdown
    const rejectionBreakdown = {};
    txLog.filter(t => !t.approved).forEach(t => {
      const reason = t.rejectionGate ? `Gate ${t.rejectionGate}` : 'Pre-Gate';
      rejectionBreakdown[reason] = (rejectionBreakdown[reason] || 0) + 1;
    });

    // Scheme distribution
    const schemes = {};
    ledger.forEach(b => {
      schemes[b.Scheme] = (schemes[b.Scheme] || 0) + b.Amount;
    });

    // Time-series (last 20 txns)
    const timeSeries = txLog.slice(-20).map(t => ({
      time: new Date(t.timestamp).toLocaleTimeString(),
      approved: t.approved,
      amount: t.amount
    }));

    res.json({
      systemUptime: process.uptime(),
      budget: {
        initial: 1000000,
        remaining: state.budget_remaining,
        spent: 1000000 - state.budget_remaining,
        utilizationRate: (((1000000 - state.budget_remaining) / 1000000) * 100).toFixed(1)
      },
      transactions: {
        total: state.total_transactions,
        approved: state.approved_count,
        rejected: state.rejected_count,
        approvalRate: state.total_transactions > 0
          ? ((state.approved_count / state.total_transactions) * 100).toFixed(1)
          : '0.0'
      },
      rejectionBreakdown,
      schemeDistribution: schemes,
      timeSeries,
      citizensLoaded: DataLoader.getCount(),
      ledgerBlocks: ledger.length,
      generatedAt: new Date().toISOString()
    });
  }
}

module.exports = AnalyticsController;
