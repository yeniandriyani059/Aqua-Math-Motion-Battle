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
