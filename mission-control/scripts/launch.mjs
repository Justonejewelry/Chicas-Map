#!/usr/bin/env node
/**
 * One-command launcher for Chica Mission Control.
 *   node scripts/launch.mjs           → browser (fast)
 *   node scripts/launch.mjs --desktop → Electron + Vite
 */
import { spawn, execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const desktop = process.argv.includes('--desktop') || process.argv.includes('-d');
const skipInstall = process.argv.includes('--no-install');

function log(msg) {
  console.log(`\x1b[35m[mission-control]\x1b[0m ${msg}`);
}

function hasModule(name) {
  try {
    const require = createRequire(path.join(root, 'package.json'));
    require.resolve(name, { paths: [root] });
    return true;
  } catch {
    return false;
  }
}

function ensureDeps() {
  const needCore = !hasModule('vite') || !hasModule('react');
  const needDesktop = desktop && (!hasModule('electron') || !hasModule('concurrently') || !hasModule('wait-on'));

  if (skipInstall && (needCore || needDesktop)) {
    log('Dependencies missing. Run: npm install');
    process.exit(1);
  }

  if (needCore || needDesktop) {
    log(needDesktop ? 'Installing dependencies (includes Electron — first time may take a few minutes)…' : 'Installing dependencies…');
    execSync('npm install', { cwd: root, stdio: 'inherit' });
  }
}

function run(cmd, args, env = {}) {
  const child = spawn(cmd, args, {
    cwd: root,
    stdio: 'inherit',
    env: { ...process.env, ...env },
    shell: process.platform === 'win32',
  });
  child.on('exit', (code) => process.exit(code ?? 0));
  return child;
}

ensureDeps();

if (!desktop) {
  log('Starting in browser mode…');
  log('Open http://127.0.0.1:5173 if the browser does not open automatically.');
  const viteBin = path.join(root, 'node_modules', 'vite', 'bin', 'vite.js');
  run(process.execPath, [viteBin, '--host', '127.0.0.1', '--port', '5173', '--open']);
} else {
  if (!hasModule('electron')) {
    log('Electron not installed. Try: npm install electron --save-optional');
    process.exit(1);
  }
  log('Starting desktop app (Vite + Electron)…');
  const concurrently = path.join(root, 'node_modules', 'concurrently', 'dist', 'bin', 'concurrently.js');
  const waitOn = path.join(root, 'node_modules', 'wait-on', 'bin', 'wait-on');
  const electronBin = path.join(root, 'node_modules', 'electron', 'cli.js');

  const viteCmd = `"${process.execPath}" "${path.join(root, 'node_modules', 'vite', 'bin', 'vite.js')}" --host 127.0.0.1 --port 5173`;
  const electronCmd =
    process.platform === 'win32'
      ? `set VITE_DEV_SERVER_URL=http://127.0.0.1:5173&& "${process.execPath}" "${electronBin}" .`
      : `VITE_DEV_SERVER_URL=http://127.0.0.1:5173 "${process.execPath}" "${electronBin}" .`;
  const waitCmd = `"${process.execPath}" "${waitOn}" http://127.0.0.1:5173 && ${electronCmd}`;

  run(process.execPath, [concurrently, '-k', '-n', 'vite,app', '-c', 'magenta,cyan', viteCmd, waitCmd]);
}
