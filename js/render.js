/* ==========================================================
   RENDERING
   ========================================================== */

function renderPetSvg(){
  const wrap = document.getElementById('petSvgWrap');
  if(!state){ wrap.innerHTML = ''; return; }
  let mood = 'open';
  if(state.asleep) mood = 'asleep';
  else if(state.happy < 30 || state.health < 30) mood = 'sad';
  wrap.innerHTML = petSvg(state.species, state.stage, mood);
  wrap.style.animation = state.asleep ? 'none' : 'bob 2.4s ease-in-out infinite';
}
(function injectBob(){
  const s = document.createElement('style');
  s.textContent = `@keyframes bob{0%,100%{transform:translateY(0);}50%{transform:translateY(-6px);}}`;
  document.head.appendChild(s);
})();

function stageLabelFor(pet){
  // Human's "child" stage reads better as "older child" in both languages,
  // since "toddler" (เด็กเล็ก) immediately precedes it and a bare "Child"/
  // "เด็ก" right after "Toddler"/"เด็กเล็ก" reads as a near-duplicate.
  if(pet.species === 'human' && pet.stage === 'child'){
    return LANG === 'th' ? 'เด็กโต' : 'Older Child';
  }
  return t('stage_'+pet.stage);
}

function renderStageLabel(){
  if(!state){ return; }
  document.getElementById('petStageLabel').textContent = stageLabelFor(state);
  document.getElementById('petNameDisplay').textContent = state.name;
  const days = Math.max(1, Math.floor(ageHours()/24)+1);
  document.getElementById('ageBadge').textContent = (LANG==='th' ? 'วันที่ ' : 'DAY ') + days;
  document.getElementById('coinCount').textContent = state.coins;
  renderSignalBadge();
  renderBreedBadge();
}

function renderSignalBadge(){
  const badge = document.getElementById('signalBadge');
  if(!state || !state.lastSignalStats){
    badge.textContent = '📶';
    badge.className = 'signal-badge';
    badge.title = t('signal_never');
    return;
  }
  const s = state.lastSignalStats.strength;
  badge.className = 'signal-badge ' + (s<=0 ? 'sig-none' : s<40 ? 'sig-weak' : 'sig-strong');
  badge.textContent = s<=0 ? '📵' : s<40 ? '📶' : s<75 ? '📶' : '⚡';
  badge.title = t('signal_strength_label') + ': ' + s + '%';
}

function renderBreedBadge(){
  const btn = document.getElementById('breedBtn');
  if(!btn) return;
  btn.disabled = !state || !canBreed(state);
}

function renderStats(){
  if(!state) return;
  ['hunger','happy','energy','clean','health'].forEach(k=>{
    const v = Math.round(state[k]);
    document.getElementById('fill-'+k).style.width = v+'%';
    document.getElementById('track-'+k).classList.toggle('critical', v < 20);
  });
}

function renderStatus(){
  if(!state){ document.getElementById('statusStrip').innerHTML=''; return; }
  const chips = [];
  if(state.asleep) chips.push({label:t('asleep'), cls:'good'});
  if(state.hunger < 25) chips.push({label:t('hungry'), cls:'warn'});
  if(state.energy < 25 && !state.asleep) chips.push({label:t('tired'), cls:'warn'});
  if(state.clean < 25) chips.push({label:t('dirty'), cls:'warn'});
  if(state.happy < 25) chips.push({label:t('sad'), cls:'warn'});
  if(state.health < 30) chips.push({label:t('sick'), cls:'warn'});
  if(chips.length===0 && !state.asleep){
    const mood = computeMood();
    chips.push({label:t('mood_'+mood), cls: (mood==='sick'||mood==='hungry'||mood==='bored') ? 'warn' : 'good'});
  }
  document.getElementById('statusStrip').innerHTML = chips.map(c=>`<span class="status-chip ${c.cls}">${c.label}</span>`).join('');
}

function renderButtons(){
  const dead = !state || !state.alive;
  const asleep = state && state.asleep;
  document.getElementById('feedBtn').disabled = dead || asleep;
  document.getElementById('playBtn').disabled = dead || asleep;
  document.getElementById('cleanBtn').disabled = dead || asleep;
  document.getElementById('healBtn').disabled = dead || asleep;
  document.getElementById('petBtn').disabled = dead || asleep;
  document.getElementById('workBtn').disabled = dead || asleep;
  document.getElementById('signalBtn').disabled = dead || asleep || signalHuntInFlight;
  document.getElementById('sleepBtn').disabled = dead;
  document.getElementById('sleepBtn').querySelector('span:last-child').textContent = asleep ? t('wake_confirm') : t('btn_sleep');
  document.getElementById('sleepBtn').querySelector('.ci').textContent = asleep ? '☀️' : '😴';
  renderBreedBadge();
}

function renderInventory(){
  const grid = document.getElementById('invGrid');
  if(!state){ grid.innerHTML = `<div class="sub">${t('empty_bag')}</div>`; return; }
  const owned = Object.keys(ITEMS).filter(k => (state.inventory[k]||0) > 0);
  if(owned.length===0){ grid.innerHTML = `<div class="sub">${t('empty_bag')}</div>`; return; }
  grid.innerHTML = owned.map(key=>{
    const item = ITEMS[key];
    const count = state.inventory[key]||0;
    return `<button class="inv-item" data-item="${key}">
      <div class="ii">${item.icon}</div>
      <div class="iname">${itemLabel(key)}</div>
      <div class="icount">x${count}</div>
    </button>`;
  }).join('');
  grid.querySelectorAll('.inv-item').forEach(btn=>{
    btn.addEventListener('click', ()=> useItem(btn.dataset.item));
  });
}

function renderFeedPicker(){
  const grid = document.getElementById('feedPickerGrid');
  if(!state){ grid.innerHTML = `<div class="sub">${t('empty_bag')}</div>`; return; }
  const owned = Object.keys(ITEMS).filter(k => ITEMS[k].category==='food' && (state.inventory[k]||0) > 0);
  if(owned.length===0){
    grid.innerHTML = `<div class="sub">${t('feed_picker_empty')}</div>
      <button class="big-btn secondary" id="feedPlainBtn">${t('feed_plain_btn')}</button>`;
    document.getElementById('feedPlainBtn').addEventListener('click', ()=>{
      state.hunger = clamp(state.hunger + 12, 0, 100);
      spawnFx('🍖');
      playBeep(440);
      saveState(); renderAll();
      document.getElementById('feedPickerBackdrop').classList.remove('show');
    });
    return;
  }
  // sort species-preferred foods first so they're easy to spot
  owned.sort((a,b)=>{
    const aPref = ITEMS[a].affinity && ITEMS[a].affinity.includes(state.species) ? 0 : 1;
    const bPref = ITEMS[b].affinity && ITEMS[b].affinity.includes(state.species) ? 0 : 1;
    return aPref - bPref;
  });
  grid.innerHTML = owned.map(key=>{
    const item = ITEMS[key];
    const count = state.inventory[key]||0;
    const preferred = item.affinity && item.affinity.includes(state.species);
    return `<button class="inv-item ${preferred?'inv-item-preferred':''}" data-item="${key}">
      <div class="ii">${item.icon}</div>
      <div class="iname">${itemLabel(key)}</div>
      <div class="icount">x${count}</div>
      ${preferred ? `<div class="pref-star">★</div>` : ''}
    </button>`;
  }).join('');
  grid.querySelectorAll('.inv-item').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      useItem(btn.dataset.item);
      document.getElementById('feedPickerBackdrop').classList.remove('show');
    });
  });
}

function renderShop(){
  const grid = document.getElementById('shopGrid');
  if(!grid) return;
  const keys = Object.keys(ITEMS);
  grid.innerHTML = keys.map(key=>{
    const item = ITEMS[key];
    const affordable = state && state.coins >= item.price;
    return `<div class="shop-item">
      <div class="ii">${item.icon}</div>
      <div class="iname">${itemLabel(key)}</div>
      <div class="shop-price">🪙 ${item.price}</div>
      <button class="shop-buy-btn" data-item="${key}" ${affordable?'':'disabled'}>${t('buy_btn')}</button>
    </div>`;
  }).join('');
  grid.querySelectorAll('.shop-buy-btn').forEach(btn=>{
    btn.addEventListener('click', ()=> buyItem(btn.dataset.item));
  });
}

function renderTraitsPanel(){
  const el = document.getElementById('traitsPanel');
  if(!state || !state.traits){ el.innerHTML = ''; return; }
  const tr = state.traits;
  el.innerHTML = `<div class="traits-box">
    <h3>${t('traits_title')}</h3>
    <div class="trait-row">
      <div class="trait-label-row"><span>${t('trait_curiosity')}</span><span>${tr.curiosity}</span></div>
      <div class="trait-track"><div class="trait-fill curiosity" style="width:${tr.curiosity}%"></div></div>
    </div>
    <div class="trait-row">
      <div class="trait-label-row"><span>${t('trait_activity')}</span><span>${tr.activity}</span></div>
      <div class="trait-track"><div class="trait-fill activity" style="width:${tr.activity}%"></div></div>
    </div>
    <div class="trait-row">
      <div class="trait-label-row"><span>${t('trait_stress')}</span><span>${tr.stress}</span></div>
      <div class="trait-track"><div class="trait-fill stress" style="width:${tr.stress}%"></div></div>
    </div>
    ${state.generation > 1 ? `<div class="gen-badge">${t('generation_label')} ${state.generation}</div>` : ''}
    ${state.parentage ? `<div class="parentage-note">${t('parentage_label')}: ${state.parentage.a.name} + ${state.parentage.b.name}</div>` : ''}
  </div>`;
}

function renderLog(){
  renderTraitsPanel();
  const log = loadLog();
  const el = document.getElementById('petLog');
  if(log.length===0){ el.innerHTML = `<li>${t('empty_log')}</li>`; return; }
  el.innerHTML = log.map(e=>{
    const days = Math.max(1, Math.floor((e.diedAt-e.bornAt)/86400000)+1);
    const speciesName = SPECIES[e.species]?.name[LANG] || e.species;
    const reasonIcon = e.reason==='bred' ? '💞' : (SPECIES[e.species]?.icon||'🐾');
    return `<li><span class="plicon">${reasonIcon}</span>
      <div><div class="plname">${e.name}</div>
      <div class="pldetail">${speciesName} · ${stageLabelFor(e)} · ${days}d</div></div></li>`;
  }).join('');
}

function renderAll(){
  renderPetSvg();
  renderStageLabel();
  renderStats();
  renderStatus();
  renderButtons();
}

/* ---------- FX / TOASTS ---------- */
function spawnFx(emoji){
  const layer = document.getElementById('fxLayer');
  const el = document.createElement('div');
  el.className = 'floater';
  el.textContent = emoji;
  el.style.left = (55 + Math.random()*40) + 'px';
  el.style.top = '70px';
  layer.appendChild(el);
  setTimeout(()=> el.remove(), 1150);
}
let speechTimer = null;
function showSpeech(msg){
  const b = document.getElementById('speechBubble');
  b.textContent = msg;
  b.classList.add('show');
  clearTimeout(speechTimer);
  speechTimer = setTimeout(()=> b.classList.remove('show'), 2200);
}
function showToast(msg){ showSpeech(msg); }

/* ---------- SOUND ---------- */
let audioCtx = null;
let soundOn = localStorage.getItem('petsitter_sound') !== 'off';
function playBeep(freq){
  if(!soundOn) return;
  try{
    audioCtx = audioCtx || new (window.AudioContext||window.webkitAudioContext)();
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = 'square';
    o.frequency.value = freq;
    g.gain.value = 0.05;
    o.connect(g); g.connect(audioCtx.destination);
    o.start();
    g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.18);
    o.stop(audioCtx.currentTime + 0.2);
  }catch(e){}
}

/* ---------- SPECIES PICKER ---------- */
let pickedSpecies = null;
function renderSpeciesGrid(){
  const grid = document.getElementById('speciesGrid');
  grid.innerHTML = Object.entries(SPECIES).map(([key, sp])=>{
    return `<button class="species-card" data-species="${key}">
      <div class="sicon">${miniSvg(key)}</div>
      <div class="sname">${sp.name[LANG]}</div>
      <div class="sdesc">${t(sp.descKey)}</div>
    </button>`;
  }).join('');
  grid.querySelectorAll('.species-card').forEach(card=>{
    card.addEventListener('click', ()=>{
      grid.querySelectorAll('.species-card').forEach(c=>c.style.borderColor='transparent');
      card.style.borderColor = 'var(--coral)';
      pickedSpecies = card.dataset.species;
      updateStartBtn();
    });
  });
}
function updateStartBtn(){
  const nameVal = document.getElementById('petNameInput').value.trim();
  document.getElementById('startBtn').disabled = !(pickedSpecies && nameVal.length>0);
}
function openPicker(){
  pickedSpecies = null;
  document.getElementById('petNameInput').value = '';
  updateStartBtn();
  renderSpeciesGrid();
  document.getElementById('pickerBackdrop').classList.add('show');
}
function closePicker(){
  document.getElementById('pickerBackdrop').classList.remove('show');
}

function wireModal(openBtnId, backdropId, closeBtnId, onOpen){
  const backdrop = document.getElementById(backdropId);
  document.getElementById(openBtnId).addEventListener('click', ()=>{
    if(onOpen) onOpen();
    backdrop.classList.add('show');
  });
  document.getElementById(closeBtnId).addEventListener('click', ()=> backdrop.classList.remove('show'));
  backdrop.addEventListener('click', (e)=>{ if(e.target===backdrop) backdrop.classList.remove('show'); });
}
