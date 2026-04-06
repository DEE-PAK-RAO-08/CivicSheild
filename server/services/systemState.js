// ═══════════════════════════════════════════════════════
// CivicShield — System State Manager
// Manages budget, status, and freeze conditions
// ═══════════════════════════════════════════════════════

const config = require('../config');
const EventStream = require('./eventStream');

let state = {
  status: 'ACTIVE',  // ACTIVE | PAUSED | FROZEN | BUDGET_EXHAUSTED
  budget_remaining: config.INITIAL_BUDGET,
  total_transactions: 0,
  approved_count: 0,
  rejected_count: 0,
  frozen_reason: null, // LEDGER_TAMPERED | BUDGET_EXHAUSTED | ADMIN_PAUSED
  freeze_timestamp: null,
  startup_time: new Date().toISOString()
};

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

  /**
   * Freeze the system — blocks all incoming transactions
   * @param {string} reason - LEDGER_TAMPERED | BUDGET_EXHAUSTED | ADMIN_PAUSED
   */
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

  /**
   * Emergency Pause — admin action
   */
  static pause() {
    if (state.status === 'FROZEN' || state.status === 'BUDGET_EXHAUSTED') {
      return { error: `Cannot pause: system is ${state.status}` };
    }
    this.freeze('ADMIN_PAUSED');
    return { status: 'PAUSED', message: 'System paused by administrator', timestamp: state.freeze_timestamp };
  }

  /**
   * Resume — only available from PAUSED state
   */
  static resume() {
    if (state.status === 'FROZEN') {
      return { error: 'Cannot resume: ledger has been tampered. System restart required.' };
    }
    if (state.status === 'BUDGET_EXHAUSTED') {
      return { error: 'Cannot resume: budget exhausted. System restart required.' };
    }
    if (state.status !== 'PAUSED') {
      return { error: `Cannot resume: system is ${state.status}` };
    }
    state.status = 'ACTIVE';
    state.frozen_reason = null;
    state.freeze_timestamp = null;

    EventStream.broadcast('SYSTEM_RESUMED', {
      message: 'System resumed by administrator',
      timestamp: new Date().toISOString()
    });

    return { status: 'ACTIVE', message: 'System resumed successfully' };
  }

  /**
   * Check if system is accepting transactions
   */
  static isOperational() {
    return state.status === 'ACTIVE';
  }

  /**
   * Full system reset
   */
  static reset() {
    state = {
      status: 'ACTIVE',
      budget_remaining: config.INITIAL_BUDGET,
      total_transactions: 0,
      approved_count: 0,
      rejected_count: 0,
      frozen_reason: null,
      freeze_timestamp: null,
      startup_time: new Date().toISOString()
    };
  }

  /**
   * Get approval rate as percentage
   */
  static getApprovalRate() {
    if (state.total_transactions === 0) return '0.0';
    return ((state.approved_count / state.total_transactions) * 100).toFixed(1);
  }
}

module.exports = SystemState;
