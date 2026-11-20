import type { ReactNode } from 'react';
import { Pause, RotateCcw, Volume2, VolumeX } from 'lucide-react';
import { DOMAIN_META } from '../game/adaptiveEngine';
import type { CognitiveDomain } from '../game/types';

interface GameShellProps {
  domain: CognitiveDomain;
  level: number;
  score: number;
  combo: number;
  progressLabel: string;
  timeRemainingSec?: number;
  timeTotalSec?: number;
  circuitProgress?: { current: number; total: number } | null;
  muted: boolean;
  onToggleMute: () => void;
  onPause: () => void;
  onRestart: () => void;
  children: ReactNode;
}

export function GameShell({
  domain,
  level,
  score,
  combo,
  progressLabel,
  timeRemainingSec,
  timeTotalSec,
  circuitProgress,
  muted,
  onToggleMute,
  onPause,
  onRestart,
  children,
}: GameShellProps) {
  const meta = DOMAIN_META[domain];
  const timePct =
    timeRemainingSec !== undefined && timeTotalSec && timeTotalSec > 0
      ? Math.max(0, Math.min(100, (timeRemainingSec / timeTotalSec) * 100))
      : null;

  return (
    <div className="relative z-10 min-h-screen w-full flex flex-col justify-between px-4 py-4 md:px-8 md:py-6 max-w-5xl mx-auto">
      {/* Compact Perimeter HUD */}
      <header className="w-full flex flex-col gap-2.5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Left: Domain & Adaptive Level */}
          <div className="flex items-center gap-3">
            <span
              className="w-3 h-3 rounded-sm shrink-0"
              style={{ backgroundColor: meta.accentHex }}
              aria-hidden="true"
            />
            <div className="flex items-baseline gap-2.5">
              <span className="font-display font-bold text-lg md:text-xl text-white whitespace-nowrap">
                {meta.gameName}
              </span>
              <span className="font-mono-num text-xs md:text-sm font-semibold text-slate-300 whitespace-nowrap">
                Nivel {level}
              </span>
              {circuitProgress && (
                <span className="font-mono-num text-xs text-amber-300 whitespace-nowrap">
                  · Circuito {circuitProgress.current}/{circuitProgress.total}
                </span>
              )}
            </div>
          </div>

          {/* Center: Tabular Metrics */}
          <div className="flex items-center gap-4 md:gap-6">
            <div className="flex flex-col items-end md:items-center">
              <span className="text-[11px] uppercase tracking-wider text-slate-400">Puntos</span>
              <span className="font-mono-num font-bold text-lg md:text-xl text-white leading-none" data-testid="hud-score">
                {Math.round(score)}
              </span>
            </div>

            <div className="flex flex-col items-end md:items-center">
              <span className="text-[11px] uppercase tracking-wider text-slate-400">Racha</span>
              <span
                className="font-mono-num font-bold text-lg md:text-xl leading-none"
                style={{ color: combo >= 3 ? meta.accentHex : '#e2e8f0' }}
                data-testid="hud-combo"
              >
                ×{Math.max(1, combo)}
              </span>
            </div>

            <div className="flex flex-col items-end md:items-center">
              <span className="text-[11px] uppercase tracking-wider text-slate-400">
                {timeRemainingSec !== undefined ? 'Tiempo' : 'Progreso'}
              </span>
              <span
                className={`font-mono-num font-bold text-lg md:text-xl leading-none ${
                  timeRemainingSec !== undefined && timeRemainingSec <= 8 ? 'text-rose-400' : 'text-slate-100'
                }`}
                data-testid="hud-progress"
              >
                {timeRemainingSec !== undefined ? `${Math.ceil(timeRemainingSec)}s` : progressLabel}
              </span>
            </div>
          </div>

          {/* Right: Utility Controls */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              tabIndex={-1}
              onClick={(e) => {
                e.currentTarget.blur();
                onToggleMute();
              }}
              aria-label={muted ? 'Activar sonido [M]' : 'Silenciar sonido [M]'}
              title="Sonido [M]"
              className="w-10 h-10 rounded-lg bg-[#161e31] border border-slate-700/80 text-slate-200 hover:border-slate-500 inline-flex items-center justify-center cursor-pointer"
            >
              {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <button
              type="button"
              tabIndex={-1}
              onClick={(e) => {
                e.currentTarget.blur();
                onRestart();
              }}
              aria-label="Reiniciar reto [R]"
              title="Reiniciar [R]"
              className="w-10 h-10 rounded-lg bg-[#161e31] border border-slate-700/80 text-slate-200 hover:border-slate-500 inline-flex items-center justify-center cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              type="button"
              tabIndex={-1}
              onClick={(e) => {
                e.currentTarget.blur();
                onPause();
              }}
              aria-label="Pausar juego [Esc / P]"
              title="Pausar [Esc / P]"
              className="w-10 h-10 rounded-lg bg-[#161e31] border border-slate-700/80 text-slate-200 hover:border-slate-500 inline-flex items-center justify-center cursor-pointer"
            >
              <Pause className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Clean thin progress / time rail */}
        {timePct !== null && (
          <div className="w-full h-1.5 rounded-full bg-slate-800/90 overflow-hidden">
            <div
              className="h-full transition-transform duration-150 origin-left"
              style={{
                transform: `scaleX(${timePct / 100})`,
                backgroundColor: timeRemainingSec !== undefined && timeRemainingSec <= 8 ? '#F43F5E' : meta.accentHex,
              }}
            />
          </div>
        )}
      </header>

      {/* Main Playfield (>= 85% open area) */}
      <main className="flex-1 flex flex-col items-center justify-center py-4 md:py-6">{children}</main>

      {/* Quiet bottom control reminder */}
      <footer className="text-center text-xs text-slate-400">
        Esc Pausa · R Reiniciar · M Sonido
      </footer>
    </div>
  );
}
