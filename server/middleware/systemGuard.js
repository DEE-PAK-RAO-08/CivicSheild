// ═══════════════════════════════════════════════════════
// CivicShield — System Guard Middleware
// Blocks all transactions when system is not ACTIVE
// ═══════════════════════════════════════════════════════

const SystemState = require('../services/systemState');
const EventStream = require('../services/eventStream');

function systemGuard(req, res, next) {
  // Always allow admin routes and event stream
  if (req.path.startsWith('/api/admin') || 
      req.path.startsWith('/api/events') ||
      req.path === '/api/health') {
    return next();
  }

  // Allow GET requests for dashboard, ledger, registry reads
  if (req.method === 'GET' && (
    req.path.startsWith('/api/dashboard') ||
    req.path.startsWith('/api/ledger') ||
    req.path.startsWith('/api/citizens')
  )) {
    return next();
  }

  // Check system status for POST/mutation requests
  const status = SystemState.getStatus();

  if (status !== 'ACTIVE') {
    const reason = SystemState.getState().frozen_reason;

    EventStream.broadcast('REQUEST_BLOCKED', {
      reason: `System ${status}: ${reason || 'N/A'}`,
      path: req.path
    });

    return res.status(503).json({
      error: 'SYSTEM_FROZEN',
      status,
      reason: reason,
      message: status === 'PAUSED'
        ? 'System is paused by administrator. Contact admin to resume.'
        : status === 'BUDGET_EXHAUSTED'
        ? 'Budget fully depleted. No further disbursements possible.'
        : status === 'FROZEN'
        ? 'System is frozen due to ledger tampering. System restart required.'
        : `System is ${status}. Operations halted.`,
      canResume: status === 'PAUSED'
    });
  }

  next();
}

module.exports = systemGuard;
