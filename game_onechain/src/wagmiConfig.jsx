'use client';
import '@rainbow-me/rainbowkit/styles.css';
import {
  getDefaultConfig,
  RainbowKitProvider,
  darkTheme,
} from '@rainbow-me/rainbowkit';
import { WagmiProvider } from 'wagmi';
import {
  QueryClientProvider,
  QueryClient,
} from "@tanstack/react-query";
import { defineChain } from 'viem';

export const ogGalileo = defineChain({
  id: 16602,
  name: '0G Galileo',
  nativeCurrency: { name: '0G', symbol: 'A0GI', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://evmrpc-testnet.0g.ai'] },
  },
  blockExplorers: {
    default: { name: '0G Scan', url: 'https://scan-testnet.0g.ai' },
  },
  testnet: true,
});

export const config = getDefaultConfig({
  appName: 'Echoes of the Village',
  projectId: process.env.NEXT_PUBLIC_STITCH_PROJECT_ID || '5f698552d0b018a74f7b4e02980d3cc7', 
  chains: [ogGalileo],
  ssr: true, 
});

const queryClient = new QueryClient();

export const Providers = ({ children }) => {
  return (
    <QueryClientProvider client={queryClient}>
      <WagmiProvider config={config}>
        <RainbowKitProvider theme={darkTheme()}>
          {children}
        </RainbowKitProvider>
      </WagmiProvider>
    </QueryClientProvider>
  );
};
