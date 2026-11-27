// Dustbox: Effect units (filter, isolator, crusher, dust comp, echo, reverb) and chain wiring.
/* ---------- effect units ---------- */
const U={};
function mkUnit(id,name,defs,build){
  const inp=G(),out=G(),dG=G(1),wG=G(0);inp.connect(dG).connect(out);
  const u={id,name,inp,out,dG,wG,on:false,p:{},defs,apply:()=>{}};
  for(const k in defs)u.p[k]=defs[k].v;
  build(inp,u).connect(wG).connect(out);
  u.setOn=on=>{u.on=on;const t=ctx.currentTime;dG.gain.setTargetAtTime(on?0:1,t,.01);wG.gain.setTargetAtTime(on?1:0,t,.01)};
  U[id]=u;return u}
const cutHz=v=>40*Math.pow(2,v*9),toneHz=v=>2500*Math.pow(2,v*3),echoHz=v=>700*Math.pow(2,v*3.6);
const DIV=[['1/16',.25],['1/8',.5],['Dotted 1/8',.75],['1/4',1],['Dotted 1/4',1.5],['1/2',2]];
function crackle(sec){const n=Math.floor(44100*sec),b=ctx.createBuffer(2,n,44100);for(let ch=0;ch<2;ch++){const d=b.getChannelData(ch);let lp=0,cl=0;for(let i=0;i<n;i++){lp+=(Math.random()*2-1-lp)*.04;if(Math.random()<.0004)cl=Math.pow(Math.random(),3)*(Math.random()<.5?-1:1)*.9;d[i]=lp*.05+(Math.random()*2-1)*.004+cl;cl*=.5}}return b}
function makeIR(sec,damp){const n=Math.floor(SR*sec),b=ctx.createBuffer(2,n,SR),a=.04+(1-damp)*.9;for(let ch=0;ch<2;ch++){const d=b.getChannelData(ch);let lp=0;for(let i=0;i<n;i++){lp+=(Math.random()*2-1-lp)*a;d[i]=lp*Math.pow(1-i/n,2.6)}}return b}

function buildUnits(){
  mkUnit('filter','Filter + drive',{
    type:{label:'Type',opts:[['lowpass','Low-pass'],['highpass','High-pass'],['bandpass','Band-pass']],v:'lowpass'},
    cut:{label:'Cutoff',v:.62,step:.001,fmt:v=>hz(cutHz(v))},res:{label:'Resonance',v:.2},drive:{label:'Drive',v:.25}},
    (inp,u)=>{const pre=G(),ws=ctx.createWaveShaper(),f=ctx.createBiquadFilter(),post=G();ws.oversample='2x';inp.connect(pre).connect(ws).connect(f).connect(post);
      u.apply=()=>{const p=u.p;f.type=p.type;f.frequency.setTargetAtTime(cutHz(p.cut),ctx.currentTime,.02);f.Q.value=.7+p.res*17;pre.gain.value=1+p.drive*6;ws.curve=curve(1+p.drive*12);post.gain.value=1/(1+p.drive*2.5)};return post});
  mkUnit('iso','Isolator',{lo:{label:'Low',min:-30,max:6,step:.5,v:0,fmt:db},mid:{label:'Mid',min:-30,max:6,step:.5,v:0,fmt:db},hi:{label:'High',min:-30,max:6,step:.5,v:0,fmt:db}},
    (inp,u)=>{const l=bq('lowshelf',220),m=bq('peaking',1200,.8),h=bq('highshelf',3800);inp.connect(l).connect(m).connect(h);u.apply=()=>{l.gain.value=u.p.lo;m.gain.value=u.p.mid;h.gain.value=u.p.hi};return h});
  mkUnit('crush','Bit crusher',{bits:{label:'Bits',min:3,max:16,step:1,v:10,fmt:v=>v+' bit'},down:{label:'Rate',min:1,max:32,step:1,v:4,fmt:v=>(SR/v/1000).toFixed(1)+' kHz'},mix:{label:'Mix',v:1}},
    (inp,u)=>{let n;
      if(WK){n=new AudioWorkletNode(ctx,'crush',{outputChannelCount:[2]});u.apply=()=>n.port.postMessage({b:u.p.bits,d:u.p.down,m:u.p.mix})}
      else{n=ctx.createScriptProcessor(512,2,2);const st={h:[0,0],c:[0,0]};n.onaudioprocess=e=>{const q=Math.pow(2,u.p.bits-1),m=u.p.mix,d=u.p.down;for(let ch=0;ch<2;ch++){const x=e.inputBuffer.getChannelData(ch),y=e.outputBuffer.getChannelData(ch);let c=st.c[ch],h=st.h[ch];for(let i=0;i<x.length;i++){if(c<=0){h=Math.round(x[i]*q)/q;c=d}c--;y[i]=x[i]*(1-m)+h*m}st.c[ch]=c;st.h[ch]=h}}}
      inp.connect(n);return n});
  mkUnit('dust','Dust comp',{comp:{label:'Squash',v:.5},pump:{label:'Pump',v:.45},tone:{label:'Tone',v:.62,fmt:v=>hz(toneHz(v))},wow:{label:'Wow',v:.22},noise:{label:'Crackle',v:.28}},
    (inp,u)=>{const pre=G(),c=ctx.createDynamicsCompressor(),mk=G(),ws=ctx.createWaveShaper(),hp=bq('highpass',35),lp=bq('lowpass',12000),dl=ctx.createDelay(.1),out=G();
      c.knee.value=0;c.ratio.value=20;c.attack.value=.001;ws.curve=curve(1.6);dl.delayTime.value=.012;
      const o1=ctx.createOscillator(),g1=G(0),o2=ctx.createOscillator(),g2=G(0);o1.frequency.value=.55;o2.frequency.value=6.3;o1.connect(g1).connect(dl.delayTime);o2.connect(g2).connect(dl.delayTime);o1.start();o2.start();
      inp.connect(pre).connect(c).connect(mk).connect(ws).connect(hp).connect(lp).connect(dl).connect(out);
      const nz=ctx.createBufferSource();nz.buffer=crackle(5);nz.loop=true;const ng=G(0);nz.connect(ng).connect(out);nz.start();
      u.active=false;u.nl=0;u.setActive=a=>{u.active=a;ng.gain.setTargetAtTime(a?u.nl:0,ctx.currentTime,a?.05:.4)};
      u.apply=()=>{const p=u.p;pre.gain.value=1+p.comp*2.5;c.threshold.value=-8-p.comp*38;c.release.value=.04+p.pump*.45;mk.gain.value=1+p.comp*3.2;lp.frequency.setTargetAtTime(toneHz(p.tone),ctx.currentTime,.02);g1.gain.value=p.wow*.0022;g2.gain.value=p.wow*.00035;u.nl=p.noise*.35;ng.gain.setTargetAtTime(u.active?u.nl:0,ctx.currentTime,.05)};return out});
  mkUnit('delay','Tape echo',{div:{label:'Time',opts:DIV.map((d,i)=>[String(i),d[0]]),v:'2'},fb:{label:'Feedback',max:.9,v:.38},tone:{label:'Tone',v:.45,fmt:v=>hz(echoHz(v))},mix:{label:'Mix',v:.3}},
    (inp,u)=>{const out=G(),d=ctx.createDelay(4),f=bq('lowpass',3000),ws=ctx.createWaveShaper(),fb=G(),wet=G();ws.curve=curve(1.2);
      inp.connect(out);inp.connect(d);d.connect(f).connect(ws).connect(fb).connect(d);ws.connect(wet).connect(out);
      u.apply=()=>{const p=u.p;d.delayTime.setTargetAtTime(Math.min(3.9,60/S.bpm*DIV[+p.div][1]),ctx.currentTime,.05);fb.gain.value=p.fb;f.frequency.value=echoHz(p.tone);wet.gain.value=p.mix};return out});
  mkUnit('verb','Reverb',{size:{label:'Size',min:.3,max:6,step:.1,v:1.6,fmt:v=>(+v).toFixed(1)+' s'},damp:{label:'Darkness',v:.55},mix:{label:'Mix',v:.16}},
    (inp,u)=>{const out=G(),pd=ctx.createDelay(.2),cv=ctx.createConvolver(),wet=G();pd.delayTime.value=.018;inp.connect(out);inp.connect(pd).connect(cv).connect(wet).connect(out);let key='',tm;
      u.apply=()=>{wet.gain.value=u.p.mix*1.4;const k=u.p.size+'|'+u.p.damp;if(k!==key){key=k;clearTimeout(tm);tm=setTimeout(()=>{cv.buffer=makeIR(u.p.size,u.p.damp)},120)}};return out});
}
function wire(){fxIn.disconnect();for(const id of S.chain)U[id].out.disconnect();let n=fxIn;for(const id of S.chain){n.connect(U[id].inp);n=U[id].out}n.connect(fxOut)}
