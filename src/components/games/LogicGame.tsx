import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Check, X } from 'lucide-react';
import { getLogicDifficultyParams } from '../../game/adaptiveEngine';
import { synthAudio } from '../../game/audio';
import { generateLogicQuestion } from '../../game/challenges';
import type { LogicQuestion, RoundResultInput } from '../../game/types';

interface LogicGameProps {
  level: number;
  paused: boolean;
  onHudUpdate: (hud: { score: number; combo: number; progressLabel: string; timeRemainingSec: number; timeTotalSec: number }) => void;
  onComplete: (result: RoundResultInput) => void;
}

export function LogicGame({ level, paused, onHudUpdate, onComplete }: LogicGameProps) {
  const params = useMemo(() => getLogicDifficultyParams(level), [level]);

  const [questionIdx, setQuestionIdx] = useState(0);
  const [question, setQuestion] = useState<LogicQuestion>(() => generateLogicQuestion(level, 0));
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [timeLeft, setTimeLeft] = useState(params.roundDurationSec);
  const [feedback, setFeedback] = useState<{ selected: number; isCorrect: boolean; explanation: string } | null>(null);

  const questionShownAtRef = useRef<number>(performance.now());
  const reactionSumRef = useRef<number>(0);
  const finishedRef = useRef<boolean>(false);
  const nextTimerRef = useRef<number | null>(null);

  const finishRound = useCallback(
    (finalScore: number, finalCorrect: number, finalAnswered: number, finalMaxCombo: number) => {
      if (finishedRef.current) return;
      finishedRef.current = true;
      if (nextTimerRef.current) window.clearTimeout(nextTimerRef.current);
      const total = Math.max(1, finalAnswered);
      const accuracy = Math.round((finalCorrect / total) * 100);
      const avgReactionMs = finalAnswered > 0 ? Math.round(reactionSumRef.current / finalAnswered) : 2500;
      synthAudio.playComplete();
      onComplete({
        domain: 'logica',
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
      progressLabel: `${Math.min(questionIdx + 1, params.targetQuestions)}/${params.targetQuestions}`,
      timeRemainingSec: timeLeft,
      timeTotalSec: params.roundDurationSec,
    });
  }, [score, combo, questionIdx, params.targetQuestions, timeLeft, params.roundDurationSec, onHudUpdate]);

  // Countdown interval respecting pause
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
      finishRound(score, correctCount, answeredCount, maxCombo);
    }
  }, [timeLeft, score, correctCount, answeredCount, maxCombo, finishRound]);

  useEffect(() => {
    return () => {
      if (nextTimerRef.current) window.clearTimeout(nextTimerRef.current);
    };
  }, []);

  const handleSelectOption = useCallback(
    (optIndex: number) => {
      if (paused || feedback || finishedRef.current) return;
      if (optIndex < 0 || optIndex >= question.options.length) return;

      const reaction = Math.max(180, performance.now() - questionShownAtRef.current);
      reactionSumRef.current += reaction;

      const isCorrect = optIndex === question.correctIndex;
      const nextAnswered = answeredCount + 1;
      const nextCorrect = isCorrect ? correctCount + 1 : correctCount;
      const nextCombo = isCorrect ? combo + 1 : 0;
      const nextMaxCombo = Math.max(maxCombo, nextCombo);

      // Speed + difficulty scaled points
      const speedBonus = reaction < 2200 ? 35 : reaction < 3800 ? 15 : 0;
      const earned = isCorrect ? 80 + level * 15 + Math.min(4, nextCombo) * 20 + speedBonus : 0;
      const nextScore = score + earned;

      if (isCorrect) {
        synthAudio.playCorrect(nextCombo);
      } else {
        synthAudio.playWrong();
      }

      setAnsweredCount(nextAnswered);
      setCorrectCount(nextCorrect);
      setCombo(nextCombo);
      setMaxCombo(nextMaxCombo);
      setScore(nextScore);
      setFeedback({ selected: optIndex, isCorrect, explanation: question.explanation });

      const delayMs = isCorrect ? 420 : 950;
      nextTimerRef.current = window.setTimeout(() => {
        if (finishedRef.current) return;
        const nextIdx = questionIdx + 1;
        if (nextIdx >= params.targetQuestions) {
          // Time left bonus if all questions cleared
          const timeBonus = Math.round(timeLeft * 6);
          finishRound(nextScore + timeBonus, nextCorrect, nextAnswered, nextMaxCombo);
        } else {
          setQuestionIdx(nextIdx);
          setQuestion(generateLogicQuestion(level, nextIdx));
          setFeedback(null);
          questionShownAtRef.current = performance.now();
        }
      }, delayMs);
    },
    [
      paused,
      feedback,
      question,
      answeredCount,
      correctCount,
      combo,
      maxCombo,
      level,
      score,
      questionIdx,
      params.targetQuestions,
      timeLeft,
      finishRound,
    ],
  );

  // Keyboard 1-4 selection
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (paused || feedback) return;
      const idx = ['1', '2', '3', '4'].indexOf(e.key);
      if (idx !== -1 && idx < question.options.length) {
        e.preventDefault();
        handleSelectOption(idx);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [paused, feedback, question.options.length, handleSelectOption]);

  return (
    <div className="w-full max-w-2xl flex flex-col items-center gap-7">
      {/* Round micro-counter */}
      <div className="text-xs font-semibold uppercase tracking-wider text-amber-300">
        {params.tierLabel} · Reto {Math.min(questionIdx + 1, params.targetQuestions)} de {params.targetQuestions}
      </div>

      {/* Problem Board */}
      <div
        key={question.id}
        className={`w-full bg-[#141c2f] border border-slate-700/90 rounded-2xl p-6 md:p-9 text-center shadow-xl ${
          feedback && !feedback.isCorrect ? 'animate-sinapsis-shake border-rose-500/70' : 'animate-sinapsis-pop'
        }`}
      >
        <p className="text-sm md:text-base text-slate-300 mb-4">{question.prompt}</p>
        <div
          className="font-mono-num text-3xl md:text-5xl font-bold text-white tracking-tight py-3 select-none"
          data-testid="logic-expression"
        >
          {question.expression}
        </div>

        {/* Inline feedback line (fixed height to prevent layout jump) */}
        <div className="min-h-[28px] mt-3 flex items-center justify-center">
          {feedback ? (
            <div
              className={`inline-flex items-center gap-2 text-sm font-medium ${
                feedback.isCorrect ? 'text-emerald-300' : 'text-rose-300'
              }`}
            >
              {feedback.isCorrect ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
              <span>{feedback.isCorrect ? '¡Exacto! ' : 'Revisa: '}{feedback.explanation}</span>
            </div>
          ) : (
            <span className="text-xs text-slate-500">Elige una opción o pulsa las teclas 1–{question.options.length}</span>
          )}
        </div>
      </div>

      {/* Options Grid (>=56px touch targets) */}
      <div
        className={`w-full grid gap-3.5 ${
          question.options.length === 3 ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-2'
        }`}
      >
        {question.options.map((opt, idx) => {
          const isSelected = feedback?.selected === idx;
          const isTrueOption = feedback && idx === question.correctIndex;

          let cardClass =
            'bg-[#182238] border-slate-700 text-white hover:bg-[#1f2c47] hover:border-amber-400/70';
          if (feedback) {
            if (isTrueOption) {
              cardClass = 'bg-emerald-500/20 border-emerald-400 text-emerald-100';
            } else if (isSelected && !feedback.isCorrect) {
              cardClass = 'bg-rose-500/20 border-rose-400 text-rose-100';
            } else {
              cardClass = 'bg-[#141c2f] border-slate-800 text-slate-500 opacity-60';
            }
          }

          return (
            <button
              key={`${question.id}-opt-${idx}`}
              type="button"
              disabled={Boolean(feedback)}
              data-testid={`logic-option-${idx}`}
              onClick={() => handleSelectOption(idx)}
              className={`min-h-[64px] px-5 py-4 rounded-xl border-2 font-display font-bold text-xl md:text-2xl flex items-center justify-between gap-3 transition-colors cursor-pointer disabled:cursor-default ${cardClass}`}
            >
              <span className="font-mono-num text-xs font-semibold text-slate-400 bg-slate-900/70 w-7 h-7 rounded-md inline-flex items-center justify-center shrink-0">
                {idx + 1}
              </span>
              <span className="flex-1 text-center font-mono-num">{opt}</span>
              <span className="w-7 shrink-0" aria-hidden="true" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
