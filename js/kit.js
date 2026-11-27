// Dustbox: The kit engine: synthesis helpers, the kit list, and loading kits onto banks.
// The kits themselves live in kits/, one file per kit. Each one calls addKit().
/* ---------- kit engine ---------- */
function synth(sec,fn,st){const n=Math.floor(44100*sec),b=ctx.createBuffer(st?2:1,n,44100);for(let c=0;c<b.numberOfChannels;c++)fn(b.getChannelData(c),c,44100);return tagBuf(b)}
const rnd=()=>Math.random()*2-1;
const mf=m=>440*Math.pow(2,(m-69)/12);
// A band-pass filter for synthesis: returns a function that filters one sample at a time.
const bp=(f,q,sr)=>{const w=2*Math.PI*f/sr,al=Math.sin(w)/(2*q),a0=1+al,b0=al/a0,a1=-2*Math.cos(w)/a0,a2=(1-al)/a0;let x1=0,x2=0,y1=0,y2=0;
  return x=>{const y=b0*x-b0*x2-a1*y1-a2*y2;x2=x1;x1=x;y2=y1;y1=y;return y}};
// Builds a pattern for a kit. set(pad, steps, value) uses pad 0–7 of the kit's bank; value 1 = hit, 2 = soft hit, 3 = roll.
function beat(bank,len,fn){const P={len,steps:{},mute:{}},set=(pad,a,v=1)=>{const id=bank*8+pad,s=P.steps[id]||(P.steps[id]=Array(32).fill(0));for(const i of a)s[i]=v};fn(set);return P}
// A kit is {name, bank, pattern, keep, pads(), beat()}: pads() returns up to 8 pads for the bank, beat() returns the pattern.
// With keep set, the Project tab's button only fills the bank when it is empty, so it never replaces the user's sounds.
const KITS=[];
function addKit(k){KITS.push(k)}
// Loads the kits. A new project gets all of them. Returns the letters of the banks that were filled.
function loadKit(fresh){const done=[];
  for(const k of KITS){const b=k.bank*8;if(!fresh&&k.keep&&pads.slice(b,b+8).some(Boolean))continue;
    k.pads().forEach((p,i)=>pads[b+i]=p);if(fresh||!hasNotes(patterns[k.pattern]))patterns[k.pattern]=k.beat();done.push(BANKS[k.bank])}
  if(fresh){S.bpm=86;S.swing=58;S.loose=6;S.chopBank=Math.min(7,Math.max(0,...KITS.map(k=>k.bank))+1);U.dust.on=true;U.verb.on=true}
  S.bank=0;S.sel=0;return done}
