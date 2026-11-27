// Dustbox kit: an original G-funk kit with 808-style drums on bank B, with its beat on pattern 2 (F minor, 86 BPM).
// Every sound is synthesized here.
addKit({id:'gfunk-808',name:'G-funk 808',bank:1,pattern:1,keep:true,
  // The lead (pad 7) is a two-bar phrase, re-synthesized whenever the BPM changes so it stays in time.
  regen(pad,bpm){return pad===7?this.lead(bpm):null},
  // A two-bar lead phrase: a high, gliding synth with vibrato. Notes are [beat, length in beats, MIDI note].
  lead(bpm){const B=60/bpm,N=[[.5,1.25,72],[1.75,.25,75],[2,1.5,77],[3.5,.5,75],[4,1,72],[5,.5,70],[5.5,1.5,68],[7,.75,65]];
    return synth(8.4*B,(d,c,sr)=>{const det=c?1.003:1,kg=1-Math.exp(-1/(sr*.035)),ka=1-Math.exp(-1/(sr*.012)),kr=1-Math.exp(-1/(sr*.05));let f=mf(70),ph=0,a=0,k=0;
      for(let i=0;i<d.length;i++){const t=i/sr;while(k<N.length-1&&t>=N[k+1][0]*B)k++;const[b0,len,m]=N[k],tn=t-b0*B,on=tn>=0&&tn<len*B;
        if(on)f+=(mf(m)-f)*kg;a+=((on?1:0)-a)*(on?ka:kr);
        const vib=1+.014*clamp((tn-.12)/.4,0,1)*Math.sin(2*Math.PI*5.6*t);ph+=2*Math.PI*f*det*vib/sr;
        d[i]=(Math.sin(ph)+.3*Math.sin(2*ph)+.12*Math.sin(3*ph))*a*.42}},true)},
  pads(){
    // Kick: a sine tuned to F1 with a quick pitch drop and a long boom.
    const kick=synth(1.6,(d,c,sr)=>{let ph=0;for(let i=0;i<d.length;i++){const t=i/sr,f=mf(29)*(1+1.6*Math.exp(-t*38));ph+=2*Math.PI*f/sr;d[i]=Math.tanh(1.3*(Math.sin(ph)*Math.exp(-t*2.2)+(t<.0015?.6:0)))*.92}});
    // Clap: four fast bursts of band-passed noise, then a short tail.
    const clap=synth(.5,(d,c,sr)=>{const f=bp(1100,1.4,sr);for(let i=0;i<d.length;i++){const t=i/sr;let e=0;for(const o of[0,.009,.018,.027])if(t>=o)e+=o<.025?Math.exp(-(t-o)*260):Math.exp(-(t-o)*13)*1.4;d[i]=Math.tanh(f(rnd())*e*2.4)*.85}});
    // Hats: six detuned square waves through a band-pass and a high-pass, for the metallic 808 sound.
    const hat=synth(.12,(d,c,sr)=>{const f=bp(10000,1.2,sr),fq=[205.3,304.4,369.6,522.7,540,800];let p1=0;for(let i=0;i<d.length;i++){const t=i/sr;let s=0;for(const q of fq)s+=Math.sin(2*Math.PI*q*t)>0?1:-1;const y=f(s/6),h=y-p1;p1=y;d[i]=h*1.05*Math.exp(-t*55)}});
    // Bass: a long 808-style sub with a punchy pitch drop, a little driven so it carries on small speakers.
    const bass=f=>synth(2.2,(d,c,sr)=>{let ph=0;for(let i=0;i<d.length;i++){const t=i/sr,fr=f*(1+.5*Math.exp(-t*45)),env=Math.min(1,t/.004)*Math.exp(-t*.9);ph+=2*Math.PI*fr/sr;d[i]=Math.tanh(2.5*Math.sin(ph)*env)/Math.tanh(2.5)*.85}});
    // Electric-piano chords with a slow stereo tremolo.
    const keys=fs=>synth(3.2,(d,c,sr)=>{const det=c?1.002:.998;for(let i=0;i<d.length;i++){const t=i/sr;let s=0;for(const f0 of fs){const f=f0*det,env=Math.min(1,t/.005)*Math.exp(-t*(.7+f0/700));s+=(Math.sin(2*Math.PI*f*t+.8*Math.exp(-t*6)*Math.sin(2*Math.PI*f*t))+.15*Math.exp(-t*30)*Math.sin(2*Math.PI*f*14*t))*env}d[i]=s*.15*(1+.15*Math.sin(2*Math.PI*3.8*t+c*Math.PI))}},true);
    const lead=this.lead(86);
    const P=[['808 kick',kick],['808 clap',clap],['808 hats',hat],['808 bass F',bass(mf(29))],['808 bass Bb',bass(mf(34))],['Keys Fm9',keys([87.31,207.65,261.63,311.13,392])],['Keys Bb13',keys([116.54,207.65,293.66,392,523.25])],['Whine lead',lead]];
    return P.map(([n,b],i)=>{const p=mkPad(n,b);if(i===0)p.vol=.82;if(i===2)p.vol=.7;if(i===3||i===4)p.vol=.52;if(i===5||i===6)p.vol=.75;if(i===7){p.vol=.5;p.bars=2;p.gen={kit:'gfunk-808',pad:7,bpm:86}}return p})},
  beat(){return beat(1,32,set=>{
    const even=Array.from({length:16},(_,i)=>i*2),odd=even.map(i=>i+1);
    set(0,[0,6,9,16,22,25]);set(0,[27],2);set(1,[4,12,20,28]);set(1,[15,31],2);
    // Hats on every 16th, with 32nd-note rolls leading into the snare and the turnaround.
    set(2,even);set(2,odd,2);set(2,[11,19,27,30,31],3);
    set(3,[0,10]);set(3,[7],2);set(4,[16]);set(4,[26],2);
    set(5,[0]);set(6,[16]);set(7,[0])})}});
