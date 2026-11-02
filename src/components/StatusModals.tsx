import React, { useEffect, useState } from 'react';
import {
  Trophy,
  RotateCcw,
  Play,
  BookOpen,
  Home,
  Sparkles,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
} from 'lucide-react';
import { MathProblem, RoundHistoryItem, TeamBattleState } from '../game/types';
import { determineWinner, formatChoiceLabel } from '../game/rules';
import { BlueMascotSvg, YellowMascotSvg } from './MascotPlaque';

interface PauseModalProps {
  isOpen: boolean;
  onResume: () => void;
  onRestart: () => void;
  onOpenGuide: () => void;
  onFinishEarly: () => void;
  onBackToTitle: () => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  isOpen,
  onResume,
  onRestart,
  onOpenGuide,
  onFinishEarly,
  onBackToTitle,
}) => {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="pause-modal-title"
      className="pointer-events-auto fixed inset-0 z-40 flex items-center justify-center bg-slate-950/75 p-4"
    >
      <div className="w-full max-w-md rounded-3xl border-4 border-sky-300 bg-gradient-to-b from-sky-800 to-blue-950 p-6 text-center text-white shadow-2xl">
        <div className="mx-auto mb-2 flex justify-center gap-3">
          <BlueMascotSvg className="h-14 w-14" />
          <YellowMascotSvg className="h-14 w-14" />
        </div>

        <h2
          id="pause-modal-title"
          className="font-display text-3xl font-extrabold text-white"
        >
          PERTARUNGAN DIJEDA
        </h2>

        <div className="mt-6 flex flex-col gap-3">
          <button
            type="button"
            onClick={onResume}
            className="flex items-center justify-center gap-2 rounded-2xl border-2 border-yellow-200 bg-gradient-to-r from-yellow-300 to-amber-400 py-3 font-display text-lg font-extrabold text-slate-950 shadow-lg hover:brightness-105 cursor-pointer"
          >
            <Play className="h-5 w-5 fill-slate-950" /> LANJUTKAN PERTARUNGAN
          </button>

          <button
            type="button"
            onClick={onOpenGuide}
            className="flex items-center justify-center gap-2 rounded-2xl border-2 border-sky-300 bg-sky-700 py-2.5 font-display text-base font-bold text-white hover:bg-sky-600 cursor-pointer"
          >
            <BookOpen className="h-5 w-5" /> PANDUAN GERAKAN
          </button>

          <button
            type="button"
            onClick={onRestart}
            className="flex items-center justify-center gap-2 rounded-2xl border-2 border-sky-400/60 bg-blue-900 py-2.5 font-display text-base font-bold text-sky-100 hover:bg-blue-800 cursor-pointer"
          >
            <RotateCcw className="h-5 w-5" /> ULANGI DARI SOAL 1
          </button>

          <button
            type="button"
            data-testid="btn-finish-battle-now"
            onClick={onFinishEarly}
            className="flex items-center justify-center gap-2 rounded-2xl border border-amber-300/60 bg-amber-600/80 py-2.5 font-display text-sm font-bold text-white hover:bg-amber-500 cursor-pointer"
          >
            <Trophy className="h-4 w-4" /> LIHAT HASIL AKHIR SEKARANG
          </button>

          <button
            type="button"
            onClick={onBackToTitle}
            className="flex items-center justify-center gap-2 rounded-2xl border border-white/20 bg-slate-900/70 py-2.5 font-display text-sm font-bold text-slate-200 hover:bg-slate-800 cursor-pointer"
          >
            <Home className="h-4 w-4" /> KEMBALI KE MENU
          </button>
        </div>
      </div>
    </div>
  );
};

interface GameOverModalProps {
  isOpen: boolean;
  blueTeam: TeamBattleState;
  yellowTeam: TeamBattleState;
  totalRounds: number;
  history: RoundHistoryItem[];
  currentProblem?: MathProblem;
  onPlayAgain: () => void;
  onBackToTitle: () => void;
}

/**
 * Halaman Hasil Akhir yang Disederhanakan:
 * 1. Bagian Atas: TIM BIRU MENANG!, TIM KUNING MENANG!, atau PERTANDINGAN SERI!
 * 2. Bagian Tengah: Dua kartu berdampingan (Tim Biru & Tim Kuning) berisi Karakter Aqua, Skor Akhir (paling menonjol), dan Jumlah Jawaban Benar.
 * 3. Pesan Apresiasi singkat satu kalimat: “Hebat! Terus berlatih, bekerja sama, dan berpikir cermat!”
 * 4. Kunci Jawaban Disembunyikan dengan tombol accordion LIHAT KUNCI JAWABAN / Kunci Jawaban (Guru).
 * 5. Tombol Navigasi besar untuk layar PID: MAIN LAGI & KEMBALI KE MENU.
 */
export const GameOverModal: React.FC<GameOverModalProps> = ({
  isOpen,
  blueTeam,
  yellowTeam,
  history,
  currentProblem,
  onPlayAgain,
  onBackToTitle,
}) => {
  const [showAnswerKey, setShowAnswerKey] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      setShowAnswerKey(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const result = determineWinner(blueTeam, yellowTeam);

  // Ensure answer key data is always preserved and available when opened by the teacher
  const answerKeyItems: RoundHistoryItem[] =
    history.length > 0
      ? history
      : currentProblem
      ? [
          {
            roundNumber: currentProblem.roundNumber,
            level: currentProblem.level,
            expressionText: currentProblem.expressionText,
            correctAnswer: currentProblem.correctAnswer,
            unitLabel: currentProblem.unitLabel,
            blueCorrect: false,
            yellowCorrect: false,
          },
        ]
      : [];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="gameover-modal-title"
      className="pointer-events-auto fixed inset-0 z-40 flex items-center justify-center bg-slate-950/85 p-3 sm:p-5 overflow-y-auto"
    >
      <div className="relative my-auto w-full max-w-2xl overflow-hidden rounded-3xl border-4 border-yellow-300 bg-gradient-to-b from-sky-800 via-blue-900 to-slate-950 p-5 sm:p-6 text-center text-white shadow-2xl">
        {/* Subtle Celebration Sparkles */}
        <div
          className="pointer-events-none absolute inset-x-0 top-3 flex justify-between px-8 opacity-75"
          aria-hidden="true"
        >
          <Sparkles className="h-6 w-6 animate-bounce text-yellow-300" />
          <Sparkles className="h-6 w-6 animate-bounce text-amber-300" />
        </div>

        {/* 1. BAGIAN ATAS: Status Pertandingan */}
        <div className="flex flex-col items-center">
          <div className="mb-2 flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-full border-4 border-yellow-200 bg-gradient-to-b from-yellow-300 via-amber-400 to-orange-500 text-slate-950 shadow-xl">
            <Trophy className="h-8 w-8 sm:h-9 sm:w-9" />
          </div>

          <h2
            id="gameover-modal-title"
            data-testid="winner-headline"
            className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-yellow-300 drop-shadow"
          >
            {result.headline}
          </h2>
        </div>

        {/* 2. BAGIAN TENGAH: Dua Kartu Sederhana yang Berdampingan */}
        <div className="mt-4 grid grid-cols-2 gap-3 sm:gap-5">
          {/* Kartu Tim Biru */}
          <div
            data-testid="result-card-blue"
            className={`flex flex-col items-center rounded-2xl border-3 p-4 transition-all ${
              result.winner === 'blue'
                ? 'border-yellow-300 bg-gradient-to-b from-sky-600 to-blue-900 ring-4 ring-yellow-300/60 shadow-xl'
                : 'border-sky-400/70 bg-gradient-to-b from-sky-800/90 to-blue-950/90'
            }`}
          >
            <BlueMascotSvg
              className={`h-16 w-16 sm:h-20 sm:w-20 drop-shadow-md ${
                result.winner === 'blue' ? 'animate-bounce' : ''
              }`}
            />
            <span className="mt-1 font-display text-lg sm:text-xl font-extrabold tracking-wide text-sky-100">
              TIM BIRU
            </span>

            {/* Skor Akhir - Elemen Paling Menonjol */}
            <div className="my-2 w-full rounded-2xl border border-sky-300/40 bg-blue-950/80 py-2.5 px-3">
              <span className="block text-[11px] font-extrabold tracking-widest text-sky-300">
                SKOR AKHIR
              </span>
              <span
                data-testid="final-score-blue"
                className="font-display tabular-nums text-4xl sm:text-5xl font-extrabold text-white drop-shadow"
              >
                {Math.round(blueTeam.score)}
              </span>
            </div>

            {/* Jumlah Jawaban Benar */}
            <div className="flex items-center justify-center gap-1.5 text-sm sm:text-base font-bold text-sky-100">
              <CheckCircle2 className="h-4 w-4 text-emerald-300 shrink-0" />
              <span>Jawaban Benar:</span>
              <span
                data-testid="final-correct-blue"
                className="font-display tabular-nums font-extrabold text-emerald-300"
              >
                {blueTeam.correctCount}
              </span>
            </div>
          </div>

          {/* Kartu Tim Kuning */}
          <div
            data-testid="result-card-yellow"
            className={`flex flex-col items-center rounded-2xl border-3 p-4 transition-all ${
              result.winner === 'yellow'
                ? 'border-yellow-200 bg-gradient-to-b from-amber-500 to-orange-700 ring-4 ring-yellow-300/60 shadow-xl'
                : 'border-amber-400/70 bg-gradient-to-b from-amber-700/90 to-orange-950/90'
            }`}
          >
            <YellowMascotSvg
              className={`h-16 w-16 sm:h-20 sm:w-20 drop-shadow-md ${
                result.winner === 'yellow' ? 'animate-bounce' : ''
              }`}
            />
            <span className="mt-1 font-display text-lg sm:text-xl font-extrabold tracking-wide text-amber-100">
              TIM KUNING
            </span>

            {/* Skor Akhir - Elemen Paling Menonjol */}
            <div className="my-2 w-full rounded-2xl border border-amber-300/40 bg-amber-950/80 py-2.5 px-3">
              <span className="block text-[11px] font-extrabold tracking-widest text-amber-200">
                SKOR AKHIR
              </span>
              <span
                data-testid="final-score-yellow"
                className="font-display tabular-nums text-4xl sm:text-5xl font-extrabold text-yellow-300 drop-shadow"
              >
                {Math.round(yellowTeam.score)}
              </span>
            </div>

            {/* Jumlah Jawaban Benar */}
            <div className="flex items-center justify-center gap-1.5 text-sm sm:text-base font-bold text-amber-100">
              <CheckCircle2 className="h-4 w-4 text-emerald-300 shrink-0" />
              <span>Jawaban Benar:</span>
              <span
                data-testid="final-correct-yellow"
                className="font-display tabular-nums font-extrabold text-emerald-300"
              >
                {yellowTeam.correctCount}
              </span>
            </div>
          </div>
        </div>

        {/* 3. PESAN APRESIASI SINGKAT */}
        <p
          data-testid="appreciation-quote"
          className="mt-4 rounded-2xl border border-sky-300/40 bg-blue-950/75 px-4 py-2.5 font-display text-sm sm:text-base font-extrabold text-yellow-200"
        >
          “Hebat! Terus berlatih, bekerja sama, dan berpikir cermat!”
        </p>

        {/* 4. KUNCI JAWABAN DISEMBUNYIKAN (Accordion Guru) */}
        <div className="mt-3">
          <button
            type="button"
            data-testid="btn-toggle-answer-key"
            aria-expanded={showAnswerKey}
            onClick={() => setShowAnswerKey((prev) => !prev)}
            className="mx-auto flex items-center justify-center gap-2 rounded-xl border border-sky-300/50 bg-slate-900/80 px-4 py-1.5 text-xs sm:text-sm font-bold text-sky-200 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
          >
            <span>LIHAT KUNCI JAWABAN</span>
            <span aria-hidden="true">·</span>
            <span className="text-amber-300">Kunci Jawaban (Guru)</span>
            {showAnswerKey ? (
              <ChevronUp className="h-4 w-4 text-sky-300" />
            ) : (
              <ChevronDown className="h-4 w-4 text-sky-300" />
            )}
          </button>

          {showAnswerKey && (
            <div
              data-testid="answer-key-panel"
              className="mt-2.5 max-h-40 overflow-y-auto rounded-2xl border border-sky-400/40 bg-slate-950/90 p-3 text-left"
            >
              <div className="mb-1.5 flex items-center justify-between text-xs font-extrabold text-amber-300">
                <span>Kunci Jawaban (Guru)</span>
                <span>{answerKeyItems.length} Soal</span>
              </div>
              <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                {answerKeyItems.map((item, idx) => (
                  <div
                    key={`${item.roundNumber}-${idx}`}
                    className="rounded-xl border border-sky-400/20 bg-blue-950/60 px-3 py-1.5 text-xs font-semibold text-sky-100 tabular-nums"
                  >
                    <span className="font-extrabold text-yellow-300">
                      Soal {item.roundNumber}:
                    </span>{' '}
                    {item.expressionText.replace(
                      '?',
                      formatChoiceLabel(item.correctAnswer, item.unitLabel)
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 5. TOMBOL NAVIGASI UTAMA (Besar & Mudah Disentuh di PID) */}
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <button
            type="button"
            data-start="true"
            data-testid="btn-main-lagi"
            onClick={onPlayAgain}
            className="flex items-center justify-center gap-2.5 rounded-2xl border-4 border-yellow-200 bg-gradient-to-b from-yellow-300 via-amber-400 to-orange-500 px-6 py-3.5 font-display text-xl font-extrabold text-slate-950 shadow-xl hover:brightness-105 active:scale-95 transition-transform cursor-pointer whitespace-nowrap"
          >
            <RotateCcw className="h-6 w-6 stroke-[2.5]" /> MAIN LAGI
          </button>

          <button
            type="button"
            data-testid="btn-kembali-ke-menu"
            onClick={onBackToTitle}
            className="flex items-center justify-center gap-2.5 rounded-2xl border-2 border-sky-300 bg-sky-800 px-6 py-3.5 font-display text-xl font-bold text-white shadow-lg hover:bg-sky-700 active:scale-95 transition-all cursor-pointer whitespace-nowrap"
          >
            <Home className="h-6 w-6" /> KEMBALI KE MENU
          </button>
        </div>
      </div>
    </div>
  );
};
