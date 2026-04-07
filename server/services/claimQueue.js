// ═══════════════════════════════════════════════════════
// CivicShield — Claim Processing Queue v3.0
// Priority Queue with Greedy Knapsack Optimization
// Income-Tier Weighted Ordering for Austerity Mode
// ═══════════════════════════════════════════════════════

const SystemState = require('./systemState');
const EventStream = require('./eventStream');
const CryptoService = require('./cryptoService');

// Income tier priority weights (higher = processed first under austerity)
const TIER_WEIGHTS = { 'Low': 3, 'Mid': 2, 'High': 1 };

class ClaimQueue {
  constructor() {
    this.queue = [];
    this.isProcessing = false;
  }

  /**
   * Add a claim that has passed Gate 1 to the pending queue
   */
  enqueue(claimData, resolve) {
    this.queue.push({ ...claimData, resolve, enqueuedAt: Date.now() });
    console.log(`[ClaimQueue] Claim enqueued. Queue size: ${this.queue.length}`);

    if (!this.isProcessing) {
      this.processNext();
    }
  }

  /**
   * Greedy Knapsack-style priority sort for Austerity Mode
   * Priority = tierWeight × 100 + (1 - normalizedAmount) × 50 + temporalBonus
   * Low income → processed first, smaller amounts prioritized, earlier submissions get bonus
   */
  sortForAusterity() {
    if (this.queue.length === 0) return;

    // Find max amount for normalization
    const maxAmount = Math.max(...this.queue.map(c => c.amount || 0), 1);
    const now = Date.now();

    // Calculate priority score for each item
    this.queue.forEach(claim => {
      const tier = claim.citizenData?.Income_Tier || 'Mid';
      const tierWeight = TIER_WEIGHTS[tier] || 1;
      const normalizedAmount = (claim.amount || 0) / maxAmount;
      const ageBonus = Math.min(20, (now - (claim.enqueuedAt || now)) / 1000); // up to 20 points for waiting

      claim._priority = tierWeight * 100 + (1 - normalizedAmount) * 50 + ageBonus;
    });

    // Sort by priority descending (highest priority first)
    this.queue.sort((a, b) => {
      if (b._priority !== a._priority) return b._priority - a._priority;
      // Tie-break: maintain original submission order
      return (a.enqueuedAt || 0) - (b.enqueuedAt || 0);
    });

    console.log('[ClaimQueue] ✅ Queue reordered by Greedy Knapsack priority (Low→Mid→High)');
    console.log(`[ClaimQueue] Queue order: ${this.queue.map(c => `${c.citizenData?.Income_Tier}(₹${c.amount})`).join(' → ')}`);

    EventStream.broadcast('QUEUE_REORDERED', {
      queueSize: this.queue.length,
      ordering: this.queue.map(c => ({
        tier: c.citizenData?.Income_Tier,
        amount: c.amount,
        priority: Math.round(c._priority)
      })),
      message: 'Queue reordered by income-tier priority for austerity processing'
    });
  }

  /**
   * Process the next claim in the queue
   */
  async processNext() {
    if (this.queue.length === 0) {
      this.isProcessing = false;
      return;
    }

    this.isProcessing = true;
    const claim = this.queue.shift();

    // If austerity mode is active, record tracking data
    if (SystemState.getAusterityStats().active) {
      // Budget check — if budget is ₹0, reject all remaining
      if (SystemState.getBudget() <= 0) {
        // Reject this claim
        SystemState.recordAusterityRejection({
          citizenHash: claim.citizenHash,
          maskedHash: CryptoService.maskHash(claim.citizenHash),
          incomeTier: claim.citizenData?.Income_Tier,
          amount: claim.amount,
          scheme: claim.scheme,
          region: claim.citizenData?.Region_Code,
          reason: 'AUSTERITY_BUDGET_EXHAUSTED'
        });

        // Reject all remaining in queue too
        while (this.queue.length > 0) {
          const remaining = this.queue.shift();
          SystemState.recordAusterityRejection({
            citizenHash: remaining.citizenHash,
            maskedHash: CryptoService.maskHash(remaining.citizenHash),
            incomeTier: remaining.citizenData?.Income_Tier,
            amount: remaining.amount,
            scheme: remaining.scheme,
            region: remaining.citizenData?.Region_Code,
            reason: 'AUSTERITY_BUDGET_EXHAUSTED'
          });
          remaining.resolve(); // Continue pipeline (will fail at Gate 2)
        }

        claim.resolve();
        this.isProcessing = false;
        return;
      }
    }

    claim.resolve();

    // Delay to allow queue building during stress tests
    setTimeout(() => this.processNext(), 200);
  }

  getQueueSize() {
    return this.queue.length;
  }

  getQueue() {
    return this.queue.map(c => ({
      citizenHash: CryptoService.maskHash(c.citizenHash),
      tier: c.citizenData?.Income_Tier,
      amount: c.amount,
      scheme: c.scheme,
      priority: c._priority ? Math.round(c._priority) : null,
      enqueuedAt: c.enqueuedAt
    }));
  }
}

module.exports = new ClaimQueue();
