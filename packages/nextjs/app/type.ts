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
