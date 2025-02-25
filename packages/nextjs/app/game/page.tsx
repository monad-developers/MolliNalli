"use client";

import { useCallback, useEffect, useState } from "react";
import { CardType, EndInfo, GameInit, GameStage, MNCard, PlayerInfo } from "../type";
import { AnimatePresence, motion } from "motion/react";
import { useAccount, usePublicClient, useReadContracts, useTransactionCount } from "wagmi";
import Card from "~~/components/Card";
import { Address } from "~~/components/scaffold-eth";
import { useEndInfo, useGameLogic, useGameState, useStart } from "~~/hooks/game/hooks";
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

const BITS_PER_TYPE = 2;
const ANIMAL_COUNT = 4;
const TYPE_MASK = 0x03; // Binary: 11
const ANIMAL_TYPE = 3;
const BELL_TARGET = 4;

function checkCard(value: bigint, turn: number): boolean {
  // 储存每个吉祥物的数量
  const types = new Array(4).fill(0);

  // 因为每轮要移除第一张牌，所以移除相应轮次的牌数
  value = value >> BigInt(turn * BITS_PER_TYPE * ANIMAL_COUNT);

  // 检查12张牌 (3 * 4)
  for (let i = 0; i < 3 * ANIMAL_COUNT; i++) {
    const index = Number(value & BigInt(TYPE_MASK));
    value = value >> BigInt(BITS_PER_TYPE);
    types[index] += 1;
  }

  // 检查是否有达到目标数量的类型
  for (let i = 1; i <= ANIMAL_TYPE; i++) {
    if (types[i] === BELL_TARGET) {
      return true;
    }
  }
  return false;
}

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

  const { data: nonce } = useTransactionCount({
    address,
  });

  // TODO: 合约状态初始化
  // TODO: Contract state initialization

  const [maxAction, stage, player] = data || [];

  if (error) {
    return <div className="flex w-86 mx-auto p-4">错误:{JSON.stringify(error)}</div>;
  }

  console.log(nonce, isFetched);

  if (!isFetched || nonce === undefined) {
    return <div className="flex w-86 mx-auto p-4 ">加载中...</div>;
  }

  return (
    <GamePageInner
      address={address}
      maxAction={maxAction?.result as number}
      stage={stage?.result as number}
      player={player?.result as PlayerInfo}
      nonce={nonce}
    />
  );
};

const GamePageInner = (init: GameInit) => {
  const { address } = init;
  const { localGameStage: gameStage, setGameStage } = useGameState(init.stage as GameStage);
  const { endInfo, setEndInfo } = useEndInfo();
  const [currentCards, setCurrentCards] = useState<{ index: number; types: MNCard }[]>([]);
  const [seedInfo, setSeedInfo] = useState<{ seed: bigint; score: number; actionCount: number } | null>(null);

  const [setup, setSetup] = useState(false);
  const publicClient = usePublicClient()!;
  const [localNonce, setLocalNonce] = useState(init.nonce);
  const { joinGame, startGame, triggerAction } = useGameLogic();
  // 当主动达到24action时就会进入等待结束状态

  const onStartGame = useCallback(
    (seed: bigint) =>
      setSeedInfo(info => {
        if (info?.seed === seed) return info;
        return { seed, score: 0, actionCount: 0 };
      }),
    [setSeedInfo],
  );

  useStart(onStartGame);

  useEffect(() => {
    // 初始化
    const { player } = init;
    if (player.out) {
      setEndInfo({
        address: address,
        user: player,
        timestamp: 0n,
      });
    }

    setSeedInfo({
      seed: player.seed,
      score: player.score,
      actionCount: player.actionCount,
    });
  }, [init, address, setEndInfo, setSeedInfo, setLocalNonce, setSetup, publicClient]);

  const { data: playerData } = useScaffoldReadContract({
    contractName: "MolliNalli",
    functionName: "getPlayer",
    args: [address],
  });

  const updateLocalNonce = useCallback(() => {
    publicClient
      .getTransactionCount({ address })
      .then(nonce => {
        if (!nonce) return;
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
  // TODO: Build action to handle user decisions

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
              <div className="stat-value">{Number(seedInfo && seedInfo.score) || 0}</div>
            </div>
          )}
        </div>

        {/* Game Actions */}
        <div className="flex gap-4">
          <>
            {gameStage === GameStage.WAITING_END && <EndInfoPanel endInfo={endInfo} />}
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
        {playerData && seedInfo && (
          <div className="card w-96 bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 className="card-title">Player Info</h2>
              <div>
                Address: <Address address={address} />
              </div>
              <p>Score: {Number(seedInfo.score)}</p>
              <p>Actions: {Number(seedInfo.actionCount)}</p>
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
