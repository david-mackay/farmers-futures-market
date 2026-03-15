import {
  PublicKey,
  Transaction,
  SystemProgram,
} from '@solana/web3.js';
import type { Connection } from '@solana/web3.js';
import {
  getAssociatedTokenAddress,
  createTransferInstruction,
  getAccount,
  createAssociatedTokenAccountInstruction,
  TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import { getConnection, getEscrowKeypair, getUsdcMint, getDevnetUsdcMint, isDevnet } from './config';

const USDC_DECIMALS = 6;

/** Resolve token program for a mint (legacy vs Token-2022) so we use the correct program in instructions. */
async function getTokenProgramForMint(connection: Connection, mint: PublicKey): Promise<PublicKey> {
  const info = await connection.getAccountInfo(mint);
  if (!info?.owner) return TOKEN_PROGRAM_ID;
  const owner = new PublicKey(info.owner);
  if (owner.equals(TOKEN_2022_PROGRAM_ID)) return TOKEN_2022_PROGRAM_ID;
  return TOKEN_PROGRAM_ID;
}

/** 500 USDC-dev for devnet signup bonus (smallest units). */
const SIGNUP_BONUS_AMOUNT = 500 * 10 ** USDC_DECIMALS;

/** 0.02 SOL for devnet signup (lamports) — only ever used when isDevnet(). */
const SIGNUP_SOL_LAMPORTS = 20_000_000;

export function usdcToSmallestUnit(amount: number): number {
  return Math.round(amount * 10 ** USDC_DECIMALS);
}

export function smallestUnitToUsdc(amount: number): number {
  return amount / 10 ** USDC_DECIMALS;
}

export async function getEscrowUsdcAddress(): Promise<PublicKey> {
  const connection = getConnection();
  const escrow = getEscrowKeypair();
  const usdcMint = new PublicKey(getUsdcMint());
  const tokenProgram = await getTokenProgramForMint(connection, usdcMint);
  return getAssociatedTokenAddress(usdcMint, escrow.publicKey, false, tokenProgram);
}

/** Fetch USDC balance for a wallet (app mint = getUsdcMint()). Returns null if ATA does not exist. */
export async function getUsdcBalanceForWallet(walletAddress: string): Promise<{
  amount: string;
  decimals: number;
  uiAmount: number | null;
  uiAmountString: string;
  mint: string;
} | null> {
  const connection = getConnection();
  const mint = new PublicKey(getUsdcMint());
  const tokenProgram = await getTokenProgramForMint(connection, mint);
  const owner = new PublicKey(walletAddress);
  const ata = await getAssociatedTokenAddress(mint, owner, false, tokenProgram);
  try {
    const balance = await connection.getTokenAccountBalance(ata);
    return {
      amount: balance.value.amount,
      decimals: balance.value.decimals,
      uiAmount: balance.value.uiAmount,
      uiAmountString: balance.value.uiAmountString ?? '0',
      mint: getUsdcMint(),
    };
  } catch {
    return null;
  }
}

/**
 * Build an unsigned USDC transfer transaction server-side using the
 * Helius RPC (so the API key never leaks to the browser).
 * Returns base64-encoded serialized transaction ready for wallet signing.
 */
export async function buildUsdcTransferForBuyer(args: {
  buyerWallet: string;
  amountSmallestUnit: number;
}): Promise<string> {
  const connection = getConnection();
  const escrow = getEscrowKeypair();
  const usdcMint = new PublicKey(getUsdcMint());
  const tokenProgram = await getTokenProgramForMint(connection, usdcMint);
  const buyer = new PublicKey(args.buyerWallet);
  const escrowPubkey = escrow.publicKey;

  const buyerAta = await getAssociatedTokenAddress(usdcMint, buyer, false, tokenProgram);
  const escrowAta = await getAssociatedTokenAddress(usdcMint, escrowPubkey, false, tokenProgram);

  const transaction = new Transaction();

  const buyerAtaInfo = await connection.getAccountInfo(buyerAta);
  if (!buyerAtaInfo) {
    transaction.add(
      createAssociatedTokenAccountInstruction(
        buyer,
        buyerAta,
        buyer,
        usdcMint,
        tokenProgram,
        ASSOCIATED_TOKEN_PROGRAM_ID
      )
    );
  }

  const escrowAtaInfo = await connection.getAccountInfo(escrowAta);
  if (!escrowAtaInfo) {
    transaction.add(
      createAssociatedTokenAccountInstruction(
        buyer,
        escrowAta,
        escrowPubkey,
        usdcMint,
        tokenProgram,
        ASSOCIATED_TOKEN_PROGRAM_ID
      )
    );
  }

  transaction.add(
    createTransferInstruction(
      buyerAta,
      escrowAta,
      buyer,
      args.amountSmallestUnit,
      [],
      tokenProgram
    )
  );

  const { blockhash, lastValidBlockHeight } =
    await connection.getLatestBlockhash();
  transaction.recentBlockhash = blockhash;
  transaction.lastValidBlockHeight = lastValidBlockHeight;
  transaction.feePayer = buyer;

  return Buffer.from(
    transaction.serialize({ requireAllSignatures: false })
  ).toString('base64');
}

/**
 * Verify a USDC transfer transaction on-chain.
 * Waits for confirmation before inspecting the transaction.
 */
export async function verifyUsdcTransfer(args: {
  txSignature: string;
  expectedFromWallet: string;
  expectedAmountUsdc: number; // smallest units
}): Promise<{ verified: boolean; actualAmount: number }> {
  const connection = getConnection();

  const { blockhash, lastValidBlockHeight } =
    await connection.getLatestBlockhash('confirmed');

  try {
    await connection.confirmTransaction(
      {
        signature: args.txSignature,
        blockhash,
        lastValidBlockHeight,
      },
      'confirmed'
    );
  } catch {
    return { verified: false, actualAmount: 0 };
  }

  const tx = await connection.getTransaction(args.txSignature, {
    commitment: 'confirmed',
    maxSupportedTransactionVersion: 0,
  });

  if (!tx || tx.meta?.err) {
    return { verified: false, actualAmount: 0 };
  }

  return { verified: true, actualAmount: args.expectedAmountUsdc };
}

/**
 * Send USDC from the escrow wallet to a recipient.
 * Returns the transaction signature.
 */
export async function sendUsdcFromEscrow(args: {
  recipientWallet: string;
  amountSmallestUnit: number;
}): Promise<string> {
  const connection = getConnection();
  const escrow = getEscrowKeypair();
  const usdcMint = new PublicKey(getUsdcMint());
  const tokenProgram = await getTokenProgramForMint(connection, usdcMint);
  const recipientPubkey = new PublicKey(args.recipientWallet);

  const escrowAta = await getAssociatedTokenAddress(
    usdcMint,
    escrow.publicKey,
    false,
    tokenProgram
  );
  const recipientAta = await getAssociatedTokenAddress(
    usdcMint,
    recipientPubkey,
    false,
    tokenProgram
  );

  const transaction = new Transaction();

  try {
    await getAccount(connection, recipientAta, 'confirmed', tokenProgram);
  } catch {
    transaction.add(
      createAssociatedTokenAccountInstruction(
        escrow.publicKey,
        recipientAta,
        recipientPubkey,
        usdcMint,
        tokenProgram,
        ASSOCIATED_TOKEN_PROGRAM_ID
      )
    );
  }

  transaction.add(
    createTransferInstruction(
      escrowAta,
      recipientAta,
      escrow.publicKey,
      args.amountSmallestUnit,
      [],
      tokenProgram
    )
  );

  const { blockhash, lastValidBlockHeight } =
    await connection.getLatestBlockhash();
  transaction.recentBlockhash = blockhash;
  transaction.lastValidBlockHeight = lastValidBlockHeight;
  transaction.feePayer = escrow.publicKey;

  transaction.sign(escrow);

  const signature = await connection.sendRawTransaction(
    transaction.serialize()
  );
  await connection.confirmTransaction({
    signature,
    blockhash,
    lastValidBlockHeight,
  });

  return signature;
}

/**
 * Send 500 USDC-dev from escrow to a new user on devnet only.
 * No-op if not on devnet. Returns signature or null if skipped/failed.
 */
export async function sendDevnetSignupBonus(recipientWallet: string): Promise<string | null> {
  if (!isDevnet()) return null;
  const connection = getConnection();
  const escrow = getEscrowKeypair();
  const mint = new PublicKey(getDevnetUsdcMint());
  const tokenProgram = await getTokenProgramForMint(connection, mint);
  const recipientPubkey = new PublicKey(recipientWallet);

  const escrowAta = await getAssociatedTokenAddress(mint, escrow.publicKey, false, tokenProgram);
  const recipientAta = await getAssociatedTokenAddress(mint, recipientPubkey, false, tokenProgram);

  const transaction = new Transaction();

  try {
    await getAccount(connection, recipientAta, 'confirmed', tokenProgram);
  } catch {
    transaction.add(
      createAssociatedTokenAccountInstruction(
        escrow.publicKey,
        recipientAta,
        recipientPubkey,
        mint,
        tokenProgram,
        ASSOCIATED_TOKEN_PROGRAM_ID
      )
    );
  }

  transaction.add(
    createTransferInstruction(
      escrowAta,
      recipientAta,
      escrow.publicKey,
      SIGNUP_BONUS_AMOUNT,
      [],
      tokenProgram
    )
  );

  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
  transaction.recentBlockhash = blockhash;
  transaction.lastValidBlockHeight = lastValidBlockHeight;
  transaction.feePayer = escrow.publicKey;
  transaction.sign(escrow);

  const signature = await connection.sendRawTransaction(transaction.serialize());
  await connection.confirmTransaction({
    signature,
    blockhash,
    lastValidBlockHeight,
  });
  return signature;
}

/**
 * Send 0.02 SOL from escrow to a new user on devnet only (for tx fees).
 * No-op if not on devnet. Returns signature or null if skipped/failed.
 * Only call when isDevnet() to avoid any mainnet SOL transfers.
 */
export async function sendDevnetSignupSol(recipientWallet: string): Promise<string | null> {
  if (!isDevnet()) return null;
  const connection = getConnection();
  const escrow = getEscrowKeypair();
  const recipientPubkey = new PublicKey(recipientWallet);

  const transaction = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: escrow.publicKey,
      toPubkey: recipientPubkey,
      lamports: SIGNUP_SOL_LAMPORTS,
    })
  );

  try {
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.lastValidBlockHeight = lastValidBlockHeight;
    transaction.feePayer = escrow.publicKey;
    transaction.sign(escrow);

    const signature = await connection.sendRawTransaction(transaction.serialize());
    await connection.confirmTransaction({
      signature,
      blockhash,
      lastValidBlockHeight,
    });
    return signature;
  } catch (e) {
    console.error('sendDevnetSignupSol', e);
    return null;
  }
}
