import { useEffect, useState } from "react";
import { useDeployedContractInfo, useScaffoldEventHistory } from "../scaffold-eth";
import { AbiEvent, Log } from "viem";
import { useAccount, useBlockNumber, usePublicClient } from "wagmi";
import { EndInfo } from "~~/app/type";

export const useEndInfo = () => {
  const { address } = useAccount();
  const [endInfo, setEndInfo] = useState<EndInfo>();
  const { data: blockNumber, refetch } = useBlockNumber();

  const { data } = useScaffoldEventHistory({
    enabled: !!blockNumber,
    contractName: "MolliNalli",
    eventName: "GameEnded",
    fromBlock: blockNumber || 0n,
    filters: { playerAddr: address },
    watch: true,
  });

  useEffect(() => {
    if (data && data.length > 0 && data[0].args) {
      console.log(data);
      setEndInfo({
        address: data[0].args.playerAddr!,
        user: data[0].args.player!,
        timestamp: data[0].args.endTime!,
      });
    }
  }, [data]);

  return {
    endInfo,
    setEndInfo,
    reset: () => refetch(),
  };
};

export const useStart = (cb: (seed: bigint) => void) => {
  const { data: blockNumber, refetch } = useBlockNumber();
  const { data } = useScaffoldEventHistory({
    enabled: !!blockNumber,
    contractName: "MolliNalli",
    eventName: "GameStarted",
    fromBlock: blockNumber || 0n,
    watch: true,
  });

  useEffect(() => {
    if (data && data.length > 0 && data[0].args.seed) {
      console.log("call");
      cb(data[0].args.seed);
      refetch();
    }
  }, [cb, refetch, data]);
};
