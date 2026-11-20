import { ArrowDownRight, ArrowRight, ArrowUpRight, CheckCircle2, Home, Play, RotateCcw } from 'lucide-react';
import { DOMAIN_META } from '../game/adaptiveEngine';
import type { RoundEvaluation } from '../game/types';

interface PauseModalProps {
  gameName: string;
  onResume: () => void;
  onRestart: () => void;
  onExitToHub: () => void;
}

export function PauseModal({ gameName, onResume, onRestart, onExitToHub }: PauseModalProps) {
  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-[#070b14]/88 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Juego en pausa"
    >
      <div className="w-full max-w-md bg-[#141c2f] border border-slate-700 rounded-2xl p-7 shadow-2xl flex flex-col gap-6">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">En Pausa</div>
          <h2 className="text-2xl font-display font-bold text-white mt-1">{gameName}</h2>
        </div>

        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={onResume}
            className="w-full inline-flex items-center justify-center gap-2.5 px-5 py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-display font-bold text-base cursor-pointer"
          >
            <Play className="w-4 h-4 fill-slate-950" />
            Reanudar
          </button>
          <button
            type="button"
            onClick={onRestart}
            className="w-full inline-flex items-center justify-center gap-2.5 px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 font-semibold text-sm border border-slate-700 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            Reiniciar Reto
          </button>
          <button
            type="button"
            onClick={onExitToHub}
            className="w-full inline-flex items-center justify-center gap-2.5 px-5 py-3 rounded-xl bg-transparent hover:bg-slate-800/70 text-slate-300 font-semibold text-sm border border-slate-700/80 cursor-pointer"
          >
            <Home className="w-4 h-4" />
            Volver al Centro
          </button>
        </div>
      </div>
    </div>
  );
}

interface SummaryModalProps {
  evaluation: RoundEvaluation;
  hasNextInCircuit: boolean;
  onNextInCircuit: () => void;
  onPlayAgain: () => void;
  onExitToHub: () => void;
}

export function SummaryModal({
  evaluation,
  hasNextInCircuit,
  onNextInCircuit,
  onPlayAgain,
  onExitToHub,
}: SummaryModalProps) {
  const meta = DOMAIN_META[evaluation.domain];
  const { result } = evaluation;

  const adaptColor =
    evaluation.adaptation === 'up'
      ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-200'
      : evaluation.adaptation === 'down'
      ? 'bg-sky-500/15 border-sky-500/40 text-sky-200'
      : 'bg-slate-800/90 border-slate-700 text-slate-200';

  const AdaptIcon =
    evaluation.adaptation === 'up'
      ? ArrowUpRight
      : evaluation.adaptation === 'down'
      ? ArrowDownRight
      : CheckCircle2;

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-[#070b14]/90 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Resumen de ronda"
    >
      <div className="w-full max-w-lg bg-[#141c2f] border border-slate-700 rounded-2xl p-6 md:p-8 shadow-2xl flex flex-col gap-6 animate-sinapsis-pop">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider" style={{ color: meta.accentHex }}>
              {meta.title} · {meta.gameName}
            </div>
            <h2 className="text-2xl md:text-3xl font-display font-bold text-white mt-1">
              {evaluation.isNewBest ? '¡Nuevo Récord Personal!' : 'Reto Completado'}
            </h2>
          </div>
          <div className="text-right">
            <div className="text-xs text-slate-400">Índice Peak</div>
            <div className="font-mono-num text-xl font-bold text-white">
              {evaluation.newPeakIndex}
              <span className={`ml-1.5 text-xs ${evaluation.peakDelta >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {evaluation.peakDelta >= 0 ? `+${evaluation.peakDelta}` : evaluation.peakDelta}
              </span>
            </div>
          </div>
        </div>

        {/* 3 Tabular Stat Tiles */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-[#0f1626] border border-slate-800 rounded-xl p-3.5 text-center">
            <div className="text-xs text-slate-400">Puntuación</div>
            <div className="font-mono-num text-2xl font-bold text-white mt-1">{result.score}</div>
          </div>
          <div className="bg-[#0f1626] border border-slate-800 rounded-xl p-3.5 text-center">
            <div className="text-xs text-slate-400">Precisión</div>
            <div className="font-mono-num text-2xl font-bold text-white mt-1">{result.accuracy}%</div>
          </div>
          <div className="bg-[#0f1626] border border-slate-800 rounded-xl p-3.5 text-center">
            <div className="text-xs text-slate-400">Reacción</div>
            <div className="font-mono-num text-2xl font-bold text-white mt-1">
              {(result.avgReactionMs / 1000).toFixed(1)}s
            </div>
          </div>
        </div>

        {/* Adaptive Difficulty Progression Banner */}
        <div className={`border rounded-xl p-4 flex items-start gap-3 ${adaptColor}`}>
          <AdaptIcon className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="flex items-center justify-between gap-2">
              <span className="font-display font-bold text-sm">
                {evaluation.adaptation === 'up'
                  ? `Dificultad aumentada: Nivel ${evaluation.previousLevel} → Nivel ${evaluation.newLevel}`
                  : evaluation.adaptation === 'down'
                  ? `Dificultad adaptada: Nivel ${evaluation.previousLevel} → Nivel ${evaluation.newLevel}`
                  : `Nivel ${evaluation.newLevel} consolidado`}
              </span>
              <span className="font-mono-num text-xs font-semibold">+{evaluation.xpEarned} XP</span>
            </div>
            <p className="text-xs md:text-sm opacity-90 mt-1">{evaluation.adaptationReason}</p>
          </div>
        </div>

        {/* Primary Action CTAs */}
        <div className="flex flex-col sm:flex-row gap-3">
          {hasNextInCircuit ? (
            <button
              type="button"
              data-start="true"
              onClick={onNextInCircuit}
              className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-display font-bold text-base cursor-pointer"
            >
              Siguiente Reto
              <ArrowRight className="w-5 h-5" />
            </button>
          ) : (
            <button
              type="button"
              data-start="true"
              onClick={onPlayAgain}
              className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-display font-bold text-base cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              Jugar de Nuevo (Nv. {evaluation.newLevel})
            </button>
          )}
          <button
            type="button"
            onClick={onExitToHub}
            className="inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 font-semibold text-sm border border-slate-700 cursor-pointer"
          >
            <Home className="w-4 h-4" />
            Centro
          </button>
        </div>
      </div>
    </div>
  );
}
