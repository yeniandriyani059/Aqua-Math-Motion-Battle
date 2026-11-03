import { MotionGestureType, TeamId } from './types';

/**
 * Status deteksi pemain untuk masing-masing tim pada Dual Player Motion Tracking:
 * - 'waiting': Menunggu pemain
 * - 'detected': Tangan terdeteksi
 * - 'outside_zone': Tangan berada di luar zona deteksi tim
 */
export type DetectionZoneVisualState = 'waiting' | 'detected' | 'outside_zone';

export interface DetectionZoneBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

/**
 * Zona deteksi terpisah berdasarkan posisi horizontal kamera (setelah mirror):
 * - Zona Kiri (Tim Biru): x dalam [0.04 .. 0.46]
 * - Zona Kanan (Tim Kuning): x dalam [0.54 .. 0.96]
 * Area tengah [0.46 .. 0.54] adalah buffer pemisah agar tangan kedua tim tidak saling mengganggu.
 */
export const BLUE_DETECTION_ZONE: DetectionZoneBounds = {
  minX: 0.04,
  maxX: 0.46,
  minY: 0.23,
  maxY: 0.78,
};

export const YELLOW_DETECTION_ZONE: DetectionZoneBounds = {
  minX: 0.54,
  maxX: 0.96,
  minY: 0.23,
  maxY: 0.78,
};

export const DEFAULT_DETECTION_ZONE: DetectionZoneBounds = {
  minX: 0.04,
  maxX: 0.96,
  minY: 0.23,
  maxY: 0.78,
};

export interface HandCandidate {
  id: string;
  /** Normalized X coordinate [0..1] in mirrored camera space */
  x: number;
  /** Normalized Y coordinate [0..1] in mirrored camera space */
  y: number;
  /** Motion/cluster area score */
  mass: number;
  /** Ratio of motion in the upper portion of the cluster */
  upperRatio: number;
}

export interface SinglePlayerTrackerState {
  /** Team owned by this tracker ('blue' for left zone, 'yellow' for right zone) */
  team: TeamId;
  /** Currently locked primary player's smoothed X [0..1] */
  smoothedX: number | null;
  /** Currently locked primary player's smoothed Y [0..1] */
  smoothedY: number | null;
  /** Previous smoothed X for velocity calculation */
  prevSmoothedX: number | null;
  /** Previous smoothed Y for velocity calculation */
  prevSmoothedY: number | null;
  /** Anchor X where the current neutral posture stabilized */
  neutralAnchorX: number | null;
  /** Anchor Y where the current neutral posture stabilized */
  neutralAnchorY: number | null;
  /** Number of consecutive frames the primary hand has been temporarily lost */
  missingFrames: number;
  /** Number of consecutive frames the primary hand has been stably tracked */
  lockedFrames: number;
  /** Visual state of the team's detection zone */
  zoneState: DetectionZoneVisualState;
  /** Timestamp (ms) until which gesture emission is on cooldown */
  cooldownUntil: number;
  /** True after an answer gesture is accepted; requires neutral reset before next answer */
  awaitingNeutralReset: boolean;
  /** Currently targeted answer option lane (0 = A, 1 = B, 2 = C) */
  activeLaneIndex: 0 | 1 | 2;
  /** Alias for compatibility */
  activeTeam: TeamId;
}

export interface EmittedTeamGesture {
  team: TeamId;
  gesture: MotionGestureType;
  laneIndex: 0 | 1 | 2;
  direction?: 'left' | 'right';
}

export interface TrackerStepResult {
  state: SinglePlayerTrackerState;
  /** Gesture emitted on this frame for this team (null if none, on cooldown, outside zone, or lost hand) */
  emittedGesture: EmittedTeamGesture | null;
  /** True when hand is stably detected inside this team's zone */
  isHandDetected: boolean;
  /** True when hand is detected, stabilized, and ready to trigger an answer */
  isReadyToAnswer: boolean;
}

export interface DualPlayerTrackerState {
  blue: SinglePlayerTrackerState;
  yellow: SinglePlayerTrackerState;
}

export interface DualTrackerStepResult {
  state: DualPlayerTrackerState;
  blueResult: TrackerStepResult;
  yellowResult: TrackerStepResult;
}

export const TRACKER_CONFIG = {
  /** Exponential Moving Average factor (0..1) to stabilize hand jitter */
  SMOOTHING_ALPHA: 0.38,
  /** Max weighted normalized distance a locked hand can move between frames; ignores other students further away */
  MAX_LOCK_RADIUS: 0.26,
  /** Number of frames to preserve locked player identity when hand is temporarily lost */
  MAX_MISSING_FRAMES: 18,
  /** Minimum frames of stable lock before gestures can trigger answers */
  MIN_LOCKED_FRAMES_FOR_GESTURE: 3,
  /** Minimum deliberate smoothed movement delta required to trigger a gesture (ignores micro-jitter) */
  MIN_GESTURE_DELTA_X: 0.055,
  MIN_GESTURE_DELTA_Y: 0.055,
  /** Minimum cluster mass to count as a real raised hand */
  MIN_HAND_MASS: 12,
  /** Cooldown in ms so one movement only produces one answer */
  GESTURE_DEBOUNCE_MS: 1100,
  /** Movement threshold below which the hand is considered back in neutral position */
  NEUTRAL_RESET_VELOCITY: 0.035,
} as const;

export function createInitialTrackerState(
  team: TeamId = 'blue'
): SinglePlayerTrackerState {
  return {
    team,
    smoothedX: null,
    smoothedY: null,
    prevSmoothedX: null,
    prevSmoothedY: null,
    neutralAnchorX: null,
    neutralAnchorY: null,
    missingFrames: 0,
    lockedFrames: 0,
    zoneState: 'waiting',
    cooldownUntil: 0,
    awaitingNeutralReset: false,
    activeLaneIndex: 1,
    activeTeam: team,
  };
}

export function createInitialDualTrackerState(): DualPlayerTrackerState {
  return {
    blue: createInitialTrackerState('blue'),
    yellow: createInitialTrackerState('yellow'),
  };
}

export function getTeamDetectionZone(team: TeamId): DetectionZoneBounds {
  return team === 'blue' ? BLUE_DETECTION_ZONE : YELLOW_DETECTION_ZONE;
}

/**
 * Checks whether a normalized point (x, y) is inside the given detection zone bounds.
 */
export function isPointInDetectionZone(
  x: number,
  y: number,
  bounds: DetectionZoneBounds = DEFAULT_DETECTION_ZONE
): boolean {
  if (Number.isNaN(x) || Number.isNaN(y)) return false;
  return (
    x >= bounds.minX &&
    x <= bounds.maxX &&
    y >= bounds.minY &&
    y <= bounds.maxY
  );
}

/**
 * Maps a normalized X position inside a team's detection zone to option lane 0 (A), 1 (B), or 2 (C).
 */
export function mapZoneXToLaneIndex(
  normX: number,
  bounds: DetectionZoneBounds
): 0 | 1 | 2 {
  const span = Math.max(0.05, bounds.maxX - bounds.minX);
  const localRatio = Math.max(0, Math.min(0.999, (normX - bounds.minX) / span));
  return Math.floor(localRatio * 3) as 0 | 1 | 2;
}

/**
 * Smooths raw hand coordinates using Exponential Moving Average (EMA)
 * so student hand positions do not jitter on PID/laptop webcams.
 */
export function smoothHandCoordinate(
  prev: number | null,
  raw: number,
  alpha: number = TRACKER_CONFIG.SMOOTHING_ALPHA
): number {
  if (prev === null || Number.isNaN(prev)) return raw;
  const clampedAlpha = Math.max(0.05, Math.min(1, alpha));
  return prev + clampedAlpha * (raw - prev);
}

/**
 * Extracts distinct localized hand candidates from a downsampled motion grid (e.g. 16x9 cells)
 * so multiple students standing in front of the camera are separated into distinct candidates
 * instead of being blended together.
 */
export function extractHandCandidatesFromGrid(
  gridMass: number[],
  gridSumX: number[],
  gridSumY: number[],
  gridUpperMass: number[],
  cols: number,
  rows: number,
  minMass: number = TRACKER_CONFIG.MIN_HAND_MASS
): HandCandidate[] {
  const visited = new Uint8Array(cols * rows);
  const candidates: HandCandidate[] = [];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const idx = r * cols + c;
      if (visited[idx] || gridMass[idx] < 3) continue;

      // Prevent flood-fill from bridging across the center team divider (col 7 | col 8)
      const isLeftHalf = c < cols / 2;

      let clusterMass = 0;
      let clusterSumX = 0;
      let clusterSumY = 0;
      let clusterUpper = 0;
      const queue: number[] = [idx];
      visited[idx] = 1;

      while (queue.length > 0) {
        const curr = queue.pop()!;
        const cr = Math.floor(curr / cols);
        const cc = curr % cols;

        clusterMass += gridMass[curr];
        clusterSumX += gridSumX[curr];
        clusterSumY += gridSumY[curr];
        clusterUpper += gridUpperMass[curr];

        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            if (dr === 0 && dc === 0) continue;
            const nr = cr + dr;
            const nc = cc + dc;
            if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
              const neighborIsLeft = nc < cols / 2;
              if (neighborIsLeft !== isLeftHalf) continue; // Strict left/right team separation!
              const nIdx = nr * cols + nc;
              if (!visited[nIdx] && gridMass[nIdx] >= 3) {
                visited[nIdx] = 1;
                queue.push(nIdx);
              }
            }
          }
        }
      }

      if (clusterMass >= minMass) {
        candidates.push({
          id: `cand-${r}-${c}`,
          x: clusterSumX / clusterMass,
          y: clusterSumY / clusterMass,
          mass: clusterMass,
          upperRatio: clusterUpper / clusterMass,
        });
      }
    }
  }

  return candidates.sort((a, b) => b.mass - a.mass);
}

/**
 * Advances a single team's primary player tracker by one frame within that team's dedicated zone:
 * - Strictly ignores any candidate on the opposing team's side of the screen.
 * - Locks onto the primary player inside the team's zone and ignores background students.
 * - Retains player identity across brief frame drops (MAX_MISSING_FRAMES) without auto-answering.
 * - Applies EMA smoothing, movement thresholds, cooldown debounce, and neutral reset.
 */
export function stepSinglePlayerTracker(
  prevState: SinglePlayerTrackerState,
  candidates: HandCandidate[],
  nowMs: number,
  customBounds?: DetectionZoneBounds
): TrackerStepResult {
  const team = prevState.team;
  const bounds = customBounds ?? getTeamDetectionZone(team);

  // Only consider candidates that belong to this team's horizontal half of the camera
  const teamHalfCandidates = candidates.filter((c) => {
    if (c.mass < TRACKER_CONFIG.MIN_HAND_MASS) return false;
    return team === 'blue' ? c.x < 0.5 : c.x >= 0.5;
  });

  const inZoneCandidates = teamHalfCandidates.filter((c) =>
    isPointInDetectionZone(c.x, c.y, bounds)
  );
  const outOfZoneCandidates = teamHalfCandidates.filter(
    (c) => !isPointInDetectionZone(c.x, c.y, bounds)
  );

  const hasActiveLock =
    prevState.smoothedX !== null &&
    prevState.smoothedY !== null &&
    prevState.missingFrames <= TRACKER_CONFIG.MAX_MISSING_FRAMES;

  let chosenCandidate: HandCandidate | null = null;

  if (hasActiveLock) {
    let bestDist = Infinity;
    for (const cand of inZoneCandidates) {
      const dist = Math.hypot(
        (cand.x - prevState.smoothedX!) * 1.35,
        (cand.y - prevState.smoothedY!) * 0.75
      );
      if (dist <= TRACKER_CONFIG.MAX_LOCK_RADIUS && dist < bestDist) {
        bestDist = dist;
        chosenCandidate = cand;
      }
    }
  } else if (inZoneCandidates.length > 0) {
    chosenCandidate = inZoneCandidates[0];
  }

  // Case A: No matching hand for this team's primary player on this frame
  if (!chosenCandidate) {
    if (hasActiveLock) {
      const nextMissing = prevState.missingFrames + 1;
      if (nextMissing <= TRACKER_CONFIG.MAX_MISSING_FRAMES) {
        return {
          state: {
            ...prevState,
            missingFrames: nextMissing,
            zoneState: 'detected',
          },
          emittedGesture: null,
          isHandDetected: true,
          isReadyToAnswer: false,
        };
      }
    }

    const nextZoneState: DetectionZoneVisualState =
      outOfZoneCandidates.length > 0 ? 'outside_zone' : 'waiting';

    return {
      state: {
        ...createInitialTrackerState(team),
        cooldownUntil: prevState.cooldownUntil,
        activeLaneIndex: prevState.activeLaneIndex,
        zoneState: nextZoneState,
      },
      emittedGesture: null,
      isHandDetected: false,
      isReadyToAnswer: false,
    };
  }

  // Case B: This team's primary player hand is tracked inside the team's detection zone
  const nextX = smoothHandCoordinate(prevState.smoothedX, chosenCandidate.x);
  const nextY = smoothHandCoordinate(prevState.smoothedY, chosenCandidate.y);
  const nextLockedFrames = prevState.lockedFrames + 1;

  const mappedLane = mapZoneXToLaneIndex(nextX, bounds);

  const frameDx =
    prevState.smoothedX !== null ? nextX - prevState.smoothedX : 0;
  const frameDy =
    prevState.smoothedY !== null ? nextY - prevState.smoothedY : 0;
  const frameSpeed = Math.hypot(frameDx, frameDy);

  let awaitingNeutralReset = prevState.awaitingNeutralReset;
  let neutralAnchorX = prevState.neutralAnchorX ?? nextX;
  let neutralAnchorY = prevState.neutralAnchorY ?? nextY;

  if (
    awaitingNeutralReset &&
    nowMs >= prevState.cooldownUntil &&
    frameSpeed <= TRACKER_CONFIG.NEUTRAL_RESET_VELOCITY
  ) {
    awaitingNeutralReset = false;
    neutralAnchorX = nextX;
    neutralAnchorY = nextY;
  }

  const isOnCooldown = nowMs < prevState.cooldownUntil;
  const isReadyToAnswer =
    nextLockedFrames >= TRACKER_CONFIG.MIN_LOCKED_FRAMES_FOR_GESTURE &&
    !isOnCooldown &&
    !awaitingNeutralReset;

  let emittedGesture: EmittedTeamGesture | null = null;
  let nextCooldownUntil = prevState.cooldownUntil;
  let nextLaneIndex = prevState.activeLaneIndex;

  if (isReadyToAnswer) {
    const deltaXFromAnchor = nextX - neutralAnchorX;
    const deltaYFromAnchor = nextY - neutralAnchorY;

    // 1. Deliberate upward / forward push gesture -> Selects / shoots this team's targeted answer bubble
    if (
      deltaYFromAnchor <= -TRACKER_CONFIG.MIN_GESTURE_DELTA_Y ||
      (chosenCandidate.mass >= 46 && chosenCandidate.upperRatio >= 0.42)
    ) {
      emittedGesture = {
        team,
        gesture: 'punch_forward',
        laneIndex: nextLaneIndex,
      };
      nextCooldownUntil = nowMs + TRACKER_CONFIG.GESTURE_DEBOUNCE_MS;
      awaitingNeutralReset = true;
      neutralAnchorX = nextX;
      neutralAnchorY = nextY;
    } else if (
      Math.abs(deltaXFromAnchor) >= TRACKER_CONFIG.MIN_GESTURE_DELTA_X
    ) {
      // 2. Deliberate horizontal movement -> Shifts this team's option selection (A / B / C)
      const direction: 'left' | 'right' =
        deltaXFromAnchor > 0 ? 'right' : 'left';
      nextLaneIndex = mappedLane;
      emittedGesture = {
        team,
        gesture: 'slash_side',
        laneIndex: nextLaneIndex,
        direction,
      };
      nextCooldownUntil = nowMs + 380;
      neutralAnchorX = nextX;
      neutralAnchorY = nextY;
    } else if (frameSpeed < TRACKER_CONFIG.NEUTRAL_RESET_VELOCITY) {
      neutralAnchorX = smoothHandCoordinate(neutralAnchorX, nextX, 0.2);
      neutralAnchorY = smoothHandCoordinate(neutralAnchorY, nextY, 0.2);
    }
  }

  return {
    state: {
      team,
      smoothedX: nextX,
      smoothedY: nextY,
      prevSmoothedX: prevState.smoothedX,
      prevSmoothedY: prevState.smoothedY,
      neutralAnchorX,
      neutralAnchorY,
      missingFrames: 0,
      lockedFrames: nextLockedFrames,
      zoneState: 'detected',
      cooldownUntil: nextCooldownUntil,
      awaitingNeutralReset,
      activeLaneIndex: nextLaneIndex,
      activeTeam: team,
    },
    emittedGesture,
    isHandDetected: true,
    isReadyToAnswer,
  };
}

/**
 * Dual Player Motion Tracker:
 * Processes both Tim Biru (Left Zone) and Tim Kuning (Right Zone) simultaneously and independently.
 * - Tim Biru movements ONLY affect Tim Biru.
 * - Tim Kuning movements ONLY affect Tim Kuning.
 * - Both teams can move in different directions or answer at the exact same time without interference.
 */
export function stepDualPlayerTracker(
  prevDualState: DualPlayerTrackerState,
  candidates: HandCandidate[],
  nowMs: number,
  blueBounds: DetectionZoneBounds = BLUE_DETECTION_ZONE,
  yellowBounds: DetectionZoneBounds = YELLOW_DETECTION_ZONE
): DualTrackerStepResult {
  const blueResult = stepSinglePlayerTracker(
    prevDualState.blue,
    candidates,
    nowMs,
    blueBounds
  );
  const yellowResult = stepSinglePlayerTracker(
    prevDualState.yellow,
    candidates,
    nowMs,
    yellowBounds
  );

  return {
    state: {
      blue: blueResult.state,
      yellow: yellowResult.state,
    },
    blueResult,
    yellowResult,
  };
}
