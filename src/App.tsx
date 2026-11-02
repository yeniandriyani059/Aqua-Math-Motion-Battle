/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Volume2,
  VolumeX,
  Pause,
  RotateCcw,
  BookOpen,
  Settings,
  Sparkles,
  Hand,
  Pointer,
  ArrowLeft,
} from 'lucide-react';
import {
  AnswerBubble,
  BattleMode,
  CameraTrackingStatus,
  GameSettings,
  GameState,
  MathProblem,
  MotionGestureType,
  RoundHistoryItem,
  SplashEffect,
  TeamBattleState,
  TeamId,
} from './game/types';
import {
  chargeWaterTank,
  createInitialTeamState,
  createTeamBubbles,
  cycleTeamLaneSelection,
  DEFAULT_GAME_SETTINGS,
  evaluateBubbleHit,
  formatTeamAnswerStatusLabel,
  generateMathProblem,
  isTeamOnCooldown,
  LEVEL_METADATA,
  mapNormalizedXToTeamZone,
  resetTeamForNextRound,
  selectTeamTouchAnswer,
  validateRoundTouchAnswers,
} from './game/rules';
import { soundEngine } from './game/sound';
import { motionHub } from './game/motionAdapter';
import { AquaKingdomBackdrop } from './components/AquaKingdomBackdrop';
import { FullscreenCameraBackground } from './components/FullscreenCameraBackground';
import { CenterWaterTimer, TeamScorePlaque } from './components/MascotPlaque';
import { AnswerBubbleNode } from './components/AnswerBubbleNode';
import { TeamMotionDock } from './components/TeamMotionDock';
import { GestureGuideModal } from './components/GestureGuideModal';
import { SettingsModal } from './components/SettingsModal';
import { GameOverModal, PauseModal } from './components/StatusModals';
import { TitleScreen } from './components/TitleScreen';
import {
  WaterSplashCanvas,
  WaterSplashCanvasHandle,
} from './components/WaterSplashCanvas';

export default function App() {
  const initialAutostart =
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('autostart') === '1';

  const [gameState, setGameState] = useState<GameState>(
    initialAutostart ? 'playing' : 'title'
  );
  const [settings, setSettings] = useState<GameSettings>(DEFAULT_GAME_SETTINGS);
  const [secondsLeft, setSecondsLeft] = useState<number>(
    DEFAULT_GAME_SETTINGS.durationSeconds
  );
  const [cameraStatus, setCameraStatus] =
    useState<CameraTrackingStatus>('initializing');

  const [problem, setProblem] = useState<MathProblem>(() =>
    generateMathProblem(DEFAULT_GAME_SETTINGS.level, 1)
  );
  const [blueTeam, setBlueTeam] = useState<TeamBattleState>(() =>
    createInitialTeamState('blue')
  );
  const [yellowTeam, setYellowTeam] = useState<TeamBattleState>(() =>
    createInitialTeamState('yellow')
  );

  const [blueBubbles, setBlueBubbles] = useState<AnswerBubble[]>(() => {
    const firstProb = generateMathProblem(DEFAULT_GAME_SETTINGS.level, 1);
    return createTeamBubbles('blue', firstProb);
  });
  const [yellowBubbles, setYellowBubbles] = useState<AnswerBubble[]>(() => {
    const firstProb = generateMathProblem(DEFAULT_GAME_SETTINGS.level, 1);
    return createTeamBubbles('yellow', firstProb);
  });

  const [splashPopups, setSplashPopups] = useState<SplashEffect[]>([]);
  const [history, setHistory] = useState<RoundHistoryItem[]>([]);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isGuideOpen, setIsGuideOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isRoundValidated, setIsRoundValidated] = useState<boolean>(false);
  const [statusAnnouncement, setStatusAnnouncement] = useState<string>(
    'Hitung bersama kelompokmu dan pilih jawaban yang benar!'
  );

  const splashCanvasRef = useRef<WaterSplashCanvasHandle | null>(null);
  const gameStateRef = useRef<GameState>(gameState);
  gameStateRef.current = gameState;
  const settingsRef = useRef<GameSettings>(settings);
  settingsRef.current = settings;
  const roundAdvanceTimerRef = useRef<number | null>(null);
  const validationLockedRef = useRef<boolean>(false);

  const blueTeamRef = useRef<TeamBattleState>(blueTeam);
  blueTeamRef.current = blueTeam;
  const yellowTeamRef = useRef<TeamBattleState>(yellowTeam);
  yellowTeamRef.current = yellowTeam;
  const problemRef = useRef<MathProblem>(problem);
  problemRef.current = problem;
  const blueBubblesRef = useRef<AnswerBubble[]>(blueBubbles);
  blueBubblesRef.current = blueBubbles;
  const yellowBubblesRef = useRef<AnswerBubble[]>(yellowBubbles);
  yellowBubblesRef.current = yellowBubbles;

  // Mirror game state & active battle mode to document.body.dataset
  useEffect(() => {
    document.body.dataset.state = gameState;
    document.body.dataset.mode = settings.battleMode;
  }, [gameState, settings.battleMode]);

  const clearPendingRoundTimer = () => {
    if (roundAdvanceTimerRef.current !== null) {
      window.clearTimeout(roundAdvanceTimerRef.current);
      roundAdvanceTimerRef.current = null;
    }
  };

  // Return to Title Screen & stop any active camera/timers
  const handleBackToTitle = useCallback(() => {
    clearPendingRoundTimer();
    validationLockedRef.current = false;
    setIsRoundValidated(false);
    setCameraStatus('initializing');
    setBlueTeam(createInitialTeamState('blue'));
    setYellowTeam(createInitialTeamState('yellow'));
    setSplashPopups([]);
    document.body.dataset.state = 'title';
    setGameState('title');
  }, []);

  // Load next question or finish battle when all questions are completed
  const advanceOrFinishQuestion = useCallback(
    (nextRoundNumber: number, customSettings?: GameSettings) => {
      clearPendingRoundTimer();
      validationLockedRef.current = false;
      setIsRoundValidated(false);
      const activeSettings = customSettings ?? settingsRef.current;

      if (nextRoundNumber > activeSettings.totalQuestions) {
        soundEngine.playVictoryFanfare();
        document.body.dataset.state = 'gameover';
        setGameState('gameover');
        return;
      }

      const nextProb = generateMathProblem(
        activeSettings.level,
        nextRoundNumber
      );
      const nextBlueBubbles = createTeamBubbles('blue', nextProb);
      const nextYellowBubbles = createTeamBubbles('yellow', nextProb);

      setProblem(nextProb);
      setBlueBubbles(nextBlueBubbles);
      setYellowBubbles(nextYellowBubbles);
      setSplashPopups([]);

      setBlueTeam((prev) => resetTeamForNextRound(prev));
      setYellowTeam((prev) => resetTeamForNextRound(prev));

      setStatusAnnouncement(
        activeSettings.battleMode === 'touch'
          ? `Soal ${nextRoundNumber} / ${activeSettings.totalQuestions} (${
              LEVEL_METADATA[activeSettings.level].shortTitle
            }): Sentuh Tombol A, B, atau C pada area timmu!`
          : `Soal ${nextRoundNumber} / ${activeSettings.totalQuestions} (${
              LEVEL_METADATA[activeSettings.level].shortTitle
            }): Gunakan gerakan tangan di area timmu!`
      );
    },
    []
  );

  // Start or restart a full battle session in the chosen mode ('touch' or 'motion')
  const startBattle = useCallback(
    (customSettings?: GameSettings, modeOverride?: BattleMode) => {
      clearPendingRoundTimer();
      validationLockedRef.current = false;
      setIsRoundValidated(false);

      const baseSettings = customSettings ?? settingsRef.current;
      const activeSettings: GameSettings = modeOverride
        ? { ...baseSettings, battleMode: modeOverride }
        : baseSettings;

      if (modeOverride || customSettings) {
        setSettings(activeSettings);
        settingsRef.current = activeSettings;
      }

      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }

      const firstProb = generateMathProblem(activeSettings.level, 1);
      const initialBlue = createInitialTeamState('blue');
      const initialYellow = createInitialTeamState('yellow');
      const initialBlueBubbles = createTeamBubbles('blue', firstProb);
      const initialYellowBubbles = createTeamBubbles('yellow', firstProb);

      setProblem(firstProb);
      setBlueTeam(initialBlue);
      setYellowTeam(initialYellow);
      setBlueBubbles(initialBlueBubbles);
      setYellowBubbles(initialYellowBubbles);
      setSecondsLeft(activeSettings.durationSeconds);
      setSplashPopups([]);
      setHistory([]);
      setCameraStatus('initializing');

      setStatusAnnouncement(
        activeSettings.battleMode === 'touch'
          ? `TOUCH BATTLE Dimulai! Soal 1 / ${activeSettings.totalQuestions}: Sentuh Tombol A, B, atau C!`
          : `MOTION BATTLE Dimulai! Soal 1 / ${activeSettings.totalQuestions}: Gunakan gerakan tangan di area timmu!`
      );
      document.body.dataset.state = 'playing';
      setGameState('playing');
    },
    []
  );

  // ============================================================================
  // MODE 1: TOUCH BATTLE HANDLERS (Two-Phase Lock-in & Simultaneous Validation)
  // ============================================================================
  const executeSimultaneousValidation = useCallback(
    (
      lockedBlue: TeamBattleState,
      lockedYellow: TeamBattleState,
      activeProblem: MathProblem,
      advanceAfterMs: number = 1150,
      finishGameAfter: boolean = false
    ) => {
      if (validationLockedRef.current) return;
      validationLockedRef.current = true;
      setIsRoundValidated(true);

      const now = Date.now();
      const validation = validateRoundTouchAnswers(
        lockedBlue,
        lockedYellow,
        activeProblem,
        now
      );

      setBlueTeam(validation.updatedBlue);
      setYellowTeam(validation.updatedYellow);
      blueTeamRef.current = validation.updatedBlue;
      yellowTeamRef.current = validation.updatedYellow;

      setBlueBubbles((prev) =>
        prev.map((b) =>
          b.id === lockedBlue.selectedBubbleId
            ? {
                ...b,
                status: validation.blueCorrect
                  ? 'popping_correct'
                  : 'popping_wrong',
                popProgress: 0.5,
              }
            : b
        )
      );
      setYellowBubbles((prev) =>
        prev.map((b) =>
          b.id === lockedYellow.selectedBubbleId
            ? {
                ...b,
                status: validation.yellowCorrect
                  ? 'popping_correct'
                  : 'popping_wrong',
                popProgress: 0.5,
              }
            : b
        )
      );

      const anyCorrect = validation.blueCorrect || validation.yellowCorrect;
      soundEngine.playBubblePop(anyCorrect, false);

      const selectedBlueBubble =
        blueBubblesRef.current.find(
          (b) => b.id === lockedBlue.selectedBubbleId
        ) ?? blueBubblesRef.current[1];
      const selectedYellowBubble =
        yellowBubblesRef.current.find(
          (b) => b.id === lockedYellow.selectedBubbleId
        ) ?? yellowBubblesRef.current[1];

      if (selectedBlueBubble && lockedBlue.hasAnsweredRound) {
        splashCanvasRef.current?.spawnSplash(
          'blue',
          selectedBlueBubble.x,
          selectedBlueBubble.y,
          validation.blueCorrect,
          false
        );
      }
      if (selectedYellowBubble && lockedYellow.hasAnsweredRound) {
        splashCanvasRef.current?.spawnSplash(
          'yellow',
          selectedYellowBubble.x,
          selectedYellowBubble.y,
          validation.yellowCorrect,
          false
        );
      }

      const newPopups: SplashEffect[] = [];
      if (selectedBlueBubble && lockedBlue.hasAnsweredRound) {
        newPopups.push({
          id: `pop-blue-${now}`,
          team: 'blue',
          x: selectedBlueBubble.x,
          y: selectedBlueBubble.y,
          value: selectedBlueBubble.value,
          pointsDelta: validation.bluePointsAwarded,
          isCorrect: validation.blueCorrect,
          gesture: 'punch_forward',
          createdAt: now,
        });
      }
      if (selectedYellowBubble && lockedYellow.hasAnsweredRound) {
        newPopups.push({
          id: `pop-yellow-${now}`,
          team: 'yellow',
          x: selectedYellowBubble.x,
          y: selectedYellowBubble.y,
          value: selectedYellowBubble.value,
          pointsDelta: validation.yellowPointsAwarded,
          isCorrect: validation.yellowCorrect,
          gesture: 'punch_forward',
          createdAt: now,
        });
      }
      setSplashPopups(newPopups);

      setHistory((prev) => [
        ...prev.filter(
          (item) => item.roundNumber !== activeProblem.roundNumber
        ),
        {
          roundNumber: activeProblem.roundNumber,
          level: activeProblem.level,
          expressionText: activeProblem.expressionText,
          correctAnswer: activeProblem.correctAnswer,
          unitLabel: activeProblem.unitLabel,
          blueCorrect: validation.blueCorrect,
          yellowCorrect: validation.yellowCorrect,
        },
      ]);

      if (validation.blueCorrect && validation.yellowCorrect) {
        setStatusAnnouncement(
          'Hasil Validasi: Kedua Tim Menjawab Benar! Tim Biru +10 Poin & Tim Kuning +10 Poin!'
        );
      } else if (validation.blueCorrect) {
        setStatusAnnouncement(
          'Hasil Validasi: Tim Biru Jawaban Benar (+10 Poin) · Tim Kuning Jawaban Salah (0 Poin)!'
        );
      } else if (validation.yellowCorrect) {
        setStatusAnnouncement(
          'Hasil Validasi: Tim Kuning Jawaban Benar (+10 Poin) · Tim Biru Jawaban Salah (0 Poin)!'
        );
      } else {
        setStatusAnnouncement(
          'Hasil Validasi: Belum ada tim yang tepat pada soal ini (0 Poin). Ayo semangat di soal berikutnya!'
        );
      }

      if (finishGameAfter) {
        clearPendingRoundTimer();
        roundAdvanceTimerRef.current = window.setTimeout(() => {
          soundEngine.playVictoryFanfare();
          document.body.dataset.state = 'gameover';
          setGameState('gameover');
        }, 650);
        return;
      }

      const nextRound = activeProblem.roundNumber + 1;
      clearPendingRoundTimer();
      roundAdvanceTimerRef.current = window.setTimeout(() => {
        if (gameStateRef.current === 'playing') {
          advanceOrFinishQuestion(nextRound);
        }
      }, advanceAfterMs);
    },
    [advanceOrFinishQuestion]
  );

  const handleTouchSelectBubble = useCallback(
    (bubble: AnswerBubble) => {
      if (gameStateRef.current !== 'playing') return;
      if (settingsRef.current.battleMode !== 'touch') return;
      if (validationLockedRef.current) return;

      const now = Date.now();
      const team = bubble.team;
      const currentTeamState =
        team === 'blue' ? blueTeamRef.current : yellowTeamRef.current;

      const lockResult = selectTeamTouchAnswer(currentTeamState, bubble, now);
      if (!lockResult.accepted) return;

      soundEngine.playWaterCharge();

      const nextBlue =
        team === 'blue' ? lockResult.updatedTeam : blueTeamRef.current;
      const nextYellow =
        team === 'yellow' ? lockResult.updatedTeam : yellowTeamRef.current;

      if (team === 'blue') {
        setBlueTeam(nextBlue);
        blueTeamRef.current = nextBlue;
        setBlueBubbles((prev) =>
          prev.map((b) =>
            b.id === bubble.id ? { ...b, status: 'selected_locked' } : b
          )
        );
      } else {
        setYellowTeam(nextYellow);
        yellowTeamRef.current = nextYellow;
        setYellowBubbles((prev) =>
          prev.map((b) =>
            b.id === bubble.id ? { ...b, status: 'selected_locked' } : b
          )
        );
      }

      if (nextBlue.hasAnsweredRound && nextYellow.hasAnsweredRound) {
        setStatusAnnouncement(
          'Kedua tim sudah menjawab! Memvalidasi jawaban Tim Biru dan Tim Kuning...'
        );
        clearPendingRoundTimer();
        roundAdvanceTimerRef.current = window.setTimeout(() => {
          if (gameStateRef.current === 'playing') {
            executeSimultaneousValidation(
              blueTeamRef.current,
              yellowTeamRef.current,
              problemRef.current,
              1150,
              false
            );
          }
        }, 220);
      } else {
        const answeredTeamName = team === 'blue' ? 'Tim Biru' : 'Tim Kuning';
        const waitingTeamName = team === 'blue' ? 'Tim Kuning' : 'Tim Biru';
        setStatusAnnouncement(
          `${answeredTeamName} sudah menjawab (Tombol ${bubble.optionLetter})! Menunggu ${waitingTeamName} memilih jawaban...`
        );
      }
    },
    [executeSimultaneousValidation]
  );

  // ============================================================================
  // MODE 2: MOTION BATTLE HANDLERS (Camera Gesture & Split-Zone Controls)
  // ============================================================================
  const handleMotionTriggerBubble = useCallback(
    (bubble: AnswerBubble, gesture: MotionGestureType = 'punch_forward') => {
      if (gameStateRef.current !== 'playing') return;
      if (settingsRef.current.battleMode !== 'motion') return;
      if (bubble.status !== 'floating') return;

      const now = Date.now();
      const team = bubble.team;
      const currentTeamState =
        team === 'blue' ? blueTeamRef.current : yellowTeamRef.current;

      if (isTeamOnCooldown(currentTeamState, now)) {
        return;
      }

      const activeProb = problemRef.current;
      const evaluation = evaluateBubbleHit(
        currentTeamState,
        bubble,
        gesture,
        now,
        activeProb.correctAnswer
      );

      if (evaluation.blockedByCooldown) return;

      if (team === 'blue') {
        setBlueTeam(evaluation.updatedTeam);
        blueTeamRef.current = evaluation.updatedTeam;
      } else {
        setYellowTeam(evaluation.updatedTeam);
        yellowTeamRef.current = evaluation.updatedTeam;
      }

      soundEngine.playBubblePop(
        evaluation.isCorrect,
        evaluation.usedSuperCombo
      );
      splashCanvasRef.current?.spawnSplash(
        team,
        bubble.x,
        bubble.y,
        evaluation.isCorrect,
        evaluation.usedSuperCombo
      );

      const popupId = `pop-${now}-${Math.random()}`;
      setSplashPopups((prev) => [
        ...prev.slice(-8),
        {
          id: popupId,
          team,
          x: bubble.x,
          y: bubble.y,
          value: bubble.value,
          pointsDelta: evaluation.pointsAwarded,
          isCorrect: evaluation.isCorrect,
          gesture,
          createdAt: now,
        },
      ]);

      const setTeamBubbles =
        team === 'blue' ? setBlueBubbles : setYellowBubbles;

      if (evaluation.isCorrect) {
        setTeamBubbles((prev) =>
          prev.map((b) =>
            b.id === bubble.id
              ? { ...b, status: 'popping_correct', popProgress: 0.45 }
              : b
          )
        );

        const teamLabel = team === 'blue' ? 'Tim Biru' : 'Tim Kuning';
        const comboText = evaluation.usedSuperCombo
          ? 'SERANGAN BESAR COMBO 2X!'
          : 'Jawaban Benar!';
        setStatusAnnouncement(
          `${teamLabel} memilih ${bubble.formattedValue}! ${comboText} +${evaluation.pointsAwarded} Poin!`
        );

        setHistory((prev) => {
          const existingIdx = prev.findIndex(
            (item) => item.roundNumber === activeProb.roundNumber
          );
          if (existingIdx >= 0) {
            const copy = [...prev];
            copy[existingIdx] = {
              ...copy[existingIdx],
              blueCorrect: copy[existingIdx].blueCorrect || team === 'blue',
              yellowCorrect:
                copy[existingIdx].yellowCorrect || team === 'yellow',
            };
            return copy;
          }
          return [
            ...prev,
            {
              roundNumber: activeProb.roundNumber,
              level: activeProb.level,
              expressionText: activeProb.expressionText,
              correctAnswer: activeProb.correctAnswer,
              unitLabel: activeProb.unitLabel,
              blueCorrect: team === 'blue',
              yellowCorrect: team === 'yellow',
            },
          ];
        });

        const otherTeamAnswered =
          team === 'blue'
            ? yellowTeamRef.current.hasAnsweredRound
            : blueTeamRef.current.hasAnsweredRound;
        const delayMs = otherTeamAnswered ? 350 : 480;
        const nextRound = activeProb.roundNumber + 1;

        clearPendingRoundTimer();
        roundAdvanceTimerRef.current = window.setTimeout(() => {
          if (gameStateRef.current === 'playing') {
            advanceOrFinishQuestion(nextRound);
          }
        }, delayMs);
      } else {
        setTeamBubbles((prev) =>
          prev.map((b) =>
            b.id === bubble.id
              ? { ...b, status: 'popping_wrong', popProgress: 0.4 }
              : b
          )
        );
        const teamLabel = team === 'blue' ? 'Tim Biru' : 'Tim Kuning';
        setStatusAnnouncement(
          `${teamLabel}: Pilihan ${bubble.formattedValue} belum tepat (0 Poin). Ayo teliti lagi!`
        );

        window.setTimeout(() => {
          if (gameStateRef.current === 'playing') {
            setTeamBubbles((prev) =>
              prev.map((b) =>
                b.id === bubble.id
                  ? { ...b, status: 'floating', popProgress: 0 }
                  : b
              )
            );
          }
        }, 550);
      }
    },
    [advanceOrFinishQuestion]
  );

  const handleMoveGestureSelection = useCallback(
    (team: TeamId, direction: 'left' | 'right') => {
      if (gameStateRef.current !== 'playing') return;
      if (settingsRef.current.battleMode !== 'motion') return;
      if (team === 'blue') {
        setBlueTeam((prev) => {
          const next = cycleTeamLaneSelection(prev, direction);
          blueTeamRef.current = next;
          return next;
        });
      } else {
        setYellowTeam((prev) => {
          const next = cycleTeamLaneSelection(prev, direction);
          yellowTeamRef.current = next;
          return next;
        });
      }
    },
    []
  );

  const handleShootGestureBubble = useCallback(
    (team: TeamId, laneOverride?: 0 | 1 | 2) => {
      if (gameStateRef.current !== 'playing') return;
      if (settingsRef.current.battleMode !== 'motion') return;
      const teamState =
        team === 'blue' ? blueTeamRef.current : yellowTeamRef.current;
      const bubbles =
        team === 'blue' ? blueBubblesRef.current : yellowBubblesRef.current;
      const targetLane = laneOverride ?? teamState.selectedLaneIndex;
      const targetBubble = bubbles.find(
        (b) => b.laneIndex === targetLane && b.status === 'floating'
      );
      if (targetBubble) {
        handleMotionTriggerBubble(targetBubble, 'punch_forward');
      }
    },
    [handleMotionTriggerBubble]
  );

  const handleChargeWaterTank = useCallback((team: TeamId) => {
    if (gameStateRef.current !== 'playing') return;
    if (settingsRef.current.battleMode !== 'motion') return;
    soundEngine.playWaterCharge();
    if (team === 'blue') {
      setBlueTeam((prev) => {
        const next = chargeWaterTank(prev, 25);
        blueTeamRef.current = next;
        return next;
      });
      setStatusAnnouncement(
        'Tim Biru mengangkat tangan! Tandon air bertambah +25%!'
      );
    } else {
      setYellowTeam((prev) => {
        const next = chargeWaterTank(prev, 25);
        yellowTeamRef.current = next;
        return next;
      });
      setStatusAnnouncement(
        'Tim Kuning mengangkat tangan! Tandon air bertambah +25%!'
      );
    }
  }, []);

  const handleActivateSuperCombo = useCallback(
    (team: TeamId) => {
      if (gameStateRef.current !== 'playing') return;
      if (settingsRef.current.battleMode !== 'motion') return;
      const teamState =
        team === 'blue' ? blueTeamRef.current : yellowTeamRef.current;
      if (teamState.waterTank < 100 || isTeamOnCooldown(teamState)) return;

      const bubbles =
        team === 'blue' ? blueBubblesRef.current : yellowBubblesRef.current;
      const targetBubble =
        bubbles.find((b) => b.isCorrect && b.status === 'floating') ??
        bubbles[0];
      if (targetBubble) {
        handleMotionTriggerBubble(targetBubble, 'raise_both_hands');
      }
    },
    [handleMotionTriggerBubble]
  );

  const handleCameraTeamGesture = useCallback(
    (
      team: TeamId,
      gesture: MotionGestureType,
      laneIndex?: 0 | 1 | 2,
      direction?: 'left' | 'right'
    ) => {
      if (gameStateRef.current !== 'playing') return;
      if (settingsRef.current.battleMode !== 'motion') return;
      if (gesture === 'swipe_up') {
        handleChargeWaterTank(team);
      } else if (gesture === 'raise_both_hands') {
        handleActivateSuperCombo(team);
      } else if (gesture === 'slash_side' && direction) {
        handleMoveGestureSelection(team, direction);
      } else if (gesture === 'punch_forward') {
        handleShootGestureBubble(team, laneIndex);
      }
    },
    [
      handleChargeWaterTank,
      handleActivateSuperCombo,
      handleMoveGestureSelection,
      handleShootGestureBubble,
    ]
  );

  const handleUpdateActivePlayerPos = useCallback(
    (team: TeamId, pos: { x: number; y: number } | null) => {
      if (settingsRef.current.battleMode !== 'motion') return;
      if (team === 'blue') {
        setBlueTeam((prev) => ({ ...prev, activePlayerPos: pos }));
      } else {
        setYellowTeam((prev) => ({ ...prev, activePlayerPos: pos }));
      }
    },
    []
  );

  // Subscribe to MotionControllerHub ONLY when Motion Mode is active
  useEffect(() => {
    if (gameState !== 'playing' || settings.battleMode !== 'motion') return;

    return motionHub.subscribe((event) => {
      if (typeof event.normalizedScreenX === 'number') {
        const mappedZone = mapNormalizedXToTeamZone(event.normalizedScreenX);
        if (!mappedZone || mappedZone !== event.team) {
          return;
        }
      }
      handleCameraTeamGesture(
        event.team,
        event.gesture,
        event.laneIndex,
        event.direction
      );
    });
  }, [gameState, settings.battleMode, handleCameraTeamGesture]);

  // Overall game countdown timer
  useEffect(() => {
    if (gameState !== 'playing') return;

    const interval = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearPendingRoundTimer();
          if (
            settingsRef.current.battleMode === 'touch' &&
            !validationLockedRef.current &&
            (blueTeamRef.current.hasAnsweredRound ||
              yellowTeamRef.current.hasAnsweredRound)
          ) {
            executeSimultaneousValidation(
              blueTeamRef.current,
              yellowTeamRef.current,
              problemRef.current,
              600,
              true
            );
          } else {
            soundEngine.playVictoryFanfare();
            document.body.dataset.state = 'gameover';
            setGameState('gameover');
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [gameState, executeSimultaneousValidation]);

  if (gameState === 'title') {
    return (
      <>
        <TitleScreen
          settings={settings}
          onUpdateSettings={(next) => {
            setSettings(next);
            settingsRef.current = next;
            setSecondsLeft(next.durationSeconds);
          }}
          onStartGame={(modeOverride) => startBattle(undefined, modeOverride)}
          onOpenGuide={() => setIsGuideOpen(true)}
        />
        <SettingsModal
          isOpen={isSettingsOpen}
          settings={settings}
          onUpdateSettings={(next) => {
            setSettings(next);
            settingsRef.current = next;
            setSecondsLeft(next.durationSeconds);
          }}
          onClose={() => setIsSettingsOpen(false)}
        />
        <GestureGuideModal
          isOpen={isGuideOpen}
          onClose={() => setIsGuideOpen(false)}
        />
      </>
    );
  }

  const now = Date.now();
  const isTouchMode = settings.battleMode === 'touch';
  const isMotionMode = settings.battleMode === 'motion';
  const blueScoredRecently =
    blueTeam.lastPointTimestamp > 0 && now - blueTeam.lastPointTimestamp < 2200;
  const yellowScoredRecently =
    yellowTeam.lastPointTimestamp > 0 &&
    now - yellowTeam.lastPointTimestamp < 2200;
  const blueOnCooldown = isTeamOnCooldown(blueTeam, now);
  const yellowOnCooldown = isTeamOnCooldown(yellowTeam, now);

  return (
    <div
      data-testid={
        isTouchMode ? 'aqua-touch-battle-stage' : 'aqua-motion-battle-stage'
      }
      data-battle-mode={settings.battleMode}
      className="relative h-screen w-screen overflow-hidden select-none bg-sky-950"
    >
      {/* 1. BACKGROUND SYSTEM: Strictly separated by mode!
          - TOUCH BATTLE: Illustrated Aqua City Backdrop ONLY (no camera, no tracking).
          - MOTION BATTLE: Fullscreen Camera Background (unmounts immediately when leaving 'playing').
      */}
      {isMotionMode && gameState === 'playing' ? (
        <FullscreenCameraBackground
          active={true}
          cameraStatus={cameraStatus}
          onStatusChange={setCameraStatus}
          onBackToModeSelect={handleBackToTitle}
          onTeamGestureDetected={handleCameraTeamGesture}
          onUpdateActivePlayerPos={handleUpdateActivePlayerPos}
          blueActivePlayerPos={blueTeam.activePlayerPos}
          yellowActivePlayerPos={yellowTeam.activePlayerPos}
          blueFlash={now - blueTeam.lastGestureTimestamp < 350}
          yellowFlash={now - yellowTeam.lastGestureTimestamp < 350}
        />
      ) : (
        <AquaKingdomBackdrop
          blueActiveFlash={blueScoredRecently}
          yellowActiveFlash={yellowScoredRecently}
        />
      )}

      {/* 2. Isolated 60Hz Pooled Water Particle Canvas */}
      <WaterSplashCanvas ref={splashCanvasRef} />

      {/* 3. Full-Viewport Battle HUD Overlay */}
      <div
        className={`pointer-events-none fixed inset-0 z-20 flex flex-col justify-between p-3 sm:p-5 ${
          isMotionMode ? 'pt-9 sm:pt-10' : ''
        }`}
      >
        {/* TOP ROW: Left = Skor Tim Biru, Center = Soal Matematika Kelas 5 SD, Right = Skor Tim Kuning */}
        <div className="flex items-start justify-between gap-2 sm:gap-4">
          {/* Kiri Atas: Skor Tim Biru */}
          <div className="pointer-events-auto flex flex-col items-start">
            <TeamScorePlaque
              teamState={blueTeam}
              playersPerTeam={settings.playersPerTeam}
              isScoringRecently={blueScoredRecently}
            />
          </div>

          {/* Tengah Atas: Soal Matematika Kelas 5 SD */}
          <div className="flex flex-col items-center max-w-2xl flex-1">
            {/* Compact Utility Controls */}
            <div className="pointer-events-auto mb-2 flex flex-wrap items-center justify-center gap-1.5">
              <span
                data-testid="active-mode-pill"
                className={`flex items-center gap-1.5 rounded-xl border-2 px-3 py-1 text-xs font-extrabold shadow whitespace-nowrap ${
                  isTouchMode
                    ? 'border-cyan-300 bg-cyan-950/90 text-cyan-200'
                    : 'border-yellow-300 bg-amber-950/90 text-yellow-200'
                }`}
              >
                {isTouchMode ? (
                  <>
                    <Pointer className="h-3.5 w-3.5 text-cyan-300" />
                    <span>TOUCH</span>
                  </>
                ) : (
                  <>
                    <Hand className="h-3.5 w-3.5 text-yellow-300" />
                    <span>MOTION</span>
                  </>
                )}
              </span>

              <button
                type="button"
                tabIndex={-1}
                data-testid="btn-change-mode"
                onClick={(e) => {
                  handleBackToTitle();
                  e.currentTarget.blur();
                }}
                className="flex items-center gap-1 rounded-xl border-2 border-sky-300/80 bg-slate-950/90 px-2.5 py-1 text-xs font-bold text-sky-100 shadow hover:bg-slate-800 whitespace-nowrap cursor-pointer"
              >
                <ArrowLeft className="h-3.5 w-3.5 text-yellow-300" />
                <span>Menu</span>
              </button>

              <button
                type="button"
                tabIndex={-1}
                onClick={(e) => {
                  setIsSettingsOpen(true);
                  e.currentTarget.blur();
                }}
                aria-label="Pengaturan Level dan Durasi"
                className="flex items-center gap-1 rounded-xl border-2 border-sky-300/80 bg-slate-950/90 px-2.5 py-1 text-xs font-bold text-sky-100 shadow hover:bg-slate-800 whitespace-nowrap cursor-pointer"
              >
                <Settings className="h-3.5 w-3.5 text-sky-300" />
                <span>{LEVEL_METADATA[settings.level].shortTitle}</span>
              </button>

              <button
                type="button"
                tabIndex={-1}
                onClick={(e) => {
                  setIsGuideOpen(true);
                  e.currentTarget.blur();
                }}
                aria-label="Panduan Bermain"
                className="flex items-center gap-1 rounded-xl border-2 border-sky-300/80 bg-slate-950/90 px-2.5 py-1 text-xs font-bold text-sky-100 shadow hover:bg-slate-800 whitespace-nowrap cursor-pointer"
              >
                <BookOpen className="h-3.5 w-3.5 text-amber-300" />
                <span>Panduan</span>
              </button>

              <button
                type="button"
                tabIndex={-1}
                onClick={(e) => {
                  const nextMute = !isMuted;
                  setIsMuted(nextMute);
                  soundEngine.muted = nextMute;
                  e.currentTarget.blur();
                }}
                aria-label={isMuted ? 'Nyalakan Suara' : 'Matikan Suara'}
                className="flex h-7 w-7 items-center justify-center rounded-xl border-2 border-sky-300/80 bg-slate-950/90 text-sky-100 shadow hover:bg-slate-800 cursor-pointer"
              >
                {isMuted ? (
                  <VolumeX className="h-3.5 w-3.5 text-rose-300" />
                ) : (
                  <Volume2 className="h-3.5 w-3.5 text-sky-300" />
                )}
              </button>

              <button
                type="button"
                tabIndex={-1}
                data-testid="btn-pause-game"
                onClick={(e) => {
                  setGameState('paused');
                  e.currentTarget.blur();
                }}
                aria-label="Jeda Permainan"
                className="flex h-7 w-7 items-center justify-center rounded-xl border-2 border-sky-300/80 bg-slate-950/90 text-sky-100 shadow hover:bg-slate-800 cursor-pointer"
              >
                <Pause className="h-3.5 w-3.5 text-amber-300" />
              </button>

              <button
                type="button"
                tabIndex={-1}
                onClick={(e) => {
                  startBattle();
                  e.currentTarget.blur();
                }}
                aria-label="Ulangi Pertarungan"
                className="flex h-7 w-7 items-center justify-center rounded-xl border-2 border-sky-300/80 bg-slate-950/90 text-sky-100 shadow hover:bg-slate-800 cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5 text-emerald-300" />
              </button>
            </div>

            {/* High-Contrast Question Plaque */}
            <div
              data-testid="math-question-box"
              className="pointer-events-auto relative flex w-full flex-col items-center justify-center rounded-3xl border-4 border-sky-400 bg-white/95 px-5 py-2.5 sm:py-3.5 text-center shadow-2xl ring-4 ring-blue-900/90"
            >
              <div className="flex flex-wrap items-center justify-center gap-2 text-[11px] sm:text-xs font-extrabold tracking-wider text-sky-800">
                <span data-testid="round-indicator">
                  SOAL {problem.roundNumber} / {settings.totalQuestions}
                </span>
                <span aria-hidden="true">·</span>
                <span>KELAS 5 SD</span>
                <span aria-hidden="true">·</span>
                <span className="text-blue-700">{problem.contextCategory}</span>
              </div>

              {problem.storyText ? (
                <div className="mt-1 flex flex-col items-center">
                  <p
                    data-testid="math-story-text"
                    className="max-w-xl text-sm sm:text-base lg:text-lg font-bold leading-snug text-slate-900"
                  >
                    {problem.storyText}
                  </p>
                  <p
                    data-testid="math-expression"
                    className="mt-1 font-display text-base sm:text-xl lg:text-2xl font-extrabold text-blue-950"
                  >
                    {problem.questionPrompt}
                  </p>
                </div>
              ) : (
                <h1
                  data-testid="math-expression"
                  className="mt-0.5 font-display tabular-nums text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-blue-950 drop-shadow-sm"
                >
                  {problem.expressionText}
                </h1>
              )}
            </div>
          </div>

          {/* Kanan Atas: Skor Tim Kuning */}
          <div className="pointer-events-auto flex flex-col items-end">
            <TeamScorePlaque
              teamState={yellowTeam}
              playersPerTeam={settings.playersPerTeam}
              isScoringRecently={yellowScoredRecently}
            />
          </div>
        </div>

        {/* BOTTOM PERIMETER DOCK: Symmetrical [Tim Biru Left Panel] — [Center Timer] — [Tim Kuning Right Panel] */}
        <div className="grid w-full grid-cols-1 items-center gap-2.5 md:grid-cols-[1fr_auto_1fr] md:gap-4">
          {/* Sisi Kiri: Panel Bawah Tim Biru */}
          <TeamMotionDock
            battleMode={settings.battleMode}
            teamState={blueTeam}
            teamBubbles={blueBubbles}
            isTeamOnCooldown={blueOnCooldown}
            onSelectTouchBubble={handleTouchSelectBubble}
            onMoveGestureSelection={(dir) =>
              handleMoveGestureSelection('blue', dir)
            }
            onShootGestureBubble={() => handleShootGestureBubble('blue')}
            onChargeWaterTank={() => handleChargeWaterTank('blue')}
            onActivateSuperCombo={() => handleActivateSuperCombo('blue')}
          />

          {/* Tengah: Timer Bersama di Antara Tim Biru dan Tim Kuning */}
          <div className="order-first flex justify-center md:order-none">
            <CenterWaterTimer
              secondsLeft={secondsLeft}
              totalSeconds={settings.durationSeconds}
            />
          </div>

          {/* Sisi Kanan: Panel Bawah Tim Kuning */}
          <TeamMotionDock
            battleMode={settings.battleMode}
            teamState={yellowTeam}
            teamBubbles={yellowBubbles}
            isTeamOnCooldown={yellowOnCooldown}
            onSelectTouchBubble={handleTouchSelectBubble}
            onMoveGestureSelection={(dir) =>
              handleMoveGestureSelection('yellow', dir)
            }
            onShootGestureBubble={() => handleShootGestureBubble('yellow')}
            onChargeWaterTank={() => handleChargeWaterTank('yellow')}
            onActivateSuperCombo={() => handleActivateSuperCombo('yellow')}
          />
        </div>
      </div>

      {/* 4. SPLIT DUAL-TEAM BATTLE ARENA (Area Kiri: Tim Biru | Area Kanan: Tim Kuning) */}
      <div className="relative z-10 grid h-full w-full grid-cols-2">
        {/* AREA KIRI: TIM BIRU */}
        <section
          aria-label="Area Permainan Tim Biru"
          data-testid="arena-blue"
          className="relative h-full w-full"
        >
          {blueBubbles.map((bubble) => (
            <AnswerBubbleNode
              key={bubble.id}
              bubble={bubble}
              battleMode={settings.battleMode}
              teamHasAnswered={blueTeam.hasAnsweredRound || isRoundValidated}
              teamAnswerStatus={blueTeam.answerStatus}
              isSelectedByTeam={blueTeam.selectedBubbleId === bubble.id}
              isSelectedByGesture={
                blueTeam.selectedLaneIndex === bubble.laneIndex
              }
              onSelectTouchBubble={handleTouchSelectBubble}
            />
          ))}

          {splashPopups
            .filter((p) => p.team === 'blue')
            .map((p) => (
              <div
                key={p.id}
                style={{ left: `${p.x}%`, top: `${p.y}%` }}
                className="animate-score-pop pointer-events-none absolute z-30 -translate-x-1/2 -translate-y-1/2 font-display text-2xl sm:text-3xl font-extrabold"
              >
                {p.isCorrect ? (
                  <span className="text-yellow-300 text-stroke-blue">
                    +{p.pointsDelta} Poin! 💦
                  </span>
                ) : (
                  <span className="text-rose-200 text-stroke-navy text-lg">
                    Jawaban Salah (0 Poin)
                  </span>
                )}
              </div>
            ))}
        </section>

        {/* AREA KANAN: TIM KUNING */}
        <section
          aria-label="Area Permainan Tim Kuning"
          data-testid="arena-yellow"
          className="relative h-full w-full"
        >
          {yellowBubbles.map((bubble) => (
            <AnswerBubbleNode
              key={bubble.id}
              bubble={bubble}
              battleMode={settings.battleMode}
              teamHasAnswered={yellowTeam.hasAnsweredRound || isRoundValidated}
              teamAnswerStatus={yellowTeam.answerStatus}
              isSelectedByTeam={yellowTeam.selectedBubbleId === bubble.id}
              isSelectedByGesture={
                yellowTeam.selectedLaneIndex === bubble.laneIndex
              }
              onSelectTouchBubble={handleTouchSelectBubble}
            />
          ))}

          {splashPopups
            .filter((p) => p.team === 'yellow')
            .map((p) => (
              <div
                key={p.id}
                style={{ left: `${p.x}%`, top: `${p.y}%` }}
                className="animate-score-pop pointer-events-none absolute z-30 -translate-x-1/2 -translate-y-1/2 font-display text-2xl sm:text-3xl font-extrabold"
              >
                {p.isCorrect ? (
                  <span className="text-yellow-200 text-stroke-yellow">
                    +{p.pointsDelta} Poin! ⭐
                  </span>
                ) : (
                  <span className="text-rose-200 text-stroke-navy text-lg">
                    Jawaban Salah (0 Poin)
                  </span>
                )}
              </div>
            ))}
        </section>
      </div>

      {/* 5. Modals */}
      <PauseModal
        isOpen={gameState === 'paused'}
        onResume={() => setGameState('playing')}
        onRestart={() => startBattle()}
        onOpenGuide={() => setIsGuideOpen(true)}
        onFinishEarly={() => {
          clearPendingRoundTimer();
          soundEngine.playVictoryFanfare();
          document.body.dataset.state = 'gameover';
          setGameState('gameover');
        }}
        onBackToTitle={handleBackToTitle}
      />

      <GameOverModal
        isOpen={gameState === 'gameover'}
        blueTeam={blueTeam}
        yellowTeam={yellowTeam}
        totalRounds={settings.totalQuestions}
        history={history}
        currentProblem={problem}
        onPlayAgain={() => startBattle()}
        onBackToTitle={handleBackToTitle}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        settings={settings}
        onUpdateSettings={(next) => {
          setSettings(next);
          settingsRef.current = next;
          startBattle(next);
        }}
        onClose={() => setIsSettingsOpen(false)}
      />

      <GestureGuideModal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
      />
    </div>
  );
}
