/**
 * Drives a full ACP job lifecycle against the real fulfilment handler, with no
 * credentials, no wallet, no settlement chain and no ACP SDK.
 *
 * Every event below is one ACP v2 emits for real:
 *   job.created -> budget.set -> job.funded -> job.submitted -> job.completed
 *                                                            \-> job.rejected
 *
 * Run:  bun run backend/scripts/acpMockJob.ts [contractAddress]
 */

import { handleVerifyTokenJob } from "../src/integrations/virtuals/acp/handler";
import {
  OFFERING_NAME,
  OFFERING_PRICE_USD,
  OFFERING_SLA_MINUTES,
} from "../src/integrations/virtuals/acp/offering";
import { evaluateReport } from "../src/integrations/virtuals/evaluator";
import { DEFAULT_ACP_CHAIN_ID } from "../src/integrations/virtuals/acp/provider";
import { CheckId } from "../src/integrations/virtuals/reportSchema";

const DEFAULT_ADDRESS = "0x5fc5360d0400a0fd4f2af552add042d716f1d168";

/** What a cautious client agent insists on before it acts on a token. */
const CLIENT_REQUIREMENTS: CheckId[] = ["liquidityUsd", "top10HoldersPct", "honeypot"];

function event(name: string, detail: string) {
  console.log(`  ${name.padEnd(16)} ${detail}`);
}

async function main() {
  const contractAddress = process.argv[2] || DEFAULT_ADDRESS;

  console.log(`\nACP mock job — offering "${OFFERING_NAME}"`);
  console.log(`  price $${OFFERING_PRICE_USD.toFixed(2)} · SLA ${OFFERING_SLA_MINUTES}min · settlement Robinhood Chain ${DEFAULT_ACP_CHAIN_ID} mainnet (simulated)\n`);

  const startedAt = Date.now();

  event("job.created", `client requests ${OFFERING_NAME}({ contractAddress: "${contractAddress}" })`);
  event("budget.set", `provider quotes $${OFFERING_PRICE_USD.toFixed(2)}`);
  event("job.funded", "client escrows (simulated — no chain touched)");

  const outcome = await handleVerifyTokenJob({ contractAddress });
  const elapsedMs = Date.now() - startedAt;

  if (outcome.status === "rejected") {
    event("job.rejected", outcome.reason);
    console.log(`\nRESULT: rejected in ${elapsedMs}ms\n`);
    process.exit(1);
  }

  const report = outcome.deliverable;
  const available = Object.entries(report.checks).filter(([, c]) => c.available);
  const unavailable = Object.entries(report.checks).filter(([, c]) => !c.available);

  event(
    "job.submitted",
    `report v${report.schemaVersion} · ${available.length} checks available, ${unavailable.length} declared unavailable`
  );

  // The evaluation phase: the client decides whether the evidence is sufficient.
  const verdict = evaluateReport(report, {
    require: CLIENT_REQUIREMENTS,
    maxAgeSeconds: OFFERING_SLA_MINUTES * 60,
  });

  if (verdict.pass) {
    event("job.completed", "client accepted — every required check present and fresh");
  } else {
    event("job.rejected", "client halted — required evidence missing");
  }

  console.log(`\n  delivered in ${elapsedMs}ms (SLA ${OFFERING_SLA_MINUTES * 60_000}ms)\n`);

  console.log(`  ${report.token?.symbol ?? "?"} — ${report.token?.name ?? "unknown"} on ${report.chain.name} (${report.chain.chainId})`);
  for (const [id, check] of Object.entries(report.checks)) {
    if (check.available) {
      const value = typeof check.value === "object" ? JSON.stringify(check.value) : String(check.value);
      console.log(`    ${"✓"} ${id.padEnd(18)} ${value}  [${check.source}]`);
    } else if (CLIENT_REQUIREMENTS.includes(id as CheckId)) {
      console.log(`    ${"✗"} ${id.padEnd(18)} UNAVAILABLE — ${check.reason}`);
    }
  }

  console.log(`\n  client required: ${CLIENT_REQUIREMENTS.join(", ")}`);
  if (verdict.pass) {
    console.log("  VERDICT: proceed\n");
  } else {
    console.log("  VERDICT: halt. Lattice refused to fake the checks it has not shipped:");
    for (const reason of verdict.reasons) console.log(`    - ${reason}`);
    console.log("");
  }
}

main().catch((err) => {
  console.error("mock job crashed:", err);
  process.exit(1);
});
