import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

const agents = [
  ['ATLAS', 'Director', 'ONLINE'],
  ['FORGE', 'Operations', 'READY'],
  ['SENTINEL', 'Quality Control', 'READY'],
  ['MERCURY', 'Discovery', 'MONITORING'],
  ['ECHO', 'Facebook Discovery', 'MONITORING'],
  ['HERITAGE', 'Estate Intelligence', 'READY']
];

function App() {
  const [health, setHealth] = useState(null);
  const [command, setCommand] = useState('');
  const [result, setResult] = useState('System standing by.');
  const refresh = async () => setHealth(await window.missionControl.health());
  useEffect(() => { refresh(); const timer = setInterval(refresh, 30000); return () => clearInterval(timer); }, []);

  const run = async (e) => {
    e.preventDefault();
    if (!command.trim()) return;
    const response = await window.missionControl.command(command);
    setResult(response.type === 'message' ? response.data : JSON.stringify(response.data, null, 2));
    setCommand('');
    refresh();
  };

  const git = health?.git;
  return <main>
    <header>
      <div><div className="eyebrow">CHICAS MAP</div><h1>MISSION CONTROL <span>🐕</span></h1></div>
      <div className="status"><b>● SYSTEM</b> {health?.online ? 'ONLINE' : 'CHECKING'} <b>● GIT</b> {git?.clean ? 'CLEAN' : 'CHANGES'} <b>● BRANCH</b> {git?.branch || '...'}</div>
    </header>

    <section className="command">
      <form onSubmit={run}>
        <input value={command} onChange={e => setCommand(e.target.value)} placeholder="What is the mission? Try: Check system health" />
        <button>RUN MISSION</button>
      </form>
      <small>Commands: health check · git status · changed files · commit status</small>
    </section>

    <section className="grid metrics">
      <Card title="MAP FILES" value={health?.counts.mapFiles ?? '—'} detail="Geographic layers" />
      <Card title="DATA FILES" value={health?.counts.dataFiles ?? '—'} detail="Intelligence sources" />
      <Card title="REPORTS" value={health?.counts.reportFiles ?? '—'} detail="Operational reports" />
      <Card title="UNCOMMITTED" value={git ? git.changes.length : '—'} detail={git?.clean ? 'Working tree clean' : 'Needs attention'} />
    </section>

    <section className="grid two">
      <Panel title="SWARM STATUS">
        <div className="agents">{agents.map(([name, role, state]) => <div className="agent" key={name}><span className="dot">●</span><div><b>{name}</b><small>{role}</small></div><em>{state}</em></div>)}</div>
      </Panel>
      <Panel title="GIT INTELLIGENCE">
        <div className="git"><p><b>Branch:</b> {git?.branch || 'Loading...'}</p><p><b>Remote:</b> {git?.remote || 'Not detected'}</p><p><b>Last commit:</b> {git?.lastCommit || 'Loading...'}</p><h3>Changed files</h3>{git?.changes?.length ? <ul>{git.changes.map((x,i)=><li key={i}>{x}</li>)}</ul> : <p className="quiet">No uncommitted changes.</p>}</div>
      </Panel>
    </section>

    <section className="grid two">
      <Panel title="MISSION QUEUE">
        <ul className="queue"><li><span>01</span> Audit map data pipeline</li><li><span>02</span> Verify Sentinel publish gate</li><li><span>03</span> Inspect school-zone coverage</li><li><span>04</span> Prepare weekend forecast</li></ul>
      </Panel>
      <Panel title="COMMAND OUTPUT"><pre>{result}</pre></Panel>
    </section>

    <footer><button onClick={refresh}>REFRESH INTELLIGENCE</button><span>Local-first operations console • Repository diagnostics run on this Mac</span></footer>
  </main>;
}
function Card({title,value,detail}) { return <article className="card"><small>{title}</small><strong>{value}</strong><span>{detail}</span></article>; }
function Panel({title,children}) { return <article className="panel"><h2>{title}</h2>{children}</article>; }
createRoot(document.getElementById('root')).render(<App />);
