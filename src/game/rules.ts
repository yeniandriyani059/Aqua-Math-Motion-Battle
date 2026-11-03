import {
  AnswerBubble,
  DifficultyLevel,
  GameSettings,
  MathProblem,
  MotionGestureType,
  TeamAnswerStatus,
  TeamBattleState,
  TeamId,
} from './types';

export const GESTURE_COOLDOWN_MS = 850;

export const DEFAULT_GAME_SETTINGS: GameSettings = {
  battleMode: 'touch',
  level: 'level1',
  durationSeconds: 120,
  totalQuestions: 5,
  playersPerTeam: 3,
};

export const LEVEL_METADATA: Record<
  DifficultyLevel,
  {
    title: string;
    shortTitle: string;
    subtitle: string;
    badge: string;
  }
> = {
  level1: {
    title: 'Level 1 – Mudah',
    shortTitle: 'Level 1 (Mudah)',
    subtitle: 'Operasi penjumlahan dan pengurangan bilangan sampai 10.000',
    badge: 'Operasi Hitung <= 10.000',
  },
  level2: {
    title: 'Level 2 – Sedang',
    shortTitle: 'Level 2 (Sedang)',
    subtitle: 'Operasi 2–3 bilangan & soal cerita sederhana Aqua City',
    badge: 'Soal Cerita Sederhana',
  },
  level3: {
    title: 'Level 3 – Kompleks',
    shortTitle: 'Level 3 (Kompleks)',
    subtitle: 'Soal cerita multi-langkah & penalaran manajemen air Aqua City',
    badge: 'Penalaran Multi-Langkah',
  },
};

export function formatIndonesianNumber(n: number): string {
  return Math.round(n).toLocaleString('id-ID');
}

export function formatChoiceLabel(value: number, unitLabel: string): string {
  const numStr = formatIndonesianNumber(value);
  return unitLabel ? `${numStr} ${unitLabel}` : numStr;
}

/**
 * Pure arithmetic evaluator that calculates the exact answer from a sequence
 * of operands and '+' / '-' operators. Never guesses or picks randomly.
 */
export function computeExactAnswer(
  operands: number[],
  operators: Array<'+' | '-'>
): number {
  if (operands.length === 0) return 0;
  let result = operands[0];
  for (let i = 0; i < operators.length; i++) {
    const nextVal = operands[i + 1] ?? 0;
    if (operators[i] === '+') {
      result += nextVal;
    } else {
      result -= nextVal;
    }
  }
  return result;
}

/**
 * Generates 2 plausible, unique distractors around the exact correctAnswer
 * within the valid whole-number range [100 .. 10000].
 */
export function buildValidChoices(
  correctAnswer: number,
  offsets: number[] = [-100, 100, 200, -200, 1000, -1000, 50, -50]
): number[] {
  const distractors: number[] = [];
  for (const offset of offsets) {
    const candidate = correctAnswer + offset;
    if (
      Number.isInteger(candidate) &&
      candidate >= 50 &&
      candidate <= 10000 &&
      candidate !== correctAnswer &&
      !distractors.includes(candidate)
    ) {
      distractors.push(candidate);
    }
    if (distractors.length >= 2) break;
  }

  let step = 100;
  while (distractors.length < 2) {
    const fallback =
      correctAnswer + step <= 10000
        ? correctAnswer + step
        : Math.max(50, correctAnswer - step);
    if (fallback !== correctAnswer && !distractors.includes(fallback)) {
      distractors.push(fallback);
    }
    step += 100;
  }

  return [correctAnswer, distractors[0], distractors[1]];
}

/**
 * Validates that a generated problem is mathematically sound:
 * 1. operands & operators evaluate to `correctAnswer`
 * 2. `correctAnswer` is a valid whole number (bilangan cacah) in [0..10000]
 * 3. `choices` has exactly 3 unique whole numbers
 * 4. `choices` contains `correctAnswer` exactly once
 */
export function validateMathProblem(problem: MathProblem): boolean {
  if (!problem || problem.operands.length < 2) return false;
  if (problem.operators.length !== problem.operands.length - 1) return false;

  const expected = computeExactAnswer(problem.operands, problem.operators);
  if (expected !== problem.correctAnswer) return false;
  if (
    !Number.isInteger(problem.correctAnswer) ||
    problem.correctAnswer <= 0 ||
    problem.correctAnswer > 10000
  ) {
    return false;
  }

  if (!Array.isArray(problem.choices) || problem.choices.length !== 3) {
    return false;
  }

  const uniqueSet = new Set(problem.choices);
  if (uniqueSet.size !== 3) return false;

  const correctMatches = problem.choices.filter(
    (c) => c === problem.correctAnswer
  );
  if (correctMatches.length !== 1) return false;

  for (const c of problem.choices) {
    if (!Number.isInteger(c) || c <= 0 || c > 10000) return false;
  }

  return true;
}

interface ProblemBlueprint {
  contextCategory: string;
  operands: number[];
  operators: Array<'+' | '-'>;
  unitLabel: string;
  distractorOffsets: number[];
  buildStory?: (ops: number[]) => {
    storyText: string;
    questionPrompt: string;
  };
}

const LEVEL_1_BLUEPRINTS: ProblemBlueprint[] = [
  {
    contextCategory: 'Penjumlahan Bilangan',
    operands: [2450, 3250],
    operators: ['+'],
    unitLabel: '',
    distractorOffsets: [-100, 100], // 5.600, 5.700, 5.800
  },
  {
    contextCategory: 'Pengurangan Bilangan',
    operands: [8500, 2750],
    operators: ['-'],
    unitLabel: '',
    distractorOffsets: [-100, 1000], // 5.650, 5.750, 6.750
  },
  {
    contextCategory: 'Penjumlahan Bilangan',
    operands: [3650, 4250],
    operators: ['+'],
    unitLabel: '',
    distractorOffsets: [-100, 100],
  },
  {
    contextCategory: 'Pengurangan Bilangan',
    operands: [9200, 3450],
    operators: ['-'],
    unitLabel: '',
    distractorOffsets: [-100, 100],
  },
  {
    contextCategory: 'Penjumlahan Bilangan',
    operands: [4150, 2850],
    operators: ['+'],
    unitLabel: '',
    distractorOffsets: [-200, 200],
  },
  {
    contextCategory: 'Pengurangan Bilangan',
    operands: [7600, 2850],
    operators: ['-'],
    unitLabel: '',
    distractorOffsets: [-100, 100],
  },
];

const LEVEL_2_BLUEPRINTS: ProblemBlueprint[] = [
  {
    contextCategory: 'Persediaan Air & Kebutuhan Rumah Tangga',
    operands: [7500, 2350, 1250],
    operators: ['-', '+'],
    unitLabel: 'liter',
    distractorOffsets: [-100, 100], // 6.300, 6.400, 6.500
    buildStory: ([a, b, c]) => ({
      storyText: `Aqua City memiliki persediaan air sebanyak ${formatIndonesianNumber(
        a
      )} liter. Sebanyak ${formatIndonesianNumber(
        b
      )} liter digunakan oleh warga. Kemudian, tangki menerima tambahan ${formatIndonesianNumber(
        c
      )} liter air.`,
      questionPrompt: 'Berapa liter air yang tersedia sekarang?',
    }),
  },
  {
    contextCategory: 'Distribusi Air ke Sekolah & Taman Kota',
    operands: [6800, 1450, 950],
    operators: ['-', '-'],
    unitLabel: 'liter',
    distractorOffsets: [-100, 100],
    buildStory: ([a, b, c]) => ({
      storyText: `Tangki distribusi Zona Utara menyimpan ${formatIndonesianNumber(
        a
      )} liter air. Pagi ini sebanyak ${formatIndonesianNumber(
        b
      )} liter dialirkan ke sekolah dan ${formatIndonesianNumber(
        c
      )} liter digunakan untuk penyiraman taman kota.`,
      questionPrompt: 'Berapa liter sisa air di tangki Zona Utara?',
    }),
  },
  {
    contextCategory: 'Kebutuhan Air Klinik & Penambahan Persediaan',
    operands: [4250, 2600, 1350],
    operators: ['+', '-'],
    unitLabel: 'liter',
    distractorOffsets: [-100, 100],
    buildStory: ([a, b, c]) => ({
      storyText: `Tandon cadangan Aqua City berisi ${formatIndonesianNumber(
        a
      )} liter air dan mendapat kiriman baru ${formatIndonesianNumber(
        b
      )} liter. Sebanyak ${formatIndonesianNumber(
        c
      )} liter kemudian disalurkan ke klinik kesehatan kota.`,
      questionPrompt: 'Berapa liter air yang masih tersimpan di tandon cadangan?',
    }),
  },
  {
    contextCategory: 'Perbandingan Jumlah Air Antarzona',
    operands: [5400, 3150, 4850],
    operators: ['+', '-'],
    unitLabel: 'liter',
    distractorOffsets: [-100, 100],
    buildStory: ([a, b, c]) => ({
      storyText: `Zona Barat memiliki ${formatIndonesianNumber(
        a
      )} liter air dan Zona Tengah memiliki ${formatIndonesianNumber(
        b
      )} liter air. Sementara itu, Zona Timur memiliki ${formatIndonesianNumber(
        c
      )} liter air.`,
      questionPrompt:
        'Berapa selisih gabungan air Zona Barat & Tengah dibandingkan Zona Timur?',
    }),
  },
  {
    contextCategory: 'Operasi Tiga Bilangan Aqua City',
    operands: [8200, 3450, 1750],
    operators: ['-', '+'],
    unitLabel: 'liter',
    distractorOffsets: [-100, 100],
    buildStory: ([a, b, c]) => ({
      storyText: `Stasiun pompa utama menampung ${formatIndonesianNumber(
        a
      )} liter air. Siang hari terpakai ${formatIndonesianNumber(
        b
      )} liter oleh rumah tangga, lalu sore hari terisi kembali ${formatIndonesianNumber(
        c
      )} liter.`,
      questionPrompt: 'Berapa liter air di stasiun pompa utama sore hari?',
    }),
  },
];

const LEVEL_3_BLUEPRINTS: ProblemBlueprint[] = [
  {
    contextCategory: 'Persediaan Air Reservoir & Distribusi Sekolah',
    operands: [9000, 2750, 1850, 1500],
    operators: ['-', '-', '+'],
    unitLabel: 'liter',
    distractorOffsets: [-100, 100], // 5.800, 5.900, 6.000
    buildStory: ([a, b, c, d]) => ({
      storyText: `Reservoir Aqua City memiliki ${formatIndonesianNumber(
        a
      )} liter air. Pada pagi hari, ${formatIndonesianNumber(
        b
      )} liter air disalurkan ke perumahan dan ${formatIndonesianNumber(
        c
      )} liter ke sekolah. Pada siang hari, reservoir menerima tambahan ${formatIndonesianNumber(
        d
      )} liter air.`,
      questionPrompt: 'Berapa liter air yang tersisa di reservoir?',
    }),
  },
  {
    contextCategory: 'Kebutuhan Air Klinik, Taman Kota & Rumah Tangga',
    operands: [8500, 1650, 1250, 900],
    operators: ['-', '-', '-'],
    unitLabel: 'liter',
    distractorOffsets: [-100, 100],
    buildStory: ([a, b, c, d]) => ({
      storyText: `Pusat pengolahan air Aqua City menyiapkan ${formatIndonesianNumber(
        a
      )} liter air bersih. Sebanyak ${formatIndonesianNumber(
        b
      )} liter dikirim ke rumah tangga, ${formatIndonesianNumber(
        c
      )} liter ke klinik kota, dan ${formatIndonesianNumber(
        d
      )} liter untuk penyiraman taman kota.`,
      questionPrompt: 'Berapa liter air bersih yang belum disalurkan?',
    }),
  },
  {
    contextCategory: 'Penambahan Persediaan & Perbandingan Antarzona',
    operands: [4600, 3400, 2850, 1150],
    operators: ['+', '-', '-'],
    unitLabel: 'liter',
    distractorOffsets: [-100, 100],
    buildStory: ([a, b, c, d]) => ({
      storyText: `Dua menara air Aqua City masing-masing berisi ${formatIndonesianNumber(
        a
      )} liter dan ${formatIndonesianNumber(
        b
      )} liter air. Dari total gabungan tersebut, ${formatIndonesianNumber(
        c
      )} liter dialirkan ke Zona Selatan dan ${formatIndonesianNumber(
        d
      )} liter ke gedung sekolah.`,
      questionPrompt: 'Berapa liter total air yang tersisa di kedua menara?',
    }),
  },
  {
    contextCategory: 'Manajemen Reservoir & Pemakaian Warga',
    operands: [9500, 3250, 2150, 1800],
    operators: ['-', '-', '+'],
    unitLabel: 'liter',
    distractorOffsets: [-100, 100],
    buildStory: ([a, b, c, d]) => ({
      storyText: `Reservoir Utama menyimpan ${formatIndonesianNumber(
        a
      )} liter air. Pagi hari digunakan ${formatIndonesianNumber(
        b
      )} liter untuk warga dan ${formatIndonesianNumber(
        c
      )} liter untuk fasilitas umum. Sore hari pipa pengisian menambah ${formatIndonesianNumber(
        d
      )} liter air.`,
      questionPrompt: 'Berapa liter volume air di Reservoir Utama sekarang?',
    }),
  },
  {
    contextCategory: 'Distribusi Klinik, Sekolah & Taman Kota',
    operands: [7800, 2200, 1950, 1450],
    operators: ['+', '-', '-'],
    unitLabel: 'liter',
    distractorOffsets: [-100, 100],
    buildStory: ([a, b, c, d]) => ({
      storyText: `Tandon Induk Aqua City memiliki ${formatIndonesianNumber(
        a
      )} liter air dan ditambah pasokan hujan terfilter ${formatIndonesianNumber(
        b
      )} liter. Selanjutnya ${formatIndonesianNumber(
        c
      )} liter dipakai oleh sekolah dan ${formatIndonesianNumber(
        d
      )} liter dipakai oleh klinik.`,
      questionPrompt: 'Berapa liter air yang tersisa di Tandon Induk?',
    }),
  },
];

function buildProblemFromBlueprint(
  level: DifficultyLevel,
  roundNumber: number,
  bp: ProblemBlueprint
): MathProblem {
  const correctAnswer = computeExactAnswer(bp.operands, bp.operators);
  const choices = buildValidChoices(correctAnswer, bp.distractorOffsets);

  const exprParts: string[] = [formatIndonesianNumber(bp.operands[0])];
  for (let i = 0; i < bp.operators.length; i++) {
    const opSymbol = bp.operators[i] === '-' ? '−' : '+';
    exprParts.push(opSymbol, formatIndonesianNumber(bp.operands[i + 1]));
  }
  const expressionText = `${exprParts.join(' ')} = ?`;

  if (bp.buildStory) {
    const { storyText, questionPrompt } = bp.buildStory(bp.operands);
    return {
      id: `prob-${level}-${roundNumber}-${correctAnswer}`,
      level,
      roundNumber,
      contextCategory: bp.contextCategory,
      storyText,
      expressionText,
      questionPrompt,
      operands: [...bp.operands],
      operators: [...bp.operators],
      correctAnswer,
      unitLabel: bp.unitLabel,
      choices,
    };
  }

  return {
    id: `prob-${level}-${roundNumber}-${correctAnswer}`,
    level,
    roundNumber,
    contextCategory: bp.contextCategory,
    expressionText,
    questionPrompt: expressionText,
    operands: [...bp.operands],
    operators: [...bp.operators],
    correctAnswer,
    unitLabel: bp.unitLabel,
    choices,
  };
}

/**
 * Generates a mathematically verified Kelas 5 SD Aqua City problem for the chosen difficulty level.
 * Automatically validates problem, choices, and answer key before returning; regenerates if invalid.
 */
export function generateMathProblem(
  level: DifficultyLevel = 'level1',
  roundNumber: number = 1,
  rng: () => number = Math.random
): MathProblem {
  const catalog =
    level === 'level1'
      ? LEVEL_1_BLUEPRINTS
      : level === 'level2'
      ? LEVEL_2_BLUEPRINTS
      : LEVEL_3_BLUEPRINTS;

  if (roundNumber >= 1 && roundNumber <= catalog.length) {
    const candidate = buildProblemFromBlueprint(
      level,
      roundNumber,
      catalog[roundNumber - 1]
    );
    if (validateMathProblem(candidate)) {
      return candidate;
    }
  }

  // Dynamic generator for additional rounds beyond the curated blueprints
  for (let attempt = 0; attempt < 20; attempt++) {
    if (level === 'level1') {
      const isAdd = rng() < 0.5;
      const a = 1500 + Math.floor(rng() * 65) * 50; // 1500..4700
      const b = 1250 + Math.floor(rng() * 65) * 50; // 1250..4450
      const operands = isAdd ? [a, b] : [a + b, a];
      const operators: Array<'+' | '-'> = [isAdd ? '+' : '-'];
      const bp: ProblemBlueprint = {
        contextCategory: isAdd ? 'Penjumlahan Bilangan' : 'Pengurangan Bilangan',
        operands,
        operators,
        unitLabel: '',
        distractorOffsets: [-100, 100, 200, -200],
      };
      const candidate = buildProblemFromBlueprint(level, roundNumber, bp);
      if (validateMathProblem(candidate)) return candidate;
    } else if (level === 'level2') {
      const a = 5000 + Math.floor(rng() * 70) * 50; // 5000..8450
      const b = 1200 + Math.floor(rng() * 35) * 50; // 1200..2900
      const c = 800 + Math.floor(rng() * 25) * 50;  // 800..2000
      const bp: ProblemBlueprint = {
        contextCategory: 'Persediaan Air & Distribusi Aqua City',
        operands: [a, b, c],
        operators: ['-', '+'],
        unitLabel: 'liter',
        distractorOffsets: [-100, 100],
        buildStory: ([opA, opB, opC]) => ({
          storyText: `Tangki Aqua City memiliki persediaan air sebanyak ${formatIndonesianNumber(
            opA
          )} liter. Sebanyak ${formatIndonesianNumber(
            opB
          )} liter disalurkan ke rumah tangga, lalu tangki menerima tambahan ${formatIndonesianNumber(
            opC
          )} liter air.`,
          questionPrompt: 'Berapa liter air yang tersedia sekarang?',
        }),
      };
      const candidate = buildProblemFromBlueprint(level, roundNumber, bp);
      if (validateMathProblem(candidate)) return candidate;
    } else {
      const a = 7500 + Math.floor(rng() * 40) * 50; // 7500..9450
      const b = 1800 + Math.floor(rng() * 25) * 50; // 1800..3000
      const c = 1100 + Math.floor(rng() * 20) * 50; // 1100..2050
      const d = 950 + Math.floor(rng() * 20) * 50;  // 950..1900
      const bp: ProblemBlueprint = {
        contextCategory: 'Manajemen Reservoir Multi-Zona Aqua City',
        operands: [a, b, c, d],
        operators: ['-', '-', '+'],
        unitLabel: 'liter',
        distractorOffsets: [-100, 100],
        buildStory: ([opA, opB, opC, opD]) => ({
          storyText: `Reservoir Aqua City memiliki ${formatIndonesianNumber(
            opA
          )} liter air. Pada pagi hari, ${formatIndonesianNumber(
            opB
          )} liter air disalurkan ke perumahan dan ${formatIndonesianNumber(
            opC
          )} liter ke sekolah. Pada siang hari, reservoir menerima tambahan ${formatIndonesianNumber(
            opD
          )} liter air.`,
          questionPrompt: 'Berapa liter air yang tersisa di reservoir?',
        }),
      };
      const candidate = buildProblemFromBlueprint(level, roundNumber, bp);
      if (validateMathProblem(candidate)) return candidate;
    }
  }

  return buildProblemFromBlueprint('level1', 1, LEVEL_1_BLUEPRINTS[0]);
}

export function formatTeamAnswerStatusLabel(status: TeamAnswerStatus): string {
  switch (status) {
    case 'waiting':
      return 'Belum menjawab';
    case 'answered':
      return 'Sudah menjawab';
    case 'correct':
      return 'Jawaban benar';
    case 'wrong':
      return 'Jawaban salah';
  }
}

export function createInitialTeamState(team: TeamId): TeamBattleState {
  return {
    team,
    name: team === 'blue' ? 'Tim Biru' : 'Tim Kuning',
    score: 0,
    correctCount: 0,
    wrongCount: 0,
    streak: 0,
    bestStreak: 0,
    waterTank: 50,
    selectedLaneIndex: 1,
    cooldownUntil: 0,
    hasAnsweredRound: false,
    selectedChoiceValue: null,
    selectedBubbleId: null,
    selectedOptionLetter: null,
    answerStatus: 'waiting',
    lastRoundCorrect: null,
    lastGesture: null,
    lastGestureTimestamp: 0,
    lastPointTimestamp: 0,
    lastPointsAwarded: 0,
    activePlayerPos:
      team === 'blue' ? { x: 0.25, y: 0.78 } : { x: 0.75, y: 0.78 },
  };
}

/**
 * Resets per-question touch selection state when moving to the next question,
 * while preserving cumulative score, correctCount, wrongCount, and streak.
 */
export function resetTeamForNextRound(teamState: TeamBattleState): TeamBattleState {
  return {
    ...teamState,
    hasAnsweredRound: false,
    selectedChoiceValue: null,
    selectedBubbleId: null,
    selectedOptionLetter: null,
    answerStatus: 'waiting',
    lastRoundCorrect: null,
    selectedLaneIndex: 1,
  };
}

/**
 * Phase 1 (Touch Selection Lock-in):
 * Stores a team's touched answer choice separately without awarding points yet.
 * Once a team selects an answer, that team's buttons are disabled until validation.
 */
export function selectTeamTouchAnswer(
  teamState: TeamBattleState,
  bubble: AnswerBubble,
  timestamp: number = Date.now()
): { updatedTeam: TeamBattleState; accepted: boolean } {
  // Enforce strict team zone ownership and single lock-in per round
  if (bubble.team !== teamState.team || teamState.hasAnsweredRound) {
    return {
      updatedTeam: teamState,
      accepted: false,
    };
  }

  return {
    updatedTeam: {
      ...teamState,
      hasAnsweredRound: true,
      selectedChoiceValue: bubble.value,
      selectedBubbleId: bubble.id,
      selectedOptionLetter: bubble.optionLetter,
      selectedLaneIndex: bubble.laneIndex,
      answerStatus: 'answered',
      lastGestureTimestamp: timestamp,
    },
    accepted: true,
  };
}

export interface RoundValidationResult {
  updatedBlue: TeamBattleState;
  updatedYellow: TeamBattleState;
  blueCorrect: boolean;
  yellowCorrect: boolean;
  bluePointsAwarded: number;
  yellowPointsAwarded: number;
}

/**
 * Phase 2 (Simultaneous Validation):
 * Executed ONLY after both teams have locked in an answer OR when time runs out.
 * - If both teams answered correctly, both earn +10 points.
 * - If only one team answered correctly, only that team earns +10 points.
 * - If wrong or unanswered, that team earns 0 points.
 */
export function validateRoundTouchAnswers(
  blueTeam: TeamBattleState,
  yellowTeam: TeamBattleState,
  problem: MathProblem,
  timestamp: number = Date.now()
): RoundValidationResult {
  const exactCorrect = computeExactAnswer(problem.operands, problem.operators);

  const evaluateSingleTeam = (team: TeamBattleState) => {
    const isCorrect =
      team.hasAnsweredRound &&
      team.selectedChoiceValue !== null &&
      team.selectedChoiceValue === exactCorrect &&
      team.selectedChoiceValue === problem.correctAnswer;

    if (isCorrect) {
      const nextStreak = team.streak + 1;
      const pointsAwarded = 10;
      return {
        updated: {
          ...team,
          score: team.score + pointsAwarded,
          correctCount: team.correctCount + 1,
          streak: nextStreak,
          bestStreak: Math.max(team.bestStreak, nextStreak),
          waterTank: Math.min(100, team.waterTank + 25),
          answerStatus: 'correct' as TeamAnswerStatus,
          lastRoundCorrect: true,
          lastPointTimestamp: timestamp,
          lastPointsAwarded: pointsAwarded,
        },
        isCorrect: true,
        pointsAwarded,
      };
    }

    return {
      updated: {
        ...team,
        wrongCount: team.wrongCount + 1,
        streak: 0,
        answerStatus: 'wrong' as TeamAnswerStatus,
        lastRoundCorrect: false,
        lastPointsAwarded: 0,
      },
      isCorrect: false,
      pointsAwarded: 0,
    };
  };

  const blueRes = evaluateSingleTeam(blueTeam);
  const yellowRes = evaluateSingleTeam(yellowTeam);

  return {
    updatedBlue: blueRes.updated,
    updatedYellow: yellowRes.updated,
    blueCorrect: blueRes.isCorrect,
    yellowCorrect: yellowRes.isCorrect,
    bluePointsAwarded: blueRes.pointsAwarded,
    yellowPointsAwarded: yellowRes.pointsAwarded,
  };
}

/**
 * Strict horizontal screen boundary mapping:
 * - Left area (0.00 .. 0.47): strictly 'blue' (Tim Biru)
 * - Center buffer deadzone (0.47 .. 0.53): null (prevents hand bleed across border)
 * - Right area (0.53 .. 1.00): strictly 'yellow' (Tim Kuning)
 */
export function mapNormalizedXToTeamZone(normX: number): TeamId | null {
  if (normX < 0 || normX > 1 || Number.isNaN(normX)) return null;
  if (normX <= 0.47) return 'blue';
  if (normX >= 0.53) return 'yellow';
  return null;
}

export function isTeamOnCooldown(
  teamState: TeamBattleState,
  now: number = Date.now()
): boolean {
  return now < teamState.cooldownUntil;
}

export function cycleTeamLaneSelection(
  teamState: TeamBattleState,
  direction: 'left' | 'right',
  timestamp: number = Date.now()
): TeamBattleState {
  const delta = direction === 'left' ? -1 : 1;
  const nextLane = (((teamState.selectedLaneIndex + delta) % 3) + 3) % 3 as
    | 0
    | 1
    | 2;

  return {
    ...teamState,
    selectedLaneIndex: nextLane,
    lastGesture: 'slash_side',
    lastGestureTimestamp: timestamp,
  };
}

/**
 * Creates 3 touch answer buttons/bubbles per team (Tombol A, Tombol B, Tombol C)
 * with exactly 1 correct answer and 2 validated distractors.
 */
export function createTeamBubbles(
  team: TeamId,
  problem: MathProblem,
  rng: () => number = Math.random
): AnswerBubble[] {
  const distractors = problem.choices.filter(
    (c) => c !== problem.correctAnswer
  );
  const rawValues = [
    problem.correctAnswer,
    distractors[0] ?? problem.correctAnswer - 100,
    distractors[1] ?? problem.correctAnswer + 100,
  ];

  // Deterministic/shuffled lane placement
  const laneOrder: Array<0 | 1 | 2> = [0, 1, 2];
  for (let i = laneOrder.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = laneOrder[i];
    laneOrder[i] = laneOrder[j];
    laneOrder[j] = tmp;
  }

  const lanePositions: Record<0 | 1 | 2, { x: number; y: number }> =
    team === 'blue'
      ? {
          0: { x: 19, y: 52 }, // Tombol A (Kiri)
          1: { x: 47, y: 40 }, // Tombol B (Tengah)
          2: { x: 75, y: 52 }, // Tombol C (Kanan)
        }
      : {
          0: { x: 25, y: 52 }, // Tombol A (Kiri)
          1: { x: 53, y: 40 }, // Tombol B (Tengah)
          2: { x: 81, y: 52 }, // Tombol C (Kanan)
        };

  const optionLetters: Record<0 | 1 | 2, 'A' | 'B' | 'C'> = {
    0: 'A',
    1: 'B',
    2: 'C',
  };

  const created = rawValues.map((value, idx) => {
    const laneIndex = laneOrder[idx];
    const basePos = lanePositions[laneIndex];
    const angle = (idx * 2.1 + (team === 'blue' ? 0.4 : 1.7)) % (Math.PI * 2);
    const speed = 2.8;

    return {
      id: `bubble-${team}-${problem.roundNumber}-${laneIndex}-${value}`,
      team,
      optionLetter: optionLetters[laneIndex],
      value,
      formattedValue: formatChoiceLabel(value, problem.unitLabel),
      isCorrect: value === problem.correctAnswer,
      x: basePos.x,
      y: basePos.y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      radius: 12,
      bobPhase: idx * 1.8 + (team === 'blue' ? 0 : 1.1),
      laneIndex,
      status: 'floating' as const,
      popProgress: 0,
    };
  });

  return created.sort((a, b) => a.laneIndex - b.laneIndex);
}

export interface HitEvaluationResult {
  updatedTeam: TeamBattleState;
  pointsAwarded: number;
  isCorrect: boolean;
  usedSuperCombo: boolean;
  blockedByCooldown: boolean;
}

/**
 * Evaluates a team's answer selection with strict mathematical validation and gesture cooldown.
 * Never awards points if the answer is unvalidated, wrong, or on cooldown.
 */
export function evaluateBubbleHit(
  teamState: TeamBattleState,
  bubble: AnswerBubble,
  gesture: MotionGestureType,
  timestamp: number = Date.now(),
  expectedCorrectAnswer?: number
): HitEvaluationResult {
  // Enforce team alignment, single answer per round, & cooldown
  if (
    bubble.team !== teamState.team ||
    teamState.hasAnsweredRound ||
    isTeamOnCooldown(teamState, timestamp)
  ) {
    return {
      updatedTeam: teamState,
      pointsAwarded: 0,
      isCorrect: false,
      usedSuperCombo: false,
      blockedByCooldown: true,
    };
  }

  // Validate against expectedCorrectAnswer if provided, plus bubble.isCorrect
  const isVerifiedCorrect =
    expectedCorrectAnswer !== undefined
      ? bubble.value === expectedCorrectAnswer && bubble.isCorrect
      : bubble.isCorrect;

  const usedSuperCombo =
    gesture === 'raise_both_hands' && teamState.waterTank >= 100;

  if (isVerifiedCorrect) {
    const newStreak = teamState.streak + 1;
    const streakBonus = newStreak >= 3 ? 5 : 0;
    const comboMultiplier = usedSuperCombo ? 2 : 1;
    const pointsAwarded = (10 + streakBonus) * comboMultiplier;
    const nextWaterTank = usedSuperCombo
      ? 25
      : Math.min(100, teamState.waterTank + 25);

    return {
      updatedTeam: {
        ...teamState,
        score: teamState.score + pointsAwarded,
        correctCount: teamState.correctCount + 1,
        streak: newStreak,
        bestStreak: Math.max(teamState.bestStreak, newStreak),
        waterTank: nextWaterTank,
        selectedLaneIndex: bubble.laneIndex,
        selectedChoiceValue: bubble.value,
        selectedBubbleId: bubble.id,
        selectedOptionLetter: bubble.optionLetter,
        answerStatus: 'correct',
        cooldownUntil: timestamp + GESTURE_COOLDOWN_MS,
        hasAnsweredRound: true,
        lastRoundCorrect: true,
        lastGesture: gesture,
        lastGestureTimestamp: timestamp,
        lastPointTimestamp: timestamp,
        lastPointsAwarded: pointsAwarded,
      },
      pointsAwarded,
      isCorrect: true,
      usedSuperCombo,
      blockedByCooldown: false,
    };
  }

  // Wrong answer: 0 points awarded, increments wrongCount, triggers cooldown
  return {
    updatedTeam: {
      ...teamState,
      wrongCount: teamState.wrongCount + 1,
      streak: 0,
      selectedLaneIndex: bubble.laneIndex,
      selectedChoiceValue: bubble.value,
      selectedBubbleId: bubble.id,
      selectedOptionLetter: bubble.optionLetter,
      answerStatus: 'wrong',
      cooldownUntil: timestamp + GESTURE_COOLDOWN_MS,
      hasAnsweredRound: false,
      lastRoundCorrect: false,
      lastGesture: gesture,
      lastGestureTimestamp: timestamp,
    },
    pointsAwarded: 0,
    isCorrect: false,
    usedSuperCombo: false,
    blockedByCooldown: false,
  };
}

export function chargeWaterTank(
  teamState: TeamBattleState,
  amount: number = 25,
  timestamp: number = Date.now()
): TeamBattleState {
  const clampedAmount = Math.max(0, amount);
  return {
    ...teamState,
    waterTank: Math.min(100, teamState.waterTank + clampedAmount),
    lastGesture: 'swipe_up',
    lastGestureTimestamp: timestamp,
  };
}

export function stepBubblePhysics(
  bubbles: AnswerBubble[],
  rawDt: number
): AnswerBubble[] {
  const dt = Math.min(Math.max(rawDt, 0), 0.05);

  return bubbles.map((b) => {
    if (b.status !== 'floating') {
      return {
        ...b,
        popProgress: Math.min(1, b.popProgress + dt * 3.2),
      };
    }

    const nextBob = b.bobPhase + dt * 2.2;
    let nextX = b.x + b.vx * dt;
    let nextY = b.y + b.vy * dt + Math.sin(nextBob) * 0.12;
    let nextVx = b.vx;
    let nextVy = b.vy;

    const minX = b.laneIndex === 0 ? 16 : b.laneIndex === 1 ? 38 : 58;
    const maxX = b.laneIndex === 0 ? 36 : b.laneIndex === 1 ? 58 : 82;
    const minY = 28;
    const maxY = 68;

    if (nextX < minX) {
      nextX = minX;
      nextVx = Math.abs(nextVx);
    } else if (nextX > maxX) {
      nextX = maxX;
      nextVx = -Math.abs(nextVx);
    }

    if (nextY < minY) {
      nextY = minY;
      nextVy = Math.abs(nextVy);
    } else if (nextY > maxY) {
      nextY = maxY;
      nextVy = -Math.abs(nextVy);
    }

    return {
      ...b,
      x: nextX,
      y: nextY,
      vx: nextVx,
      vy: nextVy,
      bobPhase: nextBob,
    };
  });
}

export const APPRECIATION_QUOTE =
  '“Hebat! Terus berlatih, bekerja sama, dan berpikir cermat!”';

export function determineWinner(
  blueTeam: TeamBattleState,
  yellowTeam: TeamBattleState
): {
  winner: TeamId | 'draw';
  headline: string;
  subheadline: string;
  appreciationMessage: string;
  quote: string;
  blueAccuracy: number;
  yellowAccuracy: number;
} {
  const blueTotal = blueTeam.correctCount + blueTeam.wrongCount;
  const yellowTotal = yellowTeam.correctCount + yellowTeam.wrongCount;

  const blueAccuracy =
    blueTotal > 0 ? Math.round((blueTeam.correctCount / blueTotal) * 100) : 0;
  const yellowAccuracy =
    yellowTotal > 0
      ? Math.round((yellowTeam.correctCount / yellowTotal) * 100)
      : 0;

  if (blueTeam.score > yellowTeam.score) {
    return {
      winner: 'blue',
      headline: 'TIM BIRU MENANG!',
      subheadline: `Hebat! Tim Biru unggul dengan skor akhir ${blueTeam.score} lawan ${yellowTeam.score}!`,
      appreciationMessage:
        'Apresiasi setinggi-tingginya untuk Tim Biru dan Tim Kuning yang telah berhitung cepat dan kompak menjaga persediaan air Aqua City!',
      quote: APPRECIATION_QUOTE,
      blueAccuracy,
      yellowAccuracy,
    };
  }

  if (yellowTeam.score > blueTeam.score) {
    return {
      winner: 'yellow',
      headline: 'TIM KUNING MENANG!',
      subheadline: `Luar biasa! Tim Kuning unggul dengan skor akhir ${yellowTeam.score} lawan ${blueTeam.score}!`,
      appreciationMessage:
        'Apresiasi setinggi-tingginya untuk Tim Kuning dan Tim Biru yang telah berhitung cepat dan kompak menjaga persediaan air Aqua City!',
      quote: APPRECIATION_QUOTE,
      blueAccuracy,
      yellowAccuracy,
    };
  }

  return {
    winner: 'draw',
    headline: 'PERTANDINGAN SERI!',
    subheadline: `Kedua tim sama tangguh dengan skor akhir ${blueTeam.score}!`,
    appreciationMessage:
      'Luar biasa! Tim Biru dan Tim Kuning menunjukkan kerja sama dan ketelitian yang seimbang dalam menyelesaikan tantangan matematika Aqua City!',
    quote: APPRECIATION_QUOTE,
    blueAccuracy,
    yellowAccuracy,
  };
}
