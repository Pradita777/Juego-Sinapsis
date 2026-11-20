import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createDefaultProfile,
  evaluateAndAdaptRound,
  getAttentionDifficultyParams,
  getLogicDifficultyParams,
  getMemoryDifficultyParams,
  getOverallPeakIndex,
  MAX_LEVEL,
  MIN_LEVEL,
} from './adaptiveEngine';

test('strong round (>=80% accuracy, >=3 correct) immediately levels up', () => {
  const profile = createDefaultProfile();
  const { nextProfile, evaluation } = evaluateAndAdaptRound(profile, {
    domain: 'logica',
    score: 640,
    accuracy: 90,
    avgReactionMs: 1450,
    correctCount: 9,
    totalCount: 10,
    maxCombo: 6,
  });

  assert.equal(evaluation.previousLevel, 1);
  assert.equal(evaluation.newLevel, 2);
  assert.equal(evaluation.adaptation, 'up');
  assert.equal(nextProfile.domains.logica.level, 2);
  assert.ok(evaluation.newPeakIndex > evaluation.previousPeakIndex);
  assert.ok(evaluation.xpEarned > 0);
});

test('two consecutive solid rounds (72-79% accuracy) level up', () => {
  let profile = createDefaultProfile();
  const first = evaluateAndAdaptRound(profile, {
    domain: 'memoria',
    score: 380,
    accuracy: 75,
    avgReactionMs: 1800,
    correctCount: 3,
    totalCount: 4,
    maxCombo: 2,
  });
  assert.equal(first.evaluation.adaptation, 'steady');
  assert.equal(first.nextProfile.domains.memoria.level, 1);

  profile = first.nextProfile;
  const second = evaluateAndAdaptRound(profile, {
    domain: 'memoria',
    score: 410,
    accuracy: 75,
    avgReactionMs: 1700,
    correctCount: 3,
    totalCount: 4,
    maxCombo: 3,
  });
  assert.equal(second.evaluation.adaptation, 'up');
  assert.equal(second.nextProfile.domains.memoria.level, 2);
});

test('two consecutive weak rounds (<50%) step down difficulty safely without going below MIN_LEVEL', () => {
  let profile = createDefaultProfile();
  profile.domains.atencion.level = 3;

  const r1 = evaluateAndAdaptRound(profile, {
    domain: 'atencion',
    score: 90,
    accuracy: 40,
    avgReactionMs: 2400,
    correctCount: 4,
    totalCount: 10,
    maxCombo: 2,
  });
  assert.equal(r1.evaluation.adaptation, 'steady');
  assert.equal(r1.nextProfile.domains.atencion.level, 3);

  const r2 = evaluateAndAdaptRound(r1.nextProfile, {
    domain: 'atencion',
    score: 70,
    accuracy: 30,
    avgReactionMs: 2500,
    correctCount: 3,
    totalCount: 10,
    maxCombo: 1,
  });
  assert.equal(r2.evaluation.adaptation, 'down');
  assert.equal(r2.nextProfile.domains.atencion.level, 2);

  // Never goes below MIN_LEVEL
  r2.nextProfile.domains.atencion.level = MIN_LEVEL;
  r2.nextProfile.domains.atencion.struggleStreak = 1;
  const r3 = evaluateAndAdaptRound(r2.nextProfile, {
    domain: 'atencion',
    score: 20,
    accuracy: 20,
    avgReactionMs: 2600,
    correctCount: 1,
    totalCount: 5,
    maxCombo: 1,
  });
  assert.equal(r3.nextProfile.domains.atencion.level, MIN_LEVEL);
});

test('level never exceeds MAX_LEVEL and overall Peak Index averages all 3 pillars', () => {
  const profile = createDefaultProfile();
  profile.domains.logica.level = MAX_LEVEL;
  const { nextProfile, evaluation } = evaluateAndAdaptRound(profile, {
    domain: 'logica',
    score: 1200,
    accuracy: 100,
    avgReactionMs: 900,
    correctCount: 10,
    totalCount: 10,
    maxCombo: 10,
  });
  assert.equal(evaluation.newLevel, MAX_LEVEL);
  assert.equal(getOverallPeakIndex(nextProfile) > 120, true);
});

test('difficulty parameters scale progressively across levels 1..10', () => {
  const m1 = getMemoryDifficultyParams(1);
  const m5 = getMemoryDifficultyParams(5);
  const m10 = getMemoryDifficultyParams(10);
  assert.equal(m1.gridSize, 3);
  assert.equal(m1.orderMode, 'libre');
  assert.equal(m5.gridSize, 4);
  assert.equal(m5.orderMode, 'secuencial');
  assert.equal(m10.gridSize, 6);
  assert.equal(m10.orderMode, 'inverso');

  const a1 = getAttentionDifficultyParams(1);
  const a5 = getAttentionDifficultyParams(5);
  const a10 = getAttentionDifficultyParams(10);
  assert.equal(a1.binCount, 2);
  assert.equal(a1.allowRuleSwitch, false);
  assert.equal(a5.binCount, 3);
  assert.equal(a5.allowStroopConflict, true);
  assert.equal(a10.binCount, 4);
  assert.ok(a10.cardTimeoutMs < a1.cardTimeoutMs);

  const l1 = getLogicDifficultyParams(1);
  const l10 = getLogicDifficultyParams(10);
  assert.ok(l10.targetQuestions > l1.targetQuestions);
});
