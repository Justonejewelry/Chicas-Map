const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const { execFile } = require('child_process');
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..', '..');
let mainWindow;

function run(command, args = [], cwd = repoRoot) {
  return new Promise((resolve) =>
    execFile(command, args, { cwd, timeout: 30000 }, (error, stdout, stderr) =>
      resolve({ ok: !error, stdout: String(stdout || ''), stderr: String(stderr || ''), code: error?.code || 0 })
    )
  );
}

function userFile(name) {
  return path.join(app.getPath('userData'), name);
}
function readJson(name, fallback) {
  try { return JSON.parse(fs.readFileSync(userFile(name), 'utf8')); } catch { return fallback; }
}
function writeJson(name, value) {
  fs.mkdirSync(app.getPath('userData'), { recursive: true });
  fs.writeFileSync(userFile(name), JSON.stringify(value, null, 2));
}
function countFiles(relative, exts = null) {
  const root = path.join(repoRoot, relative);
  let count = 0;
  function walk(dir) {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith('.')) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (!exts || exts.some((ext) => entry.name.toLowerCase().endsWith(ext))) count++;
    }
  }
  walk(root);
  return count;
}

async function repoStatus() {
  const [branch, status, lastCommit, remote, aheadBehind] = await Promise.all([
    run('git', ['branch', '--show-current']),
    run('git', ['status', '--short']),
    run('git', ['log', '-1', '--pretty=format:%h|%s|%ci']),
    run('git', ['remote', 'get-url', 'origin']),
    run('git', ['rev-list', '--left-right', '--count', '@{upstream}...HEAD']),
  ]);
  const [behind = '0', ahead = '0'] = aheadBehind.stdout.trim().split(/\s+/);
  return {
    branch: branch.stdout.trim() || 'unknown',
    changes: status.stdout.trim() ? status.stdout.trim().split('\n') : [],
    lastCommit: lastCommit.stdout.trim(),
    remote: remote.stdout.trim(),
    clean: status.ok && !status.stdout.trim(),
    ahead: Number(ahead) || 0,
    behind: Number(behind) || 0,
  };
}

async function diagnostics() {
  const checks = [];
  const add = (name, level, detail) => checks.push({ name, level, detail });
  for (const dir of ['maps', 'data', 'forecast', 'city-configs', 'reports', 'app', 'mission-control']) {
    const exists = fs.existsSync(path.join(repoRoot, dir));
    add(`Directory: ${dir}`, exists ? 'PASS' : 'FAIL', exists ? 'Present' : 'Missing');
  }
  const git = await repoStatus();
  add('Git repository', git.branch !== 'unknown' ? 'PASS' : 'FAIL', `Branch: ${git.branch}`);
  add('Working tree', git.clean ? 'PASS' : 'WARN', git.clean ? 'Clean' : `${git.changes.length} uncommitted change(s)`);
  const kml = countFiles('maps', ['.kml']);
  const geojson = countFiles('maps', ['.geojson', '.json']);
  add('Map layers', kml + geojson > 0 ? 'PASS' : 'WARN', `${kml} KML, ${geojson} GeoJSON/JSON`);
  const fail = checks.filter((x) => x.level === 'FAIL').length;
  const warn = checks.filter((x) => x.level === 'WARN').length;
  return { score: Math.max(0, 100 - fail * 35 - warn * 10), fail, warn, checks, generatedAt: new Date().toISOString() };
}

async function projectHealth() {
  const [repo, git, diagnostic] = await Promise.all([
    run('git', ['rev-parse', '--is-inside-work-tree']),
    repoStatus(),
    diagnostics(),
  ]);
  return {
    online: repo.ok,
    git,
    diagnostic,
    counts: {
      mapFiles: countFiles('maps'),
      dataFiles: countFiles('data'),
      reportFiles: countFiles('reports'),
      kmlFiles: countFiles('maps', ['.kml']),
      geojsonFiles: countFiles('maps', ['.geojson', '.json']),
    },
  };
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 960,
    minHeight: 640,
    title: 'Chica Mission Control',
    backgroundColor: '#07070c',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  const devUrl = process.env.VITE_DEV_SERVER_URL;
  if (devUrl) mainWindow.loadURL(devUrl);
  else {
    const distIndex = path.join(__dirname, '..', 'dist', 'index.html');
    if (fs.existsSync(distIndex)) mainWindow.loadFile(distIndex);
    else mainWindow.loadURL('http://127.0.0.1:5173');
  }
}

app.whenReady().then(() => {
  ipcMain.handle('mission:ping', () => ({ ok: true, time: new Date().toISOString() }));
  ipcMain.handle('mission:health', projectHealth);
  ipcMain.handle('mission:git', repoStatus);
  ipcMain.handle('mission:diagnostics', diagnostics);
  ipcMain.handle('mission:command', async (_e, command) => {
    const text = String(command || '').toLowerCase();
    if (text.includes('diagnostic') || text.includes('health') || text.includes('check'))
      return { type: 'diagnostics', data: await diagnostics() };
    if (text.includes('git')) return { type: 'git', data: await repoStatus() };
    if (text.includes('map') || text.includes('layer'))
      return { type: 'map', data: { mapFiles: countFiles('maps'), kmlFiles: countFiles('maps', ['.kml']), geojsonFiles: countFiles('maps', ['.geojson', '.json']) } };
    return { type: 'message', data: 'Mission logged. Try: diagnostics, git status, map layers.' };
  });
  ipcMain.handle('reports:pdf', async () => ({ canceled: true, path: null }));
  ipcMain.handle('contacts:list', () => readJson('contacts.json', []));
  ipcMain.handle('contacts:add', (_e, contact) => {
    const list = readJson('contacts.json', []);
    const item = { id: Date.now().toString(), name: String(contact?.name || '').trim(), email: String(contact?.email || '').trim(), createdAt: new Date().toISOString() };
    if (!item.email) throw new Error('Email required');
    list.push(item);
    writeJson('contacts.json', list);
    return list;
  });
  ipcMain.handle('email:send', async () => ({ ok: false, error: 'Use desktop Mail integration (full build)' }));
  ipcMain.handle('email:inbox', async () => []);
  ipcMain.handle('email:scan-data', async () => ({ messages: [], leads: [], scannedAt: new Date().toISOString() }));
  ipcMain.handle('branding:choose-logo', async () => null);
  createWindow();
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
