import React from 'react';
import {
  ArrowLeftRight,
  ArrowUp,
  CheckCircle2,
  Clock,
  Droplets,
  Hand,
  Lock,
  XCircle,
} from 'lucide-react';
import { AnswerBubble, BattleMode, TeamBattleState } from '../game/types';
import { BlueMascotSvg, YellowMascotSvg } from './MascotPlaque';

interface TeamMotionDockProps {
  battleMode: BattleMode;
  teamState: TeamBattleState;
  teamBubbles: AnswerBubble[];
  isTeamOnCooldown: boolean;
  onSelectTouchBubble: (bubble: AnswerBubble) => void;
  onMoveGestureSelection: (direction: 'left' | 'right') => void;
  onShootGestureBubble: () => void;
  onChargeWaterTank: () => void;
  onActivateSuperCombo: () => void;
}

/**
 * Indikator status jawaban singkat:
 * - BELUM MENJAWAB
 * - SUDAH MENJAWAB (saat terkunci menunggu tim lawan di Touch Mode)
 * - BENAR (Hijau)
 * - SALAH (Merah)
 */
function getShortStatusLabel(
  status: TeamBattleState['answerStatus'],
  battleMode: BattleMode
): string {
  switch (status) {
    case 'waiting':
      return 'BELUM MENJAWAB';
    case 'answered':
      return battleMode === 'touch' ? 'SUDAH MENJAWAB' : 'BELUM MENJAWAB';
    case 'correct':
      return 'BENAR';
    case 'wrong':
      return 'SALAH';
  }
}

function getStatusBadgeClasses(status: TeamBattleState['answerStatus']): string {
  switch (status) {
    case 'waiting':
      return 'border-white/25 bg-slate-900/85 text-slate-200';
    case 'answered':
      return 'border-amber-200 bg-amber-400 text-slate-950';
    case 'correct':
      return 'border-emerald-200 bg-emerald-500 text-slate-950';
    case 'wrong':
      return 'border-rose-200 bg-rose-600 text-white';
  }
}

function renderStatusIcon(status: TeamBattleState['answerStatus']) {
  switch (status) {
    case 'waiting':
      return <Clock className="h-3.5 w-3.5 shrink-0 opacity-80" />;
    case 'answered':
      return <Lock className="h-3.5 w-3.5 shrink-0" />;
    case 'correct':
      return <CheckCircle2 className="h-4 w-4 shrink-0" />;
    case 'wrong':
      return <XCircle className="h-4 w-4 shrink-0" />;
  }
}

/**
 * Satu indikator kecil untuk gerakan yang sedang aktif pada Motion Mode:
 * - Geser
 * - Dorong
 * - Angkat tangan
 */
function getActiveGestureInfo(lastGesture: TeamBattleState['lastGesture']) {
  switch (lastGesture) {
    case 'slash_side':
      return {
        label: 'Geser',
        icon: <ArrowLeftRight className="h-3.5 w-3.5 shrink-0" />,
      };
    case 'swipe_up':
    case 'raise_both_hands':
      return {
        label: 'Angkat tangan',
        icon: <ArrowUp className="h-3.5 w-3.5 shrink-0" />,
      };
    case 'punch_forward':
    default:
      return {
        label: 'Dorong',
        icon: <Hand className="h-3.5 w-3.5 shrink-0" />,
      };
  }
}

export const TeamMotionDock: React.FC<TeamMotionDockProps> = ({
  battleMode,
  teamState,
  onShootGestureBubble,
}) => {
  const isBlue = teamState.team === 'blue';
  const shortStatus = getShortStatusLabel(teamState.answerStatus, battleMode);
  const statusClasses = getStatusBadgeClasses(teamState.answerStatus);

  // MODE 1: TOUCH MODE — Panel bawah sangat ringkas (tanpa panel gesture, tanpa indikator kamera, tanpa tombol berulang)
  if (battleMode === 'touch') {
    return (
      <div
        data-testid={`touch-dock-${teamState.team}`}
        className={`pointer-events-auto flex items-center justify-between gap-2.5 rounded-2xl border-2 px-3.5 py-2 shadow-xl ${
          isBlue
            ? 'border-sky-300/85 bg-gradient-to-r from-sky-900/90 to-blue-950/90 text-white'
            : 'border-yellow-300/85 bg-gradient-to-r from-amber-800/90 to-orange-950/90 text-white'
        }`}
      >
        {/* Ikon & Label Tim */}
        <div className="flex items-center gap-2 min-w-0">
          {isBlue ? (
            <BlueMascotSvg className="h-7 w-7 shrink-0" />
          ) : (
            <YellowMascotSvg className="h-7 w-7 shrink-0" />
          )}
          <span
            className={`font-display text-sm sm:text-base font-extrabold tracking-wide whitespace-nowrap ${
              isBlue ? 'text-sky-100' : 'text-yellow-200'
            }`}
          >
            {isBlue ? 'TIM BIRU' : 'TIM KUNING'}
          </span>
        </div>

        {/* Status Jawaban Singkat */}
        <div
          data-testid={`status-indicator-${teamState.team}`}
          data-status={teamState.answerStatus}
          className={`flex items-center gap-1.5 rounded-xl border-2 px-3 py-1 font-display text-xs sm:text-sm font-extrabold tracking-wide shadow whitespace-nowrap transition-colors ${statusClasses}`}
        >
          {renderStatusIcon(teamState.answerStatus)}
          <span>{shortStatus}</span>
        </div>
      </div>
    );
  }

  // MODE 2: MOTION MODE — Menampilkan Ikon/Label Tim, Progress Tandon Air, Satu Indikator Gesture Aktif, dan Status Jawaban Singkat
  const activeGesture = getActiveGestureInfo(teamState.lastGesture);
  const tankPercent = Math.min(100, Math.round(teamState.waterTank));

  return (
    <div
      data-testid={`motion-dock-${teamState.team}`}
      className={`pointer-events-auto flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 sm:gap-3 rounded-2xl border-2 px-3.5 py-2 shadow-xl ${
        isBlue
          ? 'border-sky-300/85 bg-gradient-to-r from-sky-900/92 to-blue-950/92 text-white'
          : 'border-yellow-300/85 bg-gradient-to-r from-amber-800/92 to-orange-950/92 text-white'
      }`}
    >
      {/* 1. Ikon & Label Tim */}
      <div className="flex items-center gap-2 shrink-0">
        {isBlue ? (
          <BlueMascotSvg className="h-7 w-7 shrink-0" />
        ) : (
          <YellowMascotSvg className="h-7 w-7 shrink-0" />
        )}
        <span
          className={`font-display text-sm sm:text-base font-extrabold tracking-wide whitespace-nowrap ${
            isBlue ? 'text-sky-100' : 'text-yellow-200'
          }`}
        >
          {isBlue ? 'TIM BIRU' : 'TIM KUNING'}
        </span>
      </div>

      {/* 2. Progress Tandon Air Sederhana */}
      <div className="flex flex-1 items-center gap-2 min-w-[110px]">
        <Droplets
          className={`h-4 w-4 shrink-0 ${
            isBlue ? 'text-sky-300' : 'text-yellow-300'
          }`}
        />
        <div className="relative h-3.5 flex-1 overflow-hidden rounded-full border border-white/30 bg-slate-950/90 p-0.5">
          <div
            className={`h-full rounded-full transition-all duration-200 ${
              isBlue
                ? 'bg-gradient-to-r from-sky-400 to-cyan-300'
                : 'bg-gradient-to-r from-amber-400 to-yellow-300'
            }`}
            style={{ width: `${tankPercent}%` }}
          />
        </div>
        <span
          data-testid={`water-tank-${teamState.team}`}
          className="font-display tabular-nums text-xs sm:text-sm font-extrabold text-white whitespace-nowrap"
        >
          {tankPercent}%
        </span>
      </div>

      {/* 3. Satu Indikator Kecil untuk Gerakan yang Sedang Aktif */}
      <button
        type="button"
        data-testid={`active-gesture-${teamState.team}`}
        onClick={(e) => {
          onShootGestureBubble();
          e.currentTarget.blur();
        }}
        title="Indikator Gerakan Aktif"
        className={`flex items-center gap-1.5 rounded-xl border px-2.5 py-1 text-xs font-extrabold whitespace-nowrap transition-transform active:scale-95 cursor-pointer ${
          isBlue
            ? 'border-sky-300/70 bg-sky-800/80 text-sky-100 hover:bg-sky-700/80'
            : 'border-yellow-300/70 bg-amber-700/80 text-yellow-100 hover:bg-amber-600/80'
        }`}
      >
        {activeGesture.icon}
        <span>{activeGesture.label}</span>
      </button>

      {/* 4. Status Jawaban Singkat (BELUM MENJAWAB / BENAR / SALAH) */}
      <div
        data-testid={`status-indicator-${teamState.team}`}
        data-status={teamState.answerStatus}
        className={`flex items-center gap-1.5 rounded-xl border-2 px-3 py-1 font-display text-xs sm:text-sm font-extrabold tracking-wide shadow whitespace-nowrap transition-colors ${statusClasses}`}
      >
        {renderStatusIcon(teamState.answerStatus)}
        <span>{shortStatus}</span>
      </div>
    </div>
  );
};
