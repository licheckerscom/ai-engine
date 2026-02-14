// AI Checkers Engine Service - Direct integration with existing App.tsx
import { getBestMove } from '../engine/aiEngine';
import { getValidMoves as getEngineValidMoves, applyMove as applyEngineMove, createInitialBoard, getVariantRules } from '../engine/checkersLogic';
import { Player, PieceType, CheckersVariant } from '../types';

// Direct service functions that work with existing App.tsx and components
class AICheckersEngineService {
    private initialized = false;

    constructor() {
        this.initialize();
    }

    async initialize(): Promise<void> {
        try {
            this.initialized = true;
            console.log('AI Checkers Engine Service initialized successfully');
        } catch (error) {
            console.error('Failed to initialize AI Engine Service:', error);
            this.initialized = false;
        }
    }

    // Convert existing board format to NEW engine format
    private convertBoardToNewFormat(existingBoard: any[][]): (any | null)[][] {
        return existingBoard.map(row => 
            row.map(piece => piece ? {
                id: piece.id,
                player: piece.color === 'white' ? Player.WHITE : Player.RED,
                type: piece.isKing ? PieceType.KING : PieceType.PAWN,
                position: { r: 0, c: 0 } // Will be updated
            } : null)
        );
    }

    // Convert NEW engine board format back to existing format
    private convertBoardToExistingFormat(newBoard: (any | null)[][]): any[][] {
        return newBoard.map(row => 
            row.map(piece => piece ? {
                color: piece.player === Player.WHITE ? 'white' : 'black',
                isKing: piece.type === PieceType.KING,
                id: piece.id
            } : null)
        );
    }

    // Convert existing move format to NEW engine format
    private convertMoveToNewFormat(existingMove: any): any {
        return {
            from: { r: existingMove.from.row, c: existingMove.from.col },
            to: { r: existingMove.to.row, c: existingMove.to.col },
            captures: existingMove.captures?.map((cap: any) => ({ r: cap.row, c: cap.col })) || [],
            path: existingMove.path?.map((pos: any) => ({ r: pos.row, c: pos.col })) || []
        };
    }

    // Convert NEW engine move format back to existing format
    private convertMoveToExistingFormat(newMove: any): any {
        return {
            from: { row: newMove.from.r, col: newMove.from.c },
            to: { row: newMove.to.r, col: newMove.to.c },
            captures: newMove.captures?.map((cap: any) => ({ r: cap.r, c: cap.c })) || [],
            path: newMove.path?.map((pos: any) => ({ r: pos.r, col: pos.c })) || []
        };
    }

    // Map variant string to NEW engine enum
    private mapVariantString(variant: string): CheckersVariant {
        const mapping: Record<string, CheckersVariant> = {
            'english': CheckersVariant.ENGLISH,
            'international': CheckersVariant.INTERNATIONAL,
            'brazilian': CheckersVariant.BRAZILIAN,
            'russian': CheckersVariant.RUSSIAN,
            'italian': CheckersVariant.ITALIAN,
            'spanish': CheckersVariant.SPANISH,
            'turkish': CheckersVariant.TURKISH,
            'thai': CheckersVariant.THAI,
            'frisian': CheckersVariant.FRISIAN,
            'canadian': CheckersVariant.CANADIAN,
            'jamaican': CheckersVariant.POOL
        };
        return mapping[variant] || CheckersVariant.ENGLISH;
    }

    // Update piece positions in NEW engine format
    private updatePiecePositions(newBoard: (any | null)[][]): void {
        for (let r = 0; r < newBoard.length; r++) {
            for (let c = 0; c < newBoard[r].length; c++) {
                if (newBoard[r][c]) {
                    newBoard[r][c]!.position = { r, c };
                }
            }
        }
    }

    // Main AI move calculation - compatible with existing App.tsx
    async calculateBestMove(
        board: any[][], 
        turn: 'white' | 'black', 
        variant: string = 'english',
        level: number = 5
    ): Promise<any | null> {
        if (!this.initialized) {
            console.warn('AI Engine not initialized');
            return null;
        }

        try {
            // Convert to NEW engine format
            const newBoard = this.convertBoardToNewFormat(board);
            this.updatePiecePositions(newBoard);
            const newTurn = turn === 'white' ? Player.WHITE : Player.RED;
            const newVariant = this.mapVariantString(variant);

            // Create game state for NEW engine
            const gameState = {
                board: newBoard,
                turn: newTurn,
                variant: newVariant,
                aiLevel: level
            };

            // Get best move from NEW engine
            const bestMove = getBestMove(gameState);
            
            if (bestMove) {
                // Convert back to existing format
                return this.convertMoveToExistingFormat(bestMove);
            }

            return null;
        } catch (error) {
            console.error('Error calculating best move:', error);
            return null;
        }
    }

    // Position analysis for existing components
    async analyzePosition(
        board: any[][], 
        turn: 'white' | 'black', 
        variant: string = 'english'
    ): Promise<string> {
        if (!this.initialized) {
            return 'AI Engine not initialized';
        }

        try {
            const newBoard = this.convertBoardToNewFormat(board);
            this.updatePiecePositions(newBoard);
            const newTurn = turn === 'white' ? Player.WHITE : Player.RED;
            const newVariant = this.mapVariantString(variant);

            const gameState = {
                board: newBoard,
                turn: newTurn,
                variant: newVariant,
                aiLevel: 10
            };

            // Get valid moves for analysis
            const validMoves = getEngineValidMoves(newBoard, newTurn, newVariant);
            
            let analysis = `Position Analysis (${turn}'s turn):\n`;
            
            const captures = validMoves.filter(m => (m.captures?.length ?? 0) > 0);
            if (captures.length > 0) {
                analysis += `• Forced captures available: ${captures.length}\n`;
                analysis += `• Maximum captures in single move: ${Math.max(...captures.map(c => c.captures?.length || 0))}\n`;
            } else {
                analysis += `• ${validMoves.length} legal moves available\n`;
            }
            
            // Piece count
            let whiteCount = 0, blackCount = 0, whiteKings = 0, blackKings = 0;
            board.forEach(row => {
                row.forEach(piece => {
                    if (piece) {
                        if (piece.color === 'white') {
                            whiteCount++;
                            if (piece.isKing) whiteKings++;
                        } else {
                            blackCount++;
                            if (piece.isKing) blackKings++;
                        }
                    }
                });
            });
            
            analysis += `• Material: W(${whiteCount}/${whiteKings}K) vs B(${blackCount}/${blackKings}K)\n`;
            
            // Get engine evaluation
            const bestMove = getBestMove(gameState);
            if (bestMove) {
                analysis += `• Engine suggests: ${bestMove.from.r},${bestMove.from.c} → ${bestMove.to.r},${bestMove.to.c}\n`;
            }
            
            return analysis;
        } catch (error) {
            console.error('Error analyzing position:', error);
            return 'Analysis failed';
        }
    }

    // Get valid moves for existing game logic
    getValidMovesForBoard(
        board: any[][], 
        turn: 'white' | 'black', 
        variant: string = 'english'
    ): any[] {
        try {
            const newBoard = this.convertBoardToNewFormat(board);
            this.updatePiecePositions(newBoard);
            const newTurn = turn === 'white' ? Player.WHITE : Player.RED;
            const newVariant = this.mapVariantString(variant);

            const moves = getEngineValidMoves(newBoard, newTurn, newVariant);
            
            // Convert moves back to existing format
            return moves.map(move => this.convertMoveToExistingFormat(move));
        } catch (error) {
            console.error('Error getting valid moves:', error);
            return [];
        }
    }

    // Apply move to board for existing game logic
    applyMoveToBoard(board: any[][], move: any, variant: string = 'english'): any[][] {
        try {
            const newBoard = this.convertBoardToNewFormat(board);
            this.updatePiecePositions(newBoard);
            const newMove = this.convertMoveToNewFormat(move);
            const newVariant = this.mapVariantString(variant);

            const resultBoard = applyEngineMove(newBoard, newMove, newVariant);
            
            // Convert back to existing format
            return this.convertBoardToExistingFormat(resultBoard);
        } catch (error) {
            console.error('Error applying move:', error);
            return board;
        }
    }
}

// Export singleton service instance
export const aiCheckersEngine = new AICheckersEngineService();

// Export service functions for existing components - these match your current API
export const getAIMove = async (
    gameState: any, 
    level: number
) => {
    return aiCheckersEngine.calculateBestMove(
        gameState.board, 
        gameState.turn, 
        gameState.variant, 
        level
    );
};

export const analyzeGamePosition = async (
    gameState: any
) => {
    return aiCheckersEngine.analyzePosition(
        gameState.board, 
        gameState.turn, 
        gameState.variant
    );
};

export const createAIPuzzle = async (
    variant: string, 
    difficulty: string
) => {
    return aiCheckersEngine.generatePuzzle(variant, difficulty);
};

export const detectPlayerCheating = async (
    history: any[], 
    variant: string
) => {
    return aiCheckersEngine.detectCheating(history, variant);
};

export const getValidMovesFromEngine = async (
    board: any[][], 
    turn: 'white' | 'black', 
    variant: string
) => {
    return aiCheckersEngine.getValidMovesForBoard(board, turn, variant);
};

export const applyAIMoveToBoard = (
    board: any[][], 
    move: any, 
    variant: string
) => {
    return aiCheckersEngine.applyMoveToBoard(board, move, variant);
};

// Initialize service on import
aiCheckersEngine.initialize().catch(console.error);
