// ═══════════════════════════════════════════════════════
// CivicShield Configuration — Tamper-Proof Constants
// ═══════════════════════════════════════════════════════

module.exports = {
  // SHA-256 Salt — system-defined constant
  SALT: 'CIVICSHIELD_NATIONAL_SALT_2026_SECURE',

  // Budget — fixed at startup, cannot be modified via UI/API
  INITIAL_BUDGET: 1000000, // ₹10,00,000

  // Gate 1 — Eligibility
  MAX_CLAIM_COUNT: 3, // Claim_Count must be <= 3

  // Gate 3 — Frequency
  FREQUENCY_COOLDOWN_DAYS: 30, // No disbursement within 30 days

  // Replay Detection
  REPLAY_WINDOW_MS: 10 * 60 * 1000, // 10 minutes

  // Ledger
  GENESIS_HASH: '0000000000000000',

  // Server
  PORT: 5000,

  // Dataset
  DATASET_FILENAME: 'CivicShield_Dataset.xlsx'
};
