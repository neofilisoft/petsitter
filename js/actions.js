/* ==========================================================
   ACTIONS
   ========================================================== */

function doFeed(){
  if(!requireAlive() || state.asleep) return;
  if(state.hunger >= 95){ showSpeech(t('too_full')); return; }
  openFeedPicker();
}

function openFeedPicker(){
  renderFeedPicker();
  document.getElementById('feedPickerBackdrop').classList.add('show');
}

function doPlay(){
  openActivitiesMenu();
}

function doClean(){
  if(!requireAlive() || state.asleep) return;
  if(state.clean >= 95){ showSpeech(t('already_clean')); return; }
  state.clean = clamp(state.clean + 35, 0, 100);
  state.happy = clamp(state.happy + 2, 0, 100);
  spawnFx('✨');
  playBeep(660);
  saveState(); renderAll();
}

function doSleep(){
  if(!requireAlive()) return;
  if(state.asleep){
    state.asleep = false;
    showSpeech(t('wake_toast'));
  } else {
    state.asleep = true;
    showSpeech(t('sleep_toast'));
  }
  saveState(); renderAll();
}

function doHeal(){
  if(!requireAlive() || state.asleep) return;
  if(state.health >= 95){ showSpeech(t('full_health')); return; }
  if(state.inventory.medicine <= 0){ showSpeech(t('no_meds')); return; }
  state.inventory.medicine--;
  state.health = clamp(state.health + 40, 0, 100);
  spawnFx('💊');
  playBeep(520);
  saveState(); renderAll();
}

function doPet(){
  if(!requireAlive() || state.asleep) return;
  state.happy = clamp(state.happy + 10, 0, 100);
  spawnFx('💖');
  playBeep(740);
  saveState(); renderAll();
}

function doWork(){
  if(!requireAlive()) return;
  if(state.asleep){ showSpeech(t('cant_work_asleep')); return; }
  if(state.energy < 15){ showSpeech(t('no_energy')); return; }
  const earned = 5 + Math.floor(Math.random()*8);
  state.coins += earned;
  state.energy = clamp(state.energy - 15, 0, 100);
  state.hunger = clamp(state.hunger - 6, 0, 100);
  showSpeech(t('work_result', earned));
  spawnFx('🪙');
  playBeep(880);
  if(Math.random() < 0.35){
    const foodKeys = Object.keys(ITEMS).filter(k=>ITEMS[k].category==='food');
    const drop = foodKeys[Math.floor(Math.random()*foodKeys.length)];
    state.inventory[drop] = (state.inventory[drop]||0) + 1;
  }
  saveState(); renderAll();
}

function useItem(key){
  if(!requireAlive() || state.asleep) return;
  if((state.inventory[key]||0) <= 0) return;
  const item = ITEMS[key];
  if(!item) return;
  state.inventory[key]--;
  const affinityBonus = (item.affinity && item.affinity.includes(state.species)) ? 1.25 : 1;
  state.hunger = clamp(state.hunger + Math.round(item.hunger*affinityBonus), 0, 100);
  state.happy  = clamp(state.happy + Math.round(item.happy*affinityBonus), 0, 100);
  state.health = clamp(state.health + item.health, 0, 100);
  state.energy = clamp(state.energy + item.energy, 0, 100);
  spawnFx(item.icon);
  playBeep(600);
  saveState(); renderAll();
}

function buyItem(key){
  if(!requireAlive()) return;
  const item = ITEMS[key];
  if(!item) return;
  if(state.coins < item.price){ showSpeech(t('not_enough_coins')); return; }
  state.coins -= item.price;
  state.inventory[key] = (state.inventory[key]||0) + 1;
  showSpeech(t('bought_item', itemLabel(key)));
  playBeep(560);
  saveState(); renderAll(); renderShop(); renderInventory();
}

/* ---------- SIGNAL HUNT ----------
   Adapted from TamaFi's WiFi-scan hunting mechanic (resolveHunt/resolveDiscover
   in TamaFi.ino). A browser can't enumerate nearby SSIDs for privacy reasons,
   so this measures the *quality of the pet's own connection* instead: online
   status, the Network Information API when available (effectiveType/downlink/
   rtt), and a real measured round-trip latency probe. */
let signalHuntInFlight = false;
const SIGNAL_HUNT_COOLDOWN_MS = 20000;

async function measureLatencyMs(){
  const probes = [
    'https://www.gstatic.com/generate_204',
    'https://www.cloudflare.com/cdn-cgi/trace',
  ];
  const timeoutMs = 4000;
  const start = performance.now();
  try{
    await Promise.race([
      Promise.any(probes.map(url => fetch(url, { mode:'no-cors', cache:'no-store' }))),
      new Promise((_, rej) => setTimeout(()=>rej(new Error('timeout')), timeoutMs)),
    ]);
    return performance.now() - start;
  }catch(e){
    return null;
  }
}

function readConnectionInfo(){
  const nav = navigator;
  const conn = nav.connection || nav.mozConnection || nav.webkitConnection || null;
  return {
    online: nav.onLine,
    effectiveType: conn ? conn.effectiveType : null,
    downlink: conn ? conn.downlink : null,
    rtt: conn ? conn.rtt : null,
    saveData: conn ? !!conn.saveData : false,
  };
}

async function doSignalHunt(){
  if(!requireAlive() || state.asleep || signalHuntInFlight) return;
  const now = Date.now();
  if(now - (state.lastSignalHunt||0) < SIGNAL_HUNT_COOLDOWN_MS){
    showSpeech(t('signal_cooldown'));
    return;
  }
  signalHuntInFlight = true;
  renderButtons();
  showSpeech(t('signal_hunting'));
  spawnFx('📡');

  const info = readConnectionInfo();
  let latency = null;
  if(info.online){
    latency = await measureLatencyMs();
  }
  signalHuntInFlight = false;

  let strength = 0;
  if(!info.online){
    strength = 0;
  } else if(latency == null){
    strength = 15;
  } else {
    strength = clamp(Math.round(100 - (latency/2000)*90), 5, 100);
    if(info.effectiveType === '4g') strength = clamp(strength + 8, 0, 100);
    if(info.effectiveType === '3g') strength = clamp(strength - 10, 0, 100);
    if(info.effectiveType === '2g' || info.effectiveType === 'slow-2g') strength = clamp(strength - 30, 0, 100);
    if(info.downlink != null) strength = clamp(strength + Math.min(10, info.downlink), 0, 100);
  }

  state.lastSignalHunt = now;
  state.lastSignalStats = { strength, latency, info, at: now };

  let hungerDelta, happyDelta, healthDelta;
  if(strength <= 0){
    hungerDelta = -8; happyDelta = -6; healthDelta = -2;
    spawnFx('📵');
    playBeep(180);
    showSpeech(t('signal_none'));
  } else {
    hungerDelta = Math.round(clamp(6 + strength*0.32, 0, 38));
    happyDelta  = Math.round(clamp(strength*0.28 + (state.traits.curiosity/10), 0, 30));
    healthDelta = strength > 70 ? 6 : strength > 40 ? 3 : 0;
    spawnFx(strength > 70 ? '⚡' : strength > 35 ? '📶' : '🔹');
    playBeep(400 + strength*4);
    showSpeech(strength > 70 ? t('signal_great') : strength > 35 ? t('signal_ok') : t('signal_weak'));
  }

  state.hunger = clamp(state.hunger + hungerDelta, 0, 100);
  state.happy  = clamp(state.happy + happyDelta, 0, 100);
  state.health = clamp(state.health + healthDelta, 0, 100);
  state.energy = clamp(state.energy - 6, 0, 100);

  saveState(); renderAll();
}

/* ---------- MOOD (adapted from TamaFi's updateMood()) ---------- */
function computeMood(){
  if(!state) return 'calm';
  const sig = state.lastSignalStats;
  const sinceHunt = state.lastSignalHunt ? (Date.now() - state.lastSignalHunt) : Infinity;

  if(state.health < 25 || (state.lastSignalHunt && sig && sig.strength === 0 && sinceHunt > 60000)){
    return 'sick';
  }
  if(state.hunger < 25){
    return 'hungry';
  }
  if(state.happy > 80 && sig && sig.strength > 70){
    return 'excited';
  }
  if(state.happy > 60 && sig && sig.strength > 0){
    return 'happy';
  }
  if(state.lastSignalHunt && sinceHunt > 30000 && (!sig || sig.strength === 0)){
    return 'bored';
  }
  if(sig && sig.strength > 0 && (state.traits.curiosity > 60)){
    return 'curious';
  }
  return 'calm';
}

/* ---------- BREEDING ACTIONS ---------- */
function doBreedWithPartner(partner){
  const result = breedWith(partner);
  if(!result.ok){
    if(result.reason === 'not_ready'){
      if(stageIndex(state.stage, state.species) < BREED_MIN_STAGE) showSpeech(t('breed_not_ready_stage'));
      else if(Date.now() - (state.lastBreed||0) < BREED_COOLDOWN_MS) showSpeech(t('breed_cooldown'));
      else showSpeech(t('breed_not_ready_mood'));
    }
    return result;
  }
  renderAll();
  showSpeech(t('breed_success', result.child.name, SPECIES[result.child.species].name[LANG]));
  spawnFx('🥚');
  playBeep(700);
  return result;
}
