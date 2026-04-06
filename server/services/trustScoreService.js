const fs = require('fs');
const path = require('path');
const config = require('../config');
const CryptoService = require('./cryptoService');

const CITIZENS_PATH = path.join(__dirname, '..', 'data', 'citizens.json');

class TrustScoreService {
  /**
   * Get trust score and history for a citizen
   */
  static getTrustData(citizenHash) {
    const citizens = JSON.parse(fs.readFileSync(CITIZENS_PATH, 'utf-8'));
    const citizen = citizens.find(c =>
      CryptoService.generateCitizenHash(c.Citizen_ID) === citizenHash
    );

    if (!citizen) {
      return null;
    }

    return {
      citizenHash,
      currentScore: citizen.Trust_Score,
      level: this._getLevel(citizen.Trust_Score),
      history: citizen.Trust_History,
      claimCount: citizen.Claim_Count
    };
  }

  /**
   * Decrease trust score due to fraud
   */
  static penalize(citizenHash, reason, penaltyType) {
    const citizens = JSON.parse(fs.readFileSync(CITIZENS_PATH, 'utf-8'));
    const index = citizens.findIndex(c =>
      CryptoService.generateCitizenHash(c.Citizen_ID) === citizenHash
    );

    if (index === -1) return null;

    let penalty = 0;
    switch (penaltyType) {
      case 'DUPLICATE':
        penalty = config.TRUST_SCORE.FRAUD_PENALTY_DUPLICATE;
        break;
      case 'REPLAY':
        penalty = config.TRUST_SCORE.FRAUD_PENALTY_REPLAY;
        break;
      case 'FREQUENCY':
        penalty = config.TRUST_SCORE.FRAUD_PENALTY_FREQUENCY;
        break;
      case 'FAKE_IDENTITY':
        penalty = config.TRUST_SCORE.FRAUD_PENALTY_FAKE_ID;
        break;
      default:
        penalty = -10;
    }

    const newScore = Math.max(config.TRUST_SCORE.MIN, citizens[index].Trust_Score + penalty);
    citizens[index].Trust_Score = newScore;
    citizens[index].Trust_History.push({
      date: new Date().toISOString(),
      score: newScore,
      reason: reason,
      penalty
    });

    fs.writeFileSync(CITIZENS_PATH, JSON.stringify(citizens, null, 2));

    return {
      citizenHash,
      previousScore: newScore - penalty,
      newScore,
      penalty,
      reason,
      level: this._getLevel(newScore)
    };
  }

  /**
   * Get all citizens with trusts scores (hashed)
   */
  static getAllTrustScores() {
    const citizens = JSON.parse(fs.readFileSync(CITIZENS_PATH, 'utf-8'));
    return citizens.map(c => ({
      citizenHash: CryptoService.generateCitizenHash(c.Citizen_ID),
      maskedHash: CryptoService.maskHash(CryptoService.generateCitizenHash(c.Citizen_ID)),
      score: c.Trust_Score,
      level: this._getLevel(c.Trust_Score),
      claimCount: c.Claim_Count,
      region: c.Region_Code
    }));
  }

  static _getLevel(score) {
    if (score >= 80) return { text: 'TRUSTED', color: '#22c55e' };
    if (score >= 60) return { text: 'CAUTIOUS', color: '#eab308' };
    if (score >= 40) return { text: 'SUSPICIOUS', color: '#f97316' };
    return { text: 'BLACKLISTED', color: '#ef4444' };
  }
}

module.exports = TrustScoreService;
