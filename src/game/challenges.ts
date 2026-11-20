import { clampLevel, getAttentionDifficultyParams, getMemoryDifficultyParams } from './adaptiveEngine';
import type {
  AttentionBin,
  AttentionHue,
  AttentionRule,
  AttentionShape,
  AttentionStimulus,
  LogicQuestion,
  MemoryPuzzle,
} from './types';

export type RngFn = () => number;

function randInt(rng: RngFn, min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

function pickOne<T>(rng: RngFn, arr: readonly T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

function shuffleWithRng<T>(rng: RngFn, arr: readonly T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function buildUniqueNumericOptions(rng: RngFn, correct: number, spread: number): { options: string[]; correctIndex: number } {
  const set = new Set<number>([correct]);
  let attempts = 0;
  while (set.size < 4 && attempts < 40) {
    attempts++;
    const delta = randInt(rng, 1, spread) * (rng() < 0.5 ? -1 : 1);
    const candidate = correct + delta;
    if (candidate >= 0 || correct < 0) {
      set.add(candidate);
    }
  }
  let fallback = 1;
  while (set.size < 4) {
    set.add(correct + fallback++);
  }
  const shuffled = shuffleWithRng(rng, Array.from(set));
  return {
    options: shuffled.map(String),
    correctIndex: shuffled.indexOf(correct),
  };
}

/**
 * Generates an unambiguous, level-adapted Logic challenge in Spanish.
 */
export function generateLogicQuestion(levelInput: number, index: number, rng: RngFn = Math.random): LogicQuestion {
  const level = clampLevel(levelInput);
  const id = `logic-${level}-${index}-${Math.floor(rng() * 100000)}`;

  // Rotate question types cleanly for variety
  const kindSelector = index % 4;

  if (kindSelector === 0) {
    // Missing operator
    if (level <= 2) {
      const a = randInt(rng, 4, 18 + level * 4);
      const b = randInt(rng, 2, 12);
      const isAdd = rng() < 0.5;
      const result = isAdd ? a + b : a - b;
      const correctOp = isAdd ? '+' : '−';
      const ops = ['+', '−', '×', '÷'];
      return {
        id,
        kind: 'operador',
        prompt: 'Elige el operador que completa la igualdad',
        expression: `${a}  [ ? ]  ${b}  =  ${result}`,
        options: ops,
        correctIndex: ops.indexOf(correctOp),
        explanation: `${a} ${correctOp} ${b} = ${result}.`,
      };
    }

    if (level <= 5) {
      const useMul = rng() < 0.6;
      if (useMul) {
        const a = randInt(rng, 3, 9 + level);
        const b = randInt(rng, 2, 9);
        const result = a * b;
        const ops = ['+', '−', '×', '÷'];
        return {
          id,
          kind: 'operador',
          prompt: 'Encuentra el signo exacto',
          expression: `${a}  [ ? ]  ${b}  =  ${result}`,
          options: ops,
          correctIndex: ops.indexOf('×'),
          explanation: `${a} × ${b} = ${result}.`,
        };
      }
      const b = randInt(rng, 2, 8);
      const quotient = randInt(rng, 3, 12);
      const a = b * quotient;
      const ops = ['+', '−', '×', '÷'];
      return {
        id,
        kind: 'operador',
        prompt: 'Encuentra el signo exacto',
        expression: `${a}  [ ? ]  ${b}  =  ${quotient}`,
        options: ops,
        correctIndex: ops.indexOf('÷'),
        explanation: `${a} ÷ ${b} = ${quotient}.`,
      };
    }

    // Level 6..10: Two-step expression with missing operator
    const a = randInt(rng, 2, 7);
    const b = randInt(rng, 3, 8);
    const c = randInt(rng, 2, 12);
    // Avoid ambiguous operator outcomes by choosing distinct results
    const opChoices: Array<{ sym: string; val: number }> = [
      { sym: '+', val: a * b + c },
      { sym: '−', val: a * b - c },
      { sym: '×', val: a * b * c },
    ];
    const picked = pickOne(rng, opChoices);
    const ops = ['+', '−', '×', '÷'];
    return {
      id,
      kind: 'operador',
      prompt: 'Completa la operación combinada',
      expression: `(${a} × ${b})  [ ? ]  ${c}  =  ${picked.val}`,
      options: ops,
      correctIndex: ops.indexOf(picked.sym),
      explanation: `${a}×${b} = ${a * b}, y ${a * b} ${picked.sym} ${c} = ${picked.val}.`,
    };
  }

  if (kindSelector === 1) {
    // Numeric sequence
    if (level <= 2) {
      const start = randInt(rng, 2, 14);
      const step = randInt(rng, 2, 6 + level);
      const terms = [0, 1, 2, 3].map((i) => start + i * step);
      const answer = start + 4 * step;
      const { options, correctIndex } = buildUniqueNumericOptions(rng, answer, 6);
      return {
        id,
        kind: 'serie',
        prompt: '¿Qué número sigue en la secuencia?',
        expression: `${terms.join('  ·  ')}  ·  [ ? ]`,
        options,
        correctIndex,
        explanation: `Cada paso suma +${step} (${terms[3]} + ${step} = ${answer}).`,
      };
    }

    if (level <= 5) {
      // Alternating or geometric-lite step
      const start = randInt(rng, 2, 8);
      const stepA = randInt(rng, 2, 5);
      const stepB = randInt(rng, 4, 9);
      const t0 = start;
      const t1 = t0 + stepA;
      const t2 = t1 + stepB;
      const t3 = t2 + stepA;
      const answer = t3 + stepB;
      const { options, correctIndex } = buildUniqueNumericOptions(rng, answer, 8);
      return {
        id,
        kind: 'serie',
        prompt: 'Detecta la regla alterna de la serie',
        expression: `${t0}  ·  ${t1}  ·  ${t2}  ·  ${t3}  ·  [ ? ]`,
        options,
        correctIndex,
        explanation: `El patrón alterna +${stepA} y +${stepB}. Toca +${stepB}: ${answer}.`,
      };
    }

    // Level 6..10: Progressive increment (+2, +4, +6, +8) or x2 + k
    if (rng() < 0.5) {
      const start = randInt(rng, 2, 9);
      const baseStep = randInt(rng, 2, 4);
      const t0 = start;
      const t1 = t0 + baseStep;
      const t2 = t1 + baseStep * 2;
      const t3 = t2 + baseStep * 3;
      const answer = t3 + baseStep * 4;
      const { options, correctIndex } = buildUniqueNumericOptions(rng, answer, 10);
      return {
        id,
        kind: 'serie',
        prompt: 'Descubre el incremento creciente',
        expression: `${t0}  ·  ${t1}  ·  ${t2}  ·  ${t3}  ·  [ ? ]`,
        options,
        correctIndex,
        explanation: `Las diferencias crecen de ${baseStep} en ${baseStep}: toca +${baseStep * 4} = ${answer}.`,
      };
    }

    const start = randInt(rng, 2, 5);
    const add = randInt(rng, 1, 3);
    const t0 = start;
    const t1 = t0 * 2 + add;
    const t2 = t1 * 2 + add;
    const t3 = t2 * 2 + add;
    const answer = t3 * 2 + add;
    const { options, correctIndex } = buildUniqueNumericOptions(rng, answer, 14);
    return {
      id,
      kind: 'serie',
      prompt: 'Deduce la regla multiplicativa',
      expression: `${t0}  ·  ${t1}  ·  ${t2}  ·  ${t3}  ·  [ ? ]`,
      options,
      correctIndex,
      explanation: `Regla: (anterior × 2) + ${add}. ${t3}×2 + ${add} = ${answer}.`,
    };
  }

  if (kindSelector === 2) {
    // Algebraic balance (find missing value)
    if (level <= 3) {
      const x = randInt(rng, 4, 15 + level * 3);
      const offset = randInt(rng, 3, 14);
      const total = x + offset;
      const { options, correctIndex } = buildUniqueNumericOptions(rng, x, 6);
      return {
        id,
        kind: 'balanza',
        prompt: 'Equilibra la balanza hallando el valor de X',
        expression: `X  +  ${offset}  =  ${total}`,
        options,
        correctIndex,
        explanation: `${total} − ${offset} = ${x}.`,
      };
    }

    if (level <= 6) {
      const mult = randInt(rng, 2, 5);
      const x = randInt(rng, 3, 11);
      const offset = randInt(rng, 2, 10);
      const total = mult * x + offset;
      const { options, correctIndex } = buildUniqueNumericOptions(rng, x, 5);
      return {
        id,
        kind: 'balanza',
        prompt: 'Calcula cuánto vale cada bloque X',
        expression: `${mult} × X  +  ${offset}  =  ${total}`,
        options,
        correctIndex,
        explanation: `${total} − ${offset} = ${mult * x}, y ${mult * x} ÷ ${mult} = ${x}.`,
      };
    }

    // Level 7..10: X appears as two-side balance or squared/grouped
    const a = randInt(rng, 3, 6);
    const x = randInt(rng, 4, 12);
    const b = randInt(rng, 2, 9);
    const right = a * x - b;
    const { options, correctIndex } = buildUniqueNumericOptions(rng, x, 5);
    return {
      id,
      kind: 'balanza',
      prompt: 'Resuelve el valor exacto de X',
      expression: `${a} × X  −  ${b}  =  ${right}`,
      options,
      correctIndex,
      explanation: `${right} + ${b} = ${a * x}, luego ÷ ${a} = ${x}.`,
    };
  }

  // kindSelector === 3: Mental Comparison (Which side is larger?)
  let leftVal: number;
  let rightVal: number;
  let leftExpr: string;
  let rightExpr: string;

  if (level <= 3) {
    const a = randInt(rng, 8, 25);
    const b = randInt(rng, 4, 15);
    const c = randInt(rng, 6, 22);
    const d = randInt(rng, 4, 16);
    leftVal = a + b;
    rightVal = c + d;
    leftExpr = `${a} + ${b}`;
    rightExpr = `${c} + ${d}`;
  } else if (level <= 6) {
    const a = randInt(rng, 3, 9);
    const b = randInt(rng, 3, 9);
    const c = randInt(rng, 2, 8);
    const d = randInt(rng, 4, 15);
    leftVal = a * b;
    rightVal = c * 4 + d;
    leftExpr = `${a} × ${b}`;
    rightExpr = `${c} × 4 + ${d}`;
  } else {
    const a = randInt(rng, 4, 11);
    const b = randInt(rng, 3, 9);
    const c = randInt(rng, 2, 12);
    const d = randInt(rng, 4, 11);
    const e = randInt(rng, 3, 9);
    const f = randInt(rng, 2, 10);
    leftVal = a * b - c;
    rightVal = d * e + f;
    leftExpr = `${a} × ${b} − ${c}`;
    rightExpr = `${d} × ${e} + ${f}`;
  }

  const options = ['Izquierda mayor (>)', 'Son iguales (=)', 'Derecha mayor (<)'];
  const correctIndex = leftVal > rightVal ? 0 : leftVal === rightVal ? 1 : 2;
  return {
    id,
    kind: 'comparacion',
    prompt: 'Compara ambas expresiones mentalmente',
    expression: `${leftExpr}    vs    ${rightExpr}`,
    options,
    correctIndex,
    explanation: `Izquierda = ${leftVal} y Derecha = ${rightVal}.`,
  };
}

/**
 * Generates a level-adapted spatial/sequence Memory puzzle.
 */
export function generateMemoryPuzzle(levelInput: number, rng: RngFn = Math.random): MemoryPuzzle {
  const params = getMemoryDifficultyParams(levelInput);
  const totalCells = params.gridSize * params.gridSize;
  const indices = Array.from({ length: totalCells }, (_, i) => i);
  const shuffled = shuffleWithRng(rng, indices);
  return {
    gridSize: params.gridSize,
    sequence: shuffled.slice(0, params.targetCount),
    revealMs: params.revealMs,
    orderMode: params.orderMode,
  };
}

export const ATTENTION_SHAPES: readonly AttentionShape[] = ['circulo', 'triangulo', 'cuadrado', 'rombo'];
export const ATTENTION_HUES: readonly AttentionHue[] = ['ambar', 'cielo', 'esmeralda', 'coral'];

export const HUE_LABELS: Record<AttentionHue, string> = {
  ambar: 'Ámbar',
  cielo: 'Azul',
  esmeralda: 'Verde',
  coral: 'Rojo',
};

export const SHAPE_LABELS: Record<AttentionShape, string> = {
  circulo: 'Círculo',
  triangulo: 'Triángulo',
  cuadrado: 'Cuadrado',
  rombo: 'Rombo',
};

export function getAttentionBins(levelInput: number, rule: AttentionRule): AttentionBin[] {
  const { binCount } = getAttentionDifficultyParams(levelInput);
  const keys = ['1', '2', '3', '4'];

  if (rule === 'forma') {
    const shapes = ATTENTION_SHAPES.slice(0, binCount);
    return shapes.map((shape, idx) => ({
      id: shape,
      keyHint: keys[idx],
      label: SHAPE_LABELS[shape],
      shape,
    }));
  }

  const hues = ATTENTION_HUES.slice(0, binCount);
  return hues.map((hue, idx) => ({
    id: hue,
    keyHint: keys[idx],
    label: HUE_LABELS[hue],
    hue,
  }));
}

export function generateAttentionStimulus(
  levelInput: number,
  rule: AttentionRule,
  index: number,
  rng: RngFn = Math.random,
): AttentionStimulus {
  const params = getAttentionDifficultyParams(levelInput);
  const activeHues = ATTENTION_HUES.slice(0, params.binCount);
  const activeShapes = ATTENTION_SHAPES.slice(0, params.binCount);

  const hue = pickOne(rng, activeHues);
  const shape = pickOne(rng, activeShapes);

  let wordTargetHue = hue;
  let isConflict = false;

  if (params.allowStroopConflict && rng() < 0.65) {
    const otherHues = activeHues.filter((h) => h !== hue);
    wordTargetHue = pickOne(rng, otherHues);
    isConflict = true;
  }

  const word = HUE_LABELS[wordTargetHue].toUpperCase();
  const correctBinId = rule === 'forma' ? shape : rule === 'palabra' ? wordTargetHue : hue;

  return {
    id: `att-${levelInput}-${index}-${Math.floor(rng() * 100000)}`,
    shape,
    hue,
    word,
    wordTargetHue,
    isConflict,
    correctBinId,
  };
}
