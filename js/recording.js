// Dustbox: Record input, resample, bounce pattern.
/* ---------- recording, resampling, bouncing ---------- */
const R={state:'idle',kind:null,chunks:[],n:0,tap:null,target:0,t0:null,t1:null,pre:null,stopSeq:false};
let iTap,mTap;
function recCb(d){if(R.state==='idle')return;if(R.state==='building'){R.chunks.push(d);return}
  if(R.state==='armed'){let pk=0;for(let i=0;i<d.L.length;i++){const a=Math.abs(d.L[i]);if(a>pk)pk=a}if(pk>=S.thr){R.state='rec';if(R.pre){R.chunks.push(R.pre);R.n+=R.pre.L.length}R.chunks.push(d);R.n+=d.L.length}else R.pre=d;return}
  R.chunks.push(d);R.n+=d.L.length;if(R.state==='rec'&&R.n>SR*300){toast('Reached the 5-minute limit');stopRec()}}
function startRec(kind){if(R.state!=='idle'){stopRec();return}
  if(kind==='input'&&!IN.src){toast('Turn on the input first');showTab('in');return}
  R.kind=kind;R.target=recTarget();R.chunks=[];R.n=0;R.pre=null;R.tap=kind==='input'?iTap:mTap;R.tap.cb=recCb;R.state=S.auto?'armed':'rec';R.tap.start();updRec();renderLcd()}
function stopRec(){if(R.state==='idle'||R.state==='building')return;const wasArmed=R.state==='armed';R.tap.stop();R.state='building';updRec();
  setTimeout(()=>finishRec(wasArmed?[]:R.chunks,null,null),160)}
function buildBuf(ch,t0,t1,mono){if(!ch.length)return null;const T=ch[0].t;let n=0;for(const c of ch)n+=c.L.length;const L=new Float32Array(n),Rr=new Float32Array(n);let o=0;for(const c of ch){L.set(c.L,o);Rr.set(c.R,o);o+=c.L.length}
  let a=0,b=n;if(t0!=null){a=clamp(Math.round((t0-T)*SR),0,n);b=clamp(Math.round((t1-T)*SR),0,n)}if(b-a<64)return null;
  const buf=ctx.createBuffer(mono?1:2,b-a,SR);buf.getChannelData(0).set(L.subarray(a,b));if(!mono)buf.getChannelData(1).set(Rr.subarray(a,b));return buf}
let gtrN=1;
function finishRec(ch,t0,t1){const kind=R.kind,buf=buildBuf(ch,t0,t1,kind==='input');R.state='idle';R.chunks=[];R.tap.cb=null;
  if(!buf){toast('Nothing was recorded');updRec();renderLcd();return}
  pushUndo();const name=kind==='input'?'Guitar '+(gtrN++):kind==='bounce'?'Bounce P'+(S.pat+1):'Resample';const p=mkPad(name,buf);
  if(kind==='bounce'){p.loop=true;p.bars=patterns[S.pat].len/16}
  pads[R.target]=p;S.sel=R.target;S.bank=Math.floor(R.target/8);toast(`Recorded onto ${padLabel(R.target)}`);renderAll();save()}
function bounce(){if(R.state!=='idle'){toast('Finish the current recording first');return}const pat=patterns[S.pat];if(!hasNotes(pat)){toast('This pattern is empty');return}
  R.stopSeq=!S.playing;if(!S.playing)startPlay();const L=pat.len*stepDur();let t=SQ.loopStart;while(t<ctx.currentTime+.03)t+=L;
  R.kind='bounce';R.target=firstEmpty();R.t0=t;R.t1=t+L;R.chunks=[];R.n=0;R.tap=mTap;R.tap.cb=recCb;R.state='bounce';R.tap.start();updRec()}
function endBounce(){R.tap.stop();R.state='building';const t0=R.t0,t1=R.t1;if(R.stopSeq)stopPlay();setTimeout(()=>finishRec(R.chunks,t0,t1),160)}
function updRec(){const on=k=>R.state!=='idle'&&R.kind===k;
  for(const id of['#qRecIn','#rIn']){const b=$(id);b.classList.toggle('on',on('input'));b.textContent=on('input')?(R.state==='armed'?'Armed: stop':'Stop recording'):'Record input'}
  for(const id of['#qRes','#rRes']){const b=$(id);b.classList.toggle('on',on('master'));b.textContent=on('master')?(R.state==='armed'?'Armed: stop':'Stop resampling'):'Resample'}
  for(const id of['#qBounce','#rBounce']){const b=$(id);b.classList.toggle('on',on('bounce'));b.textContent=on('bounce')?'Bouncing…':'Bounce pattern'}
  $('#rTarget').textContent=R.state==='idle'?`Next recording goes to pad ${padLabel(recTarget())}${pads[S.sel]?' (first empty pad)':''}.`:`Recording to pad ${padLabel(R.target)}.`}
