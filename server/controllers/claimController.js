// ═══════════════════════════════════════════════════════
// CivicShield — Claim Controller
// POST /api/claims/process — Process welfare claim through 3-gate pipeline
// ═══════════════════════════════════════════════════════

const ValidationPipeline = require('../services/validationPipeline');
const LedgerService = require('../services/ledgerService');
const SystemState = require('../services/systemState');
const CryptoService = require('../services/cryptoService');
const EventStream = require('../services/eventStream');

class ClaimController {
  /**
   * POST /api/claims/process
   * Process a welfare claim through the 3-gate pipeline
   */
  static async processClaim(req, res) {
    try {
      const { citizenId, scheme, amount } = req.body;

      if (!citizenId || !scheme || amount === undefined || amount === null) {
        return res.status(400).json({
          error: 'INVALID_INPUT',
          message: 'citizenId, scheme, and amount are required'
        });
      }

      EventStream.broadcast('CLAIM_RECEIVED', {
        citizenHash: CryptoService.maskHash(CryptoService.generateCitizenHash(citizenId)),
        scheme,
        amount: Number(amount),
        message: 'New claim request received'
      });

      // Run 3-gate validation pipeline
      const result = await ValidationPipeline.validate(citizenId, scheme, Number(amount));

      // If approved → append to immutable ledger
      let block = null;
      if (result.approved) {
        block = LedgerService.appendBlock({
          citizenHash: result.citizenHash,
          scheme: result.scheme,
          amount: result.amount,
          regionCode: result.citizenData?.Region_Code || 'UNKNOWN',
          incomeTier: result.citizenData?.Income_Tier || 'UNKNOWN'
        });
      } else {
        // Track rejected transaction count
        SystemState.incrementRejected();
      }

      // Auto-generate fraud pattern report every 10 transactions
      const txLog = ValidationPipeline.getTransactionLog();
      let fraudReport = null;
      if (txLog.length > 0 && txLog.length % 10 === 0) {
        fraudReport = ValidationPipeline.generateFraudReport();
        EventStream.broadcast('FRAUD_REPORT', fraudReport);
      }

      // Build response
      const response = {
        success: true,
        approved: result.approved,
        citizenHash: CryptoService.maskHash(result.citizenHash),
        timestamp: result.timestamp,
        pipeline: {
          gate1: result.gates.gate1,
          gate2: result.gates.gate2,
          gate3: result.gates.gate3,
          gatesPassed: result.gatesPassed
        },
        rejectionReason: result.rejectionReason,
        rejectionGate: result.rejectionGate
      };

      if (block) {
        response.transaction = {
          id: block.TransactionID,
          timestamp: block.Timestamp,
          currentHash: CryptoService.maskHash(block.CurrentHash),
          previousHash: CryptoService.maskHash(block.PreviousHash)
        };
        response.budgetRemaining = SystemState.getBudget();
      }

      if (fraudReport) {
        response.fraudReport = fraudReport;
      }

      res.json(response);

    } catch (error) {
      console.error('[ClaimController] Error:', error);
      res.status(500).json({ error: 'PROCESSING_ERROR', message: error.message });
    }
  }

  /**
   * GET /api/claims/history
   */
  static getHistory(req, res) {
    const log = ValidationPipeline.getLastTransactions(20);
    res.json(log.map(t => ({
      ...t,
      citizenHash: CryptoService.maskHash(t.citizenHash)
    })));
  }
}

module.exports = ClaimController;
