"use client";

import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { Address } from "~~/components/scaffold-eth";
import { useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth/index";
import { notification } from "~~/utils/scaffold-eth";

enum GameStage {
  NOT_START,
  PLAYING,
  ENDED,
}

enum CardType {
  None,
  Chog,
  Moyaki,
  Molandak,
}
const getThreeCards = (seed: bigint, startIndex: number) => {
  const CARD_COUNT = 3;
  const TYPE_MASK = BigInt(0b11);
  const BITS_PER_TYPE = 2n;

  let value = seed >> (BigInt(startIndex) * BITS_PER_TYPE);
  const cards = [];

  for (let c = 0; c < CARD_COUNT; c++) {
    const types: CardType[] = [0, 0, 0, 0];
    for (let i = 0; i < 3; i++) {
      const index = value & TYPE_MASK;
      types[i] = Number(index) as CardType;
      value = value >> BITS_PER_TYPE;
    }

    cards.push(types);
  }

  return cards;
};

const GamePage = () => {
  const { address } = useAccount();
  const [gameStage, setGameStage] = useState<GameStage>(GameStage.NOT_START);
  const [currentCards, setCurrentCards] = useState<CardType[]>([]);
  const [seedInfo, setSeedInfo] = useState<{ seed: bigint; turn: number } | null>(null);

  // Contract reads
  const { data: stage } = useScaffoldReadContract({
    contractName: "MolliNalli",
    functionName: "stage",
  });

  const { data: playerData } = useScaffoldReadContract({
    contractName: "MolliNalli",
    functionName: "getPlayer",
    args: [address],
  });

  useEffect(() => {
    if (!playerData) return;
    if (!seedInfo) {
      //first set up
      setSeedInfo({ seed: playerData.seed, turn: 0 });
    } else {
      if (playerData.seed !== seedInfo.seed) {
        setSeedInfo({ seed: playerData.seed, turn: 0 });
      }
    }
  }, [playerData, seedInfo]);

  // Contract writes
  const { writeContractAsync } = useScaffoldWriteContract({
    contractName: "MolliNalli",
  });

  const joinGame = async () => {
    await writeContractAsync({
      functionName: "joinGame",
    });
  };

  const startGame = async () => {
    await writeContractAsync({
      functionName: "startGame",
    });
  };

  const action = async (bell: boolean) => {
    await writeContractAsync({
      functionName: "action",
      args: [bell],
    });
  };

  useEffect(() => {
    if (stage !== undefined) {
      setGameStage(stage as GameStage);
    }
  }, [stage]);

  useEffect(() => {
    if (playerData?.seed) {
      const seed = playerData.seed;
      const cards: CardType[] = [];
      let value = seed;
      for (let i = 0; i < 12; i++) {
        const cardType = Number(value & BigInt(3));
        cards.push(cardType as CardType);
        value = value >> BigInt(2);
      }
      setCurrentCards(cards);
    }
  }, [playerData?.seed]);

  const handleJoinGame = async () => {
    try {
      await joinGame();
      notification.success("Successfully joined the game!");
    } catch (error) {
      notification.error("Failed to join game");
      console.error(error);
    }
  };

  const handleStartGame = async () => {
    try {
      await startGame();
      notification.success("Game started!");
    } catch (error) {
      notification.error("Failed to start game");
      console.error(error);
    }
  };

  const handleAction = async (pressed: boolean) => {
    try {
      await action(pressed);
      notification.success(pressed ? "Bell pressed!" : "Cards drawn!");
    } catch (error) {
      notification.error("Action failed");
      console.error(error);
    }
  };

  const getCardColor = (type: CardType) => {
    switch (type) {
      case CardType.Chog:
        return "bg-red-500";
      case CardType.Moyaki:
        return "bg-blue-500";
      case CardType.Molandak:
        return "bg-green-500";
      default:
        return "bg-gray-300";
    }
  };

  console.log(getThreeCards(playerData?.seed ?? 0n, 0));
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
          {gameStage === GameStage.NOT_START && !playerData?.isReady && (
            <button className="btn btn-primary" onClick={handleJoinGame}>
              Join Game
            </button>
          )}
          {gameStage === GameStage.NOT_START && playerData?.isReady && (
            <button className="btn btn-primary" onClick={handleStartGame}>
              Start Game
            </button>
          )}
          {gameStage === GameStage.PLAYING && (
            <div className="flex flex-col gap-4">
              <div className="flex justify-center gap-4">
                <button className="btn btn-primary" onClick={() => handleAction(false)}>
                  Draw Cards
                </button>
                <button className="btn btn-secondary" onClick={() => handleAction(true)}>
                  Ring Bell!
                </button>
              </div>
              {/* Cards Display */}
              <div className="grid grid-cols-4 gap-4">
                {currentCards.slice(0, 12).map((cardType, index) => (
                  <div
                    key={index}
                    className={`w-24 h-32 rounded-lg ${getCardColor(cardType)} flex items-center justify-center text-white font-bold shadow-lg transform hover:scale-105 transition-transform`}
                  >
                    {CardType[cardType]}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Player Info */}
        {playerData && (
          <div className="card w-96 bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 className="card-title">Player Info</h2>
              <p>
                Address: <Address address={address} />
              </p>
              <p>Score: {Number(playerData.score)}</p>
              <p>Actions: {Number(playerData.actionCount)}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GamePage;
