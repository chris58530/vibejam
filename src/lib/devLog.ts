export interface LogEntry {
  id: number;
  type: 'log' | 'warn' | 'error' | 'info';
  message: string;
  timestamp: number;
}

let entries: LogEntry[] = [];
let counter = 0;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach(fn => fn());
}

export const devLog = {
  addEntry(type: LogEntry['type'], message: string) {
    entries = [...entries.slice(-299), { id: counter++, type, message, timestamp: Date.now() }];
    notify();
  },
  getEntries: () => entries,
  clear() { entries = []; notify(); },
  subscribe(fn: () => void) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
  log:   (msg: string) => devLog.addEntry('log',   msg),
  warn:  (msg: string) => devLog.addEntry('warn',  msg),
  error: (msg: string) => devLog.addEntry('error', msg),
  info:  (msg: string) => devLog.addEntry('info',  msg),
};

// ── Intercept console ──────────────────────────────────────────────────────────
function serialize(args: unknown[]): string {
  return args.map(a => {
    if (a instanceof Error) return `${a.name}: ${a.message}`;
    if (typeof a === 'object' && a !== null) {
      try { return JSON.stringify(a); } catch { return String(a); }
    }
    return String(a);
  }).join(' ');
}

const _log   = console.log.bind(console);
const _warn  = console.warn.bind(console);
const _error = console.error.bind(console);

console.log   = (...a: unknown[]) => { _log(...a);   devLog.addEntry('log',   serialize(a)); };
console.warn  = (...a: unknown[]) => { _warn(...a);  devLog.addEntry('warn',  serialize(a)); };
console.error = (...a: unknown[]) => { _error(...a); devLog.addEntry('error', serialize(a)); };

window.addEventListener('error', ev => {
  devLog.addEntry('error', `[UNCAUGHT] ${ev.message} @ ${ev.filename}:${ev.lineno}`);
});
window.addEventListener('unhandledrejection', ev => {
  devLog.addEntry('error', `[PROMISE] ${String(ev.reason)}`);
});

// ── Boot-time URL capture ──────────────────────────────────────────────────────
// 在 supabase.ts 的 createClient 之前執行（devLog 是其依賴），
// 捕捉最原始的 URL（Supabase SDK 尚未有機會清除 ?code= 或 #access_token=）
try {
  const bootHref = window.location.href;
  const bootSearch = window.location.search;
  const bootHash = window.location.hash;
  sessionStorage.setItem('__boot_href', bootHref);
  devLog.info(`[BOOT] href=${bootHref.slice(0, 200)}`);
  if (bootSearch) devLog.info(`[BOOT] search=${bootSearch.slice(0, 100)}`);
  if (bootHash)   devLog.info(`[BOOT] hash=${bootHash.slice(0, 80)}`);
} catch { /* noop */ }
