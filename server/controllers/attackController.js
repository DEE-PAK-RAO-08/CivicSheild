// ═══════════════════════════════════════════════════════
// CivicShield — Attack Simulation Controller
// Demonstrates system resilience (Hackathon Innovation)
// ═══════════════════════════════════════════════════════

const LedgerService = require('../services/ledgerService');
const CryptoService = require('../services/cryptoService');
const EventStream = require('../services/eventStream');

class AttackController {
  /**
   * POST /api/attacks/tamper-ledger
   * Tamper with a ledger entry to trigger freeze
   */
  static tamperLedger(req, res) {
    const { blockIndex, newAmount } = req.body;
    const idx = blockIndex !== undefined ? blockIndex : 0;
    const amt = newAmount || 999999;

    const result = LedgerService.tamperBlock(idx, amt);
    if (result.error) {
      return res.status(400).json(result);
    }

    res.json({
      success: true,
      message: `Block #${idx} tampered — system should now be FROZEN`,
      ...result
    });
  }

  /**
   * POST /api/attacks/fake-identity
   * Attempt claim with non-existent citizen ID
   */
  static fakeIdentity(req, res) {
    const fakeId = 'FAKE_' + Math.random().toString(36).substring(2, 10);
    const hash = CryptoService.generateCitizenHash(fakeId);
    
    EventStream.broadcast('ATTACK_FAKE_IDENTITY', {
      attackType: 'FAKE_IDENTITY',
      citizenHash: CryptoService.maskHash(hash),
      message: `Fake identity injection attempted: ${CryptoService.maskHash(hash)}`
    });

    res.json({
      success: true,
      message: 'Fake identity attack simulated — use this ID in a claim to see Gate 1 reject it',
      fakeId,
      citizenHash: CryptoService.maskHash(hash)
    });
  }
  /**
   * POST /api/attacks/stress-test
   * Simulator: God Mode Load Test
   * Rapidly fires N claims to demonstrate duplicate cache,
   * anomaly detection, and exact budget deduction without race conditions.
   */
  static async stressTest(req, res) {
    const SystemState = require('../services/systemState');
    const ClaimController = require('./claimController');
    const DataLoader = require('../services/dataLoader');
    
    if (SystemState.getState().status !== 'ACTIVE') {
      return res.status(400).json({ error: 'System is not ACTIVE. Resume system first.' });
    }

    const { count = 50 } = req.body;
    const citizensHashArray = Object.keys(DataLoader.getRegistry());
    const rawIdsForDemo = citizensHashArray.map((hash, i) => DataLoader.findByHash(hash).id || Math.floor(Math.random() * 1000000000000).toString().padStart(12, '0'));
    
    res.json({
      success: true,
      message: `Initiating God Mode: Firing ${count} claims asynchronously.`
    });

    EventStream.broadcast('ATTACK_STRESS_TEST', {
      message: `GOD MODE INITIATED: ${count} concurrent claims flooding the validation engine.`
    });

    // Fire asynchronously to simulate real traffic spike
    setTimeout(() => {
      let fired = 0;
      const interval = setInterval(() => {
        if (fired >= count || SystemState.getState().status !== 'ACTIVE') {
          clearInterval(interval);
          EventStream.broadcast('STRESS_TEST_COMPLETE', {
            message: `Load test concluded. System handled ${fired} requests.`
          });
          return;
        }

        // Randomly pick an ID, occasionally forcing a fake ID
        const rand = Math.random();
        let targetId = rawIdsForDemo[Math.floor(Math.random() * rawIdsForDemo.length)] || Math.floor(Math.random() * 1000000000000).toString().padStart(12, '0');
        
        let scheme = Math.random() > 0.5 ? 'Health' : 'Pension';
        let amount = scheme === 'Health' ? 5000 : 2000;

        if (rand > 0.9) {
          // 10% chance of phantom id
          targetId = Math.floor(Math.random() * 1000000000000).toString().padStart(12, '0');
        }

        // Simulate internal request without HTTP overhead for raw engine speed test
        ClaimController._processClaimInternal(targetId, scheme, amount);
        fired++;
      }, 50); // Fire every 50ms (20 per second)
    }, 1000);
  }
}

module.exports = AttackController;
