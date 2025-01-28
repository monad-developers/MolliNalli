import { useCallback, useEffect, useState } from "react";
import { useDeployedContractInfo, useScaffoldEventHistory, useScaffoldWriteContract } from "../scaffold-eth";
import { AbiEvent, Log, parseGwei } from "viem";
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

export const useGameLogic = () => {
  const { writeContract, writeContractAsync } = useScaffoldWriteContract({
    contractName: "MolliNalli",
  });

  const joinGame = useCallback(async () => {
    writeContractAsync({
      functionName: "joinGame",
    });
  }, [writeContractAsync]);

  const startGame = useCallback(async () => {
    writeContractAsync({
      functionName: "startGame",
    });
  }, [writeContractAsync]);

  const action = useCallback(
    async (bell: boolean, localNonce: number) => {
      return writeContract({
        functionName: "action",
        args: [bell],
        nonce: localNonce,
        maxFeePerGas: parseGwei("60"),
        gas: 163560n,
      });
    },
    [writeContract],
  );

  return {
    joinGame,
    startGame,
    triggerAction: action,
  };
};
