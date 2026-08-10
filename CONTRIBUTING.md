# Contributing to Lattice

Thank you for your interest in contributing to **Lattice**! We welcome community contributions to make token verification and auditing on X and Telegram safer, faster, and more detailed.

---

## What We're Looking For

Currently, we are focusing on:
- Integration of additional GMGN API endpoints (e.g., smart money tracking, rat trader detection).
- Enhancing Telegram & Twitter response message formatting and visual card render engines.
- Adding automated integration tests for backend API routes.

### Out of Scope
- Support for unverified third-party scraping APIs without API key authentication.
- Modifying core database schema without an accompanying SQL migration file.

---

## Development Setup

1. **Fork and Clone:**
   ```bash
   git clone https://github.com/your-username/lattice.git
   cd lattice
   ```

2. **Frontend Setup:**
   ```bash
   npm install
   npm run dev
   ```

3. **Backend Setup:**
   ```bash
   cd backend
   bun install
   bun run dev
   ```

4. **Run Tests:**
   ```bash
   cd backend
   bun test
   ```

---

## Workflow & Pull Request Guidelines

- Create a feature branch off `main` / `master`: `git checkout -b feature/my-feature-name`.
- Ensure type safety: `cd backend && bun run check`.
- Write tests for any new backend endpoint or database handler.
- Submit a PR with a clear, imperative commit message (e.g., `Add GMGN bundler detection handler`).
- Do not mix multiple unrelated concerns into a single PR.

---

## Bug Reports

If you encounter a bug or unexpected behavior:
1. Include the scanned token Contract Address (CA) and chain.
2. Provide expected output vs actual output received.
3. Attach relevant backend server logs or terminal stack traces.

---

## Security Vulnerabilities

For security issues, please do NOT open a public issue. Refer to [SECURITY.md](SECURITY.md) for reporting guidelines.
