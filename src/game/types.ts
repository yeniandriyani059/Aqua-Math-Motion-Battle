export type TeamId = 'blue' | 'yellow';

export type BattleMode = 'touch' | 'motion';

export type DifficultyLevel = 'level1' | 'level2' | 'level3';

export type GameState = 'title' | 'playing' | 'paused' | 'gameover';

export type TeamAnswerStatus = 'waiting' | 'answered' | 'correct' | 'wrong';

export type MotionGestureType =
  | 'punch_forward'     // Dorong tangan ke depan -> memilih / menembakkan jawaban
  | 'slash_side'        // Gerakan kiri/kanan -> berpindah pilihan
  | 'raise_both_hands'  // Dua tangan -> aktivasi serangan besar (combo)
  | 'swipe_up';         // Angkat tangan -> mengisi tandon air

export type CameraTrackingStatus = 'initializing' | 'active' | 'unavailable' | 'denied';

export interface GameSettings {
  battleMode: BattleMode;
  level: DifficultyLevel;
  durationSeconds: 60 | 120 | 180;
  totalQuestions: 5 | 10 | 15;
  playersPerTeam: 1 | 2 | 3;
}

export interface MathProblem {
  id: string;
  level: DifficultyLevel;
  roundNumber: number;
  contextCategory: string;
  storyText?: string;
  expressionText: string;
  questionPrompt: string;
  operands: number[];
  operators: Array<'+' | '-'>;
  correctAnswer: number;
  unitLabel: string; // '' or 'liter'
  choices: number[];
}

export interface AnswerBubble {
  id: string;
  team: TeamId;
  optionLetter: 'A' | 'B' | 'C';
  value: number;
  formattedValue: string;
  isCorrect: boolean;
  /** Normalized arena coordinates within the team's half: x in [16, 84], y in [34, 66] */
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  bobPhase: number;
  laneIndex: 0 | 1 | 2; // 0 = A (kiri), 1 = B (tengah), 2 = C (kanan)
  status: 'floating' | 'selected_locked' | 'popping_correct' | 'popping_wrong';
  popProgress: number;
}

export interface TeamBattleState {
  team: TeamId;
  name: string;
  score: number;
  correctCount: number;
  wrongCount: number;
  streak: number;
  bestStreak: number;
  waterTank: number; // 0..100
  selectedLaneIndex: 0 | 1 | 2;
  cooldownUntil: number;
  hasAnsweredRound: boolean;
  selectedChoiceValue: number | null;
  selectedBubbleId: string | null;
  selectedOptionLetter: 'A' | 'B' | 'C' | null;
  answerStatus: TeamAnswerStatus; // 'waiting' | 'answered' | 'correct' | 'wrong'
  lastRoundCorrect: boolean | null;
  lastGesture: MotionGestureType | null;
  lastGestureTimestamp: number;
  lastPointTimestamp: number;
  lastPointsAwarded: number;
  activePlayerPos: { x: number; y: number } | null;
}

export interface SplashEffect {
  id: string;
  team: TeamId;
  x: number;
  y: number;
  value: number;
  pointsDelta: number;
  isCorrect: boolean;
  gesture: MotionGestureType;
  createdAt: number;
}

export interface MotionInputEvent {
  team: TeamId;
  gesture: MotionGestureType;
  direction?: 'left' | 'right';
  laneIndex?: 0 | 1 | 2;
  bubbleId?: string;
  source: 'pointer' | 'keyboard' | 'simulation_control' | 'camera_gesture';
  normalizedScreenX?: number;
  confidence: number;
  timestamp: number;
}

export interface RoundHistoryItem {
  roundNumber: number;
  level: DifficultyLevel;
  expressionText: string;
  correctAnswer: number;
  unitLabel: string;
  blueCorrect: boolean;
  yellowCorrect: boolean;
}
