import { SolanaAdapter } from "@reown/appkit-adapter-solana/react";
import { solana, solanaTestnet, solanaDevnet } from "@reown/appkit/networks";

export const appkitProjectId = process.env.NEXT_PUBLIC_REOWN_PROJECT_ID ?? "";

const projectId = appkitProjectId || "00000000000000000000000000000000";

export const networks = [solanaDevnet, solana, solanaTestnet] as const;

export const solanaAdapter = new SolanaAdapter();
