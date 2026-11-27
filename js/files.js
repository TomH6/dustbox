// Dustbox: Loading audio files onto pads.
/* ---------- loading files ---------- */
const fileIn=$('#file');let loadAt=0;
function pickFiles(id){loadAt=id;fileIn.value='';fileIn.click()}
fileIn.addEventListener('change',()=>loadFiles([...fileIn.files],loadAt));
async function loadFiles(files,start){files=files.filter(f=>/^audio\//.test(f.type)||/\.(wav|wave|aif|aiff|mp3|m4a|aac|flac|ogg)$/i.test(f.name));if(!files.length){toast('No audio files found');return}
  pushUndo();let id=start,ok=0;
  for(const f of files){if(id>=NP)break;try{const ab=await f.arrayBuffer();const buf=await new Promise((res,rej)=>{const pr=ctx.decodeAudioData(ab,res,rej);if(pr&&pr.then)pr.then(res,rej)});pads[id]=mkPad(f.name.replace(/\.[^.]+$/,'').slice(0,24),buf);id++;ok++}catch(e){toast(`Couldn't read ${f.name}`)}}
  if(ok){S.sel=start;S.bank=Math.floor(start/8);toast(ok===1?`Loaded onto ${padLabel(start)}`:`Loaded ${ok} files from ${padLabel(start)}`)}
  renderAll();save()}
