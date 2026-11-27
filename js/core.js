// Dustbox: Shared state, helpers, the audio graph and the AudioWorklet code (bit crusher + recording tap).
const $=s=>document.querySelector(s);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
const pct=v=>Math.round(v*100)+'%';
const hz=v=>v<1000?Math.round(v)+' Hz':(v/1000).toFixed(1)+' kHz';
const db=v=>(v>0?'+':'')+(+v).toFixed(1)+' dB';
const BANKS='ABCDEFGH',NP=64;
const AC=window.AudioContext||window.webkitAudioContext;
const ctx=new AC({latencyHint:'interactive'});
const SR=ctx.sampleRate;
const inClaude=!!(window.claude&&window.claude.use);

let pads=Array(NP).fill(null);
const newPat=()=>({len:16,steps:{},mute:{}});
let patterns=Array.from({length:8},newPat);
const S={bank:0,sel:0,pat:0,nextPat:null,bpm:90,swing:56,loose:0,playing:false,rec:false,metro:false,page:0,master:.85,zoom:false,
  chopN:8,chopMode:'equal',chopBank:1,auto:false,thr:.04,monitor:false,monFx:true,inCh:'1',inGain:1,
  chain:['filter','iso','crush','dust','delay','verb']};
let bufSeq=0;
const tagBuf=b=>{if(!b._id)b._id='b'+Date.now().toString(36)+(bufSeq++);return b};

/* ---------- audio graph ---------- */
const G=(v=1)=>{const g=ctx.createGain();g.gain.value=v;return g};
const master=G(S.master),lim=ctx.createDynamicsCompressor();
lim.threshold.value=-2;lim.knee.value=0;lim.ratio.value=20;lim.attack.value=.002;lim.release.value=.12;
master.connect(lim).connect(ctx.destination);
const fxIn=G(),fxOut=G(),dry=G();fxOut.connect(master);dry.connect(master);
const sink=G(0);sink.connect(ctx.destination);
function curve(k){const n=2048,c=new Float32Array(n),t=Math.tanh(k);for(let i=0;i<n;i++){const x=i/(n-1)*2-1;c[i]=Math.tanh(k*x)/t}return c}
function bq(type,f,q){const b=ctx.createBiquadFilter();b.type=type;b.frequency.value=f;if(q)b.Q.value=q;return b}

const WL=`class Crush extends AudioWorkletProcessor{constructor(){super();this.b=10;this.d=4;this.m=1;this.h=[0,0];this.c=[0,0];this.port.onmessage=e=>Object.assign(this,e.data)}
process(i,o){const a=i[0],y=o[0];if(!a||!a.length)return true;const q=Math.pow(2,this.b-1),m=this.m,d=this.d;for(let ch=0;ch<y.length;ch++){const x=a[ch]||a[0],out=y[ch];let c=this.c[ch]||0,h=this.h[ch]||0;for(let n=0;n<out.length;n++){if(c<=0){h=Math.round(x[n]*q)/q;c=d}c--;out[n]=x[n]*(1-m)+h*m}this.c[ch]=c;this.h[ch]=h}return true}}
class Tap extends AudioWorkletProcessor{constructor(){super();this.r=false;this.L=[];this.R=[];this.n=0;this.t=0;this.port.onmessage=e=>{this.r=e.data.r;if(!this.r)this.flush()}}
flush(){if(!this.n)return;const L=new Float32Array(this.n),R=new Float32Array(this.n);let o=0;for(let k=0;k<this.L.length;k++){L.set(this.L[k],o);R.set(this.R[k],o);o+=this.L[k].length}this.port.postMessage({t:this.t,L,R},[L.buffer,R.buffer]);this.L=[];this.R=[];this.n=0}
process(i){if(this.r){const a=i[0];if(!this.n)this.t=currentTime;if(a&&a.length){this.L.push(a[0].slice());this.R.push((a[1]||a[0]).slice())}else{this.L.push(new Float32Array(128));this.R.push(new Float32Array(128))}this.n+=128;if(this.n>=4096)this.flush()}return true}}
registerProcessor('crush',Crush);registerProcessor('tap',Tap);`;
let WK=false;
async function initWorklet(){try{const url=URL.createObjectURL(new Blob([WL],{type:'application/javascript'}));await ctx.audioWorklet.addModule(url);WK=true}catch(e){WK=false}}

function makeTap(){const t={cb:null};
  if(WK){const n=new AudioWorkletNode(ctx,'tap',{numberOfInputs:1,numberOfOutputs:1,outputChannelCount:[1],channelCount:2,channelCountMode:'explicit'});n.port.onmessage=e=>t.cb&&t.cb(e.data);n.connect(sink);t.node=n;t.start=()=>n.port.postMessage({r:true});t.stop=()=>n.port.postMessage({r:false})}
  else{const n=ctx.createScriptProcessor(2048,2,1);let on=false;n.onaudioprocess=e=>{if(!on||!t.cb)return;const b=e.inputBuffer;t.cb({t:e.playbackTime||ctx.currentTime,L:b.getChannelData(0).slice(),R:b.getChannelData(1).slice()})};n.connect(sink);t.node=n;t.start=()=>{on=true};t.stop=()=>{on=false}}
  return t}
