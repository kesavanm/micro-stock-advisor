#!/usr/bin/env node
/**
 * MicroStock Predictor — Admin API Server
 *
 * Listens on 127.0.0.1:8081 by default. Apache proxies
 * /advisor/api/admin/* to this server.
 *
 * Authentication: POST /login with the ADMIN_PASSWORD from .env returns a
 * short-lived bearer token. All other endpoints require that token.
 */
'use strict';

const http = require('http');
const { execFile } = require('child_process');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ─── Load .env ───────────────────────────────────────────────────────────────
const PROJECT_DIR = path.resolve(process.env.PROJECT_DIR || path.join(__dirname, '..'));

function loadEnvFile(file) {
  if (!fs.existsSync(file)) return;
  const content = fs.readFileSync(file, 'utf8');
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (key && !(key in process.env)) process.env[key] = value;
  }
}

loadEnvFile(path.join(PROJECT_DIR, '.env'));

// ─── Config ──────────────────────────────────────────────────────────────────
const PORT = Number(process.env.ADMIN_PORT) || 8081;
const HOST = process.env.ADMIN_HOST || '127.0.0.1';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';
const DEPLOY_DIR = path.resolve(process.env.ADMIN_DEPLOY_DIR || '/var/www/html/advisor');
const DEPLOY_OWNER = process.env.ADMIN_DEPLOY_OWNER ||
  `${process.env.SUDO_USER || process.env.USER || 'opc'}:apache`;
const NODE_BIN = process.env.NODE_BIN || process.execPath;
const NPM_BIN = process.env.NPM_BIN || '/usr/bin/npm';
const USE_SUDO = process.env.ADMIN_USE_SUDO !== '0';
const SESSION_TTL_MS = Number(process.env.ADMIN_SESSION_TTL_MS) || 8 * 60 * 60 * 1000;
const LOGIN_WINDOW_MS = 5 * 60 * 1000;
const LOGIN_MAX_ATTEMPTS = Number(process.env.ADMIN_LOGIN_MAX_ATTEMPTS) || 8;
const MAX_BODY_BYTES = 8 * 1024;
// Build/deploy/cache actions can take a while; keep Node, child processes and
// the Apache proxy timeout aligned at 15 minutes.
const REQUEST_TIMEOUT_MS = 15 * 60 * 1000;

if (!ADMIN_PASSWORD) {
  console.error('[admin-server] ADMIN_PASSWORD is not set. Add it to .env and restart.');
  process.exit(1);
}
if (ADMIN_PASSWORD.length < 8) {
  console.warn('[admin-server] Warning: ADMIN_PASSWORD is shorter than 8 characters.');
}

// ─── Auth state ──────────────────────────────────────────────────────────────
const sessions = new Map(); // token -> expiresAt (ms)
const loginAttempts = new Map(); // ip -> { count, resetAt }

function safeEqual(a, b) {
  const ha = crypto.createHash('sha256').update(String(a)).digest();
  const hb = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
}

function createSession() {
  const token = crypto.randomBytes(32).toString('hex');
  sessions.set(token, Date.now() + SESSION_TTL_MS);
  return token;
}

function isValidSession(token) {
  const expiresAt = sessions.get(token);
  if (!expiresAt) return false;
  if (expiresAt <= Date.now()) {
    sessions.delete(token);
    return false;
  }
  return true;
}

function checkAuth(req) {
  const auth = req.headers.authorization || '';
  if (!auth.startsWith('Bearer ')) return false;
  return isValidSession(auth.slice(7).trim());
}

function clientIp(req) {
  // Apache connects from 127.0.0.1. Do not trust X-Forwarded-For here, since it
  // is attacker-controlled unless the proxy is explicitly configured to set it.
  return req.socket.remoteAddress || 'unknown';
}

function loginRateLimited(ip) {
  const entry = loginAttempts.get(ip);
  if (!entry) return false;
  if (entry.resetAt <= Date.now()) {
    loginAttempts.delete(ip);
    return false;
  }
  return entry.count >= LOGIN_MAX_ATTEMPTS;
}

function recordFailedLogin(ip) {
  const now = Date.now();
  const entry = loginAttempts.get(ip);
  if (!entry || entry.resetAt <= now) {
    loginAttempts.set(ip, { count: 1, resetAt: now + LOGIN_WINDOW_MS });
  } else {
    entry.count += 1;
  }
}

function clearLoginAttempts(ip) {
  loginAttempts.delete(ip);
}

setInterval(() => {
  const now = Date.now();
  for (const [token, expiresAt] of sessions) {
    if (expiresAt <= now) sessions.delete(token);
  }
  for (const [ip, entry] of loginAttempts) {
    if (entry.resetAt <= now) loginAttempts.delete(ip);
  }
}, 10 * 60 * 1000).unref();

// ─── HTTP helpers ────────────────────────────────────────────────────────────
function setCommonHeaders(res) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
}

function sendJson(res, status, data) {
  setCommonHeaders(res);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data, null, 2));
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];

    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(new Error('Request body too large.'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });

    req.on('end', () => {
      if (chunks.length === 0) return resolve({});
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      } catch {
        reject(new Error('Invalid JSON body.'));
      }
    });

    req.on('error', reject);
  });
}

// ─── Command helpers ─────────────────────────────────────────────────────────
function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    execFile(
      command,
      args,
      {
        timeout: REQUEST_TIMEOUT_MS,
        maxBuffer: 4 * 1024 * 1024,
        env: { ...process.env, PATH: process.env.PATH || '/usr/bin:/usr/local/bin' },
        ...options,
      },
      (err, stdout, stderr) => {
        if (err) {
          err.stdout = stdout;
          err.stderr = stderr;
          reject(err);
          return;
        }
        resolve({ stdout: stdout || '', stderr: stderr || '' });
      }
    );
  });
}

async function runDeployCommand(command, args, options = {}) {
  if (USE_SUDO) {
    try {
      return await run('sudo', ['-n', command, ...args], options);
    } catch (err) {
      const detail = `${err.stderr || ''} ${err.message || ''}`;
      if (/password is required|not allowed|no tty|sudo:/i.test(detail)) {
        throw new Error(
          `Cannot ${command} in ${DEPLOY_DIR}: passwordless sudo is required. ` +
          'Grant the service user NOPASSWD sudo for the deploy commands, or set ADMIN_USE_SUDO=0 if the directory is writable.'
        );
      }
      throw err;
    }
  }
  return run(command, args, options);
}

// ─── Filesystem helpers ──────────────────────────────────────────────────────
function readCurrentCache() {
  const candidates = [
    path.join(DEPLOY_DIR, 'trending-cache.json'),
    path.join(PROJECT_DIR, 'public/trending-cache.json'),
  ];

  for (const file of candidates) {
    try {
      if (fs.existsSync(file)) {
        return JSON.parse(fs.readFileSync(file, 'utf8'));
      }
    } catch (err) {
      return { error: `Could not read ${file}: ${err.message}` };
    }
  }
  return null;
}

function listAssets() {
  const dir = path.join(DEPLOY_DIR, 'assets');
  return fs.existsSync(dir) ? fs.readdirSync(dir).sort() : [];
}

function getActiveBundle() {
  const html = path.join(DEPLOY_DIR, 'index.html');
  if (!fs.existsSync(html)) return { js: null, css: null };
  const content = fs.readFileSync(html, 'utf8');
  return {
    js: content.match(/assets\/(index-[^"']+\.js)/)?.[1] || null,
    css: content.match(/assets\/(index-[^"']+\.css)/)?.[1] || null,
  };
}

function getStaleAssets() {
  const { js, css } = getActiveBundle();
  const keep = new Set([js, css].filter(Boolean));
  return listAssets().filter((file) => {
    const isBundle = file.endsWith('.js') || file.endsWith('.css');
    return isBundle && !keep.has(file);
  });
}

async function pruneStaleAssets() {
  const { js, css } = getActiveBundle();
  // Never delete anything if index.html could not be parsed — that would take
  // the site down.
  if (!js || !css) return [];

  const stale = getStaleAssets();
  if (stale.length === 0) return [];

  const assetsDir = path.join(DEPLOY_DIR, 'assets');
  await runDeployCommand('rm', ['-f', ...stale.map((file) => path.join(assetsDir, file))]);
  return stale;
}

async function deployDist() {
  const distDir = path.join(PROJECT_DIR, 'dist');
  if (!fs.existsSync(path.join(distDir, 'index.html'))) {
    throw new Error('dist/index.html not found. Run a build first.');
  }

  await runDeployCommand('mkdir', ['-p', DEPLOY_DIR]);
  // Copy the contents of dist (including any hidden files) into the web root.
  await runDeployCommand('cp', ['-r', `${distDir}/.`, `${DEPLOY_DIR}/`]);

  // Keep Apache able to read the deployed files while leaving the cache file
  // writable by the cron/service user (default: opc:apache).
  if (DEPLOY_OWNER) {
    await runDeployCommand('chown', ['-R', DEPLOY_OWNER, DEPLOY_DIR]).catch(() => {});
  }

  const pruned = await pruneStaleAssets().catch(() => []);
  const activeBundle = getActiveBundle();

  return {
    deployedAt: new Date().toISOString(),
    activeBundle,
    pruned,
  };
}

// ─── Build state ─────────────────────────────────────────────────────────────
let buildState = {
  running: false,
  lastLog: '',
  lastResult: null,
  startedAt: null,
  finishedAt: null,
};

const BUILD_LOG_PATH = path.join(PROJECT_DIR, 'admin_build.log');

function writeBuildLog(log) {
  try {
    fs.writeFileSync(BUILD_LOG_PATH, log, 'utf8');
  } catch {
    // The log is also kept in memory.
  }
}

async function runBuild() {
  if (buildState.running) return;

  buildState = {
    running: true,
    lastLog: '',
    lastResult: null,
    startedAt: new Date().toISOString(),
    finishedAt: null,
  };

  const started = Date.now();

  try {
    const { stdout, stderr } = await run(NPM_BIN, ['run', 'build'], {
      cwd: PROJECT_DIR,
      timeout: REQUEST_TIMEOUT_MS,
    });

    const deploy = await deployDist();
    const log = [
      `[${new Date().toISOString()}] Build succeeded in ${((Date.now() - started) / 1000).toFixed(1)}s`,
      stdout.trim(),
      stderr.trim() ? `\nSTDERR:\n${stderr.trim()}` : '',
      `\n[deploy]`,
      JSON.stringify(deploy, null, 2),
    ].filter(Boolean).join('\n');

    buildState = {
      running: false,
      lastLog: log,
      lastResult: 'success',
      startedAt: buildState.startedAt,
      finishedAt: new Date().toISOString(),
    };
    writeBuildLog(log);
  } catch (err) {
    const log = [
      `[${new Date().toISOString()}] Build/deploy failed after ${((Date.now() - started) / 1000).toFixed(1)}s`,
      `Exit code: ${err.code ?? 'unknown'}`,
      err.stdout ? `\nSTDOUT:\n${err.stdout}` : '',
      err.stderr ? `\nSTDERR:\n${err.stderr}` : '',
      `\n${err.message}`,
    ].filter(Boolean).join('\n');

    buildState = {
      running: false,
      lastLog: log,
      lastResult: 'error',
      startedAt: buildState.startedAt,
      finishedAt: new Date().toISOString(),
    };
    writeBuildLog(log);
  }
}

// ─── Server ──────────────────────────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
  setCommonHeaders(res);

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = (req.url || '/').split('?')[0].replace(/\/$/, '') || '/';

  try {
    // ── Public: login ────────────────────────────────────────────────────────
    if (req.method === 'POST' && url === '/login') {
      const ip = clientIp(req);

      if (loginRateLimited(ip)) {
        return sendJson(res, 429, {
          error: 'Too many login attempts. Try again in a few minutes.',
        });
      }

      const body = await readJsonBody(req);
      const password = typeof body.password === 'string' ? body.password : '';

      if (!password || !safeEqual(password, ADMIN_PASSWORD)) {
        recordFailedLogin(ip);
        return sendJson(res, 401, { error: 'Invalid password.' });
      }

      clearLoginAttempts(ip);
      const token = createSession();

      return sendJson(res, 200, {
        ok: true,
        token,
        expiresAt: new Date(Date.now() + SESSION_TTL_MS).toISOString(),
        ttlSeconds: Math.round(SESSION_TTL_MS / 1000),
      });
    }

    // ── Everything below requires a valid bearer token ───────────────────────
    if (!checkAuth(req)) {
      return sendJson(res, 401, {
        error: 'Unauthorized — log in again to continue.',
      });
    }

    // ── POST /logout ─────────────────────────────────────────────────────────
    if (req.method === 'POST' && url === '/logout') {
      const auth = req.headers.authorization || '';
      if (auth.startsWith('Bearer ')) sessions.delete(auth.slice(7).trim());
      return sendJson(res, 200, { ok: true });
    }

    // ── GET /status ──────────────────────────────────────────────────────────
    if (req.method === 'GET' && url === '/status') {
      const activeBundle = getActiveBundle();
      return sendJson(res, 200, {
        ok: true,
        uptime: Math.round(process.uptime()),
        time: new Date().toISOString(),
        projectDir: PROJECT_DIR,
        deployDir: DEPLOY_DIR,
        cache: readCurrentCache(),
        assets: listAssets(),
        activeBundle,
        staleAssets: getStaleAssets(),
        buildRunning: buildState.running,
        lastBuildAt: buildState.startedAt,
        lastBuildFinishedAt: buildState.finishedAt,
        lastBuildResult: buildState.lastResult,
      });
    }

    // ── POST /refresh-cache ──────────────────────────────────────────────────
    if (req.method === 'POST' && url === '/refresh-cache') {
      try {
        const { stdout, stderr } = await run(
          NODE_BIN,
          [path.join(PROJECT_DIR, 'scripts/generate_trending_cache.cjs')],
          { cwd: PROJECT_DIR, timeout: REQUEST_TIMEOUT_MS }
        );

        // The generator writes to public/ and (when writable) to the web root.
        // Copy explicitly so a permissions change can never leave Apache stale.
        const source = path.join(PROJECT_DIR, 'public/trending-cache.json');
        if (fs.existsSync(source)) {
          await runDeployCommand('cp', [source, path.join(DEPLOY_DIR, 'trending-cache.json')]).catch(() => {});
        }

        return sendJson(res, 200, {
          ok: true,
          output: stdout.trim(),
          stderr: stderr.trim() || undefined,
          cache: readCurrentCache(),
        });
      } catch (err) {
        return sendJson(res, 500, {
          ok: false,
          error: err.message,
          stdout: err.stdout?.toString().trim() || undefined,
          stderr: err.stderr?.toString().trim() || undefined,
        });
      }
    }

    // ── DELETE /cache ────────────────────────────────────────────────────────
    if (req.method === 'DELETE' && url === '/cache') {
      const targets = [
        path.join(PROJECT_DIR, 'public/trending-cache.json'),
        path.join(PROJECT_DIR, 'dist/trending-cache.json'),
        path.join(DEPLOY_DIR, 'trending-cache.json'),
      ];
      const deleted = [];

      for (const target of targets) {
        if (!fs.existsSync(target)) continue;
        try {
          if (target.startsWith(DEPLOY_DIR)) {
            await runDeployCommand('rm', ['-f', target]);
          } else {
            fs.unlinkSync(target);
          }
          deleted.push(target);
        } catch (err) {
          return sendJson(res, 500, {
            ok: false,
            error: `Could not delete ${target}: ${err.message}`,
            deleted,
          });
        }
      }

      return sendJson(res, 200, {
        ok: true,
        deleted,
        message: deleted.length
          ? 'Cache files deleted. Refresh the dashboard to fetch a fresh cache.'
          : 'No cache files were present.',
      });
    }

    // ── DELETE /stale-assets ─────────────────────────────────────────────────
    if (req.method === 'DELETE' && url === '/stale-assets') {
      try {
        const removed = await pruneStaleAssets();
        const { js, css } = getActiveBundle();
        return sendJson(res, 200, {
          ok: true,
          removed,
          kept: [js, css].filter(Boolean),
        });
      } catch (err) {
        return sendJson(res, 500, { ok: false, error: err.message });
      }
    }

    // ── POST /deploy (hard refresh index/css/js/html) ────────────────────────
    if (req.method === 'POST' && url === '/deploy') {
      if (buildState.running) {
        return sendJson(res, 409, {
          ok: false,
          error: 'A build is in progress. Wait for it to finish before deploying dist/.',
        });
      }

      try {
        const result = await deployDist();
        return sendJson(res, 200, {
          ok: true,
          ...result,
          message: 'Current dist/ bundle deployed. Reload the dashboard to pick it up.',
        });
      } catch (err) {
        return sendJson(res, 500, { ok: false, error: err.message });
      }
    }

    // ── POST /build ──────────────────────────────────────────────────────────
    if (req.method === 'POST' && url === '/build') {
      if (buildState.running) {
        return sendJson(res, 409, {
          ok: false,
          error: 'A build is already in progress. Poll GET /build-log.',
        });
      }

      // Start the build in the background; do not hold the HTTP request open.
      runBuild();

      return sendJson(res, 202, {
        ok: true,
        message: 'Build started — poll GET /build-log for progress.',
        startedAt: buildState.startedAt,
      });
    }

    // ── GET /build-log ───────────────────────────────────────────────────────
    if (req.method === 'GET' && url === '/build-log') {
      const log = buildState.lastLog ||
        (fs.existsSync(BUILD_LOG_PATH) ? fs.readFileSync(BUILD_LOG_PATH, 'utf8') : 'No build log yet.');

      return sendJson(res, 200, {
        running: buildState.running,
        result: buildState.lastResult,
        startedAt: buildState.startedAt,
        finishedAt: buildState.finishedAt,
        log,
      });
    }

    return sendJson(res, 404, { error: `Unknown endpoint: ${req.method} ${url}` });
  } catch (err) {
    return sendJson(res, 500, { error: err.message || 'Internal server error.' });
  }
});

// Node's defaults are 5 min for requests and 1 min for headers; raise both so
// Apache's 15-minute proxy timeout is the real limit for admin actions.
server.requestTimeout = REQUEST_TIMEOUT_MS;
server.headersTimeout = REQUEST_TIMEOUT_MS;

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`[admin-server] Port ${PORT} is already in use. Is another admin server running?`);
  } else {
    console.error('[admin-server] Server error:', err.message);
  }
  process.exit(1);
});

server.listen(PORT, HOST, () => {
  console.log(`[admin-server] Listening on ${HOST}:${PORT}`);
  console.log(`[admin-server] Project: ${PROJECT_DIR}`);
  console.log(`[admin-server] Deploy:  ${DEPLOY_DIR}`);
});

function shutdown() {
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 3000).unref();
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
