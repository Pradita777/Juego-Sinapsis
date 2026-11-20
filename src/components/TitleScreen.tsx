import { useEffect } from 'react';
import { Play, Volume2, VolumeX } from 'lucide-react';
import type { PlayerProfile } from '../game/types';
import { getOverallPeakIndex } from '../game/adaptiveEngine';

interface TitleScreenProps {
  profile: PlayerProfile;
  onStart: () => void;
  onToggleMute: () => void;
}

export function TitleScreen({ profile, onStart, onToggleMute }: TitleScreenProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onStart();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onStart]);

  const peakScore = getOverallPeakIndex(profile);

  return (
    <div className="relative z-10 min-h-screen w-full flex flex-col justify-between px-6 py-6 md:px-14 md:py-10 pointer-events-none">
      {/* Top Utility Row: Mute button only */}
      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={(e) => {
            e.currentTarget.blur();
            onToggleMute();
          }}
          aria-label={profile.muted ? 'Activar sonido' : 'Silenciar sonido'}
          className="pointer-events-auto inline-flex items-center justify-center w-11 h-11 rounded-lg bg-[#161e31]/90 border border-slate-700/80 text-slate-200 hover:bg-slate-800 hover:border-slate-500 transition-colors cursor-pointer"
        >
          {profile.muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
        </button>
      </div>

      {/* Left-third negative space lockup */}
      <main className="my-auto max-w-xl pointer-events-auto">
        <svg
          viewBox="0 0 420 96"
          className="w-full max-w-[380px] h-auto mb-5"
          role="img"
          aria-label="SINAPSIS"
        >
          {/* Geometric neural crest emblem */}
          <g transform="translate(8, 12)">
            <polygon
              points="36,2 68,20 68,56 36,74 4,56 4,20"
              fill="#161e31"
              stroke="#f59e0b"
              strokeWidth="2.5"
            />
            <polygon
              points="36,14 56,26 56,50 36,62 16,50 16,26"
              fill="none"
              stroke="#38bdf8"
              strokeWidth="2"
            />
            <circle cx="36" cy="38" r="7" fill="#10b981" />
            <line x1="36" y1="2" x2="36" y2="31" stroke="#f59e0b" strokeWidth="2" />
            <line x1="68" y1="56" x2="42" y2="41" stroke="#38bdf8" strokeWidth="2" />
            <line x1="4" y1="56" x2="30" y2="41" stroke="#10b981" strokeWidth="2" />
          </g>

          {/* Wordmark */}
          <text
            x="96"
            y="62"
            fill="#f8fafc"
            fontFamily="Outfit, system-ui, sans-serif"
            fontWeight="800"
            fontSize="54"
            letterSpacing="4"
          >
            SINAPSIS
          </text>
        </svg>

        <h1 className="text-2xl md:text-3xl font-semibold text-slate-100 leading-snug text-balance mb-3">
          Desafíos de lógica, memoria y atención rápida que evolucionan contigo.
        </h1>

        <p className="text-sm md:text-base text-slate-300 max-w-md mb-8 leading-relaxed">
          {profile.totalSessions > 0
            ? `Tu Índice Peak actual es ${peakScore} tras ${profile.totalSessions} ${profile.totalSessions === 1 ? 'reto' : 'retos'} completados.`
            : 'Entrenamiento diario inteligente: cada ronda ajusta su dificultad automáticamente a tu ritmo.'}
        </p>

        <div className="flex flex-wrap items-center gap-4">
          <button
            type="button"
            data-start="true"
            onClick={(e) => {
              e.currentTarget.blur();
              onStart();
            }}
            className="inline-flex items-center gap-3 px-7 py-4 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-[0.98] text-slate-950 font-display font-bold text-lg shadow-lg shadow-amber-500/20 transition-all cursor-pointer whitespace-nowrap"
          >
            <Play className="w-5 h-5 fill-slate-950" />
            Entrenar Ahora
          </button>
        </div>
      </main>

      {/* Single flat control hint in bottom safe margin */}
      <footer className="text-xs md:text-sm text-slate-400 font-medium tracking-wide">
        Enter / Espacio Iniciar · Clic o Teclas 1–4 Responder · Esc Pausa · M Sonido
      </footer>
    </div>
  );
}
