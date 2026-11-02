import React from 'react';
import { CheckCircle2, Lock, XCircle } from 'lucide-react';
import { AnswerBubble, BattleMode, TeamAnswerStatus } from '../game/types';

interface AnswerBubbleNodeProps {
  bubble: AnswerBubble;
  battleMode: BattleMode;
  teamHasAnswered: boolean;
  teamAnswerStatus: TeamAnswerStatus;
  isSelectedByTeam: boolean;
  isSelectedByGesture: boolean;
  onSelectTouchBubble: (bubble: AnswerBubble) => void;
}

/**
 * Answer Bubble Node for Dual Mode (Touch Battle & Motion Battle):
 * - In TOUCH BATTLE (`battleMode === 'touch'`):
 *   Acts as a large touch button (`Tombol A`, `Tombol B`, `Tombol C`).
 *   Locks in the team's choice on touch and disables until simultaneous validation.
 * - In MOTION BATTLE (`battleMode === 'motion'`):
 *   Does NOT select answers via direct screen touch (`pointer-events-none`) so accidental touches
 *   never trigger an answer. Highlights the active gesture target (`isSelectedByGesture`) controlled
 *   by the team's left/right hand motion and pops when triggered by forward punch / super combo gesture.
 */
export const AnswerBubbleNode: React.FC<AnswerBubbleNodeProps> = ({
  bubble,
  battleMode,
  teamHasAnswered,
  isSelectedByTeam,
  isSelectedByGesture,
  onSelectTouchBubble,
}) => {
  const isBlue = bubble.team === 'blue';
  const isTouchMode = battleMode === 'touch';
  const isPoppingCorrect = bubble.status === 'popping_correct';
  const isPoppingWrong = bubble.status === 'popping_wrong';
  const isLocked = bubble.status === 'selected_locked' || isSelectedByTeam;
  const hasUnit = bubble.formattedValue.includes('liter');

  return (
    <div
      style={{
        left: `${bubble.x}%`,
        top: `${bubble.y}%`,
        transform: `translate(-50%, -50%) scale(${
          isPoppingCorrect
            ? 1.12
            : isPoppingWrong
            ? 0.94
            : isLocked
            ? 1.06
            : !isTouchMode && isSelectedByGesture
            ? 1.07
            : 1
        })`,
      }}
      className={`${
        isTouchMode ? 'pointer-events-auto' : 'pointer-events-none'
      } absolute z-20 select-none transition-all duration-150`}
    >
      {/* Spiky Water / Sunburst Splash Ring when validated or popped */}
      {(isPoppingCorrect || isPoppingWrong) && (
        <svg
          viewBox="0 0 200 200"
          className="pointer-events-none absolute -inset-8 h-[calc(100%+4rem)] w-[calc(100%+4rem)] animate-ping"
          aria-hidden="true"
        >
          <polygon
            points="100,6 118,46 158,18 144,62 192,64 156,96 194,132 146,136 164,182 120,154 100,194 80,154 36,182 54,136 6,132 44,96 8,64 56,62 42,18 82,46"
            fill={
              isPoppingWrong
                ? 'rgba(248, 113, 113, 0.82)'
                : isBlue
                ? 'rgba(56, 189, 248, 0.92)'
                : 'rgba(250, 204, 21, 0.92)'
            }
            stroke="#ffffff"
            strokeWidth="4"
          />
        </svg>
      )}

      {/* Touch Mode: Locked Selection Ring */}
      {isTouchMode && isLocked && (
        <div
          className={`pointer-events-none absolute -inset-3 rounded-full border-4 ${
            isPoppingCorrect
              ? 'border-emerald-300 bg-emerald-400/20'
              : isPoppingWrong
              ? 'border-rose-300 bg-rose-500/20'
              : 'border-white bg-white/15 animate-pulse'
          }`}
        />
      )}

      {/* Motion Mode: Active Gesture Cursor Ring */}
      {!isTouchMode && isSelectedByGesture && bubble.status === 'floating' && (
        <div
          className={`pointer-events-none absolute -inset-3 rounded-full border-4 border-dashed ${
            isBlue ? 'border-cyan-200' : 'border-yellow-200'
          }`}
        />
      )}

      <button
        type="button"
        disabled={!isTouchMode || teamHasAnswered}
        data-testid={`bubble-${bubble.team}-${bubble.value}`}
        data-option={`button-${bubble.team}-${bubble.optionLetter}`}
        data-lane={`bubble-${bubble.team}-lane-${bubble.laneIndex}`}
        data-correct={bubble.isCorrect ? 'true' : 'false'}
        aria-label={`Tim ${isBlue ? 'Biru' : 'Kuning'} Pilihan ${
          bubble.optionLetter
        }: ${bubble.formattedValue}`}
        onClick={(e) => {
          e.stopPropagation();
          if (!isTouchMode) return; // Never select via touch in Motion Mode
          onSelectTouchBubble(bubble);
          e.currentTarget.blur();
        }}
        className={`group relative flex h-36 w-36 sm:h-40 sm:w-40 lg:h-44 lg:w-44 flex-col items-center justify-center rounded-full border-4 px-3 text-center shadow-2xl transition-all duration-150 focus:outline-none focus-visible:ring-4 focus-visible:ring-white ${
          !isTouchMode
            ? 'cursor-default'
            : teamHasAnswered
            ? isLocked
              ? 'cursor-default opacity-100'
              : 'cursor-not-allowed opacity-55 saturate-75'
            : 'cursor-pointer hover:scale-105 active:scale-95'
        } ${
          isPoppingCorrect
            ? 'border-emerald-200 bg-gradient-to-br from-emerald-400 via-teal-500 to-emerald-700 shadow-emerald-950/80'
            : isPoppingWrong
            ? 'border-rose-200 bg-gradient-to-br from-rose-500 via-red-600 to-rose-800 shadow-rose-950/80'
            : isBlue
            ? 'border-sky-100 bg-gradient-to-br from-cyan-400 via-sky-600 to-blue-800 shadow-sky-950/80'
            : 'border-yellow-100 bg-gradient-to-br from-yellow-300 via-amber-500 to-orange-600 shadow-amber-950/80'
        }`}
      >
        {/* Top Badge: Pilihan A / B / C */}
        <span
          className={`pointer-events-none absolute -top-3.5 rounded-full border-2 px-3.5 py-0.5 font-display text-xs sm:text-sm font-extrabold tracking-wide shadow-md whitespace-nowrap ${
            isBlue
              ? 'border-sky-200 bg-blue-950 text-sky-100'
              : 'border-yellow-200 bg-amber-950 text-yellow-100'
          }`}
        >
          {bubble.optionLetter}
        </span>

        {/* Glossy 3D Bubble Specular Reflections */}
        <svg
          viewBox="0 0 120 120"
          className="pointer-events-none absolute inset-0 h-full w-full"
          aria-hidden="true"
        >
          <circle
            cx="60"
            cy="60"
            r="52"
            fill="none"
            stroke="rgba(255,255,255,0.55)"
            strokeWidth="3"
          />
          <path
            d="M 28 46 A 38 38 0 0 1 68 22"
            fill="none"
            stroke="rgba(255,255,255,0.88)"
            strokeWidth="7"
            strokeLinecap="round"
          />
          <circle cx="26" cy="58" r="3.5" fill="rgba(255,255,255,0.85)" />
        </svg>

        {/* Formatted Numeric Value + Optional "liter" Unit Label */}
        <span
          className={`relative z-10 font-display tabular-nums font-extrabold leading-none text-white select-none ${
            hasUnit
              ? 'text-2xl sm:text-3xl lg:text-4xl'
              : 'text-3xl sm:text-4xl lg:text-4xl'
          } ${isBlue ? 'text-stroke-blue' : 'text-stroke-yellow'}`}
        >
          {bubble.formattedValue.replace(' liter', '')}
        </span>
        {hasUnit && (
          <span
            className={`relative z-10 mt-0.5 font-display text-xs sm:text-sm font-extrabold tracking-wide text-white ${
              isBlue ? 'text-stroke-blue' : 'text-stroke-yellow'
            }`}
          >
            liter
          </span>
        )}

        {/* Bottom Status Badge — only shown when active/selected/evaluated */}
        {(isPoppingCorrect ||
          isPoppingWrong ||
          (isTouchMode && isLocked) ||
          (!isTouchMode && isSelectedByGesture)) && (
          <span
            className={`pointer-events-none absolute -bottom-3.5 flex items-center gap-1 rounded-full border-2 px-3 py-0.5 text-[11px] sm:text-xs font-extrabold tracking-tight shadow-md whitespace-nowrap ${
              isPoppingCorrect
                ? 'border-white bg-emerald-400 text-slate-950'
                : isPoppingWrong
                ? 'border-white bg-rose-500 text-white'
                : 'border-white bg-yellow-300 text-slate-950'
            }`}
          >
            {isPoppingCorrect ? (
              <>
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>BENAR</span>
              </>
            ) : isPoppingWrong ? (
              <>
                <XCircle className="h-3.5 w-3.5" />
                <span>SALAH</span>
              </>
            ) : isTouchMode ? (
              <>
                <Lock className="h-3 w-3" />
                <span>TERKUNCI</span>
              </>
            ) : (
              <span>TARGET</span>
            )}
          </span>
        )}
      </button>
    </div>
  );
};
