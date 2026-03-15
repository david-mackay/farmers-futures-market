import { Connection, Keypair } from "@solana/web3.js";
import bs58 from "bs58";

let cachedConnection: Connection | null = null;

/** Default to devnet unless explicitly set to mainnet. */
function isDevnetNetwork(): boolean {
  return process.env.SOLANA_NETWORK !== "mainnet";
}

function buildRpcUrl(): string {
  if (process.env.SOLANA_RPC_URL) return process.env.SOLANA_RPC_URL;
  const apiKey = process.env.HELIUS_API_KEY;
  const isDevnet = isDevnetNetwork();
  if (apiKey) {
    return isDevnet
      ? `https://devnet.helius-rpc.com/?api-key=${apiKey}`
      : `https://mainnet.helius-rpc.com/?api-key=${apiKey}`;
  }
  return isDevnet
    ? "https://api.devnet.solana.com"
    : "https://api.mainnet-beta.solana.com";
}

export function getConnection(): Connection {
  if (cachedConnection) return cachedConnection;
  const rpcUrl = buildRpcUrl();
  cachedConnection = new Connection(rpcUrl, { commitment: "confirmed" });
  return cachedConnection;
}

let cachedEscrowKeypair: Keypair | null = null;

export function getEscrowKeypair(): Keypair {
  if (cachedEscrowKeypair) return cachedEscrowKeypair;
  const privateKey = process.env.ESCROW_WALLET_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error("ESCROW_WALLET_PRIVATE_KEY is not set");
  }
  cachedEscrowKeypair = Keypair.fromSecretKey(bs58.decode(privateKey));
  return cachedEscrowKeypair;
}

/** USDC mint for orders and escrow. On devnet uses USDC_DEV_MINT so the same mint as the wallet. */
export function getUsdcMint(): string {
  if (process.env.NEXT_PUBLIC_USDC_MINT) return process.env.NEXT_PUBLIC_USDC_MINT;
  if (process.env.USDC_MINT) return process.env.USDC_MINT;
  if (isDevnetNetwork()) return getDevnetUsdcMint();
  return "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
}

export function isDevnet(): boolean {
  return isDevnetNetwork();
}

/** USDC-dev mint on devnet for signup bonus and testing. */
export function getDevnetUsdcMint(): string {
  return (
    process.env.USDC_DEV_MINT ?? "Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr"
  );
}

export function getPlatformFeeBps(): number {
  return parseInt(process.env.PLATFORM_FEE_BPS ?? "500", 10); // 5% default
}
