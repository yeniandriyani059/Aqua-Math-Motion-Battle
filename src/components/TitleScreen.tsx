import React from 'react';
import { Play, BookOpen, Pointer, Hand, Maximize2, Minimize2 } from 'lucide-react';
import { BattleMode, DifficultyLevel, GameSettings } from '../game/types';
import { BlueMascotSvg, YellowMascotSvg } from './MascotPlaque';
import { AquaKingdomBackdrop } from './AquaKingdomBackdrop';

interface TitleScreenProps {
  settings: GameSettings;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  onUpdateSettings: (next: GameSettings) => void;
  onStartGame: (modeOverride?: BattleMode) => void;
  onOpenGuide: () => void;
}

const SIMPLE_LEVEL_OPTIONS: Array<{
  id: DifficultyLevel;
  label: string;
  caption: string;
}> = [
  {
    id: 'level1',
    label: 'MUDAH',
    caption: 'Penjumlahan & Pengurangan',
  },
  {
    id: 'level2',
    label: 'SEDANG',
    caption: 'Operasi & Soal Cerita',
  },
  {
    id: 'level3',
    label: 'KOMPLEKS',
    caption: 'Tantangan Aqua City',
  },
];

/**
 * Halaman Awal Aqua Math Battle — Dioptimalkan untuk Mode Full Screen PID (Interactive Flat Panel)
 * Minimalis, Ceria, dan Ramah Siswa Kelas 5 SD.
 */
export const TitleScreen: React.FC<TitleScreenProps> = ({
  settings,
  isFullscreen,
  onToggleFullscreen,
  onUpdateSettings,
  onStartGame,
  onOpenGuide,
}) => {
  const isTouchSelected = settings.battleMode === 'touch';
  const isMotionSelected = settings.battleMode === 'motion';

  return (
    <main className="relative flex h-dvh w-dvw flex-col items-center justify-center overflow-hidden px-3 py-2 sm:px-5 sm:py-3 select-none">
      {/* Illustrated Aqua City Backdrop */}
      <AquaKingdomBackdrop />

      {/* Main PID Stage Container — utilizes full landscape width without excess margins */}
      <div className="relative z-10 flex h-full w-full max-w-[96vw] xl:max-w-7xl flex-col items-center justify-center gap-3 sm:gap-4 lg:gap-5">
        {/* 1. JUDUL UTAMA: AQUA MATH BATTLE & Subjudul “Hitung • Bergerak • Menang!” */}
        <header className="flex flex-col items-center text-center shrink-0">
          <svg
            viewBox="0 0 640 165"
            className="h-24 sm:h-28 lg:h-32 xl:h-36 w-auto drop-shadow-2xl"
            role="img"
            aria-label="Aqua Math Battle — Hitung • Bergerak • Menang!"
          >
            <defs>
              <linearGradient id="splashBacking" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0284c7" />
                <stop offset="100%" stopColor="#1e3a8a" />
              </linearGradient>
              <linearGradient id="aquaTitleGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="45%" stopColor="#7dd3fc" />
                <stop offset="100%" stopColor="#38bdf8" />
              </linearGradient>
              <linearGradient id="battleTitleGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#fef08a" />
                <stop offset="55%" stopColor="#facc15" />
                <stop offset="100%" stopColor="#f97316" />
              </linearGradient>
            </defs>

            <path
              d="M55 24 Q320 4 585 24 Q620 82 585 142 Q320 162 55 142 Q20 82 55 24 Z"
              fill="url(#splashBacking)"
              stroke="#7dd3fc"
              strokeWidth="6"
            />

            <text
              x="320"
              y="82"
              textAnchor="middle"
              fontFamily="Fredoka, Plus Jakarta Sans, sans-serif"
              fontWeight="800"
              fontSize="54"
              fill="url(#aquaTitleGrad)"
              stroke="#082f49"
              strokeWidth="11"
              paintOrder="stroke fill"
            >
              AQUA MATH{' '}
              <tspan fill="url(#battleTitleGrad)" stroke="#451a03">
                BATTLE
              </tspan>
            </text>

            <text
              x="320"
              y="124"
              textAnchor="middle"
              fontFamily="Fredoka, Plus Jakarta Sans, sans-serif"
              fontWeight="700"
              fontSize="24"
              fill="#fef08a"
            >
              Hitung • Bergerak • Menang!
            </text>
          </svg>
        </header>

        {/* 2. MIDDLE STAGE: Karakter Tim Biru (Kiri) + Panel Pengaturan (Tengah) + Karakter Tim Kuning (Kanan) */}
        <div className="flex w-full items-center justify-between gap-4 lg:gap-8">
          {/* Karakter Tim Biru (Sisi Kiri) */}
          <div className="animate-float-slow hidden md:flex flex-col items-center shrink-0">
            <BlueMascotSvg className="h-36 w-36 lg:h-48 lg:w-48 xl:h-52 xl:w-52 drop-shadow-2xl" />
            <span className="mt-2 rounded-2xl border-2 border-sky-200 bg-blue-900/95 px-6 py-1.5 font-display text-lg lg:text-xl font-extrabold text-sky-100 shadow-lg">
              TIM BIRU
            </span>
          </div>

          {/* Panel Pengaturan Tengah — Proporsional untuk PID */}
          <div className="flex w-full max-w-3xl flex-1 flex-col gap-3 sm:gap-3.5 rounded-3xl border-4 border-sky-200 bg-blue-950/92 p-4 sm:p-5 lg:p-6 text-white shadow-2xl">
            {/* A. Pilihan Mode: TOUCH | MOTION */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <button
                type="button"
                data-testid="select-mode-touch"
                onClick={() =>
                  onUpdateSettings({ ...settings, battleMode: 'touch' })
                }
                className={`flex items-center justify-center gap-3 rounded-2xl border-4 px-4 py-3 sm:py-3.5 transition-all cursor-pointer ${
                  isTouchSelected
                    ? 'border-white bg-gradient-to-b from-cyan-400 to-blue-600 text-white shadow-xl ring-4 ring-cyan-300/60 scale-[1.01]'
                    : 'border-sky-800 bg-slate-900/75 text-sky-200 hover:border-sky-500'
                }`}
              >
                <div
                  className={`flex h-11 w-11 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-xl border-2 ${
                    isTouchSelected
                      ? 'border-white bg-white/20 text-white'
                      : 'border-sky-700 bg-sky-950 text-sky-300'
                  }`}
                >
                  <Pointer className="h-6 w-6 sm:h-7 sm:w-7" />
                </div>
                <span className="font-display text-2xl sm:text-3xl font-extrabold tracking-wide">
                  TOUCH
                </span>
              </button>

              <button
                type="button"
                data-testid="select-mode-motion"
                onClick={() =>
                  onUpdateSettings({ ...settings, battleMode: 'motion' })
                }
                className={`flex items-center justify-center gap-3 rounded-2xl border-4 px-4 py-3 sm:py-3.5 transition-all cursor-pointer ${
                  isMotionSelected
                    ? 'border-white bg-gradient-to-b from-yellow-300 via-amber-400 to-orange-500 text-slate-950 shadow-xl ring-4 ring-yellow-300/60 scale-[1.01]'
                    : 'border-sky-800 bg-slate-900/75 text-amber-200 hover:border-amber-500'
                }`}
              >
                <div
                  className={`relative flex h-11 w-11 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-xl border-2 ${
                    isMotionSelected
                      ? 'border-slate-950/35 bg-white/35 text-slate-950'
                      : 'border-amber-700/70 bg-amber-950/80 text-yellow-300'
                  }`}
                >
                  <svg
                    viewBox="0 0 64 64"
                    className="absolute inset-0 h-full w-full"
                    aria-hidden="true"
                  >
                    <path
                      d="M11 20 Q5 32 11 44"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                    />
                    <path
                      d="M53 20 Q59 32 53 44"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                    />
                  </svg>
                  <Hand className="h-6 w-6" />
                </div>
                <span className="font-display text-2xl sm:text-3xl font-extrabold tracking-wide">
                  MOTION
                </span>
              </button>
            </div>

            {/* B. Pilihan Level: MUDAH | SEDANG | KOMPLEKS */}
            <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
              {SIMPLE_LEVEL_OPTIONS.map((lvl) => {
                const isSelected = settings.level === lvl.id;
                return (
                  <button
                    key={lvl.id}
                    type="button"
                    data-testid={`select-${lvl.id}`}
                    onClick={() =>
                      onUpdateSettings({ ...settings, level: lvl.id })
                    }
                    className={`flex flex-col items-center justify-center rounded-2xl border-4 px-2.5 py-2.5 sm:px-3 sm:py-3 text-center transition-all cursor-pointer ${
                      isSelected
                        ? 'border-yellow-200 bg-gradient-to-b from-sky-400 to-blue-600 text-white shadow-lg ring-2 ring-yellow-300'
                        : 'border-sky-800 bg-slate-900/75 text-sky-100 hover:border-sky-600'
                    }`}
                  >
                    <span className="font-display text-lg sm:text-xl font-extrabold tracking-wide text-yellow-300">
                      {lvl.label}
                    </span>
                    <span className="mt-0.5 text-[11px] sm:text-xs font-semibold text-white/95">
                      {lvl.caption}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* C. Pilihan Durasi & Jumlah Soal (Segmented Controls) */}
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-3">
              {/* Durasi: 60 DETIK | 120 DETIK | 180 DETIK */}
              <div className="grid grid-cols-3 gap-1.5 rounded-2xl border-2 border-sky-700/80 bg-slate-950/90 p-1.5">
                {([60, 120, 180] as const).map((sec) => (
                  <button
                    key={sec}
                    type="button"
                    data-testid={`select-duration-${sec}`}
                    onClick={() =>
                      onUpdateSettings({ ...settings, durationSeconds: sec })
                    }
                    className={`rounded-xl px-2 py-2 font-display text-xs sm:text-sm font-extrabold tabular-nums whitespace-nowrap transition-colors cursor-pointer ${
                      settings.durationSeconds === sec
                        ? 'bg-amber-400 text-slate-950 shadow'
                        : 'text-sky-200 hover:bg-sky-900/60'
                    }`}
                  >
                    {sec} DETIK
                  </button>
                ))}
              </div>

              {/* Jumlah Soal: 5 SOAL | 10 SOAL | 15 SOAL */}
              <div className="grid grid-cols-3 gap-1.5 rounded-2xl border-2 border-sky-700/80 bg-slate-950/90 p-1.5">
                {([5, 10, 15] as const).map((cnt) => (
                  <button
                    key={cnt}
                    type="button"
                    data-testid={`select-questions-${cnt}`}
                    onClick={() =>
                      onUpdateSettings({ ...settings, totalQuestions: cnt })
                    }
                    className={`rounded-xl px-2 py-2 font-display text-xs sm:text-sm font-extrabold tabular-nums whitespace-nowrap transition-colors cursor-pointer ${
                      settings.totalQuestions === cnt
                        ? 'bg-sky-400 text-slate-950 shadow'
                        : 'text-sky-200 hover:bg-sky-900/60'
                    }`}
                  >
                    {cnt} SOAL
                  </button>
                ))}
              </div>
            </div>

            {/* D. Tombol Utama: MULAI BATTLE + Baris Kontrol Menu (FULL SCREEN & PANDUAN) */}
            <div className="mt-0.5 flex flex-col items-center gap-2.5">
              <button
                type="button"
                data-start="true"
                data-testid="btn-mulai-pertarungan"
                onClick={() => onStartGame()}
                className="flex w-full items-center justify-center gap-3 rounded-2xl border-4 border-yellow-200 bg-gradient-to-b from-yellow-300 via-amber-400 to-orange-500 px-8 py-3 sm:py-3.5 font-display text-2xl sm:text-3xl font-extrabold text-slate-950 shadow-2xl hover:brightness-105 active:scale-95 transition-transform whitespace-nowrap cursor-pointer"
              >
                <Play className="h-7 w-7 fill-slate-950" />
                <span>MULAI BATTLE</span>
              </button>

              <div className="grid w-full grid-cols-2 gap-3">
                {/* Tombol FULL SCREEN pada Menu Permainan */}
                <button
                  type="button"
                  data-testid="btn-fullscreen-menu"
                  aria-pressed={isFullscreen}
                  onClick={onToggleFullscreen}
                  className={`flex items-center justify-center gap-2 rounded-2xl border-2 px-4 py-2.5 font-display text-sm sm:text-base font-extrabold shadow-lg transition-all active:scale-95 whitespace-nowrap cursor-pointer ${
                    isFullscreen
                      ? 'border-emerald-200 bg-gradient-to-b from-emerald-400 to-teal-600 text-slate-950 ring-2 ring-emerald-300/60'
                      : 'border-cyan-200 bg-gradient-to-b from-cyan-500 to-sky-700 text-white hover:brightness-110'
                  }`}
                >
                  {isFullscreen ? (
                    <>
                      <Minimize2 className="h-5 w-5 shrink-0 stroke-[2.5]" />
                      <span>KELUAR FULL SCREEN</span>
                    </>
                  ) : (
                    <>
                      <Maximize2 className="h-5 w-5 shrink-0 stroke-[2.5]" />
                      <span>FULL SCREEN</span>
                    </>
                  )}
                </button>

                {/* Tombol PANDUAN */}
                <button
                  type="button"
                  data-testid="btn-panduan-gerakan"
                  onClick={onOpenGuide}
                  className="flex items-center justify-center gap-2 rounded-2xl border-2 border-sky-300/80 bg-sky-800/95 px-4 py-2.5 font-display text-sm sm:text-base font-extrabold text-sky-100 shadow-lg hover:bg-sky-700 active:scale-95 transition-all whitespace-nowrap cursor-pointer"
                >
                  <BookOpen className="h-5 w-5 shrink-0 text-yellow-300" />
                  <span>PANDUAN</span>
                </button>
              </div>
            </div>
          </div>

          {/* Karakter Tim Kuning (Sisi Kanan) */}
          <div className="animate-float-slow hidden md:flex flex-col items-center shrink-0">
            <YellowMascotSvg className="h-36 w-36 lg:h-48 lg:w-48 xl:h-52 xl:w-52 drop-shadow-2xl" />
            <span className="mt-2 rounded-2xl border-2 border-yellow-200 bg-amber-900/95 px-6 py-1.5 font-display text-lg lg:text-xl font-extrabold text-yellow-100 shadow-lg">
              TIM KUNING
            </span>
          </div>
        </div>
      </div>
    </main>
  );
};
