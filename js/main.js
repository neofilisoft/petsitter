/* ==========================================================
   MAIN: init, tick loop, settings, wiring
   ========================================================== */

function applyI18n(){
  document.querySelectorAll('[data-i18n]').forEach(el=>{
    const k = el.getAttribute('data-i18n');
    if(I18N[LANG][k]) el.textContent = I18N[LANG][k];
  });
  document.body.classList.toggle('lang-th', LANG === 'th');
  document.getElementById('petNameInput').placeholder = t('name_placeholder');
  document.getElementById('footerNote').textContent = t('footer');
  document.querySelectorAll('.lang-btn').forEach(b=> b.classList.toggle('active', b.dataset.lang===LANG));
  renderSpeciesGrid();
  renderStageLabel();
  renderStatus();
  renderInventory();
  renderLog();
  renderShop();
}

/* ---------- TICK ---------- */
function tick(){
  if(!state) return;
  const now = Date.now();
  const elapsedH = (now - state.lastTick) / 3600000;
  if(state.alive){
    applyDecay(Math.min(elapsedH, 48));
    const idx = currentStageIndex();
    const newStage = stagesFor(state.species)[idx];
    if(newStage !== state.stage){
      state.stage = newStage;
      showSpeech(t('toast_evolve', state.name, stageLabelFor(state)));
    }
  }
  state.lastTick = now;
  saveState();

  if(!state.alive){
    handleDeath();
    return;
  }
  renderAll();
}

function handleDeath(){
  pushLog({
    name: state.name, species: state.species,
    diedAt: Date.now(), bornAt: state.bornAt, stage: state.stage,
    reason: 'health'
  });
  showToast(t('toast_died', state.name));
  localStorage.removeItem(SAVE_KEY);
  state = null;
  setTimeout(()=> openPicker(), 1400);
}

/* ---------- SPECIES PICKER WIRING ---------- */
document.getElementById('petNameInput').addEventListener('input', updateStartBtn);
document.getElementById('startBtn').addEventListener('click', ()=>{
  if(!pickedSpecies) return;
  const name = document.getElementById('petNameInput').value.trim().slice(0,14) || 'Pet';
  state = defaultPetState(pickedSpecies, name);
  saveState();
  closePicker();
  renderAll();
  showSpeech(LANG==='th' ? `สวัสดี! ฉันคือ ${name}` : `Hi! I'm ${name}`);
});

/* ---------- RENAME ---------- */
document.getElementById('renameBtn').addEventListener('click', ()=>{
  if(!state) return;
  const newName = prompt(t('name_label'), state.name);
  if(newName && newName.trim()){
    state.name = newName.trim().slice(0,14);
    saveState();
    renderStageLabel();
  }
});

/* ---------- MODALS ---------- */
wireModal('bagBtn','bagBackdrop','bagClose', renderInventory);
wireModal('statsBtn','logBackdrop','logClose', renderLog);
wireModal('settingsBtn','settingsBackdrop','settingsClose', null);
wireModal('shopBtn','shopBackdrop','shopClose', renderShop);

// Feed picker is opened programmatically from the Feed button (via doFeed),
// not from a dedicated open-button, so it's wired separately from wireModal.
document.getElementById('feedPickerClose').addEventListener('click', ()=>{
  document.getElementById('feedPickerBackdrop').classList.remove('show');
});
document.getElementById('feedPickerBackdrop').addEventListener('click', (e)=>{
  if(e.target.id === 'feedPickerBackdrop') document.getElementById('feedPickerBackdrop').classList.remove('show');
});

document.getElementById('breedBtn').addEventListener('click', openBreedingDen);

// Transfer modal: opened from Settings (issue tab) or from the species
// picker's "restore" link (restore tab), each defaulting to a different tab.
document.getElementById('openTransferBtn').addEventListener('click', ()=>{
  document.getElementById('settingsBackdrop').classList.remove('show');
  openTransferModal('issue');
});
document.getElementById('pickerRestoreLink').addEventListener('click', ()=>{
  document.getElementById('pickerBackdrop').classList.remove('show');
  openTransferModal('restore');
});
document.getElementById('transferClose').addEventListener('click', ()=>{
  document.getElementById('transferBackdrop').classList.remove('show');
  if(!state){ document.getElementById('pickerBackdrop').classList.add('show'); }
});
document.getElementById('transferBackdrop').addEventListener('click', (e)=>{
  if(e.target.id === 'transferBackdrop'){
    document.getElementById('transferBackdrop').classList.remove('show');
    if(!state){ document.getElementById('pickerBackdrop').classList.add('show'); }
  }
});

document.getElementById('breedClose').addEventListener('click', ()=> document.getElementById('breedBackdrop').classList.remove('show'));
document.getElementById('breedBackdrop').addEventListener('click', (e)=>{
  if(e.target.id === 'breedBackdrop') document.getElementById('breedBackdrop').classList.remove('show');
});

document.getElementById('activitiesBackdrop').addEventListener('click', (e)=>{
  if(e.target.id === 'activitiesBackdrop') document.getElementById('activitiesBackdrop').classList.remove('show');
});
document.getElementById('activitiesClose').addEventListener('click', ()=>{
  document.getElementById('activitiesBackdrop').classList.remove('show');
});

document.getElementById('gameClose').addEventListener('click', closeGameModal);
document.getElementById('gameBackdrop').addEventListener('click', (e)=>{
  if(e.target.id === 'gameBackdrop') closeGameModal();
});

/* ---------- SETTINGS ---------- */
const soundToggle = document.getElementById('soundToggle');
soundToggle.classList.toggle('on', soundOn);
soundToggle.addEventListener('click', ()=>{
  soundOn = !soundOn;
  localStorage.setItem('petsitter_sound', soundOn?'on':'off');
  soundToggle.classList.toggle('on', soundOn);
});
let reducedMotion = localStorage.getItem('petsitter_motion') === 'on';
const motionToggle = document.getElementById('motionToggle');
motionToggle.classList.toggle('on', reducedMotion);
function applyMotionPref(){
  document.documentElement.style.setProperty('--motion-scale', reducedMotion?'0':'1');
  document.querySelectorAll('.pet-svg-wrap').forEach(w=> w.style.animationPlayState = reducedMotion?'paused':'running');
}
motionToggle.addEventListener('click', ()=>{
  reducedMotion = !reducedMotion;
  localStorage.setItem('petsitter_motion', reducedMotion?'on':'off');
  motionToggle.classList.toggle('on', reducedMotion);
  applyMotionPref();
});
applyMotionPref();

document.getElementById('resetBtn').addEventListener('click', ()=>{
  if(confirm(t('confirm_reset'))){
    if(state){
      pushLog({ name: state.name, species: state.species, diedAt: Date.now(), bornAt: state.bornAt, stage: state.stage, reason:'released' });
    }
    localStorage.removeItem(SAVE_KEY);
    state = null;
    document.getElementById('settingsBackdrop').classList.remove('show');
    openPicker();
    renderAll();
  }
});

/* ---------- LANGUAGE SWITCH ---------- */
document.querySelectorAll('.lang-btn').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    LANG = btn.dataset.lang;
    localStorage.setItem('petsitter_lang', LANG);
    applyI18n();
  });
});

/* ---------- MAIN ACTION BUTTON WIRING ---------- */
document.getElementById('feedBtn').addEventListener('click', doFeed);
document.getElementById('playBtn').addEventListener('click', doPlay);
document.getElementById('cleanBtn').addEventListener('click', doClean);
document.getElementById('sleepBtn').addEventListener('click', doSleep);
document.getElementById('healBtn').addEventListener('click', doHeal);
document.getElementById('petBtn').addEventListener('click', doPet);
document.getElementById('workBtn').addEventListener('click', doWork);
document.getElementById('signalBtn').addEventListener('click', doSignalHunt);

/* ---------- INIT ---------- */
function init(){
  loadState();
  applyI18n();
  if(state){
    tick();
    closePicker();
  } else {
    openPicker();
  }
  renderAll();
  setInterval(tick, 15000);
  setInterval(()=>{
    if(state && state.alive && !state.asleep && Math.random()<0.15){
      const idle = [
        state.hunger<40 ? t('hungry') : null,
      ].filter(Boolean);
      if(idle.length) showSpeech(idle[0]);
    }
  }, 9000);
}
init();
