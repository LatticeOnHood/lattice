/**
 * The `verifyToken` offering, mirrored in code.
 *
 * The authoritative copy is the one registered on the EconomyOS agent page —
 * that is what other agents discover. This module exists so the registered
 * listing and the code that fulfils it cannot silently drift apart: the tests
 * assert the declared deliverable fields against the keys
 * `buildVerificationReport` actually emits.
 *
 * Change the registry listing, change this file in the same commit.
 */

export const OFFERING_NAME = "verifyToken";
export const OFFERING_PRICE_USD = 0.01;
export const OFFERING_SLA_MINUTES = 5;

export const OFFERING_DESCRIPTION =
  "Read-only on-chain verification for a Robinhood Chain (EVM, chain 4663) token " +
  "contract. Returns liquidity, market cap, FDV, 24h volume, price change, buy/sell " +
  "counts, holder count, top-10 holder concentration, and creator wallet activity — " +
  "each field carrying its own data source and fetch timestamp. Checks not yet " +
  "shipped are returned explicitly as unavailable with a reason, never as a passing " +
  "value. No wallet connection, no signature, no custody, no transaction.";

export interface OfferingField {
  name: string;
  type: "String" | "Number" | "Boolean" | "Object" | "Array";
  format: "Plain" | "Address" | "URL";
  description: string;
  required: boolean;
}

/** What a client agent must send. One field — every extra one is a rejection path. */
export const REQUIREMENT_FIELDS: readonly OfferingField[] = [
  {
    name: "contractAddress",
    type: "String",
    format: "Address",
    description: "Robinhood Chain token contract address in 0x EVM format (chain 4663).",
    required: true,
  },
] as const;

/** Top-level keys of the delivered report. Must match VerificationReport. */
export const DELIVERABLE_FIELDS: readonly OfferingField[] = [
  {
    name: "schemaVersion",
    type: "String",
    format: "Plain",
    description: "Version of the Lattice report schema, e.g. 1.0.0.",
    required: true,
  },
  {
    name: "address",
    type: "String",
    format: "Address",
    description: "The token contract address this report covers, lowercased.",
    required: true,
  },
  {
    name: "chain",
    type: "Object",
    format: "Plain",
    description:
      "The chain the report covers: name and chainId. The report subject is Robinhood " +
      "Chain (4663) regardless of which chain the ACP job settles on.",
    required: true,
  },
  {
    name: "generatedAt",
    type: "String",
    format: "Plain",
    description: "ISO-8601 timestamp of when the report was assembled.",
    required: true,
  },
  {
    name: "token",
    type: "Object",
    format: "Plain",
    description: "Token name and symbol.",
    required: false,
  },
  {
    name: "checks",
    type: "Object",
    format: "Plain",
    description:
      "Every verification check. Each is either available with a value, source and " +
      "fetchedAt, or unavailable with a reason such as not_implemented.",
    required: true,
  },
  {
    name: "sources",
    type: "Array",
    format: "Plain",
    description: "Data sources queried, each with a name and queriedAt timestamp.",
    required: true,
  },
  {
    name: "disclaimer",
    type: "String",
    format: "Plain",
    description: "Read-only heuristics. Not financial advice.",
    required: true,
  },
] as const;
