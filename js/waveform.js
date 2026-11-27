// Dustbox: Waveform drawing, playhead and start/end dragging.
/* ---------- waveform ---------- */
const wv=$('#wv'),ph=$('#ph');let dragView=null,drag=null;
function view(p){if(dragView)return dragView;if(!S.zoom)return[0,1];const w=Math.max(p.end-p.start,.002);return[Math.max(0,p.start-w*.08),Math.min(1,p.end+w*.08)]}
function drawWave(){const W=wv.clientWidth,H=wv.clientHeight,dpr=window.devicePixelRatio||1;if(!W)return;
  for(const c of[wv,ph]){c.width=Math.round(W*dpr);c.height=Math.round(H*dpr)}
  const g=wv.getContext('2d');g.setTransform(dpr,0,0,dpr,0,0);g.clearRect(0,0,W,H);
  const ink=cssv('--lcdink'),dim=cssv('--lcddim'),p=pads[S.sel];
  g.fillStyle=dim;g.fillRect(0,H/2,W,1);
  if(!p){g.fillStyle=ink;g.font='600 15px "Chakra Petch",sans-serif';g.textAlign='center';g.fillText('Empty pad',W/2,H/2-12);return}
  const b=qBuf(p),x=b.getChannelData(0),x2=b.numberOfChannels>1?b.getChannelData(1):null,[v0,v1]=view(p),N=x.length,i0=Math.floor(v0*N),per=(v1-v0)*N/W,stride=Math.max(1,Math.floor(per/500));
  for(let px=0;px<W;px++){let mn=1,mx=-1;const a=i0+Math.floor(px*per),z=Math.min(N,i0+Math.floor((px+1)*per)+1);for(let i=a;i<z;i+=stride){const s=x2?(x[i]+x2[i])*.5:x[i];if(s<mn)mn=s;if(s>mx)mx=s}if(mn>mx)mn=mx=0;
    const f=v0+(px+.5)/W*(v1-v0);g.fillStyle=f>=p.start&&f<=p.end?ink:dim;const y1=H/2-mx*H*.46,y2=H/2-mn*H*.46;g.fillRect(px,y1,1,Math.max(1,y2-y1))}
  for(const [f,l] of [[p.start,'S'],[p.end,'E']]){const X=Math.round((f-v0)/(v1-v0)*W);if(X<-2||X>W+2)continue;g.fillStyle=ink;g.fillRect(X-1,0,2,H);g.fillRect(l==='S'?X:X-18,H-20,18,20);g.fillStyle=cssv('--lcd');g.font='700 13px "Chakra Petch",sans-serif';g.textAlign='center';g.fillText(l,l==='S'?X+9:X-9,H-5)}}
function drawHead(){const p=pads[S.sel],W=ph.clientWidth,H=ph.clientHeight,dpr=window.devicePixelRatio||1,g=ph.getContext('2d');g.setTransform(dpr,0,0,dpr,0,0);g.clearRect(0,0,W,H);
  if(!p)return;const vs=voices[S.sel];if(!vs||!vs.length)return;const now=ctx.currentTime;let v=null;for(const c of vs)if(c.t0<=now&&(!c.ending||c.ending>now))v=c;if(!v)return;
  const el=(now-v.t0)*v.r;let pos=v.loop?v.s+el%(v.e-v.s):v.s+el;if(pos>v.e)return;if(v.rev)pos=v.D-pos;const [v0,v1]=view(p),X=(pos/v.D-v0)/(v1-v0)*W;
  g.fillStyle=cssv('--acc');g.fillRect(X-1,0,2,H)}
function snapZ(b,f){const x=b.getChannelData(0),n=x.length,i=clamp(Math.floor(f*n),1,n-1);for(let d=0;d<300;d++){for(const j of[i+d,i-d])if(j>0&&j<n&&((x[j-1]<=0&&x[j]>0)||(x[j-1]>=0&&x[j]<0)))return j/n}return f}
function waveF(e,p){const r=ph.getBoundingClientRect(),[v0,v1]=view(p);return clamp(v0+(e.clientX-r.left)/r.width*(v1-v0),0,1)}
ph.addEventListener('pointerdown',e=>{const p=pads[S.sel];if(!p)return;dragView=view(p);const f=waveF(e,p);drag=Math.abs(f-p.start)<=Math.abs(f-p.end)?'start':'end';pushUndo();ph.setPointerCapture(e.pointerId);waveMove(e)});
function waveMove(e){if(!drag)return;const p=pads[S.sel];const f=waveF(e,p);if(drag==='start')p.start=Math.min(f,p.end-.0005);else p.end=Math.max(f,p.start+.0005);drawWave();renderLcd()}
ph.addEventListener('pointermove',waveMove);
const waveUp=()=>{if(!drag)return;const p=pads[S.sel];p[drag]=snapZ(p.orig,p[drag]);if(p.start>=p.end)p.end=Math.min(1,p.start+.001);drag=null;dragView=null;drawWave();renderPadPanel();renderLcd();save();trigger(S.sel)};
ph.addEventListener('pointerup',waveUp);ph.addEventListener('pointercancel',waveUp);
new ResizeObserver(()=>drawWave()).observe($('#wave'));
