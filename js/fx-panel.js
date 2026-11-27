// Dustbox: Effects tab UI.
/* ---------- effects panel ---------- */
function renderFx(){$('#mVol').value=S.master;$('#oM').textContent=pct(S.master);
  $('#fxList').innerHTML=S.chain.map((id,ix)=>{const u=U[id];
    const ctls=Object.entries(u.defs).map(([k,d])=>d.opts?`<div class="ctl"><label for="f-${id}-${k}">${d.label}</label><select id="f-${id}-${k}" data-u="${id}" data-k="${k}">${d.opts.map(([v,l])=>`<option value="${v}" ${String(u.p[k])===v?'selected':''}>${l}</option>`).join('')}</select><span></span></div>`
      :`<div class="ctl"><label for="f-${id}-${k}">${d.label}</label><input id="f-${id}-${k}" type="range" data-u="${id}" data-k="${k}" min="${d.min??0}" max="${d.max??1}" step="${d.step??.01}" value="${u.p[k]}"><output>${(d.fmt||pct)(u.p[k])}</output></div>`).join('');
    return`<div class="card ${u.on?'':'off'}"><div class="hd"><h3>${u.name}</h3><button class="mv" data-mv="${id}:-1" ${ix?'':'disabled'} aria-label="Move ${u.name} up">↑</button><button class="mv" data-mv="${id}:1" ${ix<S.chain.length-1?'':'disabled'} aria-label="Move ${u.name} down">↓</button><button data-on="${id}" class="${u.on?'on':''}">${u.on?'On':'Off'}</button></div><div class="ctls">${ctls}</div></div>`}).join('')}
$('#fxList').addEventListener('input',e=>{const t=e.target,u=U[t.dataset.u];if(!u)return;const d=u.defs[t.dataset.k];u.p[t.dataset.k]=d.opts?t.value:+t.value;u.apply();if(!d.opts)t.nextElementSibling.textContent=(d.fmt||pct)(+t.value);save()});
$('#fxList').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;
  if(b.dataset.on){const u=U[b.dataset.on];u.setOn(!u.on);renderFx();save()}
  if(b.dataset.mv){const[id,d]=b.dataset.mv.split(':'),i=S.chain.indexOf(id),j=i+(+d);if(j<0||j>=S.chain.length)return;[S.chain[i],S.chain[j]]=[S.chain[j],S.chain[i]];wire();renderFx();save()}});
$('#mVol').addEventListener('input',e=>{S.master=+e.target.value;master.gain.setTargetAtTime(S.master,ctx.currentTime,.02);$('#oM').textContent=pct(S.master);save()});
