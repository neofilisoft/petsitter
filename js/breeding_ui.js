/* ==========================================================
   BREEDING DEN UI
   ========================================================== */

function openBreedingDen(){
  if(!requireAlive()) return;
  renderBreedingDen();
  document.getElementById('breedBackdrop').classList.add('show');
}

function renderBreedingDen(){
  const body = document.getElementById('breedBody');
  const ready = canBreed(state);
  let blockedMsg = '';
  if(!ready){
    if(stageIndex(state.stage, state.species) < BREED_MIN_STAGE) blockedMsg = t('breed_not_ready_stage');
    else if(Date.now() - (state.lastBreed||0) < BREED_COOLDOWN_MS) blockedMsg = t('breed_cooldown');
    else blockedMsg = t('breed_not_ready_mood');
  }

  body.innerHTML = `
    <div class="sub">${t('breed_sub')}</div>
    ${!ready ? `<div class="breed-blocked">${blockedMsg}</div>` : ''}
    <div class="breed-tabs">
      <button class="breed-tab-btn active" data-tab="code">${t('breed_partner_local')}</button>
      <button class="breed-tab-btn" data-tab="online">${t('breed_partner_online')}</button>
    </div>
    <div id="breedTabBody"></div>
  `;
  const tabBtns = body.querySelectorAll('.breed-tab-btn');
  tabBtns.forEach(btn=>{
    btn.addEventListener('click', ()=>{
      tabBtns.forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      renderBreedTab(btn.dataset.tab, ready);
    });
  });
  renderBreedTab('code', ready);
}

function renderBreedTab(tab, ready){
  const el = document.getElementById('breedTabBody');
  if(tab === 'code'){
    const myCode = state ? encodePairingCode(state) : '';
    el.innerHTML = `
      <div class="breed-section">
        <h4>${t('breed_your_code_title')}</h4>
        <div class="sub">${t('breed_your_code_sub')}</div>
        <div class="pairing-code-box" id="myPairingCode">${myCode}</div>
        <button class="big-btn secondary" id="copyCodeBtn">${t('breed_copy_code')}</button>
      </div>
      <div class="breed-section">
        <h4>${t('breed_enter_code_title')}</h4>
        <textarea class="pairing-input" id="partnerCodeInput" placeholder="${t('breed_enter_code_placeholder')}"></textarea>
        <div id="breedCodeError" class="breed-error"></div>
        <button class="big-btn" id="breedConfirmBtn" ${ready?'':'disabled'}>${t('breed_confirm_btn')}</button>
      </div>
    `;
    document.getElementById('copyCodeBtn').addEventListener('click', async ()=>{
      try{
        await navigator.clipboard.writeText(myCode);
        showSpeech(t('breed_code_copied'));
      }catch(e){
        // fallback: select the text for manual copy
        const range = document.createRange();
        range.selectNode(document.getElementById('myPairingCode'));
        window.getSelection().removeAllRanges();
        window.getSelection().addRange(range);
      }
    });
    document.getElementById('breedConfirmBtn').addEventListener('click', ()=>{
      const code = document.getElementById('partnerCodeInput').value;
      const partner = decodePairingCode(code);
      const errEl = document.getElementById('breedCodeError');
      if(!partner){
        errEl.textContent = t('breed_invalid_code');
        return;
      }
      errEl.textContent = '';
      const result = doBreedWithPartner(Object.assign({}, partner, { source:'code' }));
      if(result.ok){
        document.getElementById('breedBackdrop').classList.remove('show');
      }
    });
  } else {
    if(!hasSharedStorage()){
      el.innerHTML = `
        <div class="online-unavailable">
          <h4>${t('online_unavailable_title')}</h4>
          <p>${t('online_unavailable_body')}</p>
          <button class="big-btn secondary" id="switchToCodeBtn">${t('online_use_code_instead')}</button>
        </div>`;
      document.getElementById('switchToCodeBtn').addEventListener('click', ()=>{
        document.querySelector('.breed-tab-btn[data-tab="code"]').click();
      });
      return;
    }
    el.innerHTML = `
      <div class="sub">${t('online_privacy_note')}</div>
      <div class="online-actions">
        <button class="big-btn secondary" id="listMeBtn">${t('online_list_me_btn')}</button>
        <button class="big-btn secondary" id="refreshListBtn">${t('online_refresh_btn')}</button>
      </div>
      <div id="onlineListings" class="online-listings"><div class="sub">${t('online_empty')}</div></div>
    `;
    document.getElementById('listMeBtn').addEventListener('click', async ()=>{
      const res = await publishListing(state);
      if(res.ok) showSpeech(t('online_listing_you'));
    });
    document.getElementById('refreshListBtn').addEventListener('click', ()=> loadOnlineListings(ready));
    loadOnlineListings(ready);
  }
}

async function loadOnlineListings(ready){
  const container = document.getElementById('onlineListings');
  if(!container) return;
  container.innerHTML = `<div class="sub">…</div>`;
  const res = await browseListings();
  if(!res.ok || res.listings.length===0){
    container.innerHTML = `<div class="sub">${t('online_empty')}</div>`;
    return;
  }
  container.innerHTML = res.listings.map((l,i)=>`
    <div class="online-listing-card">
      <div class="ol-icon">${SPECIES[l.species] ? SPECIES[l.species].icon : '🐾'}</div>
      <div class="ol-info">
        <div class="ol-name">${l.name}</div>
        <div class="ol-detail">${SPECIES[l.species]?.name[LANG]||l.species} · ${t('stage_'+l.stage)} · ${t('online_listed_as', l.ownerId.slice(0,6))}</div>
      </div>
      <button class="ol-select-btn" data-idx="${i}" ${ready?'':'disabled'}>${t('online_select_btn')}</button>
    </div>
  `).join('');
  container.querySelectorAll('.ol-select-btn').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const listing = res.listings[parseInt(btn.dataset.idx,10)];
      const result = doBreedWithPartner(Object.assign({}, listing, { source:'online' }));
      if(result.ok){
        document.getElementById('breedBackdrop').classList.remove('show');
      }
    });
  });
}
