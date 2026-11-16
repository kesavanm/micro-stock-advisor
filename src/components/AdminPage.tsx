import { useCallback, useEffect, useRef, useState } from 'react';
import type { Dispatch, FormEvent, SetStateAction } from 'react';
import {
  Lock, Unlock, RefreshCw, Trash2, Hammer, Package,
  Sun, Moon, Monitor, CheckCircle, XCircle, Loader2, Terminal,
  ChevronDown, ChevronUp, LogOut, Wifi, ShieldCheck, Rocket,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';
import type { Theme } from '../hooks/useTheme';

// Admin API lives at /advisor/api/admin/ (Apache proxies to localhost:8081).
// In dev, vite.config.ts proxies the same path.
const ADMIN_API = '/advisor/api/admin';
const TOKEN_KEY = 'msp_admin_token';
const TOKEN_EXP_KEY = 'msp_admin_token_exp';

// ─── Types ────────────────────────────────────────────────────────────────────
interface CacheData {
  updatedAt: string;
  timestamp?: number;
  ttlHours: number;
  trendingTickers: string[];
  suggestions: string[];
  error?: string;
}

interface StatusData {
  ok: boolean;
  uptime: number;
  time: string;
  projectDir: string;
  deployDir: string;
  cache: CacheData | null;
  assets: string[];
  activeBundle: { js: string | null; css: string | null };
  staleAssets: string[];
  buildRunning: boolean;
  lastBuildAt: string | null;
  lastBuildFinishedAt: string | null;
  lastBuildResult: 'success' | 'error' | null;
}

interface ApiResult<T> {
  ok: boolean;
  status: number;
  data: T | null;
  error?: string;
}

type ActionState = 'idle' | 'loading' | 'success' | 'error';

interface ActionResult {
  state: ActionState;
  message: string;
}

const idleResult = (): ActionResult => ({ state: 'idle', message: '' });

// ─── Storage helpers ─────────────────────────────────────────────────────────
function readStoredToken(): string {
  try {
    const token = sessionStorage.getItem(TOKEN_KEY) || '';
    const expiresAt = Number(sessionStorage.getItem(TOKEN_EXP_KEY) || 0);
    if (token && expiresAt && expiresAt <= Date.now()) {
      sessionStorage.removeItem(TOKEN_KEY);
      sessionStorage.removeItem(TOKEN_EXP_KEY);
      return '';
    }
    return token;
  } catch {
    return '';
  }
}

function storeSession(token: string, expiresAtMs: number) {
  try {
    sessionStorage.setItem(TOKEN_KEY, token);
    sessionStorage.setItem(TOKEN_EXP_KEY, String(expiresAtMs));
  } catch {
    // Session storage is best-effort; the in-memory token still works.
  }
}

function clearStoredSession() {
  try {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(TOKEN_EXP_KEY);
  } catch {
    // Ignore.
  }
}

// ─── API helper ──────────────────────────────────────────────────────────────
async function adminFetch<T = unknown>(
  token: string,
  endpoint: string,
  method: 'GET' | 'POST' | 'DELETE' = 'GET',
  body?: unknown
): Promise<ApiResult<T>> {
  try {
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    if (body !== undefined) headers['Content-Type'] = 'application/json';

    const options: RequestInit = { method, cache: 'no-store', headers };
    if (body !== undefined) options.body = JSON.stringify(body);

    const res = await fetch(`${ADMIN_API}${endpoint}`, options);

    const text = await res.text();
    let data: unknown = null;
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = { error: text };
      }
    }

    const error = !res.ok
      ? (data as { error?: string } | null)?.error || `Request failed (HTTP ${res.status}).`
      : undefined;

    return { ok: res.ok, status: res.status, data: data as T, error };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Network error';
    return { ok: false, status: 0, data: null, error: message };
  }
}

// ─── Sub-components ──────────────────────────────────────────────────────────
function ActionButton({
  label,
  icon: Icon,
  onClick,
  result,
  confirmLabel,
  description,
  tone = 'default',
}: {
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  result: ActionResult;
  confirmLabel?: string;
  description?: string;
  tone?: 'default' | 'danger' | 'primary';
}) {
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!confirming) return;
    const timer = window.setTimeout(() => setConfirming(false), 4000);
    return () => window.clearTimeout(timer);
  }, [confirming]);

  const handleClick = () => {
    if (confirmLabel && !confirming) {
      setConfirming(true);
      return;
    }
    setConfirming(false);
    onClick();
  };

  const isLoading = result.state === 'loading';

  const toneClasses = confirming
    ? 'bg-orange-50 dark:bg-orange-500/20 border-orange-400 text-orange-700 dark:text-orange-300'
    : isLoading
      ? 'bg-slate-100 dark:bg-slate-700/50 border-slate-300 dark:border-slate-600 text-slate-500 dark:text-slate-400 cursor-wait'
      : tone === 'primary'
        ? 'bg-emerald-600 border-emerald-600 text-white hover:bg-emerald-500 hover:border-emerald-500'
        : tone === 'danger'
          ? 'bg-white dark:bg-slate-800 border-rose-300 dark:border-rose-500/50 text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-500/10'
          : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700';

  return (
    <div className="flex flex-col gap-1.5">
      <button
        type="button"
        onClick={handleClick}
        disabled={isLoading}
        className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all border active:scale-[0.99] disabled:active:scale-100 ${toneClasses}`}
      >
        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Icon className="w-4 h-4 shrink-0" />}
        <span className="text-left">{confirming ? confirmLabel || label : label}</span>
      </button>
      {description && !confirming && (
        <p className="text-[11px] leading-tight text-slate-500 dark:text-slate-500 px-1">{description}</p>
      )}
      {result.state !== 'idle' && result.message && (
        <div
          aria-live="polite"
          className={`flex items-start gap-1.5 text-xs px-1 ${
            result.state === 'success'
              ? 'text-emerald-700 dark:text-emerald-400'
              : result.state === 'error'
                ? 'text-rose-700 dark:text-rose-400'
                : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          {result.state === 'success' && <CheckCircle className="w-3 h-3 mt-0.5 shrink-0" />}
          {result.state === 'error' && <XCircle className="w-3 h-3 mt-0.5 shrink-0" />}
          <span className="leading-tight break-words">{result.message}</span>
        </div>
      )}
    </div>
  );
}

function StatusPanel({
  status,
  loading,
  error,
  onRefresh,
}: {
  status: StatusData | null;
  loading: boolean;
  error: string;
  onRefresh: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  if (error) {
    return (
      <div className="rounded-xl border border-rose-300 dark:border-rose-500/40 bg-rose-50 dark:bg-rose-950/30 p-4 text-sm text-rose-700 dark:text-rose-300 flex items-start gap-2">
        <XCircle className="w-4 h-4 mt-0.5 shrink-0" />
        <span>{error}</span>
      </div>
    );
  }

  if (!status) {
    return (
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-4 text-sm text-slate-500 dark:text-slate-400 flex items-center gap-2">
        <Loader2 className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        {loading ? 'Loading admin status…' : 'No status available yet.'}
      </div>
    );
  }

  const active = new Set([status.activeBundle.js, status.activeBundle.css].filter(Boolean));

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 text-xs font-semibold">
          <Wifi className="w-3.5 h-3.5" />
          <span>Admin server online</span>
          <span className="text-slate-400 dark:text-slate-600">·</span>
          <span className="text-slate-500 dark:text-slate-400 font-normal">
            uptime {formatUptime(status.uptime)}
          </span>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 flex items-center gap-1 disabled:opacity-50"
        >
          <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Cache */}
        <div className="space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Trending cache
          </p>
          {status.cache ? (
            <>
              <p className="text-xs font-mono text-emerald-700 dark:text-emerald-400 break-words">
                {status.cache.trendingTickers?.length
                  ? status.cache.trendingTickers.join(', ')
                  : 'No tickers in cache'}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-500">
                Updated {formatDate(status.cache.updatedAt)} · TTL {status.cache.ttlHours}h
              </p>
            </>
          ) : (
            <p className="text-xs text-rose-700 dark:text-rose-400">No cache file found</p>
          )}
        </div>

        {/* Active bundle */}
        <div className="space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Active bundle
          </p>
          <p className="text-xs font-mono text-slate-700 dark:text-slate-300 break-all">
            {status.activeBundle.js || 'No JS bundle detected'}
          </p>
          <p className="text-xs font-mono text-slate-700 dark:text-slate-300 break-all">
            {status.activeBundle.css || 'No CSS bundle detected'}
          </p>
        </div>
      </div>

      {/* Assets */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Deployed assets
          </p>
          <span className={`text-[11px] ${status.staleAssets.length ? 'text-amber-700 dark:text-amber-400' : 'text-emerald-700 dark:text-emerald-400'}`}>
            {status.staleAssets.length ? `${status.staleAssets.length} stale` : 'all active'}
          </span>
        </div>
        <div className="flex flex-wrap gap-1">
          {status.assets.length === 0 && (
            <span className="text-xs text-slate-500 dark:text-slate-500">No asset files found.</span>
          )}
          {status.assets.map((asset) => (
            <span
              key={asset}
              className={`text-[11px] font-mono px-2 py-0.5 rounded border ${
                active.has(asset)
                  ? 'bg-emerald-50 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700/50'
                  : 'bg-rose-50 dark:bg-rose-900/50 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-700/50'
              }`}
            >
              {asset}
            </span>
          ))}
        </div>
        <p className="text-[11px] text-slate-500 dark:text-slate-600">
          Green = referenced by index.html · Red = safe to remove
        </p>
      </div>

      {/* Build state */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500 dark:text-slate-400">
        {status.buildRunning ? (
          <span className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400">
            <Loader2 className="w-3 h-3 animate-spin" /> Build in progress…
          </span>
        ) : status.lastBuildResult ? (
          <span className={status.lastBuildResult === 'success'
            ? 'text-emerald-700 dark:text-emerald-400'
            : 'text-rose-700 dark:text-rose-400'}>
            Last build: {status.lastBuildResult}
            {status.lastBuildFinishedAt ? ` · ${formatDate(status.lastBuildFinishedAt)}` : ''}
          </span>
        ) : (
          <span>No build has run from this panel yet.</span>
        )}
        <span className="font-mono text-slate-400 dark:text-slate-600 break-all">{status.deployDir}</span>
      </div>

      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
      >
        {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        {expanded ? 'Hide raw status' : 'Show raw status'}
      </button>
      {expanded && (
        <pre className="text-[11px] font-mono text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-950 rounded-lg p-3 overflow-auto max-h-56 border border-slate-200 dark:border-slate-800">
          {JSON.stringify(status, null, 2)}
        </pre>
      )}
    </div>
  );
}

function BuildLogPanel({ token, autoStartKey }: { token: string; autoStartKey: number }) {
  const [log, setLog] = useState('');
  const [running, setRunning] = useState(false);
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState('');
  const intervalRef = useRef<number | null>(null);
  const preRef = useRef<HTMLPreElement | null>(null);

  const stopPolling = useCallback(() => {
    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const fetchLog = useCallback(async () => {
    const result = await adminFetch<{ log: string; running: boolean; result: string | null }>(
      token,
      '/build-log'
    );

    if (!result.ok || !result.data) {
      setError(result.error || 'Could not read build log.');
      stopPolling();
      return;
    }

    setError('');
    setLog(result.data.log || 'No log yet.');
    setRunning(!!result.data.running);

    if (!result.data.running) stopPolling();
  }, [stopPolling, token]);

  const startPolling = useCallback(() => {
    setVisible(true);
    void fetchLog();
    if (intervalRef.current === null) {
      intervalRef.current = window.setInterval(() => {
        void fetchLog();
      }, 2500);
    }
  }, [fetchLog]);

  useEffect(() => {
    if (autoStartKey > 0) startPolling();
  }, [autoStartKey, startPolling]);

  useEffect(() => {
    if (!visible) return;
    const pre = preRef.current;
    if (pre) pre.scrollTop = pre.scrollHeight;
  }, [log, visible]);

  useEffect(() => () => stopPolling(), [stopPolling]);

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={startPolling}
        className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
      >
        <Terminal className="w-3.5 h-3.5" />
        {visible ? 'Refresh build log' : 'Show build log'}
        {running && <Loader2 className="w-3 h-3 animate-spin text-amber-600 dark:text-amber-400" />}
      </button>

      {visible && (
        <>
          {error && (
            <p className="text-xs text-rose-700 dark:text-rose-400 flex items-center gap-1.5">
              <XCircle className="w-3 h-3" /> {error}
            </p>
          )}
          <pre
            ref={preRef}
            className="text-[11px] leading-relaxed font-mono text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-950 rounded-lg p-4 overflow-auto max-h-72 border border-slate-200 dark:border-slate-700"
          >
            {log || 'No log yet…'}
          </pre>
        </>
      )}
    </div>
  );
}

// ─── Formatting helpers ──────────────────────────────────────────────────────
function formatDate(value: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function formatUptime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '—';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m`;
  return `${seconds}s`;
}

// ─── Main AdminPage ──────────────────────────────────────────────────────────
export function AdminPage({ onClose }: { onClose: () => void }) {
  const [token, setToken] = useState<string>(() => readStoredToken());
  const [inputPw, setInputPw] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);

  const [status, setStatus] = useState<StatusData | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [statusError, setStatusError] = useState('');

  const [cacheRefreshResult, setCacheRefreshResult] = useState<ActionResult>(idleResult);
  const [cacheDeleteResult, setCacheDeleteResult] = useState<ActionResult>(idleResult);
  const [staleAssetsResult, setStaleAssetsResult] = useState<ActionResult>(idleResult);
  const [deployResult, setDeployResult] = useState<ActionResult>(idleResult);
  const [buildResult, setBuildResult] = useState<ActionResult>(idleResult);
  const [buildLogKey, setBuildLogKey] = useState(0);

  const { theme, resolved, setTheme } = useTheme();
  const isAuthenticated = !!token;

  const logoutLocal = useCallback((message = '') => {
    clearStoredSession();
    setToken('');
    setStatus(null);
    setStatusError('');
    setLoginError(message);
  }, []);

  // ── Fetch status ───────────────────────────────────────────────────────────
  const fetchStatus = useCallback(async () => {
    if (!token) return;
    setStatusLoading(true);
    setStatusError('');

    const result = await adminFetch<StatusData>(token, '/status');
    setStatusLoading(false);

    if (result.ok && result.data) {
      setStatus(result.data);
      return;
    }

    if (result.status === 401) {
      logoutLocal('Session expired — please log in again.');
      return;
    }

    setStatusError(result.error || 'Could not load admin status.');
  }, [logoutLocal, token]);

  useEffect(() => {
    void fetchStatus();
  }, [fetchStatus]);

  // ── Login / logout ─────────────────────────────────────────────────────────
  const handleLogin = async (event: FormEvent) => {
    event.preventDefault();
    if (!inputPw.trim() || loggingIn) return;

    setLoggingIn(true);
    setLoginError('');

    const result = await adminFetch<{
      ok: boolean;
      token: string;
      expiresAt: string;
      ttlSeconds: number;
    }>('', '/login', 'POST', { password: inputPw });

    setLoggingIn(false);

    if (!result.ok || !result.data?.token) {
      setLoginError(result.error || 'Invalid password.');
      return;
    }

    const expiresAtMs = Date.parse(result.data.expiresAt);
    storeSession(result.data.token, Number.isFinite(expiresAtMs) ? expiresAtMs : Date.now() + 8 * 60 * 60 * 1000);
    setInputPw('');
    setToken(result.data.token);
  };

  const handleLogout = async () => {
    if (token) await adminFetch(token, '/logout', 'POST');
    logoutLocal();
  };

  // ── Action runner ──────────────────────────────────────────────────────────
  const runAction = useCallback(
    async (
      setter: Dispatch<SetStateAction<ActionResult>>,
      request: () => Promise<ApiResult<Record<string, unknown>>>,
      successMessage: (data: Record<string, unknown> | null) => string,
      onSuccess?: () => void
    ) => {
      setter({ state: 'loading', message: '' });
      const result = await request();

      if (result.ok) {
        setter({ state: 'success', message: successMessage(result.data) });
        onSuccess?.();
        void fetchStatus();
      } else if (result.status === 401) {
        setter(idleResult());
        logoutLocal('Session expired — please log in again.');
        return;
      } else {
        setter({ state: 'error', message: result.error || 'Unknown error.' });
      }

      window.setTimeout(() => setter(idleResult()), 12000);
    },
    [fetchStatus, logoutLocal]
  );

  const handleRefreshCache = () => runAction(
    setCacheRefreshResult,
    () => adminFetch(token, '/refresh-cache', 'POST'),
    (data) => {
      const cache = data?.cache as CacheData | undefined;
      return cache?.trendingTickers?.length
        ? `Cache refreshed → ${cache.trendingTickers.join(', ')}`
        : 'Trending cache refreshed.';
    }
  );

  const handleDeleteCache = () => runAction(
    setCacheDeleteResult,
    () => adminFetch(token, '/cache', 'DELETE'),
    (data) => String(data?.message || 'Cache files deleted.')
  );

  const handleRemoveStaleAssets = () => runAction(
    setStaleAssetsResult,
    () => adminFetch(token, '/stale-assets', 'DELETE'),
    (data) => {
      const removed = data?.removed as string[] | undefined;
      return removed?.length ? `Removed: ${removed.join(', ')}` : 'No stale assets found.';
    }
  );

  const handleHardRefresh = () => runAction(
    setDeployResult,
    () => adminFetch(token, '/deploy', 'POST'),
    (data) => {
      const bundle = data?.activeBundle as { js?: string | null } | undefined;
      const pruned = data?.pruned as string[] | undefined;
      return `Deployed ${bundle?.js || 'current bundle'}${pruned?.length ? ` · removed ${pruned.length} stale file(s)` : ''}. Reload the dashboard.`;
    }
  );

  const handleBuild = () => runAction(
    setBuildResult,
    () => adminFetch(token, '/build', 'POST'),
    () => 'Build started — watching the log below.',
    () => setBuildLogKey((key) => key + 1)
  );

  // ── Theme options ──────────────────────────────────────────────────────────
  const themeOptions: Array<{ value: Theme; label: string; icon: LucideIcon }> = [
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'system', label: 'System', icon: Monitor },
  ];

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-100/95 dark:bg-slate-950/95 backdrop-blur-sm">
      <div className="min-h-full flex items-start justify-center p-4 sm:p-8">
        <div className="w-full max-w-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl overflow-hidden">

          {/* Header */}
          <div className="flex items-center justify-between gap-3 px-5 sm:px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950">
            <div className="flex items-center gap-2.5 min-w-0">
              {isAuthenticated
                ? <Unlock className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                : <Lock className="w-5 h-5 text-slate-500 dark:text-slate-400 shrink-0" />}
              <span className="font-semibold text-slate-900 dark:text-slate-100">Admin Panel</span>
              <span className="hidden sm:inline text-xs text-slate-500 dark:text-slate-500 font-mono truncate">
                MicroStock Predictor
              </span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 text-sm px-2 py-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 transition"
              aria-label="Close admin panel"
            >
              ✕
            </button>
          </div>

          <div className="p-5 sm:p-6 space-y-6">

            {/* ── Login ── */}
            {!isAuthenticated ? (
              <form onSubmit={handleLogin} className="space-y-4 max-w-md mx-auto py-4">
                <div className="text-center space-y-1">
                  <div className="mx-auto w-11 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 flex items-center justify-center">
                    <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <h2 className="font-display font-bold text-lg text-slate-900 dark:text-slate-100">
                    Password required
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Enter the <code className="font-mono">ADMIN_PASSWORD</code> from the project&apos;s <code className="font-mono">.env</code> file.
                  </p>
                </div>

                <div className="space-y-2">
                  <label htmlFor="admin-password" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Admin password
                  </label>
                  <div className="flex gap-2">
                    <input
                      id="admin-password"
                      type="password"
                      value={inputPw}
                      onChange={(event) => setInputPw(event.target.value)}
                      placeholder="Admin password"
                      autoFocus
                      autoComplete="current-password"
                      className="flex-1 min-w-0 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                    />
                    <button
                      type="submit"
                      disabled={loggingIn || !inputPw.trim()}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:hover:bg-emerald-600 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                    >
                      {loggingIn ? <Loader2 className="w-4 h-4 animate-spin" /> : <Unlock className="w-4 h-4" />}
                      Login
                    </button>
                  </div>
                  {loginError && (
                    <p aria-live="polite" className="text-xs text-rose-700 dark:text-rose-400 flex items-center gap-1.5">
                      <XCircle className="w-3 h-3 shrink-0" /> {loginError}
                    </p>
                  )}
                </div>

                <p className="text-[11px] text-center text-slate-500 dark:text-slate-500">
                  Sessions last 8 hours and are stored only in this tab.
                </p>
              </form>
            ) : (
              <>
                {/* ── Authenticated header row ── */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-400">
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Authenticated</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        const url = new URL(window.location.href);
                        url.searchParams.set('v', String(Date.now()));
                        window.location.replace(url.toString());
                      }}
                      className="text-xs text-slate-500 dark:text-slate-400 hover:text-cyan-700 dark:hover:text-cyan-300 flex items-center gap-1"
                      title="Reload index.html, CSS, and JS with a cache-busting URL"
                    >
                      <RefreshCw className="w-3 h-3" />
                      Hard reload page
                    </button>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="text-xs text-slate-500 dark:text-slate-400 hover:text-rose-700 dark:hover:text-rose-400 flex items-center gap-1"
                    >
                      <LogOut className="w-3 h-3" />
                      Logout
                    </button>
                  </div>
                </div>

                {/* ── Live status ── */}
                <StatusPanel
                  status={status}
                  loading={statusLoading}
                  error={statusError}
                  onRefresh={() => void fetchStatus()}
                />

                {/* ── Cache actions ── */}
                <section className="space-y-2">
                  <h3 className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Trending cache
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <ActionButton
                      label="Refresh cache now"
                      icon={RefreshCw}
                      onClick={handleRefreshCache}
                      result={cacheRefreshResult}
                      description="Re-runs the Finnhub morning-news scanner and updates the deployed cache."
                    />
                    <ActionButton
                      label="Delete cache files"
                      icon={Trash2}
                      onClick={handleDeleteCache}
                      result={cacheDeleteResult}
                      confirmLabel="Click again to delete"
                      description="Removes public, dist, and deployed trending-cache.json files."
                      tone="danger"
                    />
                  </div>
                </section>

                {/* ── Assets & deploy ── */}
                <section className="space-y-2">
                  <h3 className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Assets &amp; deployment
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <ActionButton
                      label="Hard refresh (deploy dist)"
                      icon={Rocket}
                      onClick={handleHardRefresh}
                      result={deployResult}
                      description="Re-copies dist/index.html, CSS, JS, and public files to Apache without rebuilding."
                      tone="primary"
                    />
                    <ActionButton
                      label="Remove stale assets"
                      icon={Package}
                      onClick={handleRemoveStaleAssets}
                      result={staleAssetsResult}
                      confirmLabel="Click again to remove"
                      description="Deletes old hashed bundles that index.html no longer references."
                      tone="danger"
                    />
                    <ActionButton
                      label="Build &amp; deploy new version"
                      icon={Hammer}
                      onClick={handleBuild}
                      result={buildResult}
                      confirmLabel="Click again to build"
                      description="Runs npm run build, deploys the new bundle, and prunes stale assets."
                      tone="primary"
                    />
                  </div>
                  <BuildLogPanel token={token} autoStartKey={buildLogKey} />
                </section>

                {/* ── Theme ── */}
                <section className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Appearance
                    </h3>
                    <span className="text-[11px] text-slate-500 dark:text-slate-500">
                      Active: {resolved}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {themeOptions.map(({ value, label, icon: Icon }) => {
                      const selected = theme === value;
                      return (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setTheme(value)}
                          aria-pressed={selected}
                          className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-medium transition ${
                            selected
                              ? 'bg-emerald-50 dark:bg-emerald-500/15 border-emerald-400 dark:border-emerald-500/50 text-emerald-700 dark:text-emerald-300'
                              : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                          {label}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-500">
                    The choice is saved in this browser and applies to the dashboard immediately.
                  </p>
                </section>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
