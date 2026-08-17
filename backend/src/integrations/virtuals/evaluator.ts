/**
 * The evidence gate.
 *
 * A client agent asks for a report, then checks the required fields are
 * actually present and fresh before its own workflow advances. This is a pure
 * function with no network and no dependencies, so it runs identically inside
 * a G.A.M.E. worker, inside an ACP evaluation phase, or in a unit test.
 */

import { CheckId, VerificationReport, isAvailable } from "./reportSchema";

export interface EvaluationRequirements {
  /** Checks that must be `available` for the report to pass. */
  require?: CheckId[];
  /** Reject a required check whose `fetchedAt` is older than this. */
  maxAgeSeconds?: number;
  /** Reject a report built by a schema major version the caller does not know. */
  expectSchemaMajor?: number;
}

export interface EvaluationResult {
  pass: boolean;
  /** Required checks that came back unavailable. */
  missing: CheckId[];
  /** Required checks that were available but older than `maxAgeSeconds`. */
  stale: CheckId[];
  /** One human-readable line per failure, safe to surface as agent feedback. */
  reasons: string[];
}

function majorOf(schemaVersion: string): number {
  return Number.parseInt(schemaVersion.split(".")[0] ?? "", 10);
}

export function evaluateReport(
  report: VerificationReport,
  requirements: EvaluationRequirements = {},
  evaluatedAt: Date = new Date()
): EvaluationResult {
  const { require = [], maxAgeSeconds, expectSchemaMajor } = requirements;

  const missing: CheckId[] = [];
  const stale: CheckId[] = [];
  const reasons: string[] = [];

  if (expectSchemaMajor !== undefined) {
    const actual = majorOf(report.schemaVersion);
    if (actual !== expectSchemaMajor) {
      reasons.push(
        `Schema major version mismatch: expected ${expectSchemaMajor}, report is ${report.schemaVersion}.`
      );
    }
  }

  for (const id of require) {
    const check = report.checks[id];

    if (!check) {
      missing.push(id);
      reasons.push(`Required check "${id}" is not present in this schema version.`);
      continue;
    }

    if (!isAvailable(check)) {
      missing.push(id);
      const phase = check.plannedPhase ? ` (planned phase ${check.plannedPhase})` : "";
      reasons.push(`Required check "${id}" is unavailable: ${check.reason}${phase}.`);
      continue;
    }

    if (maxAgeSeconds !== undefined) {
      const fetchedMs = Date.parse(check.fetchedAt);
      if (Number.isNaN(fetchedMs)) {
        stale.push(id);
        reasons.push(`Required check "${id}" has an unparseable fetchedAt timestamp.`);
        continue;
      }
      const ageSeconds = (evaluatedAt.getTime() - fetchedMs) / 1000;
      if (ageSeconds > maxAgeSeconds) {
        stale.push(id);
        reasons.push(
          `Required check "${id}" is ${Math.round(ageSeconds)}s old, older than the ${maxAgeSeconds}s limit.`
        );
      }
    }
  }

  return {
    pass: reasons.length === 0,
    missing,
    stale,
    reasons,
  };
}
