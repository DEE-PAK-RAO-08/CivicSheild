// ═══════════════════════════════════════════════════════
// CivicShield — Fraud Cluster Service (IIT-Grade)
// Graph-Based Identity Clustering: Union-Find DSU
// Benford's Law Forensic Analysis
// Composite Risk Scoring Engine
// ═══════════════════════════════════════════════════════

const CryptoService = require('./cryptoService');
const EventStream = require('./eventStream');

// ── Union-Find (Disjoint Set Union) ──
// Path compression + Union by rank → O(α(n)) per operation
class UnionFind {
  constructor() {
    this.parent = new Map();
    this.rank = new Map();
    this.size = new Map();
  }

  makeSet(x) {
    if (!this.parent.has(x)) {
      this.parent.set(x, x);
      this.rank.set(x, 0);
      this.size.set(x, 1);
    }
  }

  // Path compression — flatten tree on every find
  find(x) {
    if (!this.parent.has(x)) this.makeSet(x);
    if (this.parent.get(x) !== x) {
      this.parent.set(x, this.find(this.parent.get(x)));
    }
    return this.parent.get(x);
  }

  // Union by rank — attach smaller tree under root of bigger tree
  union(x, y) {
    const rootX = this.find(x);
    const rootY = this.find(y);
    if (rootX === rootY) return false;

    const rankX = this.rank.get(rootX);
    const rankY = this.rank.get(rootY);

    if (rankX < rankY) {
      this.parent.set(rootX, rootY);
      this.size.set(rootY, this.size.get(rootY) + this.size.get(rootX));
    } else if (rankX > rankY) {
      this.parent.set(rootY, rootX);
      this.size.set(rootX, this.size.get(rootX) + this.size.get(rootY));
    } else {
      this.parent.set(rootY, rootX);
      this.size.set(rootX, this.size.get(rootX) + this.size.get(rootY));
      this.rank.set(rootX, rankX + 1);
    }
    return true;
  }

  // Get all connected components
  getComponents() {
    const components = new Map();
    for (const [node] of this.parent) {
      const root = this.find(node);
      if (!components.has(root)) components.set(root, []);
      components.get(root).push(node);
    }
    return components;
  }
}

// ── Benford's Law Analysis ──
// Expected first-digit distribution: P(d) = log10(1 + 1/d)
const BENFORD_EXPECTED = [
  0,       // d=0 (unused)
  0.301,   // d=1
  0.176,   // d=2
  0.125,   // d=3
  0.097,   // d=4
  0.079,   // d=5
  0.067,   // d=6
  0.058,   // d=7
  0.051,   // d=8
  0.046    // d=9
];

class FraudClusterService {
  constructor() {
    this.lastScanResults = null;
    this.lastScanTime = null;
  }

  /**
   * Run full identity cluster scan using Union-Find DSU
   * @param {Object} DataLoader - the data loader module
   * @returns {Object} enriched scan report
   */
  runScan(DataLoader) {
    const startTime = Date.now();
    const dsu = new UnionFind();
    const XLSX = require('xlsx');
    const path = require('path');
    const config = require('../config');

    // ── Phase 1: Load both datasets and normalize ──
    const mainPath = path.join(__dirname, '..', 'data', config.DATASET_FILENAME);
    const fraudPath = path.join(__dirname, '..', 'data', 'Civic_Shield_Fraud_Cluster.xlsx');

    const mainWB = XLSX.readFile(mainPath);
    const mainData = XLSX.utils.sheet_to_json(mainWB.Sheets[mainWB.SheetNames[0]]);

    let fraudData = [];
    try {
      const fraudWB = XLSX.readFile(fraudPath);
      fraudData = XLSX.utils.sheet_to_json(fraudWB.Sheets[fraudWB.SheetNames[0]]);
    } catch (e) {
      console.log('[FraudCluster] Could not load fraud dataset:', e.message);
    }

    // ── Phase 2: Build identity graph ──
    // hashToRecords: Map<hash, [{region, scheme, amount, date, source}]>
    const hashToRecords = new Map();

    const processRow = (row, source) => {
      const rawId = String(row['Citizen_ID'] || row['Citizen_ID '] || '');
      const citizenId = rawId.replace(/\D/g, ''); // Strip ALL non-digit chars
      if (!citizenId) return null;

      const citizenHash = CryptoService.generateCitizenHash(citizenId);
      const region = (row['Region_Code'] || '').trim();
      const scheme = (row['Scheme_Eligibility'] || '').trim();
      const amount = Number(row['Scheme_Amount'] || 0);

      // Parse date
      let claimDate = null;
      const rawDate = row['Last_Claim_Date'];
      if (rawDate) {
        if (typeof rawDate === 'number') {
          const excelDate = XLSX.SSF.parse_date_code(rawDate);
          claimDate = new Date(excelDate.y, excelDate.m - 1, excelDate.d).toISOString();
        } else if (typeof rawDate === 'string') {
          const parts = rawDate.split('-');
          if (parts.length === 3) {
            const [d, m, y] = parts;
            claimDate = new Date(`${y}-${m}-${d}T00:00:00Z`).toISOString();
          }
        }
      }

      if (!hashToRecords.has(citizenHash)) hashToRecords.set(citizenHash, []);
      hashToRecords.get(citizenHash).push({ region, scheme, amount, date: claimDate, source });

      dsu.makeSet(citizenHash);
      return { citizenHash, region };
    };

    // Process all rows
    mainData.forEach(row => processRow(row, 'MAIN'));
    fraudData.forEach(row => processRow(row, 'FRAUD_CLUSTER'));

    // ── Phase 3: Build edges — same hash + different regions ──
    // Also union hashes that share the same normalized ID appearing multiple times
    const regionToHashes = new Map();
    for (const [hash, records] of hashToRecords) {
      const regions = new Set(records.map(r => r.region).filter(Boolean));
      for (const region of regions) {
        if (!regionToHashes.has(region)) regionToHashes.set(region, []);
        regionToHashes.get(region).push(hash);
      }
      // If same hash appears in multiple regions → self-ring
      if (regions.size > 1) {
        // All records of this hash form a ring
        const regionArr = Array.from(regions);
        for (let i = 1; i < regionArr.length; i++) {
          dsu.union(`${hash}::${regionArr[0]}`, `${hash}::${regionArr[i]}`);
        }
      }
    }

    // ── Phase 4: Extract fraud clusters (multi-region identities) ──
    const clusters = [];
    let totalValueAtRisk = 0;
    let clusterIdCounter = 0;

    for (const [hash, records] of hashToRecords) {
      const regions = new Set(records.map(r => r.region).filter(Boolean));
      if (regions.size <= 1) continue; // Only flag cross-region

      const amounts = records.map(r => r.amount).filter(a => a > 0);
      const schemes = [...new Set(records.map(r => r.scheme).filter(Boolean))];
      const dates = records.map(r => r.date).filter(Boolean).sort();
      const clusterValue = amounts.reduce((s, a) => s + a, 0);
      totalValueAtRisk += clusterValue;

      // Benford's Law test on amounts in this cluster
      const benfordResult = this.benfordsLawTest(amounts);

      // Composite risk score
      const riskScore = this.calculateRiskScore({
        regionCount: regions.size,
        valueAtRisk: clusterValue,
        benfordDeviation: benfordResult.chiSquared,
        schemeCount: schemes.length,
        recordCount: records.length,
        dateSpreadDays: dates.length >= 2
          ? (new Date(dates[dates.length - 1]) - new Date(dates[0])) / (1000 * 60 * 60 * 24)
          : 0
      });

      clusterIdCounter++;
      clusters.push({
        clusterId: `RING-${String(clusterIdCounter).padStart(3, '0')}`,
        citizenHash: hash,
        maskedHash: CryptoService.maskHash(hash),
        regions: Array.from(regions),
        schemes,
        amounts,
        totalValueAtRisk: clusterValue,
        dateRange: {
          earliest: dates[0] || null,
          latest: dates[dates.length - 1] || null
        },
        recordCount: records.length,
        sources: [...new Set(records.map(r => r.source))],
        benfordAnalysis: benfordResult,
        riskScore,
        riskLevel: riskScore >= 80 ? 'CRITICAL' : riskScore >= 60 ? 'HIGH' : riskScore >= 40 ? 'MEDIUM' : 'LOW'
      });
    }

    // Sort by risk score descending
    clusters.sort((a, b) => b.riskScore - a.riskScore);

    const scanDuration = Date.now() - startTime;

    const report = {
      scanId: `SCAN-${Date.now()}`,
      timestamp: new Date().toISOString(),
      scanDurationMs: scanDuration,
      algorithm: 'Union-Find DSU (Path Compression + Union by Rank)',
      datasetsScanned: ['CivicShield_Dataset.xlsx', 'Civic_Shield_Fraud_Cluster.xlsx'],
      totalRecordsAnalyzed: mainData.length + fraudData.length,
      uniqueIdentities: hashToRecords.size,
      clustersDetected: clusters.length,
      totalValueAtRisk,
      highestRiskCluster: clusters[0] || null,
      clusters,
      benfordGlobalAnalysis: this.benfordsLawTest(
        [...hashToRecords.values()].flat().map(r => r.amount).filter(a => a > 0)
      ),
      threatSummary: {
        critical: clusters.filter(c => c.riskLevel === 'CRITICAL').length,
        high: clusters.filter(c => c.riskLevel === 'HIGH').length,
        medium: clusters.filter(c => c.riskLevel === 'MEDIUM').length,
        low: clusters.filter(c => c.riskLevel === 'LOW').length
      }
    };

    this.lastScanResults = report;
    this.lastScanTime = new Date().toISOString();

    EventStream.broadcast('FRAUD_SCAN_COMPLETE', {
      clustersFound: clusters.length,
      totalValueAtRisk,
      scanDurationMs: scanDuration,
      message: `Identity graph scan complete: ${clusters.length} fraud rings detected`
    });

    console.log(`[FraudCluster] ✅ Scan complete in ${scanDuration}ms — ${clusters.length} clusters, ₹${totalValueAtRisk.toLocaleString()} at risk`);

    return report;
  }

  /**
   * Benford's Law chi-squared test
   * Real financial data follows: P(d) = log10(1 + 1/d)
   * Fabricated data often deviates significantly
   */
  benfordsLawTest(amounts) {
    if (amounts.length < 5) {
      return { valid: false, reason: 'Insufficient data (need ≥5 amounts)', chiSquared: 0, isAnomalous: false };
    }

    // Count first digits
    const observed = new Array(10).fill(0);
    let total = 0;

    amounts.forEach(amt => {
      const firstDigit = parseInt(String(Math.abs(amt))[0]);
      if (firstDigit >= 1 && firstDigit <= 9) {
        observed[firstDigit]++;
        total++;
      }
    });

    if (total < 5) {
      return { valid: false, reason: 'Not enough valid first digits', chiSquared: 0, isAnomalous: false };
    }

    // Chi-squared test: Σ (O_i - E_i)² / E_i
    let chiSquared = 0;
    const distribution = [];

    for (let d = 1; d <= 9; d++) {
      const expected = BENFORD_EXPECTED[d] * total;
      const obs = observed[d];
      const residual = ((obs - expected) ** 2) / expected;
      chiSquared += residual;
      distribution.push({
        digit: d,
        observed: obs,
        expected: Math.round(expected * 100) / 100,
        observedPct: ((obs / total) * 100).toFixed(1),
        expectedPct: (BENFORD_EXPECTED[d] * 100).toFixed(1),
        residual: Math.round(residual * 1000) / 1000
      });
    }

    // Critical value for chi-squared with 8 degrees of freedom at α=0.05 is 15.507
    const isAnomalous = chiSquared > 15.507;

    return {
      valid: true,
      sampleSize: total,
      chiSquared: Math.round(chiSquared * 1000) / 1000,
      degreesOfFreedom: 8,
      criticalValue: 15.507,
      significanceLevel: 0.05,
      isAnomalous,
      verdict: isAnomalous ? 'SUSPICIOUS — Deviates from natural distribution' : 'NORMAL — Consistent with Benford\'s Law',
      distribution
    };
  }

  /**
   * Composite risk score (0-100) using weighted factors
   */
  calculateRiskScore({ regionCount, valueAtRisk, benfordDeviation, schemeCount, recordCount, dateSpreadDays }) {
    // Factor 1: Region spread (weight: 0.30) — more regions = higher risk
    const regionScore = Math.min(100, (regionCount - 1) * 40);

    // Factor 2: Value at risk (weight: 0.25) — higher value = higher risk
    const valueScore = Math.min(100, (valueAtRisk / 10000) * 100);

    // Factor 3: Benford deviation (weight: 0.20) — higher chi² = more suspicious
    const benfordScore = Math.min(100, (benfordDeviation / 15.507) * 100);

    // Factor 4: Temporal density (weight: 0.15) — more records in short time = suspicious
    const densityScore = dateSpreadDays > 0
      ? Math.min(100, (recordCount / Math.max(1, dateSpreadDays / 30)) * 20)
      : recordCount * 15;

    // Factor 5: Scheme diversity (weight: 0.10) — claiming from many schemes = suspicious
    const schemeScore = Math.min(100, (schemeCount - 1) * 50);

    const composite = (
      regionScore * 0.30 +
      valueScore * 0.25 +
      benfordScore * 0.20 +
      densityScore * 0.15 +
      schemeScore * 0.10
    );

    return Math.round(Math.min(100, Math.max(0, composite)));
  }

  /**
   * Get the last scan results (cached)
   */
  getLastScan() {
    return this.lastScanResults;
  }

  /**
   * Export structured JSON for download
   */
  exportJSON() {
    if (!this.lastScanResults) return { error: 'No scan has been run yet. Click Run Scan first.' };
    return {
      ...this.lastScanResults,
      exportedAt: new Date().toISOString(),
      format: 'CivicShield Fraud Cluster Report v3.0'
    };
  }
}

module.exports = new FraudClusterService();
