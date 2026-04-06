// ═══════════════════════════════════════════════════════
// CivicShield — Three-Gate Sequential Verification Protocol
// Every transaction must pass ALL three gates IN ORDER.
// UI cannot override, skip, or allow partial processing.
// ═══════════════════════════════════════════════════════

const config = require('../config');
const CryptoService = require('./cryptoService');
const DataLoader = require('./dataLoader');
const EventStream = require('./eventStream');

// ── Active Processing Queue (for duplicate detection) ──
const activeQueue = new Set();

// ── Replay Detection Cache ──
// Key: `${citizenHash}|${scheme}|${amount}`, Value: timestamp
const replayCache = new Map();

// ── Transaction Log (approved + rejected for stats) ──
let transactionLog = [];

class ValidationPipeline {
  /**
   * Run the full 3-gate sequential validation pipeline
   * Returns detailed result with gate status
   */
  static validate(citizenId, scheme, amount) {
    const citizenHash = CryptoService.generateCitizenHash(String(citizenId).trim());
    const timestamp = new Date().toISOString();

    const result = {
      citizenHash,
      timestamp,
      scheme,
      amount,
      gates: {
        gate1: { name: 'ELIGIBILITY', passed: false, reason: null, failedField: null },
        gate2: { name: 'BUDGET', passed: false, reason: null },
        gate3: { name: 'FREQUENCY', passed: false, reason: null, details: null }
      },
      approved: false,
      gatesPassed: [],
      citizenData: null,
      rejectionGate: null,
      rejectionReason: null,
      logEntry: null
    };

    // ══════════════════════════════════════════
    // PRE-GATE: DUPLICATE CONCURRENT CLAIM CHECK
    // ══════════════════════════════════════════
    if (activeQueue.has(citizenHash)) {
      result.rejectionReason = 'DUPLICATE_REJECTED';
      result.logEntry = `REJECTED | CitizenHash: ${CryptoService.maskHash(citizenHash)} | Pre-Gate | Reason: Duplicate concurrent claim | Timestamp: ${timestamp}`;
      EventStream.broadcast('DUPLICATE_REJECTED', {
        citizenHash: CryptoService.maskHash(citizenHash),
        message: 'Duplicate concurrent claim detected and rejected'
      });
      this._recordTransaction(result);
      return result;
    }

    // Add to active queue
    activeQueue.add(citizenHash);

    // ══════════════════════════════════════════
    // PRE-GATE: REPLAY ATTACK DETECTION
    // ══════════════════════════════════════════
    const replayKey = `${citizenHash}|${scheme}|${amount}`;
    const lastAttempt = replayCache.get(replayKey);
    const now = Date.now();

    if (lastAttempt && (now - lastAttempt) < config.REPLAY_WINDOW_MS) {
      result.rejectionReason = 'REPLAY_DETECTED';
      result.logEntry = `REJECTED | CitizenHash: ${CryptoService.maskHash(citizenHash)} | Pre-Gate | Reason: Replay attack — identical claim within 10-minute window | Timestamp: ${timestamp}`;
      EventStream.broadcast('REPLAY_DETECTED', {
        citizenHash: CryptoService.maskHash(citizenHash),
        timeSinceLastMs: now - lastAttempt,
        message: 'Replay attack detected — identical claim within 10-minute window'
      });
      activeQueue.delete(citizenHash);
      // Update replay cache even for rejected attempts
      replayCache.set(replayKey, now);
      this._recordTransaction(result);
      return result;
    }

    // Record this attempt in replay cache
    replayCache.set(replayKey, now);

    // ══════════════════════════════════════════
    // GATE 1 — ELIGIBILITY VERIFICATION
    // 6 conditions must ALL be true simultaneously
    // ══════════════════════════════════════════
    EventStream.broadcast('GATE1_START', { citizenHash: CryptoService.maskHash(citizenHash) });

    const citizen = DataLoader.findById(citizenId);

    // Condition 1: Citizen_ID maps to existing record
    if (!citizen) {
      result.gates.gate1.reason = 'CITIZEN_NOT_FOUND';
      result.gates.gate1.failedField = 'Citizen_ID';
      result.rejectionGate = 1;
      result.rejectionReason = 'CITIZEN_NOT_FOUND';
      result.logEntry = `REJECTED | CitizenHash: ${CryptoService.maskHash(citizenHash)} | Gate: 1 | Reason: Citizen_ID not found in registry | Timestamp: ${timestamp}`;
      EventStream.broadcast('GATE1_FAILED', { reason: 'CITIZEN_NOT_FOUND', citizenHash: CryptoService.maskHash(citizenHash) });
      activeQueue.delete(citizenHash);
      this._recordTransaction(result);
      return result;
    }

    result.citizenData = {
      Region_Code: citizen.Region_Code,
      Income_Tier: citizen.Income_Tier,
      Claim_Count: citizen.Claim_Count,
      Scheme_Eligibility: citizen.Scheme_Eligibility,
      Scheme_Amount: citizen.Scheme_Amount
    };

    // Condition 2: Account_Status is exactly Active
    if (citizen.Account_Status !== 'Active') {
      result.gates.gate1.reason = `Account_Status = ${citizen.Account_Status}`;
      result.gates.gate1.failedField = 'Account_Status';
      result.rejectionGate = 1;
      result.rejectionReason = `Account_Status = ${citizen.Account_Status}`;
      result.logEntry = `REJECTED | CitizenHash: ${CryptoService.maskHash(citizenHash)} | Gate: 1 | Reason: Account_Status = ${citizen.Account_Status} | Timestamp: ${timestamp}`;
      EventStream.broadcast('GATE1_FAILED', { reason: `Account_Status = ${citizen.Account_Status}` });
      activeQueue.delete(citizenHash);
      this._recordTransaction(result);
      return result;
    }

    // Condition 3: Aadhaar_Linked is TRUE
    if (citizen.Aadhaar_Linked !== true) {
      result.gates.gate1.reason = 'Aadhaar_Linked = FALSE';
      result.gates.gate1.failedField = 'Aadhaar_Linked';
      result.rejectionGate = 1;
      result.rejectionReason = 'Aadhaar_Linked = FALSE';
      result.logEntry = `REJECTED | CitizenHash: ${CryptoService.maskHash(citizenHash)} | Gate: 1 | Reason: Aadhaar_Linked = FALSE | Timestamp: ${timestamp}`;
      EventStream.broadcast('GATE1_FAILED', { reason: 'Aadhaar_Linked = FALSE' });
      activeQueue.delete(citizenHash);
      this._recordTransaction(result);
      return result;
    }

    // Condition 4: Requested scheme matches Scheme_Eligibility exactly
    if (scheme !== citizen.Scheme_Eligibility) {
      result.gates.gate1.reason = `Scheme_Eligibility mismatch: expected "${citizen.Scheme_Eligibility}", got "${scheme}"`;
      result.gates.gate1.failedField = 'Scheme_Eligibility';
      result.rejectionGate = 1;
      result.rejectionReason = `Scheme mismatch: expected ${citizen.Scheme_Eligibility}`;
      result.logEntry = `REJECTED | CitizenHash: ${CryptoService.maskHash(citizenHash)} | Gate: 1 | Reason: Scheme_Eligibility mismatch (expected "${citizen.Scheme_Eligibility}", got "${scheme}") | Timestamp: ${timestamp}`;
      EventStream.broadcast('GATE1_FAILED', { reason: `Scheme mismatch: "${scheme}" ≠ "${citizen.Scheme_Eligibility}"` });
      activeQueue.delete(citizenHash);
      this._recordTransaction(result);
      return result;
    }

    // Condition 5: Requested amount matches Scheme_Amount exactly — no rounding
    if (Number(amount) !== Number(citizen.Scheme_Amount)) {
      result.gates.gate1.reason = `Scheme_Amount mismatch: expected ${citizen.Scheme_Amount}, got ${amount}`;
      result.gates.gate1.failedField = 'Scheme_Amount';
      result.rejectionGate = 1;
      result.rejectionReason = `Amount mismatch: expected ₹${citizen.Scheme_Amount}`;
      result.logEntry = `REJECTED | CitizenHash: ${CryptoService.maskHash(citizenHash)} | Gate: 1 | Reason: Scheme_Amount mismatch (expected ${citizen.Scheme_Amount}, got ${amount}) | Timestamp: ${timestamp}`;
      EventStream.broadcast('GATE1_FAILED', { reason: `Amount mismatch: ₹${amount} ≠ ₹${citizen.Scheme_Amount}` });
      activeQueue.delete(citizenHash);
      this._recordTransaction(result);
      return result;
    }

    // Condition 6: Claim_Count <= 3
    if (citizen.Claim_Count > config.MAX_CLAIM_COUNT) {
      result.gates.gate1.reason = `Claim_Count = ${citizen.Claim_Count} (max ${config.MAX_CLAIM_COUNT})`;
      result.gates.gate1.failedField = 'Claim_Count';
      result.rejectionGate = 1;
      result.rejectionReason = `Claim_Count exceeded: ${citizen.Claim_Count} > ${config.MAX_CLAIM_COUNT}`;
      result.logEntry = `REJECTED | CitizenHash: ${CryptoService.maskHash(citizenHash)} | Gate: 1 | Reason: Claim_Count = ${citizen.Claim_Count} (max ${config.MAX_CLAIM_COUNT}) | Timestamp: ${timestamp}`;
      EventStream.broadcast('GATE1_FAILED', { reason: `Claim_Count ${citizen.Claim_Count} exceeds max ${config.MAX_CLAIM_COUNT}` });
      activeQueue.delete(citizenHash);
      this._recordTransaction(result);
      return result;
    }

    // ALL 6 CONDITIONS PASSED
    result.gates.gate1.passed = true;
    result.gatesPassed.push('Gate1');
    EventStream.broadcast('GATE1_PASSED', {
      citizenHash: CryptoService.maskHash(citizenHash),
      message: 'All 6 eligibility conditions verified'
    });

    // ══════════════════════════════════════════
    // GATE 2 — BUDGET INTEGRITY CHECK
    // Budget decremented ONLY after full 3-gate approval
    // ══════════════════════════════════════════
    EventStream.broadcast('GATE2_START', { citizenHash: CryptoService.maskHash(citizenHash) });

    const SystemState = require('./systemState');
    const budgetRemaining = SystemState.getBudget();

    if (budgetRemaining - Number(amount) < 0) {
      result.gates.gate2.reason = 'BUDGET_INSUFFICIENT';
      result.rejectionGate = 2;
      result.rejectionReason = `BUDGET_INSUFFICIENT: ₹${budgetRemaining} remaining, ₹${amount} requested`;
      result.logEntry = `REJECTED | CitizenHash: ${CryptoService.maskHash(citizenHash)} | Gate: 2 | Reason: BUDGET_INSUFFICIENT (₹${budgetRemaining} remaining, ₹${amount} requested) | Timestamp: ${timestamp}`;
      EventStream.broadcast('GATE2_FAILED', {
        reason: 'BUDGET_INSUFFICIENT',
        remaining: budgetRemaining,
        requested: amount
      });
      activeQueue.delete(citizenHash);
      this._recordTransaction(result);
      return result;
    }

    result.gates.gate2.passed = true;
    result.gatesPassed.push('Gate2');
    EventStream.broadcast('GATE2_PASSED', {
      citizenHash: CryptoService.maskHash(citizenHash),
      budgetAfter: budgetRemaining - Number(amount)
    });

    // ══════════════════════════════════════════
    // GATE 3 — FREQUENCY ABUSE DETECTION
    // No disbursement within 30 days of Last_Claim_Date
    // ══════════════════════════════════════════
    EventStream.broadcast('GATE3_START', { citizenHash: CryptoService.maskHash(citizenHash) });

    if (citizen.Last_Claim_Date) {
      const lastClaim = new Date(citizen.Last_Claim_Date);
      const today = new Date();
      const diffMs = today - lastClaim;
      const daysSince = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (daysSince < config.FREQUENCY_COOLDOWN_DAYS) {
        result.gates.gate3.reason = 'FREQUENCY_VIOLATION';
        result.gates.gate3.details = {
          lastClaimDate: citizen.Last_Claim_Date,
          daysSince,
          requiredDays: config.FREQUENCY_COOLDOWN_DAYS,
          gap: `${daysSince} days (minimum ${config.FREQUENCY_COOLDOWN_DAYS})`
        };
        result.rejectionGate = 3;
        result.rejectionReason = `FREQUENCY_VIOLATION: ${daysSince} days since last claim (min ${config.FREQUENCY_COOLDOWN_DAYS})`;
        result.logEntry = `REJECTED | CitizenHash: ${CryptoService.maskHash(citizenHash)} | Gate: 3 | Reason: FREQUENCY_VIOLATION (Last_Claim_Date: ${citizen.Last_Claim_Date}, gap: ${daysSince} days, required: ${config.FREQUENCY_COOLDOWN_DAYS}) | Timestamp: ${timestamp}`;
        EventStream.broadcast('GATE3_FAILED', {
          reason: 'FREQUENCY_VIOLATION',
          daysSince,
          required: config.FREQUENCY_COOLDOWN_DAYS,
          lastClaimDate: citizen.Last_Claim_Date
        });
        activeQueue.delete(citizenHash);
        this._recordTransaction(result);
        return result;
      }
    }

    result.gates.gate3.passed = true;
    result.gatesPassed.push('Gate3');
    EventStream.broadcast('GATE3_PASSED', {
      citizenHash: CryptoService.maskHash(citizenHash),
      message: 'No recent claims within cooldown period'
    });

    // ══════════════════════════════════════════
    // ALL 3 GATES PASSED — TRANSACTION APPROVED
    // ══════════════════════════════════════════
    result.approved = true;
    result.logEntry = `APPROVED | CitizenHash: ${CryptoService.maskHash(citizenHash)} | Gates: [Gate1, Gate2, Gate3] | Scheme: ${scheme} | Amount: ₹${amount} | Timestamp: ${timestamp}`;

    // Update citizen: Claim_Count += 1, Last_Claim_Date = today
    DataLoader.updateCitizen(citizenHash, {
      Claim_Count: citizen.Claim_Count + 1,
      Last_Claim_Date: new Date().toISOString()
    });

    // Decrement budget (ONLY after full 3-gate approval)
    const newBudget = budgetRemaining - Number(amount);
    SystemState.updateBudget(newBudget);
    SystemState.incrementApproved();

    // Check if budget is exactly ₹0 → auto-lock
    if (newBudget === 0) {
      SystemState.freeze('BUDGET_EXHAUSTED');
      EventStream.broadcast('SYSTEM_FROZEN', {
        reason: 'BUDGET_EXHAUSTED',
        message: 'System locked — budget fully depleted. No further transactions processed.'
      });
    }

    EventStream.broadcast('CLAIM_APPROVED', {
      citizenHash: CryptoService.maskHash(citizenHash),
      scheme,
      amount,
      budgetRemaining: newBudget
    });

    // Remove from active queue
    activeQueue.delete(citizenHash);
    this._recordTransaction(result);

    return result;
  }

  /**
   * Record transaction in log for stats
   */
  static _recordTransaction(result) {
    transactionLog.push({
      citizenHash: result.citizenHash,
      scheme: result.scheme,
      amount: result.amount,
      approved: result.approved,
      rejectionReason: result.rejectionReason,
      rejectionGate: result.rejectionGate,
      gatesPassed: result.gatesPassed,
      timestamp: result.timestamp,
      citizenData: result.citizenData
    });

    // Log to console per spec format
    if (result.logEntry) {
      console.log(`[Pipeline] ${result.logEntry}`);
    }
  }

  /**
   * Get transaction log
   */
  static getTransactionLog() {
    return transactionLog;
  }

  /**
   * Get last N transactions
   */
  static getLastTransactions(n = 10) {
    return transactionLog.slice(-n).reverse();
  }

  /**
   * Fraud Pattern Report — auto-generated every 10 transactions
   */
  static generateFraudReport() {
    if (transactionLog.length === 0) return null;

    const rejected = transactionLog.filter(t => !t.approved);
    const approved = transactionLog.filter(t => t.approved);

    // Most common rejection reason
    const reasonCounts = {};
    rejected.forEach(t => {
      const reason = t.rejectionReason || 'UNKNOWN';
      reasonCounts[reason] = (reasonCounts[reason] || 0) + 1;
    });
    const topReason = Object.entries(reasonCounts).sort((a, b) => b[1] - a[1])[0];

    // Citizens with highest Claim_Count
    const claimCounts = {};
    transactionLog.forEach(t => {
      const hash = CryptoService.maskHash(t.citizenHash);
      claimCounts[hash] = (claimCounts[hash] || 0) + 1;
    });
    const topClaimers = Object.entries(claimCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    // Budget burn rate by Region_Code
    const regionBurn = {};
    approved.forEach(t => {
      const region = t.citizenData?.Region_Code || 'UNKNOWN';
      regionBurn[region] = (regionBurn[region] || 0) + t.amount;
    });

    return {
      totalTransactions: transactionLog.length,
      approved: approved.length,
      rejected: rejected.length,
      approvalRate: ((approved.length / transactionLog.length) * 100).toFixed(1),
      mostCommonRejection: topReason ? { reason: topReason[0], count: topReason[1] } : null,
      highestClaimCitizens: topClaimers.map(([hash, count]) => ({ citizenHash: hash, attempts: count })),
      budgetBurnByRegion: regionBurn,
      generatedAt: new Date().toISOString()
    };
  }

  /**
   * Reset pipeline state (for system reset)
   */
  static reset() {
    activeQueue.clear();
    replayCache.clear();
    transactionLog = [];
  }
}

module.exports = ValidationPipeline;
