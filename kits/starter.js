// Dustbox kit: the starter kit on bank A, with its beat on pattern 1. Every sound is synthesized here.
addKit({id:'starter',name:'Starter',bank:0,pattern:0,keep:false,
  pads(){
    const kick=synth(.6,(d,c,sr)=>{let ph=0;for(let i=0;i<d.length;i++){const t=i/sr,f=46+95*Math.exp(-t*30);ph+=2*Math.PI*f/sr;d[i]=Math.tanh(1.6*(Math.sin(ph)*Math.exp(-t*5.5)+rnd()*.25*Math.exp(-t*250)))*.9}});
    const snare=synth(.32,(d,c,sr)=>{let p=0;for(let i=0;i<d.length;i++){const t=i/sr,n=rnd(),h=n-p;p=n;d[i]=Math.tanh((Math.sin(2*Math.PI*185*t)*.55*Math.exp(-t*22)+(h*.45+n*.25)*Math.exp(-t*13))*1.4)*.85}});
    const hat=(sec,dec,amp)=>synth(sec,(d,c,sr)=>{let p1=0,p2=0;for(let i=0;i<d.length;i++){const t=i/sr,n=rnd(),h1=n-p1;p1=n;const h2=h1-p2;p2=h1;d[i]=h2*amp*Math.exp(-t*dec)}});
    const bass=f=>synth(1.3,(d,c,sr)=>{for(let i=0;i<d.length;i++){const t=i/sr,env=Math.min(1,t/.006)*Math.exp(-t*1.6),x=Math.sin(2*Math.PI*f*t)+.25*Math.sin(4*Math.PI*f*t);d[i]=Math.tanh(2*x*env)/Math.tanh(2)*.8}});
    const keys=fs=>synth(3,(d,c,sr)=>{const det=c?1.0025:.9975;for(let i=0;i<d.length;i++){const t=i/sr;let s=0;for(const f0 of fs){const f=f0*det,env=Math.min(1,t/.004)*Math.exp(-t*(1+f0/600));s+=Math.sin(2*Math.PI*f*t+1.1*Math.exp(-t*4)*Math.sin(2*Math.PI*f*t))*env}d[i]=s*.17*(1+.12*Math.sin(2*Math.PI*4.5*t))}},true);
    const P=[['Kick',kick],['Snare',snare],['Hat',hat(.09,55,.28)],['Open hat',hat(.5,6.5,.22)],['Bass A',bass(55)],['Bass D',bass(73.42)],['Keys Am9',keys([110,196,261.63,329.63,493.88])],['Keys Dm9',keys([146.83,174.61,220,261.63,329.63])]];
    return P.map(([n,b],i)=>{const p=mkPad(n,b);if(i===2)p.vol=.8;if(i===3)p.vol=.7;if(i>5)p.vol=.9;return p})},
  beat(){return beat(0,32,set=>{
    set(0,[0,7,10,16,23,26]);set(0,[27],2);set(1,[4,12,20,28]);
    set(2,[0,4,8,12,16,20,24,28]);set(2,[2,6,10,18,22,26],2);set(3,[14]);set(3,[30],2);
    set(4,[0]);set(4,[10],2);set(5,[16]);set(5,[26],2);set(6,[0]);set(7,[16])})}});
