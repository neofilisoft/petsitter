/* ==========================================================
   CORE STATE: pet data model, decay simulation, breeding
   ========================================================== */

let state = null;
const SAVE_KEY = 'petsitter_save_v2';
const LOG_KEY = 'petsitter_log_v2';
const OLD_SAVE_KEY = 'petsitter_save_v1'; // v1 (single-file version) migration source
const OLD_LOG_KEY = 'petsitter_log_v1';

const BREED_MIN_STAGE = 3; // teen or older can breed (index into STAGES)
const BREED_COOLDOWN_MS = 60 * 60 * 1000; // 1 hour between breeding attempts

function randTrait(min, max){ return min + Math.floor(Math.random()*(max-min+1)); }

function defaultPetState(species, name, parentage){
  const now = Date.now();
  return {
    species, name,
    bornAt: now,
    lastTick: now,
    stage: stagesFor(species)[0], // 'egg' for animals, 'baby' for Human
    hunger: 100, happy: 100, energy: 100, clean: 100, health: 100,
    asleep: false,
    coins: 20,
    inventory: Object.assign({}, STARTING_INVENTORY),
    alive: true,
    traits: {
      curiosity: randTrait(40,89),
      activity:  randTrait(30,89),
      stress:    randTrait(20,79),
    },
    lastSignalHunt: 0,
    lastSignalStats: null,
    lastBreed: 0,
    generation: parentage ? (parentage.generation||1) + 1 : 1,
    parentage: parentage ? { a: parentage.a, b: parentage.b } : null,
  };
}

function loadState(){
  try{
    let raw = localStorage.getItem(SAVE_KEY);
    if(!raw){
      // migrate from the single-file v1 save if present
      const oldRaw = localStorage.getItem(OLD_SAVE_KEY);
      if(oldRaw){
        raw = oldRaw;
        localStorage.setItem(SAVE_KEY, oldRaw);
      }
    }
    if(raw) state = JSON.parse(raw);
    if(state){
      if(!state.traits){
        state.traits = { curiosity: randTrait(40,89), activity: randTrait(30,89), stress: randTrait(20,79) };
      }
      state.lastSignalHunt = state.lastSignalHunt || 0;
      state.lastSignalStats = state.lastSignalStats || null;
      state.lastBreed = state.lastBreed || 0;
      state.generation = state.generation || 1;
      state.parentage = state.parentage || null;
      state.coins = (state.coins != null) ? state.coins : 20;
      state.inventory = state.inventory || Object.assign({}, STARTING_INVENTORY);
    }
  }catch(e){ state = null; }
}
function saveState(){
  if(state) localStorage.setItem(SAVE_KEY, JSON.stringify(state));
}
function loadLog(){
  try{
    let raw = localStorage.getItem(LOG_KEY);
    if(!raw){
      const oldRaw = localStorage.getItem(OLD_LOG_KEY);
      if(oldRaw){ raw = oldRaw; localStorage.setItem(LOG_KEY, oldRaw); }
    }
    return raw ? JSON.parse(raw) : [];
  }catch(e){ return []; }
}
function pushLog(entry){
  const log = loadLog();
  log.unshift(entry);
  localStorage.setItem(LOG_KEY, JSON.stringify(log.slice(0,30)));
}

/* ---------- TICK / SIMULATION ---------- */
function ageHours(){
  return (Date.now() - state.bornAt) / 3600000;
}
function currentStageIndex(){
  const h = ageHours();
  const stages = stagesFor(state.species);
  const hours = stageHoursFor(state.species);
  let cum = 0, idx = 0;
  for(let i=0;i<stages.length;i++){
    cum += hours[stages[i]];
    if(h < cum){ idx = i; break; }
    idx = i;
  }
  return idx;
}
function clamp(v,min,max){ return Math.max(min, Math.min(max, v)); }

function applyDecay(totalElapsedHours){
  if(!state || !state.alive) return;
  // Simulate in bounded sub-steps so health penalties (which depend on
  // other stats crossing thresholds) only apply for the portion of time
  // actually spent in that bad state, instead of retroactively applying
  // across the entire catch-up window.
  const STEP = 0.5;
  let remaining = totalElapsedHours;
  const d = SPECIES[state.species].decay;

  while(remaining > 0 && state.alive){
    const dt = Math.min(STEP, remaining);
    remaining -= dt;

    const sleepMul = state.asleep ? 0.25 : 1;
    // Sleep energy recovery is 5x the base rate per user request - a short
    // nap now meaningfully restores energy instead of a slow trickle.
    const energyRegen = state.asleep ? 14 * 5 : 0;

    state.hunger = clamp(state.hunger - dt * 1.6 * d.hunger * sleepMul, 0, 100);
    state.happy  = clamp(state.happy  - dt * 1.2 * d.happy * sleepMul, 0, 100);
    state.clean  = clamp(state.clean  - dt * 1.0 * d.clean * sleepMul, 0, 100);
    if(state.asleep){
      state.energy = clamp(state.energy + dt * energyRegen, 0, 100);
    } else {
      state.energy = clamp(state.energy - dt * 1.4 * d.energy, 0, 100);
    }

    let healthDelta = 0;
    if(state.hunger < 20) healthDelta -= dt * 2;
    if(state.clean < 20) healthDelta -= dt * 1;
    if(state.energy < 15) healthDelta -= dt * 1;
    if(state.hunger > 60 && state.clean > 60 && state.energy > 40) healthDelta += dt * 1.2;
    state.health = clamp(state.health + healthDelta, 0, 100);

    if(state.health <= 0){
      state.alive = false;
      break;
    }
  }
}

function requireAlive(){ return state && state.alive; }

/* ---------- BREEDING ----------
   Two teen-or-older pets combine into a new egg. The child's species is
   picked from either parent (50/50, with a small chance of a "wild" third
   species for variety), and starting traits are averaged from both parents
   with a little random drift - loosely inspired by simple genetic blending.
   The current pet is retired to the Care Log as "bred" and replaced by the
   new egg, since Petsitter only actively raises one pet at a time. */
function canBreed(pet){
  if(!pet || !pet.alive) return false;
  if(pet.asleep) return false;
  if(stageIndex(pet.stage, pet.species) < BREED_MIN_STAGE) return false;
  if(pet.happy < 40 || pet.health < 40) return false;
  if(Date.now() - (pet.lastBreed||0) < BREED_COOLDOWN_MS) return false;
  return true;
}

function pickChildSpecies(speciesA, speciesB){
  const roll = Math.random();
  if(roll < 0.46) return speciesA;
  if(roll < 0.92) return speciesB;
  // 8% chance of a surprise third species, for variety
  const keys = Object.keys(SPECIES);
  return keys[Math.floor(Math.random()*keys.length)];
}

function blendTrait(a, b){
  const base = Math.round((a + b) / 2);
  const drift = randTrait(-8, 8);
  return clamp(base + drift, 5, 95);
}

// Breed the current active pet with a partner descriptor:
// partner = { species, name, traits, generation, source: 'local'|'online', ownerLabel? }
function breedWith(partner){
  if(!canBreed(state)) return { ok:false, reason:'not_ready' };
  if(!partner || !partner.species) return { ok:false, reason:'no_partner' };

  const childSpecies = pickChildSpecies(state.species, partner.species);
  const parentage = {
    a: { name: state.name, species: state.species, generation: state.generation },
    b: { name: partner.name, species: partner.species, generation: partner.generation||1, source: partner.source||'local' },
    generation: Math.max(state.generation, partner.generation||1),
  };

  // retire current pet to the log as "bred", not dead
  pushLog({
    name: state.name, species: state.species,
    diedAt: Date.now(), bornAt: state.bornAt, stage: state.stage,
    reason: 'bred',
  });

  const carriedCoins = state.coins;

  const child = defaultPetState(childSpecies, partner.suggestedName || (LANG==='th' ? 'ไข่ใหม่' : 'New Egg'), parentage);
  child.traits.curiosity = blendTrait(state.traits.curiosity, (partner.traits&&partner.traits.curiosity) || 50);
  child.traits.activity  = blendTrait(state.traits.activity,  (partner.traits&&partner.traits.activity)  || 50);
  child.traits.stress    = blendTrait(state.traits.stress,    (partner.traits&&partner.traits.stress)    || 50);
  // small starting nest-egg bonus, but don't fully carry over economy
  child.coins = Math.max(10, Math.round(carriedCoins * 0.3));

  state = child;
  saveState();
  return { ok:true, child };
}
