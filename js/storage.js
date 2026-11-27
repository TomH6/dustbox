// Dustbox: Autosave and loading the project from IndexedDB.
/* ---------- storage ---------- */
let idb=null;const savedIds=new Set();let saveT;
function setStat(t){$('#stat').textContent=t;$('#pjStat').textContent=t==='Saved'?'Saved in this browser.':t}
function openDb(){return new Promise((res,rej)=>{try{const r=indexedDB.open('dustbox',1);r.onupgradeneeded=()=>{r.result.createObjectStore('kv');r.result.createObjectStore('audio')};r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)}catch(e){rej(e)}})}
const dget=(store,key)=>new Promise((res,rej)=>{const r=idb.transaction(store).objectStore(store).get(key);r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)});
function save(){if(!idb)return;clearTimeout(saveT);setStat('Saving…');saveT=setTimeout(doSave,900)}
async function doSave(){try{const ids=new Set(),bufs={};
  const st={v:1,pads:pads.map(p=>{if(!p)return null;ids.add(p.orig._id);bufs[p.orig._id]=p.orig;const{orig,...r}=p;return{...r,orig:orig._id}}),patterns,chain:S.chain,
    S:Object.fromEntries(['bpm','swing','loose','metro','master','chopN','chopMode','chopBank','auto','thr','inCh','inGain','monFx'].map(k=>[k,S[k]])),
    fx:Object.fromEntries(Object.values(U).map(u=>[u.id,{on:u.on,p:u.p}]))};
  const tx=idb.transaction(['kv','audio'],'readwrite'),A=tx.objectStore('audio'),added=[];
  for(const id of ids)if(!savedIds.has(id)){const b=bufs[id],chs=[];for(let c=0;c<b.numberOfChannels;c++)chs.push(b.getChannelData(c).slice());A.put({sr:b.sampleRate,chs},id);added.push(id)}
  for(const id of[...savedIds])if(!ids.has(id)){A.delete(id);savedIds.delete(id)}
  tx.objectStore('kv').put(st,'project');
  await new Promise((res,rej)=>{tx.oncomplete=res;tx.onerror=()=>rej(tx.error);tx.onabort=()=>rej(tx.error)});added.forEach(i=>savedIds.add(i));setStat('Saved')}
  catch(e){setStat('Not saved: '+((e&&e.name)==='QuotaExceededError'?'storage is full':'storage error'))}}
async function loadProject(){const st=await dget('kv','project');if(!st||!st.pads)return false;const bufs={};
  for(const p of st.pads){if(!p||bufs[p.orig])continue;const a=await dget('audio',p.orig);if(!a)continue;const b=ctx.createBuffer(a.chs.length,a.chs[0].length,a.sr);a.chs.forEach((d,c)=>b.getChannelData(c).set(d));b._id=p.orig;bufs[p.orig]=b;savedIds.add(p.orig)}
  pads=Array.from({length:NP},(_,i)=>{const p=st.pads[i];return p&&bufs[p.orig]?{...p,orig:bufs[p.orig]}:null});
  if(Array.isArray(st.patterns))patterns=Array.from({length:8},(_,i)=>{const p=st.patterns[i];return p?{len:p.len===32?32:16,steps:p.steps||{},mute:p.mute||{}}:newPat()});
  Object.assign(S,st.S||{});if(Array.isArray(st.chain)&&st.chain.length===6&&st.chain.every(id=>U[id]))S.chain=st.chain;
  for(const id in st.fx||{})if(U[id]){Object.assign(U[id].p,st.fx[id].p);U[id].on=!!st.fx[id].on}
  return true}
