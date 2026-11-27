// Dustbox: Undo/redo, toast and dialog helpers, rendering of pads, pad panel and LCD.
/* ---------- undo ---------- */
const UN=[],RE=[];let lastU=0;
const snap=()=>({pads:pads.map(p=>p&&{...p}),pats:JSON.stringify(patterns)});
function pushUndo(){UN.push(snap());if(UN.length>60)UN.shift();RE.length=0;updUndo()}
function gesture(){const t=Date.now();if(t-lastU>800)pushUndo();lastU=t}
function restore(s){pads=s.pads;patterns=JSON.parse(s.pats);retempo(true);renderAll();save()}
function undo(){if(!UN.length)return;RE.push(snap());restore(UN.pop());toast('Undone')}
function redo(){if(!RE.length)return;UN.push(snap());restore(RE.pop());toast('Redone')}
function updUndo(){$('#undo').disabled=!UN.length;$('#redo').disabled=!RE.length}

/* ---------- ui helpers ---------- */
let toastT;function toast(m){const t=$('#toast');t.textContent=m;t.classList.add('show');clearTimeout(toastT);toastT=setTimeout(()=>t.classList.remove('show'),2600)}
function ask(text,yes='OK'){return new Promise(res=>{$('#dlgT').textContent=text;$('#dlgYes').textContent=yes;const d=$('#dlg');d.hidden=false;const done=v=>{d.hidden=true;$('#dlgYes').onclick=$('#dlgNo').onclick=null;res(v)};$('#dlgYes').onclick=()=>done(true);$('#dlgNo').onclick=()=>done(false);$('#dlgYes').focus()})}
function seg(el,val){for(const b of el.querySelectorAll('button[data-v]'))b.classList.toggle('on',b.dataset.v===String(val))}
function onSeg(el,cb){el.addEventListener('click',e=>{const b=e.target.closest('button[data-v]');if(b)cb(b.dataset.v)})}
const padLabel=id=>BANKS[Math.floor(id/8)]+(id%8+1);
const firstEmpty=()=>{for(let k=0;k<NP;k++){const id=(S.bank*8+k)%NP;if(!pads[id])return id}return S.sel};
const recTarget=()=>pads[S.sel]?firstEmpty():S.sel;
const cssv=n=>getComputedStyle(document.documentElement).getPropertyValue(n).trim();

/* ---------- rendering ---------- */
function renderBanks(){$('#banks').innerHTML=[...BANKS].map((b,i)=>{const has=pads.slice(i*8,i*8+8).some(Boolean);return`<button data-b="${i}" class="${i===S.bank?'on':''} ${has?'has':''}" aria-label="Bank ${b}">${b}</button>`}).join('')}
function renderPads(){padEls.forEach((el,i)=>{const id=S.bank*8+i,p=pads[id];el.classList.toggle('empty',!p);el.classList.toggle('sel',id===S.sel);
  const tg=p?[p.loop&&'Loop',p.mode==='gate'&&'Gate',p.reverse&&'Rev',p.quality==='long'&&'22k',p.quality==='lofi'&&'11k',!p.fx&&'Dry'].filter(Boolean).join(' · '):'';
  el.innerHTML=`<span class="n">${padLabel(id)}</span><span class="nm">${p?esc(p.name):'Empty'}</span><span class="tg">${tg}</span>`;el.setAttribute('aria-label','Pad '+padLabel(id)+(p?': '+p.name:' (empty)'))});renderBanks()}
function renderPadPanel(){const p=pads[S.sel];$('#pEmpty').hidden=!!p;$('#pBody').hidden=!p;
  $('#cBank').innerHTML=[...BANKS].map((b,i)=>`<option value="${i}" ${i===S.chopBank?'selected':''}>${b}</option>`).join('');
  $('#cN').value=S.chopN;seg($('#cMode'),S.chopMode);$('#pZoom').classList.toggle('on',S.zoom);
  if(!p)return;
  if(document.activeElement!==$('#pName'))$('#pName').value=p.name;
  seg($('#pMode'),p.mode);seg($('#pQual'),p.quality);
  $('#pLoop').classList.toggle('on',p.loop);$('#pRev').classList.toggle('on',p.reverse);$('#pFx').classList.toggle('on',p.fx);
  $('#pPitch').value=p.pitch;$('#oPitch').textContent=(p.pitch>0?'+':'')+p.pitch+' st';
  $('#pVol').value=p.vol;$('#oVol').textContent=pct(p.vol);
  $('#pBars').value=String(p.bars);$('#tempoCard').hidden=!(p.loop||regionSec(p)>1.5);
  const lb=p.bars*240/(regionSec(p)/rateOf(p));
  $('#oBpm').textContent=`Loop ≈ ${lb.toFixed(1)} BPM`+(p.rate!==1?` · speed ×${p.rate.toFixed(3)}`:'')}
function renderLcd(){const p=pads[S.sel];$('#lPad').textContent=padLabel(S.sel);$('#lName').textContent=p?p.name:'Empty';
  $('#lRight').textContent=`${(+S.bpm).toFixed(1).replace(/\.0$/,'')} BPM · Pattern ${S.pat+1}${S.nextPat!=null?' → '+(S.nextPat+1):''}`;
  $('#lInfo').textContent=p?`${(regionSec(p)/rateOf(p)).toFixed(2)} s · ${p.mode==='gate'?'Gate':'One-shot'}${p.loop?' loop':''} · ${{std:'Standard',long:'Long',lofi:'Lo-fi'}[p.quality]}`:'Load, drop or record a sound';
  recStat()}
function recStat(){const el=$('#lStat');let t='',r=true;
  if(R.state==='armed')t='Armed: waiting for signal';else if(R.state==='rec')t=`● Rec ${padLabel(R.target)}  ${(R.n/SR).toFixed(1)} s`;
  else if(R.state==='bounce'){const d=R.t0-ctx.currentTime;t=d>0?`Bounce starts in ${d.toFixed(1)} s`:`● Bouncing ${padLabel(R.target)}`}
  else{t=S.rec?'Pattern rec on':(S.playing?'Playing':'Ready');r=S.rec}
  el.textContent=t;el.classList.toggle('r',r&&t!=='Ready')}
function renderAll(){renderPads();renderPadPanel();renderLcd();drawWave();renderSeq();renderFx();renderIn();updUndo()}
