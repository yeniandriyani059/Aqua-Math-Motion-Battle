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

interface SupabaseMatchRow {
  id: string;
  school_id: string;
  session_id: string;
  started_at: string;
  finished_at: string;
  updated_at: string;
  battle_mode: BattleMode;
  level: DifficultyLevel;
  duration_seconds: number;
  total_questions: number;
  blue_score: number;
  yellow_score: number;
  blue_correct: number;
  blue_wrong: number;
  yellow_correct: number;
  yellow_wrong: number;
  winner: TeamId | 'draw';
  match_status: 'in_progress' | 'completed' | 'finished_early';
  round_history: RoundHistoryItem[];
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
  return {
    id: record.id,
    school_id: record.schoolId,
    session_id: record.sessionId,
    started_at: record.startedAt,
    finished_at: record.finishedAt,
    updated_at: record.updatedAt,
    battle_mode: record.battleMode,
    level: record.level,
    duration_seconds: record.durationSeconds,
    total_questions: record.totalQuestions,
    blue_score: record.blueScore,
    yellow_score: record.yellowScore,
    blue_correct: record.blueCorrect,
    blue_wrong: record.blueWrong,
    yellow_correct: record.yellowCorrect,
    yellow_wrong: record.yellowWrong,
    winner: record.winner,
    match_status: record.matchStatus,
    round_history: Array.isArray(record.roundHistory)
      ? record.roundHistory
      : [],
  };
}

export function fromSupabaseRow(row: SupabaseMatchRow): MatchResultRecord {
  return {
    id: row.id,
    schoolId: row.school_id,
    sessionId: row.session_id,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
    updatedAt: row.updated_at || row.finished_at,
    battleMode: row.battle_mode === 'motion' ? 'motion' : 'touch',
    level:
      row.level === 'level2' || row.level === 'level3' ? row.level : 'level1',
    durationSeconds: Number(row.duration_seconds) || 120,
    totalQuestions: Number(row.total_questions) || 5,
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
    roundHistory: Array.isArray(row.round_history) ? row.round_history : [],
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
 * lalu mengirimkannya ke Supabase jika koneksi dan konfigurasi tersedia.
 */
export async function saveAndSyncMatchResult(
  record: MatchResultRecord,
  onStatusChange?: (state: SyncIndicatorState) => void
): Promise<{
  record: MatchResultRecord;
  indicator: SyncIndicatorState;
}> {
  // 1. Simpan ke penyimpanan lokal terlebih dahulu dengan status 'pending'
  const localPending: MatchResultRecord = {
    ...record,
    syncStatus: 'pending',
    updatedAt: new Date().toISOString(),
  };
  await putLocalMatch(localPending);

  // 2. Periksa koneksi internet dan konfigurasi Supabase
  if (!isBrowserOnline()) {
    onStatusChange?.('offline_local');
    return { record: localPending, indicator: 'offline_local' };
  }

  const supabase = getSupabaseClient();
  if (!supabase) {
    // Jika Supabase belum dikonfigurasi pada environment, data tetap aman di penyimpanan lokal
    onStatusChange?.('offline_local');
    return { record: localPending, indicator: 'offline_local' };
  }

  // 3. Kirim ke Supabase menggunakan upsert dengan onConflict: 'id' agar bebas duplikasi
  onStatusChange?.('syncing');
  try {
    const { error } = await supabase
      .from('match_results')
      .upsert(toSupabaseRow(localPending), { onConflict: 'id' });

    if (error) {
      const failedRecord: MatchResultRecord = {
        ...localPending,
        syncStatus: 'failed',
      };
      await putLocalMatch(failedRecord);
      onStatusChange?.('sync_failed');
      return { record: failedRecord, indicator: 'sync_failed' };
    }

    // 4. Konfirmasi sinkronisasi berhasil: tandai data lokal sebagai 'synced'
    const syncedRecord: MatchResultRecord = {
      ...localPending,
      syncStatus: 'synced',
      updatedAt: new Date().toISOString(),
    };
    await putLocalMatch(syncedRecord);
    onStatusChange?.('online_synced');
    return { record: syncedRecord, indicator: 'online_synced' };
  } catch {
    const failedRecord: MatchResultRecord = {
      ...localPending,
      syncStatus: 'failed',
    };
    await putLocalMatch(failedRecord);
    onStatusChange?.('sync_failed');
    return { record: failedRecord, indicator: 'sync_failed' };
  }
}

/**
 * Mengirim seluruh antrean data lokal yang belum tersinkronisasi ('pending' atau 'failed')
 * ke Supabase dan mengambil riwayat terbaru lintas perangkat (PID & Laptop).
 */
export async function syncAllPendingAndFetchHistory(
  onStatusChange?: (state: SyncIndicatorState) => void
): Promise<{
  matches: MatchResultRecord[];
  indicator: SyncIndicatorState;
}> {
  const localMatches = await getAllLocalMatches();
  const pendingList = localMatches.filter(
    (m) => m.syncStatus !== 'synced'
  );

  if (!isBrowserOnline()) {
    onStatusChange?.('offline_local');
    return { matches: localMatches, indicator: 'offline_local' };
  }

  const supabase = getSupabaseClient();
  if (!supabase) {
    // Jangan mengklaim database online jika Supabase belum dikonfigurasi
    onStatusChange?.('offline_local');
    return { matches: localMatches, indicator: 'offline_local' };
  }

  onStatusChange?.('syncing');
  let hadSyncError = false;

  // 1. Kirim seluruh antrean lokal yang belum tersinkronisasi
  for (const item of pendingList) {
    try {
      const { error } = await supabase
        .from('match_results')
        .upsert(toSupabaseRow(item), { onConflict: 'id' });

      if (error) {
        hadSyncError = true;
        await putLocalMatch({ ...item, syncStatus: 'failed' });
      } else {
        await putLocalMatch({
          ...item,
          syncStatus: 'synced',
          updatedAt: new Date().toISOString(),
        });
      }
    } catch {
      hadSyncError = true;
      await putLocalMatch({ ...item, syncStatus: 'failed' });
    }
  }

  // 2. Ambil riwayat pertandingan dari Supabase untuk school_id ini
  try {
    const schoolId = getSchoolId();
    const { data, error } = await supabase
      .from('match_results')
      .select('*')
      .eq('school_id', schoolId)
      .order('finished_at', { ascending: false })
      .limit(50);

    const refreshedLocal = await getAllLocalMatches();

    if (error || !Array.isArray(data)) {
      const indicator: SyncIndicatorState = hadSyncError
        ? 'sync_failed'
        : 'online_synced';
      onStatusChange?.(indicator);
      return { matches: refreshedLocal, indicator };
    }

    const remoteMapped = (data as SupabaseMatchRow[]).map(fromSupabaseRow);
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
    return { matches: merged, indicator: finalIndicator };
  } catch {
    const refreshedLocal = await getAllLocalMatches();
    const finalIndicator: SyncIndicatorState = hadSyncError
      ? 'sync_failed'
      : 'offline_local';
    onStatusChange?.(finalIndicator);
    return { matches: refreshedLocal, indicator: finalIndicator };
  }
}

/**
 * Subscription Realtime yang hemat koneksi:
 * Hanya membuat 1 channel untuk tabel `match_results` pada `school_id` aktif,
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
    .channel(`aqua-math-results-${schoolId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'match_results',
        filter: `school_id=eq.${schoolId}`,
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
