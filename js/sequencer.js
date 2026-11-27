// Dustbox: Step sequencer: scheduler, swing, live recording, grid rendering.
/* ---------- sequencer ---------- */
const SQ={next:0,step:0,loopStart:0,timer:null,q:[],hist:[],cur:-1,manual:{}};
const stepDur=()=>60/S.bpm/4;
// Step values: 1 = hit, 2 = soft hit, 3 = roll (two 32nd-note hits in one step).
const velOf=v=>v===2?.55:v===3?.85:1,ROLL2=.6;
function startPlay(){if(ctx.state!=='running')ctx.resume();S.playing=true;SQ.step=0;SQ.next=ctx.currentTime+.06;SQ.loopStart=SQ.next;SQ.q=[];SQ.hist=[];clearInterval(SQ.timer);SQ.timer=setInterval(sched,25);sched();updTransport()}
function stopPlay(){S.playing=false;clearInterval(SQ.timer);SQ.cur=-1;SQ.q=[];if(S.nextPat!=null){S.pat=S.nextPat;S.nextPat=null}stopAll();markStep();renderSeq();updTransport()}
let needSeq=false;
function sched(){if(R.state==='bounce'&&ctx.currentTime>R.t1+.25)endBounce();const ahead=ctx.currentTime+.12;while(SQ.next<ahead){playStep(SQ.step,SQ.next);SQ.next+=stepDur();SQ.step++;if(SQ.step>=patterns[S.pat].len){SQ.step=0;SQ.loopStart=SQ.next;if(S.nextPat!=null){S.pat=S.nextPat;S.nextPat=null;needSeq=true}}}}
function playStep(i,t){const pat=patterns[S.pat],sd=stepDur(),now=ctx.currentTime;let tt=t;if(i%2===1)tt+=(S.swing/50-1)*sd;
  for(const k in pat.steps){const v=pat.steps[k][i];if(!v||pat.mute[k])continue;const id=+k;if(SQ.manual[id]!=null&&Math.abs(SQ.manual[id]-t)<sd*.5)continue;const t2=tt+(S.loose?(Math.random()*2-1)*S.loose/1000:0);trigger(id,Math.max(t2,now),velOf(v),true);if(v===3)trigger(id,Math.max(t2+sd/2,now),ROLL2,true)}
  if(S.metro&&i%4===0)click(tt,i===0);SQ.q.push({i,t:tt});SQ.hist.push({i,t});if(SQ.hist.length>8)SQ.hist.shift()}
function click(t,acc){const o=ctx.createOscillator(),g=G(0);o.frequency.value=acc?1600:1000;g.gain.setValueAtTime(.25,t);g.gain.exponentialRampToValueAtTime(.001,t+.04);o.connect(g).connect(ctx.destination);o.start(t);o.stop(t+.05)}
function recordHit(id,vel){if(!S.rec||!S.playing)return;const pat=patterns[S.pat],sd=stepDur(),now=ctx.currentTime-(ctx.outputLatency||0)-(ctx.baseLatency||0);let h=null;for(const c of SQ.hist)if(c.t<=now)h=c;
  let step=0,gt=SQ.loopStart;if(h){const k=Math.round((now-h.t)/sd);step=((h.i+k)%pat.len+pat.len)%pat.len;gt=h.t+k*sd}
  gesture();const st=pat.steps[id]||(pat.steps[id]=Array(32).fill(0));if(!st[step])st[step]=vel<.7?2:1;SQ.manual[id]=gt;needSeq=true;save()}
const stepsView=()=>window.matchMedia('(max-width:600px)').matches?8:16;
const hasNotes=pat=>Object.values(pat.steps).some(a=>a.slice(0,pat.len).some(Boolean));
function renderSeq(){const pat=patterns[S.pat],vw=stepsView(),pages=pat.len/vw;if(S.page>=pages)S.page=0;
  $('#pats').innerHTML=patterns.map((p,i)=>`<button data-v="${i}" class="${i===S.pat?'on':''} ${i===S.nextPat?'q':''} ${hasNotes(p)?'has':''}">${i+1}</button>`).join('');
  seg($('#sLen'),pat.len);
  $('#sPage').innerHTML=pages>1?Array.from({length:pages},(_,k)=>`<button data-v="${k}" class="${k===S.page?'on':''}">${k*vw+1}–${(k+1)*vw}</button>`).join(''):'';
  $('#sMetro').classList.toggle('on',S.metro);
  let h='<span></span>';for(let j=0;j<vw;j++){const i=S.page*vw+j;h+=`<span class="num">${i%4===0?(Math.floor(i/16)+1)+'.'+(Math.floor(i%16/4)+1):''}</span>`}
  for(let r=0;r<8;r++){const id=S.bank*8+r,p=pads[id],st=pat.steps[id],nm=p?esc(p.name):'—';
    h+=`<button class="rl ${pat.mute[id]?'muted':''}" data-mute="${id}" aria-label="Mute ${nm}">${nm}</button>`;
    for(let j=0;j<vw;j++){const i=S.page*vw+j,v=st?st[i]:0;h+=`<button class="cell ${v?'v'+v:''} ${Math.floor(i/4)%2?'alt':''}" data-c="${id}:${i}" data-i="${i}" aria-label="${nm} step ${i+1}"></button>`}}
  const g=$('#grid');g.style.gridTemplateColumns=`minmax(4.5em,7em) repeat(${vw},minmax(0,1fr))`;g.innerHTML=h;
  $('#sSwing').value=S.swing;$('#oSwing').textContent=S.swing+'%';$('#sLoose').value=S.loose;$('#oLoose').textContent=S.loose+' ms';
  markStep()}
let lastMark=[];
function markStep(){for(const c of lastMark)c.classList.remove('now');lastMark=SQ.cur<0?[]:[...document.querySelectorAll(`#grid [data-i="${SQ.cur}"]`)];for(const c of lastMark)c.classList.add('now')}
function updTransport(){$('#play').textContent=S.playing?'Stop':'Play';$('#play').classList.toggle('on',S.playing);$('#recSeq').classList.toggle('on',S.rec);renderLcd()}
function setBpm(v){S.bpm=clamp(Math.round(v*10)/10,40,220);$('#bpm').value=S.bpm;U.delay.apply();renderLcd();renderPadPanel();save()}
