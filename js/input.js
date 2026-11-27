// Dustbox: Audio input (guitar / sound card) and the input meter.
/* ---------- input (guitar) ---------- */
const IN={stream:null,src:null,split:null,mono:G(),lvl:G(1),an:ctx.createAnalyser(),mon:G(0)};
IN.mono.channelCount=1;IN.mono.channelCountMode='explicit';IN.mono.channelInterpretation='speakers';
IN.an.fftSize=1024;IN.mono.connect(IN.lvl);IN.lvl.connect(IN.an);IN.lvl.connect(IN.mon);
const anBuf=new Float32Array(1024);
function routeIn(){if(!IN.src)return;IN.src.disconnect();if(IN.split)IN.split.disconnect();
  if(S.inCh==='both')IN.src.connect(IN.mono);else{IN.split=IN.split||ctx.createChannelSplitter(2);IN.src.connect(IN.split);IN.split.connect(IN.mono,S.inCh==='1'?0:1)}}
function monRoute(){IN.mon.disconnect();IN.mon.connect(S.monFx?fxIn:dry);IN.mon.gain.setTargetAtTime(S.monitor&&IN.src?1:0,ctx.currentTime,.02)}
async function enableInput(devId){const st=$('#iStat');
  if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia){st.textContent=inClaude?"This preview can't use audio inputs. Open the standalone Dustbox file to record guitar.":'This browser has no audio input support here.';return}
  try{if(IN.stream)IN.stream.getTracks().forEach(t=>t.stop());
    const s=await navigator.mediaDevices.getUserMedia({audio:{deviceId:devId?{exact:devId}:undefined,echoCancellation:false,noiseSuppression:false,autoGainControl:false,channelCount:{ideal:2}}});
    if(ctx.state!=='running')await ctx.resume();IN.stream=s;if(IN.src)IN.src.disconnect();IN.src=ctx.createMediaStreamSource(s);routeIn();monRoute();
    const track=s.getAudioTracks()[0],cur=track.getSettings().deviceId,ds=(await navigator.mediaDevices.enumerateDevices()).filter(d=>d.kind==='audioinput');
    const sel=$('#iDev');sel.innerHTML=ds.map((d,i)=>`<option value="${esc(d.deviceId)}" ${d.deviceId===cur?'selected':''}>${esc(d.label||'Input '+(i+1))}</option>`).join('');sel.hidden=ds.length<2;
    st.textContent=`Input on: ${track.label||'audio input'}. Play something and set the level so the meter stays out of the red.`;$('#iOn').textContent='Input on';$('#iOn').classList.remove('on')}
  catch(e){st.textContent=(e.name==='NotAllowedError'||e.name==='SecurityError')?(inClaude?"This preview can't use audio inputs. Open the standalone Dustbox file to record guitar.":'Access to the input was refused. Allow microphone access for this page in your browser settings.'):`Couldn't open the input (${e.name}).`}}
function renderIn(){seg($('#iCh'),S.inCh);$('#iGain').value=S.inGain;$('#oIn').textContent=S.inGain.toFixed(2)+'×';
  $('#iMon').classList.toggle('on',S.monitor);$('#iMonFx').classList.toggle('on',S.monFx);$('#rAuto').classList.toggle('on',S.auto);
  $('#rThr').value=S.thr;$('#oThr').textContent=Math.round(20*Math.log10(S.thr))+' dB';updRec()}
function meter(){if(!IN.src)return;IN.an.getFloatTimeDomainData(anBuf);let pk=0;for(let i=0;i<anBuf.length;i++){const a=Math.abs(anBuf[i]);if(a>pk)pk=a}
  const m=$('#iMeter'),dbv=20*Math.log10(pk+1e-6);m.style.width=clamp((dbv+60)/60*100,0,100)+'%';m.classList.toggle('clip',pk>.98)}
