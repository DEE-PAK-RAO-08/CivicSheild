# 🛡️ CivicShield v6.0: "The Sovereignty Protocol"
### *The Ultimate Hackathon-Winning Welfare Disbursement & Fraud Intelligence Engine*

**CivicShield v6.0** is the pinnacle of sovereign welfare security. It is more than a dashboard; it is a **self-healing, decentralized intelligence mesh** designed to protect national interests against high-velocity fraud, identity rings, and budgetary exploits. 

Built with **React 19**, **Three.js**, and a custom **sequential validation pipeline**, CivicShield transforms standard disbursement into a research-grade security operation.

---

## 🌌 Core "God-Tier" Features

### 1. 🧬 Autonomous Self-Healing Ledger
- **The Problem**: A single database tamper can collapse the entire trust in a government's registry.
- **The Solution**: CivicShield implements an **Immutable Hash-Linked Ledger** (SHA-256). If a block is tampered with (e.g., via the Attack Lab), the **Verification Engine** detects the break in the chain and marks it for forensic analysis.
- **Visual**: Real-time 3D graph of the blockchain showing node integrity and link health.

### 2. 🏛️ 3-Gate Sequential Validation Pipeline
Every claim must pass three rigorous cryptographic and logic gates:
1.  **Gate 1: Eligibility (Identity)** — Cryptographically verifies Citizen ID and Income Tier.
2.  **Gate 2: Budget (Austerity)** — Checks real-time budget availability using a **Greedy Knapsack Optimization** to prioritize low-income tiers during austerity.
3.  **Gate 3: Frequency (Temporal)** — Prevents "velocity attacks" using a **Finite State Machine (FSM)** and **Z-Score** surge detection.

### 3. 🛡️ Secure Authentication & Operative Protocol (PROG-AUTH)
- **Firebase Core**: Implements a high-security lock on the entire application using **Firebase Authentication**.
- **reCAPTCHA v3**: Armed with an anti-bot protocol integrated directly into the login/registration forms to prevent automated credential stuffing.
- **Gmail OTP Verification**: A custom cybersecurity simulation that requires a 6-digit dynamic OTP (One-Time Password) dispatched to `@gmail.com` addresses for new operative clearance.
- **Google OAuth 2.0**: Secure Google SSO integration for seamless, verified access.
- **Session Persistence**: Implements "Remember Me" logic via `localStorage` to pre-fill operative credentials for rapid re-authentication.

### 4. 🧠 Neural Fraud Intelligence (XAI)
- **Identity Ring Detection**: Uses **Union-Find (DSU)** to detect clusters of suspicious identities sharing common traits or regional surges.
- **Statistical Forensics**: Implements **Benford's Law** to detect anomalous disbursement amounts that deviate from natural logarithmic distributions.
- **Temporal Surge Analysis**: Uses **EWMA (Exponentially Weighted Moving Average)** and **Shannon Entropy** to distinguish between natural surges and coordinated bot attacks.

### 5. 🔬 Forensic Lab & Attack Simulation
- **Attack Lab**: A controlled environment to execute **Direct Ledger Modifications**, **Phantom Identity Injections**, and **Concurrency Stress Tests** (God Mode).
- **Forensic Profiling**: Automatically generates threat profiles including **Jaccard Similarity** scores and **Attack Classification** (e.g., "Botnet Surge", "Targeted Infiltration").

### 6. 📱 Premium Mobile-First Design
- **Aesthetics**: Dark-mode cybersecurity aesthetic with **Glassmorphism**, vibrant HSL-tailored accents, and smooth micro-animations.
- **Responsiveness**: Fully optimized for mobile view with custom responsive grids and touch-friendly interactive elements.

---

## 🛠️ High-Performance Tech Stack

### Frontend Hub (The Dashboard)
- **Framework**: React 19 (Concurrent Mode) & Vite 6.
- **Visuals**: Three.js (3D Ledger), Force-Graph (Network Security), Recharts (Telemetry).
- **Styling**: Vanilla CSS3 + Glassmorphism + Dynamic CSS Grids.
- **Animations**: Framer Motion (State-based layout transitions).
- **Authentication**: Firebase SDK & Google reCAPTCHA v3.

### Security Engine (The Backend)
- **Runtime**: Node.js & Express.
- **Cryptography**: SHA-256 (Hash-chaining) and crypto-secure salting.
- **Forensics**: D3.js (Spatial data mapping) and native JS implementations of DSU (Union-Find).
- **Database**: In-memory high-velocity caching with persistent storage from `CivicShield_Dataset.xlsx`.

---

## 📡 Security API Catalog (The Pipeline)

CivicShield exposes a suite of protected endpoints for real-time welfare governance:

### 1. 📋 Claims & Disbursement
- `POST /api/claims/process`: Executes the 3-Gate Sequential Validation Pipeline.
- `GET /api/claims/history`: Forensic audit of all recent claim attempts.

### 2. ⛓️ Ledger Auditing
- `GET /api/ledger`: Retrieves the full immutable hash-linked blockchain.
- `GET /api/ledger/verify`: Triggers a total chain integrity sweep (detects tampers).
- `GET /api/ledger/:id`: Deep-inspect a specific disbursement block.

### 3. 🛡️ System Control (Kill-Switch)
- `GET /api/admin/status`: Real-time system health and budget status.
- `POST /api/admin/pause/resume`: Master switches for emergency halting.
- `POST /api/admin/reset`: Complete system wipe and budgetary re-initialization.

### 4. 🧠 Intelligence & Fraud (XAI)
- `GET /api/admin/fraud-rings`: Scans for identity clusters using Union-Find (DSU).
- `GET /api/admin/SURGE-status`: Temporal surge analysis via EWMA (Z-Score).
- `GET /api/analytics/region-heatmap`: Geographical disbursement intensity mapping.

### 5. 🧪 The Attack Lab (Demo)
- `POST /api/attacks/tamper-ledger`: Manually inject unauthorized data into a block.
- `POST /api/attacks/fake-identity`: Test the 3-Gate pipeline against botnet surges.

---

## 📂 Project Structure

```text
CivicShield-v6/
├── client/                 # React 19 Frontend
│   ├── src/
│   │   ├── components/     # High-end UI (AttackLab, Analytics, etc.)
│   │   ├── App.jsx         # Main Hub & Routing
│   │   └── index.css       # Premium Design System
├── server/                 # Security Backend
│   ├── services/           # The "Brains" (Validation, Fraud, Ledger)
│   │   ├── validationPipeline.js
│   │   ├── fraudClusterService.js
│   │   └── dynamicBudgetService.js
│   └── index.js            # API Entry Point
└── README.md               # You are here
```

---

## 🚀 The "Sovereign Launch" Sequence

### 1. Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher

### 2. Initialization
```bash
# Clone the repository
git clone https://github.com/your-username/civicshield-v6.git
cd civicshield-v6

# Install dependencies (Both Client & Server)
npm install
cd client && npm install
cd ../server && npm install
```

### 3. Execution
Run both the security engine and the intelligence hub simultaneously:

**Terminal 1 (Backend Engine):**
```bash
cd server
npm run dev
```

**Terminal 2 (Intelligence Hub):**
```bash
cd client
npm run dev
```

The app will be live at `http://localhost:5173`.

---

## 🎮 The "Winner's Demo" Walkthrough

### Part 0: Secure Authentication (Operative Protocol)
1.  Launch the app. Experience the cinematic **3.2s Splash Screen**.
2.  The system locks into the **Secure Authentication Protocol**.
3.  **Registration**: Click "Request Clearance Registration". 
    *   Enter a `@gmail.com` address.
    *   Solve the **reCAPTCHA** anti-bot validation.
    *   Click **Dispatch OTP**.
    *   Enter the 6-digit code (Check browser console `F12` for the demo code).
4.  **Google SSO**: Demonstrate the one-click **Google OAuth** login bypass.

### Part 1: The Trust Pipeline
1.  Navigate to **Submit Claim**.
2.  Input a 12-digit Citizen ID (or pick from the dropdown).
3.  Note the **Sequential Validation** process—explain how Gate 2 changes its behavior based on the current system budget.
4.  Show the **Approved Disbursement** and the instant block addition to the blockchain.

### Part 2: The Attack & Self-Healing
1.  Go to the **Attack Lab**.
2.  Trigger a **Direct Ledger Modification** to block #0.
3.  Switch to the **Blockchain** tab. The system will detect the hash break (`VERIFICATION FAILED`).
4.  Demonstrate the **Tamper Report** showing the exact injection point.

### Part 3: Advanced Intelligence
1.  Open the **Intelligence** dashboard.
2.  Showcase the **Syndicate Mapping** (Union-Find) cluster detections.
3.  Explain the **Benford's Law** chart—how it detects "humanized" fraud patterns.
4.  Trigger a "God Mode" stress test to watch the **Real-time Event Stream** handle 100+ concurrent requests.

---

## 🌟 Future Roadmap
- [x] **Firebase Integration**: Multi-factor authentication & Google SSO.
- [x] **Anti-Bot Protocol**: Integrated reCAPTCHA validation.
- [ ] **Quantum Integration**: Transitioning from SHA-256 to CRYSTALS-Dilithium signatures.
- [ ] **ZKP-Mobile**: Zero-Knowledge Proof generation on-device for total privacy.
- [ ] **Sovereign Mesh**: Distributed ledger across multiple regional government nodes.

---

*Built for the Highest Stakes. CivicShield v6.0—Securing Sovereignty, One Block at a Time.*
