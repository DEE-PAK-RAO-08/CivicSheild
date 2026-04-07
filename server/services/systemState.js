// ═══════════════════════════════════════════════════════
// CivicShield — System State Manager v3.0
// Budget, Austerity Analytics, Fraud Ring Tracking
// Pareto-Optimal Budget Allocation Analysis
// ═══════════════════════════════════════════════════════

const config = require('../config');
const EventStream = require('./eventStream');

let state = {
  status: 'ACTIVE',
  budget_remaining: config.INITIAL_BUDGET,
  total_transactions: 0,
  approved_count: 0,
  rejected_count: 0,
  frozen_reason: null,
  freeze_timestamp: null,
  startup_time: new Date().toISOString(),
  austerity_mode: false,
  austerity_reduction: 0,
  austerity_timestamp: null
};

// ── Austerity Analytics (Medium Track Enhancement) ──
let austerityLog = {
  originalBudget: 0,
  reductionAmount: 0,
  newCeiling: 0,
  timestamp: null,
  approvedUnderAusterity: [],     // { hash, maskedHash, tier, amount, scheme, region, timestamp }
  rejectedUnderAusterity: [],     // { hash, maskedHash, tier, amount, scheme, region, reason, timestamp }
  tierBreakdown: {
    Low:  { approved: 0, rejected: 0, approvedAmount: 0, rejectedAmount: 0 },
    Mid:  { approved: 0, rejected: 0, approvedAmount: 0, rejectedAmount: 0 },
    High: { approved: 0, rejected: 0, approvedAmount: 0, rejectedAmount: 0 }
  },
  processedAt: null
};

// ── Fraud Ring Tracking ──
const FraudRingHashes = new Set();
const FraudClusters = {};

class SystemState {
  static getState() {
    return { ...state };
  }

  static getStatus() {
    return state.status;
  }

  static getBudget() {
    return state.budget_remaining;
  }

  static updateBudget(newBudget) {
    state.budget_remaining = newBudget;
  }

  static incrementApproved() {
    state.total_transactions += 1;
    state.approved_count += 1;
  }

  static incrementRejected() {
    state.total_transactions += 1;
    state.rejected_count += 1;
  }

  // ── System Control ──

  static freeze(reason) {
    state.status = reason === 'BUDGET_EXHAUSTED' ? 'BUDGET_EXHAUSTED' :
                   reason === 'ADMIN_PAUSED' ? 'PAUSED' : 'FROZEN';
    state.frozen_reason = reason;
    state.freeze_timestamp = new Date().toISOString();

    console.log(`[SystemState] 🚨 SYSTEM FROZEN: ${reason} at ${state.freeze_timestamp}`);

    EventStream.broadcast('FREEZE_EVENT', {
      reason,
      timestamp: state.freeze_timestamp,
      budgetRemaining: state.budget_remaining,
      message: `System frozen: ${reason}`
    });
  }

  static pause() {
    if (state.status === 'FROZEN' || state.status === 'BUDGET_EXHAUSTED') {
      return { error: `Cannot pause: system is ${state.status}` };
    }
    this.freeze('ADMIN_PAUSED');
    return { status: 'PAUSED', message: 'System paused by administrator', timestamp: state.freeze_timestamp };
  }

  static resume() {
    if (state.status === 'FROZEN') return { error: 'Cannot resume: ledger tampered. System restart required.' };
    if (state.status === 'BUDGET_EXHAUSTED') return { error: 'Cannot resume: budget exhausted. System restart required.' };
    if (state.status !== 'PAUSED') return { error: `Cannot resume: system is ${state.status}` };
    state.status = 'ACTIVE';
    state.frozen_reason = null;
    state.freeze_timestamp = null;

    EventStream.broadcast('SYSTEM_RESUMED', {
      message: 'System resumed by administrator',
      timestamp: new Date().toISOString()
    });
    return { status: 'ACTIVE', message: 'System resumed successfully' };
  }

  static isOperational() {
    return state.status === 'ACTIVE';
  }

  // ── Full Reset ──

  static reset() {
    state = {
      status: 'ACTIVE',
      budget_remaining: config.INITIAL_BUDGET,
      total_transactions: 0,
      approved_count: 0,
      rejected_count: 0,
      frozen_reason: null,
      freeze_timestamp: null,
      startup_time: new Date().toISOString(),
      austerity_mode: false,
      austerity_reduction: 0,
      austerity_timestamp: null
    };
    FraudRingHashes.clear();
    for (let key in FraudClusters) delete FraudClusters[key];
    austerityLog = {
      originalBudget: 0, reductionAmount: 0, newCeiling: 0, timestamp: null,
      approvedUnderAusterity: [], rejectedUnderAusterity: [],
      tierBreakdown: {
        Low:  { approved: 0, rejected: 0, approvedAmount: 0, rejectedAmount: 0 },
        Mid:  { approved: 0, rejected: 0, approvedAmount: 0, rejectedAmount: 0 },
        High: { approved: 0, rejected: 0, approvedAmount: 0, rejectedAmount: 0 }
      },
      processedAt: null
    };
  }

  // ═════════════════════════════════════════
  // FRAUD RING TRACKING (Easy Track)
  // ═════════════════════════════════════════

  static addFraudHash(hash) {
    FraudRingHashes.add(hash);
  }

  static isFraudRingHash(hash) {
    return FraudRingHashes.has(hash);
  }

  static setFraudClusters(clusters) {
    Object.assign(FraudClusters, clusters);
  }

  static getFraudClusters() {
    return FraudClusters;
  }

  // ═════════════════════════════════════════
  // AUSTERITY MODE (Medium Track — Enhanced)
  // Priority Queue + Greedy Knapsack
  // ═════════════════════════════════════════

  static triggerAusterity() {
    if (state.austerity_mode) return { error: 'Austerity is already active' };
    state.austerity_mode = true;

    const cutAmount = Math.floor(state.budget_remaining * 0.20);
    const oldBudget = state.budget_remaining;
    state.budget_remaining -= cutAmount;
    state.austerity_reduction = cutAmount;
    state.austerity_timestamp = new Date().toISOString();

    // Record in austerity log
    austerityLog.originalBudget = oldBudget;
    austerityLog.reductionAmount = cutAmount;
    austerityLog.newCeiling = state.budget_remaining;
    austerityLog.timestamp = state.austerity_timestamp;

    console.log(`[Austerity] 🔻 Budget cut: ₹${oldBudget.toLocaleString()} → ₹${state.budget_remaining.toLocaleString()} (−₹${cutAmount.toLocaleString()})`);

    EventStream.broadcast('AUSTERITY_TRIGGERED', {
      timestamp: state.austerity_timestamp,
      oldBudget,
      reductionAmount: cutAmount,
      newCeiling: state.budget_remaining,
      message: `Austerity Mode engaged — budget reduced by 20% (₹${cutAmount.toLocaleString()})`
    });

    return { success: true, oldBudget, cutAmount, newBudget: state.budget_remaining };
  }

  /**
   * Record a transaction approved during austerity mode
   */
  static recordAusterityApproval(txData) {
    const entry = {
      hash: txData.citizenHash,
      maskedHash: txData.maskedHash || '',
      tier: txData.incomeTier || 'Unknown',
      amount: txData.amount,
      scheme: txData.scheme || '',
      region: txData.region || '',
      timestamp: new Date().toISOString()
    };
    austerityLog.approvedUnderAusterity.push(entry);

    const tier = entry.tier;
    if (austerityLog.tierBreakdown[tier]) {
      austerityLog.tierBreakdown[tier].approved++;
      austerityLog.tierBreakdown[tier].approvedAmount += entry.amount;
    }
  }

  /**
   * Record a transaction rejected during austerity mode
   */
  static recordAusterityRejection(txData) {
    const entry = {
      hash: txData.citizenHash,
      maskedHash: txData.maskedHash || '',
      tier: txData.incomeTier || 'Unknown',
      amount: txData.amount,
      scheme: txData.scheme || '',
      region: txData.region || '',
      reason: txData.reason || 'AUSTERITY_BUDGET_EXHAUSTED',
      timestamp: new Date().toISOString()
    };
    austerityLog.rejectedUnderAusterity.push(entry);

    const tier = entry.tier;
    if (austerityLog.tierBreakdown[tier]) {
      austerityLog.tierBreakdown[tier].rejected++;
      austerityLog.tierBreakdown[tier].rejectedAmount += entry.amount;
    }

    console.log(`[Austerity] ❌ Rejected: ${entry.maskedHash} | Tier: ${tier} | ₹${entry.amount} | ${entry.reason}`);
  }

  /**
   * Get full austerity report with Pareto analysis
   */
  static getAusterityReport() {
    const totalApproved = austerityLog.approvedUnderAusterity.length;
    const totalRejected = austerityLog.rejectedUnderAusterity.length;
    const totalApprovedAmount = austerityLog.approvedUnderAusterity.reduce((s, r) => s + r.amount, 0);
    const totalRejectedAmount = austerityLog.rejectedUnderAusterity.reduce((s, r) => s + r.amount, 0);

    // Pareto efficiency: What % of approved budget went to Low income tier?
    const lowApprovedAmt = austerityLog.tierBreakdown.Low?.approvedAmount || 0;
    const paretoEfficiency = totalApprovedAmount > 0
      ? ((lowApprovedAmt / totalApprovedAmount) * 100).toFixed(1)
      : '0.0';

    return {
      active: state.austerity_mode,
      originalBudget: austerityLog.originalBudget,
      reductionAmount: austerityLog.reductionAmount,
      reductionPercent: '20%',
      newCeiling: austerityLog.newCeiling,
      currentBudget: state.budget_remaining,
      timestamp: austerityLog.timestamp,
      summary: {
        totalApproved,
        totalRejected,
        totalApprovedAmount,
        totalRejectedAmount,
        paretoEfficiency: `${paretoEfficiency}%`,
        paretoDescription: `${paretoEfficiency}% of approved funds directed to Low-income tier`
      },
      tierBreakdown: austerityLog.tierBreakdown,
      approvedTransactions: austerityLog.approvedUnderAusterity,
      rejectedTransactions: austerityLog.rejectedUnderAusterity
    };
  }

  static getAusterityStats() {
    return {
      active: state.austerity_mode,
      reductionAmount: state.austerity_reduction,
      timestamp: state.austerity_timestamp
    };
  }

  static getApprovalRate() {
    if (state.total_transactions === 0) return '0.0';
    return ((state.approved_count / state.total_transactions) * 100).toFixed(1);
  }
}

module.exports = SystemState;
