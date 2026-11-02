import { createClient, SupabaseClient } from '@supabase/supabase-js';

const PLACEHOLDER_URLS = new Set([
  '',
  'https://your-project-id.supabase.co',
  'YOUR_SUPABASE_URL',
  'MY_SUPABASE_URL',
]);

const PLACEHOLDER_KEYS = new Set([
  '',
  'your-supabase-anon-public-key',
  'YOUR_SUPABASE_ANON_KEY',
  'MY_SUPABASE_ANON_KEY',
]);

/**
 * Validasi keamanan: Pastikan key yang digunakan di frontend BUKAN service_role key.
 * Menolak string yang mengandung "service_role" baik secara langsung maupun di payload JWT.
 */
export function isSafePublishableKey(key: string): boolean {
  if (!key || typeof key !== 'string') return false;
  const trimmed = key.trim();
  if (PLACEHOLDER_KEYS.has(trimmed)) return false;

  const lower = trimmed.toLowerCase();
  if (lower.includes('service_role') || lower.startsWith('sb_secret_')) {
    return false;
  }

  // Periksa payload JWT jika berbentuk header.payload.signature
  const parts = trimmed.split('.');
  if (parts.length === 3) {
    try {
      const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const decoded =
        typeof atob === 'function'
          ? atob(base64)
          : Buffer.from(base64, 'base64').toString('utf8');
      if (decoded.toLowerCase().includes('"service_role"')) {
        return false;
      }
    } catch {
      // Abaikan jika bukan base64 standar
    }
  }

  return trimmed.length >= 16;
}

export function isValidSupabaseUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (PLACEHOLDER_URLS.has(trimmed)) return false;
  return /^https:\/\/[a-zA-Z0-9-]+(\.[a-zA-Z0-9-]+)+/.test(trimmed);
}

function getEnvVar(
  name: 'VITE_SUPABASE_URL' | 'VITE_SUPABASE_ANON_KEY' | 'VITE_SCHOOL_ID'
): string {
  try {
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      const val =
        name === 'VITE_SUPABASE_URL'
          ? import.meta.env.VITE_SUPABASE_URL
          : name === 'VITE_SUPABASE_ANON_KEY'
          ? import.meta.env.VITE_SUPABASE_ANON_KEY
          : import.meta.env.VITE_SCHOOL_ID;
      if (typeof val === 'string' && val.trim().length > 0) {
        return val.trim();
      }
    }
  } catch {
    // Fallback untuk Node test environment
  }
  if (typeof process !== 'undefined' && process.env && process.env[name]) {
    return String(process.env[name]).trim();
  }
  return '';
}

export function getSchoolId(): string {
  const configured = getEnvVar('VITE_SCHOOL_ID');
  return configured && configured.length >= 2 ? configured : 'sd-aqua-city';
}

const SESSION_STORAGE_KEY = 'aqua_math_device_session_id_v1';

export function getDeviceSessionId(): string {
  if (typeof window === 'undefined' || !window.localStorage) {
    return 'session-node-test';
  }
  try {
    const existing = window.localStorage.getItem(SESSION_STORAGE_KEY);
    if (existing && existing.length >= 6) {
      return existing;
    }
    const created = `dev-${Date.now().toString(36)}-${Math.random()
      .toString(36)
      .slice(2, 8)}`;
    window.localStorage.setItem(SESSION_STORAGE_KEY, created);
    return created;
  } catch {
    return `dev-mem-${Date.now().toString(36)}`;
  }
}

let cachedClient: SupabaseClient | null = null;

export function isSupabaseConfigured(): boolean {
  const url = getEnvVar('VITE_SUPABASE_URL');
  const anonKey = getEnvVar('VITE_SUPABASE_ANON_KEY');
  return isValidSupabaseUrl(url) && isSafePublishableKey(anonKey);
}

export function getSupabaseClient(): SupabaseClient | null {
  if (cachedClient) return cachedClient;

  const url = getEnvVar('VITE_SUPABASE_URL');
  const anonKey = getEnvVar('VITE_SUPABASE_ANON_KEY');

  if (!isValidSupabaseUrl(url) || !isSafePublishableKey(anonKey)) {
    return null;
  }

  cachedClient = createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    realtime: {
      params: {
        eventsPerSecond: 4,
      },
    },
  });

  return cachedClient;
}
