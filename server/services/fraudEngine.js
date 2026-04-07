// ═══════════════════════════════════════════════════════
// CivicShield — Fraud Engine v3.0 (IIT-Grade)
// Module A: SurgeDetector — EWMA + Z-Score + Shannon Entropy
// Module B: CoolingWindowAnalyzer — Finite State Machine
// Module C: AttackCorrelationEngine — Jaccard Similarity
// ═══════════════════════════════════════════════════════

const EventStream = require('./eventStream');
const CryptoService = require('./cryptoService');

// ═══════════════════════════════════════════
// MODULE A: SURGE DETECTOR
// Exponentially Weighted Moving Average (EWMA)
// Z-Score Thresholding (μ + 2σ)
// Shannon Entropy for coordinated attacks
// ═══════════════════════════════════════════

class SurgeDetector {
  constructor() {
    this.WINDOW_MS = 60 * 60 * 1000;       // 60-minute rolling window
    this.SURGE_THRESHOLD = 5;               // >5 in window = surge
    this.LAMBDA = 0.94;                     // EWMA decay factor
    this.Z_THRESHOLD = 2.0;                 // Z-score threshold (μ + 2σ)
    this.ENTROPY_THRESHOLD = 1.0;           // Low entropy = coordinated attack

    // Per-region state tracking
    this.regionBuffers = new Map();         // region → circular buffer of timestamps
    this.regionEWMA = new Map();            // region → { mean, variance, count }
    this.schemeBuffers = new Map();         // scheme → circular buffer

    this.activeAlerts = [];
    this.BUFFER_SIZE = 100;
  }

  /**
   * Process an approved transaction for surge detection
   * @returns {Object|null} surge alert or null
   */
  detect(transaction) {
    const region = transaction.region || 'Unknown';
    const scheme = transaction.scheme || 'Unknown';
    const now = Date.now();

    // Update circular buffers
    this._addToBuffer(this.regionBuffers, region, { ts: now, scheme, amount: transaction.amount, hash: transaction.hash });
    this._addToBuffer(this.schemeBuffers, scheme, { ts: now, region, amount: transaction.amount, hash: transaction.hash });

    const alerts = [];

    // Check regional surge
    const regionAlert = this._checkSurge(this.regionBuffers, region, 'REGION', now);
    if (regionAlert) alerts.push(regionAlert);

    // Check scheme surge
    const schemeAlert = this._checkSurge(this.schemeBuffers, scheme, 'SCHEME', now);
    if (schemeAlert) alerts.push(schemeAlert);

    return alerts.length > 0 ? alerts : null;
  }

  _addToBuffer(bufferMap, key, entry) {
    if (!bufferMap.has(key)) bufferMap.set(key, []);
    const buf = bufferMap.get(key);
    buf.push(entry);
    if (buf.length > this.BUFFER_SIZE) buf.shift(); // Circular eviction
  }

  _checkSurge(bufferMap, key, type, now) {
    const buf = bufferMap.get(key);
    if (!buf) return null;

    const windowStart = now - this.WINDOW_MS;
    const windowEntries = buf.filter(e => e.ts > windowStart);
    const currentRate = windowEntries.length;

    // Update EWMA statistics
    const ewma = this._updateEWMA(key, currentRate);

    // Z-Score calculation: z = (x - μ) / σ
    const zScore = ewma.stddev > 0 ? (currentRate - ewma.mean) / ewma.stddev : 0;

    // Shannon Entropy for scheme distribution in window
    const entropy = type === 'REGION'
      ? this._shannonEntropy(windowEntries.map(e => e.scheme))
      : this._shannonEntropy(windowEntries.map(e => e.region));

    // SURGE condition: either count threshold OR z-score threshold
    if (currentRate > this.SURGE_THRESHOLD || zScore > this.Z_THRESHOLD) {
      const implicated = windowEntries.map(e => e.hash);
      const totalValue = windowEntries.reduce((s, e) => s + (e.amount || 0), 0);

      const alert = {
        type: entropy < this.ENTROPY_THRESHOLD ? 'COORDINATED_SURGE' : 'SURGE_DETECTED',
        subType: type,
        affectedGroup: `${type === 'REGION' ? 'Region' : 'Scheme'} ${key}`,
        Region_Code: type === 'REGION' ? key : windowEntries[0]?.region || '',
        Scheme_Eligibility: type === 'SCHEME' ? key : windowEntries[0]?.scheme || '',
        WindowStart: new Date(windowStart).toISOString(),
        WindowEnd: new Date(now).toISOString(),
        ClaimsInWindow: currentRate,
        TotalDisbursementValueProtected: totalValue,
        FlaggedIdentities: [...new Set(implicated.map(h => CryptoService.maskHash(h)))],
        analytics: {
          zScore: Math.round(zScore * 1000) / 1000,
          ewmaMean: Math.round(ewma.mean * 100) / 100,
          ewmaStddev: Math.round(ewma.stddev * 100) / 100,
          shannonEntropy: Math.round(entropy * 1000) / 1000,
          isCoordinated: entropy < this.ENTROPY_THRESHOLD
        },
        timestamp: new Date().toISOString(),
        details: `${type === 'REGION' ? 'Regional' : 'Scheme-based'} surge on ${key}: ${currentRate} claims in 60min window (Z=${zScore.toFixed(2)}, H=${entropy.toFixed(2)})`
      };

      this.activeAlerts.push(alert);
      return alert;
    }

    return null;
  }

  /**
   * Update EWMA statistics for a group
   * S_t = λ × x_t + (1-λ) × S_{t-1}
   */
  _updateEWMA(key, currentRate) {
    if (!this.regionEWMA.has(key)) {
      this.regionEWMA.set(key, { mean: currentRate, variance: 0, count: 1 });
    }

    const state = this.regionEWMA.get(key);
    const prevMean = state.mean;

    // EWMA update
    state.mean = this.LAMBDA * currentRate + (1 - this.LAMBDA) * state.mean;
    state.variance = this.LAMBDA * ((currentRate - prevMean) ** 2) + (1 - this.LAMBDA) * state.variance;
    state.count++;

    return {
      mean: state.mean,
      variance: state.variance,
      stddev: Math.sqrt(state.variance)
    };
  }

  /**
   * Shannon Entropy: H = -Σ p_i × log2(p_i)
   * Measures diversity in categorical distribution
   * Low entropy (< 1.0) = coordinated single-type attack
   */
  _shannonEntropy(labels) {
    if (labels.length === 0) return 0;

    const freq = {};
    labels.forEach(l => { freq[l] = (freq[l] || 0) + 1; });

    const total = labels.length;
    let entropy = 0;

    Object.values(freq).forEach(count => {
      const p = count / total;
      if (p > 0) entropy -= p * Math.log2(p);
    });

    return entropy;
  }

  getActiveAlerts() {
    return this.activeAlerts;
  }

  getLatestAlert() {
    return this.activeAlerts.length > 0 ? this.activeAlerts[this.activeAlerts.length - 1] : null;
  }
}

// ═══════════════════════════════════════════
// MODULE B: COOLING WINDOW ANALYZER
// 5-State Finite State Machine per CitizenHash
// States: IDLE → CLAIMED → COOLING(30d) → ELIGIBLE → GAMING_DETECTED → FRAUD_HOLD
// ═══════════════════════════════════════════

const FSM_STATES = {
  IDLE: 'IDLE',
  CLAIMED: 'CLAIMED',
  COOLING: 'COOLING',
  ELIGIBLE: 'ELIGIBLE',
  GAMING_DETECTED: 'GAMING_DETECTED',
  FRAUD_HOLD: 'FRAUD_HOLD'
};

class CoolingWindowAnalyzer {
  constructor() {
    this.COOLING_PERIOD_MS = 30 * 24 * 60 * 60 * 1000;   // 30 days
    this.GAMING_THRESHOLD_MS = 2 * 24 * 60 * 60 * 1000;   // 48 hours
    this.MIN_CONSECUTIVE_CYCLES = 2;

    // Per-citizen FSM state
    this.citizenStates = new Map();  // hash → { state, transitions[], claims[], consecutiveGaming }
    this.detectedGamers = [];
  }

  /**
   * Analyze a transaction through the FSM
   * @returns {Object|null} cooling gamer alert or null
   */
  analyze(transaction) {
    const hash = transaction.hash;
    const now = Date.now();

    // Initialize FSM state if new citizen
    if (!this.citizenStates.has(hash)) {
      this.citizenStates.set(hash, {
        state: FSM_STATES.IDLE,
        transitions: [],
        claims: [],
        consecutiveGaming: 0
      });
    }

    const citizen = this.citizenStates.get(hash);
    const previousState = citizen.state;

    // Record this claim
    citizen.claims.push({
      timestamp: now,
      amount: transaction.amount,
      scheme: transaction.scheme,
      region: transaction.region
    });

    // FSM Transition Logic
    if (citizen.claims.length >= 2) {
      const prevClaim = citizen.claims[citizen.claims.length - 2];
      const timeSinceLastClaim = now - prevClaim.timestamp;

      // Check if within cooling window gaming range
      // Gaming = claim comes within 48h after 30-day cooling period expires
      const cooldownExpiry = prevClaim.timestamp + this.COOLING_PERIOD_MS;
      const timeSinceCooldownExpiry = now - cooldownExpiry;

      if (timeSinceCooldownExpiry > 0 && timeSinceCooldownExpiry < this.GAMING_THRESHOLD_MS) {
        // Citizen claimed within 48h of their cooling window resetting
        citizen.consecutiveGaming++;
        citizen.state = FSM_STATES.GAMING_DETECTED;

        citizen.transitions.push({
          from: previousState,
          to: FSM_STATES.GAMING_DETECTED,
          timestamp: new Date(now).toISOString(),
          reason: `Claimed within ${Math.round(timeSinceCooldownExpiry / (60 * 60 * 1000))}h of cooling reset`
        });

        if (citizen.consecutiveGaming >= this.MIN_CONSECUTIVE_CYCLES) {
          // Absorbing state: FRAUD_HOLD
          citizen.state = FSM_STATES.FRAUD_HOLD;
          citizen.transitions.push({
            from: FSM_STATES.GAMING_DETECTED,
            to: FSM_STATES.FRAUD_HOLD,
            timestamp: new Date(now).toISOString(),
            reason: `${citizen.consecutiveGaming} consecutive gaming cycles detected`
          });

          // Set citizen status to FRAUD_HOLD
          try {
            const DataLoader = require('./dataLoader');
            DataLoader.updateCitizen(hash, { Account_Status: 'FRAUD_HOLD' });
          } catch (e) { /* DataLoader may not be ready */ }

          const alert = {
            type: 'COOLING_WINDOW_GAMING',
            affectedGroup: `Citizen ${CryptoService.maskHash(hash)}`,
            Region_Code: transaction.region || '',
            Scheme_Eligibility: transaction.scheme || '',
            FlaggedIdentities: [CryptoService.maskHash(hash)],
            WindowStart: new Date(cooldownExpiry).toISOString(),
            WindowEnd: new Date(now).toISOString(),
            ClaimsInWindow: citizen.claims.length,
            TotalDisbursementValueProtected: citizen.claims.reduce((s, c) => s + (c.amount || 0), 0),
            consecutiveCycles: citizen.consecutiveGaming,
            fsmState: citizen.state,
            stateHistory: citizen.transitions,
            analytics: {
              timeSinceCooldownResetHours: Math.round(timeSinceCooldownExpiry / (60 * 60 * 1000) * 10) / 10,
              totalClaimsForCitizen: citizen.claims.length,
              avgTimeBetweenClaims: Math.round(
                citizen.claims.reduce((s, c, i) => i === 0 ? 0 : s + (c.timestamp - citizen.claims[i - 1].timestamp), 0)
                / Math.max(1, citizen.claims.length - 1) / (24 * 60 * 60 * 1000) * 10
              ) / 10
            },
            timestamp: new Date().toISOString(),
            details: `COOLING_GAMER detected: ${CryptoService.maskHash(hash)} exploiting 30-day reset — ${citizen.consecutiveGaming} consecutive cycles`
          };

          this.detectedGamers.push(alert);
          return alert;
        }
      } else {
        // Normal claim — reset or advance FSM
        if (timeSinceLastClaim > this.COOLING_PERIOD_MS) {
          citizen.state = FSM_STATES.CLAIMED;
          citizen.consecutiveGaming = 0; // Reset consecutive count
        } else {
          citizen.state = FSM_STATES.COOLING;
        }

        citizen.transitions.push({
          from: previousState,
          to: citizen.state,
          timestamp: new Date(now).toISOString(),
          reason: `Normal transition (${Math.round(timeSinceLastClaim / (24 * 60 * 60 * 1000))}d since last claim)`
        });
      }
    } else {
      // First claim for this citizen
      citizen.state = FSM_STATES.CLAIMED;
      citizen.transitions.push({
        from: FSM_STATES.IDLE,
        to: FSM_STATES.CLAIMED,
        timestamp: new Date(now).toISOString(),
        reason: 'First claim submission'
      });
    }

    return null;
  }

  getDetectedGamers() {
    return this.detectedGamers;
  }

  getCitizenState(hash) {
    return this.citizenStates.get(hash) || null;
  }

  getFSMStats() {
    const counts = {};
    Object.values(FSM_STATES).forEach(s => { counts[s] = 0; });
    for (const [, cit] of this.citizenStates) {
      counts[cit.state] = (counts[cit.state] || 0) + 1;
    }
    return { stateDistribution: counts, totalTracked: this.citizenStates.size };
  }
}

// ═══════════════════════════════════════════
// MODULE C: ATTACK CORRELATION ENGINE
// Jaccard Similarity for cross-correlating alerts
// Composite threat scoring
// ═══════════════════════════════════════════

class AttackCorrelationEngine {
  constructor() {
    this.correlationLog = [];
  }

  /**
   * Cross-correlate surge alerts with cooling gamers
   * Using Jaccard Similarity: J(A,B) = |A ∩ B| / |A ∪ B|
   */
  correlate(surgeAlerts, gamingAlerts) {
    if (surgeAlerts.length === 0 || gamingAlerts.length === 0) {
      return { isCorrelated: false, jaccardIndex: 0, threatScore: 0 };
    }

    // Extract identity sets
    const surgeIdentities = new Set();
    surgeAlerts.forEach(a => {
      (a.FlaggedIdentities || []).forEach(id => surgeIdentities.add(id));
    });

    const gamingIdentities = new Set();
    gamingAlerts.forEach(a => {
      (a.FlaggedIdentities || []).forEach(id => gamingIdentities.add(id));
    });

    // Jaccard Similarity
    const intersection = new Set([...surgeIdentities].filter(x => gamingIdentities.has(x)));
    const union = new Set([...surgeIdentities, ...gamingIdentities]);
    const jaccardIndex = union.size > 0 ? intersection.size / union.size : 0;

    // Composite threat score
    const surgeScore = Math.min(100, surgeAlerts.length * 20);
    const gamingScore = Math.min(100, gamingAlerts.length * 30);
    const correlationBonus = jaccardIndex > 0.3 ? 30 : jaccardIndex > 0.1 ? 15 : 0;

    const threatScore = Math.round(
      surgeScore * 0.4 + gamingScore * 0.3 + correlationBonus * 0.3
    );

    const result = {
      isCorrelated: jaccardIndex > 0.3,
      jaccardIndex: Math.round(jaccardIndex * 1000) / 1000,
      surgeIdentityCount: surgeIdentities.size,
      gamingIdentityCount: gamingIdentities.size,
      overlapCount: intersection.size,
      overlappingIdentities: Array.from(intersection),
      threatScore,
      threatLevel: threatScore >= 80 ? 'CRITICAL' : threatScore >= 60 ? 'HIGH' : threatScore >= 30 ? 'MEDIUM' : 'LOW',
      classification: jaccardIndex > 0.3 ? 'COORDINATED_RING' : 'ISOLATED_INCIDENTS',
      factors: {
        surgeScore,
        gamingScore,
        correlationBonus,
        formula: 'threat = surge×0.4 + gaming×0.3 + correlation×0.3'
      },
      timestamp: new Date().toISOString()
    };

    this.correlationLog.push(result);
    return result;
  }

  getCorrelationHistory() {
    return this.correlationLog;
  }
}

// ═══════════════════════════════════════════
// MAIN FRAUD ENGINE — Orchestrator
// ═══════════════════════════════════════════

class FraudEngine {
  constructor() {
    this.surgeDetector = new SurgeDetector();
    this.coolingAnalyzer = new CoolingWindowAnalyzer();
    this.correlationEngine = new AttackCorrelationEngine();
    this.attackTimeline = [];
  }

  /**
   * Primary entry point — run all detection modules on an approved transaction
   */
  analyze(approvedTransaction) {
    const record = {
      hash: approvedTransaction.citizenHash,
      region: approvedTransaction.citizenData?.Region_Code || 'Unknown',
      scheme: approvedTransaction.scheme,
      amount: approvedTransaction.amount,
      timestamp: Date.now()
    };

    // Module A: Surge Detection
    const surgeAlerts = this.surgeDetector.detect(record);
    if (surgeAlerts) {
      surgeAlerts.forEach(alert => {
        this.attackTimeline.unshift(alert);
        EventStream.broadcast('FRAUD_ANOMALY', alert);

        if (alert.type === 'COORDINATED_SURGE') {
          EventStream.broadcast('SURGE_ALERT', {
            region: alert.affectedGroup,
            zScore: alert.analytics.zScore,
            entropy: alert.analytics.shannonEntropy,
            message: `⚠️ COORDINATED SURGE on ${alert.affectedGroup} (Z=${alert.analytics.zScore.toFixed(2)}, Entropy=${alert.analytics.shannonEntropy.toFixed(2)})`
          });
        } else {
          EventStream.broadcast('SURGE_ALERT', {
            region: alert.affectedGroup,
            zScore: alert.analytics.zScore,
            message: `⚠️ SURGE DETECTED on ${alert.affectedGroup} — ${alert.ClaimsInWindow} claims in 60min window`
          });
        }
      });
    }

    // Module B: Cooling Window Analysis
    const coolingAlert = this.coolingAnalyzer.analyze(record);
    if (coolingAlert) {
      this.attackTimeline.unshift(coolingAlert);
      EventStream.broadcast('FRAUD_ANOMALY', coolingAlert);
      EventStream.broadcast('COOLING_GAMER_DETECTED', {
        citizenHash: CryptoService.maskHash(record.hash),
        message: `🎮 COOLING GAMER: ${CryptoService.maskHash(record.hash)} exploiting 30-day reset`
      });

      console.log(`[FraudEngine] 🎮 COOLING_GAMER: ${CryptoService.maskHash(record.hash)} — status set to FRAUD_HOLD`);
    }

    // Module C: Correlation Analysis (run periodically, not on every txn)
    if (this.attackTimeline.length % 5 === 0 && this.attackTimeline.length > 0) {
      const correlation = this.correlationEngine.correlate(
        this.surgeDetector.getActiveAlerts(),
        this.coolingAnalyzer.getDetectedGamers()
      );

      if (correlation.isCorrelated) {
        const correlationAlert = {
          type: 'COORDINATED_RING',
          affectedGroup: `Cross-module correlation (J=${correlation.jaccardIndex})`,
          FlaggedIdentities: correlation.overlappingIdentities,
          ClaimsInWindow: correlation.overlapCount,
          TotalDisbursementValueProtected: 0,
          analytics: correlation,
          timestamp: new Date().toISOString(),
          details: `COORDINATED attack pattern: ${correlation.overlapCount} identities appear in both surge and cooling alerts (Jaccard=${correlation.jaccardIndex})`
        };

        this.attackTimeline.unshift(correlationAlert);
        EventStream.broadcast('COORDINATED_ATTACK', correlationAlert);
      }
    }
  }

  /**
   * Get full attack timeline for admin panel
   */
  getTimeline() {
    return this.attackTimeline;
  }

  /**
   * Get structured export with all required fields
   */
  getTimelineExport() {
    return this.attackTimeline.map(entry => ({
      Region_Code: entry.Region_Code || '',
      Scheme_Eligibility: entry.Scheme_Eligibility || '',
      FlaggedIdentities: entry.FlaggedIdentities || [],
      WindowStart: entry.WindowStart || '',
      WindowEnd: entry.WindowEnd || '',
      ClaimsInWindow: entry.ClaimsInWindow || 0,
      TotalDisbursementValueProtected: entry.TotalDisbursementValueProtected || 0,
      type: entry.type,
      affectedGroup: entry.affectedGroup,
      analytics: entry.analytics || {},
      timestamp: entry.timestamp,
      details: entry.details
    }));
  }

  /**
   * Get current surge status for live banner
   */
  getSurgeStatus() {
    const latest = this.surgeDetector.getLatestAlert();
    return {
      isActive: latest && (Date.now() - new Date(latest.timestamp).getTime()) < 5 * 60 * 1000,
      latestAlert: latest,
      totalSurges: this.surgeDetector.getActiveAlerts().length,
      totalGamers: this.coolingAnalyzer.getDetectedGamers().length,
      fsmStats: this.coolingAnalyzer.getFSMStats(),
      correlationHistory: this.correlationEngine.getCorrelationHistory()
    };
  }
}

module.exports = new FraudEngine();
