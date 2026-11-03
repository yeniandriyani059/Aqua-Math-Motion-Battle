import test from 'node:test';
import assert from 'node:assert/strict';
import {
  APPRECIATION_QUOTE,
  chargeWaterTank,
  computeExactAnswer,
  createInitialTeamState,
  createTeamBubbles,
  cycleTeamLaneSelection,
  determineWinner,
  evaluateBubbleHit,
  formatTeamAnswerStatusLabel,
  generateMathProblem,
  mapNormalizedXToTeamZone,
  resetTeamForNextRound,
  selectTeamTouchAnswer,
  validateMathProblem,
  validateRoundTouchAnswers,
} from './rules';
import { isSafePublishableKey, isValidSupabaseUrl } from '../services/supabaseClient';
import {
  buildMatchResultRecord,
  createUniqueMatchId,
  formatSupabaseErrorMessage,
  formatSyncIndicatorLabel,
  fromSupabaseRow,
  mergeMatchHistories,
  SUPABASE_MATCH_TABLE,
  toSupabaseRow,
  toValidMatchUuid,
} from '../services/matchStorage';
import {
  BLUE_DETECTION_ZONE,
  createInitialDualTrackerState,
  createInitialTrackerState,
  isPointInDetectionZone,
  stepDualPlayerTracker,
  stepSinglePlayerTracker,
  TRACKER_CONFIG,
  YELLOW_DETECTION_ZONE,
} from './handTracking';

test('Level 1 (Mudah) generates exact addition and subtraction up to 10.000 matching specification', () => {
  const p1 = generateMathProblem('level1', 1);
  assert.equal(p1.correctAnswer, 5700); // 2.450 + 3.250 = 5.700
  assert.deepEqual([...p1.choices].sort((a, b) => a - b), [5600, 5700, 5800]);
  assert.equal(validateMathProblem(p1), true);

  const p2 = generateMathProblem('level1', 2);
  assert.equal(p2.correctAnswer, 5750); // 8.500 - 2.750 = 5.750
  assert.deepEqual([...p2.choices].sort((a, b) => a - b), [5650, 5750, 6750]);
  assert.equal(validateMathProblem(p2), true);

  for (let r = 1; r <= 20; r++) {
    const prob = generateMathProblem('level1', r);
    assert.equal(validateMathProblem(prob), true);
  }
});

test('Level 2 (Sedang) generates validated 3-number contextual Aqua City problems', () => {
  const p1 = generateMathProblem('level2', 1);
  // 7.500 - 2.350 + 1.250 = 6.400 liter
  assert.equal(p1.correctAnswer, 6400);
  assert.equal(p1.unitLabel, 'liter');
  assert.ok(p1.storyText?.includes('7.500 liter'));
  assert.deepEqual([...p1.choices].sort((a, b) => a - b), [6300, 6400, 6500]);
  assert.equal(validateMathProblem(p1), true);

  for (let r = 1; r <= 15; r++) {
    const prob = generateMathProblem('level2', r);
    assert.equal(validateMathProblem(prob), true);
    assert.equal(
      computeExactAnswer(prob.operands, prob.operators),
      prob.correctAnswer
    );
  }
});

test('Level 3 (Kompleks) generates validated multi-step Aqua City reservoir problems', () => {
  const p1 = generateMathProblem('level3', 1);
  // 9.000 - 2.750 - 1.850 + 1.500 = 5.900 liter
  assert.equal(p1.correctAnswer, 5900);
  assert.equal(p1.unitLabel, 'liter');
  assert.ok(p1.storyText?.includes('Reservoir Aqua City memiliki 9.000 liter'));
  assert.deepEqual([...p1.choices].sort((a, b) => a - b), [5800, 5900, 6000]);
  assert.equal(validateMathProblem(p1), true);

  for (let r = 1; r <= 15; r++) {
    const prob = generateMathProblem('level3', r);
    assert.equal(validateMathProblem(prob), true);
    assert.equal(
      computeExactAnswer(prob.operands, prob.operators),
      prob.correctAnswer
    );
  }
});

test('Touch Mode lock-in stores each team answer separately without awarding points until simultaneous validation', () => {
  const prob = generateMathProblem('level1', 1); // 2.450 + 3.250 = 5.700
  const blueBubbles = createTeamBubbles('blue', prob);
  const yellowBubbles = createTeamBubbles('yellow', prob);

  // Verify A, B, C option letters
  assert.deepEqual(
    blueBubbles.map((b) => b.optionLetter),
    ['A', 'B', 'C']
  );

  let blue = createInitialTeamState('blue');
  let yellow = createInitialTeamState('yellow');
  assert.equal(formatTeamAnswerStatusLabel(blue.answerStatus), 'Belum menjawab');

  // Blue selects the correct answer
  const blueCorrectBubble = blueBubbles.find((b) => b.isCorrect)!;
  const blueLock = selectTeamTouchAnswer(blue, blueCorrectBubble, 1000);
  assert.equal(blueLock.accepted, true);
  blue = blueLock.updatedTeam;

  // Points must NOT be awarded before simultaneous validation!
  assert.equal(blue.score, 0);
  assert.equal(blue.hasAnsweredRound, true);
  assert.equal(blue.answerStatus, 'answered');
  assert.equal(formatTeamAnswerStatusLabel(blue.answerStatus), 'Sudah menjawab');

  // Blue cannot change or re-select after locking in
  const blueWrongBubble = blueBubbles.find((b) => !b.isCorrect)!;
  const secondTry = selectTeamTouchAnswer(blue, blueWrongBubble, 1100);
  assert.equal(secondTry.accepted, false);
  assert.equal(secondTry.updatedTeam.selectedChoiceValue, prob.correctAnswer);

  // Yellow selects a wrong answer
  const yellowWrongBubble = yellowBubbles.find((b) => !b.isCorrect)!;
  const yellowLock = selectTeamTouchAnswer(yellow, yellowWrongBubble, 1200);
  assert.equal(yellowLock.accepted, true);
  yellow = yellowLock.updatedTeam;
  assert.equal(yellow.score, 0);
  assert.equal(yellow.answerStatus, 'answered');

  // Now both teams have answered -> validate simultaneously
  const validation = validateRoundTouchAnswers(blue, yellow, prob, 1500);
  assert.equal(validation.blueCorrect, true);
  assert.equal(validation.yellowCorrect, false);
  assert.equal(validation.bluePointsAwarded, 10);
  assert.equal(validation.yellowPointsAwarded, 0);
  assert.equal(validation.updatedBlue.score, 10);
  assert.equal(validation.updatedYellow.score, 0);
  assert.equal(
    formatTeamAnswerStatusLabel(validation.updatedBlue.answerStatus),
    'Jawaban benar'
  );
  assert.equal(
    formatTeamAnswerStatusLabel(validation.updatedYellow.answerStatus),
    'Jawaban salah'
  );

  // Both teams answer correctly in Round 2 -> both get +10 points
  const prob2 = generateMathProblem('level1', 2);
  const blueBubbles2 = createTeamBubbles('blue', prob2);
  const yellowBubbles2 = createTeamBubbles('yellow', prob2);

  blue = resetTeamForNextRound(validation.updatedBlue);
  yellow = resetTeamForNextRound(validation.updatedYellow);
  assert.equal(blue.answerStatus, 'waiting');

  blue = selectTeamTouchAnswer(
    blue,
    blueBubbles2.find((b) => b.isCorrect)!,
    2000
  ).updatedTeam;
  yellow = selectTeamTouchAnswer(
    yellow,
    yellowBubbles2.find((b) => b.isCorrect)!,
    2100
  ).updatedTeam;

  const val2 = validateRoundTouchAnswers(blue, yellow, prob2, 2200);
  assert.equal(val2.blueCorrect, true);
  assert.equal(val2.yellowCorrect, true);
  assert.equal(val2.updatedBlue.score, 20);
  assert.equal(val2.updatedYellow.score, 10);
});

test('Strict horizontal gesture zone separation prevents cross-team interference', () => {
  assert.equal(mapNormalizedXToTeamZone(0.15), 'blue');
  assert.equal(mapNormalizedXToTeamZone(0.46), 'blue');
  assert.equal(mapNormalizedXToTeamZone(0.50), null); // Deadzone buffer
  assert.equal(mapNormalizedXToTeamZone(0.54), 'yellow');
  assert.equal(mapNormalizedXToTeamZone(0.88), 'yellow');

  // Ensure a Blue team state rejects a Yellow bubble hit
  const blueState = createInitialTeamState('blue');
  const prob = generateMathProblem('level1', 1);
  const yellowBubbles = createTeamBubbles('yellow', prob);
  const crossTouch = selectTeamTouchAnswer(blueState, yellowBubbles[0], 1000);
  assert.equal(crossTouch.accepted, false);
});

test('Gesture cooldown prevents a single motion from triggering multiple answers', () => {
  const initial = createInitialTeamState('blue');
  const prob = generateMathProblem('level1', 1);
  const bubbles = createTeamBubbles('blue', prob);
  const correctBubble = bubbles.find((b) => b.isCorrect)!;

  const firstHit = evaluateBubbleHit(
    initial,
    correctBubble,
    'punch_forward',
    1000,
    prob.correctAnswer
  );
  assert.equal(firstHit.isCorrect, true);
  assert.equal(firstHit.pointsAwarded, 10);

  // Second hit 200ms later is blocked by cooldown
  const secondHit = evaluateBubbleHit(
    firstHit.updatedTeam,
    correctBubble,
    'punch_forward',
    1200,
    prob.correctAnswer
  );
  assert.equal(secondHit.blockedByCooldown, true);
  assert.equal(secondHit.pointsAwarded, 0);
  assert.equal(secondHit.updatedTeam.score, 10);
});

test('Left/right gesture cycles team lane selection cleanly and Super Combo doubles points', () => {
  let state = createInitialTeamState('yellow');
  assert.equal(state.selectedLaneIndex, 1); // Center
  state = cycleTeamLaneSelection(state, 'left', 500);
  assert.equal(state.selectedLaneIndex, 0); // Left
  state = cycleTeamLaneSelection(state, 'right', 600);
  assert.equal(state.selectedLaneIndex, 1); // Center

  state = chargeWaterTank(state, 50, 700);
  assert.equal(state.waterTank, 100);

  const prob = generateMathProblem('level1', 1);
  const bubbles = createTeamBubbles('yellow', prob);
  const correctBubble = bubbles.find((b) => b.isCorrect)!;
  const comboHit = evaluateBubbleHit(
    state,
    correctBubble,
    'raise_both_hands',
    2000,
    prob.correctAnswer
  );
  assert.equal(comboHit.usedSuperCombo, true);
  assert.equal(comboHit.pointsAwarded, 20);
});

test('determineWinner includes required appreciation quote and accuracy percentages', () => {
  const blue = {
    ...createInitialTeamState('blue'),
    score: 30,
    correctCount: 3,
    wrongCount: 1,
  };
  const yellow = {
    ...createInitialTeamState('yellow'),
    score: 20,
    correctCount: 2,
    wrongCount: 2,
  };
  const res = determineWinner(blue, yellow);
  assert.equal(res.winner, 'blue');
  assert.equal(res.blueAccuracy, 75);
  assert.equal(res.yellowAccuracy, 50);
  assert.equal(res.quote, APPRECIATION_QUOTE);
});

test('Supabase security blocks service_role keys and validates publishable anon keys', () => {
  assert.equal(isSafePublishableKey(''), false);
  assert.equal(isSafePublishableKey('sb_secret_1234567890123456789012345'), false);
  assert.equal(isSafePublishableKey('service_role_key_123456789012345'), false);

  // JWT containing {"role":"service_role"}
  const serviceJwt =
    'eyJhbGciOiJIUzI1NiJ9.' +
    Buffer.from(JSON.stringify({ role: 'service_role' })).toString('base64url') +
    '.sig';
  assert.equal(isSafePublishableKey(serviceJwt), false);

  // JWT containing {"role":"anon"}
  const anonJwt =
    'eyJhbGciOiJIUzI1NiJ9.' +
    Buffer.from(JSON.stringify({ role: 'anon' })).toString('base64url') +
    '.sig';
  assert.equal(isSafePublishableKey(anonJwt), true);
  assert.equal(isValidSupabaseUrl('https://xyzcompany.supabase.co'), true);
  assert.equal(isValidSupabaseUrl('https://your-project-id.supabase.co'), false);
});

test('Offline-first match storage generates unique IDs, formats sync indicators, and deduplicates without losing unsynced local data', () => {
  const id1 = createUniqueMatchId(1700000000000);
  const id2 = createUniqueMatchId(1700000000000);
  assert.notEqual(id1, id2);
  assert.ok(id1.startsWith('match-'));

  assert.equal(
    formatSyncIndicatorLabel('online_synced'),
    'Online – Tersinkronisasi'
  );
  assert.equal(
    formatSyncIndicatorLabel('offline_local'),
    'Offline – Data tersimpan lokal'
  );
  assert.equal(formatSyncIndicatorLabel('syncing'), 'Menyinkronkan');
  assert.equal(
    formatSyncIndicatorLabel('sync_failed'),
    'Sinkronisasi gagal – Akan dicoba kembali'
  );

  const blue = { ...createInitialTeamState('blue'), score: 40, correctCount: 4, wrongCount: 1 };
  const yellow = { ...createInitialTeamState('yellow'), score: 20, correctCount: 2, wrongCount: 3 };

  const localUnsynced = buildMatchResultRecord({
    id: 'match-unique-001',
    startedAt: '2026-11-01T10:00:00.000Z',
    finishedAt: '2026-11-01T10:03:00.000Z',
    settings: {
      battleMode: 'touch',
      level: 'level1',
      durationSeconds: 180,
      totalQuestions: 5,
    },
    blueTeam: blue,
    yellowTeam: yellow,
    history: [],
    matchStatus: 'completed',
    syncStatus: 'pending',
  });

  const remoteStaleSameId = {
    ...localUnsynced,
    blueScore: 10,
    syncStatus: 'synced' as const,
  };

  const remoteSecondMatch = buildMatchResultRecord({
    id: 'match-unique-002',
    startedAt: '2026-11-01T09:00:00.000Z',
    finishedAt: '2026-11-01T09:03:00.000Z',
    settings: {
      battleMode: 'motion',
      level: 'level2',
      durationSeconds: 180,
      totalQuestions: 5,
    },
    blueTeam: blue,
    yellowTeam: yellow,
    history: [],
    matchStatus: 'completed',
    syncStatus: 'synced',
  });

  const merged = mergeMatchHistories(
    [localUnsynced],
    [remoteStaleSameId, remoteSecondMatch]
  );

  // Deduplicated by unique ID (2 records total, not 3)
  assert.equal(merged.length, 2);
  // Preserves unsynced local record instead of overwriting with stale remote before sync completes
  const preservedFirst = merged.find((m) => m.id === 'match-unique-001')!;
  assert.equal(preservedFirst.syncStatus, 'pending');
  assert.equal(preservedFirst.blueScore, 40);
});

test('Supabase row mapping matches public.aqua_battle_matches schema and formats RLS errors clearly', () => {
  assert.equal(SUPABASE_MATCH_TABLE, 'aqua_battle_matches');

  const blue = {
    ...createInitialTeamState('blue'),
    score: 50,
    correctCount: 5,
    wrongCount: 0,
  };
  const yellow = {
    ...createInitialTeamState('yellow'),
    score: 30,
    correctCount: 3,
    wrongCount: 2,
  };

  const record = buildMatchResultRecord({
    id: 'match-1730512345678-abc12345',
    startedAt: '2026-11-01T12:00:00.000Z',
    finishedAt: '2026-11-01T12:02:00.000Z',
    schoolId: 'sdn-karanggintung-06',
    sessionId: 'dev-session-01',
    settings: {
      battleMode: 'touch',
      level: 'level2',
      durationSeconds: 120,
      totalQuestions: 5,
    },
    blueTeam: blue,
    yellowTeam: yellow,
    history: [],
    matchStatus: 'completed',
  });

  const row = toSupabaseRow(record);
  assert.equal(row.id, toValidMatchUuid('match-1730512345678-abc12345'));
  assert.match(
    row.id,
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-a[0-9a-f]{3}-[0-9a-f]{12}$/
  );
  assert.equal(row.match_code, 'match-1730512345678-abc12345');
  assert.equal(row.game_mode, 'touch');
  assert.equal(row.game_level, 2);
  assert.equal(row.question_count, 5);
  assert.equal(row.blue_score, 50);
  assert.equal(row.yellow_score, 30);
  assert.equal(row.match_data.school_id, 'sdn-karanggintung-06');

  const roundTrip = fromSupabaseRow(row);
  assert.equal(roundTrip.id, 'match-1730512345678-abc12345');
  assert.equal(roundTrip.schoolId, 'sdn-karanggintung-06');
  assert.equal(roundTrip.level, 'level2');
  assert.equal(roundTrip.totalQuestions, 5);

  const rlsErrorMsg = formatSupabaseErrorMessage({
    code: '42501',
    message: 'new row violates row-level security policy for table "aqua_battle_matches"',
  });
  assert.ok(rlsErrorMsg.includes('42501'));
  assert.ok(rlsErrorMsg.includes('aqua_battle_matches'));
});

test('Single Player Hand Tracking locks onto primary player, ignores background students, filters out-of-zone hands, persists across brief frame drops, and debounces single answers', () => {
  // 1. Out-of-zone hand is marked 'outside_zone' (Yellow) and cannot trigger answers
  let tracker = createInitialTrackerState('blue');
  assert.equal(isPointInDetectionZone(0.01, 0.5, BLUE_DETECTION_ZONE), false);
  assert.equal(isPointInDetectionZone(0.25, 0.5, BLUE_DETECTION_ZONE), true);

  const outStep = stepSinglePlayerTracker(
    tracker,
    [{ id: 'edge-hand', x: 0.01, y: 0.5, mass: 30, upperRatio: 0.5 }],
    1000
  );
  assert.equal(outStep.state.zoneState, 'outside_zone');
  assert.equal(outStep.emittedGesture, null);
  assert.equal(outStep.isReadyToAnswer, false);

  // 2. Primary player raises hand inside detection zone -> locks on after 3 stable frames
  let now = 1100;
  for (let f = 0; f < 3; f++) {
    const step = stepSinglePlayerTracker(
      tracker,
      [{ id: 'primary', x: 0.25, y: 0.55, mass: 26, upperRatio: 0.1 }],
      now
    );
    tracker = step.state;
    now += 50;
  }
  assert.equal(tracker.zoneState, 'detected');
  assert.ok(tracker.smoothedX !== null && Math.abs(tracker.smoothedX - 0.25) < 0.01);

  // 3. Another student waves aggressively in the background/other side -> ignored!
  const withBystander = stepSinglePlayerTracker(
    tracker,
    [
      { id: 'bystander-bigger', x: 0.78, y: 0.35, mass: 60, upperRatio: 0.6 },
      { id: 'primary', x: 0.26, y: 0.54, mass: 24, upperRatio: 0.1 },
    ],
    now
  );
  tracker = withBystander.state;
  assert.equal(tracker.activeTeam, 'blue');
  assert.ok(tracker.smoothedX! < 0.30);

  // 4. Primary hand temporarily disappears for a few frames -> preserves lock & never auto-answers
  const lostStep1 = stepSinglePlayerTracker(
    tracker,
    [{ id: 'bystander-only', x: 0.78, y: 0.35, mass: 60, upperRatio: 0.6 }],
    now + 50
  );
  assert.equal(lostStep1.state.missingFrames, 1);
  assert.equal(lostStep1.state.zoneState, 'detected');
  assert.equal(lostStep1.emittedGesture, null);
  assert.ok(lostStep1.state.smoothedX! < 0.30);

  // 5. Primary player performs deliberate upward push -> emits exactly 1 answer gesture, then blocks repeat until neutral reset + cooldown
  const triggerStep = stepSinglePlayerTracker(
    tracker,
    [{ id: 'primary-push', x: 0.26, y: 0.28, mass: 35, upperRatio: 0.45 }],
    now + 100
  );
  assert.ok(triggerStep.emittedGesture !== null);
  assert.equal(triggerStep.emittedGesture?.team, 'blue');
  assert.equal(triggerStep.emittedGesture?.gesture, 'punch_forward');
  assert.equal(triggerStep.state.awaitingNeutralReset, true);

  // Immediate follow-up push 100ms later is blocked by cooldown & awaitingNeutralReset
  const duplicatePush = stepSinglePlayerTracker(
    triggerStep.state,
    [{ id: 'primary-push-2', x: 0.26, y: 0.24, mass: 50, upperRatio: 0.6 }],
    now + 200
  );
  assert.equal(duplicatePush.emittedGesture, null);
  assert.equal(
    duplicatePush.state.cooldownUntil >=
      now + 100 + TRACKER_CONFIG.GESTURE_DEBOUNCE_MS,
    true
  );
});

test('Dual Player Motion Tracking supports independent solo play, simultaneous dual answers, opposite directions, background student rejection, and temporary hand loss without cross-team interference', () => {
  // Scenario 1: Tim Biru playing alone (Left Zone only)
  let dual = createInitialDualTrackerState();
  let t = 2000;
  for (let i = 0; i < 3; i++) {
    const res = stepDualPlayerTracker(
      dual,
      [{ id: 'blue-p1', x: 0.25, y: 0.55, mass: 28, upperRatio: 0.1 }],
      t
    );
    dual = res.state;
    t += 50;
    assert.equal(res.blueResult.isHandDetected, true);
    assert.equal(res.yellowResult.isHandDetected, false);
    assert.equal(res.yellowResult.state.zoneState, 'waiting');
  }

  // Scenario 2: Tim Kuning playing alone (Right Zone only)
  let yellowOnlyDual = createInitialDualTrackerState();
  for (let i = 0; i < 3; i++) {
    const res = stepDualPlayerTracker(
      yellowOnlyDual,
      [{ id: 'yellow-p1', x: 0.75, y: 0.55, mass: 28, upperRatio: 0.1 }],
      t
    );
    yellowOnlyDual = res.state;
    t += 50;
    assert.equal(res.yellowResult.isHandDetected, true);
    assert.equal(res.blueResult.isHandDetected, false);
    assert.equal(res.blueResult.state.zoneState, 'waiting');
  }

  // Lock both players in `dual`
  for (let i = 0; i < 3; i++) {
    const res = stepDualPlayerTracker(
      dual,
      [
        { id: 'blue-p1', x: 0.25, y: 0.55, mass: 28, upperRatio: 0.1 },
        { id: 'yellow-p1', x: 0.75, y: 0.55, mass: 28, upperRatio: 0.1 },
      ],
      t
    );
    dual = res.state;
    t += 50;
  }
  assert.equal(dual.blue.zoneState, 'detected');
  assert.equal(dual.yellow.zoneState, 'detected');

  // Scenario 4: Both players move in opposite horizontal directions simultaneously (Blue left, Yellow right)
  const oppositeStep = stepDualPlayerTracker(
    dual,
    [
      { id: 'blue-left', x: 0.08, y: 0.55, mass: 28, upperRatio: 0.1 },
      { id: 'yellow-right', x: 0.92, y: 0.55, mass: 28, upperRatio: 0.1 },
    ],
    t
  );
  dual = oppositeStep.state;
  assert.equal(oppositeStep.blueResult.emittedGesture?.team, 'blue');
  assert.equal(oppositeStep.blueResult.emittedGesture?.gesture, 'slash_side');
  assert.equal(oppositeStep.blueResult.emittedGesture?.direction, 'left');
  assert.equal(oppositeStep.yellowResult.emittedGesture?.team, 'yellow');
  assert.equal(oppositeStep.yellowResult.emittedGesture?.gesture, 'slash_side');
  assert.equal(oppositeStep.yellowResult.emittedGesture?.direction, 'right');

  // Advance time past slash_side short cooldown and stabilize with Scenario 5 (background students behind both players)
  t += 450;
  const withBystanders = stepDualPlayerTracker(
    dual,
    [
      { id: 'blue-p1', x: 0.16, y: 0.55, mass: 26, upperRatio: 0.1 },
      { id: 'blue-bystander', x: 0.44, y: 0.72, mass: 55, upperRatio: 0.5 }, // Far from locked Blue hand (~0.14)
      { id: 'yellow-p1', x: 0.84, y: 0.55, mass: 26, upperRatio: 0.1 },
      { id: 'yellow-bystander', x: 0.55, y: 0.72, mass: 55, upperRatio: 0.5 }, // Far from locked Yellow hand (~0.86)
    ],
    t
  );
  dual = withBystanders.state;
  assert.ok(dual.blue.smoothedX! < 0.22); // Bystander at 0.44 ignored!
  assert.ok(dual.yellow.smoothedX! > 0.78); // Bystander at 0.55 ignored!

  // Scenario 6: Blue temporarily loses detection for 1 frame while Yellow stays active -> Blue lock preserved, no false gesture
  t += 50;
  const blueDropStep = stepDualPlayerTracker(
    dual,
    [{ id: 'yellow-p1', x: 0.84, y: 0.55, mass: 26, upperRatio: 0.1 }],
    t
  );
  dual = blueDropStep.state;
  assert.equal(blueDropStep.blueResult.state.missingFrames, 1);
  assert.equal(blueDropStep.blueResult.isHandDetected, true);
  assert.equal(blueDropStep.blueResult.emittedGesture, null);
  assert.equal(blueDropStep.yellowResult.isHandDetected, true);

  // Scenario 3: Both teams answer simultaneously with upward push -> Both emit punch_forward for their own team ONLY
  t += 50;
  const simultaneousAnswerStep = stepDualPlayerTracker(
    dual,
    [
      { id: 'blue-push', x: 0.16, y: 0.28, mass: 48, upperRatio: 0.5 },
      { id: 'yellow-push', x: 0.84, y: 0.28, mass: 48, upperRatio: 0.5 },
    ],
    t
  );
  assert.equal(simultaneousAnswerStep.blueResult.emittedGesture?.team, 'blue');
  assert.equal(
    simultaneousAnswerStep.blueResult.emittedGesture?.gesture,
    'punch_forward'
  );
  assert.equal(
    simultaneousAnswerStep.yellowResult.emittedGesture?.team,
    'yellow'
  );
  assert.equal(
    simultaneousAnswerStep.yellowResult.emittedGesture?.gesture,
    'punch_forward'
  );
  assert.equal(
    isPointInDetectionZone(0.84, 0.28, YELLOW_DETECTION_ZONE),
    true
  );
});




