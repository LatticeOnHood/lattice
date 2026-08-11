# AGENTS.md — Lattice Project Instructions

## Overview
Lattice is a token audit and verification tool operating across X (Twitter) and Telegram, powered by the GMGN API.

## Repository Rules & Standards
1. **Package Manager:** Always use **Bun** (`bun install`, `bun test`, `bun run dev`). Do NOT use npm, yarn, or pnpm.
2. **Monorepo Structure:**
   - Frontend at root (`/`) powered by Next.js 15 App Router.
   - Backend at `/backend` powered by Bun + Express + PostgreSQL.
3. **CI/CD:** GitHub Actions workflow lives in `.github/workflows/backend.yml`. Ensure repository tags for GHCR remain lowercase.
4. **Testing:** Run backend integration tests with `bun test` inside `/backend`.
5. **Environment Variables:** Keep secret keys in `.env` (never commit `.env` files). Use `.env.example` as the canonical template.
