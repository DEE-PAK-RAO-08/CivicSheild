const EventStream = require('./eventStream');

class SentinelService {
  constructor() {
    this.attackLog = [];
    this.defconLevel = 5; // 5 is calm, 1 is critical
    this.isSafeMode = false;
    this.lastTriggered = null;

    // Reset loop every minute to decay "threat intensity"
    setInterval(() => this.decayThreat(), 60000);
  }

  /**
   * Log an incoming threat and check for velocity thresholds
   */
  logThreat(type, metadata = {}) {
    const now = Date.now();
    this.attackLog.push({ type, timestamp: now });

    // Filter log for last 30 seconds
    this.attackLog = this.attackLog.filter(a => now - a.timestamp < 30000);

    const attackCount = this.attackLog.length;
    let newLevel = 5;

    if (attackCount > 10) newLevel = 1;
    else if (attackCount > 7) newLevel = 2;
    else if (attackCount > 4) newLevel = 3;
    else if (attackCount > 2) newLevel = 4;

    if (newLevel !== this.defconLevel) {
      this.defconLevel = newLevel;
      this.handleDefconChange(newLevel, type);
    }

    return {
      level: this.defconLevel,
      count: attackCount,
      active: this.defconLevel < 5
    };
  }

  handleDefconChange(level, lastAttackType) {
    let message = `Sentinel: Threat level shifted to DEFCON-${level}`;
    let action = 'MONITORING';

    if (level <= 2) {
      action = 'AUTONOMOUS_LOCKDOWN';
      message = `🚨 CRITICAL: High-velocity attack detected (${lastAttackType}). Autonomous Lockdown engaged.`;
    } else if (level <= 4) {
      action = 'ENHANCED_SCRUTINY';
      message = `⚠️ WARNING: Unusual activity detected. Enhanced ZKP verification enabled.`;
    }

    EventStream.broadcast('SENTINEL_DEFCON_CHANGE', {
      level,
      action,
      message,
      timestamp: new Date().toISOString()
    });

    console.log(`[SENTINEL] ${message}`);
  }

  decayThreat() {
    if (this.defconLevel < 5) {
      this.defconLevel++;
      EventStream.broadcast('SENTINEL_THREAT_DECAY', {
        level: this.defconLevel,
        message: `Sentinel: Threat intensity decaying. Current Level: DEFCON-${this.defconLevel}`
      });
    }
  }

  getStats() {
    return {
      defcon: this.defconLevel,
      attackVelocity: this.attackLog.length,
      isSafeMode: this.defconLevel <= 2
    };
  }
}

// Singleton instance
module.exports = new SentinelService();
