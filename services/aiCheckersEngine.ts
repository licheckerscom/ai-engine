// AI Checkers Engine Service - Provides AI functionality to existing components
import { getBestMove } from '../engine/aiEngine';
import { getValidMoves as getEngineValidMoves, applyMove as applyEngineMove, createInitialBoard, getVariantRules } from '../engine/checkersLogic';
import { Player, PieceType, CheckersVariant, GameState, Move, Puzzle, AnalysisResult, CheatingDetectionResult } from '../types';

// Compatibility layer for existing system
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

    // Main AI move calculation - integrates with existing App.tsx
    async calculateBestMove(
        board: any[][],
        turn: 'white' | 'black',
        variant: string = 'english',
        level: number = 5,
        gameContext?: any
    ): Promise<any | null> {
        if (!this.initialized) {
            console.warn('AI Engine not initialized');
            return null;
        }

        try {
            // Convert existing board format to NEW engine format
            const newBoard = this.convertBoardFormat(board);
            const newTurn = turn === 'white' ? Player.WHITE : Player.RED;
            const newVariant = this.mapVariantString(variant);

            // Create game state for NEW engine
            const gameState: GameState = {
                board: newBoard,
                turn: newTurn,
                variant: newVariant,
                aiLevel: level,
                movesSinceCaptureOrKing: gameContext?.movesSinceCaptureOrKing || 0,
                isGameOver: gameContext?.isGameOver || false,
                winner: gameContext?.winner || null,
                history: gameContext?.history || []
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
            const newBoard = this.convertBoardFormat(board);
            const newTurn = turn === 'white' ? Player.WHITE : Player.RED;
            const newVariant = this.mapVariantString(variant);

            const gameState: GameState = {
                board: newBoard,
                turn: newTurn,
                variant: newVariant,
                aiLevel: 10
            };

            const analysis = this.analyzePositionWithEngine(gameState);
            return this.formatAnalysisForExistingSystem(analysis, turn);
        } catch (error) {
            console.error('Error analyzing position:', error);
            return 'Analysis failed';
        }
    }

    // Puzzle generation for existing puzzle system
    async generatePuzzle(
        variant: string = 'english',
        difficulty: string = 'intermediate',
        theme?: string
    ): Promise<Puzzle | null> {
        if (!this.initialized) {
            return null;
        }

        try {
            const newVariant = this.mapVariantString(variant);
            const puzzle = generateTacticalPuzzle(newVariant, difficulty, theme);

            if (puzzle) {
                // Convert puzzle to existing format
                return {
                    ...puzzle,
                    initialBoard: this.convertBoardToExistingFormat(puzzle.initialBoard),
                    solution: puzzle.solution.map(move => this.convertMoveToExistingFormat(move))
                };
            }

            return null;
        } catch (error) {
            console.error('Error generating puzzle:', error);
            return null;
        }
    }

    // Cheating detection for existing anti-cheat system
    async detectCheating(
        moveHistory: any[],
        variant: string = 'english'
    ): Promise<CheatingDetectionResult> {
        if (!this.initialized) {
            return {
                score: 0,
                verdict: 'Engine unavailable',
                reasoning: 'AI engine not initialized',
                accuracy: 0,
                movesAnalyzed: 0
            };
        }

        try {
            const newVariant = this.mapVariantString(variant);
            const convertedHistory = moveHistory.map(move => this.convertMoveFromExistingFormat(move));

            const result = detectEngineCorrelation(convertedHistory, newVariant);

            return {
                score: result.score,
                verdict: result.verdict,
                reasoning: result.reasoning,
                accuracy: result.accuracy || 0,
                movesAnalyzed: moveHistory.length
            };
        } catch (error) {
            console.error('Error in cheating detection:', error);
            return {
                score: 0,
                verdict: 'Analysis failed',
                reasoning: 'Error during analysis',
                accuracy: 0,
                movesAnalyzed: 0
            };
        }
    }

    // Get valid moves for existing game logic
    getValidMovesForBoard(
        board: any[][],
        turn: 'white' | 'black',
        variant: string = 'english'
    ): any[] {
        try {
            const newBoard = this.convertBoardFormat(board);
            const newTurn = turn === 'white' ? Player.WHITE : Player.RED;
            const newVariant = this.mapVariantString(variant);

            const moves = getValidMoves(newBoard, newTurn, newVariant);

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
            const newBoard = this.convertBoardFormat(board);
            const newMove = this.convertMoveFromExistingFormat(move);
            const newVariant = this.mapVariantString(variant);

            const resultBoard = applyMove(newBoard, newMove, newVariant);

            // Convert back to existing format
            return this.convertBoardToExistingFormat(resultBoard);
        } catch (error) {
            console.error('Error applying move:', error);
            return board;
        }
    }

    // Helper methods for format conversion
    private convertBoardFormat(existingBoard: any[][]): (any | null)[][] {
        return existingBoard.map(row =>
            row.map(piece => piece ? {
                id: piece.id,
                player: piece.color === 'white' ? Player.WHITE : Player.RED,
                type: piece.isKing ? PieceType.KING : PieceType.PAWN,
                position: { r: 0, c: 0 } // Will be updated
            } : null)
        );
    }

    private convertBoardToExistingFormat(newBoard: (any | null)[][]): any[][] {
        return newBoard.map(row =>
            row.map(piece => piece ? {
                color: piece.player === Player.WHITE ? 'white' : 'black',
                isKing: piece.type === PieceType.KING,
                id: piece.id
            } : null)
        );
    }

    private convertMoveToExistingFormat(newMove: any): any {
        return {
            from: { row: newMove.from.r, col: newMove.from.c },
            to: { row: newMove.to.r, col: newMove.to.c },
            captures: newMove.captures?.map((cap: any) => ({ row: cap.r, col: cap.c })) || [],
            path: newMove.path?.map((pos: any) => ({ row: pos.r, col: pos.c })) || []
        };
    }

    private convertMoveFromExistingFormat(existingMove: any): any {
        return {
            from: { r: existingMove.from.row, c: existingMove.from.col },
            to: { r: existingMove.to.row, c: existingMove.to.col },
            captures: existingMove.captures?.map((cap: any) => ({ r: cap.row, c: cap.col })) || [],
            path: existingMove.path?.map((pos: any) => ({ r: pos.row, c: pos.col })) || []
        };
    }

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

    private formatAnalysisForExistingSystem(analysis: AnalysisResult, turn: string): string {
        let formatted = `Position Analysis (${turn}'s turn):\n`;

        formatted += `• Evaluation: ${analysis.evaluation}\n`;
        formatted += `• Material Balance: ${analysis.score > 0 ? 'White advantage' : analysis.score < 0 ? 'Black advantage' : 'Equal'}\n`;
        formatted += `• White pieces: ${analysis.material.white.pieces} (${analysis.material.white.kings} kings)\n`;
        formatted += `• Black pieces: ${analysis.material.black.pieces} (${analysis.material.black.kings} kings)\n`;
        formatted += `• Available captures: ${analysis.tactical.captures}\n`;
        formatted += `• Mobility: ${analysis.tactical.mobility} legal moves\n`;

        if (analysis.bestMove) {
            formatted += `• Best move: ${analysis.bestMove.from.r},${analysis.bestMove.from.c} → ${analysis.bestMove.to.r},${analysis.bestMove.to.c}\n`;
        }

        return formatted;
    }
}

// Export singleton service instance
export const aiCheckersEngine = new AICheckersEngineService();

// Export service functions for existing components
export const getAIMove = async (
    board: any[][],
    turn: 'white' | 'black',
    variant: string,
    level: number,
    gameContext?: any
) => {
    return aiCheckersEngine.calculateBestMove(board, turn, variant, level, gameContext);
};

export const analyzeGamePosition = async (
    board: any[][],
    turn: 'white' | 'black',
    variant: string
) => {
    return aiCheckersEngine.analyzePosition(board, turn, variant);
};

export const createAIPuzzle = async (
    variant: string,
    difficulty: string,
    theme?: string
) => {
    return aiCheckersEngine.generatePuzzle(variant, difficulty, theme);
};

export const detectPlayerCheating = async (
    moveHistory: any[],
    variant: string
) => {
    return aiCheckersEngine.detectCheating(moveHistory, variant);
};

export const getValidMoves = async (
    board: any[][],
    turn: 'white' | 'black',
    variant: string
) => {
    return aiCheckersEngine.getValidMovesForBoard(board, turn, variant);
};

export const applyAIMove = (
    board: any[][],
    move: any,
    variant: string
) => {
    return aiCheckersEngine.applyMoveToBoard(board, move, variant);
};

// Initialize service on import
aiCheckersEngine.initialize().catch(console.error);
