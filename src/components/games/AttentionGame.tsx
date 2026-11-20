import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getAttentionDifficultyParams } from '../../game/adaptiveEngine';
import { synthAudio } from '../../game/audio';
import { generateAttentionStimulus, getAttentionBins } from '../../game/challenges';
import type { AttentionHue, AttentionRule, AttentionShape, AttentionStimulus, RoundResultInput } from '../../game/types';

interface AttentionGameProps {
  level: number;
  paused: boolean;
  onHudUpdate: (hud: { score: number; combo: number; progressLabel: string; timeRemainingSec: number; timeTotalSec: number }) => void;
  onComplete: (result: RoundResultInput) => void;
}

const HUE_HEX: Record<AttentionHue, string> = {
  ambar: '#F59E0B',
  cielo: '#38BDF8',
  esmeralda: '#10B981',
  coral: '#F43F5E',
};

function ShapeSvg({ shape, hueHex, size = 76 }: { shape: AttentionShape; hueHex: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      {shape === 'circulo' && <circle cx="32" cy="32" r="24" fill={hueHex} stroke="#0f172a" strokeWidth="3" />}
      {shape === 'cuadrado' && <rect x="10" y="10" width="44" height="44" rx="8" fill={hueHex} stroke="#0f172a" strokeWidth="3" />}
      {shape === 'triangulo' && <polygon points="32,7 57,53 7,53" fill={hueHex} stroke="#0f172a" strokeWidth="3" strokeLinejoin="round" />}
      {shape === 'rombo' && <polygon points="32,6 58,32 32,58 6,32" fill={hueHex} stroke="#0f172a" strokeWidth="3" strokeLinejoin="round" />}
    </svg>
  );
}

export function AttentionGame({ level, paused, onHudUpdate, onComplete }: AttentionGameProps) {
  const params = useMemo(() => getAttentionDifficultyParams(level), [level]);

  const [rule, setRule] = useState<AttentionRule>('color');
  const [cardIndex, setCardIndex] = useState(0);
  const [stimulus, setStimulus] = useState<AttentionStimulus>(() => generateAttentionStimulus(level, 'color', 0));
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [timeLeft, setTimeLeft] = useState(params.roundDurationSec);
  const [flashState, setFlashState] = useState<'ok' | 'err' | 'switch' | null>(null);

  const cardShownAtRef = useRef<number>(performance.now());
  const reactionSumRef = useRef<number>(0);
  const finishedRef = useRef<boolean>(false);

  const bins = useMemo(() => getAttentionBins(level, rule), [level, rule]);

  const finishRound = useCallback(
    (finalScore: number, finalCorrect: number, finalTotal: number, finalMaxCombo: number) => {
      if (finishedRef.current) return;
      finishedRef.current = true;
      const total = Math.max(1, finalTotal);
      const accuracy = Math.round((finalCorrect / total) * 100);
      const avgReactionMs = finalTotal > 0 ? Math.round(reactionSumRef.current / finalTotal) : 1400;
      synthAudio.playComplete();
      onComplete({
        domain: 'atencion',
        score: finalScore,
        accuracy,
        avgReactionMs,
        correctCount: finalCorrect,
        totalCount: total,
        maxCombo: finalMaxCombo,
      });
    },
    [onComplete],
  );

  useEffect(() => {
    onHudUpdate({
      score,
      combo,
      progressLabel: `${correctCount}/${Math.max(1, totalCount)}`,
      timeRemainingSec: timeLeft,
      timeTotalSec: params.roundDurationSec,
    });
  }, [score, combo, correctCount, totalCount, timeLeft, params.roundDurationSec, onHudUpdate]);

  // Round timer
  useEffect(() => {
    if (paused || finishedRef.current) return;
    const id = window.setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 0.1) {
          window.clearInterval(id);
          return 0;
        }
        return Number((prev - 0.1).toFixed(1));
      });
    }, 100);
    return () => window.clearInterval(id);
  }, [paused]);

  useEffect(() => {
    if (timeLeft <= 0 && !finishedRef.current) {
      finishRound(score, correctCount, totalCount, maxCombo);
    }
  }, [timeLeft, score, correctCount, totalCount, maxCombo, finishRound]);

  const advanceCard = useCallback(
    (nextIdx: number, nextRule: AttentionRule) => {
      setCardIndex(nextIdx);
      setStimulus(generateAttentionStimulus(level, nextRule, nextIdx));
      cardShownAtRef.current = performance.now();
    },
    [level],
  );

  const handleChooseBin = useCallback(
    (binId: string) => {
      if (paused || finishedRef.current) return;
      const reaction = Math.max(140, performance.now() - cardShownAtRef.current);
      reactionSumRef.current += reaction;

      const isCorrect = binId === stimulus.correctBinId;
      const nextTotal = totalCount + 1;
      const nextCorrect = isCorrect ? correctCount + 1 : correctCount;
      const nextCombo = isCorrect ? combo + 1 : 0;
      const nextMaxCombo = Math.max(maxCombo, nextCombo);

      const speedBonus = reaction < 950 ? 30 : reaction < 1600 ? 15 : 0;
      const earned = isCorrect ? 65 + level * 12 + Math.min(5, nextCombo) * 15 + speedBonus : 0;
      const nextScore = score + earned;

      if (isCorrect) {
        synthAudio.playCorrect(nextCombo);
      } else {
        synthAudio.playWrong();
      }

      setTotalCount(nextTotal);
      setCorrectCount(nextCorrect);
      setCombo(nextCombo);
      setMaxCombo(nextMaxCombo);
      setScore(nextScore);

      const nextIdx = cardIndex + 1;
      let nextRule = rule;

      // Progressive adaptive rule switching from Level 3+
      if (params.allowRuleSwitch && nextIdx > 0 && nextIdx % 5 === 0) {
        const pool: AttentionRule[] = params.allowStroopConflict ? ['color', 'forma', 'palabra'] : ['color', 'forma'];
        const currentPos = pool.indexOf(rule);
        nextRule = pool[(currentPos + 1) % pool.length];
        setRule(nextRule);
        setFlashState('switch');
        synthAudio.playRuleSwitch();
      } else {
        setFlashState(isCorrect ? 'ok' : 'err');
      }

      window.setTimeout(() => setFlashState(null), 260);
      advanceCard(nextIdx, nextRule);
    },
    [
      paused,
      stimulus.correctBinId,
      totalCount,
      correctCount,
      combo,
      maxCombo,
      level,
      score,
      cardIndex,
      rule,
      params.allowRuleSwitch,
      params.allowStroopConflict,
      advanceCard,
    ],
  );

  // Keyboard support: 1..4 + ArrowLeft/ArrowRight when 2 bins
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (paused || finishedRef.current) return;
      const numIdx = ['1', '2', '3', '4'].indexOf(e.key);
      if (numIdx !== -1 && numIdx < bins.length) {
        e.preventDefault();
        handleChooseBin(bins[numIdx].id);
        return;
      }
      if (bins.length === 2) {
        if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'a') {
          e.preventDefault();
          handleChooseBin(bins[0].id);
        } else if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'd') {
          e.preventDefault();
          handleChooseBin(bins[1].id);
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [paused, bins, handleChooseBin]);

  const ruleBannerText =
    rule === 'color'
      ? 'REGLA ACTIVA: Clasifica por COLOR de la figura'
      : rule === 'forma'
      ? 'REGLA ACTIVA: Clasifica por FORMA (ignora el color)'
      : 'REGLA ACTIVA: Clasifica por lo que DICE LA PALABRA';

  return (
    <div className="w-full max-w-2xl flex flex-col items-center gap-6">
      {/* Rule Banner */}
      <div
        className={`w-full rounded-xl px-4 py-3 text-center border font-display font-bold text-sm md:text-base transition-colors ${
          flashState === 'switch'
            ? 'bg-amber-500 text-slate-950 border-amber-300 animate-sinapsis-pop'
            : 'bg-[#141c2f] text-emerald-300 border-emerald-500/40'
        }`}
        data-testid="attention-rule"
      >
        {flashState === 'switch' ? `¡CAMBIO! ${ruleBannerText}` : ruleBannerText}
      </div>

      {/* Central Stimulus Card */}
      <div
        key={stimulus.id}
        className={`w-full max-w-sm bg-[#161e31] border-2 rounded-2xl py-8 px-6 flex flex-col items-center justify-center gap-4 shadow-xl ${
          flashState === 'err'
            ? 'border-rose-500 animate-sinapsis-shake'
            : flashState === 'ok'
            ? 'border-emerald-400 animate-sinapsis-pop'
            : 'border-slate-700 animate-sinapsis-pop'
        }`}
        data-testid="attention-stimulus"
      >
        <ShapeSvg shape={stimulus.shape} hueHex={HUE_HEX[stimulus.hue]} size={88} />

        {params.allowStroopConflict && (
          <div
            className="font-display font-extrabold text-3xl tracking-wider select-none"
            style={{ color: HUE_HEX[stimulus.hue] }}
          >
            {stimulus.word}
          </div>
        )}
      </div>

      {/* Classification Bins (>= 60px touch targets) */}
      <div
        className={`w-full grid gap-3.5 ${
          bins.length === 2 ? 'grid-cols-2' : bins.length === 3 ? 'grid-cols-3' : 'grid-cols-2 sm:grid-cols-4'
        }`}
      >
        {bins.map((bin) => (
          <button
            key={bin.id}
            type="button"
            data-testid={`attention-bin-${bin.id}`}
            onClick={() => handleChooseBin(bin.id)}
            className="min-h-[68px] px-4 py-3.5 rounded-xl bg-[#182238] hover:bg-[#1f2c47] border-2 border-slate-700 hover:border-emerald-400/70 text-white flex flex-col items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2">
              {bin.hue && (
                <span
                  className="w-4 h-4 rounded-full border border-slate-900"
                  style={{ backgroundColor: HUE_HEX[bin.hue] }}
                  aria-hidden="true"
                />
              )}
              {bin.shape && <ShapeSvg shape={bin.shape} hueHex="#e2e8f0" size={24} />}
              <span className="font-display font-bold text-base md:text-lg">{bin.label}</span>
            </div>
            <span className="font-mono-num text-[11px] text-slate-400">Tecla {bin.keyHint}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
