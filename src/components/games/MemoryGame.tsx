import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Check, Eye, X } from 'lucide-react';
import { getMemoryDifficultyParams } from '../../game/adaptiveEngine';
import { synthAudio } from '../../game/audio';
import { generateMemoryPuzzle } from '../../game/challenges';
import type { MemoryPuzzle, RoundResultInput } from '../../game/types';

interface MemoryGameProps {
  level: number;
  paused: boolean;
  onHudUpdate: (hud: { score: number; combo: number; progressLabel: string }) => void;
  onComplete: (result: RoundResultInput) => void;
}

type Phase = 'memorize' | 'recall' | 'feedback';

export function MemoryGame({ level, paused, onHudUpdate, onComplete }: MemoryGameProps) {
  const params = useMemo(() => getMemoryDifficultyParams(level), [level]);

  const [puzzleIdx, setPuzzleIdx] = useState(0);
  const [puzzle, setPuzzle] = useState<MemoryPuzzle>(() => generateMemoryPuzzle(level));
  const [phase, setPhase] = useState<Phase>('memorize');
  const [selectedCells, setSelectedCells] = useState<number[]>([]);
  const [wrongCell, setWrongCell] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [perfectCount, setPerfectCount] = useState(0);
  const [activeFlashIdx, setActiveFlashIdx] = useState<number | null>(null);

  const recallStartRef = useRef<number>(performance.now());
  const reactionSumRef = useRef<number>(0);
  const finishedRef = useRef<boolean>(false);

  const expectedSequence = useMemo(() => {
    return puzzle.orderMode === 'inverso' ? [...puzzle.sequence].reverse() : puzzle.sequence;
  }, [puzzle]);

  useEffect(() => {
    onHudUpdate({
      score,
      combo,
      progressLabel: `${Math.min(puzzleIdx + 1, params.puzzlesPerRound)}/${params.puzzlesPerRound}`,
    });
  }, [score, combo, puzzleIdx, params.puzzlesPerRound, onHudUpdate]);

  // Memorize phase timer (handles sequential pulse or simultaneous reveal)
  useEffect(() => {
    if (phase !== 'memorize' || paused) return;

    const timers: number[] = [];

    if (puzzle.orderMode === 'libre') {
      const doneId = window.setTimeout(() => {
        setPhase('recall');
        recallStartRef.current = performance.now();
      }, puzzle.revealMs);
      timers.push(doneId);
    } else {
      // Sequential / Reverse: highlight tiles one by one clearly
      const stepMs = Math.max(380, Math.round(puzzle.revealMs / puzzle.sequence.length));
      puzzle.sequence.forEach((cellIdx, i) => {
        const t = window.setTimeout(() => {
          setActiveFlashIdx(cellIdx);
          synthAudio.playMemoryNote(i);
        }, i * stepMs);
        timers.push(t);
      });
      const finishId = window.setTimeout(() => {
        setActiveFlashIdx(null);
        setPhase('recall');
        recallStartRef.current = performance.now();
      }, puzzle.sequence.length * stepMs + 340);
      timers.push(finishId);
    }

    return () => {
      timers.forEach((t) => window.clearTimeout(t));
    };
  }, [phase, paused, puzzle]);

  const advanceOrFinish = useCallback(
    (nextScore: number, nextPerfect: number, nextMaxCombo: number) => {
      const nextIdx = puzzleIdx + 1;
      if (nextIdx >= params.puzzlesPerRound) {
        if (finishedRef.current) return;
        finishedRef.current = true;
        const accuracy = Math.round((nextPerfect / params.puzzlesPerRound) * 100);
        const avgReactionMs = Math.round(reactionSumRef.current / params.puzzlesPerRound);
        synthAudio.playComplete();
        onComplete({
          domain: 'memoria',
          score: nextScore,
          accuracy,
          avgReactionMs,
          correctCount: nextPerfect,
          totalCount: params.puzzlesPerRound,
          maxCombo: nextMaxCombo,
        });
      } else {
        setPuzzleIdx(nextIdx);
        setPuzzle(generateMemoryPuzzle(level));
        setSelectedCells([]);
        setWrongCell(null);
        setActiveFlashIdx(null);
        setPhase('memorize');
      }
    },
    [puzzleIdx, params.puzzlesPerRound, level, onComplete],
  );

  const handleTileClick = (cellIdx: number) => {
    if (paused || phase !== 'recall' || finishedRef.current) return;
    if (selectedCells.includes(cellIdx)) return;

    const nextSelected = [...selectedCells, cellIdx];

    let isStepCorrect = false;
    if (puzzle.orderMode === 'libre') {
      isStepCorrect = puzzle.sequence.includes(cellIdx);
    } else {
      const targetAtStep = expectedSequence[selectedCells.length];
      isStepCorrect = cellIdx === targetAtStep;
    }

    if (!isStepCorrect) {
      synthAudio.playWrong();
      setWrongCell(cellIdx);
      setCombo(0);
      setPhase('feedback');
      reactionSumRef.current += Math.max(400, performance.now() - recallStartRef.current);

      window.setTimeout(() => {
        advanceOrFinish(score, perfectCount, maxCombo);
      }, 1050);
      return;
    }

    // Correct tile!
    synthAudio.playMemoryNote(selectedCells.length);
    setSelectedCells(nextSelected);

    if (nextSelected.length === puzzle.sequence.length) {
      // Completed pattern cleanly!
      const elapsed = Math.max(450, performance.now() - recallStartRef.current);
      reactionSumRef.current += elapsed;
      const nextCombo = combo + 1;
      const nextMaxCombo = Math.max(maxCombo, nextCombo);
      const nextPerfect = perfectCount + 1;
      const earned = 120 + level * 20 + nextCombo * 25;
      const nextScore = score + earned;

      setCombo(nextCombo);
      setMaxCombo(nextMaxCombo);
      setPerfectCount(nextPerfect);
      setScore(nextScore);
      setPhase('feedback');
      synthAudio.playCorrect(nextCombo);

      window.setTimeout(() => {
        advanceOrFinish(nextScore, nextPerfect, nextMaxCombo);
      }, 650);
    }
  };

  const orderBadge =
    puzzle.orderMode === 'libre'
      ? 'Recuerda todas las casillas (cualquier orden)'
      : puzzle.orderMode === 'secuencial'
      ? 'Pulsa las casillas en el ORDEN exacto (1 → N)'
      : '¡Reto Inverso! Pulsa en ORDEN INVERSO (última → primera)';

  const totalCells = puzzle.gridSize * puzzle.gridSize;
  const tileSizeClass =
    puzzle.gridSize <= 3
      ? 'w-20 h-20 md:w-24 md:h-24 text-2xl'
      : puzzle.gridSize === 4
      ? 'w-16 h-16 md:w-20 md:h-20 text-xl'
      : puzzle.gridSize === 5
      ? 'w-13 h-13 md:w-16 md:h-16 text-lg'
      : 'w-11 h-11 md:w-14 md:h-14 text-base';

  return (
    <div className="w-full max-w-xl flex flex-col items-center gap-5">
      {/* Phase Instruction Banner */}
      <div className="text-center flex flex-col gap-1">
        <div className="text-xs font-semibold uppercase tracking-wider text-sky-300">
          {params.tierLabel} · Patrón {puzzleIdx + 1} de {params.puzzlesPerRound}
        </div>
        <div className="inline-flex items-center justify-center gap-2 text-base md:text-lg font-display font-bold text-white min-h-[30px]">
          {phase === 'memorize' ? (
            <>
              <Eye className="w-5 h-5 text-sky-400" />
              <span>Observa y memoriza ({puzzle.sequence.length} casillas)</span>
            </>
          ) : phase === 'recall' ? (
            <span>{orderBadge}</span>
          ) : wrongCell !== null ? (
            <span className="inline-flex items-center gap-1.5 text-rose-300">
              <X className="w-5 h-5" />
              Casi — observa el patrón real en azul
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-emerald-300">
              <Check className="w-5 h-5" />
              ¡Patrón perfecto!
            </span>
          )}
        </div>
      </div>

      {/* Tactile Matrix Board */}
      <div
        className={`bg-[#141c2f] border border-slate-700/90 rounded-2xl p-5 md:p-7 shadow-xl ${
          wrongCell !== null ? 'animate-sinapsis-shake border-rose-500/70' : ''
        }`}
      >
        <div
          className="grid gap-2.5 md:gap-3"
          style={{ gridTemplateColumns: `repeat(${puzzle.gridSize}, minmax(0, 1fr))` }}
          data-testid="memory-grid"
        >
          {Array.from({ length: totalCells }, (_, idx) => {
            const seqPos = puzzle.sequence.indexOf(idx);
            const isTarget = seqPos !== -1;
            const isSelected = selectedCells.includes(idx);
            const selectedOrder = selectedCells.indexOf(idx) + 1;
            const isWrong = wrongCell === idx;

            const showFreeMemorize = phase === 'memorize' && puzzle.orderMode === 'libre' && isTarget;
            const showSeqMemorize = phase === 'memorize' && puzzle.orderMode !== 'libre' && activeFlashIdx === idx;
            const showMissedReveal = phase === 'feedback' && wrongCell !== null && isTarget && !isSelected;

            let tileStyle = 'bg-[#1c2640] border-slate-700/80 text-transparent hover:border-sky-400/60';
            let labelText = '';

            if (showFreeMemorize || showSeqMemorize) {
              tileStyle = 'bg-sky-400 border-sky-200 text-slate-950 scale-[1.03] shadow-lg shadow-sky-400/25';
              labelText = puzzle.orderMode === 'libre' ? '●' : String(seqPos + 1);
            } else if (isWrong) {
              tileStyle = 'bg-rose-500 border-rose-300 text-white';
              labelText = '✕';
            } else if (isSelected) {
              tileStyle = 'bg-emerald-400 border-emerald-200 text-slate-950';
              labelText = puzzle.orderMode === 'libre' ? '✓' : String(selectedOrder);
            } else if (showMissedReveal) {
              tileStyle = 'bg-sky-500/35 border-sky-400 text-sky-100';
              labelText = puzzle.orderMode === 'libre' ? '●' : String(expectedSequence.indexOf(idx) + 1);
            }

            return (
              <button
                key={idx}
                type="button"
                disabled={phase !== 'recall'}
                data-testid={`memory-cell-${idx}`}
                data-target={isTarget ? 'true' : 'false'}
                aria-label={`Casilla ${idx + 1}`}
                onClick={() => handleTileClick(idx)}
                className={`${tileSizeClass} rounded-xl border-2 font-mono-num font-bold flex items-center justify-center transition-all duration-150 cursor-pointer disabled:cursor-default select-none ${tileStyle}`}
              >
                {labelText}
              </button>
            );
          })}
        </div>
      </div>

      {/* Progress dots */}
      <div className="text-xs text-slate-400 font-mono-num">
        Seleccionadas: {selectedCells.length} / {puzzle.sequence.length}
      </div>
    </div>
  );
}
