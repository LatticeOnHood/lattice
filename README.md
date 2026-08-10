# Lattice 🔮

![CI](https://github.com/NotADeveloper7/lattice/actions/workflows/backend.yml/badge.svg)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)
![Bun](https://img.shields.io/badge/Bun-1.x-000000?logo=bun&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-15-000000?logo=nextdotjs&logoColor=white)
![Solana](https://img.shields.io/badge/Solana-GMGN_API-14F195?logo=solana&logoColor=white)
![Production](https://img.shields.io/badge/Production-Live-success?logo=render&logoColor=white)

**Lattice** is an automated token audit and verification system operating across X (Twitter) and Telegram. Powered by the **GMGN API**, Lattice extracts detailed on-chain intelligence when users mention the bot with a contract address (CA), delivering instant security & risk reports.

---

## Live Deployments

- **Backend API (Render):** `https://lattice-api-q16p.onrender.com`
- **Health Check:** [`https://lattice-api-q16p.onrender.com/health`](https://lattice-api-q16p.onrender.com/health)

---

## Audit Metrics & Scan Types

| Metric Category | Indicators Scanned | Risk Level Impact |
| :--- | :--- | :--- |
| **Holder Distribution** | Total Holder Count, Top 10 Holder %, Top 20 Holder % | High concentration flags high dumping risk |
| **Dev Holdings** | Dev Wallet Balance %, Dev Sold %, Dev Burned % | Identifies dev rug pulls and dev dump activity |
| **Bundler & Snipers** | Bundled Wallet Clusters, Launch Slot Buys, Supply % held by Bundles | Detects insider manipulation at launch |
| **Market Data** | Market Cap, Liquidity Pool (LP) Status, 24h Volume | Evaluates market depth & liquidity health |
| **Security Score** | Mint Authority, Freeze Authority, Honeypot Check | Standard security safety verification |

---

## How It Works

| Step | Action | Description |
| :--- | :--- | :--- |
| `1` | **Trigger** | User tags `@LatticeBot` on X, sends a DM on Telegram, or posts a Contract Address in a group. |
| `2` | **Extraction** | Lattice extracts the token CA and queries GMGN API for holder & transaction metrics. |
| `3` | **Analysis** | Dev holdings, bundler cluster maps, and holder concentration are computed. |
| `4` | **Reporting** | Formatted audit card with risk status and metrics is replied back to the user. |

---

## API Endpoints

| Method | Endpoint | Description | Status |
| :--- | :--- | :--- | :--- |
| `GET` | `/health` | Backend service health check | `200 OK` |

---

## Repository Structure

```
lattice/
├── app/                  # Next.js 15 App Router (Frontend)
│   ├── globals.css       # Tailwind CSS & Theme Tokens
│   ├── layout.tsx        # Root HTML Layout
│   └── page.tsx          # Minimalist 1-Viewport Coming Soon Landing Page
├── backend/              # Bun + Express Backend Service
│   ├── src/
│   │   ├── app.ts        # Express App setup & middleware
│   │   ├── index.ts      # HTTP Server & DB Migration Entrypoint
│   │   ├── db/           # PostgreSQL pool & migration runner
│   │   └── routes/       # API Routes (/health)
│   ├── tests/            # Integration & Unit Tests
│   └── Dockerfile        # Container build definition
├── public/               # Static media & branding assets (logo, banners)
├── lib/                  # Shared UI utilities (`cn`)
├── .github/workflows/    # CI/CD pipeline (`backend.yml`)
├── AGENTS.md             # AI Agent workflow guidelines
├── README.md             # Project documentation
├── SECURITY.md           # Security reporting policy
├── CONTRIBUTING.md       # Development contribution guidelines
└── LICENSE               # MIT License
```

---

## Getting Started

### Prerequisites
- [Bun](https://bun.sh) (v1.x)
- PostgreSQL (optional for local DB test)

### Installation & Local Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/NotADeveloper7/lattice.git
   cd lattice
   ```

2. **Frontend (Next.js):**
   ```bash
   bun install
   bun dev
   ```
   Open `http://localhost:3000` in your browser.

3. **Backend (Bun + Express):**
   ```bash
   cd backend
   bun install
   bun run dev
   ```
   Backend will start on `http://localhost:3001`. Test the health route:
   ```bash
   curl http://localhost:3001/health
   ```

4. **Running Backend Tests:**
   ```bash
   cd backend
   bun test
   ```

---

## Tech Stack

- **Frontend:** Next.js 15, React 19, Tailwind CSS, TypeScript
- **Backend:** Bun, Express, PostgreSQL (`pg`), GMGN API integration
- **Deployment & CI/CD:** Render, GitHub Actions, Docker, GHCR
