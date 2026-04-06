// ═══════════════════════════════════════════════════════
// CivicShield Cryptographic Service
// All SHA-256 operations implemented in backend code
// ═══════════════════════════════════════════════════════

const crypto = require('crypto');
const config = require('../config');

class CryptoService {
  /**
   * Generate CitizenHash = SHA256(Citizen_ID + Salt)
   * Raw Citizen_ID NEVER stored or logged after this point
   */
  static generateCitizenHash(citizenId) {
    return crypto
      .createHash('sha256')
      .update(String(citizenId) + config.SALT)
      .digest('hex');
  }

  /**
   * Compute block hash for immutable ledger
   * CurrentHash = SHA256(Timestamp + CitizenHash + Scheme + Amount + PreviousHash)
   */
  static computeBlockHash(timestamp, citizenHash, scheme, amount, previousHash) {
    const data = `${timestamp}${citizenHash}${scheme}${amount}${previousHash}`;
    return crypto
      .createHash('sha256')
      .update(data)
      .digest('hex');
  }

  /**
   * Generate unique transaction ID (auto-incremented integer)
   */
  static _txCounter = 0;
  static generateTransactionId() {
    this._txCounter += 1;
    return this._txCounter;
  }

  static resetTransactionCounter(value = 0) {
    this._txCounter = value;
  }

  /**
   * Display first 8 characters of hash (for admin panel)
   */
  static maskHash(hash) {
    if (!hash || hash.length < 8) return hash;
    return hash.substring(0, 8);
  }
}

module.exports = CryptoService;
