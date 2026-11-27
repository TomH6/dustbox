// Dustbox: WAV encoding and file downloads.
/* ---------- wav export / downloads ---------- */
let DL=null;if(inClaude)window.claude.use('downloads').then(d=>{DL=d}).catch(()=>{});
function wav(b,s,e){const ch=b.numberOfChannels,a=Math.floor(s*b.length),z=Math.floor(e*b.length),n=Math.max(0,z-a),buf=new ArrayBuffer(44+n*ch*2),v=new DataView(buf),W=(o,str)=>{for(let i=0;i<str.length;i++)v.setUint8(o+i,str.charCodeAt(i))};
  W(0,'RIFF');v.setUint32(4,36+n*ch*2,true);W(8,'WAVE');W(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,ch,true);v.setUint32(24,b.sampleRate,true);v.setUint32(28,b.sampleRate*ch*2,true);v.setUint16(32,ch*2,true);v.setUint16(34,16,true);W(36,'data');v.setUint32(40,n*ch*2,true);
  const d=[];for(let c=0;c<ch;c++)d.push(b.getChannelData(c));let o=44;for(let i=a;i<z;i++)for(let c=0;c<ch;c++){const x=clamp(d[c][i],-1,1);v.setInt16(o,x<0?x*32768:x*32767,true);o+=2}return new Blob([buf],{type:'audio/wav'})}
async function saveFile(name,blob){
  if(DL){try{await DL.save({filename:name,data:blob});toast('Saved '+name)}catch(e){try{await DL.save({filename:name,data:new Uint8Array(await blob.arrayBuffer())});toast('Saved '+name)}catch(e2){toast('The download was cancelled')}}return}
  if(inClaude){toast("Downloads aren't available in this view");return}
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),5000)}
