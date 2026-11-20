import { useCallback, useEffect, useState } from 'react';
import { GameShell } from './components/GameShell';
import { PauseModal, SummaryModal } from './components/Modals';
import { ObservatoryCanvas } from './components/ObservatoryCanvas';
import { TitleScreen } from './components/TitleScreen';
import { TrainingHub } from './components/TrainingHub';
import { AttentionGame } from './components/games/AttentionGame';
import { LogicGame } from './components/games/LogicGame';
import { MemoryGame } from './components/games/MemoryGame';
import {
  createDefaultProfile,
  DOMAIN_META,
  evaluateAndAdaptRound,
  loadProfile,
  saveProfile,
} from './game/adaptiveEngine';
import { synthAudio } from './game/audio';
import type {
  CognitiveDomain,
  PlayerProfile,
  RoundEvaluation,
  RoundResultInput,
  ShellScreenState,
} from './game/types';

function getInitialBootState(): { screen: ShellScreenState; domain: CognitiveDomain } {
  if (typeof window === 'undefined') return { screen: 'title', domain: 'logica' };
  const params = new URLSearchParams(window.location.search);
  const auto = params.get('autostart') === '1';
  const reqDomain = params.get('domain') as CognitiveDomain | null;
  if (auto && reqDomain && (reqDomain === 'logica' || reqDomain === 'memoria' || reqDomain === 'atencion')) {
    return { screen: 'playing', domain: reqDomain };
  }
  return { screen: auto ? 'hub' : 'title', domain: 'logica' };
}

export default function App() {
  const [profile, setProfile] = useState<PlayerProfile>(() => {
    const loaded = loadProfile();
    synthAudio.setMuted(loaded.muted);
    return loaded;
  });

  const boot = getInitialBootState();
  const [screenState, setScreenState] = useState<ShellScreenState>(boot.screen);
  const [activeDomain, setActiveDomain] = useState<CognitiveDomain>(boot.domain);
  const [circuitQueue, setCircuitQueue] = useState<CognitiveDomain[]>([]);
  const [circuitIndex, setCircuitIndex] = useState<number>(0);
  const [runNonce, setRunNonce] = useState<number>(1);
  const [zenInspect, setZenInspect] = useState<boolean>(false);
  const [lastEvaluation, setLastEvaluation] = useState<RoundEvaluation | null>(null);

  const [hudState, setHudState] = useState<{
    score: number;
    combo: number;
    progressLabel: string;
    timeRemainingSec?: number;
    timeTotalSec?: number;
  }>({
    score: 0,
    combo: 0,
    progressLabel: '1/6',
  });

  // Mirror state machine to document.body.dataset.state
  useEffect(() => {
    document.body.dataset.state = screenState;
  }, [screenState]);

  const handleToggleMute = useCallback(() => {
    setProfile((prev) => {
      const nextMuted = !prev.muted;
      synthAudio.setMuted(nextMuted);
      const next = { ...prev, muted: nextMuted };
      saveProfile(next);
      return next;
    });
  }, []);

  const handleStartFromTitle = useCallback(() => {
    synthAudio.playStart();
    setScreenState('hub');
  }, []);

  const launchDomain = useCallback((domain: CognitiveDomain, queue: CognitiveDomain[] = [], qIdx = 0) => {
    synthAudio.playStart();
    setActiveDomain(domain);
    setCircuitQueue(queue);
    setCircuitIndex(qIdx);
    setLastEvaluation(null);
    setZenInspect(false);
    setHudState({ score: 0, combo: 0, progressLabel: '1' });
    setRunNonce((n) => n + 1);
    setScreenState('playing');
  }, []);

  const handleStartDomain = useCallback(
    (domain: CognitiveDomain) => {
      launchDomain(domain, [], 0);
    },
    [launchDomain],
  );

  const handleStartDailyCircuit = useCallback(() => {
    const order: CognitiveDomain[] = ['logica', 'memoria', 'atencion'];
    launchDomain(order[0], order, 0);
  }, [launchDomain]);

  const handleRestartActive = useCallback(() => {
    launchDomain(activeDomain, circuitQueue, circuitIndex);
  }, [activeDomain, circuitQueue, circuitIndex, launchDomain]);

  const handleRoundComplete = useCallback(
    (result: RoundResultInput) => {
      setProfile((prev) => {
        const { nextProfile, evaluation } = evaluateAndAdaptRound(prev, result);
        saveProfile(nextProfile);
        setLastEvaluation(evaluation);
        if (evaluation.adaptation === 'up') {
          synthAudio.playLevelUp();
        }
        return nextProfile;
      });
      setScreenState('gameover');
    },
    [],
  );

  const handleNextInCircuit = useCallback(() => {
    const nextIdx = circuitIndex + 1;
    if (nextIdx < circuitQueue.length) {
      launchDomain(circuitQueue[nextIdx], circuitQueue, nextIdx);
    } else {
      setScreenState('hub');
    }
  }, [circuitIndex, circuitQueue, launchDomain]);

  const handleResetProgress = useCallback(() => {
    const fresh = createDefaultProfile();
    fresh.muted = profile.muted;
    saveProfile(fresh);
    setProfile(fresh);
  }, [profile.muted]);

  const handleHudUpdate = useCallback(
    (next: { score: number; combo: number; progressLabel: string; timeRemainingSec?: number; timeTotalSec?: number }) => {
      setHudState(next);
    },
    [],
  );

  // Global keyboard shortcuts (Escape/P pause, M mute, R restart)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (key === 'm') {
        e.preventDefault();
        handleToggleMute();
        return;
      }

      if (e.key === 'Escape' || key === 'p') {
        if (screenState === 'hub' && zenInspect && e.key === 'Escape') {
          e.preventDefault();
          setZenInspect(false);
          return;
        }
        if (screenState === 'playing') {
          e.preventDefault();
          setScreenState('paused');
        } else if (screenState === 'paused') {
          e.preventDefault();
          setScreenState('playing');
        }
        return;
      }

      if (key === 'r' && (screenState === 'playing' || screenState === 'paused')) {
        e.preventDefault();
        handleRestartActive();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [screenState, zenInspect, handleToggleMute, handleRestartActive]);

  const activeLevel = profile.domains[activeDomain].level;
  const hasNextInCircuit = circuitQueue.length > 0 && circuitIndex + 1 < circuitQueue.length;
  const circuitProgress =
    circuitQueue.length > 0 ? { current: circuitIndex + 1, total: circuitQueue.length } : null;

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden bg-[#0b101b]">
      {/* Isolated 3D Observatory Canvas */}
      <ObservatoryCanvas screenState={screenState} profile={profile} zenInspect={zenInspect} />

      {screenState === 'title' && (
        <TitleScreen profile={profile} onStart={handleStartFromTitle} onToggleMute={handleToggleMute} />
      )}

      {screenState === 'hub' && (
        <TrainingHub
          profile={profile}
          zenInspect={zenInspect}
          onToggleZenInspect={() => setZenInspect((z) => !z)}
          onToggleMute={handleToggleMute}
          onStartDomain={handleStartDomain}
          onStartDailyCircuit={handleStartDailyCircuit}
          onResetProgress={handleResetProgress}
        />
      )}

      {(screenState === 'playing' || screenState === 'paused' || screenState === 'gameover') && (
        <GameShell
          domain={activeDomain}
          level={activeLevel}
          score={hudState.score}
          combo={hudState.combo}
          progressLabel={hudState.progressLabel}
          timeRemainingSec={hudState.timeRemainingSec}
          timeTotalSec={hudState.timeTotalSec}
          circuitProgress={circuitProgress}
          muted={profile.muted}
          onToggleMute={handleToggleMute}
          onPause={() => setScreenState('paused')}
          onRestart={handleRestartActive}
        >
          {activeDomain === 'logica' && (
            <LogicGame
              key={`logic-${runNonce}`}
              level={activeLevel}
              paused={screenState !== 'playing'}
              onHudUpdate={handleHudUpdate}
              onComplete={handleRoundComplete}
            />
          )}
          {activeDomain === 'memoria' && (
            <MemoryGame
              key={`memory-${runNonce}`}
              level={activeLevel}
              paused={screenState !== 'playing'}
              onHudUpdate={handleHudUpdate}
              onComplete={handleRoundComplete}
            />
          )}
          {activeDomain === 'atencion' && (
            <AttentionGame
              key={`attention-${runNonce}`}
              level={activeLevel}
              paused={screenState !== 'playing'}
              onHudUpdate={handleHudUpdate}
              onComplete={handleRoundComplete}
            />
          )}
        </GameShell>
      )}

      {screenState === 'paused' && (
        <PauseModal
          gameName={DOMAIN_META[activeDomain].gameName}
          onResume={() => setScreenState('playing')}
          onRestart={handleRestartActive}
          onExitToHub={() => setScreenState('hub')}
        />
      )}

      {screenState === 'gameover' && lastEvaluation && (
        <SummaryModal
          evaluation={lastEvaluation}
          hasNextInCircuit={hasNextInCircuit}
          onNextInCircuit={handleNextInCircuit}
          onPlayAgain={handleRestartActive}
          onExitToHub={() => setScreenState('hub')}
        />
      )}
    </div>
  );
}
