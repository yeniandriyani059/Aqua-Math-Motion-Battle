import React, { useEffect, useRef } from 'react';
import { Camera, AlertTriangle, UserCheck, ArrowLeft } from 'lucide-react';
import {
  CameraTrackingStatus,
  MotionGestureType,
  TeamId,
} from '../game/types';
import { mapNormalizedXToTeamZone } from '../game/rules';
import { AquaKingdomBackdrop } from './AquaKingdomBackdrop';

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

export const FullscreenCameraBackground: React.FC<
  FullscreenCameraBackgroundProps
> = ({
  active,
  cameraStatus,
  onStatusChange,
  onBackToModeSelect,
  onTeamGestureDetected,
  onUpdateActivePlayerPos,
  blueActivePlayerPos,
  yellowActivePlayerPos,
  blueFlash = false,
  yellowFlash = false,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const statusCallbackRef = useRef(onStatusChange);
  statusCallbackRef.current = onStatusChange;

  const gestureCallbackRef = useRef(onTeamGestureDetected);
  gestureCallbackRef.current = onTeamGestureDetected;

  const playerPosCallbackRef = useRef(onUpdateActivePlayerPos);
  playerPosCallbackRef.current = onUpdateActivePlayerPos;

  useEffect(() => {
    if (!active) return;

    let stream: MediaStream | null = null;
    let rafId: number | null = null;
    let isCancelled = false;
    let prevFrame: Uint8ClampedArray | null = null;

    let lastBlueTrigger = 0;
    let lastYellowTrigger = 0;
    let prevBlueCentroidX: number | null = null;
    let prevYellowCentroidX: number | null = null;

    statusCallbackRef.current('initializing');

    async function initFullscreenCamera() {
      try {
        if (
          typeof navigator === 'undefined' ||
          !navigator.mediaDevices ||
          !navigator.mediaDevices.getUserMedia
        ) {
          statusCallbackRef.current('unavailable');
          return;
        }

        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: 'user',
          },
          audio: false,
        });

        if (isCancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        const videoEl = videoRef.current;
        if (videoEl) {
          videoEl.srcObject = stream;
          await videoEl.play();
          statusCallbackRef.current('active');
        }

        const processVideoFrame = () => {
          if (isCancelled) return;
          const video = videoRef.current;
          const canvas = offscreenCanvasRef.current;

          if (video && canvas && video.readyState >= 2) {
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            if (ctx) {
              const w = canvas.width;
              const h = canvas.height;

              // Draw mirrored frame to match natural PID screen reflection
              ctx.save();
              ctx.scale(-1, 1);
              ctx.drawImage(video, -w, 0, w, h);
              ctx.restore();

              const frameData = ctx.getImageData(0, 0, w, h).data;
              if (prevFrame && prevFrame.length === frameData.length) {
                let blueSumX = 0;
                let blueSumY = 0;
                let blueMotionCount = 0;
                let blueUpperMotion = 0;
                const blueLaneCounts = [0, 0, 0];

                let yellowSumX = 0;
                let yellowSumY = 0;
                let yellowMotionCount = 0;
                let yellowUpperMotion = 0;
                const yellowLaneCounts = [0, 0, 0];

                for (let y = 8; y < h - 8; y += 2) {
                  for (let x = 4; x < w - 4; x += 2) {
                    const idx = (y * w + x) * 4;
                    const diff =
                      Math.abs(frameData[idx] - prevFrame[idx]) +
                      Math.abs(frameData[idx + 1] - prevFrame[idx + 1]) +
                      Math.abs(frameData[idx + 2] - prevFrame[idx + 2]);

                    if (diff > 90) {
                      const normX = x / w;
                      const normY = y / h;
                      const zone = mapNormalizedXToTeamZone(normX);

                      if (zone === 'blue') {
                        blueSumX += normX;
                        blueSumY += normY;
                        blueMotionCount++;
                        if (normY < 0.3) blueUpperMotion++;
                        // Local lane inside Blue's [0..0.47] half
                        const localX = Math.min(0.99, normX / 0.47);
                        const lane = Math.floor(localX * 3) as 0 | 1 | 2;
                        blueLaneCounts[lane]++;
                      } else if (zone === 'yellow') {
                        yellowSumX += normX;
                        yellowSumY += normY;
                        yellowMotionCount++;
                        if (normY < 0.3) yellowUpperMotion++;
                        // Local lane inside Yellow's [0.53..1.0] half
                        const localX = Math.min(
                          0.99,
                          Math.max(0, (normX - 0.53) / 0.47)
                        );
                        const lane = Math.floor(localX * 3) as 0 | 1 | 2;
                        yellowLaneCounts[lane]++;
                      }
                    }
                  }
                }

                const now = performance.now();

                // Process Tim Biru (Left Zone Only)
                if (blueMotionCount > 25) {
                  const cx = blueSumX / blueMotionCount;
                  const cy = blueSumY / blueMotionCount;
                  playerPosCallbackRef.current('blue', { x: cx, y: cy });

                  if (now - lastBlueTrigger > 900) {
                    if (blueUpperMotion > 38) {
                      lastBlueTrigger = now;
                      gestureCallbackRef.current('blue', 'swipe_up');
                    } else if (
                      prevBlueCentroidX !== null &&
                      Math.abs(cx - prevBlueCentroidX) > 0.11
                    ) {
                      lastBlueTrigger = now;
                      const dir = cx > prevBlueCentroidX ? 'right' : 'left';
                      gestureCallbackRef.current(
                        'blue',
                        'slash_side',
                        undefined,
                        dir
                      );
                    } else if (blueMotionCount > 65) {
                      let bestLane: 0 | 1 | 2 = 0;
                      if (blueLaneCounts[1] > blueLaneCounts[bestLane])
                        bestLane = 1;
                      if (blueLaneCounts[2] > blueLaneCounts[bestLane])
                        bestLane = 2;
                      lastBlueTrigger = now;
                      gestureCallbackRef.current(
                        'blue',
                        'punch_forward',
                        bestLane
                      );
                    }
                  }
                  prevBlueCentroidX = cx;
                }

                // Process Tim Kuning (Right Zone Only)
                if (yellowMotionCount > 25) {
                  const cx = yellowSumX / yellowMotionCount;
                  const cy = yellowSumY / yellowMotionCount;
                  playerPosCallbackRef.current('yellow', { x: cx, y: cy });

                  if (now - lastYellowTrigger > 900) {
                    if (yellowUpperMotion > 38) {
                      lastYellowTrigger = now;
                      gestureCallbackRef.current('yellow', 'swipe_up');
                    } else if (
                      prevYellowCentroidX !== null &&
                      Math.abs(cx - prevYellowCentroidX) > 0.11
                    ) {
                      lastYellowTrigger = now;
                      const dir = cx > prevYellowCentroidX ? 'right' : 'left';
                      gestureCallbackRef.current(
                        'yellow',
                        'slash_side',
                        undefined,
                        dir
                      );
                    } else if (yellowMotionCount > 65) {
                      let bestLane: 0 | 1 | 2 = 0;
                      if (yellowLaneCounts[1] > yellowLaneCounts[bestLane])
                        bestLane = 1;
                      if (yellowLaneCounts[2] > yellowLaneCounts[bestLane])
                        bestLane = 2;
                      lastYellowTrigger = now;
                      gestureCallbackRef.current(
                        'yellow',
                        'punch_forward',
                        bestLane
                      );
                    }
                  }
                  prevYellowCentroidX = cx;
                }
              }
              prevFrame = new Uint8ClampedArray(frameData);
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

    initFullscreenCamera();

    return () => {
      isCancelled = true;
      if (rafId !== null) cancelAnimationFrame(rafId);
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
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
      className="pointer-events-none fixed inset-0 z-0 h-screen w-screen overflow-hidden"
    >
      {/* 1. Aqua City Illustrated Underwater Backdrop (visible as atmospheric layer or primary fallback when camera unavailable) */}
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

      {/* 2. Fullscreen Live Camera Video Feed (Primary Background when camera is active) */}
      <video
        ref={videoRef}
        data-testid="fullscreen-camera-video"
        playsInline
        muted
        className={`absolute inset-0 h-full w-full object-cover -scale-x-100 transition-opacity duration-300 ${
          isCameraLive ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* Hidden processing canvas for split-zone gesture detection */}
      <canvas
        ref={offscreenCanvasRef}
        width={160}
        height={90}
        className="hidden"
      />

      {/* 3. Measured Contrast Scrim for High Readability over Live Camera */}
      <div
        className="absolute inset-0"
        style={{
          background: isCameraLive
            ? 'linear-gradient(180deg, rgba(8, 47, 73, 0.68) 0%, rgba(12, 74, 110, 0.32) 45%, rgba(8, 47, 73, 0.72) 100%)'
            : 'linear-gradient(180deg, rgba(8, 47, 73, 0.25) 0%, rgba(12, 74, 110, 0.1) 50%, rgba(8, 47, 73, 0.45) 100%)',
        }}
      />

      {/* 4. Clear Horizontal Split-Zone Boundary & Active Player Indicators */}
      <div className="absolute inset-0 grid grid-cols-2">
        {/* Left Zone: Tim Biru Gesture Area */}
        <div className="relative h-full w-full border-r-2 border-dashed border-sky-300/60">
          {/* Active Player Position Marker inside Left Zone (when camera is live) */}
          {isCameraLive && blueActivePlayerPos && (
            <div
              style={{
                left: `${Math.min(92, Math.max(8, (blueActivePlayerPos.x / 0.47) * 100))}%`,
                top: `${Math.min(85, Math.max(25, blueActivePlayerPos.y * 100))}%`,
              }}
              className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-sky-200 bg-sky-500/50 px-2.5 py-1 text-[10px] font-extrabold text-white shadow-lg"
            >
              ✋ Pemain Aktif Biru
            </div>
          )}
        </div>

        {/* Right Zone: Tim Kuning Gesture Area */}
        <div className="relative h-full w-full border-l-2 border-dashed border-yellow-300/60">
          {isCameraLive && yellowActivePlayerPos && (
            <div
              style={{
                left: `${Math.min(
                  92,
                  Math.max(8, ((yellowActivePlayerPos.x - 0.53) / 0.47) * 100)
                )}%`,
                top: `${Math.min(85, Math.max(25, yellowActivePlayerPos.y * 100))}%`,
              }}
              className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-yellow-200 bg-amber-500/50 px-2.5 py-1 text-[10px] font-extrabold text-slate-950 shadow-lg"
            >
              ✋ Pemain Aktif Kuning
            </div>
          )}
        </div>
      </div>

      {/* 5. Honest Camera Status Banner + Kembali ke Pemilihan Mode Button when camera is unavailable/denied */}
      {(cameraStatus === 'unavailable' || cameraStatus === 'denied') && (
        <div
          data-testid="camera-fallback-banner"
          className="pointer-events-auto absolute left-1/2 top-1.5 z-40 -translate-x-1/2 flex items-center gap-3 rounded-2xl border-2 border-amber-300 bg-slate-950/95 px-4 py-1.5 text-xs font-bold text-amber-200 shadow-2xl whitespace-nowrap"
        >
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" />
          <span>
            {cameraStatus === 'denied'
              ? 'Izin Kamera Ditolak — Deteksi Gesture Kamera Tidak Dapat Berjalan.'
              : 'Kamera Tidak Tersedia — Deteksi Gesture Kamera Tidak Dapat Berjalan.'}
          </span>
          <button
            type="button"
            data-testid="btn-camera-back-to-mode"
            onClick={onBackToModeSelect}
            className="flex items-center gap-1 rounded-xl border border-yellow-200 bg-amber-400 px-3 py-1 text-xs font-extrabold text-slate-950 shadow hover:bg-amber-300 cursor-pointer"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Kembali ke Pemilihan Mode</span>
          </button>
        </div>
      )}

      {cameraStatus === 'active' && (
        <div
          data-testid="camera-active-banner"
          className="absolute left-1/2 top-2 z-30 -translate-x-1/2 flex items-center gap-2 rounded-2xl border-2 border-emerald-300 bg-emerald-950/90 px-4 py-1.5 text-xs font-bold text-emerald-200 shadow-xl whitespace-nowrap"
        >
          <Camera className="h-4 w-4 shrink-0 text-emerald-400" />
          <span>
            MOTION BATTLE · Kamera Fullscreen Aktif — Area Kiri: Tim Biru | Area Kanan: Tim Kuning
          </span>
        </div>
      )}
    </div>
  );
};
