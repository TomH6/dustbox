#!/usr/bin/env node
// Plays the sequencer in headless Chrome and checks that it works:
// the right pads fire on the right steps, every hit is scheduled ahead of time,
// sound comes out, Stop works and the sound dies away, and nothing logs an error.
//
// Usage: node tools/seq-test.js [--pattern 1] [--bars 4] [--bpm 100] [--chrome <path>] [--shot <file.png>]
// Needs Node 22+ (built-in fetch and WebSocket) and Chrome, Chromium or Edge.
// Set CHROME to the browser's path if it isn't found automatically.
const http = require('http'), fs = require('fs'), path = require('path'), os = require('os');
const { spawn } = require('child_process');

const args = process.argv.slice(2);
const opt = (name, def) => { const i = args.indexOf('--' + name); return i >= 0 ? args[i + 1] : def };
const BARS = +opt('bars', 4), SHOT = opt('shot', null), PAT = +opt('pattern', 1) - 1, BPM = opt('bpm', null);
const ROOT = path.resolve(__dirname, '..');
const sleep = ms => new Promise(r => setTimeout(r, ms));

function findChrome() {
  const c = [opt('chrome'), process.env.CHROME,
    'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser'];
  return c.find(p => p && fs.existsSync(p));
}

// Serves the repo on a free port, so no other server is needed.
function serve() {
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png' };
  const srv = http.createServer((req, res) => {
    let p = decodeURIComponent(req.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
    const f = path.join(ROOT, p);
    if (!f.startsWith(ROOT)) { res.writeHead(403); return res.end() }
    fs.readFile(f, (err, data) => {
      if (err) { res.writeHead(404); return res.end() }
      res.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream' }); res.end(data);
    });
  });
  return new Promise(r => srv.listen(0, '127.0.0.1', () => r(srv)));
}

async function main() {
  const chrome = findChrome();
  if (!chrome) { console.log('Chrome not found: set CHROME or pass --chrome <path>'); process.exit(2) }
  const srv = await serve(), url = `http://127.0.0.1:${srv.address().port}/`;
  const prof = fs.mkdtempSync(path.join(os.tmpdir(), 'dustbox-seq-'));
  const ch = spawn(chrome, ['--headless=new', '--disable-gpu', '--no-sandbox', '--mute-audio', '--autoplay-policy=no-user-gesture-required',
    '--remote-debugging-port=0', `--user-data-dir=${prof}`, '--window-size=1280,1000', 'about:blank'], { stdio: 'ignore' });
  const cleanup = () => { try { ch.kill() } catch { } srv.close(); setTimeout(() => { try { fs.rmSync(prof, { recursive: true, force: true }) } catch { } }, 500) };

  try {
    // Chrome writes the port it picked to DevToolsActivePort.
    let port;
    for (let i = 0; i < 100 && !port; i++) { try { port = fs.readFileSync(path.join(prof, 'DevToolsActivePort'), 'utf8').split('\n')[0] } catch { await sleep(100) } }
    if (!port) throw new Error('Chrome did not start');
    let targets;
    for (let i = 0; i < 50 && !targets; i++) { try { targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json() } catch { await sleep(100) } }
    const ws = new WebSocket(targets.find(t => t.type === 'page').webSocketDebuggerUrl);
    await new Promise((r, j) => { ws.onopen = r; ws.onerror = j });

    let id = 0; const pend = {}, errors = [];
    ws.onmessage = e => {
      const m = JSON.parse(e.data);
      if (m.id && pend[m.id]) { pend[m.id](m); delete pend[m.id] }
      if (m.method === 'Runtime.consoleAPICalled' && (m.params.type === 'error' || m.params.type === 'assert'))
        errors.push(m.params.args.map(a => a.value ?? a.description).join(' '));
      if (m.method === 'Runtime.exceptionThrown')
        errors.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text);
    };
    const send = (method, params = {}) => new Promise(r => { const i = ++id; pend[i] = r; ws.send(JSON.stringify({ id: i, method, params })) });
    const ev = async expr => {
      const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
      if (r.result.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description || r.result.exceptionDetails.text);
      return r.result.result.value;
    };

    await send('Runtime.enable'); await send('Page.enable');
    await send('Page.navigate', { url });
    for (let i = 0; i < 50; i++) { if (await ev(`typeof patterns!=='undefined'&&pads.some(Boolean)`).catch(() => false)) break; await sleep(100) }

    // Change the tempo the way the BPM box does, and give phrase pads time to be re-synthesized.
    if (BPM) { await ev(`setBpm(${+BPM})`); await sleep(800) }
    const phrases = await ev(`pads.filter(p=>p&&p.gen).map(p=>({name:p.name,bpm:p.gen.bpm,dur:p.orig.duration}))`);

    // Log every trigger, and sample the peak level after the limiter every 10 ms.
    const info = await ev(`(()=>{S.pat=${PAT};S.bank=Math.floor(Object.keys(patterns[S.pat].steps)[0]/8)||0;renderAll();
      window.__hits=[];const orig=trigger;
      trigger=function(id,when,vel,seq){__hits.push({id,when,seq,now:ctx.currentTime});return orig.apply(this,arguments)};
      const an=ctx.createAnalyser();an.fftSize=512;lim.connect(an);const buf=new Float32Array(an.fftSize);
      window.__lvl=[];window.__lvT=setInterval(()=>{an.getFloatTimeDomainData(buf);let pk=0;for(const x of buf)pk=Math.max(pk,Math.abs(x));__lvl.push([ctx.currentTime,pk])},10);
      const pat=patterns[S.pat];
      return {ctxState:ctx.state,bpm:S.bpm,swing:S.swing,loose:S.loose,pat:S.pat,len:pat.len,mute:pat.mute,
        rows:Object.entries(pat.steps).map(([k,a])=>({id:+k,label:BANKS[Math.floor(k/8)]+(k%8+1),name:pads[k]?pads[k].name:'(empty)',steps:a.slice(0,pat.len)}))};
    })()`);
    const stepSec = 60 / info.bpm / 4, barSec = 16 * stepSec, nSteps = BARS * 16;

    // Press Play on the Sequencer tab, the way a user would.
    await ev(`[...document.querySelectorAll('button,[role=tab]')].find(b=>b.textContent.trim()==='Sequencer')?.click()`);
    const start = await ev(`(document.querySelector('#play').click(),SQ.loopStart)`);
    await sleep(barSec * 1000 * Math.min(1.5, BARS));
    if (SHOT) { const s = await send('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(SHOT, Buffer.from(s.result.data, 'base64')) }
    await sleep(Math.max(0, barSec * 1000 * (BARS - 1.5)) + 100);
    const during = await ev(`({playing:S.playing,btn:document.querySelector('#play').textContent})`);
    const stopT = await ev(`(document.querySelector('#play').click(),ctx.currentTime)`);
    await sleep(4000);
    const after = await ev(`(()=>{clearInterval(__lvT);return {playing:S.playing,btn:document.querySelector('#play').textContent,hits:__hits,lvl:__lvl}})()`);
    ws.close();

    // ---- checks ----
    const fails = [], check = (ok, msg) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${msg}`); if (!ok) fails.push(msg) };
    const fmt = a => a.map(v => v === 1 ? 'x' : v === 2 ? 'o' : v === 3 ? 'r' : '.').join('');
    console.log(`Pattern ${info.pat + 1}: ${info.len} steps at ${info.bpm} BPM, swing ${info.swing}%, loose ${info.loose} ms, playing ${BARS} bars`);
    for (const r of info.rows) console.log(`  ${r.label.padEnd(3)} ${r.name.padEnd(10)} ${fmt(r.steps)}${info.mute[r.id] ? '  (muted)' : ''}`);

    check(info.ctxState === 'running', `the AudioContext is running (${info.ctxState})`);
    if (phrases.length) check(phrases.every(p => p.bpm === info.bpm), `phrase pads follow the tempo: ` + phrases.map(p => `${p.name} made at ${p.bpm} BPM, ${p.dur.toFixed(2)} s`).join(', '));
    check(during.playing && during.btn === 'Stop', `while playing, the button reads "${during.btn}"`);

    // Expected hits for steps 0..nSteps-1. A step can land up to a swing or loose offset late, so the cutoff is just before step nSteps.
    const cutoff = start + nSteps * stepSec - Math.max(0.01, info.loose / 1000 + 0.005);
    const seqHits = after.hits.filter(h => h.seq && h.when < cutoff);
    const want = {}, got = {};
    for (const r of info.rows) { if (info.mute[r.id]) continue; for (let i = 0; i < nSteps; i++) { const v = r.steps[i % info.len]; if (v) want[r.id] = (want[r.id] || 0) + (v === 3 ? 2 : 1) } }
    for (const h of seqHits) got[h.id] = (got[h.id] || 0) + 1;
    const ids = [...new Set([...Object.keys(want), ...Object.keys(got)])];
    const wrong = ids.filter(k => (want[k] || 0) !== (got[k] || 0));
    check(!wrong.length, `each pad fired as often as the pattern says (${seqHits.length} hits)` +
      (wrong.length ? ': ' + wrong.map(k => `${info.rows.find(r => r.id == k)?.name || k} expected ${want[k] || 0}, got ${got[k] || 0}`).join('; ') : ''));

    const late = seqHits.filter(h => h.when < h.now - 0.001);
    const lead = seqHits.map(h => h.when - h.now);
    check(!late.length, `every hit was scheduled ahead of time` + (lead.length ? ` (${Math.round(Math.min(...lead) * 1000)}–${Math.round(Math.max(...lead) * 1000)} ms early)` : '') + (late.length ? `: ${late.length} late` : ''));

    const lv = after.lvl, playLv = lv.filter(x => x[0] >= start && x[0] < stopT), peak = Math.max(0, ...playLv.map(x => x[1]));
    const perBar = Array.from({ length: BARS }, (_, b) => Math.max(0, ...playLv.filter(x => x[0] >= start + b * barSec && x[0] < start + (b + 1) * barSec).map(x => x[1])));
    check(perBar.every(p => p > 0.05), `sound came out in every bar (peaks ${perBar.map(p => p.toFixed(2)).join(', ')})`);

    check(!after.playing && after.btn === 'Play', `after Stop, the button reads "${after.btn}"`);
    const tail = Math.max(0, ...lv.filter(x => x[0] > stopT + 3.5).map(x => x[1]));
    check(tail < 0.005, `the sound died away within 3.5 s of Stop (level ${tail.toFixed(4)})`);

    check(!errors.length, `no errors in the console` + (errors.length ? ':\n    ' + errors.join('\n    ') : ''));
    if (SHOT) console.log(`Screenshot while playing: ${SHOT}`);
    console.log(fails.length ? `\n${fails.length} check(s) failed` : '\nSequencer OK');
    process.exitCode = fails.length ? 1 : 0;
  } finally { cleanup() }
}

main().catch(e => { console.error('FAILED:', e.message || e); process.exitCode = 1 });
