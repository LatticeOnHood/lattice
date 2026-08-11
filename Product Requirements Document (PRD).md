# Product Requirements Document (PRD)

**Project:** Lattice (LAT) — On-Chain Verification Protocol  
**Version:** 1.0  
**Author:** Manus AI

---

## 1. Product Overview

**Lattice (LAT)** is an on-chain verification protocol delivered natively through X (and Telegram). Instead of moving money, **Lattice** answers the question every trader asks in the seconds after seeing a new token mentioned: is this safe, and is the project actually doing what it claims?

A user tags **@LatticeBot** with a token's contract address — in a reply, a quote, or a DM — and the bot responds in-thread with a structured report: liquidity, holder concentration, market cap, contract risk signals, and (where the project has published its tokenomics) a check of whether the project has actually honored its own stated commitments. No wallet connection, no signature, no gas, and no funds ever touch **Lattice**.

---

## 2. Target Audience

*   **Traders** evaluating a new token in the moment they see it mentioned, before they buy.
*   **Project communities** who want a neutral, on-chain "receipt" they can point skeptics to.
*   **Creators/influencers** who get tagged into shill threads and want a fast, credible way to check a CA before engaging or endorsing.

---

## 3. Core Features & Requirements

### 3.1 Social Bot Architecture (X & Telegram)

The core interface is still **@LatticeBot** — but every command is now a read-only query, never a transaction.

*   **Command parsing:** `check [contract_address]`, or a bare CA in a reply to the bot, or `check @projecthandle` for projects that have self-verified (§3.4).
*   **Execution:** fully read-only. No prompt for signature, no deep link to a wallet. A report can be generated with zero interaction from the sender beyond the tag itself.
*   **Response format:** a compact scorecard threaded as a reply (X) or a message (Telegram): Verdict, Liquidity, Top-10 holder %, Market Cap, LP-lock status, Ownership status. Kept self-contained in the reply text — no raw link — consistent with staying inside X's content rules; a deeper report lives behind the bot's bio link for anyone who wants it.

### 3.2 The Verification Report

| Check | What it answers |
| :--- | :--- |
| **Liquidity** | Total liquidity across known DEX pools for the token, and whether the LP tokens are locked or burned (and until when). |
| **Holder analysis** | Holder count, top-10 / top-50 concentration, and whether top holders are known LP/CEX/burn addresses vs. unlabeled wallets. |
| **Market cap / FDV** | Computed from circulating and total supply × current price. |
| **Contract signals** | Ownership renounced? Mint function present or disabled? Upgradeable/proxy? Source verified on the chain's explorer? |
| **Honeypot / sell-test** | Simulated buy-then-sell (or an existing honeypot-detection service) to catch tokens that can be bought but not sold. |

### 3.3 "Promises Kept" Compliance Check

This is the product's primary differentiator.

*   Any project can register its declared tokenomics with **Lattice** via the web app: total supply, LP lock % and duration, treasury/vault %, vesting schedule.
*   **Lattice** periodically re-checks the project's actual on-chain state against those declared commitments.
*   The report surfaces a dedicated section, e.g. "Declared 70% to LP, locked — confirmed on-chain" or "Declared 12-month vault lock — vault emptied early, flagged."
*   Works best for standardized launch mechanisms (e.g. a Clanker-style vault/lock contract shape); for arbitrary unregistered tokens, only the generic checks in §3.2 apply since there's no declared baseline to check against.

### 3.4 Project Self-Verification

*   Projects connect their X/Telegram handle and their token's official contract address on the **Lattice** web app.
*   Proof of control is a signed message (not a transaction) from the deployer/owner wallet, or a one-time code posted from the project's official account — never a fund movement.
*   Once verified, `check @handle` resolves directly to the audited CA, and reports carry a "Verified Project" badge.

### 3.5 Rate Limiting & Abuse Prevention

Checking a CA is cheap for the requester but costs the backend RPC/API budget. Strict per-account rate limits on the bot, plus a short-lived cache (2–5 minutes) of recent reports per CA, keep a trending token from hammering the data providers every time it's re-tagged.

---

## 4. Technical Stack (Recommended)

*   **Chain data:** Robinhood Chain RPC (Arbitrum Orbit L2) + its Blockscout explorer API for holder lists, contract verification and source. Architecture stays chain-agnostic enough to add more chains later — token safety-checking is inherently a multi-chain problem.
*   **Liquidity / market data:** direct DEX pool reads via the chain's router/factory, or a data-aggregator API where available.
*   **Honeypot detection:** an existing honeypot-check API/service, or a self-hosted simulated buy/sell against a forked RPC call.
*   **Social APIs:** X API v2, Telegram Bot API.
*   **Backend:** Node.js/TypeScript, MongoDB — now storing cached reports, verified-project registrations and declared tokenomics, instead of wallet-to-handle mappings and pending transactions.
*   **Frontend:** Next.js — a project-verification dashboard and a public report-lookup page.

---

## 5. Security & Auditing

*   **No custody, no signing, no funds:** **Lattice** never touches user funds, which removes smart-contract custody risk from the picture entirely.
*   **Data integrity:** every scorecard discloses its data sources and timestamp, not just a verdict — a false "Verified" or "Safe" signal carries real financial-harm risk.
*   **Disclaimers:** "not financial advice," heuristics can be wrong, always DYOR — important given the reputational and potential legal exposure of a "scam or not" framing.
*   **Rate limiting:** as in §3.5, to control cost and prevent abuse.
