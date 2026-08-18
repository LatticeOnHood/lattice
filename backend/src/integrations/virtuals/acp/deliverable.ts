/**
 * Schema-conformant projection of the report for ACP delivery.
 *
 * The registered offering declares `chain`, `token`, `checks` and `sources` as
 * `"type": "string"` — the EconomyOS offering builder flattens Object and Array
 * fields to string. Delivering real nested JSON against that schema risks
 * failing validation on every job.
 *
 * So the wire format for ACP stringifies exactly those four fields, and nothing
 * else. `GET /api/v1/verify/:address` keeps returning proper JSON — the API is
 * not bent to fit a form builder. If the offering later gains real Object and
 * Array types, delete this module and submit the report directly.
 */

import { VerificationReport } from "../reportSchema";

/** Fields the registered offering types as string but the report models richly. */
export const STRINGIFIED_FIELDS = ["chain", "token", "checks", "sources"] as const;

export interface AcpDeliverable {
  schemaVersion: string;
  address: string;
  generatedAt: string;
  disclaimer: string;
  chain: string;
  token: string;
  checks: string;
  sources: string;
}

export function toAcpDeliverable(report: VerificationReport): AcpDeliverable {
  return {
    schemaVersion: report.schemaVersion,
    address: report.address,
    generatedAt: report.generatedAt,
    disclaimer: report.disclaimer,
    chain: JSON.stringify(report.chain),
    token: JSON.stringify(report.token),
    checks: JSON.stringify(report.checks),
    sources: JSON.stringify(report.sources),
  };
}
