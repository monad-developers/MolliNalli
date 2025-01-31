export enum GameStage {
  NOT_START,
  PLAYING,
  ENDED,
  WAITING_END,
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
  seed: bigint;
  out: boolean;
};

export type EndInfo = {
  address: string;
  user: PlayerInfo;
  timestamp: bigint;
};

export type GameInit = {
  address: string;
  maxAction: number;
  stage: number;
  player: PlayerInfo;
  nonce: number;
};
