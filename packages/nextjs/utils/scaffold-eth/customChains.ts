import { defineChain } from "viem";

// Base chain
export const monadTestnet = defineChain({
  id: 10143,
  name: "Monad Testnet",
  nativeCurrency: { name: "TMON", symbol: "TMON", decimals: 18 },
  rpcUrls: {
    default: {
      http: ["https://rpc-testnet.monadinfra.com/rpc/3fe540e310bbb6ef0b9f16cd23073b0a"],
    },
  },
  blockExplorers: {
    default: {
      name: "Monad Explorer",
      url: "https://testnet.monadexplorer.com/",
    },
  },
});
