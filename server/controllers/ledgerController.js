// ═══════════════════════════════════════════════════════
// CivicShield — Ledger Controller
// GET /api/ledger — View immutable hash chain
// GET /api/ledger/verify — Verify chain integrity
// ═══════════════════════════════════════════════════════

const LedgerService = require('../services/ledgerService');
const CryptoService = require('../services/cryptoService');

class LedgerController {
  static getLedger(req, res) {
    const ledger = LedgerService.getLedger();
    // Mask citizen hashes for display
    const masked = ledger.map(block => ({
      ...block,
      CitizenHash_Display: CryptoService.maskHash(block.CitizenHash)
    }));
    res.json(masked);
  }

  static verifyLedger(req, res) {
    const report = LedgerService.verifyIntegrity();
    res.json(report);
  }

  static getBlock(req, res) {
    const index = parseInt(req.params.id);
    const block = LedgerService.getBlock(index);
    if (!block) {
      return res.status(404).json({ error: 'Block not found' });
    }
    res.json({
      ...block,
      CitizenHash_Display: CryptoService.maskHash(block.CitizenHash)
    });
  }
}

module.exports = LedgerController;
