import { ALL_CHECK_IDS, REPORT_SCHEMA_VERSION } from "./reportSchema";

/**
 * JSON Schema for the verification report, served at `/api/v1/schema` so an
 * agent can discover the contract rather than having it hardcoded.
 */
export const VERIFICATION_REPORT_JSON_SCHEMA = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "https://api.latticehood.app/api/v1/schema",
  title: "Lattice Verification Report",
  description:
    "Read-only token verification report. Every check is either available with a " +
    "source and timestamp, or explicitly unavailable with a reason. An unavailable " +
    "check is never returned as a passing value.",
  type: "object",
  required: [
    "schemaVersion",
    "address",
    "chain",
    "generatedAt",
    "checks",
    "sources",
    "disclaimer",
  ],
  properties: {
    schemaVersion: { type: "string", const: REPORT_SCHEMA_VERSION },
    address: { type: "string", pattern: "^0x[a-f0-9]{40}$" },
    chain: {
      type: "object",
      required: ["name", "chainId"],
      properties: {
        name: { type: "string" },
        chainId: { type: "integer" },
      },
    },
    generatedAt: { type: "string", format: "date-time" },
    token: {
      type: ["object", "null"],
      properties: {
        name: { type: "string" },
        symbol: { type: "string" },
      },
    },
    checks: {
      type: "object",
      required: [...ALL_CHECK_IDS],
      additionalProperties: { $ref: "#/$defs/check" },
    },
    sources: {
      type: "array",
      items: {
        type: "object",
        required: ["name", "queriedAt"],
        properties: {
          name: { type: "string", enum: ["codex.io", "dexscreener"] },
          queriedAt: { type: "string", format: "date-time" },
        },
      },
    },
    disclaimer: { type: "string" },
  },
  $defs: {
    check: {
      oneOf: [
        {
          type: "object",
          required: ["available", "value", "source", "fetchedAt"],
          properties: {
            available: { const: true },
            value: {},
            source: { type: "string", enum: ["codex.io", "dexscreener"] },
            fetchedAt: { type: "string", format: "date-time" },
          },
        },
        {
          type: "object",
          required: ["available", "reason"],
          properties: {
            available: { const: false },
            reason: {
              type: "string",
              enum: ["not_implemented", "no_data_from_source", "no_declared_baseline"],
            },
            plannedPhase: { type: "string" },
            note: { type: "string" },
          },
        },
      ],
    },
  },
} as const;
