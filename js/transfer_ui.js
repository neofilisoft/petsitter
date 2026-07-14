/* ==========================================================
   TRANSFER MODAL UI
   ========================================================== */

function openTransferModal(startTab){
  renderTransferModal(startTab || 'issue');
  document.getElementById('transferBackdrop').classList.add('show');
}

function renderTransferModal(startTab){
  const body = document.getElementById('transferBody');
  body.innerHTML = `
    <div class="breed-tabs">
      <button class="breed-tab-btn ${startTab==='issue'?'active':''}" data-ttab="issue">${t('transfer_tab_issue')}</button>
      <button class="breed-tab-btn ${startTab==='restore'?'active':''}" data-ttab="restore">${t('transfer_tab_restore')}</button>
    </div>
    <div id="transferTabBody"></div>
  `;
  const tabBtns = body.querySelectorAll('.breed-tab-btn');
  tabBtns.forEach(btn=>{
    btn.addEventListener('click', ()=>{
      tabBtns.forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      renderTransferTab(btn.dataset.ttab);
    });
  });
  renderTransferTab(startTab);
}

function renderTransferTab(tab){
  const el = document.getElementById('transferTabBody');
  const live = hasSharedStorage();

  if(tab === 'issue'){
    if(!state){
      el.innerHTML = `<div class="sub">${t('transfer_need_pet')}</div>`;
      return;
    }
    el.innerHTML = `
      <div class="sub">${live ? t('transfer_issue_desc_online') : t('transfer_issue_desc_offline')}</div>
      <div class="name-input-row">
        <label>${t('transfer_password_label')}</label>
        <input type="text" id="transferIssuePassword" maxlength="20" placeholder="${t('transfer_password_placeholder')}">
      </div>
      <button class="big-btn" id="transferIssueBtn">${t('transfer_issue_btn')}</button>
      <div id="transferIssueResult"></div>
    `;
    document.getElementById('transferIssueBtn').addEventListener('click', async ()=>{
      const pw = document.getElementById('transferIssuePassword').value.trim();
      if(pw.length < 4){
        document.getElementById('transferIssueResult').innerHTML = `<div class="breed-error">${t('transfer_password_too_short')}</div>`;
        return;
      }
      const resultEl = document.getElementById('transferIssueResult');
      resultEl.innerHTML = `<div class="sub">…</div>`;
      if(live){
        const res = await issueTransferOnline(pw);
        if(!res.ok){
          resultEl.innerHTML = `<div class="breed-error">${t('transfer_error')}</div>`;
          return;
        }
        resultEl.innerHTML = `
          <div class="breed-section">
            <h4>${t('transfer_your_id_title')}</h4>
            <div class="pairing-code-box transfer-id-box">${formatTransferId(res.id)}</div>
            <div class="sub">${t('transfer_write_down_hint')}</div>
          </div>`;
      } else {
        const code = issueTransferOffline(pw);
        resultEl.innerHTML = `
          <div class="breed-section">
            <h4>${t('transfer_your_code_title_offline')}</h4>
            <div class="pairing-code-box" id="transferOfflineCode">${code}</div>
            <button class="big-btn secondary" id="transferCopyCodeBtn">${t('breed_copy_code')}</button>
            <div class="sub transfer-offline-warning">${t('transfer_offline_warning')}</div>
          </div>`;
        document.getElementById('transferCopyCodeBtn').addEventListener('click', async ()=>{
          try{
            await navigator.clipboard.writeText(code);
            showSpeech(t('breed_code_copied'));
          }catch(e){
            const range = document.createRange();
            range.selectNode(document.getElementById('transferOfflineCode'));
            window.getSelection().removeAllRanges();
            window.getSelection().addRange(range);
          }
        });
      }
    });
  } else {
    el.innerHTML = `
      <div class="sub">${live ? t('transfer_restore_desc_online') : t('transfer_restore_desc_offline')}</div>
      ${live ? `
        <div class="name-input-row">
          <label>${t('transfer_id_label')}</label>
          <input type="text" id="transferRestoreId" maxlength="11" placeholder="123 456 789">
        </div>
      ` : `
        <div class="name-input-row">
          <label>${t('transfer_code_label')}</label>
          <textarea class="pairing-input" id="transferRestoreCode" placeholder="${t('transfer_code_placeholder')}"></textarea>
        </div>
      `}
      <div class="name-input-row">
        <label>${t('transfer_password_label')}</label>
        <input type="text" id="transferRestorePassword" maxlength="20" placeholder="${t('transfer_password_placeholder')}">
      </div>
      <div id="transferRestoreError" class="breed-error"></div>
      <button class="big-btn" id="transferRestoreBtn">${t('transfer_restore_btn')}</button>
    `;
    document.getElementById('transferRestoreBtn').addEventListener('click', async ()=>{
      const pw = document.getElementById('transferRestorePassword').value.trim();
      const errEl = document.getElementById('transferRestoreError');
      errEl.textContent = '';

      if(state && state.alive){
        const confirmed = confirm(t('transfer_confirm_overwrite'));
        if(!confirmed) return;
      }

      let result;
      if(live){
        const id = document.getElementById('transferRestoreId').value.trim();
        if(!id || !pw){ errEl.textContent = t('transfer_fill_all_fields'); return; }
        result = await restoreTransferOnline(id, pw);
        if(!result.ok){
          errEl.textContent = result.reason==='bad_password' ? t('transfer_bad_password') : t('transfer_not_found');
          return;
        }
      } else {
        const code = document.getElementById('transferRestoreCode').value.trim();
        if(!code || !pw){ errEl.textContent = t('transfer_fill_all_fields'); return; }
        result = restoreTransferOffline(code, pw);
        if(!result.ok){
          errEl.textContent = t('transfer_bad_password_or_code');
          return;
        }
      }

      applyTransferPayload(result.payload);
      document.getElementById('transferBackdrop').classList.remove('show');
      document.getElementById('pickerBackdrop').classList.remove('show');
      renderAll();
      showSpeech(t('transfer_success'));
    });
  }
}
