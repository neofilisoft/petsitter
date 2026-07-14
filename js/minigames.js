/* ==========================================================
   ACTIVITIES / MINIGAMES
   All games share one modal shell (#gameBackdrop, #gameBody)
   and end by calling applyGameReward(happyGain, energyCost, bonusChance).
   ========================================================== */

let currentGame = null; // cleanup handle for whichever game is active

function applyGameReward(happyGain, energyCost, bonusChance){
  if(!requireAlive()) return;
  state.happy = clamp(state.happy + happyGain, 0, 100);
  state.energy = clamp(state.energy - energyCost, 0, 100);
  if(bonusChance && Math.random() < bonusChance){
    state.inventory.toy = (state.inventory.toy||0) + 1;
  }
  saveState();
  renderAll();
}

function closeGameModal(){
  if(currentGame && currentGame.cleanup) currentGame.cleanup();
  currentGame = null;
  document.getElementById('gameBackdrop').classList.remove('show');
}

function openActivitiesMenu(){
  if(!requireAlive()) return;
  if(state.asleep){ showSpeech(t('cant_play_asleep')); return; }
  if(state.energy < 12){ showSpeech(t('no_energy')); return; }
  renderActivitiesMenu();
  document.getElementById('activitiesBackdrop').classList.add('show');
}

function renderActivitiesMenu(){
  const grid = document.getElementById('activitiesGrid');
  const acts = [
    { key:'tap', icon:'⭐', nameKey:'act_tap', descKey:'act_tap_desc' },
    { key:'memory', icon:'🃏', nameKey:'act_memory', descKey:'act_memory_desc' },
    { key:'catch', icon:'🎯', nameKey:'act_feed_catch', descKey:'act_feed_catch_desc' },
    { key:'rhythm', icon:'🥁', nameKey:'act_rhythm', descKey:'act_rhythm_desc' },
  ];
  grid.innerHTML = acts.map(a=>`
    <button class="activity-card" data-act="${a.key}">
      <div class="act-icon">${a.icon}</div>
      <div class="act-name">${t(a.nameKey)}</div>
      <div class="act-desc">${t(a.descKey)}</div>
    </button>
  `).join('');
  grid.querySelectorAll('.activity-card').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      document.getElementById('activitiesBackdrop').classList.remove('show');
      launchActivity(btn.dataset.act);
    });
  });
}

function launchActivity(key){
  const body = document.getElementById('gameBody');
  const title = document.getElementById('gameTitleText');
  document.getElementById('gameBackdrop').classList.add('show');
  if(key==='tap'){ title.textContent = t('game_title'); startTapGame(body); }
  else if(key==='memory'){ title.textContent = t('memory_title'); startMemoryGame(body); }
  else if(key==='catch'){ title.textContent = t('catch_title'); startCatchGame(body); }
  else if(key==='rhythm'){ title.textContent = t('rhythm_title'); startRhythmGame(body); }
}

/* ---------- GAME 1: Tap Along (original) ---------- */
function startTapGame(body){
  let score = 0, timeLeft = 8.0, interval = null, active = true;
  body.innerHTML = `
    <div class="sub">${t('game_sub')}</div>
    <div class="game-area">
      <div class="game-score">⭐ <span id="tapScore">0</span></div>
      <button class="tap-target" id="tapTargetBtn">⭐</button>
      <div class="game-timer" id="tapTimer">8.0s</div>
    </div>`;
  const btn = body.querySelector('#tapTargetBtn');
  btn.addEventListener('click', ()=>{
    if(!active) return;
    score++;
    body.querySelector('#tapScore').textContent = score;
    playBeep(500+score*4);
    btn.style.marginLeft = (Math.random()*120-60)+'px';
  });
  interval = setInterval(()=>{
    timeLeft -= 0.1;
    if(timeLeft <= 0){
      timeLeft = 0; clearInterval(interval); active = false;
      const happyGain = clamp(8 + score*2, 0, 60);
      const energyCost = clamp(10 + Math.floor(score/2), 5, 30);
      applyGameReward(happyGain, energyCost, score>=15?0.5:0);
      setTimeout(()=>{
        closeGameModal();
        showSpeech(LANG==='th' ? `สนุกมาก! +${happyGain} ความสุข` : `That was fun! +${happyGain} happy`);
      }, 450);
    }
    const timerEl = body.querySelector('#tapTimer');
    if(timerEl) timerEl.textContent = Math.max(0,timeLeft).toFixed(1)+'s';
  }, 100);
  currentGame = { cleanup(){ clearInterval(interval); active=false; } };
}

/* ---------- GAME 2: Memory Match ---------- */
function startMemoryGame(body){
  const icons = ['🍎','🍬','🎾','💊','🍗','🐾'];
  const deck = [...icons, ...icons].sort(()=>Math.random()-0.5);
  let flipped = [];
  let matched = new Set();
  let moves = 0;
  let lock = false;

  body.innerHTML = `
    <div class="sub">${t('memory_sub')}</div>
    <div class="memory-hud"><span>${t('moves_label')}: <b id="memMoves">0</b></span></div>
    <div class="memory-grid" id="memoryGrid"></div>`;
  const grid = body.querySelector('#memoryGrid');
  grid.innerHTML = deck.map((icon,i)=>`<button class="memory-card" data-i="${i}" data-icon="${icon}"><span class="mc-face">?</span></button>`).join('');

  grid.querySelectorAll('.memory-card').forEach(card=>{
    card.addEventListener('click', ()=>{
      const i = card.dataset.i;
      if(lock || matched.has(i) || flipped.find(f=>f.i===i)) return;
      card.classList.add('flipped');
      card.querySelector('.mc-face').textContent = card.dataset.icon;
      flipped.push({ i, icon: card.dataset.icon, el: card });
      playBeep(500);
      if(flipped.length === 2){
        moves++;
        body.querySelector('#memMoves').textContent = moves;
        lock = true;
        const [a,b] = flipped;
        if(a.icon === b.icon){
          matched.add(a.i); matched.add(b.i);
          a.el.classList.add('matched'); b.el.classList.add('matched');
          flipped = []; lock = false;
          playBeep(700);
          if(matched.size === deck.length){
            const happyGain = clamp(40 - moves, 12, 40);
            setTimeout(()=>{
              applyGameReward(happyGain, 12, 0.5);
              showSpeech(t('memory_win', moves));
              closeGameModal();
            }, 400);
          }
        } else {
          setTimeout(()=>{
            a.el.classList.remove('flipped'); b.el.classList.remove('flipped');
            a.el.querySelector('.mc-face').textContent='?'; b.el.querySelector('.mc-face').textContent='?';
            flipped = []; lock = false;
          }, 650);
        }
      }
    });
  });
  currentGame = { cleanup(){} };
}

/* ---------- GAME 3: Catch Practice ---------- */
function startCatchGame(body){
  body.innerHTML = `
    <div class="sub">${t('catch_sub')}</div>
    <div class="catch-hud">
      <span>⭐ <b id="catchScore">0</b></span>
      <span>${t('misses_label')}: <b id="catchMisses">0</b>/5</span>
    </div>
    <div class="catch-field" id="catchField">
      <div class="catch-basket" id="catchBasket">🧺</div>
    </div>`;
  const field = body.querySelector('#catchField');
  const basket = body.querySelector('#catchBasket');
  let fieldWidth = 280;
  let basketX = fieldWidth/2;
  let score = 0, misses = 0, dropInterval = null, active = true;
  const items = ['🍎','🍬','🍗','🐟','🍰'];

  function moveBasket(clientX){
    const rect = field.getBoundingClientRect();
    basketX = clamp(clientX - rect.left, 20, rect.width-20);
    basket.style.left = basketX+'px';
  }
  function onPointer(e){
    const x = e.touches ? e.touches[0].clientX : e.clientX;
    moveBasket(x);
  }
  field.addEventListener('mousemove', onPointer);
  field.addEventListener('touchmove', (e)=>{ onPointer(e); e.preventDefault(); }, {passive:false});
  field.addEventListener('click', onPointer);

  function spawnDrop(){
    if(!active) return;
    const rect = field.getBoundingClientRect();
    const w = rect.width || fieldWidth;
    const drop = document.createElement('div');
    drop.className = 'catch-drop';
    drop.textContent = items[Math.floor(Math.random()*items.length)];
    const x = 20 + Math.random()*(w-40);
    drop.style.left = x+'px';
    drop.style.top = '0px';
    field.appendChild(drop);
    let y = 0;
    const fallInterval = setInterval(()=>{
      if(!active){ clearInterval(fallInterval); drop.remove(); return; }
      y += 6;
      drop.style.top = y+'px';
      const rect2 = field.getBoundingClientRect();
      const basketRect = basket.getBoundingClientRect();
      if(y > rect2.height - 46){
        // reached bottom - check catch
        const dropCenterX = parseFloat(drop.style.left) + 14;
        if(Math.abs(dropCenterX - basketX) < 34){
          score++; body.querySelector('#catchScore').textContent = score;
          playBeep(650);
        } else {
          misses++; body.querySelector('#catchMisses').textContent = misses;
          playBeep(220);
          if(misses >= 5){
            active = false;
            clearInterval(fallInterval);
            clearInterval(dropInterval);
            drop.remove();
            finishCatch();
            return;
          }
        }
        clearInterval(fallInterval);
        drop.remove();
      }
    }, 30);
  }
  function finishCatch(){
    const happyGain = clamp(6 + score*3, 10, 55);
    applyGameReward(happyGain, 14, score>=8?0.5:0);
    showSpeech(t('catch_score', score));
    setTimeout(closeGameModal, 500);
  }
  dropInterval = setInterval(spawnDrop, 900);
  currentGame = { cleanup(){ active=false; clearInterval(dropInterval); field.querySelectorAll('.catch-drop').forEach(d=>d.remove()); } };
}

/* ---------- GAME 4: Rhythm Tap ---------- */
function startRhythmGame(body){
  body.innerHTML = `
    <div class="sub">${t('rhythm_sub')}</div>
    <div class="rhythm-hud">${t('rhythm_score', 0).replace(/\d+/, '<span id="rhythmScore">0</span>')}</div>
    <div class="rhythm-track">
      <div class="rhythm-ring"></div>
      <div class="rhythm-note" id="rhythmNote"></div>
    </div>
    <button class="tap-target rhythm-btn" id="rhythmBtn">TAP</button>`;
  const note = body.querySelector('#rhythmNote');
  const btn = body.querySelector('#rhythmBtn');
  let score = 0, round = 0, active = true, animId = null, roundStart = 0;
  const totalRounds = 8;
  const cycleMs = 1400;

  function runRound(){
    if(!active || round >= totalRounds){ finishRhythm(); return; }
    round++;
    note.style.transition = 'none';
    note.style.transform = 'scale(0.2)';
    note.style.opacity = '1';
    void note.offsetWidth;
    note.style.transition = `transform ${cycleMs}ms linear`;
    note.style.transform = 'scale(1.6)';
    roundStart = performance.now();
    animId = setTimeout(()=>{
      if(active) runRound(); // missed window entirely, move on
    }, cycleMs + 150);
  }
  btn.addEventListener('click', ()=>{
    if(!active) return;
    // Track progress through the 0.2 -> 1.6 scale animation by elapsed
    // time rather than reading it back from computed CSS (which needs
    // DOMMatrix support we can't rely on everywhere).
    const elapsed = performance.now() - roundStart;
    const progress = clamp(elapsed / cycleMs, 0, 1);
    const currentScale = 0.2 + progress * (1.6 - 0.2);
    const diff = Math.abs(currentScale - 1.0);
    if(diff < 0.18){
      score++;
      body.querySelector('#rhythmScore').textContent = score;
      playBeep(750);
      note.style.filter = 'brightness(1.6)';
    } else {
      playBeep(200);
    }
    clearTimeout(animId);
    round++;
    if(round >= totalRounds){ finishRhythm(); return; }
    runRound();
  });
  function finishRhythm(){
    active = false;
    const happyGain = clamp(10 + score*4, 12, 55);
    applyGameReward(happyGain, 13, score>=5?0.5:0);
    showSpeech(t('rhythm_score', score));
    setTimeout(closeGameModal, 500);
  }
  runRound();
  currentGame = { cleanup(){ active=false; clearTimeout(animId); } };
}
