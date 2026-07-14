/* ==========================================================
   TRANSFER SYSTEM
   FGO/Umamusume-style "Transfer ID + Password" for moving a
   save to another device, or logging back in after reinstall.

   Two modes depending on environment, same honesty pattern as
   the online breeding matchmaker:
   - LIVE  (window.storage available): ID + password are checked
     against real shared storage, so restoring on a different
     device/session actually pulls your data down.
   - OFFLINE (standalone file, no shared backend): there's no
     server to look anything up on, so the "transfer code" IS
     the backup itself - the full save, lightly obfuscated with
     the chosen password, encoded as a copyable block of text.
     The player has to keep that code safe themselves (notes app,
     message to self, etc). This is disclosed, not hidden.
   ========================================================== */

const TRANSFER_PREFIX = 'petsitter_transfer:';

function randomTransferId(){
  // 9-digit numeric ID, formatted like FGO's Friend Code / Transfer ID
  let id = '';
  for(let i=0;i<9;i++) id += Math.floor(Math.random()*10);
  return id;
}
function formatTransferId(id){
  return id.replace(/\s/g,'').replace(/(\d{3})(?=\d)/g, '$1 ').trim();
}

async function sha256Hex(text){
  if(window.crypto && window.crypto.subtle){
    try{
      const enc = new TextEncoder().encode(text);
      const buf = await window.crypto.subtle.digest('SHA-256', enc);
      return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join('');
    }catch(e){ /* fall through to the simple hash below */ }
  }
  // Fallback for environments without SubtleCrypto - not cryptographic,
  // just enough to check "does this password match" consistently.
  let hash = 0;
  for(let i=0;i<text.length;i++){
    hash = ((hash<<5)-hash + text.charCodeAt(i))|0;
  }
  return 'h'+Math.abs(hash).toString(16);
}

function buildTransferPayload(){
  return {
    state: state,
    log: loadLog(),
    savedAt: Date.now(),
  };
}

function simpleObfuscate(text, password){
  // Lightweight XOR keyed by the password. NOT real encryption or
  // security - just enough that the offline code isn't plain-readable
  // JSON and needs the matching password to decode back correctly.
  const key = password || 'petsitter';
  let out = '';
  for(let i=0;i<text.length;i++){
    out += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
  }
  return out;
}

/* ---------- LIVE mode (shared storage) ---------- */
async function issueTransferOnline(password){
  const id = randomTransferId();
  const passHash = await sha256Hex(password);
  const payload = buildTransferPayload();
  try{
    await window.storage.set(TRANSFER_PREFIX+id, JSON.stringify({ passHash, payload }), true);
    return { ok:true, id, mode:'online' };
  }catch(e){
    return { ok:false, reason:'error' };
  }
}
async function restoreTransferOnline(id, password){
  try{
    const cleanId = id.replace(/\s/g,'');
    const res = await window.storage.get(TRANSFER_PREFIX+cleanId, true);
    if(!res || !res.value) return { ok:false, reason:'not_found' };
    const record = JSON.parse(res.value);
    const passHash = await sha256Hex(password);
    if(passHash !== record.passHash) return { ok:false, reason:'bad_password' };
    return { ok:true, payload: record.payload };
  }catch(e){
    return { ok:false, reason:'not_found' };
  }
}

/* ---------- OFFLINE mode (self-contained code) ---------- */
function issueTransferOffline(password){
  const payload = buildTransferPayload();
  const json = JSON.stringify(payload);
  const obfuscated = simpleObfuscate(json, password);
  const b64 = btoa(unescape(encodeURIComponent(obfuscated)));
  return b64.match(/.{1,6}/g).join('-');
}
function restoreTransferOffline(code, password){
  try{
    const clean = code.replace(/[\s-]/g,'');
    const obfuscated = decodeURIComponent(escape(atob(clean)));
    const json = simpleObfuscate(obfuscated, password); // XOR is self-inverse
    const payload = JSON.parse(json);
    if(!payload.state || !payload.state.species) return { ok:false, reason:'invalid' };
    return { ok:true, payload };
  }catch(e){
    return { ok:false, reason:'invalid' };
  }
}

function applyTransferPayload(payload){
  state = payload.state;
  saveState();
  if(payload.log){
    localStorage.setItem(LOG_KEY, JSON.stringify(payload.log));
  }
}
