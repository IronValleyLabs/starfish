#!/usr/bin/env node
/**
 * Jellyfish app launcher. Runs when user opens the packaged app.
 * Expects APP_ROOT env (path to app bundle Resources). Starts Redis (if bundled),
 * then memory, core, action, chat, vision; opens browser to dashboard.
 */
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const http = require('http');

const APP_ROOT = process.env.APP_ROOT;
if (!APP_ROOT || !fs.existsSync(APP_ROOT)) {
  console.error('APP_ROOT not set or missing. Run this from the packaged app.');
  process.exit(1);
}

function getLogDir() {
  if (process.platform === 'darwin') {
    return path.join(process.env.HOME || '', 'Library', 'Logs', 'Jellyfish');
  }
  if (process.platform === 'win32') {
    return path.join(process.env.APPDATA || process.env.LOCALAPPDATA || '', 'Jellyfish', 'Logs');
  }
  return path.join(process.env.HOME || '', '.local', 'state', 'jellyfish', 'logs');
}

let logStream = null;
function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  if (typeof console !== 'undefined' && console.log) console.log(msg);
  try {
    if (!logStream) {
      const logDir = getLogDir();
      if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
      logStream = fs.createWriteStream(path.join(logDir, 'launcher.log'), { flags: 'a' });
    }
    logStream.write(line);
  } catch (_) {}
}

function showError(title, message) {
  log(`ERROR: ${title} - ${message}`);
  if (process.platform === 'darwin') {
    const safeMsg = (title + ': ' + message).replace(/\\/g, '\\\\').replace(/"/g, '\\"').substring(0, 200);
    spawn('osascript', ['-e', 'display dialog "' + safeMsg + '" & return & return & "Log: Library/Logs/Jellyfish/launcher.log" with title "Jellyfish" with icon stop buttons {"OK"} default button "OK"'], { stdio: 'ignore' }).unref();
  }
}

const isWin = process.platform === 'win32';
const PROJECT = path.join(APP_ROOT, 'app');
const NODE_BIN = path.join(APP_ROOT, 'node', isWin ? 'node.exe' : path.join('bin', 'node'));
const REDIS_SERVER = path.join(APP_ROOT, 'redis', isWin ? 'redis-server.exe' : 'redis-server');

function getConfigDir() {
  if (process.platform === 'darwin') {
    return path.join(process.env.HOME || '', 'Library', 'Application Support', 'Jellyfish');
  }
  if (process.platform === 'win32') {
    return path.join(process.env.APPDATA || process.env.LOCALAPPDATA || process.env.USERPROFILE || '', 'Jellyfish');
  }
  return path.join(process.env.HOME || process.env.XDG_CONFIG_HOME || '.config', 'jellyfish');
}

function loadEnvFile(filePath) {
  const env = { ...process.env };
  if (!fs.existsSync(filePath)) return env;
  const content = fs.readFileSync(filePath, 'utf8');
  for (const line of content.split('\n')) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '').trim();
  }
  return env;
}

function ensureConfig() {
  const configDir = getConfigDir();
  if (!fs.existsSync(configDir)) fs.mkdirSync(configDir, { recursive: true });
  const configEnv = path.join(configDir, '.env');
  const examplePath = path.join(PROJECT, '.env.example');
  // Only read/write in config dir — never write into the app bundle (fails under App Translocation / read-only)
  if (fs.existsSync(configEnv)) {
    return loadEnvFile(configEnv);
  }
  if (fs.existsSync(examplePath)) {
    try {
      fs.copyFileSync(examplePath, configEnv);
    } catch (e) {
      log('Could not write default .env to config dir: ' + e.message);
    }
    return loadEnvFile(configEnv);
  }
  return loadEnvFile(configEnv);
}

function waitForUrl(url, timeoutMs) {
  return new Promise((resolve) => {
    const start = Date.now();
    const tryOnce = () => {
      const req = http.get(url, { timeout: 2000 }, (res) => {
        if (res.statusCode === 200 || res.statusCode === 304) return resolve(true);
        if (Date.now() - start > timeoutMs) return resolve(false);
        setTimeout(tryOnce, 500);
      });
      req.on('error', () => {
        if (Date.now() - start > timeoutMs) return resolve(false);
        setTimeout(tryOnce, 500);
      });
    };
    tryOnce();
  });
}

function openBrowser(url) {
  const cmd = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';
  spawn(cmd, [url], { stdio: 'ignore', detached: true }).unref();
}

const children = [];

function run(name, nodeBin, args, cwd, env) {
  const child = spawn(nodeBin, args, {
    cwd,
    env: { ...env, NODE_ENV: 'production' },
    stdio: 'ignore',
    detached: true,
  });
  child.unref();
  children.push({ name, pid: child.pid });
  return child;
}

function main() {
  log('Jellyfish launcher starting, APP_ROOT=' + APP_ROOT);
  if (process.platform === 'darwin') {
    spawn('osascript', ['-e', 'display notification "Abriendo el dashboard en unos segundos..." with title "Jellyfish"'], { stdio: 'ignore' }).unref();
  }
  if (!fs.existsSync(NODE_BIN)) {
    showError('Node no encontrado', NODE_BIN);
    process.exit(1);
  }
  if (!fs.existsSync(PROJECT)) {
    showError('App no encontrada', PROJECT);
    process.exit(1);
  }
  const visionNext = path.join(PROJECT, 'packages', 'vision', '.next');
  if (!fs.existsSync(visionNext)) {
    showError('Vision no compilada', 'Falta packages/vision/.next. Vuelve a generar la app con packaging/mac/build.sh');
    process.exit(1);
  }

  const env = ensureConfig();
  log('Config loaded, starting services...');

  // Optional: start embedded Redis if we have it (so user doesn't need Redis Cloud)
  const hasRedis = fs.existsSync(REDIS_SERVER);
  if (hasRedis) {
    const redisDir = path.join(getConfigDir(), 'redis-data');
    if (!fs.existsSync(redisDir)) fs.mkdirSync(redisDir, { recursive: true });
    const redis = spawn(REDIS_SERVER, ['--port', '6379', '--dir', redisDir], {
      stdio: 'ignore',
      detached: true,
    });
    redis.unref();
    children.push({ name: 'redis', pid: redis.pid });
    env.REDIS_HOST = '127.0.0.1';
    env.REDIS_PORT = '6379';
    env.REDIS_PASSWORD = '';
  }

  const delay = (ms) => new Promise((r) => setTimeout(r, ms));

  run('memory', NODE_BIN, [path.join(PROJECT, 'packages', 'memory', 'dist', 'index.js')], PROJECT, env);
  delay(800).then(() => {
    run('core', NODE_BIN, [path.join(PROJECT, 'packages', 'core', 'dist', 'index.js')], PROJECT, env);
  });
  delay(1600).then(() => {
    run('action', NODE_BIN, [path.join(PROJECT, 'packages', 'action', 'dist', 'index.js')], PROJECT, env);
  });
  delay(2400).then(() => {
    run('chat', NODE_BIN, [path.join(PROJECT, 'packages', 'chat', 'dist', 'index.js')], PROJECT, env);
  });
  delay(3200).then(() => {
    const nextBin = path.join(PROJECT, 'packages', 'vision', 'node_modules', 'next', 'dist', 'bin', 'next');
    run('vision', NODE_BIN, [nextBin, 'start', '-p', '3000'], path.join(PROJECT, 'packages', 'vision'), env);
  });

  const dashboardUrl = 'http://localhost:3000';
  waitForUrl(dashboardUrl, 60000).then((ok) => {
    if (ok) {
      log('Dashboard ready, opening browser');
      openBrowser(dashboardUrl);
    } else {
      showError('Dashboard no arrancó', 'El servidor no respondió en 60 s. Revisa ' + path.join(getLogDir(), 'launcher.log'));
    }
  });

  function shutdown() {
    children.forEach(({ name, pid }) => {
      try { process.kill(pid, 'SIGTERM'); } catch (_) {}
    });
    process.exit(0);
  }
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

try {
  main();
} catch (err) {
  const msg = err && (err.message || String(err));
  showError('Error al iniciar', msg);
  process.exit(1);
}
