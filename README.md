# 📈 MicroStock Predictor — AI Daily Stock Intelligence & Limit Order Strategy Engine

An interactive, AI-driven daily stock recommendation web application tailored specifically for **micro-investors** (daily budget $\le \$200$, targeting up to **$100 daily profit goal**). The app parses morning financial news feeds, measures catalyst positivity (`+`), predicts End-Of-Day (EOD) price targets, and builds an automated **5-Stock Portfolio Allocation Strategy** with exact **Take-Profit Limit Sell Orders**.

![MicroStock Predictor Dashboard](public/screenshots/microstock_dashboard.png)
*MicroStock Predictor Dashboard showing $200 daily budget allocation, Top 5 limit order strategy, and $82.40 daily profit progress gauge.*

---

## ✨ Key Features

- **💰 $200 Micro-Investor Daily Budget Engine**:
  - Automatically splits your daily budget ($50 to $500, default **$200**) across 5 high-momentum picks (**$40 allocation per stock**).
- **📰 Morning News AI Sentiment Parser**:
  - Evaluates morning press releases, earnings beats, FDA approvals, analyst upgrades, and retail momentum with positivity (`+`), neutral (`0`), and negativity (`-`) ratings (0-100 score).
- **🎯 Predictive EOD Price Targets & Signal Reporting**:
  - Generates clear signals in user-requested format:
    `GOOG : [+] : Should go by 34% , currently at $50.00, may go upto $67.00 EOD`
- **⚡ Automated Take-Profit Limit Sell Orders**:
  - Recommends exact fractional share purchases and sets take-profit limit sell orders at predicted EOD targets (e.g., *"Buy 0.80 shares GOOG @ $50.00, Set Limit Sell @ $67.00"*).
- **🛡️ 5% Stop-Loss Downside Guard**:
  - Includes automated stop-loss protection triggers at 5% below entry price to cap daily risk.
- **🚀 One-Click Broker Order Execution Simulator**:
  - Transmits simulated limit sell orders directly into brokerage APIs (Robinhood / Fidelity / Schwab) with celebratory confetti.

---

## 📊 Sample $200 Top 5 Daily Portfolio Output

| Ticker | Company | Positivity Rating | $200 Allocation | Current Price | Target EOD Price | Limit Sell Order | Est. Daily Profit |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **GOOG** | Alphabet Inc. | `[+] Score 96` | **$40.00** (0.80 sh) | **$50.00** | **$67.00** (+34%) | `Set Limit @ $67.00` | **+$13.60** |
| **NVDA** | NVIDIA Corp. | `[+] Score 94` | **$40.00** (0.32 sh) | **$125.00** | **$156.25** (+25%) | `Set Limit @ $156.25` | **+$10.00** |
| **PLTR** | Palantir Tech | `[+] Score 91` | **$40.00** (1.42 sh) | **$28.00** | **$36.40** (+30%) | `Set Limit @ $36.40` | **+$12.00** |
| **SOFI** | SoFi Tech | `[+] Score 89` | **$40.00** (4.70 sh) | **$8.50** | **$11.05** (+30%) | `Set Limit @ $11.05` | **+$12.00** |
| **AMD** | Adv. Micro Devices | `[+] Score 88` | **$40.00** (0.28 sh) | **$140.00** | **$168.00** (+20%) | `Set Limit @ $168.00` | **+$8.00** |
| **TOTAL** | **5 Positions** | **Bullish** | **$200.00** | — | **$282.40 EOD** | **All Limits Placed** | <strong className="text-emerald-400">+$82.40 (+41.2% ROI)</strong> |

---

## 🚀 Quick Start / Installation & Execution

### Prerequisites

- **Node.js**: `v18.0.0` or higher
- **npm**: `v9.0.0` or higher

### 1. Clone & Navigate to Project

```bash
cd /config/.gemini/antigravity/scratch/micro-stock-advisor
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Run Development Server

```bash
npm run dev
```

Open **`http://localhost:3010`** in your browser.

---

## 📦 Production Build

```bash
npm run build
npm run preview
```

---

## 🛠️ Technology Stack

- **Core**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS CDN, Dark Glassmorphism Design System
- **Charts & Animations**: Recharts, Canvas Confetti
- **Icons**: Lucide React

---

## 📄 License

MIT License — free for micro-investors and open-source developers!
