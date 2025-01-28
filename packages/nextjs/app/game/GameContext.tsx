import { createContext, useContext } from "react";
import { PlayerInfo } from "../type";
import { PublicClient } from "viem";

interface GameContextType {
  address: string;
  maxAction: number;
  stage: number;
  player: PlayerInfo;
  nonce: number;
  publicClient: PublicClient;
}

export const GameContext = createContext<GameContextType | null>(null);

export function useGameContext() {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error("useGameContext must be used within a GameContextProvider");
  }
  return context;
}
