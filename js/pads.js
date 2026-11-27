// Dustbox: Pad model, quality/reverse buffer cache, playback voices.
/* ---------- pads and playback ---------- */
function mkPad(name,orig){return{name,orig:tagBuf(orig),start:0,end:1,mode:'oneshot',loop:false,reverse:false,pitch:0,rate:1,bars:1,vol:1,quality:'std',fx:true}}
const QC=new WeakMap();
function degrade(b,f,bits){const o=ctx.createBuffer(b.numberOfChannels,b.length,b.sampleRate),q=bits?Math.pow(2,bits-1):0;for(let ch=0;ch<b.numberOfChannels;ch++){const x=b.getChannelData(ch),y=o.getChannelData(ch);let h=0;for(let i=0;i<x.length;i++){if(i%f===0){h=x[i];if(q)h=Math.round(h*q)/q}y[i]=h}}return o}
function reverseBuf(b){const o=ctx.createBuffer(b.numberOfChannels,b.length,b.sampleRate);for(let ch=0;ch<b.numberOfChannels;ch++){const x=b.getChannelData(ch),y=o.getChannelData(ch),n=x.length;for(let i=0;i<n;i++)y[i]=x[n-1-i]}return o}
function qBuf(p){let c=QC.get(p.orig);if(!c){c={};QC.set(p.orig,c)}if(p.quality==='std')return p.orig;return c[p.quality]||(c[p.quality]=degrade(p.orig,p.quality==='long'?2:4,p.quality==='lofi'?12:0))}
function getBuf(p){if(!p.reverse)return qBuf(p);let c=QC.get(p.orig);if(!c){c={};QC.set(p.orig,c)}const k=p.quality+'r';return c[k]||(c[k]=reverseBuf(qBuf(p)))}
const rateOf=p=>p.rate*Math.pow(2,p.pitch/12);
const regionSec=p=>(p.end-p.start)*p.orig.duration;
const voices={};
function trigger(id,when,vel=1,seq=false){
  const p=pads[id];if(!p)return;if(ctx.state!=='running')ctx.resume();
  const now=ctx.currentTime,t=Math.max(when||now,now),vs=voices[id]||(voices[id]=[]);
  if(!seq&&p.loop&&p.mode==='oneshot'&&vs.some(v=>!v.ending)){stopPad(id,now);return}
  stopPad(id,t);
  const b=getBuf(p),D=b.duration;let s=p.start*D,e=p.end*D;if(p.reverse){const s2=D-e;e=D-s;s=s2}
  if(e-s<.002)return;
  const src=ctx.createBufferSource();src.buffer=b;const r=rateOf(p);src.playbackRate.value=r;
  const g=G(0);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(p.vol*vel,t+.003);
  src.connect(g).connect(p.fx?fxIn:dry);
  if(p.loop){src.loop=true;src.loopStart=s;src.loopEnd=e;src.start(t,s)}else src.start(t,s,e-s);
  const v={src,g,t0:t,s,e,r,loop:p.loop,rev:p.reverse,D,ending:0};vs.push(v);
  src.onended=()=>{const i=vs.indexOf(v);if(i>=0)vs.splice(i,1)};
  flash(id,t-now)}
function stopPad(id,t){const vs=voices[id];if(!vs)return;t=t==null?ctx.currentTime:t;for(const v of vs){if(v.ending&&v.ending<=t)continue;v.ending=t;try{v.g.gain.cancelScheduledValues(t);v.g.gain.setTargetAtTime(0,t,.006);v.src.stop(t+.05)}catch(e){}}}
function stopAll(){for(const id in voices)stopPad(+id)}
const padEls=[];
function flash(id,dt){if(Math.floor(id/8)!==S.bank)return;const el=padEls[id%8];setTimeout(()=>{el.classList.add('hit');setTimeout(()=>el.classList.remove('hit'),110)},Math.max(0,dt*1000))}
