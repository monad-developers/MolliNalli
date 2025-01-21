export enum GameStage {
  NOT_START,
  PLAYING,
  ENDED,
}

export enum CardType {
  None,
  Chog,
  Moyaki,
  Molandak,
}

export type MNCard = CardType[];

export type PlayerInfo = {
  isReady: boolean;
  score: number;
  actionCount: number;
  turn: number;
  startTime: number;
  seed: bigint;
};

export type EndInfo = {
  address: string;
  user: PlayerInfo;
  timestamp: bigint;
};
