"use client";

import { useCallback, useEffect, useState } from "react";
import { CardType, EndInfo, GameStage, MNCard, PlayerInfo } from "../type";
import { AnimatePresence, motion } from "motion/react";
import { keccak256, toHex } from "viem";
import { useAccount, useReadContracts, useWatchContractEvent } from "wagmi";
import Card from "~~/components/Card";
import { Address } from "~~/components/scaffold-eth";
import { useEndInfo, useStart } from "~~/hooks/game/hooks";
import {
  useDeployedContractInfo,
  useScaffoldReadContract,
  useScaffoldWriteContract,
  useSelectedNetwork,
} from "~~/hooks/scaffold-eth/index";
import { AllowedChainIds, notification } from "~~/utils/scaffold-eth";

const getThreeCards = (seed: bigint, startIndex: number) => {
  const TYPE_MASK = BigInt(0b11);
  const BITS_PER_TYPE = 2n;
  const ANIMAL_COUNT = 4n;

  let value = seed >> (BigInt(startIndex) * BITS_PER_TYPE * ANIMAL_COUNT);
  const cards = [];

  for (let c = 0; c < 3; c++) {
    const types: CardType[] = [0, 0, 0, 0];
    for (let i = 0; i < 4; i++) {
      const index = value & TYPE_MASK;
      types[i] = Number(index) as CardType;
      value = value >> BITS_PER_TYPE;
    }

    cards.push({
      index: startIndex + c,
      types,
    });
  }

  return cards;
};

const GamePage = () => {
  const { address } = useAccount();

  if (!address) {
    return <>请连接钱包</>;
  }
  return <GameInitial address={address} />;
};

const GameInitial = ({ address }: { address: string }) => {
  const selectedNetwork = useSelectedNetwork();
  const { data: deployedContract } = useDeployedContractInfo({
    contractName: "MolliNalli",
    chainId: selectedNetwork.id as AllowedChainIds,
  });
  const { data, isFetched } = useReadContracts({
    contracts: [
      {
        ...deployedContract,
        functionName: "MAX_ACTION",
      },
      {
        ...deployedContract,
        functionName: "MAX_ACTION_PER_ROUND",
      },
      {
        ...deployedContract,
        functionName: "stage",
      },
      {
        ...deployedContract,
        functionName: "getPlayer",
        args: [address],
      },
    ],
  });

  const [maxAction, maxActionPerRound, stage, player] = data || [];
  if (!isFetched) {
    return <>加载中...</>;
  }
  return (
    <GamePageInner
      address={address}
      maxAction={maxAction?.result as number}
      maxActionPerRound={maxActionPerRound?.result as number}
      stage={stage?.result as number}
      player={player?.result as PlayerInfo}
    />
  );
};

const useGameState = (init: GameStage) => {
  const [gameStage, setGameStage] = useState<GameStage>(init);
  const { data: stage } = useScaffoldReadContract({
    contractName: "MolliNalli",
    functionName: "stage",
  });
  useEffect(() => {
    setGameStage(stage as GameStage);
  }, [stage]);

  return {
    gameStage,
    setGameStage,
  };
};

const GamePageInner = (init: {
  address: string;
  maxAction: number;
  maxActionPerRound: number;
  stage: number;
  player: PlayerInfo;
}) => {
  const { address } = init;
  const { gameStage, setGameStage } = useGameState(init.stage as GameStage);
  const { endInfo, setEndInfo } = useEndInfo();
  const [currentCards, setCurrentCards] = useState<{ index: number; types: MNCard }[]>([]);
  const [seedInfo, setSeedInfo] = useState<{ seed: bigint; turn: number; actionCount: number } | null>(null);
  // 当主动达到24action时就会进入等待结束状态
  const [showEndInfo, setShowEndInfo] = useState(false);

  const onStartGame = useCallback(
    (seed: bigint) =>
      setSeedInfo(info => {
        if (info?.seed === seed) return info;
        return { seed, turn: 0, actionCount: 0 };
      }),
    [setSeedInfo],
  );
  useStart(onStartGame);
  useEffect(() => {
    // 初始化
    const { player } = init;
    if (player.out) {
      setShowEndInfo(true);
      setEndInfo({
        address: address,
        user: player,
        timestamp: 0n,
      });
    }

    setSeedInfo({
      seed: player.seed,
      turn: player.turn,
      actionCount: player.actionCount,
    });
  }, [init, address, setEndInfo, setShowEndInfo, setSeedInfo]);

  const { data: playerData, refetch: refetchPlayer } = useScaffoldReadContract({
    contractName: "MolliNalli",
    functionName: "getPlayer",
    args: [address],
  });

  useEffect(() => {
    if (!seedInfo) return;
    console.log(seedInfo);
    const cards = getThreeCards(seedInfo.seed, seedInfo.turn);
    setCurrentCards(cards);
  }, [seedInfo]);

  // Contract writes
  const { writeContract, writeContractAsync } = useScaffoldWriteContract({
    contractName: "MolliNalli",
  });

  const joinGame = async () => {
    writeContractAsync({
      functionName: "joinGame",
    });
  };

  const startGame = async () => {
    writeContractAsync({
      functionName: "startGame",
    });
  };

  const action = async (bell: boolean) => {
    writeContract({
      functionName: "action",
      args: [bell],
    });
    setSeedInfo(seedInfo => {
      if (!seedInfo) return null;
      const newInfo = { ...seedInfo, turn: seedInfo.turn + 1, actionCount: seedInfo.actionCount + 1 };
      if (newInfo.actionCount % 6 == 0) {
        newInfo.seed = BigInt(keccak256(toHex(seedInfo.seed)));
        newInfo.turn = 0;
      }

      if (newInfo.actionCount === init.maxActionPerRound) {
        setShowEndInfo(true);
      }
      return newInfo;
    });
  };

  const handleJoinGame = async () => {
    try {
      await joinGame();
      notification.success("Successfully joined the game!", { position: "top-left" });
    } catch (error) {
      notification.error("Failed to join game");
      console.error(error);
    }
  };

  const handleStartGame = async () => {
    try {
      await startGame();
      notification.success("Game started!", { position: "top-left" });
    } catch (error) {
      notification.error("Failed to start game");
      console.error(error);
    }
  };

  const handleAction = async (pressed: boolean) => {
    try {
      await action(pressed);
      notification.success(pressed ? "Bell pressed!" : "Pass!", { position: "top-left" });
    } catch (error) {
      notification.error("Action failed");
      console.error(error);
    }
  };

  const transition = { type: "spring", stiffness: 200, damping: 20 };

  return (
    <div className="flex flex-col gap-y-6 py-8 px-4 lg:px-8">
      <div className="flex flex-col items-center gap-4">
        <h1 className="text-4xl font-bold">MolliNalli Game</h1>

        {/* Game Status */}
        <div className="stats shadow">
          <div className="stat">
            <div className="stat-title">Game Stage</div>
            <div className="stat-value">{GameStage[gameStage]}</div>
          </div>
          {playerData && (
            <div className="stat">
              <div className="stat-title">Your Score</div>
              <div className="stat-value">{Number(playerData.score)}</div>
            </div>
          )}
        </div>

        {/* Game Actions */}
        <div className="flex gap-4">
          <>
            {gameStage === GameStage.NOT_START && !playerData?.isReady && (
              <div className="flex flex-col gap-4">
                <button className="btn btn-primary" onClick={handleJoinGame}>
                  Join Game
                </button>
                <EndInfoPanel endInfo={endInfo} />
              </div>
            )}
            {gameStage === GameStage.NOT_START && playerData?.isReady && (
              <button className="btn btn-primary" onClick={handleStartGame}>
                Start Game
              </button>
            )}
            {gameStage === GameStage.PLAYING && (
              <div className="flex flex-col gap-4">
                {/* Cards Display */}
                <div className="flex gap-4">
                  <AnimatePresence mode="popLayout">
                    {currentCards.map(card => (
                      <motion.div
                        key={card.index}
                        layout
                        initial={{
                          x: 100,
                          opacity: 0,
                        }}
                        animate={{
                          x: 0,
                          opacity: 1,
                          transition,
                        }}
                        exit={{
                          x: -100,
                          opacity: 0,
                          transition: { duration: 0.2 },
                        }}
                      >
                        <Card elements={card.types} key={card.index} />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
                <div className="flex justify-center gap-4">
                  <button className="btn btn-primary" onClick={() => handleAction(false)}>
                    Pass
                  </button>
                  <button className="btn btn-secondary" onClick={() => handleAction(true)}>
                    Ring Bell
                  </button>
                </div>
              </div>
            )}
          </>
        </div>

        {/* Player Info */}
        {playerData && (
          <div className="card w-96 bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 className="card-title">Player Info</h2>
              <div>
                Address: <Address address={address} />
              </div>
              <p>Score: {Number(playerData.score)}</p>
              <p>Actions: {Number(playerData.actionCount)}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const EndInfoPanel = ({ endInfo }: { endInfo?: EndInfo }) => {
  if (!endInfo) {
    return <>等待结果中...</>;
  }
  if (endInfo.timestamp == 0n) {
    return "";
  }
  return (
    <div className="card flex flex-col gap-4 w-96 bg-base-100 shadow-xl">
      <div className="card-body flex flex-col gap-2">
        <span>分数: {Number(endInfo.user.score)}</span>
        <span>判断次数: {Number(endInfo.user.actionCount)}</span>
      </div>
    </div>
  );
};

export default GamePage;
