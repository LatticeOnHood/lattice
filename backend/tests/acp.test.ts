import { describe, expect, it } from "bun:test";
import { DexScreenerTokenMetrics } from "../src/services/dexscreener";
import { buildVerificationReport } from "../src/integrations/virtuals/buildReport";
import { handleVerifyTokenJob, parseRequirement } from "../src/integrations/virtuals/acp/handler";
import { DELIVERABLE_FIELDS, REQUIREMENT_FIELDS } from "../src/integrations/virtuals/acp/offering";
import { executeVerifyToken } from "../src/integrations/virtuals/game/verifyToken";
import { DEFAULT_ACP_CHAIN_ID, readAcpConfig } from "../src/integrations/virtuals/acp/provider";
import { STRINGIFIED_FIELDS, toAcpDeliverable } from "../src/integrations/virtuals/acp/deliverable";

const ADDRESS = "0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168";
const AT = "2026-08-16T12:00:00.000Z";

function metrics(overrides: Partial<DexScreenerTokenMetrics> = {}): DexScreenerTokenMetrics {
  return {
    address: ADDRESS,
    name: "Global Dollar",
    symbol: "USDG",
    priceUsd: 1.0,
    priceNative: "$1.000000",
    marketCap: 358_706_719,
    fdv: 358_706_719,
    liquidityUsd: 5_698_411,
    volume24h: 99_563_812,
    priceChange24h: 0.006,
    buys24h: 103_630,
    sells24h: 105_269,
    dexId: "uniswap",
    pairAddress: "0xpair",
    holdersCount: 68_037,
    top10HoldersPct: 67.02,
    dataSource: "codex.io",
    ...overrides,
  };
}

const fetchOk = async () => metrics();
const fetchNone = async () => null;
const now = () => AT;

describe("offering declaration matches the code that fulfils it", () => {
  it("declares exactly the top-level keys the report emits", () => {
    const report = buildVerificationReport(metrics(), { generatedAt: AT });

    const declared = DELIVERABLE_FIELDS.map((f) => f.name).sort();
    const actual = Object.keys(report).sort();

    expect(declared).toEqual(actual);
  });

  it("requires only the one field the handler parses", () => {
    expect(REQUIREMENT_FIELDS.map((f) => f.name)).toEqual(["contractAddress"]);
    expect(REQUIREMENT_FIELDS[0].required).toBe(true);
    expect(REQUIREMENT_FIELDS[0].format).toBe("Address");
  });

  it("gives every declared field a description, which the registry enforces", () => {
    for (const field of [...REQUIREMENT_FIELDS, ...DELIVERABLE_FIELDS]) {
      expect(field.description.length).toBeGreaterThan(0);
    }
  });
});

describe("parseRequirement — never trusts the upstream validator", () => {
  it("accepts a well-formed payload", () => {
    expect(parseRequirement({ contractAddress: ADDRESS })).toEqual({ contractAddress: ADDRESS });
  });

  it.each([
    [null, "object"],
    ["0xabc", "object"],
    [{}, "required"],
    [{ contractAddress: "" }, "required"],
    [{ contractAddress: "not-an-address" }, "not a valid EVM"],
    [{ contractAddress: 42 }, "required"],
  ])("rejects %p", (raw, fragment) => {
    const result = parseRequirement(raw);
    expect(result).toHaveProperty("error");
    if ("error" in result) expect(result.error).toContain(fragment as string);
  });
});

describe("handleVerifyTokenJob — the ACP fulfilment path", () => {
  it("delivers a report for an indexed token", async () => {
    const outcome = await handleVerifyTokenJob({ contractAddress: ADDRESS }, { fetchToken: fetchOk, now });

    expect(outcome.status).toBe("delivered");
    if (outcome.status === "delivered") {
      expect(outcome.deliverable.token).toEqual({ name: "Global Dollar", symbol: "USDG" });
      expect(outcome.deliverable.chain.chainId).toBe(4663);
      expect(outcome.deliverable.generatedAt).toBe(AT);
    }
  });

  it("rejects rather than delivering an empty report for an unindexed token", async () => {
    const outcome = await handleVerifyTokenJob({ contractAddress: ADDRESS }, { fetchToken: fetchNone });

    expect(outcome.status).toBe("rejected");
    if (outcome.status === "rejected") expect(outcome.reason).toContain("No indexed liquidity pool");
  });

  it("turns an upstream failure into a rejection instead of throwing into the job loop", async () => {
    const boom = async () => {
      throw new Error("codex timeout");
    };
    const outcome = await handleVerifyTokenJob({ contractAddress: ADDRESS }, { fetchToken: boom });

    expect(outcome.status).toBe("rejected");
    if (outcome.status === "rejected") expect(outcome.reason).toContain("codex timeout");
  });
});

describe("readAcpConfig — the provider stays off unless fully configured", () => {
  const full = {
    ACP_ENABLED: "true",
    ACP_EVM_WALLET_ID: "txm54yq3zclnjoczy5swxa2v",
    ACP_AGENT_WALLET_ADDRESS: "0x2aa8000000000000000000000000000000000360",
    ACP_SIGNER_PRIVATE_KEY: "0xtest",
  } as NodeJS.ProcessEnv;

  it("returns null when the master switch is off, even with every credential set", () => {
    expect(readAcpConfig({ ...full, ACP_ENABLED: "false" })).toBeNull();
    expect(readAcpConfig({ ...full, ACP_ENABLED: undefined })).toBeNull();
  });

  it("returns null when any credential is missing rather than starting half-configured", () => {
    for (const key of ["ACP_EVM_WALLET_ID", "ACP_AGENT_WALLET_ADDRESS", "ACP_SIGNER_PRIVATE_KEY"]) {
      expect(readAcpConfig({ ...full, [key]: undefined })).toBeNull();
    }
  });

  it("defaults to Robinhood mainnet 4663, the chain the agent is registered on", () => {
    // The agent exists on api.acp.virtuals.io and not on api-dev, so 46630
    // would point the provider at a server where it does not exist.
    expect(readAcpConfig(full)?.chainId).toBe(DEFAULT_ACP_CHAIN_ID);
    expect(DEFAULT_ACP_CHAIN_ID).toBe(4663);
  });

  it("honours an explicit chain override", () => {
    expect(readAcpConfig({ ...full, ACP_CHAIN_ID: "84532" })?.chainId).toBe(84532);
  });
});

describe("toAcpDeliverable — matches the registered offering schema", () => {
  const report = buildVerificationReport(metrics(), { generatedAt: AT });
  const wire = toAcpDeliverable(report);

  it("sends every field the offering declares required", () => {
    for (const key of ["schemaVersion", "address", "chain", "generatedAt", "checks", "sources", "disclaimer"]) {
      expect(wire).toHaveProperty(key);
    }
  });

  it("stringifies exactly the fields the offering types as string", () => {
    for (const key of STRINGIFIED_FIELDS) {
      expect(typeof wire[key]).toBe("string");
    }
  });

  it("leaves genuinely scalar fields as plain strings, not double-encoded", () => {
    expect(wire.schemaVersion).toBe("1.0.0");
    expect(wire.address).toBe(report.address);
    expect(wire.generatedAt).toBe(AT);
    expect(wire.disclaimer).toBe(report.disclaimer);
  });

  it("round-trips without losing anything from the report", () => {
    expect(JSON.parse(wire.chain)).toEqual(report.chain);
    expect(JSON.parse(wire.token)).toEqual(report.token);
    expect(JSON.parse(wire.sources)).toEqual(report.sources);

    // Compare against the report itself rather than a hardcoded snapshot, so
    // this keeps testing round-trip fidelity as individual checks get shipped.
    const checks = JSON.parse(wire.checks);
    expect(Object.keys(checks)).toEqual(Object.keys(report.checks));
    expect(checks).toEqual(report.checks);
  });

  it("survives a null token without emitting the string \"undefined\"", () => {
    const wireNull = toAcpDeliverable({ ...report, token: null });
    expect(wireNull.token).toBe("null");
    expect(JSON.parse(wireNull.token)).toBeNull();
  });
});

describe("verify_token G.A.M.E. function", () => {
  it("returns done with a readable summary the agent can surface", async () => {
    const result = await executeVerifyToken({ contractAddress: ADDRESS }, { fetchToken: fetchOk, now });

    expect(result.status).toBe("done");
    expect(result.feedback).toContain("USDG");
    expect(result.feedback).toContain("top-10 hold 67.02%");
    expect(result.feedback).toContain("Not financial advice");
    expect(result.data?.schemaVersion).toBe("1.0.0");
  });

  it("halts the agent when a required check is one Lattice has not shipped", async () => {
    const result = await executeVerifyToken(
      { contractAddress: ADDRESS, requiredChecks: "liquidityUsd,honeypot" },
      { fetchToken: fetchOk, now }
    );

    expect(result.status).toBe("failed");
    expect(result.feedback).toContain("Do not proceed");
    expect(result.feedback).toContain("honeypot");
    // The report still comes back so the agent can reason about what it did get.
    expect(result.data).toBeDefined();
  });

  it("proceeds when every required check is genuinely available", async () => {
    const result = await executeVerifyToken(
      { contractAddress: ADDRESS, requiredChecks: "liquidityUsd,top10HoldersPct" },
      { fetchToken: fetchOk, now }
    );

    expect(result.status).toBe("done");
  });

  it("fails cleanly on a malformed address without calling the indexer", async () => {
    let called = false;
    const spy = async () => {
      called = true;
      return metrics();
    };

    const result = await executeVerifyToken({ contractAddress: "nope" }, { fetchToken: spy });

    expect(result.status).toBe("failed");
    expect(called).toBe(false);
  });
});
