import { Brain, Compass, Eye, Flame, Play, RotateCcw, Sparkles, Volume2, VolumeX, Zap } from 'lucide-react';
import {
  DOMAIN_META,
  getAttentionDifficultyParams,
  getLogicDifficultyParams,
  getMemoryDifficultyParams,
  getOverallPeakIndex,
} from '../game/adaptiveEngine';
import type { CognitiveDomain, PlayerProfile } from '../game/types';
import { CognitiveRadar } from './CognitiveRadar';

interface TrainingHubProps {
  profile: PlayerProfile;
  zenInspect: boolean;
  onToggleZenInspect: () => void;
  onToggleMute: () => void;
  onStartDomain: (domain: CognitiveDomain) => void;
  onStartDailyCircuit: () => void;
  onResetProgress: () => void;
}

export function TrainingHub({
  profile,
  zenInspect,
  onToggleZenInspect,
  onToggleMute,
  onStartDomain,
  onStartDailyCircuit,
  onResetProgress,
}: TrainingHubProps) {
  const overallPeak = getOverallPeakIndex(profile);

  const domainConfigs: Array<{
    domain: CognitiveDomain;
    icon: typeof Brain;
    accentText: string;
    accentBorder: string;
    accentBg: string;
    btnBg: string;
    ruleSummary: string;
  }> = [
    {
      domain: 'logica',
      icon: Sparkles,
      accentText: 'text-amber-300',
      accentBorder: 'border-amber-500/35',
      accentBg: 'bg-amber-500/15',
      btnBg: 'bg-amber-500 hover:bg-amber-400 text-slate-950',
      ruleSummary: getLogicDifficultyParams(profile.domains.logica.level).tierLabel,
    },
    {
      domain: 'memoria',
      icon: Brain,
      accentText: 'text-sky-300',
      accentBorder: 'border-sky-500/35',
      accentBg: 'bg-sky-500/15',
      btnBg: 'bg-sky-400 hover:bg-sky-300 text-slate-950',
      ruleSummary: getMemoryDifficultyParams(profile.domains.memoria.level).tierLabel,
    },
    {
      domain: 'atencion',
      icon: Zap,
      accentText: 'text-emerald-300',
      accentBorder: 'border-emerald-500/35',
      accentBg: 'bg-emerald-500/15',
      btnBg: 'bg-emerald-400 hover:bg-emerald-300 text-slate-950',
      ruleSummary: getAttentionDifficultyParams(profile.domains.atencion.level).tierLabel,
    },
  ];

  if (zenInspect) {
    return (
      <div className="relative z-10 min-h-screen w-full flex flex-col justify-between p-6 pointer-events-none">
        <div className="flex items-center justify-between">
          <div className="bg-[#121a2d]/95 border border-slate-700/80 rounded-xl px-4 py-2.5 pointer-events-auto">
            <span className="font-display font-bold text-slate-100">Astrolabio Cognitivo 3D</span>
            <span className="mx-2 text-slate-500">·</span>
            <span className="text-xs text-slate-300">Mueve el cursor para observar tus 3 prismas de nivel</span>
          </div>
          <button
            type="button"
            onClick={onToggleZenInspect}
            className="pointer-events-auto inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-sm cursor-pointer"
          >
            <Eye className="w-4 h-4" />
            Volver al Centro
          </button>
        </div>
        <div className="text-xs text-slate-400">
          Ámbar: Lógica (Nv. {profile.domains.logica.level}) · Azul: Memoria (Nv. {profile.domains.memoria.level}) · Verde: Atención (Nv. {profile.domains.atencion.level})
        </div>
      </div>
    );
  }

  return (
    <div className="relative z-10 min-h-screen w-full flex flex-col justify-between px-5 py-5 md:px-10 md:py-7 max-w-6xl mx-auto">
      {/* Compact Perimeter Bar */}
      <header className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-slate-800/90">
        <div className="flex items-center gap-4">
          <span className="font-display font-extrabold text-2xl tracking-wider text-white">SINAPSIS</span>
          <span className="text-slate-600" aria-hidden="true">/</span>
          <span className="text-sm text-slate-300">Centro de Entrenamiento</span>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#161e31] border border-slate-700/80 whitespace-nowrap">
            <Compass className="w-4 h-4 text-sky-400 shrink-0" />
            <span className="text-xs text-slate-400">Índice Peak</span>
            <span className="font-mono-num font-bold text-sm text-white">{overallPeak}</span>
          </div>

          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#161e31] border border-slate-700/80 whitespace-nowrap">
            <Flame className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="text-xs text-slate-400">Racha</span>
            <span className="font-mono-num font-bold text-sm text-white">{profile.dailyStreak}d</span>
          </div>

          <button
            type="button"
            onClick={onToggleZenInspect}
            title="Explorar núcleo 3D"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#161e31] border border-slate-700/80 text-slate-200 hover:border-slate-500 text-xs font-medium cursor-pointer whitespace-nowrap"
          >
            <Eye className="w-4 h-4 shrink-0" />
            <span className="hidden sm:inline">Núcleo 3D</span>
          </button>

          <button
            type="button"
            onClick={onToggleMute}
            aria-label={profile.muted ? 'Activar sonido' : 'Silenciar sonido'}
            className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-[#161e31] border border-slate-700/80 text-slate-200 hover:border-slate-500 cursor-pointer shrink-0"
          >
            {profile.muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Main Hub Grid */}
      <main className="my-auto py-6 flex flex-col gap-7">
        {/* Daily Circuit Hero Strip + Triad Radar */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center bg-[#141c2f]/95 border border-slate-700/80 rounded-2xl p-6 md:p-7">
          <div className="lg:col-span-7 flex flex-col gap-4">
            <div className="text-xs font-semibold tracking-wide text-amber-300">
              Sesión diaria · Circuito completo
            </div>
            <h1 className="text-2xl md:text-3xl font-display font-bold text-white leading-tight text-balance">
              Entrena tus 3 habilidades en secuencia adaptativa
            </h1>
            <p className="text-sm md:text-base text-slate-300 leading-relaxed max-w-xl">
              Completa Lógica, Memoria y Atención Rápida seguidos. Si superas el 80% de precisión, tu nivel sube automáticamente en el próximo reto.
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                type="button"
                data-start-circuit="true"
                onClick={onStartDailyCircuit}
                className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-[0.98] text-slate-950 font-display font-bold text-base transition-all cursor-pointer whitespace-nowrap"
              >
                <Play className="w-5 h-5 fill-slate-950" />
                Iniciar Circuito Diario (3 Retos)
              </button>
              {profile.totalSessions > 0 && (
                <button
                  type="button"
                  onClick={onResetProgress}
                  className="inline-flex items-center gap-2 px-4 py-3.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 text-sm font-medium border border-slate-700 cursor-pointer whitespace-nowrap"
                >
                  <RotateCcw className="w-4 h-4" />
                  Reiniciar Progreso
                </button>
              )}
            </div>
          </div>

          <div className="lg:col-span-5 flex flex-col items-center justify-center border-t lg:border-t-0 lg:border-l border-slate-800 pt-5 lg:pt-0 lg:pl-6">
            <CognitiveRadar profile={profile} />
          </div>
        </section>

        {/* 3 Pillar Cards */}
        <section aria-label="Desafíos individuales" className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {domainConfigs.map(({ domain, icon: Icon, accentText, accentBorder, btnBg, ruleSummary }) => {
            const meta = DOMAIN_META[domain];
            const progress = profile.domains[domain];
            const adaptLabel =
              progress.lastAdaptation === 'up'
                ? 'Subiendo ▲'
                : progress.lastAdaptation === 'down'
                ? 'Ajustado ▼'
                : 'Estable';

            return (
              <article
                key={domain}
                className={`flex flex-col justify-between bg-[#141c2f]/95 border ${accentBorder} rounded-2xl p-5 gap-5`}
              >
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className={`inline-flex items-center gap-2 ${accentText} text-xs font-bold tracking-wide`}>
                      <Icon className="w-4 h-4" />
                      <span>{meta.title}</span>
                    </div>
                    <span className="font-mono-num text-xs font-bold text-slate-300 whitespace-nowrap">
                      Nivel {progress.level} / 10
                    </span>
                  </div>

                  <div>
                    <h2 className="text-xl font-display font-bold text-white">{meta.gameName}</h2>
                    <p className="text-sm text-slate-300 mt-1 leading-relaxed">{meta.shortDesc}</p>
                  </div>

                  {/* Difficulty bar */}
                  <div className="pt-1">
                    <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
                      <span>{ruleSummary}</span>
                      <span className="font-mono-num text-slate-300">{adaptLabel}</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${(progress.level / 10) * 100}%`,
                          backgroundColor: meta.accentHex,
                        }}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-800/80">
                  <div className="text-xs text-slate-400">
                    Mejor: <span className="font-mono-num font-bold text-slate-200">{progress.bestScore}</span>
                    <span className="mx-1.5">·</span>
                    Peak: <span className="font-mono-num font-bold text-slate-200">{progress.peakIndex}</span>
                  </div>
                  <button
                    type="button"
                    data-play-domain={domain}
                    onClick={() => onStartDomain(domain)}
                    className={`px-4 py-2.5 rounded-lg font-display font-bold text-sm transition-colors cursor-pointer whitespace-nowrap ${btnBg}`}
                  >
                    Jugar
                  </button>
                </div>
              </article>
            );
          })}
        </section>
      </main>
    </div>
  );
}
