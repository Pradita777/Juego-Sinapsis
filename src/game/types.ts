export type CognitiveDomain = 'logica' | 'memoria' | 'atencion';

export type ShellScreenState = 'title' | 'hub' | 'playing' | 'paused' | 'gameover';

export type AdaptationDirection = 'up' | 'steady' | 'down';

export interface RoundHistoryEntry {
  timestamp: number;
  level: number;
  score: number;
  accuracy: number; // 0..100
  avgReactionMs: number;
  correctCount: number;
  totalCount: number;
}

export interface DomainProgress {
  domain: CognitiveDomain;
  level: number; // 1..10
  peakIndex: number; // 100..1200
  xp: number;
  bestScore: number;
  roundsPlayed: number;
  positiveStreak: number;
  struggleStreak: number;
  lastAdaptation: AdaptationDirection;
  history: RoundHistoryEntry[];
}

export interface PlayerProfile {
  domains: Record<CognitiveDomain, DomainProgress>;
  totalSessions: number;
  dailyStreak: number;
  lastPlayedDate: string | null;
  muted: boolean;
}

export interface RoundResultInput {
  domain: CognitiveDomain;
  score: number;
  accuracy: number; // 0..100
  avgReactionMs: number;
  correctCount: number;
  totalCount: number;
  maxCombo: number;
}

export interface RoundEvaluation {
  domain: CognitiveDomain;
  previousLevel: number;
  newLevel: number;
  adaptation: AdaptationDirection;
  adaptationReason: string;
  previousPeakIndex: number;
  newPeakIndex: number;
  peakDelta: number;
  xpEarned: number;
  isNewBest: boolean;
  result: RoundResultInput;
}

export interface LogicDifficultyParams {
  level: number;
  roundDurationSec: number;
  targetQuestions: number;
  tierLabel: string;
}

export interface MemoryDifficultyParams {
  level: number;
  gridSize: number; // 3..6
  targetCount: number;
  revealMs: number;
  orderMode: 'libre' | 'secuencial' | 'inverso';
  puzzlesPerRound: number;
  tierLabel: string;
}

export interface AttentionDifficultyParams {
  level: number;
  roundDurationSec: number;
  binCount: 2 | 3 | 4;
  cardTimeoutMs: number;
  allowRuleSwitch: boolean;
  allowStroopConflict: boolean;
  tierLabel: string;
}

export interface LogicQuestion {
  id: string;
  kind: 'operador' | 'serie' | 'balanza' | 'comparacion';
  prompt: string;
  expression: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface MemoryPuzzle {
  gridSize: number;
  sequence: number[]; // cell indices 0..gridSize*gridSize-1
  revealMs: number;
  orderMode: 'libre' | 'secuencial' | 'inverso';
}

export type AttentionShape = 'circulo' | 'triangulo' | 'cuadrado' | 'rombo';
export type AttentionHue = 'ambar' | 'cielo' | 'esmeralda' | 'coral';
export type AttentionRule = 'color' | 'forma' | 'palabra';

export interface AttentionBin {
  id: string;
  keyHint: string;
  label: string;
  hue?: AttentionHue;
  shape?: AttentionShape;
}

export interface AttentionStimulus {
  id: string;
  shape: AttentionShape;
  hue: AttentionHue;
  word: string;
  wordTargetHue: AttentionHue;
  isConflict: boolean;
  correctBinId: string;
}
