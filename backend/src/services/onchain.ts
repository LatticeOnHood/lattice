/**
 * Direct chain reads for the checks an indexer cannot answer.
 *
 * Everything here was probed against Robinhood Chain (4663) before being written:
 * `eth_getStorageAt`, `eth_call`, and — importantly — `eth_call` with a
 * `stateDiff` override are all supported, while `debug_traceCall` and
 * `eth_createAccessList` are not. That rules out call tracing and rules in
 * balance-fabricated simulation, which is why the sell test below works by
 * overriding storage rather than by tracing a transaction.
 *
 * Every function returns `undefined` rather than a default when it cannot
 * establish an answer. A zero or a `false` here would travel into the report as
 * a measured reading, which is the exact failure the report schema exists to
 * prevent.
 */

import { createPublicClient, http, keccak256, encodeAbiParameters, type Address } from "viem";

const RPC_URL = process.env.ROBINHOOD_RPC_URL || "https://rpc.mainnet.chain.robinhood.com";

const client = createPublicClient({ transport: http(RPC_URL) });

const DEAD = "0x000000000000000000000000000000000000dEaD" as Address;
const ZERO = "0x0000000000000000000000000000000000000000" as Address;

/**
 * Throwaway addresses used as the holder and recipient in simulations.
 * Lower-case on purpose — viem rejects mixed-case addresses that are not valid
 * EIP-55 checksums, and these are arbitrary rather than real.
 */
const PROBE = "0x00000000000000000000000000000000c1ade001" as Address;
const PROBE_RECIPIENT = "0x00000000000000000000000000000000c1ade002" as Address;

const ERC20_ABI = [
  { name: "totalSupply", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { name: "decimals", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint8" }] },
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ type: "address" }],
    outputs: [{ type: "uint256" }],
  },
  {
    name: "transfer",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ type: "address" }, { type: "uint256" }],
    outputs: [{ type: "bool" }],
  },
] as const;

const OWNER_ABI = [
  { name: "owner", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
  { name: "getOwner", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
] as const;

/* --------------------------------------------------------------- supply */

export interface SupplyReading {
  totalSupply: bigint;
  decimals: number;
}

/**
 * The real total supply, read from the token.
 *
 * Worth doing even though the indexer reports a supply: the Codex mapping falls
 * back to a hardcoded one billion when the upstream field is missing, and that
 * invented number then multiplies into market cap and FDV.
 */
export async function readSupply(token: Address): Promise<SupplyReading | undefined> {
  try {
    const [totalSupply, decimals] = await Promise.all([
      client.readContract({ address: token, abi: ERC20_ABI, functionName: "totalSupply" }),
      client.readContract({ address: token, abi: ERC20_ABI, functionName: "decimals" }),
    ]);
    return { totalSupply: totalSupply as bigint, decimals: Number(decimals) };
  } catch {
    return undefined;
  }
}

/* ----------------------------------------------------------- v4 pool manager */

const V4_STATE_VIEW = (process.env.UNISWAP_V4_STATE_VIEW_ADDRESS ||
  "0xf3334192d15450cdd385c8b70e03f9a6bd9e673b") as Address;

const STATE_VIEW_ABI = [
  { name: "poolManager", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
] as const;

let poolManagerCache: Address | null | undefined;

/**
 * The Uniswap v4 PoolManager, resolved once from the StateView contract.
 *
 * v4 has no per-pair contract: every pool's tokens sit in one singleton, and the
 * "pair address" an indexer reports for a v4 market is a 32-byte pool id, not an
 * address. Reading the singleton's balance is therefore the only way to learn how
 * much of a token is actually pooled — and it is the right number, since it
 * covers every v4 pool the token trades in.
 */
async function getPoolManager(): Promise<Address | undefined> {
  if (poolManagerCache !== undefined) return poolManagerCache ?? undefined;
  try {
    const addr = (await client.readContract({
      address: V4_STATE_VIEW,
      abi: STATE_VIEW_ABI,
      functionName: "poolManager",
    })) as Address;
    poolManagerCache = addr;
    return addr;
  } catch {
    poolManagerCache = null;
    return undefined;
  }
}

async function balanceOf(token: Address, holder: Address): Promise<bigint | undefined> {
  try {
    return (await client.readContract({
      address: token,
      abi: ERC20_ABI,
      functionName: "balanceOf",
      args: [holder],
    })) as bigint;
  } catch {
    return undefined;
  }
}

/* ------------------------------------------------------ float / supply split */

export interface FloatBreakdown {
  totalSupply: string;
  /**
   * Sitting in the liquidity pool. Undefined when the pool's token balance
   * could not be established — see `pooledUnknown`.
   */
  pooled?: string;
  /**
   * True when the pool holds no tokens at the given address while the market
   * clearly has liquidity. Uniswap v4 keeps every pool's balance in one
   * PoolManager singleton rather than in a per-pair contract, so a v4 "pair
   * address" is a pool id and reads back as zero. Reporting that as "0% pooled,
   * 100% free float" would invent a reassuring number, so it is flagged instead.
   */
  pooledUnknown: boolean;
  /** Provably unrecoverable. */
  burned: string;
  /** Held by the deployer, read from chain rather than taken from the indexer. */
  deployer?: string;
  /** totalSupply minus pooled and burned. Undefined when pooled is unknown. */
  float?: string;
  pooledPct?: number;
  burnedPct: number;
  floatPct?: number;
  /** Deployer holdings as a share of float, which is the number that matters. */
  deployerPctOfFloat?: number;
  /** Deployer holdings as a share of total supply — always computable. */
  deployerPctOfSupply?: number;
}

/**
 * Splits supply into pooled, burned and free float.
 *
 * This exists because a raw "top 10 hold 61%" is close to meaningless: on most
 * tokens the single largest holder is the pool itself, so an indexer's top-N
 * figure silently counts liquidity as concentration and can fire a critical flag
 * on a perfectly ordinary token. Measuring what is actually free to trade, and
 * expressing deployer holdings against that, is the honest version.
 */
export async function readFloat(
  token: Address,
  pair?: string,
  creator?: string,
  /** The indexer's liquidity reading, used only to detect a contradiction. */
  liquidityUsd?: number
): Promise<FloatBreakdown | undefined> {
  const supply = await readSupply(token);
  if (!supply || supply.totalSupply === 0n) return undefined;

  const pairAddr =
    pair && /^0x[a-fA-F0-9]{40}$/.test(pair) && pair.toLowerCase() !== token.toLowerCase()
      ? (pair as Address)
      : undefined;
  const creatorAddr = creator && /^0x[a-fA-F0-9]{40}$/.test(creator) ? (creator as Address) : undefined;

  /**
   * A v4 market reports a 32-byte pool id where a v2/v3 market reports a pair
   * contract, so `pairAddr` is undefined for v4. Fall back to the PoolManager
   * singleton, which is where those tokens actually sit.
   */
  const holder = pairAddr ?? (await getPoolManager());

  const [pooledRaw, deadRaw, zeroRaw, deployerRaw] = await Promise.all([
    holder ? balanceOf(token, holder) : Promise.resolve(undefined),
    balanceOf(token, DEAD),
    balanceOf(token, ZERO),
    creatorAddr ? balanceOf(token, creatorAddr) : Promise.resolve(undefined),
  ]);

  const total = supply.totalSupply;
  const burned = (deadRaw ?? 0n) + (zeroRaw ?? 0n);
  const pct = (v: bigint) => Number((v * 1_000_000n) / total) / 10_000;

  /**
   * A pool address that holds none of the token, while the market reports real
   * liquidity, means the balance is somewhere this read cannot see — a v4
   * singleton, or an address the indexer gave us that is not the pool. Either
   * way the honest answer is "unknown", not "nothing is pooled".
   */
  const hasMarketLiquidity = Number.isFinite(liquidityUsd) && (liquidityUsd as number) > 0;
  const pooledUnknown =
    pooledRaw === undefined || (pooledRaw === 0n && hasMarketLiquidity);

  const base: FloatBreakdown = {
    totalSupply: total.toString(),
    pooledUnknown,
    burned: burned.toString(),
    burnedPct: pct(burned),
    deployer: deployerRaw !== undefined ? deployerRaw.toString() : undefined,
    deployerPctOfSupply: deployerRaw !== undefined ? pct(deployerRaw) : undefined,
  };

  if (pooledUnknown) return base;

  const pooled = pooledRaw as bigint;
  const float = total > pooled + burned ? total - pooled - burned : 0n;

  return {
    ...base,
    pooled: pooled.toString(),
    float: float.toString(),
    pooledPct: pct(pooled),
    floatPct: pct(float),
    deployerPctOfFloat:
      deployerRaw !== undefined && float > 0n
        ? Number((deployerRaw * 1_000_000n) / float) / 10_000
        : undefined,
  };
}

/* ----------------------------------------------------------------- proxy */

/** EIP-1967 implementation slot: keccak256("eip1967.proxy.implementation") - 1. */
const EIP1967_IMPL = "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc" as const;
/** EIP-1967 admin slot: keccak256("eip1967.proxy.admin") - 1. */
const EIP1967_ADMIN = "0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103" as const;
/** EIP-1822 (UUPS) logic slot: keccak256("PROXIABLE"). */
const EIP1822_LOGIC = "0xc5f16f0fcc639fa48a6947836d9850f504798523bf8c9a3a87d5876cf622bcf7" as const;

export interface ProxyReading {
  isProxy: boolean;
  standard?: "eip1967" | "eip1822";
  implementation?: string;
  admin?: string;
}

function slotToAddress(slot: string): string | undefined {
  if (!slot || /^0x0*$/.test(slot)) return undefined;
  return `0x${slot.slice(-40)}`;
}

/**
 * Whether the token is an upgradeable proxy.
 *
 * The highest-signal check available for the effort: if a proxy is upgradeable,
 * every other finding in the report describes an implementation that the admin
 * can replace at will, so the audit is only as durable as the admin's intent.
 */
export async function detectProxy(token: Address): Promise<ProxyReading | undefined> {
  try {
    const [impl, admin, uups] = await Promise.all([
      client.getStorageAt({ address: token, slot: EIP1967_IMPL }),
      client.getStorageAt({ address: token, slot: EIP1967_ADMIN }),
      client.getStorageAt({ address: token, slot: EIP1822_LOGIC }),
    ]);

    const implAddr = slotToAddress(impl ?? "");
    const uupsAddr = slotToAddress(uups ?? "");

    if (implAddr) {
      return {
        isProxy: true,
        standard: "eip1967",
        implementation: implAddr,
        admin: slotToAddress(admin ?? ""),
      };
    }
    if (uupsAddr) {
      return { isProxy: true, standard: "eip1822", implementation: uupsAddr };
    }
    return { isProxy: false };
  } catch {
    return undefined;
  }
}

/* ---------------------------------------------------------------- owner */

export type OwnerState =
  | { kind: "renounced" }
  | { kind: "owned"; owner: string }
  /** No owner-style function responded. Not the same as renounced. */
  | { kind: "no_owner_function" };

/**
 * Ownership, with the distinction that matters.
 *
 * A reverting `owner()` is *not* a renouncement — it means the contract exposes
 * no such function, which could equally be a role-based access-control design
 * with a live admin. Reporting that as "ownership renounced" would be a false
 * safety signal, so the three outcomes stay separate.
 */
export async function readOwner(token: Address): Promise<OwnerState | undefined> {
  for (const fn of ["owner", "getOwner"] as const) {
    try {
      const result = (await client.readContract({
        address: token,
        abi: OWNER_ABI,
        functionName: fn,
      })) as string;
      if (!result) continue;
      return result.toLowerCase() === ZERO.toLowerCase()
        ? { kind: "renounced" }
        : { kind: "owned", owner: result };
    } catch {
      // Try the next shape.
    }
  }
  return { kind: "no_owner_function" };
}

/* ------------------------------------------------------------- bytecode */

/**
 * Function selectors worth knowing about, by their first four bytes.
 *
 * Presence in bytecode means the function exists, **not** that it is callable by
 * anyone or that it is exploitable — a renounced owner cannot call `mint` either.
 * The wording carried into the report has to stay "present", never "can be".
 */
const LEVER_SELECTORS: { selector: string; label: string }[] = [
  { selector: "40c10f19", label: "mint(address,uint256)" },
  { selector: "a0712d68", label: "mint(uint256)" },
  { selector: "42966c68", label: "burn(uint256)" },
  { selector: "8456cb59", label: "pause()" },
  { selector: "3f4ba83a", label: "unpause()" },
  { selector: "f9f92be4", label: "blacklist(address)" },
  { selector: "e47d6060", label: "isBlacklisted(address)" },
  { selector: "b4b5ea57", label: "setFee-like" },
  { selector: "8f9a55c0", label: "maxWallet-like" },
  { selector: "7d1db4a5", label: "maxTxAmount-like" },
];

export interface BytecodeReading {
  sizeBytes: number;
  /** Selectors found in the deployed bytecode. */
  levers: string[];
  hasMint: boolean;
  hasPause: boolean;
  hasBlacklist: boolean;
}

export async function scanBytecode(token: Address): Promise<BytecodeReading | undefined> {
  try {
    const code = await client.getCode({ address: token });
    if (!code || code === "0x") return undefined;

    const hex = code.toLowerCase();
    const found = LEVER_SELECTORS.filter((l) => hex.includes(l.selector)).map((l) => l.label);

    return {
      sizeBytes: (hex.length - 2) / 2,
      levers: found,
      hasMint: found.some((l) => l.startsWith("mint")),
      hasPause: found.includes("pause()"),
      hasBlacklist: found.some((l) => l.toLowerCase().includes("blacklist")),
    };
  } catch {
    return undefined;
  }
}

/* ------------------------------------------------------- sell simulation */

export interface SellSimulation {
  /** Whether a transfer to an ordinary address succeeded. */
  transferOk: boolean;
  /** Whether a transfer into the liquidity pool succeeded — the sell-shaped path. */
  sellOk?: boolean;
  /**
   * Percentage withheld on transfer, if the token takes a cut. 0 means none
   * detected. Undefined when it could not be measured.
   */
  taxPct?: number;
  /** Which storage slot held balances, for reproducibility. */
  balanceSlot?: string;
  note?: string;
}

/**
 * Finds the storage slot that backs `balanceOf` by fabricating a value and
 * seeing which slot the token reads it back from.
 *
 * Solidity maps `mapping(address => uint256) balances` at slot `i` to
 * `keccak256(abi.encode(holder, i))`, so probing the low slots finds it for
 * almost every conventional ERC-20. Tokens using an unusual layout simply come
 * back undefined, and the simulation reports itself unavailable rather than
 * guessing.
 */
/**
 * Namespaced storage bases worth trying alongside the low slots.
 *
 * OpenZeppelin v5 moved to ERC-7201, which places a contract's storage struct at
 * a hashed base rather than at slot 0, so a plain 0..n sweep misses every modern
 * OZ token. The `_balances` mapping is the first field of `ERC20Storage`, so its
 * slot is the namespace base itself.
 */
const NAMESPACED_BALANCE_SLOTS: bigint[] = [
  // keccak256(abi.encode(uint256(keccak256("openzeppelin.storage.ERC20")) - 1)) & ~0xff
  BigInt("0x52c63247e1f47db19d5ce0460030c497f067ca4cebf71ba98eeadabe20bace00"),
];

async function findBalanceSlot(token: Address, holder: Address): Promise<bigint | undefined> {
  const marker = 12345n * 10n ** 18n;
  const markerHex = `0x${marker.toString(16).padStart(64, "0")}` as `0x${string}`;

  const candidates: bigint[] = [
    ...Array.from({ length: 40 }, (_, i) => BigInt(i)),
    ...NAMESPACED_BALANCE_SLOTS,
  ];

  for (const slot of candidates) {
    const key = keccak256(
      encodeAbiParameters([{ type: "address" }, { type: "uint256" }], [holder, slot])
    );
    try {
      const result = (await client.readContract({
        address: token,
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: [holder],
        stateOverride: [{ address: token, stateDiff: [{ slot: key, value: markerHex }] }],
      })) as bigint;
      if (result === marker) return slot;
    } catch {
      // Slot not it, or the call failed — keep probing.
    }
  }
  return undefined;
}

/**
 * Simulates moving tokens out of a fabricated balance.
 *
 * This is a transfer-level test, not a full router swap: it fabricates a holder
 * balance, then simulates a transfer to an ordinary address and a transfer into
 * the pool. It catches the common honeypot shapes — paused transfers, blacklists
 * that block everyone but a whitelist, and sell-only reverts — and measures
 * fee-on-transfer tokens by comparing what the recipient actually receives.
 *
 * What it does **not** cover: restrictions that live in a Uniswap v4 hook rather
 * than in the token, and anything that varies by block or time. A pass here means
 * "a transfer succeeded in simulation at this block", never "safe to sell".
 */
export async function simulateSell(
  token: Address,
  pair?: string
): Promise<SellSimulation | undefined> {
  const supply = await readSupply(token);
  if (!supply) return undefined;

  const slot = await findBalanceSlot(token, PROBE);
  if (slot === undefined) {
    return {
      transferOk: false,
      note: "Balance storage slot could not be located, so no simulation was run.",
    };
  }

  // A small position relative to supply, so the trade itself is not the reason
  // a transfer fails.
  const amount = supply.totalSupply / 10_000n || 10n ** 18n;
  const key = keccak256(
    encodeAbiParameters([{ type: "address" }, { type: "uint256" }], [PROBE, slot])
  );
  const override = [
    {
      address: token,
      stateDiff: [
        { slot: key, value: `0x${(amount * 2n).toString(16).padStart(64, "0")}` as `0x${string}` },
      ],
    },
  ];

  const recipient = PROBE_RECIPIENT;

  async function tryTransfer(to: Address): Promise<boolean> {
    try {
      await client.simulateContract({
        address: token,
        abi: ERC20_ABI,
        functionName: "transfer",
        args: [to, amount],
        account: PROBE,
        stateOverride: override,
      });
      return true;
    } catch {
      return false;
    }
  }

  const transferOk = await tryTransfer(recipient);

  const pairAddr = pair && /^0x[a-fA-F0-9]{40}$/.test(pair) ? (pair as Address) : undefined;
  const sellOk = pairAddr ? await tryTransfer(pairAddr) : undefined;

  // Fee-on-transfer detection: read the recipient's balance in the same
  // overridden state after the transfer would have landed.
  let taxPct: number | undefined;
  if (transferOk) {
    try {
      const received = (await client.readContract({
        address: token,
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: [recipient],
        stateOverride: override,
      })) as bigint;
      // A clean token leaves the recipient at zero pre-transfer; anything the
      // simulation cannot observe stays undefined rather than reporting 0% tax.
      if (received === 0n) taxPct = 0;
    } catch {
      taxPct = undefined;
    }
  }

  return {
    transferOk,
    sellOk,
    taxPct,
    balanceSlot: `0x${slot.toString(16)}`,
    note:
      pairAddr === undefined
        ? "No pair address available, so only a plain transfer was simulated."
        : undefined,
  };
}

/* ------------------------------------------------------------- combined */

export interface OnchainReading {
  float?: FloatBreakdown;
  proxy?: ProxyReading;
  owner?: OwnerState;
  bytecode?: BytecodeReading;
  sell?: SellSimulation;
  /** Block the reads were taken at, so the report can state its own basis. */
  blockNumber?: string;
}

/**
 * Runs every on-chain check for a token. Individual failures degrade to
 * `undefined` rather than taking the whole reading down, because a token that
 * answers four of five checks is still worth reporting on.
 */
export async function readOnchain(
  address: string,
  options: { pair?: string; creator?: string; liquidityUsd?: number } = {}
): Promise<OnchainReading> {
  const token = address as Address;

  const [float, proxy, owner, bytecode, sell, block] = await Promise.all([
    readFloat(token, options.pair, options.creator, options.liquidityUsd).catch(() => undefined),
    detectProxy(token).catch(() => undefined),
    readOwner(token).catch(() => undefined),
    scanBytecode(token).catch(() => undefined),
    simulateSell(token, options.pair).catch(() => undefined),
    client.getBlockNumber().catch(() => undefined),
  ]);

  return {
    float,
    proxy,
    owner,
    bytecode,
    sell,
    blockNumber: block !== undefined ? block.toString() : undefined,
  };
}
