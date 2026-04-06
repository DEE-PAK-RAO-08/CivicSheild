// ═══════════════════════════════════════════════════════
// CivicShield — Immutable Hash-Linked Ledger
// Every approved transaction is hash-chained
// Stored as human-readable JSON file (evaluators will edit it)
// ═══════════════════════════════════════════════════════

const fs = require('fs');
const path = require('path');
const config = require('../config');
const CryptoService = require('./cryptoService');
const EventStream = require('./eventStream');
const SystemState = require('./systemState');

const LEDGER_PATH = path.join(__dirname, '..', 'data', 'ledger.json');

class LedgerService {
  /**
   * Initialize ledger file if it doesn't exist
   */
  static init() {
    if (!fs.existsSync(LEDGER_PATH)) {
      fs.writeFileSync(LEDGER_PATH, '[]', 'utf-8');
    }
    // Set transaction counter based on existing ledger
    const ledger = this.getLedger();
    CryptoService.resetTransactionCounter(ledger.length);
  }

  /**
   * Append a new record to the hash-linked ledger
   * ONLY called for approved transactions (passed all 3 gates)
   * 
   * Each record contains exactly:
   * TransactionID, Timestamp, CitizenHash, Scheme, Amount,
   * Region_Code, Income_Tier, GatesPassed, PreviousHash, CurrentHash
   */
  static appendBlock(transactionData) {
    const ledger = this.getLedger();
    const previousHash = ledger.length > 0
      ? ledger[ledger.length - 1].CurrentHash
      : config.GENESIS_HASH;

    const timestamp = new Date().toISOString();
    const transactionId = CryptoService.generateTransactionId();

    // CurrentHash = SHA256(Timestamp + CitizenHash + Scheme + Amount + PreviousHash)
    const currentHash = CryptoService.computeBlockHash(
      timestamp,
      transactionData.citizenHash,
      transactionData.scheme,
      transactionData.amount,
      previousHash
    );

    const block = {
      TransactionID: transactionId,
      Timestamp: timestamp,
      CitizenHash: transactionData.citizenHash,
      Scheme: transactionData.scheme,
      Amount: transactionData.amount,
      Region_Code: transactionData.regionCode,
      Income_Tier: transactionData.incomeTier,
      GatesPassed: ['Gate1', 'Gate2', 'Gate3'],
      PreviousHash: previousHash,
      CurrentHash: currentHash
    };

    ledger.push(block);

    // Write to human-readable JSON file
    fs.writeFileSync(LEDGER_PATH, JSON.stringify(ledger, null, 2), 'utf-8');

    EventStream.broadcast('LEDGER_BLOCK_ADDED', {
      transactionId: block.TransactionID,
      index: ledger.length - 1,
      currentHash: CryptoService.maskHash(currentHash),
      previousHash: CryptoService.maskHash(previousHash)
    });

    // After EVERY append, run full chain integrity check
    const integrity = this.verifyIntegrity();
    if (!integrity.verified) {
      // System freezes — this should not happen on fresh append
      // but protects against race conditions
      console.log('[Ledger] ⚠️ Integrity check FAILED after append!');
    }

    return block;
  }

  /**
   * Get the full ledger from file
   */
  static getLedger() {
    try {
      const data = fs.readFileSync(LEDGER_PATH, 'utf-8');
      return JSON.parse(data);
    } catch {
      return [];
    }
  }

  /**
   * Get a specific block by index
   */
  static getBlock(index) {
    const ledger = this.getLedger();
    return ledger[index] || null;
  }

  /**
   * Verify ENTIRE chain integrity
   * Recompute every CurrentHash from record 1 to latest
   * and confirm each matches the stored value
   */
  static verifyIntegrity() {
    const ledger = this.getLedger();
    const report = {
      totalBlocks: ledger.length,
      verified: true,
      tamperedBlocks: [],
      verifiedAt: new Date().toISOString()
    };

    if (ledger.length === 0) {
      return report;
    }

    for (let i = 0; i < ledger.length; i++) {
      const block = ledger[i];

      // Check PreviousHash chain link
      const expectedPrevHash = i === 0
        ? config.GENESIS_HASH
        : ledger[i - 1].CurrentHash;

      if (block.PreviousHash !== expectedPrevHash) {
        report.verified = false;
        report.tamperedBlocks.push({
          blockIndex: i,
          transactionId: block.TransactionID,
          type: 'CHAIN_BREAK',
          expectedPreviousHash: expectedPrevHash,
          actualPreviousHash: block.PreviousHash
        });
      }

      // Recompute CurrentHash
      const recomputedHash = CryptoService.computeBlockHash(
        block.Timestamp,
        block.CitizenHash,
        block.Scheme,
        block.Amount,
        block.PreviousHash
      );

      if (recomputedHash !== block.CurrentHash) {
        report.verified = false;
        report.tamperedBlocks.push({
          blockIndex: i,
          transactionId: block.TransactionID,
          type: 'HASH_MISMATCH',
          storedHash: block.CurrentHash,
          recomputedExpectedHash: recomputedHash
        });
      }
    }

    // If tampering detected → FREEZE SYSTEM IMMEDIATELY
    if (!report.verified) {
      SystemState.freeze('LEDGER_TAMPERED');

      EventStream.broadcast('SYSTEM_FROZEN', {
        reason: 'LEDGER_TAMPERED',
        tamperedBlocks: report.tamperedBlocks.length,
        message: '🚨 CRITICAL: Ledger tampering detected! System frozen immediately.'
      });

      EventStream.broadcast('TAMPER_REPORT', report);

      console.log('[Ledger] 🚨 TAMPERING DETECTED — SYSTEM FROZEN');
      report.tamperedBlocks.forEach(tb => {
        console.log(`  Block #${tb.blockIndex}: ${tb.type} — stored: ${CryptoService.maskHash(tb.storedHash || tb.actualPreviousHash)}, expected: ${CryptoService.maskHash(tb.recomputedExpectedHash || tb.expectedPreviousHash)}`);
      });
    }

    return report;
  }

  /**
   * Generate tamper report for download
   */
  static generateTamperReport() {
    const report = this.verifyIntegrity();
    return {
      ...report,
      generatedAt: new Date().toISOString(),
      systemId: 'CIVICSHIELD-NATIONAL-v2',
      systemStatus: SystemState.getStatus(),
      budgetRemaining: SystemState.getBudget(),
      lastValidHash: (() => {
        const ledger = this.getLedger();
        if (ledger.length === 0) return config.GENESIS_HASH;
        // Find last verified block
        for (let i = ledger.length - 1; i >= 0; i--) {
          const expectedPrev = i === 0 ? config.GENESIS_HASH : ledger[i-1].CurrentHash;
          const recomputed = CryptoService.computeBlockHash(
            ledger[i].Timestamp, ledger[i].CitizenHash, ledger[i].Scheme,
            ledger[i].Amount, ledger[i].PreviousHash
          );
          if (ledger[i].PreviousHash === expectedPrev && recomputed === ledger[i].CurrentHash) {
            return ledger[i].CurrentHash;
          }
        }
        return config.GENESIS_HASH;
      })(),
      recommendation: report.verified
        ? 'No action required — ledger integrity verified.'
        : 'IMMEDIATE ACTION REQUIRED: Ledger has been compromised. All disbursements frozen. Initiate forensic audit.'
    };
  }

  /**
   * Reset ledger (for system reset)
   */
  static reset() {
    fs.writeFileSync(LEDGER_PATH, '[]', 'utf-8');
    CryptoService.resetTransactionCounter(0);
  }

  /**
   * Deliberately tamper a block (for attack simulation demo)
   */
  static tamperBlock(blockIndex, newAmount) {
    const ledger = this.getLedger();
    if (blockIndex < 0 || blockIndex >= ledger.length) {
      return { error: 'Block index out of range' };
    }

    const originalAmount = ledger[blockIndex].Amount;
    ledger[blockIndex].Amount = newAmount;
    
    // Write tampered ledger (without recomputing hash — simulates attack)
    fs.writeFileSync(LEDGER_PATH, JSON.stringify(ledger, null, 2), 'utf-8');

    EventStream.broadcast('ATTACK_LEDGER_TAMPER', {
      blockIndex,
      originalAmount,
      tamperedAmount: newAmount,
      message: `Block #${blockIndex} tampered: ₹${originalAmount} → ₹${newAmount}`
    });

    // Immediately verify → will detect and freeze
    const report = this.verifyIntegrity();
    return { tampered: true, originalAmount, newAmount, report };
  }
}

module.exports = LedgerService;
