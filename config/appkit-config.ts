import { cookieStorage, createStorage } from 'wagmi';
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi';
import { mainnet } from '@reown/appkit/networks';

export const appkitProjectId = process.env.NEXT_PUBLIC_REOWN_PROJECT_ID ?? '';

const projectId = appkitProjectId || '00000000000000000000000000000000';


export const networks = [mainnet] as const;

export const wagmiAdapter = new WagmiAdapter({
  storage: createStorage({
    storage: cookieStorage,
  }),
  ssr: true,
  projectId,
  networks: [...networks],
});

export const wagmiConfig = wagmiAdapter.wagmiConfig;
