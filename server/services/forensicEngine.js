/**
 * ForensicEngine Service (CivicShield V5)
 * Generates natural language explanations (XAI) for rejected transactions
 * simulating a decision-reasoning engine.
 */

class ForensicEngine {
  /**
   * Generate a forensic reasoning report for a failed validation
   * @param {Object} context { citizenId, scheme, amount, humanityScore, gateFailures, regionCode }
   */
  static generateReasoning(context) {
    const { humanityScore, gateFailures, regionCode, amount, scheme, livenessVerified } = context;
    
    let reasoning = [];
    let severity = 'LOW';
    let vector = 'UNCERTAIN';

    // 1. Behavioral Check
    if (humanityScore < 50) {
      reasoning.push(`🔴 ANOMALOUS BEHAVIOR: Entropy score ${humanityScore}% is below legality threshold (50%). Mouse velocity and keyboard cadence suggest an automated script (Gate 0 intervention).`);
      severity = 'CRITICAL';
      vector = 'BOT_ATTACK';
    }

    // 2. Gateway Failures
    if (gateFailures.includes('GATE1_ELIGIBILITY')) {
      reasoning.push(`🟡 ELIGIBILITY FAILURE: The ZKP Circuit failed to verify the polynomial proof for ${scheme}. Either the citizen's residency/income tier is mismatched, or the cryptographic integrity of the proof was compromised.`);
      vector = 'ELIGIBILITY_MISMATCH';
    }

    if (gateFailures.includes('GATE2_BUDGET')) {
      reasoning.push(`🟠 BUDGETARY EXPLOIT: Requested amount (₹${amount.toLocaleString('en-IN')}) exceeds allocated scheme budget for region ${regionCode}. Potential resource-drain attempt detected.`);
      vector = 'BUDGET_OVERFLOW';
    }

    if (gateFailures.includes('GATE3_FREQUENCY')) {
      reasoning.push(`🔵 FREQUENCY ANOMALY: A prior transaction for this identity hash was detected within the cool-down window. Replay protection active.`);
      vector = 'REPLAY_ATTACK';
    }

    // 3. Holistic Risk Assessment
    if (reasoning.length > 2) {
      severity = 'CRITICAL';
      reasoning.push(`🚨 CLUSTER ANALYSIS: Multiple security gates triggered simultaneously. High probability of distributed attack or coordinated identity theft.`);
    } else if (reasoning.length > 0) {
      severity = 'HIGH';
    }

    // 4. Identity Confidence
    const confidence = livenessVerified ? '99.9%' : 'LOW (Simulation Mode)';
    reasoning.push(`🔒 IDENTITY CONFIDENCE: ${confidence} via Hardware-Linked Biometric Attestation.`);

    return {
      timestamp: new Date().toISOString(),
      reportId: `FOR-${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
      severity,
      vector,
      explanation: reasoning,
      nodeAttestation: `Enclave_0x${Math.random().toString(16).substring(2, 8).toUpperCase()}_Verified`,
      recommendation: severity === 'CRITICAL' ? 'BLACKLIST_IDENTITY_HASH' : 'MANUAL_OFFICER_REVIEW'
    };
  }
}

module.exports = ForensicEngine;
