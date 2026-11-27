// Dustbox: MIDI input.
/* ---------- MIDI ---------- */
async function midiOn(){const st=$('#midiStat');try{const acc=await navigator.requestMIDIAccess();const bind=()=>{let n=0;acc.inputs.forEach(inp=>{inp.onmidimessage=onMidi;n++});st.textContent=n?`${n} MIDI device${n>1?'s':''} connected. Notes 36–43 play the bank on screen.`:'No MIDI devices found. Plug one in and it will connect.'};bind();acc.onstatechange=bind}
  catch(e){st.textContent='MIDI is blocked in this view or not supported by this browser. Chrome and Edge support it in the standalone file.'}}
function onMidi(e){const[s,n,v]=e.data,c=s&0xf0,i=n-36;if(i<0||i>7)return;const id=S.bank*8+i;if(c===0x90&&v>0)hit(id,.25+.75*v/127);else if(c===0x80||(c===0x90&&v===0))release(id)}
