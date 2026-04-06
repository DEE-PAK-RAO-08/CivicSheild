const fs = require('fs');
const path = require('path');

const STATE_PATH = path.join(__dirname, '..', 'data', 'system-state.json');

class SyndicateDetector {
  /**
   * Generates a node/link graph topology of the current fraud attempts to find organized behavior.
   * This represents a graph database analytic engine.
   */
  static generateNetworkGraph() {
    const rawState = fs.readFileSync(STATE_PATH, 'utf-8');
    const state = JSON.parse(rawState);
    
    const nodes = [];
    const links = [];
    
    // Central System Node
    nodes.push({ id: 'HQ', name: 'CivicShield Core', group: 0, size: 20 });
    
    // Create Region nodes
    const regions = Object.keys(state.region_fraud);
    regions.forEach(r => {
      nodes.push({ id: r, name: `Region ${r}`, group: 1, size: 10 + state.region_fraud[r] * 2 });
      links.push({ source: r, target: 'HQ', value: 1, color: '#334155' });
    });
    
    // Mock creating malicious citizen nodes surrounding the highly active regions to simulate a syndicate
    let maliciousNodeCounter = 0;
    
    regions.forEach(r => {
      const fraudCount = state.region_fraud[r] || 0;
      
      if (fraudCount > 0) {
        // High fraud activity in this region creates a "Syndicate Ring" structure
        const ringId = `SYN_R_${r}`;
        if (fraudCount >= 2) {
           nodes.push({ id: ringId, name: 'Suspected Ring', group: 2, size: 15, isSyndicate: true });
           links.push({ source: ringId, target: r, value: 3, color: '#ef4444' });
        }
        
        for (let i = 0; i < fraudCount; i++) {
          const mNode = `BAD_ACTOR_${maliciousNodeCounter++}`;
          nodes.push({ id: mNode, name: `Attacker ${mNode.split('_')[2]}`, group: 3, size: 6 });
          
          if (fraudCount >= 2) {
             links.push({ source: mNode, target: ringId, value: 2, color: '#f59e0b' });
          } else {
             links.push({ source: mNode, target: r, value: 1, color: '#ef4444' });
          }
        }
      }
    });

    return { nodes, links };
  }
}

module.exports = SyndicateDetector;
