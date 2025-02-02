"use client";

import { useCallback, useEffect, useState } from "react";
import { CardType, EndInfo, GameStage, MNCard, PlayerInfo } from "../type";
import { GameContext, useGameContext } from "./GameContext";
import { AnimatePresence, motion } from "motion/react";
import { useAccount, usePublicClient, useReadContracts, useTransactionCount } from "wagmi";
import Card from "~~/components/Card";
import { Address } from "~~/components/scaffold-eth";
import { useEndInfo, useGameLogic, useStart } from "~~/hooks/game/hooks";
import { useDeployedContractInfo, useScaffoldReadContract, useSelectedNetwork } from "~~/hooks/scaffold-eth/index";
import { AllowedChainIds } from "~~/utils/scaffold-eth";

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
    return <div className="flex w-86 mx-auto p-4">请连接钱包</div>;
  }
  return <GameInitial address={address} />;
};

const GameInitial = ({ address }: { address: string }) => {
  const selectedNetwork = useSelectedNetwork();
  const { data: deployedContract } = useDeployedContractInfo({
    contractName: "MolliNalli",
    chainId: selectedNetwork.id as AllowedChainIds,
  });

  const publicClient = usePublicClient();
  const { data: nonce } = useTransactionCount({
    address,
  });

  // TODO: 合约状态初始化

  if (error) {
    return <div className="flex w-86 mx-auto p-4">错误:{JSON.stringify(error)}</div>;
  }

  if (!publicClient) {
    return <div className="flex w-86 mx-auto p-4">无法连接到链上</div>;
  }

  if (!isFetched || nonce === undefined) {
    return <div className="flex w-86 mx-auto p-4 ">加载中...</div>;
  }

  const [maxAction, stage, player] = data || [];
  const contextValue = {
    address,
    maxAction: maxAction?.result as number,
    stage: stage?.result as number,
    player: player?.result as PlayerInfo,
    nonce,
    publicClient,
  };

  return (
    <GameContext.Provider value={contextValue}>
      <GamePageInner />
    </GameContext.Provider>
  );
};

const GamePageInner = () => {
  const { address, maxAction, stage, player, nonce, publicClient } = useGameContext();
  const { gameStage } = useGameState(stage as GameStage);
  const { endInfo, setEndInfo } = useEndInfo();
  const [currentCards, setCurrentCards] = useState<{ index: number; types: MNCard }[]>([]);
  const [seedInfo, setSeedInfo] = useState<{ seed: bigint; actionCount: number } | null>(null);

  const [setup, setSetup] = useState(false);
  const [localNonce, setLocalNonce] = useState(nonce);
  const { joinGame, startGame, triggerAction } = useGameLogic();

  const onStartGame = useCallback(
    (seed: bigint) =>
      setSeedInfo(info => {
        if (info?.seed === seed) return info;
        return { seed, actionCount: 0 };
      }),
    [setSeedInfo],
  );

  useStart(onStartGame);

  useEffect(() => {
    // 初始化
    if (player.out) {
      setEndInfo({
        address: address,
        user: player,
        timestamp: 0n,
      });
    }

    setSeedInfo({
      seed: player.seed,
      actionCount: player.actionCount,
    });
  }, [address, player, setEndInfo, setSeedInfo, setLocalNonce, setSetup, publicClient]);

  const { data: playerData } = useScaffoldReadContract({
    contractName: "MolliNalli",
    functionName: "getPlayer",
    args: [address],
  });

  const updateLocalNonce = useCallback(() => {
    publicClient
      .getTransactionCount({ address })
      .then(nonce => {
        if (!nonce) throw new Error("nonce not found");
        setLocalNonce(nonce);
      })
      .then(() => setSetup(true));
  }, [address, publicClient, setLocalNonce]);

  useEffect(() => {
    if (!seedInfo || !seedInfo.seed) return;
    if (!setup) {
      updateLocalNonce();
    }
    const cards = getThreeCards(seedInfo.seed, seedInfo.actionCount);
    setCurrentCards(cards);
  }, [seedInfo, publicClient, address, setup, updateLocalNonce]);

  // TODO: 构建action，用来处理用户的决策

  const handleJoinGame = async () => {
    await joinGame();
    setSetup(false);
    setSeedInfo(null);
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
              <button className="btn btn-primary" onClick={startGame}>
                Start Game
              </button>
            )}
            {gameStage === GameStage.PLAYING && setup && (
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
                  <button className="btn btn-primary" onClick={() => action(false)}>
                    Pass
                  </button>
                  <button className="btn btn-secondary" onClick={() => action(true)}>
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
