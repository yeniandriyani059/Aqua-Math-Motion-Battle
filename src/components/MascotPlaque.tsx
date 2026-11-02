import React from 'react';
import { Users } from 'lucide-react';
import { TeamBattleState } from '../game/types';

export const BlueMascotSvg: React.FC<{ className?: string }> = ({ className = 'w-16 h-16' }) => (
  <svg viewBox="0 0 120 120" className={className} aria-hidden="true">
    <defs>
      <radialGradient id="blueDropBody" cx="38%" cy="35%" r="65%">
        <stop offset="0%" stopColor="#7dd3fc" />
        <stop offset="55%" stopColor="#0ea5e9" />
        <stop offset="100%" stopColor="#0369a1" />
      </radialGradient>
    </defs>
    <path
      d="M60 8 C60 8 104 56 104 82 C104 105 84 114 60 114 C36 114 16 105 16 82 C16 56 60 8 60 8 Z"
      fill="#ffffff"
      stroke="#0284c7"
      strokeWidth="4"
    />
    <path
      d="M20 76 Q8 66 14 56"
      fill="none"
      stroke="#0284c7"
      strokeWidth="8"
      strokeLinecap="round"
    />
    <path
      d="M100 76 Q112 66 106 56"
      fill="none"
      stroke="#0284c7"
      strokeWidth="8"
      strokeLinecap="round"
    />
    <path
      d="M60 14 C60 14 98 58 98 81 C98 101 81 109 60 109 C39 109 22 101 22 81 C22 58 60 14 60 14 Z"
      fill="url(#blueDropBody)"
      stroke="#075985"
      strokeWidth="3.5"
    />
    <ellipse cx="44" cy="46" rx="7" ry="13" transform="rotate(-24 44 46)" fill="#e0f2fe" opacity="0.85" />
    <path
      d="M32 52 Q60 60 88 52 L91 60 Q60 68 29 60 Z"
      fill="#1e3a8a"
      stroke="#ffffff"
      strokeWidth="2"
    />
    <circle cx="60" cy="57" r="4.5" fill="#38bdf8" stroke="#ffffff" strokeWidth="1.5" />
    <ellipse cx="45" cy="73" rx="5.5" ry="6.5" fill="#0f172a" />
    <circle cx="43" cy="70.5" r="2.2" fill="#ffffff" />
    <ellipse cx="75" cy="73" rx="5.5" ry="6.5" fill="#0f172a" />
    <circle cx="73" cy="70.5" r="2.2" fill="#ffffff" />
    <ellipse cx="36" cy="81" rx="5" ry="3" fill="#f472b6" opacity="0.75" />
    <ellipse cx="84" cy="81" rx="5" ry="3" fill="#f472b6" opacity="0.75" />
    <path d="M51 80 Q60 91 69 80 Z" fill="#991b1b" stroke="#0f172a" strokeWidth="2" />
    <path d="M55 84 Q60 88 65 84 Z" fill="#fb7185" />
  </svg>
);

export const YellowMascotSvg: React.FC<{ className?: string }> = ({ className = 'w-16 h-16' }) => (
  <svg viewBox="0 0 120 120" className={className} aria-hidden="true">
    <defs>
      <radialGradient id="yellowDropBody" cx="38%" cy="35%" r="65%">
        <stop offset="0%" stopColor="#fef08a" />
        <stop offset="55%" stopColor="#facc15" />
        <stop offset="100%" stopColor="#d97706" />
      </radialGradient>
    </defs>
    <path
      d="M60 8 C60 8 104 56 104 82 C104 105 84 114 60 114 C36 114 16 105 16 82 C16 56 60 8 60 8 Z"
      fill="#ffffff"
      stroke="#b45309"
      strokeWidth="4"
    />
    <path
      d="M20 76 Q8 64 15 54"
      fill="none"
      stroke="#d97706"
      strokeWidth="8"
      strokeLinecap="round"
    />
    <path
      d="M100 76 Q112 64 105 54"
      fill="none"
      stroke="#d97706"
      strokeWidth="8"
      strokeLinecap="round"
    />
    <path
      d="M60 14 C60 14 98 58 98 81 C98 101 81 109 60 109 C39 109 22 101 22 81 C22 58 60 14 60 14 Z"
      fill="url(#yellowDropBody)"
      stroke="#92400e"
      strokeWidth="3.5"
    />
    <ellipse cx="44" cy="46" rx="7" ry="13" transform="rotate(-24 44 46)" fill="#fef9c3" opacity="0.9" />
    <path
      d="M32 52 Q60 60 88 52 L91 60 Q60 68 29 60 Z"
      fill="#dc2626"
      stroke="#ffffff"
      strokeWidth="2"
    />
    <rect x="52" y="54" width="16" height="6" rx="3" fill="#ffffff" />
    <ellipse cx="45" cy="73" rx="5.5" ry="6.5" fill="#0f172a" />
    <circle cx="43" cy="70.5" r="2.2" fill="#ffffff" />
    <ellipse cx="75" cy="73" rx="5.5" ry="6.5" fill="#0f172a" />
    <circle cx="73" cy="70.5" r="2.2" fill="#ffffff" />
    <ellipse cx="36" cy="81" rx="5" ry="3" fill="#f97316" opacity="0.75" />
    <ellipse cx="84" cy="81" rx="5" ry="3" fill="#f97316" opacity="0.75" />
    <path d="M51 80 Q60 91 69 80 Z" fill="#991b1b" stroke="#0f172a" strokeWidth="2" />
    <path d="M55 84 Q60 88 65 84 Z" fill="#fb7185" />
  </svg>
);

interface TeamScorePlaqueProps {
  teamState: TeamBattleState;
  playersPerTeam: 1 | 2 | 3;
  isScoringRecently: boolean;
}

export const TeamScorePlaque: React.FC<TeamScorePlaqueProps> = ({
  teamState,
  playersPerTeam,
  isScoringRecently,
}) => {
  const isBlue = teamState.team === 'blue';

  return (
    <div className="flex flex-col gap-1.5">
      <div
        data-testid={`score-plaque-${teamState.team}`}
        className={`relative flex items-center gap-2 sm:gap-3 rounded-3xl border-4 px-3 py-2 sm:px-4 sm:py-2.5 shadow-xl transition-transform duration-200 ${
          isScoringRecently ? 'scale-105 ring-4 ring-yellow-300' : ''
        } ${
          isBlue
            ? 'border-sky-200 bg-gradient-to-b from-sky-400 via-blue-600 to-blue-800 text-white'
            : 'flex-row-reverse border-amber-200 bg-gradient-to-b from-yellow-300 via-amber-500 to-orange-600 text-white'
        }`}
      >
        {/* Mascot Avatar */}
        <div className="shrink-0 -my-2 drop-shadow-md">
          {isBlue ? (
            <BlueMascotSvg className="h-14 w-14 sm:h-16 sm:w-16" />
          ) : (
            <YellowMascotSvg className="h-14 w-14 sm:h-16 sm:w-16" />
          )}
        </div>

        {/* Team Name, Player Count & Score Readout */}
        <div className={`flex flex-col ${isBlue ? 'items-start' : 'items-end'}`}>
          <div className="flex items-center gap-2">
            <span
              className={`font-display text-lg sm:text-2xl font-bold tracking-wide text-white drop-shadow ${
                isBlue ? 'text-stroke-blue' : 'text-stroke-yellow'
              }`}
            >
              {teamState.name}
            </span>
          </div>

          <div
            className={`mt-0.5 flex items-center gap-1.5 rounded-2xl border-2 px-3 py-0.5 shadow-inner ${
              isBlue
                ? 'border-sky-300 bg-blue-950/85'
                : 'border-yellow-200 bg-amber-950/85'
            }`}
          >
            <span className="font-display text-sm sm:text-base font-bold text-white/95">
              Skor:
            </span>
            <span
              data-testid={`score-value-${teamState.team}`}
              className="font-display tabular-nums text-xl sm:text-2xl font-extrabold text-yellow-300 drop-shadow"
            >
              {Math.round(teamState.score)}
            </span>
          </div>

          <span className="mt-1 flex items-center gap-1 text-[11px] font-bold text-white/90">
            <Users className="h-3 w-3" /> {playersPerTeam} Pemain Aktif
          </span>
        </div>
      </div>

      {/* Indikator Tim yang Sedang Mendapatkan Poin */}
      {isScoringRecently && (
        <div
          data-testid={`point-indicator-${teamState.team}`}
          className={`flex items-center justify-center rounded-2xl border-2 border-yellow-200 bg-gradient-to-r from-yellow-300 via-amber-400 to-orange-400 px-3 py-1 font-display text-xs sm:text-sm font-extrabold text-slate-950 shadow-lg ${
            isBlue ? 'self-start' : 'self-end'
          }`}
        >
          ★ {teamState.name} +{teamState.lastPointsAwarded} POIN!
        </div>
      )}
    </div>
  );
};

interface CenterWaterTimerProps {
  secondsLeft: number;
  totalSeconds: number;
}

export const CenterWaterTimer: React.FC<CenterWaterTimerProps> = ({
  secondsLeft,
  totalSeconds,
}) => {
  const safeSeconds = Math.max(0, Math.round(secondsLeft));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(
    seconds
  ).padStart(2, '0')}`;

  const pct = Math.max(
    0,
    Math.min(1, safeSeconds / Math.max(1, totalSeconds))
  );
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - pct);
  const isUrgent = safeSeconds <= 10;

  return (
    <div
      data-testid="round-timer"
      data-seconds={safeSeconds}
      aria-label={`Sisa waktu permainan ${minutes} menit ${seconds} detik`}
      className={`relative mx-auto flex h-24 w-24 sm:h-28 sm:w-28 flex-col items-center justify-center rounded-full border-4 shadow-2xl transition-transform duration-300 ${
        isUrgent
          ? 'scale-105 border-amber-200 bg-gradient-to-b from-rose-500 via-red-600 to-rose-900'
          : 'border-cyan-200 bg-gradient-to-b from-cyan-400 via-sky-600 to-blue-950'
      }`}
    >
      {/* Outer Aqua Gauge Progress Ring */}
      <svg
        viewBox="0 0 100 100"
        className="pointer-events-none absolute inset-0 h-full w-full -rotate-90"
        aria-hidden="true"
      >
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="rgba(8, 47, 73, 0.88)"
          stroke="rgba(186, 230, 253, 0.3)"
          strokeWidth="7"
        />
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke={isUrgent ? '#fde047' : '#38bdf8'}
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
        />
      </svg>

      {/* Symmetrical Top Valve Knob & Side Compass Ticks */}
      <div className="pointer-events-none absolute -top-2.5 h-4 w-4 rounded-full border-2 border-blue-950 bg-amber-400 shadow" />
      <div className="pointer-events-none absolute -left-1.5 h-2.5 w-1.5 rounded bg-cyan-200" />
      <div className="pointer-events-none absolute -right-1.5 h-2.5 w-1.5 rounded bg-cyan-200" />
      <div className="pointer-events-none absolute -bottom-1.5 h-1.5 w-2.5 rounded bg-cyan-200" />

      {/* Inner High-Contrast Readout (Minutes : Seconds) */}
      <div className="relative z-10 flex flex-col items-center justify-center leading-none">
        <span className="text-[9px] sm:text-[10px] font-extrabold uppercase tracking-widest text-cyan-200">
          WAKTU
        </span>
        <span
          data-testid="round-timer-mmss"
          className="mt-0.5 font-display tabular-nums text-2xl sm:text-3xl font-extrabold tracking-tight text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]"
        >
          {formattedTime}
        </span>
        <span className="mt-0.5 text-[9px] font-bold text-sky-200/90 tabular-nums">
          {safeSeconds} dtk
        </span>
      </div>
    </div>
  );
};
