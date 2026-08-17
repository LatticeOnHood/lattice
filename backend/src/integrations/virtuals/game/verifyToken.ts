/**
 * `verify_token` as a G.A.M.E. executable function.
 *
 * A G.A.M.E. Worker calls this before an agent turns a token mention into a
 * recommendation or an action. Read-only in, evidence out.
 *
 * The definition is plain data and the executable is a plain async function, so
 * neither needs the G.A.M.E. SDK to exist or a GAME API key to be present. The
 * SDK adapter — when we have credentials — wraps `VERIFY_TOKEN_FUNCTION` and
 * forwards `executable`.
 */

import { handleVerifyTokenJob, HandlerDeps } from "../acp/handler";
import { evaluateReport } from "../evaluator";
import { CheckId, VerificationReport } from "../reportSchema";

export type ExecutableStatus = "done" | "failed";

export interface ExecutableResult {
  status: ExecutableStatus;
  /** Natural-language line the agent can reason over or surface verbatim. */
  feedback: string;
  data?: VerificationReport;
}

export interface FunctionArgument {
  name: string;
  type: string;
  description: string;
}

export const VERIFY_TOKEN_ARGS: readonly FunctionArgument[] = [
  {
    name: "contractAddress",
    type: "string",
    description:
      "Robinhood Chain token contract address in 0x EVM format. Required.",
  },
  {
    name: "requiredChecks",
    type: "string",
    description:
      "Optional comma-separated check ids the caller insists on, e.g. " +
      "'liquidityUsd,top10HoldersPct'. If any are unavailable the function " +
      "returns failed with the missing ids named, so the agent halts rather " +
      "than acting on absent evidence.",
  },
] as const;

export const VERIFY_TOKEN_DESCRIPTION =
  "Fetch a read-only Lattice verification report for a Robinhood Chain token " +
  "contract before sharing, recommending or acting on it. Returns liquidity, " +
  "market cap, holder concentration and creator wallet activity, each with its " +
  "own source and timestamp. Checks Lattice has not shipped are reported as " +
  "unavailable with a reason — never as a passing value. Never moves funds, " +
  "never requests a signature.";

function parseRequiredChecks(raw: unknown): CheckId[] {
  if (typeof raw !== "string" || raw.trim() === "") return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean) as CheckId[];
}

function summarise(report: VerificationReport): string {
  const parts: string[] = [];
  const { liquidityUsd, marketCap, top10HoldersPct, holderCount } = report.checks;

  if (liquidityUsd.available) parts.push(`liquidity $${Number(liquidityUsd.value).toLocaleString()}`);
  if (marketCap.available) parts.push(`market cap $${Number(marketCap.value).toLocaleString()}`);
  if (holderCount.available) parts.push(`${Number(holderCount.value).toLocaleString()} holders`);
  if (top10HoldersPct.available) parts.push(`top-10 hold ${Number(top10HoldersPct.value).toFixed(2)}%`);

  return parts.length ? parts.join(", ") : "no market data available";
}

export async function executeVerifyToken(
  args: Record<string, unknown>,
  deps: HandlerDeps = {}
): Promise<ExecutableResult> {
  const outcome = await handleVerifyTokenJob(
    { contractAddress: args.contractAddress },
    deps
  );

  if (outcome.status === "rejected") {
    return { status: "failed", feedback: outcome.reason };
  }

  const report = outcome.deliverable;
  const required = parseRequiredChecks(args.requiredChecks);

  if (required.length > 0) {
    const verdict = evaluateReport(report, { require: required });
    if (!verdict.pass) {
      return {
        status: "failed",
        feedback:
          `Required evidence is not available for ${report.address}: ` +
          `${verdict.missing.join(", ")}. Do not proceed on this token. ` +
          verdict.reasons.join(" "),
        data: report,
      };
    }
  }

  const symbol = report.token?.symbol ?? "token";

  return {
    status: "done",
    feedback:
      `Lattice report for ${symbol} (${report.address}) on ${report.chain.name}: ` +
      `${summarise(report)}. Generated ${report.generatedAt}. ` +
      `${report.disclaimer}`,
    data: report,
  };
}

/** The definition a G.A.M.E. Worker registers. */
export const VERIFY_TOKEN_FUNCTION = {
  name: "verify_token",
  description: VERIFY_TOKEN_DESCRIPTION,
  args: VERIFY_TOKEN_ARGS,
  executable: executeVerifyToken,
} as const;
