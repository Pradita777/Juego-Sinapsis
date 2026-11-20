import test from 'node:test';
import assert from 'node:assert/strict';
import {
  generateAttentionStimulus,
  generateLogicQuestion,
  generateMemoryPuzzle,
  getAttentionBins,
} from './challenges';

function makeSeededRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

test('generateLogicQuestion produces valid options and index across levels 1..10', () => {
  const rng = makeSeededRng(42);
  for (let level = 1; level <= 10; level++) {
    for (let idx = 0; idx < 8; idx++) {
      const q = generateLogicQuestion(level, idx, rng);
      assert.ok(q.expression.length > 0);
      assert.ok(q.options.length >= 3);
      assert.ok(q.correctIndex >= 0 && q.correctIndex < q.options.length);
      assert.equal(new Set(q.options).size, q.options.length, `Duplicate options at level ${level}, idx ${idx}`);
      assert.ok(q.explanation.length > 0);
    }
  }
});

test('generateMemoryPuzzle yields unique cell indices within grid bounds', () => {
  const rng = makeSeededRng(99);
  for (let level = 1; level <= 10; level++) {
    const puzzle = generateMemoryPuzzle(level, rng);
    const total = puzzle.gridSize * puzzle.gridSize;
    assert.equal(new Set(puzzle.sequence).size, puzzle.sequence.length);
    for (const cell of puzzle.sequence) {
      assert.ok(cell >= 0 && cell < total);
    }
  }
});

test('generateAttentionStimulus maps every stimulus to a valid bin for active rule', () => {
  const rng = makeSeededRng(123);
  for (let level = 1; level <= 10; level++) {
    for (const rule of ['color', 'forma', 'palabra'] as const) {
      const bins = getAttentionBins(level, rule);
      const binIds = new Set(bins.map((b) => b.id));
      for (let i = 0; i < 6; i++) {
        const stim = generateAttentionStimulus(level, rule, i, rng);
        assert.ok(binIds.has(stim.correctBinId), `Missing bin ${stim.correctBinId} for rule ${rule} level ${level}`);
      }
    }
  }
});
