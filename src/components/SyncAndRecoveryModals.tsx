import React from 'react';
import {
  Cloud,
  CloudOff,
  RefreshCw,
  AlertCircle,
  History,
  X,
  Play,
  RotateCcw,
  Trophy,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import {
  ActiveMatchCheckpoint,
  formatSyncIndicatorLabel,
  MatchResultRecord,
  SyncIndicatorState,
} from '../services/matchStorage';
import { LEVEL_METADATA } from '../game/rules';

interface SyncStatusBadgeProps {
  indicator: SyncIndicatorState;
  matchCount: number;
  onOpenHistory: () => void;
}

/**
 * Indikator status sederhana (tidak menampilkan pesan teknis yang membingungkan siswa):
 * - Online – Tersinkronisasi
 * - Offline – Data tersimpan lokal
 * - Menyinkronkan
 * - Sinkronisasi gagal – Akan dicoba kembali
 */
export const SyncStatusBadge: React.FC<SyncStatusBadgeProps> = ({
  indicator,
  matchCount,
  onOpenHistory,
}) => {
  const label = formatSyncIndicatorLabel(indicator);

  const getBadgeStyle = () => {
    switch (indicator) {
      case 'online_synced':
        return 'border-emerald-300/60 bg-slate-950/85 text-emerald-200';
      case 'offline_local':
        return 'border-amber-300/60 bg-slate-950/85 text-amber-200';
      case 'syncing':
        return 'border-sky-300/60 bg-slate-950/85 text-sky-200';
      case 'sync_failed':
        return 'border-rose-300/60 bg-slate-950/85 text-rose-200';
    }
  };

  const renderIcon = () => {
    switch (indicator) {
      case 'online_synced':
        return <Cloud className="h-3.5 w-3.5 shrink-0 text-emerald-400" />;
      case 'offline_local':
        return <CloudOff className="h-3.5 w-3.5 shrink-0 text-amber-400" />;
      case 'syncing':
        return (
          <RefreshCw className="h-3.5 w-3.5 shrink-0 animate-spin text-sky-400" />
        );
      case 'sync_failed':
        return <AlertCircle className="h-3.5 w-3.5 shrink-0 text-rose-400" />;
    }
  };

  return (
    <div className="pointer-events-auto flex items-center gap-2">
      <div
        data-testid="sync-status-indicator"
        data-sync-state={indicator}
        className={`flex items-center gap-1.5 rounded-xl border px-3 py-1 text-xs font-bold shadow-lg whitespace-nowrap ${getBadgeStyle()}`}
      >
        {renderIcon()}
        <span>{label}</span>
      </div>

      <button
        type="button"
        data-testid="btn-open-match-history"
        onClick={onOpenHistory}
        className="flex items-center gap-1.5 rounded-xl border border-sky-300/60 bg-slate-950/85 px-3 py-1 text-xs font-bold text-sky-100 shadow-lg hover:bg-slate-800 transition-colors cursor-pointer whitespace-nowrap"
      >
        <History className="h-3.5 w-3.5 text-yellow-300" />
        <span>Riwayat ({matchCount})</span>
      </button>
    </div>
  );
};

interface RecoveryModalProps {
  checkpoint: ActiveMatchCheckpoint | null;
  onResumeMatch: (checkpoint: ActiveMatchCheckpoint) => void;
  onStartFreshMatch: () => void;
}

/**
 * Dialog pemulihan pertandingan ketika listrik mati atau browser tertutup tiba-tiba.
 * Memberikan pilihan untuk melanjutkan pertandingan yang belum selesai atau memulai pertandingan baru.
 */
export const UnfinishedMatchRecoveryModal: React.FC<RecoveryModalProps> = ({
  checkpoint,
  onResumeMatch,
  onStartFreshMatch,
}) => {
  if (!checkpoint) return null;

  const mins = Math.floor(checkpoint.secondsLeft / 60);
  const secs = checkpoint.secondsLeft % 60;
  const formattedTime = `${String(mins).padStart(2, '0')}:${String(
    secs
  ).padStart(2, '0')}`;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="recovery-modal-title"
      data-testid="recovery-prompt-modal"
      className="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4"
    >
      <div className="w-full max-w-lg rounded-3xl border-4 border-yellow-300 bg-gradient-to-b from-sky-800 via-blue-900 to-slate-950 p-6 text-center text-white shadow-2xl">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full border-3 border-yellow-200 bg-amber-400 text-slate-950 shadow-lg">
          <Clock className="h-8 w-8" />
        </div>

        <h2
          id="recovery-modal-title"
          className="font-display text-2xl sm:text-3xl font-extrabold text-yellow-300"
        >
          PERTANDINGAN BELUM SELESAI
        </h2>
        <p className="mt-1 text-sm font-semibold text-sky-100">
          Ditemukan cadangan progres pertandingan terakhir di perangkat ini.
        </p>

        {/* Ringkasan Skor & Progres Terakhir */}
        <div className="mt-4 grid grid-cols-2 gap-3 rounded-2xl border border-sky-300/40 bg-blue-950/80 p-3.5">
          <div className="rounded-xl bg-sky-900/70 p-2.5">
            <span className="block text-xs font-bold text-sky-200">
              TIM BIRU
            </span>
            <span
              data-testid="recovery-score-blue"
              className="font-display tabular-nums text-3xl font-extrabold text-white"
            >
              {Math.round(checkpoint.blueTeam.score)}
            </span>
          </div>
          <div className="rounded-xl bg-amber-900/70 p-2.5">
            <span className="block text-xs font-bold text-amber-200">
              TIM KUNING
            </span>
            <span
              data-testid="recovery-score-yellow"
              className="font-display tabular-nums text-3xl font-extrabold text-yellow-300"
            >
              {Math.round(checkpoint.yellowTeam.score)}
            </span>
          </div>
          <div className="col-span-2 flex items-center justify-center gap-3 text-xs font-bold text-sky-200">
            <span>
              Mode: {checkpoint.settings.battleMode === 'touch' ? 'TOUCH' : 'MOTION'}
            </span>
            <span aria-hidden="true">·</span>
            <span>
              Soal {checkpoint.problem.roundNumber} /{' '}
              {checkpoint.settings.totalQuestions}
            </span>
            <span aria-hidden="true">·</span>
            <span>Sisa Waktu: {formattedTime}</span>
          </div>
        </div>

        {/* Pilihan Tindakan */}
        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            data-testid="btn-resume-checkpoint"
            onClick={() => onResumeMatch(checkpoint)}
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl border-3 border-yellow-200 bg-gradient-to-b from-yellow-300 via-amber-400 to-orange-500 px-5 py-3 font-display text-base sm:text-lg font-extrabold text-slate-950 shadow-xl hover:brightness-105 cursor-pointer whitespace-nowrap"
          >
            <Play className="h-5 w-5 fill-slate-950" />
            <span>LANJUTKAN PERTANDINGAN</span>
          </button>

          <button
            type="button"
            data-testid="btn-discard-checkpoint"
            onClick={onStartFreshMatch}
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl border-2 border-sky-300/70 bg-sky-800 px-5 py-3 font-display text-base sm:text-lg font-bold text-white hover:bg-sky-700 cursor-pointer whitespace-nowrap"
          >
            <RotateCcw className="h-5 w-5" />
            <span>MULAI BARU</span>
          </button>
        </div>
      </div>
    </div>
  );
};

interface MatchHistoryModalProps {
  isOpen: boolean;
  matches: MatchResultRecord[];
  indicator: SyncIndicatorState;
  onSyncNow: () => void;
  onClose: () => void;
}

export const MatchHistoryModal: React.FC<MatchHistoryModalProps> = ({
  isOpen,
  matches,
  indicator,
  onSyncNow,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="history-modal-title"
      data-testid="match-history-modal"
      className="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4"
    >
      <div className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border-4 border-sky-300 bg-gradient-to-b from-sky-900 to-slate-950 p-5 sm:p-6 text-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-sky-400/30 pb-3">
          <div className="flex items-center gap-2.5">
            <Trophy className="h-6 w-6 text-yellow-300" />
            <h2
              id="history-modal-title"
              className="font-display text-xl sm:text-2xl font-extrabold text-white"
            >
              RIWAYAT HASIL PERTANDINGAN
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              data-testid="btn-sync-now"
              onClick={onSyncNow}
              className="flex items-center gap-1.5 rounded-xl border border-sky-300/60 bg-sky-800 px-3 py-1.5 text-xs font-extrabold text-white hover:bg-sky-700 cursor-pointer whitespace-nowrap"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${
                  indicator === 'syncing' ? 'animate-spin' : ''
                }`}
              />
              <span>Sinkronkan</span>
            </button>

            <button
              type="button"
              data-testid="btn-close-history"
              onClick={onClose}
              aria-label="Tutup Riwayat"
              className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/20 bg-slate-900 text-slate-200 hover:bg-slate-800 cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Status Bar */}
        <div className="mt-3 flex items-center justify-between rounded-xl border border-sky-400/25 bg-blue-950/70 px-3.5 py-2 text-xs font-bold text-sky-100">
          <span>Status: {formatSyncIndicatorLabel(indicator)}</span>
          <span className="tabular-nums">{matches.length} Pertandingan</span>
        </div>

        {/* Match List */}
        <div className="mt-3 flex-1 space-y-2.5 overflow-y-auto pr-1">
          {matches.length === 0 ? (
            <div className="rounded-2xl border border-sky-400/20 bg-slate-900/60 p-8 text-center text-sm font-semibold text-sky-200">
              Belum ada riwayat pertandingan yang tersimpan.
            </div>
          ) : (
            matches.map((m) => {
              const winnerLabel =
                m.winner === 'blue'
                  ? 'Tim Biru Menang'
                  : m.winner === 'yellow'
                  ? 'Tim Kuning Menang'
                  : 'Pertandingan Seri';
              const levelTitle =
                LEVEL_METADATA[m.level]?.shortTitle ?? 'Level 1';

              return (
                <div
                  key={m.id}
                  data-testid="match-history-item"
                  data-match-id={m.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-sky-400/30 bg-blue-950/75 px-4 py-3 text-left"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-display text-sm sm:text-base font-extrabold text-yellow-300">
                        {winnerLabel}
                      </span>
                      <span aria-hidden="true" className="text-sky-400">
                        ·
                      </span>
                      <span className="text-xs font-bold uppercase text-sky-200">
                        {m.battleMode === 'touch' ? 'TOUCH' : 'MOTION'}
                      </span>
                      <span aria-hidden="true" className="text-sky-400">
                        ·
                      </span>
                      <span className="text-xs font-semibold text-sky-200">
                        {levelTitle}
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-sky-100/90 tabular-nums">
                      <span>
                        Biru: <strong>{m.blueScore}</strong> ({m.blueCorrect}{' '}
                        Benar)
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>
                        Kuning: <strong>{m.yellowScore}</strong> (
                        {m.yellowCorrect} Benar)
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{m.totalQuestions} Soal</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs font-bold">
                    {m.syncStatus === 'synced' ? (
                      <span className="flex items-center gap-1 text-emerald-300">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>Tersinkronisasi</span>
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-amber-300">
                        <CloudOff className="h-3.5 w-3.5" />
                        <span>Tersimpan Lokal</span>
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
