import {
  AnswerBubble,
  BattleMode,
  DifficultyLevel,
  GameSettings,
  MathProblem,
  RoundHistoryItem,
  TeamBattleState,
  TeamId,
} from '../game/types';
import { determineWinner } from '../game/rules';
import {
  getDeviceSessionId,
  getSchoolId,
  getSupabaseClient,
  isSupabaseConfigured,
} from './supabaseClient';

export type SyncRecordStatus = 'synced' | 'pending' | 'syncing' | 'failed';

export type SyncIndicatorState =
  | 'online_synced'
  | 'offline_local'
  | 'syncing'
  | 'sync_failed';

/**
 * Label indikator status sinkronisasi yang sederhana dan ramah siswa/guru:
 * - Online – Tersinkronisasi
 * - Offline – Data tersimpan lokal
 * - Menyinkronkan
 * - Sinkronisasi gagal – Akan dicoba kembali
 */
export function formatSyncIndicatorLabel(state: SyncIndicatorState): string {
  switch (state) {
    case 'online_synced':
      return 'Online – Tersinkronisasi';
    case 'offline_local':
      return 'Offline – Data tersimpan lokal';
    case 'syncing':
      return 'Menyinkronkan';
    case 'sync_failed':
      return 'Sinkronisasi gagal – Akan dicoba kembali';
  }
}

export const SUPABASE_MATCH_TABLE = 'aqua_battle_matches';

export interface MatchResultRecord {
  id: string;
  schoolId: string;
  sessionId: string;
  startedAt: string;
  finishedAt: string;
  updatedAt: string;
  battleMode: BattleMode;
  level: DifficultyLevel;
  durationSeconds: number;
  totalQuestions: number;
  blueScore: number;
  yellowScore: number;
  blueCorrect: number;
  blueWrong: number;
  yellowCorrect: number;
  yellowWrong: number;
  winner: TeamId | 'draw';
  matchStatus: 'in_progress' | 'completed' | 'finished_early';
  roundHistory: RoundHistoryItem[];
  syncStatus: SyncRecordStatus;
  lastSyncError?: string;
}

export interface ActiveMatchCheckpoint {
  matchId: string;
  schoolId: string;
  sessionId: string;
  startedAt: string;
  updatedAt: string;
  settings: GameSettings;
  secondsLeft: number;
  problem: MathProblem;
  blueTeam: TeamBattleState;
  yellowTeam: TeamBattleState;
  blueBubbles: AnswerBubble[];
  yellowBubbles: AnswerBubble[];
  history: RoundHistoryItem[];
}

/**
 * Struktur baris sesuai tabel `public.aqua_battle_matches` pada proyek Supabase.
 */
export interface SupabaseMatchRow {
  id: string; // UUID
  match_code: string;
  session_id: string;
  started_at: string;
  finished_at: string;
  updated_at: string;
  game_mode: BattleMode;
  game_level: number;
  duration_seconds: number;
  question_count: number;
  blue_score: number;
  yellow_score: number;
  blue_correct: number;
  blue_wrong: number;
  yellow_correct: number;
  yellow_wrong: number;
  winner: TeamId | 'draw';
  match_status: 'in_progress' | 'completed' | 'finished_early';
  match_data: {
    school_id: string;
    round_history: RoundHistoryItem[];
  };
}

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Menghasilkan UUID v4 deterministik dari string `id` / `match_code`
 * agar kolom `id` (bertipe UUID di `public.aqua_battle_matches`) selalu valid
 * dan konsisten saat di-upsert berulang kali tanpa duplikasi.
 */
export function toValidMatchUuid(rawId: string): string {
  const trimmed = (rawId || '').trim();
  if (UUID_REGEX.test(trimmed)) {
    return trimmed.toLowerCase();
  }

  let h1 = 0xdeadbeef ^ trimmed.length;
  let h2 = 0x41c6ce57 ^ trimmed.length;
  let h3 = 0x9e3779b9 ^ trimmed.length;
  let h4 = 0x85ebca6b ^ trimmed.length;

  for (let i = 0; i < trimmed.length; i++) {
    const ch = trimmed.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
    h3 = Math.imul(h3 ^ ch, 2246822507);
    h4 = Math.imul(h4 ^ ch, 3266489909);
  }

  h1 =
    Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^
    Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 =
    Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^
    Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  h3 =
    Math.imul(h3 ^ (h3 >>> 16), 2246822507) ^
    Math.imul(h4 ^ (h4 >>> 13), 3266489909);
  h4 =
    Math.imul(h4 ^ (h4 >>> 16), 2246822507) ^
    Math.imul(h3 ^ (h3 >>> 13), 3266489909);

  const hex =
    (h1 >>> 0).toString(16).padStart(8, '0') +
    (h2 >>> 0).toString(16).padStart(8, '0') +
    (h3 >>> 0).toString(16).padStart(8, '0') +
    (h4 >>> 0).toString(16).padStart(8, '0');

  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(
    13,
    16
  )}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

/**
 * Memformat pesan error Supabase menjadi pesan Bahasa Indonesia yang jelas bagi guru/pengguna.
 */
export function formatSupabaseErrorMessage(err: unknown): string {
  if (!err || typeof err !== 'object') {
    return 'Gagal terhubung ke server Supabase. Data tetap tersimpan di perangkat ini.';
  }
  const e = err as {
    code?: string;
    message?: string;
    details?: string | null;
    hint?: string | null;
  };
  const code = e.code ? String(e.code) : '';
  const msg = e.message ? String(e.message) : 'Unknown Supabase error';

  if (code === '42501' || msg.toLowerCase().includes('row-level security')) {
    return `Penyimpanan ke Supabase ditolak oleh kebijakan Row Level Security / RLS pada tabel public.${SUPABASE_MATCH_TABLE} (Kode 42501: ${msg}). Tambahkan policy INSERT & UPDATE untuk role anon di Supabase SQL Editor. Hasil pertandingan tetap aman tersimpan di perangkat ini.`;
  }
  if (code === 'PGRST205' || code === '42P01') {
    return `Tabel public.${SUPABASE_MATCH_TABLE} tidak ditemukan di Supabase (${msg}). Hasil pertandingan tetap tersimpan di perangkat ini.`;
  }
  if (code === '42703' || code === 'PGRST204') {
    return `Struktur kolom tabel public.${SUPABASE_MATCH_TABLE} tidak sesuai (${msg}). Hasil pertandingan tetap tersimpan di perangkat ini.`;
  }
  return `Gagal menyimpan ke Supabase (${code ? `Kode ${code}: ` : ''}${msg}). Hasil pertandingan tetap tersimpan di perangkat ini.`;
}

const IDB_NAME = 'aqua_math_battle_db';
const IDB_VERSION = 1;
const STORE_MATCHES = 'matches';
const STORE_CHECKPOINT = 'active_checkpoint';

const LS_MATCHES_KEY = 'aqua_math_battle_matches_v1';
const LS_CHECKPOINT_KEY = 'aqua_math_battle_active_checkpoint_v1';
const CHECKPOINT_ID = 'current_active_match';

/**
 * Buat ID pertandingan unik setiap kali pertandingan dimulai
 * agar data tidak pernah tercatat dua kali saat sinkronisasi diulang.
 */
export function createUniqueMatchId(
  timestampMs: number = Date.now(),
  randomSuffix?: string
): string {
  const rand =
    randomSuffix ??
    Math.random()
      .toString(36)
      .replace(/[^a-z0-9]/g, '')
      .slice(0, 8);
  return `match-${timestampMs}-${rand || 'aqua'}`;
}

export function buildMatchResultRecord(params: {
  id: string;
  startedAt: string;
  finishedAt?: string;
  settings: GameSettings;
  blueTeam: TeamBattleState;
  yellowTeam: TeamBattleState;
  history: RoundHistoryItem[];
  matchStatus: 'completed' | 'finished_early';
  syncStatus?: SyncRecordStatus;
  schoolId?: string;
  sessionId?: string;
}): MatchResultRecord {
  const nowIso = params.finishedAt ?? new Date().toISOString();
  const winInfo = determineWinner(params.blueTeam, params.yellowTeam);

  return {
    id: params.id,
    schoolId: params.schoolId ?? getSchoolId(),
    sessionId: params.sessionId ?? getDeviceSessionId(),
    startedAt: params.startedAt || nowIso,
    finishedAt: nowIso,
    updatedAt: nowIso,
    battleMode: params.settings.battleMode,
    level: params.settings.level,
    durationSeconds: params.settings.durationSeconds,
    totalQuestions: params.settings.totalQuestions,
    blueScore: Math.max(0, Math.round(params.blueTeam.score)),
    yellowScore: Math.max(0, Math.round(params.yellowTeam.score)),
    blueCorrect: Math.max(0, params.blueTeam.correctCount),
    blueWrong: Math.max(0, params.blueTeam.wrongCount),
    yellowCorrect: Math.max(0, params.yellowTeam.correctCount),
    yellowWrong: Math.max(0, params.yellowTeam.wrongCount),
    winner: winInfo.winner,
    matchStatus: params.matchStatus,
    roundHistory: [...params.history],
    syncStatus: params.syncStatus ?? 'pending',
  };
}

export function toSupabaseRow(record: MatchResultRecord): SupabaseMatchRow {
  const numericLevel =
    record.level === 'level3' ? 3 : record.level === 'level2' ? 2 : 1;

  return {
    id: toValidMatchUuid(record.id),
    match_code: record.id,
    session_id: record.sessionId,
    started_at: record.startedAt,
    finished_at: record.finishedAt,
    updated_at: record.updatedAt,
    game_mode: record.battleMode,
    game_level: numericLevel,
    duration_seconds: record.durationSeconds,
    question_count: record.totalQuestions,
    blue_score: record.blueScore,
    yellow_score: record.yellowScore,
    blue_correct: record.blueCorrect,
    blue_wrong: record.blueWrong,
    yellow_correct: record.yellowCorrect,
    yellow_wrong: record.yellowWrong,
    winner: record.winner,
    match_status: record.matchStatus,
    match_data: {
      school_id: record.schoolId || getSchoolId(),
      round_history: Array.isArray(record.roundHistory)
        ? record.roundHistory
        : [],
    },
  };
}

export function fromSupabaseRow(row: SupabaseMatchRow): MatchResultRecord {
  const rawData =
    row.match_data && typeof row.match_data === 'object'
      ? (row.match_data as {
          school_id?: string;
          round_history?: RoundHistoryItem[];
        })
      : {};

  const parsedLevel: DifficultyLevel =
    Number(row.game_level) === 3
      ? 'level3'
      : Number(row.game_level) === 2
      ? 'level2'
      : 'level1';

  return {
    id: row.match_code || row.id,
    schoolId: rawData.school_id || getSchoolId(),
    sessionId: row.session_id,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
    updatedAt: row.updated_at || row.finished_at,
    battleMode: row.game_mode === 'motion' ? 'motion' : 'touch',
    level: parsedLevel,
    durationSeconds: Number(row.duration_seconds) || 120,
    totalQuestions: Number(row.question_count) || 5,
    blueScore: Number(row.blue_score) || 0,
    yellowScore: Number(row.yellow_score) || 0,
    blueCorrect: Number(row.blue_correct) || 0,
    blueWrong: Number(row.blue_wrong) || 0,
    yellowCorrect: Number(row.yellow_correct) || 0,
    yellowWrong: Number(row.yellow_wrong) || 0,
    winner:
      row.winner === 'blue' || row.winner === 'yellow' ? row.winner : 'draw',
    matchStatus:
      row.match_status === 'finished_early' ? 'finished_early' : 'completed',
    roundHistory: Array.isArray(rawData.round_history)
      ? rawData.round_history
      : [],
    syncStatus: 'synced',
  };
}

/**
 * Menggabungkan riwayat lokal dan riwayat Supabase berdasarkan ID unik (`id`)
 * tanpa duplikasi dan tanpa menimpa data lokal yang masih berstatus `pending` / `failed`.
 */
export function mergeMatchHistories(
  localRecords: MatchResultRecord[],
  remoteRecords: MatchResultRecord[]
): MatchResultRecord[] {
  const byId = new Map<string, MatchResultRecord>();

  for (const local of localRecords) {
    if (local && local.id) {
      byId.set(local.id, local);
    }
  }

  for (const remote of remoteRecords) {
    if (!remote || !remote.id) continue;
    const existingLocal = byId.get(remote.id);

    if (!existingLocal) {
      byId.set(remote.id, { ...remote, syncStatus: 'synced' });
    } else if (existingLocal.syncStatus === 'synced') {
      // Gunakan versi terbaru berdasarkan updatedAt
      const remoteTime = Date.parse(remote.updatedAt || remote.finishedAt) || 0;
      const localTime =
        Date.parse(existingLocal.updatedAt || existingLocal.finishedAt) || 0;
      if (remoteTime >= localTime) {
        byId.set(remote.id, { ...remote, syncStatus: 'synced' });
      }
    }
    // Jika existingLocal belum tersinkronisasi ('pending' / 'failed'),
    // pertahankan versi lokal hingga sinkronisasi dikonfirmasi!
  }

  return Array.from(byId.values()).sort((a, b) => {
    const timeA = Date.parse(a.finishedAt) || 0;
    const timeB = Date.parse(b.finishedAt) || 0;
    return timeB - timeA;
  });
}

// ============================================================================
// INDEXEDDB + LOCALSTORAGE PERSISTENCE LAYER
// ============================================================================

function openIndexedDb(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || !('indexedDB' in window)) {
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    try {
      const req = window.indexedDB.open(IDB_NAME, IDB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_MATCHES)) {
          db.createObjectStore(STORE_MATCHES, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(STORE_CHECKPOINT)) {
          db.createObjectStore(STORE_CHECKPOINT, { keyPath: 'id' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

function readLocalMatchesFallback(): MatchResultRecord[] {
  if (typeof window === 'undefined' || !window.localStorage) return [];
  try {
    const raw = window.localStorage.getItem(LS_MATCHES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocalMatchesFallback(records: MatchResultRecord[]): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    // Simpan hingga 100 riwayat terakhir di localStorage sebagai cermin cepat
    window.localStorage.setItem(
      LS_MATCHES_KEY,
      JSON.stringify(records.slice(0, 100))
    );
  } catch {
    // Abaikan jika kuota localStorage penuh; IndexedDB tetap menyimpan
  }
}

export async function getAllLocalMatches(): Promise<MatchResultRecord[]> {
  const lsRecords = readLocalMatchesFallback();
  const db = await openIndexedDb();
  if (!db) {
    return mergeMatchHistories(lsRecords, []);
  }

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_MATCHES, 'readonly');
      const store = tx.objectStore(STORE_MATCHES);
      const req = store.getAll();
      req.onsuccess = () => {
        const idbRecords = Array.isArray(req.result)
          ? (req.result as MatchResultRecord[])
          : [];
        const merged = mergeMatchHistories(idbRecords, lsRecords);
        resolve(merged);
      };
      req.onerror = () => resolve(lsRecords);
    } catch {
      resolve(lsRecords);
    }
  });
}

export async function putLocalMatch(
  record: MatchResultRecord
): Promise<MatchResultRecord[]> {
  const current = await getAllLocalMatches();
  const updated = [
    record,
    ...current.filter((item) => item.id !== record.id),
  ].sort((a, b) => (Date.parse(b.finishedAt) || 0) - (Date.parse(a.finishedAt) || 0));

  writeLocalMatchesFallback(updated);

  const db = await openIndexedDb();
  if (db) {
    await new Promise<void>((resolve) => {
      try {
        const tx = db.transaction(STORE_MATCHES, 'readwrite');
        tx.objectStore(STORE_MATCHES).put(record);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  }

  broadcastLocalUpdate();
  return updated;
}

// ============================================================================
// KETAHANAN TERHADAP GANGGUAN LISTRIK (ACTIVE MATCH CHECKPOINT)
// ============================================================================

export function saveActiveCheckpoint(checkpoint: ActiveMatchCheckpoint): void {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(
        LS_CHECKPOINT_KEY,
        JSON.stringify(checkpoint)
      );
    } catch {
      // Abaikan jika gagal
    }
  }

  void openIndexedDb().then((db) => {
    if (!db) return;
    try {
      const tx = db.transaction(STORE_CHECKPOINT, 'readwrite');
      tx.objectStore(STORE_CHECKPOINT).put({
        id: CHECKPOINT_ID,
        ...checkpoint,
      });
    } catch {
      // Abaikan
    }
  });
}

export function loadActiveCheckpointSync(): ActiveMatchCheckpoint | null {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  try {
    const raw = window.localStorage.getItem(LS_CHECKPOINT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ActiveMatchCheckpoint;
    if (
      parsed &&
      typeof parsed.matchId === 'string' &&
      parsed.secondsLeft > 0 &&
      parsed.problem &&
      parsed.blueTeam &&
      parsed.yellowTeam
    ) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export function clearActiveCheckpoint(): void {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.removeItem(LS_CHECKPOINT_KEY);
    } catch {
      // Abaikan
    }
  }

  void openIndexedDb().then((db) => {
    if (!db) return;
    try {
      const tx = db.transaction(STORE_CHECKPOINT, 'readwrite');
      tx.objectStore(STORE_CHECKPOINT).delete(CHECKPOINT_ID);
    } catch {
      // Abaikan
    }
  });
}

// ============================================================================
// SINKRONISASI SUPABASE & REALTIME SUBSCRIPTION
// ============================================================================

function isBrowserOnline(): boolean {
  if (typeof navigator === 'undefined') return true;
  return navigator.onLine !== false;
}

let broadcastChannel: BroadcastChannel | null = null;

function getBroadcastChannel(): BroadcastChannel | null {
  if (typeof window === 'undefined' || !('BroadcastChannel' in window)) {
    return null;
  }
  if (!broadcastChannel) {
    try {
      broadcastChannel = new BroadcastChannel('aqua_math_battle_sync_v1');
    } catch {
      return null;
    }
  }
  return broadcastChannel;
}

function broadcastLocalUpdate(): void {
  const ch = getBroadcastChannel();
  if (ch) {
    try {
      ch.postMessage({ type: 'MATCH_UPDATED', timestamp: Date.now() });
    } catch {
      // Abaikan
    }
  }
}

/**
 * Menyimpan hasil akhir ke penyimpanan lokal terlebih dahulu (Offline-First),
 * lalu mengirimkannya ke tabel Supabase `public.aqua_battle_matches` jika koneksi dan konfigurasi tersedia.
 */
export async function saveAndSyncMatchResult(
  record: MatchResultRecord,
  onStatusChange?: (state: SyncIndicatorState) => void
): Promise<{
  record: MatchResultRecord;
  indicator: SyncIndicatorState;
  errorMessage: string | null;
}> {
  // 1. Simpan ke penyimpanan lokal terlebih dahulu dengan status 'pending'
  const localPending: MatchResultRecord = {
    ...record,
    syncStatus: 'pending',
    lastSyncError: undefined,
    updatedAt: new Date().toISOString(),
  };
  await putLocalMatch(localPending);

  // 2. Periksa koneksi internet dan konfigurasi Supabase
  if (!isBrowserOnline()) {
    onStatusChange?.('offline_local');
    return {
      record: localPending,
      indicator: 'offline_local',
      errorMessage: null,
    };
  }

  const supabase = getSupabaseClient();
  if (!supabase) {
    // Jika Supabase belum dikonfigurasi pada environment, data tetap aman di penyimpanan lokal
    onStatusChange?.('offline_local');
    return {
      record: localPending,
      indicator: 'offline_local',
      errorMessage: null,
    };
  }

  // 3. Kirim ke Supabase (public.aqua_battle_matches) menggunakan upsert dengan onConflict: 'id'
  onStatusChange?.('syncing');
  try {
    const rowPayload = toSupabaseRow(localPending);
    const { error } = await supabase
      .from(SUPABASE_MATCH_TABLE)
      .upsert(rowPayload, { onConflict: 'id' });

    if (error) {
      const formattedErr = formatSupabaseErrorMessage(error);
      const failedRecord: MatchResultRecord = {
        ...localPending,
        syncStatus: 'failed',
        lastSyncError: formattedErr,
      };
      await putLocalMatch(failedRecord);
      onStatusChange?.('sync_failed');
      return {
        record: failedRecord,
        indicator: 'sync_failed',
        errorMessage: formattedErr,
      };
    }

    // 4. Konfirmasi sinkronisasi berhasil: tandai data lokal sebagai 'synced'
    const syncedRecord: MatchResultRecord = {
      ...localPending,
      syncStatus: 'synced',
      lastSyncError: undefined,
      updatedAt: new Date().toISOString(),
    };
    await putLocalMatch(syncedRecord);
    onStatusChange?.('online_synced');
    return {
      record: syncedRecord,
      indicator: 'online_synced',
      errorMessage: null,
    };
  } catch (err) {
    const formattedErr = formatSupabaseErrorMessage(err);
    const failedRecord: MatchResultRecord = {
      ...localPending,
      syncStatus: 'failed',
      lastSyncError: formattedErr,
    };
    await putLocalMatch(failedRecord);
    onStatusChange?.('sync_failed');
    return {
      record: failedRecord,
      indicator: 'sync_failed',
      errorMessage: formattedErr,
    };
  }
}

/**
 * Mengirim seluruh antrean data lokal yang belum tersinkronisasi ('pending' atau 'failed')
 * ke tabel Supabase `public.aqua_battle_matches` dan mengambil riwayat terbaru lintas perangkat.
 */
export async function syncAllPendingAndFetchHistory(
  onStatusChange?: (state: SyncIndicatorState) => void
): Promise<{
  matches: MatchResultRecord[];
  indicator: SyncIndicatorState;
  errorMessage: string | null;
}> {
  const localMatches = await getAllLocalMatches();
  const pendingList = localMatches.filter((m) => m.syncStatus !== 'synced');

  if (!isBrowserOnline()) {
    onStatusChange?.('offline_local');
    return {
      matches: localMatches,
      indicator: 'offline_local',
      errorMessage: null,
    };
  }

  const supabase = getSupabaseClient();
  if (!supabase) {
    // Jangan mengklaim database online jika Supabase belum dikonfigurasi
    onStatusChange?.('offline_local');
    return {
      matches: localMatches,
      indicator: 'offline_local',
      errorMessage: null,
    };
  }

  onStatusChange?.('syncing');
  let hadSyncError = false;
  let latestErrorMessage: string | null = null;

  // 1. Kirim seluruh antrean lokal yang belum tersinkronisasi
  for (const item of pendingList) {
    try {
      const { error } = await supabase
        .from(SUPABASE_MATCH_TABLE)
        .upsert(toSupabaseRow(item), { onConflict: 'id' });

      if (error) {
        hadSyncError = true;
        const formattedErr = formatSupabaseErrorMessage(error);
        latestErrorMessage = formattedErr;
        await putLocalMatch({
          ...item,
          syncStatus: 'failed',
          lastSyncError: formattedErr,
        });
      } else {
        await putLocalMatch({
          ...item,
          syncStatus: 'synced',
          lastSyncError: undefined,
          updatedAt: new Date().toISOString(),
        });
      }
    } catch (err) {
      hadSyncError = true;
      const formattedErr = formatSupabaseErrorMessage(err);
      latestErrorMessage = formattedErr;
      await putLocalMatch({
        ...item,
        syncStatus: 'failed',
        lastSyncError: formattedErr,
      });
    }
  }

  // 2. Ambil riwayat pertandingan dari tabel Supabase `public.aqua_battle_matches`
  try {
    const schoolId = getSchoolId();
    const { data, error } = await supabase
      .from(SUPABASE_MATCH_TABLE)
      .select('*')
      .order('finished_at', { ascending: false })
      .limit(50);

    const refreshedLocal = await getAllLocalMatches();

    if (error || !Array.isArray(data)) {
      if (error) {
        latestErrorMessage =
          latestErrorMessage ?? formatSupabaseErrorMessage(error);
      }
      const indicator: SyncIndicatorState =
        hadSyncError || Boolean(error) ? 'sync_failed' : 'online_synced';
      onStatusChange?.(indicator);
      return {
        matches: refreshedLocal,
        indicator,
        errorMessage: latestErrorMessage,
      };
    }

    const remoteMapped = (data as SupabaseMatchRow[])
      .map(fromSupabaseRow)
      .filter((m) => !m.schoolId || m.schoolId === schoolId);
    const merged = mergeMatchHistories(refreshedLocal, remoteMapped);

    // Simpan hasil gabungan ke penyimpanan lokal tanpa menghapus antrean lokal
    writeLocalMatchesFallback(merged);
    const db = await openIndexedDb();
    if (db) {
      try {
        const tx = db.transaction(STORE_MATCHES, 'readwrite');
        const store = tx.objectStore(STORE_MATCHES);
        for (const m of merged) {
          store.put(m);
        }
      } catch {
        // Abaikan
      }
    }

    const stillUnsynced = merged.some((m) => m.syncStatus !== 'synced');
    const finalIndicator: SyncIndicatorState =
      hadSyncError || stillUnsynced ? 'sync_failed' : 'online_synced';
    onStatusChange?.(finalIndicator);
    return {
      matches: merged,
      indicator: finalIndicator,
      errorMessage: latestErrorMessage,
    };
  } catch (err) {
    const refreshedLocal = await getAllLocalMatches();
    latestErrorMessage = latestErrorMessage ?? formatSupabaseErrorMessage(err);
    const finalIndicator: SyncIndicatorState = hadSyncError
      ? 'sync_failed'
      : 'offline_local';
    onStatusChange?.(finalIndicator);
    return {
      matches: refreshedLocal,
      indicator: finalIndicator,
      errorMessage: latestErrorMessage,
    };
  }
}

/**
 * Subscription Realtime yang hemat koneksi:
 * Hanya membuat 1 channel untuk tabel `public.aqua_battle_matches`,
 * serta menutup koneksi secara bersih saat komponen di-unmount.
 */
export function subscribeToMatchResultsRealtime(
  onRemoteChange: () => void
): () => void {
  const ch = getBroadcastChannel();
  const handleBroadcast = () => {
    onRemoteChange();
  };
  if (ch) {
    ch.addEventListener('message', handleBroadcast);
  }

  const supabase = getSupabaseClient();
  if (!supabase || !isSupabaseConfigured()) {
    return () => {
      if (ch) {
        ch.removeEventListener('message', handleBroadcast);
      }
    };
  }

  const schoolId = getSchoolId();
  const realtimeChannel = supabase
    .channel(`aqua-battle-matches-${schoolId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: SUPABASE_MATCH_TABLE,
      },
      () => {
        onRemoteChange();
      }
    )
    .subscribe();

  return () => {
    if (ch) {
      ch.removeEventListener('message', handleBroadcast);
    }
    void supabase.removeChannel(realtimeChannel);
  };
}
