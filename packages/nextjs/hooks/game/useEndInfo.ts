import { useState } from "react";
import { useScaffoldWatchContractEvent } from "../scaffold-eth";
import { useAccount } from "wagmi";
import { EndInfo } from "~~/app/type";

export const useEndInfo = () => {
  const { address } = useAccount();
  const [endInfo, setEndInfo] = useState<EndInfo>();

  useScaffoldWatchContractEvent({
    contractName: "MolliNalli",
    eventName: "GameEnded",
    onLogs: logs => {
      if (!address) return;
      for (const log of logs) {
        const [addr, player, time] = log.args;
        if (addr !== address) {
          continue;
        }

        setEndInfo({
          address: addr,
          user: player,
          timestamp: time,
        });
      }
    },
  });

  return [endInfo, setEndInfo] as const;
};
