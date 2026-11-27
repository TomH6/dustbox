// Dustbox: Pad interaction, event bindings, animation frame loop and startup. Loaded last.
/* ---------- pad interaction ---------- */
function select(id){if(S.sel===id)return;S.sel=id;renderPads();renderPadPanel();renderLcd();drawWave();updRec()}
function hit(id,vel=1){select(id);if(pads[id]){trigger(id,0,vel);recordHit(id,vel)}}
function release(id){const p=pads[id];if(p&&p.mode==='gate')stopPad(id)}
function showTab(t){for(const b of document.querySelectorAll('#tabs button'))b.classList.toggle('on',b.dataset.tab===t);for(const p of document.querySelectorAll('.panel'))p.classList.toggle('on',p.id==='tab-'+t);if(t==='seq')renderSeq()}
function edit(fn){const p=pads[S.sel];if(!p)return;gesture();fn(p);renderPadPanel();renderPads();renderLcd();drawWave();save()}

function bind(){
  const padsEl=$('#pads'),down={};
  for(let i=0;i<8;i++){const el=document.createElement('button');el.className='pad';padsEl.append(el);padEls.push(el);
    el.addEventListener('pointerdown',e=>{e.preventDefault();const id=S.bank*8+i;try{el.setPointerCapture(e.pointerId)}catch(_){}down[e.pointerId]=id;hit(id)});
    const up=e=>{const id=down[e.pointerId];if(id==null)return;delete down[e.pointerId];release(id)};el.addEventListener('pointerup',up);el.addEventListener('pointercancel',up);
    el.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();hit(S.bank*8+i)}});
    el.addEventListener('dragover',e=>{e.preventDefault();el.classList.add('drop')});el.addEventListener('dragleave',()=>el.classList.remove('drop'));
    el.addEventListener('drop',e=>{e.preventDefault();el.classList.remove('drop');loadFiles([...e.dataTransfer.files],S.bank*8+i)})}
  document.addEventListener('dragover',e=>e.preventDefault());document.addEventListener('drop',e=>{e.preventDefault();if(e.dataTransfer&&e.dataTransfer.files.length)loadFiles([...e.dataTransfer.files],S.sel)});
  document.addEventListener('pointerdown',()=>{if(ctx.state!=='running')ctx.resume()},{capture:true});
  $('#banks').addEventListener('click',e=>{const b=e.target.closest('[data-b]');if(!b)return;S.bank=+b.dataset.b;S.sel=S.bank*8+S.sel%8;renderPads();renderPadPanel();renderLcd();drawWave();renderSeq();updRec()});
  $('#tabs').addEventListener('click',e=>{const b=e.target.closest('[data-tab]');if(b)showTab(b.dataset.tab)});
  // header
  $('#play').onclick=()=>S.playing?stopPlay():startPlay();
  $('#recSeq').onclick=()=>{S.rec=!S.rec;if(S.rec&&!S.playing)startPlay();updTransport()};
  $('#bpm').addEventListener('change',e=>{const v=parseFloat(e.target.value);if(isFinite(v))setBpm(v);else e.target.value=S.bpm});
  let taps=[];$('#tap').onclick=()=>{const t=performance.now();if(taps.length&&t-taps[taps.length-1]>2000)taps=[];taps.push(t);if(taps.length>5)taps.shift();if(taps.length>=2){const iv=(taps[taps.length-1]-taps[0])/(taps.length-1);setBpm(60000/iv)}};
  $('#undo').onclick=undo;$('#redo').onclick=redo;
  // quick bar
  $('#qLoad').onclick=()=>pickFiles(S.sel);$('#pLoad').onclick=()=>pickFiles(S.sel);$('#pLoad2').onclick=()=>pickFiles(S.sel);
  $('#qRecIn').onclick=$('#rIn').onclick=()=>R.state!=='idle'&&R.kind==='input'?stopRec():startRec('input');
  $('#qRes').onclick=$('#rRes').onclick=()=>R.state!=='idle'&&R.kind==='master'?stopRec():startRec('master');
  $('#qBounce').onclick=$('#rBounce').onclick=bounce;
  // pad panel
  $('#pName').addEventListener('input',e=>{const p=pads[S.sel];if(!p)return;gesture();p.name=e.target.value.slice(0,24)||'Untitled';renderPads();renderLcd();renderSeq();save()});
  onSeg($('#pMode'),v=>edit(p=>p.mode=v));onSeg($('#pQual'),v=>edit(p=>p.quality=v));
  $('#pLoop').onclick=()=>edit(p=>p.loop=!p.loop);$('#pRev').onclick=()=>edit(p=>p.reverse=!p.reverse);$('#pFx').onclick=()=>edit(p=>p.fx=!p.fx);
  $('#pPitch').addEventListener('input',e=>edit(p=>p.pitch=+e.target.value));
  $('#pVol').addEventListener('input',e=>{const p=pads[S.sel];if(!p)return;gesture();p.vol=+e.target.value;$('#oVol').textContent=pct(p.vol);save()});
  $('#pZoom').onclick=()=>{S.zoom=!S.zoom;renderPadPanel();drawWave()};
  $('#pTrim').onclick=()=>edit(p=>{p.start=0;p.end=1});
  $('#pBars').addEventListener('change',e=>edit(p=>p.bars=+e.target.value));
  $('#pFit').onclick=()=>edit(p=>{p.rate=clamp(regionSec(p)/(p.bars*240/S.bpm),.25,4);p.pitch=0;p.loop=true});
  $('#pTempo').onclick=()=>{const p=pads[S.sel];if(!p)return;let b=p.bars*240/regionSec(p);while(b>180)b/=2;while(b<60)b*=2;edit(q=>{q.rate=1;q.pitch=0;q.loop=true});setBpm(b);toast(`Tempo set to ${S.bpm} BPM`)};
  $('#pUnfit').onclick=()=>edit(p=>p.rate=1);
  $('#pClear').onclick=async()=>{const p=pads[S.sel];if(!p)return;if(await ask(`Clear pad ${padLabel(S.sel)} (${p.name})? You can undo this.`,'Clear')){pushUndo();stopPad(S.sel);pads[S.sel]=null;renderAll();save()}};
  $('#pDl').onclick=()=>{const p=pads[S.sel];if(!p)return;const b=getBuf(p),s=p.reverse?1-p.end:p.start,e=p.reverse?1-p.start:p.end;saveFile(p.name.replace(/[^\w\- ]+/g,'').trim().replace(/\s+/g,'-')+'.wav',wav(b,s,e))};
  $('#cN').addEventListener('change',e=>{S.chopN=+e.target.value;save()});onSeg($('#cMode'),v=>{S.chopMode=v;seg($('#cMode'),v);save()});
  $('#cBank').addEventListener('change',e=>{S.chopBank=+e.target.value;save()});$('#cGo').onclick=chop;
  // sequencer
  onSeg($('#pats'),v=>{const i=+v;if(S.playing&&i!==S.pat){S.nextPat=i===S.nextPat?null:i}else{S.pat=i;S.nextPat=null}renderSeq();renderLcd()});
  onSeg($('#sLen'),v=>{gesture();patterns[S.pat].len=+v;renderSeq();save()});
  onSeg($('#sPage'),v=>{S.page=+v;renderSeq()});
  $('#sMetro').onclick=()=>{S.metro=!S.metro;renderSeq();save()};
  $('#sClear').onclick=()=>{pushUndo();patterns[S.pat]=newPat();renderSeq();save();toast('Pattern cleared. Undo brings it back.')};
  $('#grid').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;const pat=patterns[S.pat];
    if(b.dataset.mute){const id=b.dataset.mute;if(pat.mute[id])delete pat.mute[id];else pat.mute[id]=true;renderSeq();save();return}
    if(b.dataset.c){const[id,i]=b.dataset.c.split(':').map(Number);gesture();const st=pat.steps[id]||(pat.steps[id]=Array(32).fill(0));st[i]=(st[i]+1)%3;b.className=`cell ${st[i]===1?'v1':st[i]===2?'v2':''} ${Math.floor(i/4)%2?'alt':''} ${SQ.cur===i?'now':''}`;if(st[i]&&pads[id]&&!S.playing)trigger(id,0,st[i]===2?.55:1);
      $('#pats').querySelectorAll('button')[S.pat].classList.toggle('has',hasNotes(pat));save()}});
  $('#sSwing').addEventListener('input',e=>{S.swing=+e.target.value;$('#oSwing').textContent=S.swing+'%';save()});
  $('#sLoose').addEventListener('input',e=>{S.loose=+e.target.value;$('#oLoose').textContent=S.loose+' ms';save()});
  let lastVw=stepsView();window.addEventListener('resize',()=>{const v=stepsView();if(v!==lastVw){lastVw=v;renderSeq()}});
  // input
  $('#iOn').onclick=()=>enableInput();$('#iDev').addEventListener('change',e=>enableInput(e.target.value));
  onSeg($('#iCh'),v=>{S.inCh=v;routeIn();renderIn();save()});
  $('#iGain').addEventListener('input',e=>{S.inGain=+e.target.value;IN.lvl.gain.setTargetAtTime(S.inGain,ctx.currentTime,.02);$('#oIn').textContent=S.inGain.toFixed(2)+'×';save()});
  $('#iMon').onclick=()=>{S.monitor=!S.monitor;monRoute();renderIn();if(S.monitor&&!IN.src)toast('Turn on the input to hear it')};
  $('#iMonFx').onclick=()=>{S.monFx=!S.monFx;monRoute();renderIn();save()};
  $('#rAuto').onclick=()=>{S.auto=!S.auto;renderIn();save()};
  $('#rThr').addEventListener('input',e=>{S.thr=+e.target.value;$('#oThr').textContent=Math.round(20*Math.log10(S.thr))+' dB';save()});
  // project
  $('#pjKit').onclick=()=>{pushUndo();loadKit(false);renderAll();save();toast('Starter kit loaded into bank A')};
  $('#pjNew').onclick=async()=>{if(!await ask('Start a new empty project? All pads and patterns are cleared. You can undo this until you reload the page.','Start new'))return;pushUndo();stopPlay();pads=Array(NP).fill(null);patterns=Array.from({length:8},newPat);S.bank=0;S.sel=0;S.pat=0;renderAll();save()};
  $('#midiOn').onclick=midiOn;
  // keyboard
  const KEYS='qwerasdf';
  addEventListener('keydown',e=>{if(e.target.matches('input[type=text],input[type=number],select,textarea'))return;const k=e.key.toLowerCase();
    if((e.metaKey||e.ctrlKey)&&k==='z'){e.preventDefault();e.shiftKey?redo():undo();return}
    if(e.metaKey||e.ctrlKey||e.altKey)return;if(k===' '){e.preventDefault();if(!e.repeat)(S.playing?stopPlay():startPlay());return}
    if(e.repeat)return;const i=KEYS.indexOf(k);if(i>=0)hit(S.bank*8+i)});
  addEventListener('keyup',e=>{if(e.key===' '&&!e.target.matches('input,select,textarea'))e.preventDefault();const i=KEYS.indexOf(e.key.toLowerCase());if(i>=0)release(S.bank*8+i)});
}

let lastAct=-9;
function busy(now){if(S.playing||(S.monitor&&IN.src)||R.state!=='idle')return true;for(const id in voices)for(const v of voices[id])if(v.t0<=now+.05&&(!v.ending||v.ending>now))return true;return false}
function idleCheck(){const now=ctx.currentTime;if(busy(now))lastAct=now;const act=now-lastAct<1.2;if(U.dust&&U.dust.active!==act)U.dust.setActive(act)}
setInterval(idleCheck,300);
function frame(){const now=ctx.currentTime;idleCheck();let ch=false;while(SQ.q.length&&SQ.q[0].t<=now){SQ.cur=SQ.q.shift().i;ch=true}if(ch)markStep();
  if(needSeq){needSeq=false;renderSeq();renderLcd()}
  if(R.state==='bounce'&&now>R.t1+.25)endBounce();
  if(R.state!=='idle')recStat();
  drawHead();meter();requestAnimationFrame(frame)}

(async()=>{
  bind();setStat('Loading…');
  await initWorklet();buildUnits();
  iTap=makeTap();mTap=makeTap();IN.lvl.connect(iTap.node);master.connect(mTap.node);
  const tmo=(pr,ms)=>Promise.race([pr,new Promise((_,rej)=>setTimeout(()=>rej(new Error('timeout')),ms))]);
  try{idb=await tmo(openDb(),2500)}catch(e){idb=null}
  let ok=false;if(idb){try{ok=await tmo(loadProject(),8000)}catch(e){ok=false;pads=Array(NP).fill(null)}}
  if(!ok)loadKit(true);
  wire();for(const u of Object.values(U)){u.apply();u.setOn(u.on)}
  master.gain.value=S.master;IN.lvl.gain.value=S.inGain;$('#bpm').value=S.bpm;
  renderAll();updTransport();setStat(idb?'Saved':'Not saved: storage is unavailable in this view');if(idb&&!ok)save();
  requestAnimationFrame(frame)})();
