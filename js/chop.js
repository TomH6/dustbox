// Dustbox: Chop: equal slices and onset detection.
/* ---------- chop and tempo ---------- */
function onsets(b,s,e,max){const x=b.getChannelData(0),x2=b.numberOfChannels>1?b.getChannelData(1):null,N=x.length,a=Math.floor(s*N),z=Math.floor(e*N),hop=512,en=[];
  for(let i=a;i<z;i+=hop){let sum=0;for(let k=i;k<Math.min(z,i+hop);k++){const v=x2?(x[k]+x2[k])*.5:x[k];sum+=v*v}en.push(Math.log(1e-6+sum))}
  const fl=en.map((v,i)=>i?Math.max(0,v-en[i-1]):0),mean=fl.reduce((A,B)=>A+B,0)/Math.max(1,fl.length),gap=Math.ceil(.09*b.sampleRate/hop),cand=[];
  for(let i=1;i<fl.length-1;i++)if(fl[i]>mean*2.2&&fl[i]>=fl[i-1]&&fl[i]>=fl[i+1])cand.push([i,fl[i]]);
  cand.sort((A,B)=>B[1]-A[1]);const pick=[];for(const[i]of cand){if(i<gap/2)continue;if(pick.every(j=>Math.abs(j-i)>=gap))pick.push(i);if(pick.length>=max-1)break}
  pick.sort((A,B)=>A-B);const out=[s];for(const i of pick){const f=Math.max(s,(a+i*hop-hop/2)/N);if(f-out[out.length-1]>.0005)out.push(snapZ(b,f))}return out}
function chop(){const p=pads[S.sel];if(!p)return;const n=S.chopN;let pts;
  if(S.chopMode==='equal')pts=Array.from({length:n},(_,k)=>k?snapZ(p.orig,p.start+k*(p.end-p.start)/n):p.start);
  else{pts=onsets(p.orig,p.start,p.end,n);if(pts.length<2){toast('Not enough hits found. Try Equal.');return}}
  pushUndo();const base=S.chopBank*8,src={...p};let c=0;
  for(let k=0;k<pts.length;k++){const id=base+k;if(id>=NP)break;pads[id]={...src,name:`${src.name.slice(0,14)} ${k+1}`,start:pts[k],end:k+1<pts.length?pts[k+1]:src.end,loop:false,mode:'oneshot'};c++}
  S.bank=S.chopBank;S.sel=base;toast(`Chopped into ${c} pads from ${padLabel(base)}`);renderAll();save()}
