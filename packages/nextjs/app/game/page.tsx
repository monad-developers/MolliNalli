"use client";

import { useEffect, useState } from "react";
import { CardType, GameStage, MNCard } from "../type";
import { keccak256, toHex } from "viem";
import { useAccount } from "wagmi";
import Card from "~~/components/Card";
import { Address } from "~~/components/scaffold-eth";
import { useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth/index";
import { notification } from "~~/utils/scaffold-eth";

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

    cards.push(types);
  }

  return cards;
};

const GamePage = () => {
  const { address } = useAccount();
  const [gameStage, setGameStage] = useState<GameStage>(GameStage.NOT_START);
  const [currentCards, setCurrentCards] = useState<MNCard[]>([]);
  const [seedInfo, setSeedInfo] = useState<{ seed: bigint; turn: number; actionCount: number } | null>(null);

  // Contract reads
  const { data: stage } = useScaffoldReadContract({
    contractName: "MolliNalli",
    functionName: "stage",
  });

  const { data: playerData, refetch: refetchPlayer } = useScaffoldReadContract({
    contractName: "MolliNalli",
    functionName: "getPlayer",
    args: [address],
  });

  useEffect(() => {
    if (!playerData) return;
    if (!playerData.isReady || playerData.seed == 0n) {
      return;
    }

    setSeedInfo(seedInfo => {
      if (!seedInfo) {
        //only first set up
        return { seed: playerData.seed, turn: playerData.turn, actionCount: playerData.actionCount };
      }

      return seedInfo;
    });
  }, [playerData]);

  useEffect(() => {
    if (!seedInfo) return;
    const cards = getThreeCards(seedInfo.seed, seedInfo.turn);
    setCurrentCards(cards);
  }, [seedInfo]);

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
    setSeedInfo(seedInfo => {
      if (!seedInfo) return null;
      const newInfo = { ...seedInfo, turn: seedInfo.turn + 1, actionCount: seedInfo.actionCount + 1 };
      if (newInfo.actionCount % 6 == 0) {
        newInfo.seed = BigInt(keccak256(toHex(seedInfo.seed)));
        newInfo.turn = 0;
      }
      return newInfo;
    });
  };

  useEffect(() => {
    if (stage !== undefined) {
      setGameStage(stage as GameStage);
      refetchPlayer();
    }
  }, [stage, refetchPlayer]);

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
                  Pass
                </button>
                <button className="btn btn-secondary" onClick={() => handleAction(true)}>
                  Ring Bell
                </button>
              </div>
              {/* Cards Display */}
              <div className="grid grid-cols-4 gap-4">
                {currentCards.map((card, index) => (
                  <Card elements={card} key={index} />
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

export default GamePage;
