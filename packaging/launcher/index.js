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
  const projectEnv = path.join(PROJECT, '.env');
  const examplePath = path.join(PROJECT, '.env.example');
  if (fs.existsSync(configEnv)) {
    fs.copyFileSync(configEnv, projectEnv);
    return loadEnvFile(projectEnv);
  }
  if (fs.existsSync(examplePath)) {
    fs.copyFileSync(examplePath, configEnv);
    fs.copyFileSync(examplePath, projectEnv);
  }
  return loadEnvFile(projectEnv);
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
  if (!fs.existsSync(NODE_BIN)) {
    console.error('Bundled Node not found at', NODE_BIN);
    process.exit(1);
  }
  if (!fs.existsSync(PROJECT)) {
    console.error('App bundle not found at', PROJECT);
    process.exit(1);
  }

  const env = ensureConfig();

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
    if (ok) openBrowser(dashboardUrl);
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

main();
