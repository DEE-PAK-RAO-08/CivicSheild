const fs = require('fs');
const path = require('path');

const CITIZENS_PATH = 'c:\\Users\\LENOVO\\CivicSheild 2\\server\\data\\citizens.json';
const STATE_PATH = 'c:\\Users\\LENOVO\\CivicSheild 2\\server\\data\\system-state.json';
const LEDGER_PATH = 'c:\\Users\\LENOVO\\CivicSheild 2\\server\\data\\ledger.json';
const EVENTS_PATH = 'c:\\Users\\LENOVO\\CivicSheild 2\\server\\data\\events.json';

try {
  // Hard Reset Citizens
  const citizens = JSON.parse(fs.readFileSync(CITIZENS_PATH, 'utf-8'));
  const cleanCitizens = citizens.map(c => ({
    ...c,
    Claim_Count: 0,
    Last_Claim_Date: null,
    Trust_Score: 90
  }));
  fs.writeFileSync(CITIZENS_PATH, JSON.stringify(cleanCitizens, null, 2));
  console.log('✅ Citizens scrubbed clean.');

  // Hard Reset State
  const state = JSON.parse(fs.readFileSync(STATE_PATH, 'utf-8'));
  state.status = 'ACTIVE';
  state.budget_remaining = 1000000;
  state.total_transactions = 0;
  state.approved_count = 0;
  state.rejected_count = 0;
  state.frozen_reason = null;
  fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));
  console.log('✅ System State restored to ₹10,00,000.');

  // Clear Ledger & Events
  fs.writeFileSync(LEDGER_PATH, '[]');
  fs.writeFileSync(EVENTS_PATH, '[]');
  console.log('✅ Ledger and Event tables truncated.');

} catch (e) {
  console.error('❌ Reset failed:', e.message);
  process.exit(1);
}
