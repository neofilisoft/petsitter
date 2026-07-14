/* ==========================================================
   ONLINE MATCHMAKING
   Lets a pet be "listed" for breeding and matched against
   other players' pets. This file only works if the page is
   running inside an environment that exposes `window.storage`
   with a shared (cross-user) mode - e.g. Claude's artifact
   runtime. Outside of that, there is no real server for a
   static HTML file to talk to, so we fall back to a manual
   "Pairing Code" flow: you export your pet as a short code,
   your friend pastes it in on their device, and vice versa.
   This is disclosed to the player rather than silently no-op'd.
   ========================================================== */

const ONLINE_LISTING_PREFIX = 'petsitter_listing:';
const ONLINE_TTL_MS = 30 * 60 * 1000; // listings expire after 30 min

function hasSharedStorage(){
  return !!(window.storage && typeof window.storage.set === 'function');
}

function myPlayerId(){
  let id = localStorage.getItem('petsitter_player_id');
  if(!id){
    id = 'p_' + Math.random().toString(36).slice(2,10);
    localStorage.setItem('petsitter_player_id', id);
  }
  return id;
}

function petToListing(pet){
  return {
    ownerId: myPlayerId(),
    name: pet.name,
    species: pet.species,
    stage: pet.stage,
    generation: pet.generation,
    traits: pet.traits,
    listedAt: Date.now(),
  };
}

/* ---------- Shared-storage backed matchmaking (works in-artifact) ---------- */
async function publishListing(pet){
  if(!hasSharedStorage()) return { ok:false, reason:'no_backend' };
  try{
    const listing = petToListing(pet);
    await window.storage.set(ONLINE_LISTING_PREFIX + listing.ownerId, JSON.stringify(listing), true);
    return { ok:true, listing };
  }catch(e){
    return { ok:false, reason:'error', error:e };
  }
}

async function withdrawListing(){
  if(!hasSharedStorage()) return { ok:false, reason:'no_backend' };
  try{
    await window.storage.delete(ONLINE_LISTING_PREFIX + myPlayerId(), true);
    return { ok:true };
  }catch(e){
    return { ok:false, reason:'error', error:e };
  }
}

async function browseListings(){
  if(!hasSharedStorage()) return { ok:false, reason:'no_backend', listings:[] };
  try{
    const listResult = await window.storage.list(ONLINE_LISTING_PREFIX, true);
    const keys = (listResult && listResult.keys) || [];
    const myId = myPlayerId();
    const out = [];
    for(const k of keys){
      if(k === ONLINE_LISTING_PREFIX + myId) continue; // don't match with yourself
      try{
        const res = await window.storage.get(k, true);
        if(!res || !res.value) continue;
        const listing = JSON.parse(res.value);
        if(Date.now() - listing.listedAt > ONLINE_TTL_MS) continue; // expired
        out.push(listing);
      }catch(e){ /* skip unreadable entries */ }
    }
    out.sort((a,b)=> b.listedAt - a.listedAt);
    return { ok:true, listings: out };
  }catch(e){
    return { ok:false, reason:'error', error:e, listings:[] };
  }
}

/* ---------- Manual pairing-code fallback (works anywhere) ----------
   Encodes just enough of a pet to breed with as a short base64 blob.
   Nothing sensitive - species/name/traits/generation only. */
function encodePairingCode(pet){
  const payload = petToListing(pet);
  const json = JSON.stringify(payload);
  const b64 = btoa(unescape(encodeURIComponent(json)));
  // group into blocks of 4 for readability
  return b64.match(/.{1,4}/g).join('-');
}
function decodePairingCode(code){
  try{
    const clean = code.replace(/[\s-]/g,'');
    const json = decodeURIComponent(escape(atob(clean)));
    const payload = JSON.parse(json);
    if(!payload.species || !SPECIES[payload.species]) return null;
    return payload;
  }catch(e){
    return null;
  }
}
