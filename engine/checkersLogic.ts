
import { Piece, Player, PieceType, Move, CheckersVariant, VariantRules } from '../types';

export const getVariantRules = (variant: CheckersVariant): VariantRules => {
  const base: VariantRules = {
    boardSize: 8,
    pawnCaptureBackwards: false,
    kingLongRange: false,
    majorityCaptureRequired: false,
    qualityCaptureRequired: false,
    kingCapturePriority: false,
    pawnCanCaptureKing: true,
    isOrthogonal: false,
    isLosingGoal: false,
    pawnKingTransformationMidJump: false,
    kingStopsAfterCapture: false,
    darkSquarePlay: true,
    removeCapturedImmediately: false,
    frisianCapturing: false,
  };

  switch (variant) {
    case CheckersVariant.INTERNATIONAL:
      return { ...base, boardSize: 10, pawnCaptureBackwards: true, kingLongRange: true, majorityCaptureRequired: true };
    case CheckersVariant.RUSSIAN:
      return { ...base, pawnCaptureBackwards: true, kingLongRange: true, pawnKingTransformationMidJump: true, majorityCaptureRequired: false };
    case CheckersVariant.BRAZILIAN:
      return { ...base, pawnCaptureBackwards: true, kingLongRange: true, majorityCaptureRequired: true };
    case CheckersVariant.ITALIAN:
      return { ...base, majorityCaptureRequired: true, qualityCaptureRequired: true, kingCapturePriority: true, pawnCanCaptureKing: false };
    case CheckersVariant.TURKISH:
      return { ...base, kingLongRange: true, majorityCaptureRequired: true, isOrthogonal: true, darkSquarePlay: false, removeCapturedImmediately: true };
    case CheckersVariant.ARMENIAN:
      return { ...base, kingLongRange: true, majorityCaptureRequired: true, isOrthogonal: true, darkSquarePlay: false, removeCapturedImmediately: true };
    case CheckersVariant.SUICIDE:
      return { ...base, isLosingGoal: true, majorityCaptureRequired: true };
    case CheckersVariant.SPANISH:
      return { ...base, kingLongRange: true, majorityCaptureRequired: true, qualityCaptureRequired: true };
    case CheckersVariant.POOL:
      return { ...base, pawnCaptureBackwards: true, kingLongRange: true, majorityCaptureRequired: true };
    case CheckersVariant.CANADIAN:
      return { ...base, boardSize: 12, pawnCaptureBackwards: true, kingLongRange: true, majorityCaptureRequired: true };
    case CheckersVariant.THAI:
      return { ...base, kingLongRange: true, kingStopsAfterCapture: true, majorityCaptureRequired: true };
    case CheckersVariant.CZECH:
      return { ...base, kingLongRange: true, kingCapturePriority: true };
    case CheckersVariant.FRISIAN:
      return { ...base, boardSize: 10, kingLongRange: true, majorityCaptureRequired: true, frisianCapturing: true, pawnCaptureBackwards: true };
    case CheckersVariant.GOTHIC:
      return { ...base, boardSize: 8, kingLongRange: true, pawnCaptureBackwards: true };
    case CheckersVariant.OLD_GERMAN:
      return { ...base, boardSize: 8, kingLongRange: false, majorityCaptureRequired: true };
    case CheckersVariant.ENGLISH:
    default:
      return base;
  }
};

export const createInitialBoard = (variant: CheckersVariant): (Piece | null)[][] => {
  const rules = getVariantRules(variant);
  const size = rules.boardSize;
  const board: (Piece | null)[][] = Array(size).fill(null).map(() => Array(size).fill(null));
  
  let fillRows = (size >= 10) ? 4 : 3;
  if (size === 12) fillRows = 5;
  if (variant === CheckersVariant.THAI) fillRows = 2;

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (!rules.darkSquarePlay) {
        if (r >= 1 && r <= 2) board[r][c] = { id: `w-${r}-${c}`, player: Player.WHITE, type: PieceType.PAWN, position: { r, c } };
        if (r >= size - 3 && r <= size - 2) board[r][c] = { id: `r-${r}-${c}`, player: Player.RED, type: PieceType.PAWN, position: { r, c } };
      } else {
        const isDarkSquare = (r + c) % 2 !== 0;
        if (isDarkSquare) {
          if (r < fillRows) {
            board[r][c] = { id: `w-${r}-${c}`, player: Player.WHITE, type: PieceType.PAWN, position: { r, c } };
          } else if (r >= size - fillRows) {
            board[r][c] = { id: `r-${r}-${c}`, player: Player.RED, type: PieceType.PAWN, position: { r, c } };
          }
        }
      }
    }
  }
  return board;
};

export const getValidMoves = (board: (Piece | null)[][], player: Player, variant: CheckersVariant): Move[] => {
  const rules = getVariantRules(variant);
  let jumpMoves: Move[] = [];
  let stepMoves: Move[] = [];
  
  for (let r = 0; r < rules.boardSize; r++) {
    for (let c = 0; c < rules.boardSize; c++) {
      const piece = board[r][c];
      if (piece && piece.player === player) {
        const { jumps, steps } = getPieceMoves(board, piece, rules);
        jumpMoves.push(...jumps);
        stepMoves.push(...steps);
      }
    }
  }

  if (jumpMoves.length > 0) {
    let filtered = jumpMoves;
    if (rules.kingCapturePriority) {
      const kingJumps = jumpMoves.filter(m => board[m.from.r][m.from.c]?.type === PieceType.KING);
      if (kingJumps.length > 0) filtered = kingJumps;
    }
    if (rules.majorityCaptureRequired) {
      const maxQty = Math.max(...filtered.map(m => m.captures?.length ?? 0));
      filtered = filtered.filter(m => (m.captures?.length ?? 0) === maxQty);
    }
    if (rules.qualityCaptureRequired) {
      const getKingCount = (m: Move) => m.captures?.filter(c => board[c.r][c.c]?.type === PieceType.KING).length ?? 0;
      const maxKings = Math.max(...filtered.map(getKingCount));
      filtered = filtered.filter(m => getKingCount(m) === maxKings);
    }
    return filtered;
  }
  return stepMoves;
};

const getPieceMoves = (board: (Piece | null)[][], piece: Piece, rules: VariantRules): { jumps: Move[], steps: Move[] } => {
  const jumps: Move[] = [];
  const steps: Move[] = [];
  const size = rules.boardSize;
  
  let dirs: number[][] = [];
  if (rules.isOrthogonal) {
    dirs = [[0, 1], [0, -1], [piece.player === Player.RED ? -1 : 1, 0]];
  } else if (rules.frisianCapturing) {
    dirs = [[1, 1], [1, -1], [-1, 1], [-1, -1], [1, 0], [-1, 0], [0, 1], [0, -1]];
  } else {
    dirs = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
  }

  const findJumps = (currentPos: { r: number, c: number }, currentType: PieceType, visitedCaptures: { r: number, c: number }[]): Move[] => {
    let pieceJumps: Move[] = [];
    
    dirs.forEach(([dr, dc]) => {
      if (currentType === PieceType.PAWN) {
        const isBack = piece.player === Player.RED ? dr > 0 : dr < 0;
        if (isBack && !rules.pawnCaptureBackwards && !rules.isOrthogonal) return;
        
        const mr = currentPos.r + dr, mc = currentPos.c + dc;
        const er = currentPos.r + dr * 2, ec = currentPos.c + dc * 2;
        
        if (er >= 0 && er < size && ec >= 0 && ec < size) {
          const mp = board[mr][mc];
          if (mp && mp.player !== piece.player && !board[er][ec]) {
            if (visitedCaptures.some(v => v.r === mr && v.c === mc)) return;
            if (!rules.pawnCanCaptureKing && mp.type === PieceType.KING) return;

            const newCaptures = [...visitedCaptures, { r: mr, c: mc }];
            let nextType: PieceType = currentType;
            const kingRow = piece.player === Player.RED ? 0 : size - 1;
            
            if (rules.pawnKingTransformationMidJump && er === kingRow) {
              nextType = PieceType.KING;
            }

            const deeperJumps = findJumps({ r: er, c: ec }, nextType, newCaptures);
            if (deeperJumps.length > 0) {
              pieceJumps.push(...deeperJumps);
            } else {
              pieceJumps.push({ from: piece.position, to: { r: er, c: ec }, captures: newCaptures });
            }
          }
        }
      } else {
        if (rules.kingLongRange) {
          for (let d = 1; d < size; d++) {
            const mr = currentPos.r + dr * d, mc = currentPos.c + dc * d;
            if (mr < 0 || mr >= size || mc < 0 || mc >= size) break;
            const mp = board[mr][mc];
            if (mp) {
              if (mp.player !== piece.player && !visitedCaptures.some(v => v.r === mr && v.c === mc)) {
                const tr = mr + dr, tc = mc + dc;
                if (tr >= 0 && tr < size && tc >= 0 && tc < size && !board[tr][tc]) {
                  const newCaptures = [...visitedCaptures, { r: mr, c: mc }];
                  if (rules.kingStopsAfterCapture) {
                    const deeper = findJumps({ r: tr, c: tc }, currentType, newCaptures);
                    if (deeper.length > 0) pieceJumps.push(...deeper);
                    else pieceJumps.push({ from: piece.position, to: { r: tr, c: tc }, captures: newCaptures });
                  } else {
                    for (let l = 1; l < size; l++) {
                      const lr = mr + dr * l, lc = mc + dc * l;
                      if (lr < 0 || lr >= size || lc < 0 || lc >= size || board[lr][lc]) break;
                      const deeper = findJumps({ r: lr, c: lc }, currentType, newCaptures);
                      if (deeper.length > 0) pieceJumps.push(...deeper);
                      else pieceJumps.push({ from: piece.position, to: { r: lr, c: lc }, captures: newCaptures });
                    }
                  }
                }
              }
              break;
            }
          }
        } else {
          const mr = currentPos.r + dr, mc = currentPos.c + dc;
          const er = currentPos.r + dr * 2, ec = currentPos.c + dc * 2;
          if (er >= 0 && er < size && ec >= 0 && ec < size) {
            const mp = board[mr][mc];
            if (mp && mp.player !== piece.player && !board[er][ec] && !visitedCaptures.some(v => v.r === mr && v.c === mc)) {
              const newCaptures = [...visitedCaptures, { r: mr, c: mc }];
              const deeper = findJumps({ r: er, c: ec }, currentType, newCaptures);
              if (deeper.length > 0) pieceJumps.push(...deeper);
              else pieceJumps.push({ from: piece.position, to: { r: er, c: ec }, captures: newCaptures });
            }
          }
        }
      }
    });
    return pieceJumps;
  };

  jumps.push(...findJumps(piece.position, piece.type, []));

  dirs.forEach(([dr, dc]) => {
    const isBack = piece.player === Player.RED ? dr > 0 : dr < 0;
    const isSide = dr === 0;
    if (piece.type === PieceType.PAWN) {
      if (isBack) return;
      if (isSide && !rules.isOrthogonal) return;
    }

    if (piece.type === PieceType.KING && rules.kingLongRange) {
      for (let d = 1; d < size; d++) {
        const tr = piece.position.r + dr * d, tc = piece.position.c + dc * d;
        if (tr >= 0 && tr < size && tc >= 0 && tc < size && !board[tr][tc]) steps.push({ from: piece.position, to: { r: tr, c: tc } });
        else break;
      }
    } else {
      const tr = piece.position.r + dr, tc = piece.position.c + dc;
      if (tr >= 0 && tr < size && tc >= 0 && tc < size && !board[tr][tc]) steps.push({ from: piece.position, to: { r: tr, c: tc } });
    }
  });

  return { jumps, steps };
};

export const applyMove = (board: (Piece | null)[][], move: Move, variant: CheckersVariant): (Piece | null)[][] => {
  const rules = getVariantRules(variant);
  const newBoard = board.map(row => row.slice());
  const piece = newBoard[move.from.r][move.from.c];
  if (!piece) return board;

  const newPiece = { ...piece, position: move.to };
  const kingRow = piece.player === Player.RED ? 0 : rules.boardSize - 1;
  
  if (move.to.r === kingRow) {
    newPiece.type = PieceType.KING;
  }

  newBoard[move.to.r][move.to.c] = newPiece;
  newBoard[move.from.r][move.from.c] = null;
  if (move.captures) {
    move.captures.forEach(c => { newBoard[c.r][c.c] = null; });
  }
  return newBoard;
};

export const serializeBoard = (board: (Piece | null)[][]): string => {
  return board.map(row => row.map(p => {
    if (!p) return '.';
    const char = p.player === Player.RED ? 'r' : 'w';
    return p.type === PieceType.KING ? char.toUpperCase() : char;
  }).join('')).join('\n');
};
