
import { GameState, Player, Move, PieceType, Piece, CheckersVariant } from '../types';
import { getValidMoves, applyMove, getVariantRules, serializeBoard } from './checkersLogic';

const EVAL_WEIGHTS = { PIECE: 1000, KING: 3500, MOBILITY: 25, CENTER: 80, BACK_ROW: 150, WIN: 10000000 };
const transpositionTable = new Map<string, { depth: number; score: number; flag: 'EXACT' | 'LOWER' | 'UPPER' }>();

const PST = [
  [0, 50, 0, 50, 0, 50, 0, 50],
  [40, 0, 45, 0, 45, 0, 40, 0],
  [0, 35, 0, 40, 0, 40, 0, 35],
  [30, 0, 35, 0, 35, 0, 30, 0],
  [0, 30, 0, 35, 0, 35, 0, 30],
  [25, 0, 30, 0, 30, 0, 25, 0],
  [0, 20, 0, 20, 0, 20, 0, 20],
  [15, 0, 15, 0, 15, 0, 15, 0],
];

const evaluateBoard = (board: (Piece | null)[][], variant: CheckersVariant): number => {
  const rules = getVariantRules(variant);
  const size = rules.boardSize;
  let score = 0, rMat = 0, wMat = 0, rCount = 0, wCount = 0;

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const p = board[r][c];
      if (!p) continue;
      const isRed = p.player === Player.RED;
      let val = p.type === PieceType.KING ? EVAL_WEIGHTS.KING : EVAL_WEIGHTS.PIECE;
      val += (isRed ? PST[Math.min(r, 7)][Math.min(c, 7)] : PST[7 - Math.min(r, 7)][7 - Math.min(c, 7)]);
      if (p.type === PieceType.PAWN) val += (isRed ? (7 - r) : r) * 30;
      if (isRed && r === size - 1) val += EVAL_WEIGHTS.BACK_ROW;
      if (!isRed && r === 0) val += EVAL_WEIGHTS.BACK_ROW;
      if (isRed) { rMat += val; rCount++; } else { wMat += val; wCount++; }
    }
  }
  score = rMat - wMat + (rCount - wCount) * EVAL_WEIGHTS.MOBILITY;
  return rules.isLosingGoal ? -score : score;
};

const quiesce = (board: (Piece | null)[][], alpha: number, beta: number, isMax: boolean, player: Player, variant: CheckersVariant, depth: number = 0): number => {
  const standPat = evaluateBoard(board, variant);
  if (depth > 4) return standPat;
  if (isMax) {
    if (standPat >= beta) return beta;
    if (alpha < standPat) alpha = standPat;
    const moves = getValidMoves(board, player, variant).filter(m => (m.captures?.length ?? 0) > 0);
    for (const move of moves) {
      alpha = Math.max(alpha, quiesce(applyMove(board, move, variant), alpha, beta, false, Player.WHITE, variant, depth + 1));
      if (alpha >= beta) break;
    }
    return alpha;
  } else {
    if (standPat <= alpha) return alpha;
    if (beta > standPat) beta = standPat;
    const moves = getValidMoves(board, player, variant).filter(m => (m.captures?.length ?? 0) > 0);
    for (const move of moves) {
      beta = Math.min(beta, quiesce(applyMove(board, move, variant), alpha, beta, true, Player.RED, variant, depth + 1));
      if (beta <= alpha) break;
    }
    return beta;
  }
};

const alphaBeta = (board: (Piece | null)[][], depth: number, alpha: number, beta: number, isMax: boolean, player: Player, variant: CheckersVariant): number => {
  const key = serializeBoard(board) + isMax + player;
  const cached = transpositionTable.get(key);
  if (cached && cached.depth >= depth) {
    if (cached.flag === 'EXACT') return cached.score;
    if (cached.flag === 'LOWER') alpha = Math.max(alpha, cached.score);
    if (cached.flag === 'UPPER') beta = Math.min(beta, cached.score);
    if (alpha >= beta) return cached.score;
  }
  const moves = getValidMoves(board, player, variant);
  if (depth === 0 || moves.length === 0) return quiesce(board, alpha, beta, isMax, player, variant);
  let best = isMax ? -Infinity : Infinity;
  const ordered = moves.sort((a, b) => (b.captures?.length || 0) - (a.captures?.length || 0));
  for (const move of ordered) {
    const score = alphaBeta(applyMove(board, move, variant), depth - 1, alpha, beta, !isMax, player === Player.RED ? Player.WHITE : Player.RED, variant);
    if (isMax) { best = Math.max(best, score); alpha = Math.max(alpha, best); }
    else { best = Math.min(best, score); beta = Math.min(beta, best); }
    if (beta <= alpha) break;
  }
  if (transpositionTable.size < 50000) transpositionTable.set(key, { depth, score: best, flag: best <= alpha ? 'UPPER' : best >= beta ? 'LOWER' : 'EXACT' });
  return best;
};

export const getBestMove = (gameState: GameState): Move | null => {
  if (transpositionTable.size > 20000) transpositionTable.clear();
  const lv = gameState.aiLevel;
  const depth = lv <= 2 ? 2 : lv <= 4 ? 4 : lv <= 6 ? 5 : lv <= 8 ? 6 : lv <= 10 ? 8 : lv <= 12 ? 9 : lv <= 14 ? 10 : lv === 15 ? 11 : lv === 16 ? 12 : lv === 17 ? 14 : 16;
  const moves = getValidMoves(gameState.board, gameState.turn, gameState.variant);
  if (moves.length === 0) return null;
  let bestMove = moves[0], bestScore = gameState.turn === Player.RED ? -Infinity : Infinity;
  for (const move of moves) {
    const score = alphaBeta(applyMove(gameState.board, move, gameState.variant), depth - 1, -Infinity, Infinity, gameState.turn !== Player.RED, gameState.turn === Player.RED ? Player.WHITE : Player.RED, gameState.variant);
    if ((gameState.turn === Player.RED && score > bestScore) || (gameState.turn === Player.WHITE && score < bestScore)) { bestScore = score; bestMove = move; }
  }
  return bestMove;
};
