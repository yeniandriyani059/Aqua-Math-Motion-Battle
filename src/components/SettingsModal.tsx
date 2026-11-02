import React from 'react';
import {
  X,
  Users,
  Layers,
  Clock,
  Check,
  HelpCircle,
  Pointer,
  Hand,
} from 'lucide-react';
import { DifficultyLevel, GameSettings } from '../game/types';
import { LEVEL_METADATA } from '../game/rules';
import { BlueMascotSvg, YellowMascotSvg } from './MascotPlaque';

interface SettingsModalProps {
  isOpen: boolean;
  settings: GameSettings;
  onUpdateSettings: (next: GameSettings) => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  settings,
  onUpdateSettings,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-modal-title"
      className="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-3 sm:p-6"
    >
      <div className="relative flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border-4 border-sky-300 bg-gradient-to-b from-sky-900 via-blue-950 to-slate-950 text-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-sky-400/40 bg-sky-800/80 px-6 py-4">
          <div className="flex items-center gap-3">
            <BlueMascotSvg className="h-11 w-11" />
            <div>
              <h2
                id="settings-modal-title"
                className="font-display text-2xl sm:text-3xl font-extrabold text-white"
              >
                PENGATURAN PERMAINAN (KELAS 5 SD)
              </h2>
              <p className="text-xs sm:text-sm text-sky-200">
                Touch &amp; Motion Interactive Math Battle · Tema Aqua City
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup Pengaturan"
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 text-white hover:bg-white/25 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-4 overflow-y-auto p-5 sm:p-6">
          {/* 1. Mode Permainan (Touch Battle vs Motion Battle) */}
          <div className="rounded-2xl border border-sky-400/35 bg-sky-950/75 p-4">
            <div className="mb-2.5 flex items-center gap-2 text-sm font-bold text-sky-200">
              <Pointer className="h-4 w-4 text-cyan-300" />
              <span>Mode Permainan:</span>
            </div>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              <button
                type="button"
                data-testid="modal-select-touch"
                onClick={() =>
                  onUpdateSettings({ ...settings, battleMode: 'touch' })
                }
                className={`flex items-center gap-3 rounded-xl border-2 p-3 text-left transition-all cursor-pointer ${
                  settings.battleMode === 'touch'
                    ? 'border-white bg-gradient-to-br from-cyan-400 to-blue-600 text-white shadow-lg'
                    : 'border-sky-700 bg-slate-900/70 text-sky-100 hover:bg-sky-900/60'
                }`}
              >
                <Pointer className="h-6 w-6 shrink-0" />
                <div>
                  <span className="font-display text-sm font-extrabold block">
                    TOUCH BATTLE
                  </span>
                  <span className="text-xs opacity-90">
                    Pilih jawaban dengan menyentuh layar PID (tanpa kamera)
                  </span>
                </div>
              </button>

              <button
                type="button"
                data-testid="modal-select-motion"
                onClick={() =>
                  onUpdateSettings({ ...settings, battleMode: 'motion' })
                }
                className={`flex items-center gap-3 rounded-xl border-2 p-3 text-left transition-all cursor-pointer ${
                  settings.battleMode === 'motion'
                    ? 'border-yellow-200 bg-gradient-to-br from-yellow-300 to-amber-500 text-slate-950 shadow-lg'
                    : 'border-sky-700 bg-slate-900/70 text-sky-100 hover:bg-sky-900/60'
                }`}
              >
                <Hand className="h-6 w-6 shrink-0" />
                <div>
                  <span className="font-display text-sm font-extrabold block">
                    MOTION BATTLE
                  </span>
                  <span className="text-xs opacity-90">
                    Pilih jawaban menggunakan gerakan tangan melalui kamera
                  </span>
                </div>
              </button>
            </div>
          </div>

          {/* 2. Tingkat Kesulitan (Level 1, Level 2, Level 3) */}
          <div className="rounded-2xl border border-sky-400/35 bg-sky-950/75 p-4">
            <div className="mb-2.5 flex items-center gap-2 text-sm font-bold text-sky-200">
              <Layers className="h-4 w-4 text-yellow-300" />
              <span>Tingkat Kesulitan (Bilangan s.d. 10.000):</span>
            </div>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
              {(['level1', 'level2', 'level3'] as DifficultyLevel[]).map(
                (lvl) => {
                  const meta = LEVEL_METADATA[lvl];
                  const active = settings.level === lvl;
                  return (
                    <button
                      key={lvl}
                      type="button"
                      data-testid={`modal-select-${lvl}`}
                      onClick={() =>
                        onUpdateSettings({ ...settings, level: lvl })
                      }
                      className={`flex flex-col items-start rounded-xl border-2 p-3 text-left transition-all cursor-pointer ${
                        active
                          ? 'border-yellow-200 bg-amber-400 text-slate-950 shadow-lg'
                          : 'border-sky-700 bg-slate-900/70 text-sky-100 hover:bg-sky-900/60'
                      }`}
                    >
                      <span className="font-display text-sm font-extrabold">
                        {meta.title}
                      </span>
                      <span
                        className={`mt-1 text-xs leading-snug ${
                          active
                            ? 'text-slate-900 font-semibold'
                            : 'text-sky-200'
                        }`}
                      >
                        {meta.subtitle}
                      </span>
                    </button>
                  );
                }
              )}
            </div>
          </div>

          {/* 3. Durasi & Jumlah Soal */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-sky-400/35 bg-sky-950/75 p-4">
              <div className="mb-2.5 flex items-center gap-2 text-sm font-bold text-sky-200">
                <Clock className="h-4 w-4 text-sky-300" />
                <span>Durasi Permainan:</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {([60, 120, 180] as const).map((sec) => (
                  <button
                    key={sec}
                    type="button"
                    onClick={() =>
                      onUpdateSettings({ ...settings, durationSeconds: sec })
                    }
                    className={`rounded-xl border-2 px-3 py-2.5 font-display text-sm font-bold tabular-nums transition-all whitespace-nowrap cursor-pointer ${
                      settings.durationSeconds === sec
                        ? 'border-yellow-200 bg-amber-400 text-slate-950 shadow-lg'
                        : 'border-sky-700 bg-slate-900/70 text-sky-100 hover:bg-sky-900/60'
                    }`}
                  >
                    {sec} Detik
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-sky-400/35 bg-sky-950/75 p-4">
              <div className="mb-2.5 flex items-center gap-2 text-sm font-bold text-sky-200">
                <HelpCircle className="h-4 w-4 text-sky-300" />
                <span>Jumlah Soal:</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {([5, 10, 15] as const).map((cnt) => (
                  <button
                    key={cnt}
                    type="button"
                    onClick={() =>
                      onUpdateSettings({ ...settings, totalQuestions: cnt })
                    }
                    className={`rounded-xl border-2 px-3 py-2.5 font-display text-sm font-bold tabular-nums transition-all whitespace-nowrap cursor-pointer ${
                      settings.totalQuestions === cnt
                        ? 'border-yellow-200 bg-amber-400 text-slate-950 shadow-lg'
                        : 'border-sky-700 bg-slate-900/70 text-sky-100 hover:bg-sky-900/60'
                    }`}
                  >
                    {cnt} Soal
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 4. Jumlah Anggota Kelompok */}
          <div className="rounded-2xl border border-sky-400/35 bg-sky-950/75 p-4">
            <div className="mb-2.5 flex items-center gap-2 text-sm font-bold text-sky-200">
              <Users className="h-4 w-4 text-sky-300" />
              <span>Jumlah Siswa per Kelompok:</span>
            </div>
            <div className="grid grid-cols-3 gap-2.5">
              {([1, 2, 3] as const).map((count) => (
                <button
                  key={count}
                  type="button"
                  onClick={() =>
                    onUpdateSettings({ ...settings, playersPerTeam: count })
                  }
                  className={`rounded-xl border-2 px-4 py-2.5 font-display text-sm font-bold transition-all whitespace-nowrap cursor-pointer ${
                    settings.playersPerTeam === count
                      ? 'border-yellow-200 bg-amber-400 text-slate-950 shadow-lg'
                      : 'border-sky-700 bg-slate-900/70 text-sky-100 hover:bg-sky-900/60'
                  }`}
                >
                  {count} Siswa / Tim
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t-2 border-sky-400/40 bg-sky-900/90 px-6 py-4">
          <div className="flex items-center gap-2">
            <YellowMascotSvg className="h-9 w-9" />
            <span className="text-xs sm:text-sm font-semibold text-sky-100">
              {settings.battleMode === 'touch'
                ? 'TOUCH BATTLE'
                : 'MOTION BATTLE'}{' '}
              · {LEVEL_METADATA[settings.level].shortTitle} ·{' '}
              {settings.totalQuestions} Soal · {settings.durationSeconds} Detik
            </span>
          </div>

          <button
            type="button"
            data-testid="btn-save-settings"
            onClick={onClose}
            className="flex items-center gap-2 rounded-2xl border-2 border-yellow-200 bg-gradient-to-b from-yellow-300 to-amber-500 px-6 py-2.5 font-display text-base font-extrabold text-slate-950 shadow-lg hover:brightness-105 whitespace-nowrap cursor-pointer"
          >
            <Check className="h-5 w-5" /> SIMPAN &amp; TERAPKAN
          </button>
        </div>
      </div>
    </div>
  );
};
