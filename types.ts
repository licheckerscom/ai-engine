// Enhanced types to bridge NEW engine with existing system
export enum Player {
  RED = 'RED',
  WHITE = 'WHITE',
}

export enum PieceType {
  PAWN = 'PAWN',
  KING = 'KING',
}

export enum CheckersVariant {
  ENGLISH = 'English / American',
  INTERNATIONAL = 'International',
  RUSSIAN = 'Russian (Shashki)',
  BRAZILIAN = 'Brazilian',
  ITALIAN = 'Italian',
  TURKISH = 'Turkish (Dama)',
  SUICIDE = 'Suicide / Giveaway',
  SPANISH = 'Spanish',
  POOL = 'Pool Checkers',
  CANADIAN = 'Canadian',
  THAI = 'Thai (Makhos)',
  CZECH = 'Czech',
  ARMENIAN = 'Armenian',
  FRISIAN = 'Frisian',
  GOTHIC = 'Gothic',
  OLD_GERMAN = 'Old German',
}

export enum AppMode {
  PLAY = 'PLAY',
  PUZZLE = 'PUZZLE',
  EDITOR = 'EDITOR',
}

export enum PuzzleCategory {
  TACTICS = 'Tactics',
  ENDGAME = 'Endgame',
  BEGINNER = 'Beginner',
  GRANDMASTER = 'Grandmaster',
}

export interface Piece {
  id: string;
  player: Player;
  type: PieceType;
  position: { r: number; c: number };
}

export interface Move {
  from: { r: number; c: number };
  to: { r: number; c: number };
  captures?: { r: number; c: number }[];
  path?: { r: number; c: number }[];
  isKinging?: boolean;
}

export interface VariantRules {
  boardSize: number;
  pawnCaptureBackwards: boolean;
  kingLongRange: boolean;
  majorityCaptureRequired: boolean;
  qualityCaptureRequired: boolean;
  kingCapturePriority: boolean;
  pawnCanCaptureKing: boolean;
  isOrthogonal: boolean;
  isLosingGoal: boolean;
  pawnKingTransformationMidJump: boolean;
  kingStopsAfterCapture: boolean;
  darkSquarePlay: boolean;
  removeCapturedImmediately: boolean; // Turkish/Armenian specific
  frisianCapturing: boolean; // Diagonal + Orthogonal
}

export interface GameState {
  board: (Piece | null)[][];
  turn: Player;
  winner: Player | 'DRAW' | null;
  history: Move[];
  aiLevel: number;
  variant: CheckersVariant;
  mode: AppMode;
}

export interface AnalysisResult {
  evaluation: number;
  bestMove: string;
  explanation: string;
}

export interface PuzzleData {
  board: string[][];
  turn: Player;
  goal: string;
  category: PuzzleCategory;
}
