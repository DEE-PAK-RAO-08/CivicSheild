const CryptoService = require('../services/cryptoService');
const EventStream = require('../services/eventStream');
const FraudEngine = require('../services/fraudEngine');
const TrustScoreService = require('../services/trustScoreService');
const config = require('../config');

// In-memory tracking for duplicate and replay detection
const activeRequests = new Map();  // citizenHash+scheme → timestamp (for duplicates)
const recentRequests = new Map();  // citizenHash+scheme+amount → timestamp (for replays)

/**
 * Middleware to detect duplicate concurrent requests and replay attacks
 */
function requestTracker(req, res, next) {
  if (req.method !== 'POST' || !req.body.citizenId) {
    return next();
  }

  const { citizenId, scheme, amount } = req.body;
  const citizenHash = CryptoService.generateCitizenHash(citizenId);
  const requestKey = `${citizenHash}:${scheme}`;
  const replayKey = `${citizenHash}:${scheme}:${amount}`;

  // ── Duplicate Detection ──
  if (activeRequests.has(requestKey)) {
    const elapsed = Date.now() - activeRequests.get(requestKey);
    if (elapsed < 5000) { // Within 5 seconds = concurrent duplicate
      FraudEngine.recordFraud(citizenHash, 'DUPLICATE', req.body.regionCode);
      TrustScoreService.penalize(citizenHash, 'Duplicate concurrent request detected', 'DUPLICATE');

      EventStream.broadcast('FRAUD_DETECTED', {
        type: 'DUPLICATE_REJECTED',
        citizenHash: CryptoService.maskHash(citizenHash),
        message: '🔴 Duplicate concurrent request detected and blocked'
      });

      return res.status(409).json({
        error: 'DUPLICATE_REJECTED',
        message: 'Duplicate concurrent request detected. This attempt has been logged.',
        citizenHash: CryptoService.maskHash(citizenHash),
        fraudType: 'DUPLICATE_REJECTED'
      });
    }
  }

  // ── Replay Detection ──
  if (recentRequests.has(replayKey)) {
    const elapsed = Date.now() - recentRequests.get(replayKey);
    if (elapsed < config.REPLAY_WINDOW_MS) {
      FraudEngine.recordFraud(citizenHash, 'REPLAY', req.body.regionCode);
      TrustScoreService.penalize(citizenHash, 'Replay attack detected — same request within 10 minutes', 'REPLAY');

      EventStream.broadcast('FRAUD_DETECTED', {
        type: 'REPLAY_DETECTED',
        citizenHash: CryptoService.maskHash(citizenHash),
        timeElapsed: `${(elapsed / 1000).toFixed(1)}s`,
        window: '10 minutes',
        message: '🔴 Replay attack detected — identical request within time window'
      });

      return res.status(429).json({
        error: 'REPLAY_DETECTED',
        message: `Replay attack detected. Same request made ${(elapsed / 1000).toFixed(1)}s ago. Minimum interval: 10 minutes.`,
        citizenHash: CryptoService.maskHash(citizenHash),
        fraudType: 'REPLAY_DETECTED'
      });
    }
  }

  // Mark as active
  activeRequests.set(requestKey, Date.now());
  recentRequests.set(replayKey, Date.now());

  // Clean up active request after processing
  res.on('finish', () => {
    setTimeout(() => activeRequests.delete(requestKey), 5000);
  });

  // Clean up replay tracking after window expires
  setTimeout(() => recentRequests.delete(replayKey), config.REPLAY_WINDOW_MS);

  // Attach citizenHash to request for downstream use
  req.citizenHash = citizenHash;
  next();
}

/**
 * Reset tracking (for demo reset)
 */
requestTracker.reset = function() {
  activeRequests.clear();
  recentRequests.clear();
};

module.exports = requestTracker;
