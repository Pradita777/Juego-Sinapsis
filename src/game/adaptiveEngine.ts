import type {
  AdaptationDirection,
  AttentionDifficultyParams,
  CognitiveDomain,
  DomainProgress,
  LogicDifficultyParams,
  MemoryDifficultyParams,
  PlayerProfile,
  RoundEvaluation,
  RoundResultInput,
} from './types';

export const MIN_LEVEL = 1;
export const MAX_LEVEL = 10;
export const STORAGE_KEY = 'sinapsis_profile_v1';

export const DOMAIN_META: Record<
  CognitiveDomain,
  {
    title: string;
    gameName: string;
    shortDesc: string;
    accentHex: string;
    badgeText: string;
  }
> = {
  logica: {
    title: 'Lógica',
    gameName: 'Equilibrio Numérico',
    shortDesc: 'Operadores ocultos, secuencias y comparación mental.',
    accentHex: '#F59E0B',
    badgeText: 'Razonamiento',
  },
  memoria: {
    title: 'Memoria',
    gameName: 'Matriz Eco',
    shortDesc: 'Patrones espaciales, secuencias y orden inverso.',
    accentHex: '#38BDF8',
    badgeText: 'Retención',
  },
  atencion: {
    title: 'Atención Rápida',
    gameName: 'Filtro Relámpago',
    shortDesc: 'Clasificación veloz, cambio de regla y control de impulsos.',
    accentHex: '#10B981',
    badgeText: 'Enfoque',
  },
};

export function createDefaultDomainProgress(domain: CognitiveDomain): DomainProgress {
  return {
    domain,
    level: 1,
    peakIndex: 120,
    xp: 0,
    bestScore: 0,
    roundsPlayed: 0,
    positiveStreak: 0,
    struggleStreak: 0,
    lastAdaptation: 'steady',
    history: [],
  };
}

export function createDefaultProfile(): PlayerProfile {
  return {
    domains: {
      logica: createDefaultDomainProgress('logica'),
      memoria: createDefaultDomainProgress('memoria'),
      atencion: createDefaultDomainProgress('atencion'),
    },
    totalSessions: 0,
    dailyStreak: 1,
    lastPlayedDate: null,
    muted: false,
  };
}

export function clampLevel(level: number): number {
  return Math.max(MIN_LEVEL, Math.min(MAX_LEVEL, Math.round(level)));
}

export function getLogicDifficultyParams(levelInput: number): LogicDifficultyParams {
  const level = clampLevel(levelInput);
  const tierLabels = [
    'Cálculo Base',
    'Patrones Simples',
    'Multiplicación Ágil',
    'Series Alternas',
    'Doble Operación',
    'Paréntesis Rápidos',
    'Sucesiones Cuadráticas',
    'Deducción Compuesta',
    'Equilibrio Avanzado',
    'Maestro Lógico',
  ];
  return {
    level,
    roundDurationSec: level <= 3 ? 50 : level <= 7 ? 45 : 42,
    targetQuestions: 6 + Math.floor((level - 1) / 2),
    tierLabel: tierLabels[level - 1],
  };
}

export function getMemoryDifficultyParams(levelInput: number): MemoryDifficultyParams {
  const level = clampLevel(levelInput);
  if (level === 1) {
    return { level, gridSize: 3, targetCount: 3, revealMs: 2200, orderMode: 'libre', puzzlesPerRound: 4, tierLabel: 'Matriz 3×3 · Libre' };
  }
  if (level === 2) {
    return { level, gridSize: 3, targetCount: 4, revealMs: 1950, orderMode: 'libre', puzzlesPerRound: 4, tierLabel: 'Matriz 3×3 · 4 Fichas' };
  }
  if (level === 3) {
    return { level, gridSize: 4, targetCount: 5, revealMs: 1500, orderMode: 'libre', puzzlesPerRound: 4, tierLabel: 'Matriz 4×4 · Libre' };
  }
  if (level === 4) {
    return { level, gridSize: 4, targetCount: 4, revealMs: 1850, orderMode: 'secuencial', puzzlesPerRound: 5, tierLabel: 'Matriz 4×4 · En Orden' };
  }
  if (level === 5) {
    return { level, gridSize: 4, targetCount: 5, revealMs: 1750, orderMode: 'secuencial', puzzlesPerRound: 5, tierLabel: 'Secuencia 4×4 · 5 Pasos' };
  }
  if (level === 6) {
    return { level, gridSize: 5, targetCount: 6, revealMs: 1800, orderMode: 'secuencial', puzzlesPerRound: 5, tierLabel: 'Matriz 5×5 · En Orden' };
  }
  if (level === 7) {
    return { level, gridSize: 5, targetCount: 7, revealMs: 1650, orderMode: 'secuencial', puzzlesPerRound: 5, tierLabel: 'Secuencia 5×5 · Rápida' };
  }
  if (level === 8) {
    return { level, gridSize: 5, targetCount: 5, revealMs: 1950, orderMode: 'inverso', puzzlesPerRound: 5, tierLabel: 'Matriz 5×5 · Orden Inverso' };
  }
  if (level === 9) {
    return { level, gridSize: 6, targetCount: 7, revealMs: 1900, orderMode: 'inverso', puzzlesPerRound: 5, tierLabel: 'Matriz 6×6 · Orden Inverso' };
  }
  return { level, gridSize: 6, targetCount: 9, revealMs: 1800, orderMode: 'inverso', puzzlesPerRound: 6, tierLabel: 'Maestro Eco 6×6' };
}

export function getAttentionDifficultyParams(levelInput: number): AttentionDifficultyParams {
  const level = clampLevel(levelInput);
  const binCount: 2 | 3 | 4 = level <= 3 ? 2 : level <= 6 ? 3 : 4;
  const cardTimeoutMs = Math.max(1350, 3600 - (level - 1) * 230);
  const allowRuleSwitch = level >= 3;
  const allowStroopConflict = level >= 5;
  const tierLabels = [
    '2 Rutas · Ritmo Base',
    '2 Rutas · Velocidad Media',
    'Cambio de Regla',
    'Cambio de Regla Ágil',
    '3 Rutas + Interferencia',
    '3 Rutas · Stroop Rápido',
    '4 Rutas · Enfoque Alto',
    '4 Rutas · Cambio Doble',
    '4 Rutas · Precisión Extrema',
    'Reflejo Maestro',
  ];
  return {
    level,
    roundDurationSec: 40,
    binCount,
    cardTimeoutMs,
    allowRuleSwitch,
    allowStroopConflict,
    tierLabel: tierLabels[level - 1],
  };
}

/**
 * Evaluates a finished round and deterministically adapts the user's difficulty level
 * and Peak Cognitive Index for that domain.
 */
export function evaluateAndAdaptRound(
  profile: PlayerProfile,
  input: RoundResultInput,
  now = Date.now(),
): { nextProfile: PlayerProfile; evaluation: RoundEvaluation } {
  const current = profile.domains[input.domain];
  const accuracy = Math.max(0, Math.min(100, Math.round(input.accuracy)));
  const score = Math.max(0, Math.round(input.score));
  const avgReactionMs = Math.max(150, Math.round(input.avgReactionMs));

  let positiveStreak = current.positiveStreak;
  let struggleStreak = current.struggleStreak;
  let newLevel = current.level;
  let adaptation: AdaptationDirection = 'steady';
  let adaptationReason = 'Mantienes el nivel para consolidar tu precisión.';

  const strongRound = accuracy >= 80 && input.correctCount >= 3;
  const solidRound = accuracy >= 72 && input.correctCount >= 3;
  const weakRound = accuracy < 50 || input.correctCount === 0;

  if (strongRound) {
    positiveStreak += 1;
    struggleStreak = 0;
    if (current.level < MAX_LEVEL) {
      newLevel = current.level + 1;
      adaptation = 'up';
      adaptationReason = `Precisión de ${accuracy}%: subes al Nivel ${newLevel}.`;
      positiveStreak = 0;
    } else {
      adaptationReason = `Nivel máximo dominado con ${accuracy}% de precisión.`;
    }
  } else if (solidRound) {
    positiveStreak += 1;
    struggleStreak = 0;
    if (positiveStreak >= 2 && current.level < MAX_LEVEL) {
      newLevel = current.level + 1;
      adaptation = 'up';
      adaptationReason = `Dos rondas sólidas seguidas: subes al Nivel ${newLevel}.`;
      positiveStreak = 0;
    } else {
      adaptationReason = 'Buen ritmo. Otra ronda sólida subirá la dificultad.';
    }
  } else if (weakRound) {
    struggleStreak += 1;
    positiveStreak = 0;
    if (struggleStreak >= 2 && current.level > MIN_LEVEL) {
      newLevel = current.level - 1;
      adaptation = 'down';
      adaptationReason = `Ajustamos al Nivel ${newLevel} para recuperar ritmo y confianza.`;
      struggleStreak = 0;
    } else if (current.level > MIN_LEVEL) {
      adaptationReason = 'Ronda exigente. Si necesitas otro intento, el nivel se ajustará.';
    } else {
      adaptationReason = 'Sigue practicando en Nivel 1: cada intento entrena tu enfoque.';
    }
  } else {
    // 50..71%
    positiveStreak = 0;
    struggleStreak = 0;
  }

  // Peak Cognitive Index calculation (100..1200)
  const levelBase = newLevel * 85;
  const accuracyBonus = Math.round((accuracy / 100) * 140);
  const speedBonus = Math.max(0, Math.round((2800 - Math.min(2800, avgReactionMs)) / 22));
  const targetPeak = Math.min(1200, Math.max(100, levelBase + accuracyBonus + speedBonus));
  const smoothedPeak = Math.round(current.peakIndex * 0.45 + targetPeak * 0.55);
  const finalPeak = adaptation === 'up' ? Math.max(current.peakIndex + 18, smoothedPeak) : smoothedPeak;
  const peakDelta = finalPeak - current.peakIndex;

  const xpEarned = Math.max(15, Math.round(score * 0.12 + accuracy * 0.6 + newLevel * 8));
  const isNewBest = score > current.bestScore;

  const nextEntry = {
    timestamp: now,
    level: current.level,
    score,
    accuracy,
    avgReactionMs,
    correctCount: input.correctCount,
    totalCount: input.totalCount,
  };

  const nextDomain: DomainProgress = {
    domain: input.domain,
    level: newLevel,
    peakIndex: finalPeak,
    xp: current.xp + xpEarned,
    bestScore: Math.max(current.bestScore, score),
    roundsPlayed: current.roundsPlayed + 1,
    positiveStreak,
    struggleStreak,
    lastAdaptation: adaptation,
    history: [...current.history.slice(-9), nextEntry],
  };

  const todayStr = new Date(now).toISOString().slice(0, 10);
  let dailyStreak = profile.dailyStreak;
  if (profile.lastPlayedDate && profile.lastPlayedDate !== todayStr) {
    const prevDate = new Date(profile.lastPlayedDate + 'T00:00:00Z').getTime();
    const currDate = new Date(todayStr + 'T00:00:00Z').getTime();
    const diffDays = Math.round((currDate - prevDate) / 86400000);
    dailyStreak = diffDays === 1 ? profile.dailyStreak + 1 : 1;
  }

  const nextProfile: PlayerProfile = {
    ...profile,
    domains: {
      ...profile.domains,
      [input.domain]: nextDomain,
    },
    totalSessions: profile.totalSessions + 1,
    dailyStreak,
    lastPlayedDate: todayStr,
  };

  return {
    nextProfile,
    evaluation: {
      domain: input.domain,
      previousLevel: current.level,
      newLevel,
      adaptation,
      adaptationReason,
      previousPeakIndex: current.peakIndex,
      newPeakIndex: finalPeak,
      peakDelta,
      xpEarned,
      isNewBest,
      result: { ...input, accuracy, score, avgReactionMs },
    },
  };
}

export function getOverallPeakIndex(profile: PlayerProfile): number {
  const { logica, memoria, atencion } = profile.domains;
  return Math.round((logica.peakIndex + memoria.peakIndex + atencion.peakIndex) / 3);
}

export function loadProfile(): PlayerProfile {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return createDefaultProfile();
    }
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return createDefaultProfile();
    const parsed = JSON.parse(raw) as Partial<PlayerProfile>;
    const base = createDefaultProfile();
    return {
      ...base,
      ...parsed,
      domains: {
        logica: { ...base.domains.logica, ...(parsed.domains?.logica ?? {}) },
        memoria: { ...base.domains.memoria, ...(parsed.domains?.memoria ?? {}) },
        atencion: { ...base.domains.atencion, ...(parsed.domains?.atencion ?? {}) },
      },
    };
  } catch {
    return createDefaultProfile();
  }
}

export function saveProfile(profile: PlayerProfile): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
    }
  } catch {
    // Ignore storage quota errors cleanly
  }
}
