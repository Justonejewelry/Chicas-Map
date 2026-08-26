const { app, BrowserWindow, ipcMain } = require('electron');
const { execFile } = require('child_process');
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..', '..');

function run(command, args = []) {
  return new Promise((resolve) => {
    execFile(command, args, { cwd: repoRoot, timeout: 20000 }, (error, stdout, stderr) => {
      resolve({ ok: !error, stdout: String(stdout || ''), stderr: String(stderr || ''), code: error?.code || 0 });
    });
  });
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
      else if (!exts || exts.some(ext => entry.name.toLowerCase().endsWith(ext))) count++;
    }
  }
  walk(root); return count;
}
async function repoStatus() {
  const [branch, status, lastCommit, remote, aheadBehind] = await Promise.all([
    run('git', ['branch', '--show-current']), run('git', ['status', '--short']),
    run('git', ['log', '-1', '--pretty=format:%h|%s|%ci']), run('git', ['remote', 'get-url', 'origin']),
    run('git', ['rev-list', '--left-right', '--count', '@{upstream}...HEAD'])
  ]);
  const [behind='0', ahead='0'] = aheadBehind.stdout.trim().split(/\s+/);
  return { branch: branch.stdout.trim() || 'unknown', changes: status.stdout.trim() ? status.stdout.trim().split('\n') : [], lastCommit: lastCommit.stdout.trim(), remote: remote.stdout.trim(), clean: status.ok && !status.stdout.trim(), ahead: Number(ahead)||0, behind: Number(behind)||0 };
}
async function diagnostics() {
  const checks = [];
  const add = (name, level, detail) => checks.push({ name, level, detail });
  const required = ['maps','data','forecast','city-configs','reports','app','mission-control'];
  for (const dir of required) add(`Directory: ${dir}`, fs.existsSync(path.join(repoRoot, dir)) ? 'PASS' : 'FAIL', fs.existsSync(path.join(repoRoot, dir)) ? 'Present' : 'Missing');
  const git = await repoStatus();
  add('Git repository', git.branch !== 'unknown' ? 'PASS' : 'FAIL', `Branch: ${git.branch}`);
  add('Working tree', git.clean ? 'PASS' : 'WARN', git.clean ? 'Clean' : `${git.changes.length} uncommitted change(s)`);
  const appIndex = path.join(repoRoot,'app','src');
  add('Public map source', fs.existsSync(appIndex) ? 'PASS' : 'FAIL', fs.existsSync(appIndex) ? 'app/src available' : 'app/src missing');
  const kml = countFiles('maps',['.kml']); const geojson = countFiles('maps',['.geojson','.json']);
  add('Map layers', (kml+geojson)>0 ? 'PASS' : 'WARN', `${kml} KML, ${geojson} GeoJSON/JSON candidate file(s)`);
  const forecast = countFiles('forecast',['.json','.csv']);
  add('Forecast data', forecast>0 ? 'PASS' : 'WARN', `${forecast} forecast data file(s)`);
  const fail = checks.filter(x=>x.level==='FAIL').length, warn = checks.filter(x=>x.level==='WARN').length;
  return { score: Math.max(0, 100 - fail*35 - warn*10), fail, warn, checks, generatedAt: new Date().toISOString() };
}
async function projectHealth() {
  const [repo, git, diagnostic] = await Promise.all([run('git',['rev-parse','--is-inside-work-tree']), repoStatus(), diagnostics()]);
  return { online: repo.ok, git, diagnostic, counts: { mapFiles: countFiles('maps'), dataFiles: countFiles('data'), reportFiles: countFiles('reports'), kmlFiles: countFiles('maps',['.kml']), geojsonFiles: countFiles('maps',['.geojson','.json']) } };
}
function createWindow() {
  const win = new BrowserWindow({ width:1500,height:950,minWidth:1100,minHeight:700,title:'Chica Mission Control', webPreferences:{ preload:path.join(__dirname,'preload.cjs'),contextIsolation:true,nodeIntegration:false } });
  win.loadURL(process.env.VITE_DEV_SERVER_URL || 'http://127.0.0.1:5173');
}
app.whenReady().then(() => {
  ipcMain.handle('mission:health', projectHealth);
  ipcMain.handle('mission:git', repoStatus);
  ipcMain.handle('mission:diagnostics', diagnostics);
  ipcMain.handle('mission:command', async (_event, command) => {
    const text = String(command || '').toLowerCase();
    if (text.includes('diagnostic') || text.includes('broken') || text.includes('why') || text.includes('health') || text.includes('check')) return { type:'diagnostics', data:await diagnostics() };
    if (text.includes('git') || text.includes('changed') || text.includes('commit')) return { type:'git', data:await repoStatus() };
    if (text.includes('map') || text.includes('layer')) return { type:'map', data:{ mapFiles:countFiles('maps'), kmlFiles:countFiles('maps',['.kml']), geojsonFiles:countFiles('maps',['.geojson','.json']) } };
    return { type:'message', data:'Mission logged. Available automated missions: diagnostics, Git status, and map-layer audit.' };
  });
  createWindow();
});
app.on('window-all-closed',()=>{ if(process.platform!=='darwin') app.quit(); });
app.on('activate',()=>{ if(BrowserWindow.getAllWindows().length===0) createWindow(); });
