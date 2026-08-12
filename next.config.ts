import type { NextConfig } from "next";

/**
 * `wagmi/connectors` re-exports the Base Account connector, which pulls in
 * @coinbase/cdp-sdk and its optional x402 payment adapters. Lattice never uses
 * that connector, but the barrel import makes webpack try to resolve the
 * adapters anyway — and they are not installed. Stub them out.
 */
const OPTIONAL_WEB3_MODULES = [
  "@x402/core/client",
  "@x402/evm",
  "@x402/evm/exact/client",
  "@x402/evm/upto/client",
  "@x402/svm/exact/client",
  // @metamask/sdk ships one bundle for web and React Native.
  "@react-native-async-storage/async-storage",
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    // Optional peer deps of the WalletConnect stack; absent by design.
    config.externals.push("pino-pretty", "lokijs", "encoding");

    config.resolve.alias = {
      ...config.resolve.alias,
      ...Object.fromEntries(OPTIONAL_WEB3_MODULES.map((id) => [id, false])),
    };

    return config;
  },
};

export default nextConfig;
