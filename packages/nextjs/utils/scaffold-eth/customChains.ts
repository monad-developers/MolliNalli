import { defineChain } from "viem";

// Base chain
export const monadTestnet = defineChain({
  id: 10143,
  name: "Monad Testnet",
  nativeCurrency: { name: "TMON", symbol: "TMON", decimals: 18 },
  rpcUrls: {
    default: {
      http: ["https://monad-testnet.g.alchemy.com/v2/srqHd6rhPmXcsrrWuY_HYYmn1SFLDIOO"],
    },
  },
  blockExplorers: {
    default: {
      name: "Monad Explorer",
      url: "https://testnet.monadexplorer.com/",
    },
  },
});
