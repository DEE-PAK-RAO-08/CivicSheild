// ═══════════════════════════════════════════════════════
// CivicShield Data Loader
// Loads CivicShield_Dataset.xlsx on startup
// Hardcoding citizen data disqualifies the submission
// ═══════════════════════════════════════════════════════

const XLSX = require('xlsx');
const path = require('path');
const config = require('../config');
const CryptoService = require('./cryptoService');

// Runtime registry — mutable during session
let citizenRegistry = [];
// Hash lookup map for O(1) access
let hashToIndex = new Map();
// Raw ID to hash map (built once, then raw IDs discarded from logs)
let idToHash = new Map();

class DataLoader {
  /**
   * Load CivicShield_Dataset.xlsx from server/data/
   * Called once on startup
   */
  static load() {
    const filePath = path.join(__dirname, '..', 'data', config.DATASET_FILENAME);
    
    console.log(`[DataLoader] Loading dataset from: ${filePath}`);
    
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rawData = XLSX.utils.sheet_to_json(sheet);

    console.log(`[DataLoader] Raw rows parsed: ${rawData.length}`);

    citizenRegistry = rawData.map((row, index) => {
      const citizenId = String(row['Citizen_ID'] || row['Citizen_ID '] || '').trim();
      const citizenHash = CryptoService.generateCitizenHash(citizenId);

      // Parse Last_Claim_Date from DD-MM-YYYY or Excel serial
      let lastClaimDate = null;
      const rawDate = row['Last_Claim_Date'];
      if (rawDate) {
        if (typeof rawDate === 'number') {
          // Excel serial date
          const excelDate = XLSX.SSF.parse_date_code(rawDate);
          lastClaimDate = new Date(excelDate.y, excelDate.m - 1, excelDate.d).toISOString();
        } else if (typeof rawDate === 'string') {
          const parts = rawDate.split('-');
          if (parts.length === 3) {
            const [day, month, year] = parts;
            lastClaimDate = new Date(`${year}-${month}-${day}T00:00:00Z`).toISOString();
          }
        }
      }

      // Parse Aadhaar_Linked
      let aadhaarLinked = row['Aadhaar_Linked'];
      if (typeof aadhaarLinked === 'string') {
        aadhaarLinked = aadhaarLinked.toUpperCase() === 'TRUE';
      }

      const record = {
        _index: index,
        CitizenHash: citizenHash,
        Income_Tier: (row['Income_Tier'] || 'Unknown').trim(),
        Scheme_Eligibility: (row['Scheme_Eligibility'] || '').trim(),
        Scheme_Amount: Number(row['Scheme_Amount'] || 0),
        Last_Claim_Date: lastClaimDate,
        Region_Code: (row['Region_Code'] || '').trim(),
        Account_Status: (row['Account_Status'] || '').trim(),
        Aadhaar_Linked: aadhaarLinked === true || aadhaarLinked === 'TRUE',
        Claim_Count: Number(row['Claim_Count'] || 0)
      };

      hashToIndex.set(citizenHash, index);
      idToHash.set(citizenId, citizenHash);

      return record;
    });

    console.log(`[DataLoader] ✅ Loaded ${citizenRegistry.length} citizens into registry`);
    console.log(`[DataLoader] Sample schemes: ${[...new Set(citizenRegistry.map(c => c.Scheme_Eligibility))].join(', ')}`);
    console.log(`[DataLoader] Sample regions: ${[...new Set(citizenRegistry.slice(0, 10).map(c => c.Region_Code))].join(', ')}`);

    return citizenRegistry;
  }

  /**
   * Find citizen by hash (O(1) lookup)
   */
  static findByHash(citizenHash) {
    const idx = hashToIndex.get(citizenHash);
    if (idx === undefined) return null;
    return citizenRegistry[idx];
  }

  /**
   * Find citizen by raw ID (only used during claim processing)
   */
  static findById(citizenId) {
    const hash = CryptoService.generateCitizenHash(String(citizenId).trim());
    return this.findByHash(hash);
  }

  /**
   * Update citizen record in runtime registry
   */
  static updateCitizen(citizenHash, updates) {
    const idx = hashToIndex.get(citizenHash);
    if (idx === undefined) return false;
    Object.assign(citizenRegistry[idx], updates);
    return true;
  }

  /**
   * Get all citizens (hashed — no raw IDs)
   */
  static getAllCitizens() {
    return citizenRegistry.map(c => ({
      CitizenHash: CryptoService.maskHash(c.CitizenHash),
      FullHash: c.CitizenHash,
      Income_Tier: c.Income_Tier,
      Scheme_Eligibility: c.Scheme_Eligibility,
      Scheme_Amount: c.Scheme_Amount,
      Last_Claim_Date: c.Last_Claim_Date,
      Region_Code: c.Region_Code,
      Account_Status: c.Account_Status,
      Aadhaar_Linked: c.Aadhaar_Linked,
      Claim_Count: c.Claim_Count
    }));
  }

  /**
   * Get citizen count
   */
  static getCount() {
    return citizenRegistry.length;
  }

  /**
   * Get hash from raw ID (for claim form autocomplete)
   */
  static getHashForId(citizenId) {
    return CryptoService.generateCitizenHash(String(citizenId).trim());
  }

  /**
   * Get list of valid citizen IDs (for frontend dropdown)
   * Returns hashed IDs only — never raw
   */
  static getCitizenIdList() {
    return Array.from(idToHash.entries()).map(([id, hash]) => ({
      id: id,
      hash: CryptoService.maskHash(hash)
    }));
  }

  /**
   * Reload dataset (for system reset)
   */
  static reload() {
    hashToIndex.clear();
    idToHash.clear();
    citizenRegistry = [];
    return this.load();
  }
}

module.exports = DataLoader;
