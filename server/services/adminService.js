const fs = require('fs');
const path = require('path');
const CryptoService = require('./cryptoService');

const CITIZENS_PATH = path.join(__dirname, '..', 'data', 'citizens.json');
const STATE_PATH = path.join(__dirname, '..', 'data', 'system-state.json');
const LEDGER_PATH = path.join(__dirname, '..', 'data', 'ledger.json');
const EVENTS_PATH = path.join(__dirname, '..', 'data', 'events.json');

const FraudEngine = require('./fraudEngine');

// Store initial data for reset
let initialCitizens = null;
let initialState = null;

class AdminService {
  static init() {
    try {
      initialCitizens = fs.readFileSync(CITIZENS_PATH, 'utf-8');
      initialState = fs.readFileSync(STATE_PATH, 'utf-8');
    } catch (e) {
      console.error('Failed to store initial data:', e.message);
    }
  }

  /**
   * Get system status
   */
  static getStatus() {
    const state = JSON.parse(fs.readFileSync(STATE_PATH, 'utf-8'));
    const ledger = JSON.parse(fs.readFileSync(LEDGER_PATH, 'utf-8'));

    return {
      status: state.status,
      budget_remaining: state.budget_remaining,
      budget_formatted: `₹${state.budget_remaining.toLocaleString('en-IN')}`,
      total_transactions: state.total_transactions,
      approved_count: state.approved_count,
      rejected_count: state.rejected_count,
      approval_rate: state.total_transactions > 0
        ? ((state.approved_count / state.total_transactions) * 100).toFixed(1)
        : '0',
      frozen_reason: state.frozen_reason,
      fraud_stats: state.fraud_stats,
      region_fraud: state.region_fraud,
      last_10_transactions: ledger.slice(-10).reverse().map(t => ({
        TransactionID: t.TransactionID,
        Timestamp: t.Timestamp,
        CitizenHash: CryptoService.maskHash(t.CitizenHash),
        Scheme: t.Scheme,
        Amount: t.Amount,
        Status: t.Status
      }))
    };
  }

  /**
   * Emergency pause
   */
  static pause() {
    const state = JSON.parse(fs.readFileSync(STATE_PATH, 'utf-8'));
    state.status = 'PAUSED';
    state.frozen_reason = 'ADMIN_PAUSE';
    fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));
    return { status: 'PAUSED', message: 'System paused by administrator' };
  }

  /**
   * Resume system
   */
  static resume() {
    const state = JSON.parse(fs.readFileSync(STATE_PATH, 'utf-8'));
    if (state.status === 'FROZEN' && state.frozen_reason === 'LEDGER_TAMPERED') {
      return { error: 'Cannot resume: ledger has been tampered. Reset required.' };
    }
    state.status = 'ACTIVE';
    state.frozen_reason = null;
    fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));
    return { status: 'ACTIVE', message: 'System resumed successfully' };
  }

  /**
   * Full system reset for demo
   */
  static reset() {
    // 🛡️ Hard Reset: Restore from disk or original defaults
    const initialPath = path.join(__dirname, '..', 'data', 'citizens.initial.json');
    if (fs.existsSync(initialPath)) {
      fs.writeFileSync(CITIZENS_PATH, fs.readFileSync(initialPath, 'utf-8'));
    } else if (initialCitizens) {
      fs.writeFileSync(CITIZENS_PATH, initialCitizens);
    } else {
      const citizens = JSON.parse(fs.readFileSync(CITIZENS_PATH, 'utf-8'));
      const cleanCitizens = citizens.map(c => ({
        ...c,
        Claim_Count: 0,
        Last_Claim_Date: null,
        Trust_Score: 90,
        Trust_History: []
      }));
      fs.writeFileSync(CITIZENS_PATH, JSON.stringify(cleanCitizens, null, 2));
    }

    const state = JSON.parse(fs.readFileSync(STATE_PATH, 'utf-8'));
    state.status = 'ACTIVE';
    state.budget_remaining = 1000000; // ₹10,00,000
    state.total_transactions = 0;
    state.approved_count = 0;
    state.rejected_count = 0;
    state.frozen_reason = null;
    fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));

    fs.writeFileSync(LEDGER_PATH, '[]');
    fs.writeFileSync(EVENTS_PATH, '[]');
    
    if (typeof FraudEngine.reset === 'function') {
      FraudEngine.reset();
    }

    return { status: 'ACTIVE', message: 'System fully reset for demo' };
  }

  /**
   * Get citizen registry (hashed, no raw IDs)
   */
  static getCitizens() {
    const citizens = JSON.parse(fs.readFileSync(CITIZENS_PATH, 'utf-8'));
    return citizens.map(c => ({
      CitizenHash: CryptoService.maskHash(CryptoService.generateCitizenHash(c.Citizen_ID)),
      FullHash: CryptoService.generateCitizenHash(c.Citizen_ID),
      Account_Status: c.Account_Status,
      Aadhaar_Linked: c.Aadhaar_Linked,
      Scheme: c.Scheme,
      Amount: c.Amount,
      Region_Code: c.Region_Code,
      Income_Tier: c.Income_Tier,
      Claim_Count: c.Claim_Count,
      Last_Claim_Date: c.Last_Claim_Date,
      Trust_Score: c.Trust_Score
    }));
  }
}

module.exports = AdminService;
