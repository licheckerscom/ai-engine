
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { GameState, Player, Piece, Move, PieceType, AnalysisResult, CheckersVariant, AppMode, PuzzleCategory } from './types';
import { createInitialBoard, getValidMoves, applyMove, getVariantRules } from './engine/checkersLogic';
import { getBestMove } from './engine/aiEngine';
import { analyzePosition, generatePuzzle } from './services/geminiService';

const App: React.FC = () => {
  const [mode, setMode] = useState<AppMode>(AppMode.PLAY);
  const [variant, setVariant] = useState<CheckersVariant>(CheckersVariant.ENGLISH);
  const [winStreak, setWinStreak] = useState(0);
  const [puzzleGoal, setPuzzleGoal] = useState<string | null>(null);
  const [puzzleCat, setPuzzleCat] = useState<PuzzleCategory>(PuzzleCategory.TACTICS);
  const [isGeneratingPuzzle, setIsGeneratingPuzzle] = useState(false);
  const [gameState, setGameState] = useState<GameState>({
    board: createInitialBoard(CheckersVariant.ENGLISH),
    turn: Player.RED,
    winner: null,
    history: [],
    aiLevel: 8,
    variant: CheckersVariant.ENGLISH,
    mode: AppMode.PLAY
  });
  const [selectedPiece, setSelectedPiece] = useState<{ r: number; c: number } | null>(null);
  const [possibleMoves, setPossibleMoves] = useState<Move[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [lastMove, setLastMove] = useState<Move | null>(null);
  
  const scrollRef = useRef<HTMLDivElement>(null);

  const rules = useMemo(() => getVariantRules(variant), [variant]);
  const adaptiveLevel = useMemo(() => Math.min(18, gameState.aiLevel + Math.floor(winStreak / 2)), [gameState.aiLevel, winStreak]);
  const currentValidMoves = useMemo(() => getValidMoves(gameState.board, gameState.turn, variant), [gameState.board, gameState.turn, variant]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [gameState.history]);

  const handleVariantChange = (v: CheckersVariant) => {
    setVariant(v);
    setGameState(prev => ({ ...prev, board: createInitialBoard(v), turn: Player.RED, winner: null, history: [], variant: v }));
    setLastMove(null); setSelectedPiece(null); setPossibleMoves([]); setAnalysis(null);
  };

  const handleModeChange = (newMode: AppMode) => {
    setMode(newMode);
    if (newMode === AppMode.PLAY) handleVariantChange(variant);
    else if (newMode === AppMode.PUZZLE) fetchNewPuzzle(puzzleCat);
  };

  const fetchNewPuzzle = async (cat: PuzzleCategory) => {
    setIsGeneratingPuzzle(true);
    setPuzzleCat(cat);
    const puzzle = await generatePuzzle(variant, cat);
    if (puzzle) {
      const newBoard: (Piece | null)[][] = puzzle.board.map((row, r) => row.map((char, c) => {
        if (char === '.') return null;
        const player = (char.toLowerCase() === 'r') ? Player.RED : Player.WHITE;
        const type = (char === char.toUpperCase()) ? PieceType.KING : PieceType.PAWN;
        return { id: `p-${r}-${c}`, player, type, position: { r, c } };
      }));
      setGameState(prev => ({ ...prev, board: newBoard, turn: puzzle.turn, winner: null, history: [] }));
      setPuzzleGoal(puzzle.goal);
    }
    setIsGeneratingPuzzle(false);
  };

  useEffect(() => {
    if (mode === AppMode.PLAY && gameState.turn === Player.WHITE && !gameState.winner) {
      const timer = setTimeout(() => {
        const aiMove = getBestMove({ ...gameState, aiLevel: adaptiveLevel });
        if (aiMove) handleMove(aiMove);
        else setGameState(prev => ({ ...prev, winner: rules.isLosingGoal ? Player.WHITE : Player.RED }));
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [gameState.turn, gameState.winner, gameState.variant, adaptiveLevel, mode, rules.isLosingGoal]);

  const handleMove = (move: Move) => {
    const newBoard = applyMove(gameState.board, move, variant);
    const nextTurn = gameState.turn === Player.RED ? Player.WHITE : Player.RED;
    const nextMoves = getValidMoves(newBoard, nextTurn, variant);
    let winner: Player | 'DRAW' | null = null;
    if (nextMoves.length === 0) {
      winner = rules.isLosingGoal ? nextTurn : gameState.turn;
    }
    
    if (winner === Player.RED && mode === AppMode.PLAY) setWinStreak(prev => prev + 1);
    else if (winner === Player.WHITE && mode === AppMode.PLAY) setWinStreak(0);
    
    setGameState(prev => ({ ...prev, board: newBoard, turn: nextTurn, history: [...prev.history, move], winner }));
    setLastMove(move); setSelectedPiece(null); setPossibleMoves([]); setAnalysis(null);
  };

  const onSquareClick = (r: number, c: number) => {
    if (gameState.winner || (mode === AppMode.PLAY && gameState.turn === Player.WHITE)) return;
    
    if (mode === AppMode.EDITOR) {
      const current = gameState.board[r][c];
      const newBoard = gameState.board.map(row => row.slice());
      if (!current) {
        newBoard[r][c] = { id: `ed-${r}-${c}`, player: Player.RED, type: PieceType.PAWN, position: { r, c } };
      } else if (current.player === Player.RED && current.type === PieceType.PAWN) {
        newBoard[r][c] = { ...current, type: PieceType.KING };
      } else if (current.player === Player.RED && current.type === PieceType.KING) {
        newBoard[r][c] = { ...current, player: Player.WHITE, type: PieceType.PAWN };
      } else if (current.player === Player.WHITE && current.type === PieceType.PAWN) {
        newBoard[r][c] = { ...current, type: PieceType.KING };
      } else {
        newBoard[r][c] = null;
      }
      setGameState(prev => ({ ...prev, board: newBoard }));
      return;
    }
    
    const move = possibleMoves.find(m => m.to.r === r && m.to.c === c);
    if (move) { handleMove(move); return; }
    
    const piece = gameState.board[r][c];
    if (piece && piece.player === gameState.turn) {
      setSelectedPiece({ r, c });
      setPossibleMoves(currentValidMoves.filter(m => m.from.r === r && m.from.c === c));
    } else { setSelectedPiece(null); setPossibleMoves([]); }
  };

  const onDragStart = (e: React.DragEvent, r: number, c: number) => {
    if (gameState.winner || (mode === AppMode.PLAY && gameState.turn === Player.WHITE)) return;
    const piece = gameState.board[r][c];
    if (piece && piece.player === gameState.turn) {
      setSelectedPiece({ r, c });
      setPossibleMoves(currentValidMoves.filter(m => m.from.r === r && m.from.c === c));
      e.dataTransfer.setData('source', JSON.stringify({ r, c }));
    }
  };

  const onDrop = (e: React.DragEvent, tr: number, tc: number) => {
    e.preventDefault();
    const move = possibleMoves.find(m => m.to.r === tr && m.to.c === tc);
    if (move) handleMove(move);
  };

  // Add missing resetGame function to handle game reset in different modes.
  const resetGame = () => {
    if (mode === AppMode.PUZZLE) {
      fetchNewPuzzle(puzzleCat);
    } else {
      handleVariantChange(variant);
    }
  };

  const formatMove = (m: Move) => `${String.fromCharCode(97 + m.from.c)}${gameState.board.length - m.from.r}→${String.fromCharCode(97 + m.to.c)}${gameState.board.length - m.to.r}`;

  return (
    <div className="min-h-screen p-4 md:p-8 flex flex-col items-center bg-[#0f172a] selection:bg-red-500/30">
      <header className="w-full max-w-7xl flex flex-col lg:flex-row justify-between items-center mb-8 gap-6 border-b border-slate-800 pb-8">
        <div className="flex flex-col gap-4">
          <h1 className="text-5xl font-black text-white flex items-center gap-3 tracking-tighter">
            <i className="fas fa-chess-knight text-red-600 drop-shadow-[0_0_10px_rgba(220,38,38,0.5)]"></i> 
            CHECKERS PRO
          </h1>
          <div className="flex gap-2 p-1 bg-slate-900 rounded-xl border border-slate-800">
            {[AppMode.PLAY, AppMode.PUZZLE, AppMode.EDITOR].map(m => (
              <button 
                key={m} 
                onClick={() => handleModeChange(m)} 
                className={`px-5 py-2 rounded-lg text-[10px] font-black tracking-widest transition-all ${mode === m ? 'bg-red-600 text-white shadow-lg shadow-red-600/20' : 'text-slate-500 hover:text-slate-300'}`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
        
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex flex-col">
            <label className="text-[10px] text-slate-500 font-black uppercase mb-1 ml-1">Logic Ruleset</label>
            <select 
              value={variant} 
              onChange={(e) => handleVariantChange(e.target.value as CheckersVariant)} 
              className="bg-slate-900 border border-slate-700 text-white px-5 py-3 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-red-600 transition-all text-sm"
            >
              {Object.values(CheckersVariant).map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
          <button 
            onClick={() => mode === AppMode.PUZZLE ? fetchNewPuzzle(puzzleCat) : handleVariantChange(variant)} 
            className="px-8 py-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-2xl text-white font-black text-sm transition-all shadow-xl active:scale-95"
          >
            {mode === AppMode.PUZZLE ? "NEW CHALLENGE" : "NEW GAME"}
          </button>
        </div>
      </header>

      <main className="w-full max-w-7xl grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-7 flex flex-col gap-6">
          {mode === AppMode.PUZZLE && (
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {Object.values(PuzzleCategory).map(cat => (
                <button 
                  key={cat} 
                  onClick={() => fetchNewPuzzle(cat)} 
                  className={`px-6 py-2 rounded-full text-[10px] font-black whitespace-nowrap border transition-all ${puzzleCat === cat ? 'bg-purple-600 text-white border-purple-500 shadow-lg shadow-purple-600/20' : 'bg-slate-900 text-slate-500 border-slate-800'}`}
                >
                  {cat.toUpperCase()}
                </button>
              ))}
            </div>
          )}

          {mode === AppMode.PUZZLE && puzzleGoal && (
            <div className="bg-gradient-to-br from-purple-900/30 to-slate-900/30 border border-purple-500/20 p-6 rounded-3xl text-purple-100 shadow-2xl backdrop-blur-sm">
              <div className="flex items-center gap-3 mb-2">
                <i className="fas fa-puzzle-piece text-purple-400"></i>
                <span className="text-xs font-black uppercase tracking-widest text-purple-400">Tactical Objective</span>
              </div>
              <p className="text-base italic opacity-90 leading-relaxed font-medium">"{puzzleGoal}"</p>
            </div>
          )}
          
          <div className="bg-slate-800 p-4 rounded-[3rem] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.6)] relative border border-slate-700/50">
            <div 
              className="checker-board rounded-[2rem] overflow-hidden border-[12px] border-slate-900 shadow-2xl" 
              style={{ gridTemplateColumns: `repeat(${rules.boardSize}, 1fr)`, maxWidth: '100%', margin: '0 auto' }}
            >
              {gameState.board.map((row, r) => row.map((piece, c) => {
                const isDark = (r + c) % 2 !== 0;
                const isPossible = possibleMoves.some(m => m.to.r === r && m.to.c === c);
                const isSelected = selectedPiece?.r === r && selectedPiece?.c === c;
                const isLast = (lastMove?.from.r === r && lastMove?.from.c === c) || (lastMove?.to.r === r && lastMove?.to.c === c);
                
                return (
                  <div 
                    key={`${r}-${c}`} 
                    onClick={() => onSquareClick(r, c)} 
                    onDragOver={(e) => e.preventDefault()} 
                    onDrop={(e) => onDrop(e, r, c)} 
                    className={`relative aspect-square flex items-center justify-center transition-all duration-300 
                    ${rules.darkSquarePlay ? (isDark ? 'bg-[#1e293b]' : 'bg-[#334155]') : (isDark ? 'bg-[#334155]' : 'bg-[#475569]')} 
                    ${isPossible ? 'highlight-move cursor-pointer' : ''} ${isLast ? 'bg-white/5 shadow-inner' : ''}`}
                  >
                    {piece && (
                      <div 
                        draggable 
                        onDragStart={(e) => onDragStart(e, r, c)} 
                        className={`piece w-[85%] h-[85%] border-2 transform transition-all cursor-grab active:cursor-grabbing shadow-2xl
                        ${piece.player === Player.RED ? 'bg-gradient-to-br from-red-500 to-red-800 border-red-400' : 'bg-gradient-to-br from-slate-50 to-slate-400 border-white piece-white'} 
                        ${piece.type === PieceType.KING ? 'king' : ''} 
                        ${isSelected ? 'scale-110 ring-[6px] ring-blue-500/50 shadow-[0_0_30px_rgba(59,130,246,0.6)]' : 'hover:scale-105 active:scale-95'} 
                        ${rules.isOrthogonal ? 'rounded-2xl' : 'rounded-full'}`}
                      ></div>
                    )}
                    {isPossible && <div className="absolute w-4 h-4 bg-green-500/40 rounded-full animate-ping"></div>}
                  </div>
                );
              }))}
            </div>
            
            {(gameState.winner || isGeneratingPuzzle) && (
              <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-xl flex items-center justify-center z-20 rounded-[3rem] overflow-hidden animate-in fade-in duration-500">
                <div className="text-center p-14 bg-slate-900 border border-slate-800 rounded-[3rem] shadow-[0_0_100px_rgba(0,0,0,1)] max-w-sm w-full mx-4">
                  {isGeneratingPuzzle ? (
                    <div className="flex flex-col items-center gap-8">
                      <div className="relative w-24 h-24">
                        <div className="absolute inset-0 rounded-full border-[6px] border-purple-600/20"></div>
                        <div className="absolute inset-0 rounded-full border-[6px] border-purple-600 border-t-transparent animate-spin"></div>
                      </div>
                      <p className="text-white font-black uppercase tracking-[0.3em] text-xs">Generating Dataset...</p>
                    </div>
                  ) : (
                    <>
                      <div className="text-7xl mb-8">
                        <i className={`fas ${gameState.winner === 'DRAW' ? 'fa-handshake text-slate-500' : 'fa-trophy text-yellow-500 drop-shadow-[0_0_20px_rgba(234,179,8,0.3)]'}`}></i>
                      </div>
                      <h2 className="text-5xl font-black text-white mb-8 uppercase tracking-tighter leading-none">
                        {gameState.winner === 'DRAW' ? "DRAW" : `${gameState.winner} WINS`}
                      </h2>
                      <button 
                        onClick={resetGame} 
                        className="w-full py-5 bg-red-600 hover:bg-red-500 text-white rounded-3xl font-black text-xl hover:scale-105 transition-all shadow-2xl shadow-red-600/30 tracking-tight"
                      >
                        {mode === AppMode.PUZZLE ? "NEXT LEVEL" : "REMATCH"}
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="bg-slate-900/80 p-8 rounded-[2.5rem] flex flex-col md:flex-row justify-between items-center border border-slate-800 backdrop-blur-2xl shadow-2xl gap-8">
            <div className="flex items-center gap-10">
               <div className="flex flex-col items-center">
                 <div className={`w-10 h-10 rounded-full border-2 border-red-400/30 ${gameState.turn === Player.RED ? 'bg-red-600 ring-[8px] ring-red-600/20' : 'bg-slate-800 opacity-20'}`}></div>
                 <span className="text-[10px] text-slate-500 font-black uppercase mt-3 tracking-widest">RED</span>
               </div>
               <div className="h-12 w-px bg-slate-800"></div>
               <div className="flex flex-col items-center">
                 <div className={`w-10 h-10 rounded-full border-2 border-white/30 ${gameState.turn === Player.WHITE ? 'bg-white ring-[8px] ring-white/20' : 'bg-slate-800 opacity-20'}`}></div>
                 <span className="text-[10px] text-slate-500 font-black uppercase mt-3 tracking-widest">WHITE</span>
               </div>
               <div className="flex flex-col">
                  <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1 opacity-50">Match Engine</span>
                  <span className="font-black text-white text-2xl tracking-tighter leading-none uppercase">
                    {mode === AppMode.EDITOR ? "Editing" : (gameState.turn === Player.RED ? "Your Move" : "Calculating")}
                  </span>
               </div>
            </div>
            <div className="flex flex-col items-end">
               <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1 opacity-50">Deep Move</span>
               <div className="text-slate-300 font-mono bg-slate-950 px-6 py-2 rounded-2xl border border-slate-800 text-2xl font-black shadow-inner tracking-tighter">
                 {gameState.history.length + 1}
               </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-5 flex flex-col gap-6">
          <section className="bg-slate-900/50 p-8 rounded-[2.5rem] border border-slate-800 shadow-2xl backdrop-blur-xl">
            <div className="flex items-center gap-4 mb-8">
               <div className="w-12 h-12 rounded-2xl bg-yellow-500/10 flex items-center justify-center text-yellow-500 text-xl border border-yellow-500/20 shadow-[0_0_15px_rgba(234,179,8,0.1)]">
                 <i className="fas fa-scroll"></i>
               </div>
               <h3 className="text-xl font-black text-white tracking-tighter uppercase">Physics & Logic</h3>
            </div>
            <div className="grid grid-cols-2 gap-4 text-[11px] font-bold">
              {[
                { label: 'Long Range King', active: rules.kingLongRange, detail: rules.kingStopsAfterCapture ? 'Short Jump' : 'Flying' },
                { label: 'Back Capture', active: rules.pawnCaptureBackwards },
                { label: 'Majority Capture', active: rules.majorityCaptureRequired },
                { label: 'King Priority', active: rules.kingCapturePriority },
                { label: 'Movement', active: true, detail: rules.isOrthogonal ? 'Orthogonal' : 'Diagonal' },
                { label: 'Board Size', active: true, detail: `${rules.boardSize}x${rules.boardSize}` }
              ].map((r, i) => (
                <div key={i} className={`p-4 rounded-2xl border transition-all ${r.active ? 'bg-green-500/5 border-green-500/20 text-green-400' : 'bg-slate-950 border-slate-900 text-slate-600'}`}>
                  <div className="opacity-50 text-[9px] uppercase mb-1">{r.label}</div>
                  <div className="tracking-tight uppercase">{r.detail || (r.active ? 'Enabled' : 'Disabled')}</div>
                </div>
              ))}
            </div>
          </section>
          
          <section className="bg-slate-900/50 p-8 rounded-[2.5rem] border border-slate-800 shadow-2xl backdrop-blur-xl">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                 <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500 text-xl border border-blue-500/20">
                   <i className="fas fa-brain"></i>
                 </div>
                 <h3 className="text-xl font-black text-white tracking-tighter uppercase">AI Intensity</h3>
              </div>
              <div className="text-3xl font-black text-red-600 italic tracking-tighter drop-shadow-[0_0_10px_rgba(220,38,38,0.3)]">LVL {adaptiveLevel}</div>
            </div>
            <input 
              type="range" min="1" max="18" value={gameState.aiLevel} 
              onChange={(e) => setGameState(prev => ({ ...prev, aiLevel: parseInt(e.target.value) }))} 
              className="w-full h-3 bg-slate-950 rounded-full appearance-none cursor-pointer accent-red-600 mb-8 border border-slate-800"
            />
            <div className="bg-slate-950 p-5 rounded-2xl border border-slate-900 flex justify-between items-center">
              <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Base Computation Level: {gameState.aiLevel}</span>
              {winStreak > 0 && (
                <span className="text-green-500 text-[10px] font-black uppercase flex items-center gap-2">
                  <i className="fas fa-bolt animate-pulse"></i> Streak Bonus: +{Math.floor(winStreak/2)}
                </span>
              )}
            </div>
          </section>

          <section className="bg-slate-900/50 p-8 rounded-[2.5rem] border border-slate-800 shadow-2xl backdrop-blur-xl flex flex-col flex-1 min-h-[400px]">
             <div className="flex justify-between items-center mb-8">
                <div className="flex items-center gap-4">
                   <div className="w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center text-purple-500 text-xl border border-purple-500/20">
                     <i className="fas fa-microscope"></i>
                   </div>
                   <h3 className="text-xl font-black text-white tracking-tighter uppercase">Analysis Hub</h3>
                </div>
                <button 
                  onClick={async () => { setIsAnalyzing(true); const res = await analyzePosition(gameState.board, gameState.turn); setAnalysis(res); setIsAnalyzing(false); }} 
                  disabled={isAnalyzing || !!gameState.winner} 
                  className="bg-purple-600 hover:bg-purple-500 text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all disabled:opacity-20 shadow-xl shadow-purple-600/30 active:scale-95"
                >
                  {isAnalyzing ? <i className="fas fa-sync fa-spin"></i> : "Deep Analysis"}
                </button>
            </div>
            
            <div ref={scrollRef} className="flex-1 bg-slate-950 rounded-[2rem] p-8 border border-slate-900 overflow-y-auto scroll-smooth">
               {analysis ? (
                 <div className="space-y-8 animate-in slide-in-from-top duration-500">
                    <div className="flex justify-between items-end border-b border-slate-900 pb-6">
                       <span className="text-slate-500 font-black text-[10px] uppercase tracking-[0.2em]">Positional Score</span>
                       <span className={`text-4xl font-black tracking-tighter ${analysis.evaluation > 0 ? 'text-green-500' : 'text-red-500'}`}>
                         {analysis.evaluation > 0 ? `+${analysis.evaluation.toFixed(1)}` : analysis.evaluation.toFixed(1)}
                       </span>
                    </div>
                    <div>
                       <span className="text-slate-500 font-black text-[10px] uppercase tracking-[0.2em] block mb-3">Optimal Line</span>
                       <div className="bg-slate-900 px-6 py-3 rounded-2xl text-white font-mono text-xl border border-slate-800 inline-block font-black shadow-inner">{analysis.bestMove}</div>
                    </div>
                    <div>
                       <span className="text-slate-500 font-black text-[10px] uppercase tracking-[0.2em] block mb-3">Engine Commentary</span>
                       <p className="text-sm text-slate-400 font-medium leading-[1.8] opacity-90 border-l-4 border-purple-600/30 pl-6 py-2">"{analysis.explanation}"</p>
                    </div>
                 </div>
               ) : (
                 <div className="h-full flex flex-col items-center justify-center text-slate-800 text-center gap-6 py-10">
                    <i className="fas fa-robot text-7xl opacity-10"></i>
                    <p className="text-xs font-black uppercase tracking-[0.25em] max-w-[200px] leading-loose opacity-40">Consult the Neural Engine for the current tactical depth</p>
                 </div>
               )}
            </div>
          </section>
          
          <section className="bg-slate-900/50 p-8 rounded-[2.5rem] border border-slate-800 shadow-2xl backdrop-blur-xl max-h-[300px] flex flex-col">
            <h3 className="text-xs font-black text-slate-500 tracking-[0.3em] uppercase mb-4 px-2">Move Notation</h3>
            <div className="flex-1 overflow-y-auto pr-2 space-y-2 custom-scroll">
              {gameState.history.length === 0 ? (
                <div className="text-[10px] text-slate-700 font-bold uppercase py-4 px-2 italic">Game not started...</div>
              ) : (
                gameState.history.map((m, i) => (
                  <div key={i} className="flex items-center gap-4 bg-slate-950/50 p-3 rounded-xl border border-slate-900/50 group hover:border-slate-700 transition-colors">
                    <span className="text-[10px] font-black text-slate-600 w-6">{(i + 1).toString().padStart(2, '0')}</span>
                    <span className={`text-xs font-black uppercase tracking-widest ${i % 2 === 0 ? 'text-red-500' : 'text-slate-200'}`}>
                      {formatMove(m)}
                    </span>
                    {m.captures && (
                      <span className="ml-auto text-[9px] font-black text-green-500/80 uppercase tracking-tighter">
                        {m.captures.length} Capture{m.captures.length > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </main>

      <footer className="w-full max-w-7xl mt-16 py-12 border-t border-slate-900 flex flex-col md:flex-row justify-between items-center text-[10px] text-slate-600 font-black uppercase tracking-[0.4em] gap-8">
        <div className="flex items-center gap-10">
           <span className="flex items-center gap-3"><i className="fas fa-shield-halved text-red-600"></i> ENCRYPTED ENGINE 4.2</span>
           <span className="flex items-center gap-3"><i className="fas fa-microchip"></i> 128-BIT LOOKAHEAD</span>
           <span className="flex items-center gap-3"><i className="fas fa-layer-group"></i> 50K PUZZLE ARCHIVE</span>
        </div>
        <div className="flex gap-8 opacity-50 hover:opacity-100 transition-opacity">
           <a href="#" className="hover:text-red-500 transition-colors">Tactics</a>
           <a href="#" className="hover:text-red-500 transition-colors">Analysis</a>
           <a href="#" className="hover:text-red-500 transition-colors">Rulesets</a>
        </div>
      </footer>
    </div>
  );
};

export default App;
