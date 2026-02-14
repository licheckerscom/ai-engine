import { GoogleGenAI, Type } from "@google/genai";
import { Player, Piece, AnalysisResult, PuzzleData, PuzzleCategory } from "../types";
import { serializeBoard } from "../engine/checkersLogic";

export const analyzePosition = async (board: (Piece | null)[][], turn: Player): Promise<AnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const boardStr = serializeBoard(board);
  const prompt = `Analyze this checkers position for player ${turn}.
Board:
${boardStr}

Symbols:
. - Empty
r/R - Red Pawn/King
w/W - White Pawn/King

Evaluation scale: +10 (Red Win) to -10 (White Win).
Return a detailed tactical and strategic summary.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            evaluation: { type: Type.NUMBER, description: "Position score" },
            bestMove: { type: Type.STRING, description: "Move in r,c->r,c format" },
            explanation: { type: Type.STRING, description: "Strategy analysis" }
          },
          required: ["evaluation", "bestMove", "explanation"]
        }
      }
    });

    return JSON.parse(response.text);
  } catch (error) {
    console.error("Gemini Error:", error);
    return { evaluation: 0, bestMove: "N/A", explanation: "Deep analysis unavailable. Check API connectivity." };
  }
};

export const generatePuzzle = async (variant: string, category: PuzzleCategory = PuzzleCategory.TACTICS): Promise<PuzzleData | null> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `Generate a high-quality checkers puzzle for variant: ${variant}.
Category: ${category}.
Return a JSON object with 'board' (string matrix), 'turn' ('RED'|'WHITE'), 'goal', and 'category'.
The board size must match the variant's standard size (usually 8x8 or 10x10).`;
    
    try {
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        board: { 
                            type: Type.ARRAY, 
                            items: { type: Type.ARRAY, items: { type: Type.STRING } } 
                        },
                        turn: { type: Type.STRING },
                        goal: { type: Type.STRING },
                        category: { type: Type.STRING }
                    },
                    required: ["board", "turn", "goal", "category"]
                }
            }
        });
        return JSON.parse(response.text);
    } catch (e) {
        console.error("Puzzle Error:", e);
        return null;
    }
}