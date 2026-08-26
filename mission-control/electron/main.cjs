const { app, BrowserWindow, ipcMain } = require('electron');
const { execFile } = require('child_process');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..', '..');

function run(command, args = []) {
  return new Promise((resolve) => {
    execFile(command, args, { cwd: repoRoot, timeout: 15000 }, (error, stdout, stderr) => {
      resolve({ ok: !error, stdout: String(stdout || ''), stderr: String(stderr || '') });
    });
  });
}

async function repoStatus() {
  const [branch, status, lastCommit, remote] = await Promise.all([
    run('git', ['branch', '--show-current']),
    run('git', ['status', '--short']),
    run('git', ['log', '-1', '--pretty=format:%h|%s|%ci']),
    run('git', ['remote', 'get-url', 'origin'])
  ]);
  return {
    branch: branch.stdout.trim() || 'unknown',
    changes: status.stdout.trim() ? status.stdout.trim().split('\n') : [],
    lastCommit: lastCommit.stdout.trim(),
    remote: remote.stdout.trim(),
    clean: status.ok && !status.stdout.trim()
  };
}

async function projectHealth() {
  const [repo, git, maps, data, reports] = await Promise.all([
    run('git', ['rev-parse', '--is-inside-work-tree']),
    repoStatus(),
    run('find', ['maps', '-type', 'f']),
    run('find', ['data', '-type', 'f']),
    run('find', ['reports', '-type', 'f'])
  ]);
  return {
    online: repo.ok,
    git,
    counts: {
      mapFiles: maps.stdout.trim() ? maps.stdout.trim().split('\n').length : 0,
      dataFiles: data.stdout.trim() ? data.stdout.trim().split('\n').length : 0,
      reportFiles: reports.stdout.trim() ? reports.stdout.trim().split('\n').length : 0
    }
  };
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1500,
    height: 950,
    minWidth: 1100,
    minHeight: 700,
    title: 'Chica Mission Control',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  const dev = process.env.VITE_DEV_SERVER_URL || 'http://127.0.0.1:5173';
  win.loadURL(dev);
}

app.whenReady().then(() => {
  ipcMain.handle('mission:health', projectHealth);
  ipcMain.handle('mission:git', repoStatus);
  ipcMain.handle('mission:command', async (_event, command) => {
    const text = String(command || '').toLowerCase();
    if (text.includes('health') || text.includes('check')) return { type: 'health', data: await projectHealth() };
    if (text.includes('git') || text.includes('changed') || text.includes('commit')) return { type: 'git', data: await repoStatus() };
    return { type: 'message', data: 'Mission logged. Add a specialized automation for: ' + command };
  });
  createWindow();
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
