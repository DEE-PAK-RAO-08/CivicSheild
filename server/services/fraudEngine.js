const fs = require('fs');
const path = require('path');
const config = require('../config');

const STATE_PATH = path.join(__dirname, '..', 'data', 'system-state.json');
const CITIZENS_PATH = path.join(__dirname, '..', 'data', 'citizens.json');

class FraudEngine {
  /**
   * Calculate risk score for a citizen (0-100)
   * Based on: duplicate attempts, replay attempts, frequency violations, region fraud rate
   */
  static calculateRiskScore(citizenHash) {
    const state = JSON.parse(fs.readFileSync(STATE_PATH, 'utf-8'));
    const citizens = JSON.parse(fs.readFileSync(CITIZENS_PATH, 'utf-8'));

    // Get citizen's fraud history from in-memory tracker
    const citizenFraud = this._getCitizenFraudHistory(citizenHash);

    // Get citizen's region
    const citizen = citizens.find(c => {
      const crypto = require('./cryptoService');
      return crypto.generateCitizenHash(c.Citizen_ID) === citizenHash;
    });

    const regionCode = citizen ? citizen.Region_Code : 'UNKNOWN';

    // Calculate component scores
    const duplicateScore = Math.min(citizenFraud.duplicates * 15, config.RISK_WEIGHTS.DUPLICATE);
    const replayScore = Math.min(citizenFraud.replays * 20, config.RISK_WEIGHTS.REPLAY);
    const frequencyScore = Math.min(citizenFraud.frequencyViolations * 12, config.RISK_WEIGHTS.FREQUENCY);

    // Region fraud rate
    const totalFraudInRegion = state.region_fraud[regionCode] || 0;
    const totalTransactions = Math.max(state.total_transactions, 1);
    const regionFraudRate = (totalFraudInRegion / totalTransactions) * 100;
    const regionScore = Math.min(regionFraudRate * 2, config.RISK_WEIGHTS.REGION_FRAUD_RATE);

    const totalRisk = Math.min(
      Math.round(duplicateScore + replayScore + frequencyScore + regionScore),
      100
    );

    let riskLevel, explanation;
    if (totalRisk <= 25) {
      riskLevel = 'LOW';
      explanation = 'This citizen shows normal behavior patterns with minimal fraud indicators.';
    } else if (totalRisk <= 60) {
      riskLevel = 'MEDIUM';
      explanation = 'Elevated risk detected. Some fraud-related behaviors observed. Enhanced monitoring recommended.';
    } else {
      riskLevel = 'HIGH';
      explanation = 'Critical risk level! Multiple fraud indicators triggered. Manual review required before any disbursement.';
      
      // Simulate federated learning sync when high risk is detected
      const EventStream = require('./eventStream');
      setTimeout(() => {
        EventStream.broadcast('FEDERATED_SYNC', {
          node: `Node_${regionCode}`,
          weightsAdapted: Math.floor(Math.random() * 50) + 10,
          accuracy: (98 + Math.random() * 1.5).toFixed(2),
          message: `Local node ${regionCode} contributed new weights for high-risk pattern.`
        });
      }, 1500);
    }

    return {
      citizenHash,
      riskScore: totalRisk,
      riskLevel,
      explanation,
      breakdown: {
        duplicate_risk: { score: duplicateScore, max: config.RISK_WEIGHTS.DUPLICATE, count: citizenFraud.duplicates },
        replay_risk: { score: replayScore, max: config.RISK_WEIGHTS.REPLAY, count: citizenFraud.replays },
        frequency_risk: { score: frequencyScore, max: config.RISK_WEIGHTS.FREQUENCY, count: citizenFraud.frequencyViolations },
        region_risk: { score: Math.round(regionScore), max: config.RISK_WEIGHTS.REGION_FRAUD_RATE, rate: `${regionFraudRate.toFixed(1)}%` }
      },
      regionCode,
      assessedAt: new Date().toISOString()
    };
  }

  // In-memory fraud history per citizen
  static _fraudHistory = {};

  static _getCitizenFraudHistory(citizenHash) {
    if (!this._fraudHistory[citizenHash]) {
      this._fraudHistory[citizenHash] = {
        duplicates: 0,
        replays: 0,
        frequencyViolations: 0
      };
    }
    return this._fraudHistory[citizenHash];
  }

  static recordFraud(citizenHash, type, regionCode) {
    const history = this._getCitizenFraudHistory(citizenHash);
    const state = JSON.parse(fs.readFileSync(STATE_PATH, 'utf-8'));

    switch (type) {
      case 'DUPLICATE':
        history.duplicates += 1;
        state.fraud_stats.duplicate_attempts += 1;
        break;
      case 'REPLAY':
        history.replays += 1;
        state.fraud_stats.replay_attempts += 1;
        break;
      case 'FREQUENCY':
        history.frequencyViolations += 1;
        state.fraud_stats.frequency_violations += 1;
        break;
      case 'FAKE_IDENTITY':
        state.fraud_stats.fake_identity_attempts += 1;
        break;
      case 'BUDGET_EXPLOIT':
        state.fraud_stats.budget_exploits += 1;
        break;
    }

    // Update region fraud
    if (regionCode && state.region_fraud[regionCode] !== undefined) {
      state.region_fraud[regionCode] += 1;
    }

    fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));
  }

  /**
   * Get fraud analytics for dashboard
   */
  static getAnalytics() {
    const state = JSON.parse(fs.readFileSync(STATE_PATH, 'utf-8'));

    const fraudTypes = [
      { type: 'Duplicate Requests', count: state.fraud_stats.duplicate_attempts, color: '#ef4444' },
      { type: 'Replay Attacks', count: state.fraud_stats.replay_attempts, color: '#f97316' },
      { type: 'Fake Identity', count: state.fraud_stats.fake_identity_attempts, color: '#8b5cf6' },
      { type: 'Frequency Violations', count: state.fraud_stats.frequency_violations, color: '#eab308' },
      { type: 'Budget Exploits', count: state.fraud_stats.budget_exploits, color: '#ec4899' },
      { type: 'Ledger Tamper', count: state.fraud_stats.tamper_attempts, color: '#dc2626' }
    ];

    const regionData = Object.entries(state.region_fraud).map(([region, count]) => ({
      region,
      fraudCount: count,
      label: this._getRegionLabel(region)
    }));

    const totalFraud = Object.values(state.fraud_stats).reduce((a, b) => a + b, 0);
    const topFraudRegion = regionData.reduce((max, r) => r.fraudCount > max.fraudCount ? r : max, regionData[0]);
    const mostCommonFraud = fraudTypes.reduce((max, f) => f.count > max.count ? f : max, fraudTypes[0]);

    return {
      fraudTypes,
      regionData,
      totalFraud,
      topFraudRegion: topFraudRegion || { region: 'N/A', fraudCount: 0 },
      mostCommonFraud: mostCommonFraud || { type: 'N/A', count: 0 },
      approvalRate: state.total_transactions > 0
        ? ((state.approved_count / state.total_transactions) * 100).toFixed(1)
        : '0',
      approvedCount: state.approved_count,
      rejectedCount: state.rejected_count
    };
  }

  static _getRegionLabel(code) {
    const labels = {
      'R01': 'North India',
      'R02': 'South India',
      'R03': 'East India',
      'R04': 'West India',
      'R05': 'Central India'
    };
    return labels[code] || code;
  }

  /**
   * Reset fraud tracking (for demo reset)
   */
  static reset() {
    this._fraudHistory = {};
  }
}

module.exports = FraudEngine;
