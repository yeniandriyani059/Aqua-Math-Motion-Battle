import React, { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  Hand,
  CheckCircle2,
  Clock,
  ArrowLeft,
} from 'lucide-react';
import {
  CameraTrackingStatus,
  MotionGestureType,
  TeamId,
} from '../game/types';
import {
  BLUE_DETECTION_ZONE,
  createInitialDualTrackerState,
  DetectionZoneVisualState,
  DualPlayerTrackerState,
  extractHandCandidatesFromGrid,
  stepDualPlayerTracker,
  YELLOW_DETECTION_ZONE,
} from '../game/handTracking';
import { AquaKingdomBackdrop } from './AquaKingdomBackdrop';

/**
 * Cached MediaStream for Motion Mode so the browser never asks for camera permission
 * repeatedly across rounds or restarts when the camera is already active.
 */
let cachedMotionCameraStream: MediaStream | null = null;

export function releaseCachedMotionCameraStream(): void {
  if (cachedMotionCameraStream) {
    cachedMotionCameraStream.getTracks().forEach((track) => track.stop());
    cachedMotionCameraStream = null;
  }
}

function isStreamLive(stream: MediaStream | null): boolean {
  if (!stream) return false;
  return stream
    .getVideoTracks()
    .some((track) => track.readyState === 'live' && track.enabled);
}

interface FullscreenCameraBackgroundProps {
  active: boolean;
  cameraStatus: CameraTrackingStatus;
  onStatusChange: (status: CameraTrackingStatus) => void;
  onBackToModeSelect: () => void;
  onTeamGestureDetected: (
    team: TeamId,
    gesture: MotionGestureType,
    laneIndex?: 0 | 1 | 2,
    direction?: 'left' | 'right'
  ) => void;
  onUpdateActivePlayerPos: (
    team: TeamId,
    pos: { x: number; y: number } | null
  ) => void;
  blueActivePlayerPos: { x: number; y: number } | null;
  yellowActivePlayerPos: { x: number; y: number } | null;
  blueFlash?: boolean;
  yellowFlash?: boolean;
}

interface TeamTrackingUiSnapshot {
  zoneState: DetectionZoneVisualState;
  isHandDetected: boolean;
  isReadyToAnswer: boolean;
  pos: { x: number; y: number } | null;
}

const INITIAL_TEAM_UI: TeamTrackingUiSnapshot = {
  zoneState: 'waiting',
  isHandDetected: false,
  isReadyToAnswer: false,
  pos: null,
};

const GRID_COLS = 16;
const GRID_ROWS = 9;
const FRAME_INTERVAL_MS = 50; // ~20 FPS lightweight analysis for smooth PID & laptop performance

export const FullscreenCameraBackground: React.FC<
  FullscreenCameraBackgroundProps
> = ({
  active,
  cameraStatus,
  onStatusChange,
  onBackToModeSelect,
  onTeamGestureDetected,
  onUpdateActivePlayerPos,
  blueFlash = false,
  yellowFlash = false,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const dualTrackerRef = useRef<DualPlayerTrackerState>(
    createInitialDualTrackerState()
  );

  const [blueUi, setBlueUi] = useState<TeamTrackingUiSnapshot>(INITIAL_TEAM_UI);
  const [yellowUi, setYellowUi] =
    useState<TeamTrackingUiSnapshot>(INITIAL_TEAM_UI);

  const statusCallbackRef = useRef(onStatusChange);
  statusCallbackRef.current = onStatusChange;

  const gestureCallbackRef = useRef(onTeamGestureDetected);
  gestureCallbackRef.current = onTeamGestureDetected;

  const playerPosCallbackRef = useRef(onUpdateActivePlayerPos);
  playerPosCallbackRef.current = onUpdateActivePlayerPos;

  useEffect(() => {
    if (!active) return;

    let rafId: number | null = null;
    let isCancelled = false;
    let prevFrame: Uint8ClampedArray | null = null;
    let lastProcessTime = 0;

    dualTrackerRef.current = createInitialDualTrackerState();

    async function initDualPlayerCamera() {
      try {
        if (
          typeof navigator === 'undefined' ||
          !navigator.mediaDevices ||
          !navigator.mediaDevices.getUserMedia
        ) {
          statusCallbackRef.current('unavailable');
          return;
        }

        // Reuse existing live stream if already granted so permission is never requested repeatedly
        let activeStream = cachedMotionCameraStream;
        if (!isStreamLive(activeStream)) {
          statusCallbackRef.current('initializing');
          activeStream = await navigator.mediaDevices.getUserMedia({
            video: {
              width: { ideal: 640 },
              height: { ideal: 360 },
              frameRate: { ideal: 24, max: 30 },
              facingMode: 'user',
            },
            audio: false,
          });
          cachedMotionCameraStream = activeStream;
        }

        if (isCancelled) {
          return;
        }

        const videoEl = videoRef.current;
        if (videoEl && activeStream) {
          if (videoEl.srcObject !== activeStream) {
            videoEl.srcObject = activeStream;
          }
          await videoEl.play().catch(() => {});
          statusCallbackRef.current('active');
        }

        const gridMass = new Array<number>(GRID_COLS * GRID_ROWS).fill(0);
        const gridSumX = new Array<number>(GRID_COLS * GRID_ROWS).fill(0);
        const gridSumY = new Array<number>(GRID_COLS * GRID_ROWS).fill(0);
        const gridUpperMass = new Array<number>(GRID_COLS * GRID_ROWS).fill(0);

        const processVideoFrame = (timestamp: number) => {
          if (isCancelled) return;

          if (timestamp - lastProcessTime >= FRAME_INTERVAL_MS) {
            lastProcessTime = timestamp;
            const video = videoRef.current;
            const canvas = offscreenCanvasRef.current;

            if (video && canvas && video.readyState >= 2) {
              const ctx = canvas.getContext('2d', { willReadFrequently: true });
              if (ctx) {
                const w = canvas.width;
                const h = canvas.height;

                // Draw mirrored frame so left on PID screen matches student standing on the left (Tim Biru)
                // and right on PID screen matches student standing on the right (Tim Kuning)
                ctx.save();
                ctx.scale(-1, 1);
                ctx.drawImage(video, -w, 0, w, h);
                ctx.restore();

                const frameData = ctx.getImageData(0, 0, w, h).data;
                if (prevFrame && prevFrame.length === frameData.length) {
                  gridMass.fill(0);
                  gridSumX.fill(0);
                  gridSumY.fill(0);
                  gridUpperMass.fill(0);

                  for (let y = 4; y < h - 4; y += 2) {
                    const normY = y / h;
                    const row = Math.min(
                      GRID_ROWS - 1,
                      Math.floor(normY * GRID_ROWS)
                    );
                    for (let x = 4; x < w - 4; x += 2) {
                      const idx = (y * w + x) * 4;
                      const diff =
                        Math.abs(frameData[idx] - prevFrame[idx]) +
                        Math.abs(frameData[idx + 1] - prevFrame[idx + 1]) +
                        Math.abs(frameData[idx + 2] - prevFrame[idx + 2]);

                      if (diff > 85) {
                        const normX = x / w;
                        const col = Math.min(
                          GRID_COLS - 1,
                          Math.floor(normX * GRID_COLS)
                        );
                        const cellIdx = row * GRID_COLS + col;
                        gridMass[cellIdx] += 1;
                        gridSumX[cellIdx] += normX;
                        gridSumY[cellIdx] += normY;
                        if (normY < 0.36) {
                          gridUpperMass[cellIdx] += 1;
                        }
                      }
                    }
                  }

                  const candidates = extractHandCandidatesFromGrid(
                    gridMass,
                    gridSumX,
                    gridSumY,
                    gridUpperMass,
                    GRID_COLS,
                    GRID_ROWS
                  );

                  // Step both Tim Biru (Left) and Tim Kuning (Right) trackers simultaneously & independently
                  const dualStep = stepDualPlayerTracker(
                    dualTrackerRef.current,
                    candidates,
                    performance.now(),
                    BLUE_DETECTION_ZONE,
                    YELLOW_DETECTION_ZONE
                  );

                  dualTrackerRef.current = dualStep.state;

                  // 1. Update Tim Biru UI & emit gesture if triggered (strictly affects 'blue' only)
                  const bRes = dualStep.blueResult;
                  const bPos =
                    bRes.isHandDetected &&
                    bRes.state.smoothedX !== null &&
                    bRes.state.smoothedY !== null
                      ? { x: bRes.state.smoothedX, y: bRes.state.smoothedY }
                      : null;

                  setBlueUi((prev) =>
                    prev.zoneState === bRes.state.zoneState &&
                    prev.isHandDetected === bRes.isHandDetected &&
                    prev.isReadyToAnswer === bRes.isReadyToAnswer &&
                    prev.pos?.x === bPos?.x &&
                    prev.pos?.y === bPos?.y
                      ? prev
                      : {
                          zoneState: bRes.state.zoneState,
                          isHandDetected: bRes.isHandDetected,
                          isReadyToAnswer: bRes.isReadyToAnswer,
                          pos: bPos,
                        }
                  );
                  playerPosCallbackRef.current('blue', bPos);

                  if (bRes.emittedGesture) {
                    gestureCallbackRef.current(
                      'blue',
                      bRes.emittedGesture.gesture,
                      bRes.emittedGesture.laneIndex,
                      bRes.emittedGesture.direction
                    );
                  }

                  // 2. Update Tim Kuning UI & emit gesture if triggered (strictly affects 'yellow' only)
                  const yRes = dualStep.yellowResult;
                  const yPos =
                    yRes.isHandDetected &&
                    yRes.state.smoothedX !== null &&
                    yRes.state.smoothedY !== null
                      ? { x: yRes.state.smoothedX, y: yRes.state.smoothedY }
                      : null;

                  setYellowUi((prev) =>
                    prev.zoneState === yRes.state.zoneState &&
                    prev.isHandDetected === yRes.isHandDetected &&
                    prev.isReadyToAnswer === yRes.isReadyToAnswer &&
                    prev.pos?.x === yPos?.x &&
                    prev.pos?.y === yPos?.y
                      ? prev
                      : {
                          zoneState: yRes.state.zoneState,
                          isHandDetected: yRes.isHandDetected,
                          isReadyToAnswer: yRes.isReadyToAnswer,
                          pos: yPos,
                        }
                  );
                  playerPosCallbackRef.current('yellow', yPos);

                  if (yRes.emittedGesture) {
                    gestureCallbackRef.current(
                      'yellow',
                      yRes.emittedGesture.gesture,
                      yRes.emittedGesture.laneIndex,
                      yRes.emittedGesture.direction
                    );
                  }
                }
                prevFrame = new Uint8ClampedArray(frameData);
              }
            }
          }

          rafId = requestAnimationFrame(processVideoFrame);
        };

        rafId = requestAnimationFrame(processVideoFrame);
      } catch (err) {
        if (!isCancelled) {
          const isDenied =
            err instanceof DOMException &&
            (err.name === 'NotAllowedError' ||
              err.name === 'PermissionDeniedError');
          statusCallbackRef.current(isDenied ? 'denied' : 'unavailable');
        }
      }
    }

    void initDualPlayerCamera();

    return () => {
      isCancelled = true;
      if (rafId !== null) cancelAnimationFrame(rafId);
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, [active]);

  const isCameraLive = cameraStatus === 'active';

  return (
    <div
      data-testid="fullscreen-camera-stage"
      data-camera-status={cameraStatus}
      className="pointer-events-none fixed inset-0 z-0 h-dvh w-dvw overflow-hidden"
    >
      {/* 1. Aqua City Illustrated Underwater Backdrop */}
      <div
        className={`absolute inset-0 transition-opacity duration-500 ${
          isCameraLive ? 'opacity-30' : 'opacity-100'
        }`}
      >
        <AquaKingdomBackdrop
          blueActiveFlash={blueFlash}
          yellowActiveFlash={yellowFlash}
        />
      </div>

      {/* 2. Fullscreen Live Camera Video Feed (Mirrored so Left = Tim Biru, Right = Tim Kuning) */}
      <video
        ref={videoRef}
        data-testid="fullscreen-camera-video"
        playsInline
        muted
        className={`absolute inset-0 h-full w-full object-cover -scale-x-100 transition-opacity duration-300 ${
          isCameraLive ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* Hidden processing canvas (128x72 lightweight resolution) */}
      <canvas
        ref={offscreenCanvasRef}
        width={128}
        height={72}
        className="hidden"
      />

      {/* 3. Measured Contrast Scrim for High Readability over Live Camera */}
      <div
        className="absolute inset-0"
        style={{
          background: isCameraLive
            ? 'linear-gradient(180deg, rgba(8, 47, 73, 0.68) 0%, rgba(12, 74, 110, 0.28) 45%, rgba(8, 47, 73, 0.72) 100%)'
            : 'linear-gradient(180deg, rgba(8, 47, 73, 0.25) 0%, rgba(12, 74, 110, 0.1) 50%, rgba(8, 47, 73, 0.45) 100%)',
        }}
      />

      {/* 4. ZONA KIRI: Area Deteksi Pemain Tim Biru */}
      <div
        data-testid="camera-zone-blue"
        data-zone-state={blueUi.zoneState}
        style={{
          left: `${BLUE_DETECTION_ZONE.minX * 100}%`,
          width: `${(BLUE_DETECTION_ZONE.maxX - BLUE_DETECTION_ZONE.minX) * 100}%`,
          top: `${BLUE_DETECTION_ZONE.minY * 100}%`,
          height: `${(BLUE_DETECTION_ZONE.maxY - BLUE_DETECTION_ZONE.minY) * 100}%`,
        }}
        className={`absolute rounded-3xl border-3 border-dashed transition-colors duration-200 ${
          blueUi.isHandDetected
            ? 'border-emerald-400 bg-emerald-500/10 shadow-[0_0_24px_rgba(16,185,129,0.3)]'
            : 'border-sky-400/75 bg-sky-500/5'
        }`}
      >
        {/* Indikator Sederhana Tim Biru: Menunggu pemain | Tangan terdeteksi | Siap menjawab */}
        <div
          data-testid="detection-indicators-blue"
          className="absolute top-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5 rounded-full border border-sky-300/70 bg-slate-950/90 px-3 py-1 text-[11px] font-extrabold shadow-lg whitespace-nowrap"
        >
          <span className="text-sky-300">Tim Biru:</span>

          <span
            data-testid="blue-ind-waiting"
            data-active={!blueUi.isHandDetected ? 'true' : 'false'}
            className={`flex items-center gap-1 rounded-full px-2 py-0.5 ${
              !blueUi.isHandDetected
                ? 'bg-sky-500/30 text-sky-200 ring-1 ring-sky-300/60'
                : 'text-slate-500'
            }`}
          >
            <Clock className="h-3 w-3" />
            <span>Menunggu pemain</span>
          </span>

          <span
            data-testid="blue-ind-detected"
            data-active={blueUi.isHandDetected ? 'true' : 'false'}
            className={`flex items-center gap-1 rounded-full px-2 py-0.5 ${
              blueUi.isHandDetected
                ? 'bg-emerald-500/25 text-emerald-300 ring-1 ring-emerald-300/60'
                : 'text-slate-500'
            }`}
          >
            <Hand className="h-3 w-3" />
            <span>Tangan terdeteksi</span>
          </span>

          <span
            data-testid="blue-ind-ready"
            data-active={blueUi.isReadyToAnswer ? 'true' : 'false'}
            className={`flex items-center gap-1 rounded-full px-2 py-0.5 ${
              blueUi.isReadyToAnswer
                ? 'bg-emerald-500/25 text-emerald-300 ring-1 ring-emerald-300/60'
                : 'text-slate-500'
            }`}
          >
            <CheckCircle2 className="h-3 w-3" />
            <span>Siap menjawab</span>
          </span>
        </div>
      </div>

      {/* 5. ZONA KANAN: Area Deteksi Pemain Tim Kuning */}
      <div
        data-testid="camera-zone-yellow"
        data-zone-state={yellowUi.zoneState}
        style={{
          left: `${YELLOW_DETECTION_ZONE.minX * 100}%`,
          width: `${(YELLOW_DETECTION_ZONE.maxX - YELLOW_DETECTION_ZONE.minX) * 100}%`,
          top: `${YELLOW_DETECTION_ZONE.minY * 100}%`,
          height: `${(YELLOW_DETECTION_ZONE.maxY - YELLOW_DETECTION_ZONE.minY) * 100}%`,
        }}
        className={`absolute rounded-3xl border-3 border-dashed transition-colors duration-200 ${
          yellowUi.isHandDetected
            ? 'border-emerald-400 bg-emerald-500/10 shadow-[0_0_24px_rgba(16,185,129,0.3)]'
            : 'border-amber-400/75 bg-amber-500/5'
        }`}
      >
        {/* Indikator Sederhana Tim Kuning: Menunggu pemain | Tangan terdeteksi | Siap menjawab */}
        <div
          data-testid="detection-indicators-yellow"
          className="absolute top-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5 rounded-full border border-amber-300/70 bg-slate-950/90 px-3 py-1 text-[11px] font-extrabold shadow-lg whitespace-nowrap"
        >
          <span className="text-yellow-300">Tim Kuning:</span>

          <span
            data-testid="yellow-ind-waiting"
            data-active={!yellowUi.isHandDetected ? 'true' : 'false'}
            className={`flex items-center gap-1 rounded-full px-2 py-0.5 ${
              !yellowUi.isHandDetected
                ? 'bg-amber-500/30 text-yellow-200 ring-1 ring-amber-300/60'
                : 'text-slate-500'
            }`}
          >
            <Clock className="h-3 w-3" />
            <span>Menunggu pemain</span>
          </span>

          <span
            data-testid="yellow-ind-detected"
            data-active={yellowUi.isHandDetected ? 'true' : 'false'}
            className={`flex items-center gap-1 rounded-full px-2 py-0.5 ${
              yellowUi.isHandDetected
                ? 'bg-emerald-500/25 text-emerald-300 ring-1 ring-emerald-300/60'
                : 'text-slate-500'
            }`}
          >
            <Hand className="h-3 w-3" />
            <span>Tangan terdeteksi</span>
          </span>

          <span
            data-testid="yellow-ind-ready"
            data-active={yellowUi.isReadyToAnswer ? 'true' : 'false'}
            className={`flex items-center gap-1 rounded-full px-2 py-0.5 ${
              yellowUi.isReadyToAnswer
                ? 'bg-emerald-500/25 text-emerald-300 ring-1 ring-emerald-300/60'
                : 'text-slate-500'
            }`}
          >
            <CheckCircle2 className="h-3 w-3" />
            <span>Siap menjawab</span>
          </span>
        </div>
      </div>

      {/* 6. Locked Hand Markers for Each Team's Primary Player */}
      {isCameraLive && blueUi.pos && (
        <div
          data-testid="locked-hand-blue"
          style={{
            left: `${Math.min(46, Math.max(4, blueUi.pos.x * 100))}%`,
            top: `${Math.min(78, Math.max(23, blueUi.pos.y * 100))}%`,
          }}
          className="absolute -translate-x-1/2 -translate-y-1/2 flex items-center gap-1 rounded-full border-2 border-sky-200 bg-sky-500/90 px-2.5 py-0.5 text-[11px] font-extrabold text-white shadow-xl"
        >
          <Hand className="h-3 w-3" />
          <span>Tim Biru</span>
        </div>
      )}

      {isCameraLive && yellowUi.pos && (
        <div
          data-testid="locked-hand-yellow"
          style={{
            left: `${Math.min(96, Math.max(54, yellowUi.pos.x * 100))}%`,
            top: `${Math.min(78, Math.max(23, yellowUi.pos.y * 100))}%`,
          }}
          className="absolute -translate-x-1/2 -translate-y-1/2 flex items-center gap-1 rounded-full border-2 border-yellow-200 bg-amber-400/95 px-2.5 py-0.5 text-[11px] font-extrabold text-slate-950 shadow-xl"
        >
          <Hand className="h-3 w-3" />
          <span>Tim Kuning</span>
        </div>
      )}

      {/* 7. Honest Camera Fallback Banner when camera is unavailable or denied */}
      {(cameraStatus === 'unavailable' || cameraStatus === 'denied') && (
        <div
          data-testid="camera-fallback-banner"
          className="pointer-events-auto absolute left-1/2 bottom-32 z-40 -translate-x-1/2 flex items-center gap-2.5 rounded-2xl border-2 border-amber-300 bg-slate-950/95 px-3.5 py-1 text-[11px] font-bold text-amber-200 shadow-2xl whitespace-nowrap"
        >
          <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-400" />
          <span>
            {cameraStatus === 'denied'
              ? 'Izin Kamera Ditolak — Aktifkan izin kamera untuk deteksi tangan.'
              : 'Kamera Tidak Tersedia — Gunakan kontrol gerakan atau kembali ke menu.'}
          </span>
          <button
            type="button"
            data-testid="btn-camera-back-to-mode"
            onClick={onBackToModeSelect}
            className="flex items-center gap-1 rounded-xl border border-yellow-200 bg-amber-400 px-2.5 py-0.5 text-[11px] font-extrabold text-slate-950 shadow hover:bg-amber-300 cursor-pointer"
          >
            <ArrowLeft className="h-3 w-3" />
            <span>Menu Mode</span>
          </button>
        </div>
      )}
    </div>
  );
};
