import React, { useState } from 'react';
import { X, Hand, Pointer, Users, Trophy, Calculator } from 'lucide-react';
import { BlueMascotSvg, YellowMascotSvg } from './MascotPlaque';

interface GestureGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GestureGuideModal: React.FC<GestureGuideModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'panduan' | 'poster'>('panduan');

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="guide-modal-title"
      className="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-3 sm:p-6"
    >
      <div className="relative flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl border-4 border-sky-300 bg-sky-50 shadow-2xl">
        {/* Top Modal Header */}
        <div className="flex items-center justify-between border-b-2 border-sky-200 bg-gradient-to-r from-sky-700 via-blue-700 to-sky-700 px-5 py-3.5 text-white">
          <div className="flex items-center gap-3">
            <BlueMascotSvg className="h-10 w-10" />
            <div>
              <h2
                id="guide-modal-title"
                className="font-display text-xl sm:text-2xl font-bold"
              >
                PANDUAN TOUCH &amp; MOTION BATTLE — AQUA MATH (KELAS 5 SD)
              </h2>
              <p className="text-xs sm:text-sm text-sky-100">
                Touch &amp; Motion Interactive Math Battle · Tema Aqua City
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex rounded-xl bg-blue-950/60 p-1">
              <button
                type="button"
                onClick={() => setActiveTab('panduan')}
                className={`rounded-lg px-3 py-1.5 text-xs sm:text-sm font-bold whitespace-nowrap transition-colors cursor-pointer ${
                  activeTab === 'panduan'
                    ? 'bg-amber-400 text-slate-950 shadow'
                    : 'text-sky-100 hover:text-white'
                }`}
              >
                Panduan 2 Mode &amp; Level
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('poster')}
                className={`rounded-lg px-3 py-1.5 text-xs sm:text-sm font-bold whitespace-nowrap transition-colors cursor-pointer ${
                  activeTab === 'poster'
                    ? 'bg-amber-400 text-slate-950 shadow'
                    : 'text-sky-100 hover:text-white'
                }`}
              >
                Gambar Referensi Visual
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup panduan"
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 text-white hover:bg-white/25 transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Body Content */}
        <div className="overflow-y-auto p-4 sm:p-6">
          {activeTab === 'panduan' ? (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
              {/* Column 1: Mode 1 — TOUCH BATTLE (4 cols) */}
              <div className="rounded-2xl border-2 border-cyan-300 bg-white p-4 shadow-sm lg:col-span-4">
                <div className="mb-3 inline-flex items-center gap-1.5 rounded-xl bg-cyan-600 px-3.5 py-1 font-display text-base font-bold text-white">
                  <Pointer className="h-4 w-4" />
                  <span>MODE 1: TOUCH BATTLE</span>
                </div>
                <p className="mb-3 text-xs font-semibold text-slate-600">
                  Pilih jawaban dengan menyentuh layar. Cocok untuk permainan kelompok di depan PID (tanpa kamera).
                </p>
                <ol className="space-y-2.5 text-xs sm:text-sm text-slate-700">
                  <li className="flex items-start gap-2">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-cyan-600 font-display text-xs font-bold text-white">
                      1
                    </span>
                    <span>
                      <strong>Tanpa Kamera</strong>: Menggunakan latar ilustrasi Aqua City.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-cyan-600 font-display text-xs font-bold text-white">
                      2
                    </span>
                    <span>
                      <strong>Sentuh Tombol A, B, C</strong>: Tim Biru menyentuh di sisi kiri, Tim Kuning menyentuh di sisi kanan.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-cyan-600 font-display text-xs font-bold text-white">
                      3
                    </span>
                    <span>
                      <strong>Validasi Serentak</strong>: Jawaban setiap tim disimpan terpisah (status <em>Sudah menjawab</em>), lalu divalidasi saat kedua tim selesai menjawab.
                    </span>
                  </li>
                </ol>
              </div>

              {/* Column 2: Mode 2 — MOTION BATTLE (5 cols) */}
              <div className="rounded-2xl border-2 border-amber-300 bg-white p-4 shadow-sm lg:col-span-5">
                <div className="mb-3 inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-3.5 py-1 font-display text-base font-bold text-slate-950">
                  <Hand className="h-4 w-4" />
                  <span>MODE 2: MOTION BATTLE</span>
                </div>
                <p className="mb-3 text-xs font-semibold text-slate-600">
                  Pilih jawaban menggunakan gerakan tangan melalui kamera fullscreen (Area Kiri: Tim Biru | Area Kanan: Tim Kuning).
                </p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-2.5">
                    <h3 className="font-display text-xs font-bold text-amber-950">
                      1. Dorong ke Depan (⇢)
                    </h3>
                    <p className="text-[11px] text-slate-600">
                      Menembak atau memilih bubble jawaban yang sedang ditargetkan.
                    </p>
                  </div>
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-2.5">
                    <h3 className="font-display text-xs font-bold text-amber-950">
                      2. Gerakan Kiri / Kanan (↔)
                    </h3>
                    <p className="text-[11px] text-slate-600">
                      Berpindah target pilihan jawaban (A, B, C) di zona tim masing-masing.
                    </p>
                  </div>
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-2.5">
                    <h3 className="font-display text-xs font-bold text-amber-950">
                      3. Angkat Tangan (⇈)
                    </h3>
                    <p className="text-[11px] text-slate-600">
                      Mengisi Tandon Air tim (+25%) hingga penuh 100%.
                    </p>
                  </div>
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-2.5">
                    <h3 className="font-display text-xs font-bold text-amber-950">
                      4. Dua Tangan (🙌)
                    </h3>
                    <p className="text-[11px] text-slate-600">
                      Aktivasi serangan besar (Combo 2x Poin) saat Tandon Air 100%.
                    </p>
                  </div>
                </div>
              </div>

              {/* Column 3: Tiga Tingkat Kesulitan Kelas 5 SD (3 cols) */}
              <div className="rounded-2xl border-2 border-sky-200 bg-white p-4 shadow-sm lg:col-span-3">
                <div className="mb-3 inline-block rounded-xl bg-blue-800 px-3.5 py-1 font-display text-base font-bold text-white">
                  Materi Kelas 5 SD
                </div>
                <ul className="space-y-3 text-xs text-slate-700">
                  <li className="flex items-start gap-2.5">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky-500 text-white">
                      <Calculator className="h-4 w-4" />
                    </div>
                    <div>
                      <strong className="block text-slate-900">Level 1 – Mudah</strong>
                      Penjumlahan &amp; pengurangan bilangan s.d. 10.000 (contoh: 2.450 + 3.250 = 5.700).
                    </div>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky-500 text-white">
                      <Users className="h-4 w-4" />
                    </div>
                    <div>
                      <strong className="block text-slate-900">Level 2 – Sedang</strong>
                      Operasi 2–3 bilangan &amp; soal cerita sederhana persediaan air Aqua City.
                    </div>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky-500 text-white">
                      <Trophy className="h-4 w-4" />
                    </div>
                    <div>
                      <strong className="block text-slate-900">Level 3 – Kompleks</strong>
                      Soal cerita multi-langkah reservoir, perumahan, sekolah, klinik, dan taman kota.
                    </div>
                  </li>
                </ul>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <div className="overflow-hidden rounded-2xl border-2 border-sky-300 bg-slate-900 shadow-lg">
                <img
                  src="/assets/aistudio/Pertarungan_Matematika_Aqua_Motion__1__a69208b0.png"
                  alt="Referensi Desain Aqua Math Motion Battle"
                  referrerPolicy="no-referrer"
                  className="max-h-[68vh] w-auto object-contain"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer Banner */}
        <div className="flex items-center justify-between border-t-2 border-sky-200 bg-gradient-to-r from-blue-900 via-sky-700 to-blue-900 px-6 py-3 text-white">
          <div className="flex items-center gap-2">
            <YellowMascotSvg className="h-8 w-8" />
            <span className="font-display text-sm sm:text-base font-bold text-yellow-300">
              Aqua Math Motion Battle — Touch &amp; Motion Interactive Math Battle
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-amber-400 px-5 py-2 font-display text-sm font-bold text-slate-950 shadow hover:bg-amber-300 transition-colors cursor-pointer"
          >
            Siap Bertarung!
          </button>
        </div>
      </div>
    </div>
  );
};
