/* ==========================================================
   SPECIES DEFINITIONS + SVG SPRITE GENERATION
   ========================================================== */

const SPECIES = {
  cat:      { icon:'🐱', color:'#E8A855', descKey:'species_cat_desc', decay:{hunger:1.0, happy:0.9, energy:1.1, clean:0.8}, name:{en:'Cat', th:'แมว'} },
  dog:      { icon:'🐶', color:'#C9975A', descKey:'species_dog_desc', decay:{hunger:1.3, happy:1.2, energy:1.3, clean:1.1}, name:{en:'Dog', th:'สุนัข'} },
  dragon:   { icon:'🐉', color:'#5A9E6F', descKey:'species_dragon_desc', decay:{hunger:1.1, happy:0.7, energy:0.9, clean:0.6}, name:{en:'Dragon', th:'มังกร'} },
  bird:     { icon:'🐦', color:'#5FA8C9', descKey:'species_bird_desc', decay:{hunger:0.9, happy:1.4, energy:1.0, clean:0.9}, name:{en:'Bird', th:'นก'} },
  snake:    { icon:'🐍', color:'#7FA85A', descKey:'species_snake_desc', decay:{hunger:0.6, happy:0.6, energy:0.7, clean:0.5}, name:{en:'Snake', th:'งู'} },
  hamster:  { icon:'🐹', color:'#D9A05B', descKey:'species_hamster_desc', decay:{hunger:1.4, happy:1.0, energy:1.2, clean:1.0}, name:{en:'Hamster', th:'แฮมสเตอร์'} },
  glider:   { icon:'🐿️', color:'#8C7AA8', descKey:'species_glider_desc', decay:{hunger:1.0, happy:1.3, energy:1.4, clean:0.9}, name:{en:'Sugar Glider', th:'ชูก้าไกลเดอร์'} },
  axolotl:  { icon:'🦎', color:'#EFA9C6', descKey:'species_axolotl_desc', decay:{hunger:0.8, happy:0.9, energy:0.7, clean:0.7}, name:{en:'Axolotl', th:'แอกโซลอเติล'} },
  tortoise: { icon:'🐢', color:'#8FA85E', descKey:'species_tortoise_desc', decay:{hunger:0.5, happy:0.5, energy:0.5, clean:0.4}, name:{en:'Tortoise', th:'เต่าบก'} },
  human:    { icon:'🧑', color:'#E8B48A', descKey:'species_human_desc', decay:{hunger:1.1, happy:1.1, energy:1.1, clean:1.0}, name:{en:'Human', th:'มนุษย์'}, noEgg:true },
};

// Stage lists are per-species: every animal hatches from an egg, but
// Human is born live, so their stage list skips straight to "baby" and
// uses a slightly finer-grained set of names (toddler between baby and
// child) since human development reads oddly compressed otherwise.
const DEFAULT_STAGES = ['egg','baby','child','teen','adult','elder'];
const DEFAULT_STAGE_HOURS = { egg:0.05, baby:6, child:18, teen:36, adult:96, elder:9999 };
const HUMAN_STAGES = ['baby','toddler','child','teen','adult','elder'];
const HUMAN_STAGE_HOURS = { baby:6, toddler:12, child:24, teen:36, adult:96, elder:9999 };

function stagesFor(species){
  return (SPECIES[species] && SPECIES[species].noEgg) ? HUMAN_STAGES : DEFAULT_STAGES;
}
function stageHoursFor(species){
  return (SPECIES[species] && SPECIES[species].noEgg) ? HUMAN_STAGE_HOURS : DEFAULT_STAGE_HOURS;
}
// Backward-compatible alias used by breeding/UI code that doesn't care
// which species - BREED_MIN_STAGE indexes into a same-length array for
// every species (both stage lists are 6 entries, teen is always index 3).
const STAGES = DEFAULT_STAGES;
const STAGE_HOURS = DEFAULT_STAGE_HOURS;

// stage index helper, species-aware since Human's list differs
function stageIndex(stage, species){
  return stagesFor(species).indexOf(stage);
}

function shadeColor(hex, amt){
  let col = hex.replace('#','');
  if(col.length===3) col = col.split('').map(x=>x+x).join('');
  const num = parseInt(col,16);
  let r = (num>>16)+amt, g=((num>>8)&0xff)+amt, b=(num&0xff)+amt;
  r=Math.max(0,Math.min(255,r)); g=Math.max(0,Math.min(255,g)); b=Math.max(0,Math.min(255,b));
  return '#'+((1<<24)+(r<<16)+(g<<8)+b).toString(16).slice(1);
}

function eyesMarkup(state_, cx1, cx2, cy){
  if(state_==='closed'){
    return `<path d="M ${cx1-7} ${cy} q 7 6 14 0" stroke="#2B2620" stroke-width="3" fill="none" stroke-linecap="round"/>
            <path d="M ${cx2-7} ${cy} q 7 6 14 0" stroke="#2B2620" stroke-width="3" fill="none" stroke-linecap="round"/>`;
  }
  if(state_==='sad'){
    return `<circle cx="${cx1}" cy="${cy}" r="5.5" fill="#2B2620"/><circle cx="${cx2}" cy="${cy}" r="5.5" fill="#2B2620"/>
            <path d="M ${cx1-9} ${cy-9} q 9 -6 16 0" stroke="#2B2620" stroke-width="2.5" fill="none" stroke-linecap="round"/>
            <path d="M ${cx2-7} ${cy-9} q 9 -6 16 0" stroke="#2B2620" stroke-width="2.5" fill="none" stroke-linecap="round"/>`;
  }
  return `<circle cx="${cx1}" cy="${cy}" r="6" fill="#2B2620"/><circle cx="${cx1+2}" cy="${cy-2}" r="1.8" fill="#fff"/>
          <circle cx="${cx2}" cy="${cy}" r="6" fill="#2B2620"/><circle cx="${cx2+2}" cy="${cy-2}" r="1.8" fill="#fff"/>`;
}

function petSvg(species, stage, mood){
  const c = SPECIES[species].color;
  const shade = shadeColor(c, -18);
  const light = shadeColor(c, 24);
  const eyeState = mood === 'asleep' ? 'closed' : (mood==='sad'?'sad':'open');
  const stages = stagesFor(species);
  const stIdx = stages.indexOf(stage);
  const scale = stIdx <= 0 ? 0.7 : stIdx === 1 ? 0.82 : 1;

  if(stage === 'egg'){
    return `<svg viewBox="0 0 150 150"><g transform="translate(75,80) scale(${scale})">
      <ellipse cx="0" cy="10" rx="46" ry="58" fill="${c}" stroke="${shade}" stroke-width="4"/>
      <ellipse cx="-14" cy="-14" rx="14" ry="10" fill="${light}" opacity="0.6"/>
      <path d="M -18 0 L -4 18 L -20 20 L 2 40" stroke="${shade}" stroke-width="3" fill="none" stroke-linecap="round"/>
    </g></svg>`;
  }

  const bodies = {
    cat: bodyRound, dog: bodyRound, hamster: bodyRound, glider: bodyRound,
    dragon: bodyDragon, bird: bodyBird, snake: bodySnake,
    axolotl: bodyAxolotl, tortoise: bodyTortoise, human: bodyHuman,
  };
  const fn = bodies[species] || bodyRound;
  return fn(species, stage, c, shade, light, eyeState, scale);
}

function bodyRound(species, stage, c, shade, light, eyeState, scale){
  const earShape = species==='cat'
    ? `<path d="M -32 -34 L -44 -62 L -14 -42 Z" fill="${c}" stroke="${shade}" stroke-width="3"/>
       <path d="M 32 -34 L 44 -62 L 14 -42 Z" fill="${c}" stroke="${shade}" stroke-width="3"/>`
    : species==='dog'
    ? `<ellipse cx="-38" cy="-20" rx="12" ry="24" fill="${c}" stroke="${shade}" stroke-width="3" transform="rotate(-18 -38 -20)"/>
       <ellipse cx="38" cy="-20" rx="12" ry="24" fill="${c}" stroke="${shade}" stroke-width="3" transform="rotate(18 38 -20)"/>`
    : species==='hamster'
    ? `<circle cx="-34" cy="-40" r="16" fill="${c}" stroke="${shade}" stroke-width="3"/>
       <circle cx="34" cy="-40" r="16" fill="${c}" stroke="${shade}" stroke-width="3"/>
       <circle cx="-34" cy="-40" r="8" fill="#F4C9C9"/><circle cx="34" cy="-40" r="8" fill="#F4C9C9"/>`
    : `<ellipse cx="-30" cy="-42" rx="10" ry="20" fill="${c}" stroke="${shade}" stroke-width="3" transform="rotate(-25 -30 -42)"/>
       <ellipse cx="30" cy="-42" rx="10" ry="20" fill="${c}" stroke="${shade}" stroke-width="3" transform="rotate(25 30 -42)"/>`;

  const nose = species==='dog'
    ? `<ellipse cx="0" cy="14" rx="7" ry="5" fill="#3A342B"/>`
    : species==='cat'
    ? `<path d="M -5 12 L 5 12 L 0 18 Z" fill="#C9757A"/>`
    : `<ellipse cx="0" cy="12" rx="4" ry="3" fill="#3A342B"/>`;

  const whiskers = species==='cat' ? `
    <line x1="-18" y1="16" x2="-42" y2="10" stroke="${shade}" stroke-width="1.5" opacity="0.5"/>
    <line x1="-18" y1="20" x2="-42" y2="20" stroke="${shade}" stroke-width="1.5" opacity="0.5"/>
    <line x1="18" y1="16" x2="42" y2="10" stroke="${shade}" stroke-width="1.5" opacity="0.5"/>
    <line x1="18" y1="20" x2="42" y2="20" stroke="${shade}" stroke-width="1.5" opacity="0.5"/>` : '';

  const tail = species==='dog'
    ? `<path d="M 40 30 Q 66 20 60 -4" stroke="${c}" stroke-width="10" fill="none" stroke-linecap="round"/>`
    : species==='cat'
    ? `<path d="M 38 34 Q 68 40 58 4" stroke="${c}" stroke-width="9" fill="none" stroke-linecap="round"/>`
    : species==='glider'
    ? `<path d="M 34 38 Q 30 62 4 66" stroke="${c}" stroke-width="12" fill="none" stroke-linecap="round"/>`
    : '';

  const gliderMembrane = species==='glider'
    ? `<path d="M -48 10 Q -70 -6 -46 -30" fill="${light}" stroke="${shade}" stroke-width="2.5" opacity="0.85"/>
       <path d="M 48 10 Q 70 -6 46 -30" fill="${light}" stroke="${shade}" stroke-width="2.5" opacity="0.85"/>` : '';

  return `<svg viewBox="0 0 150 150"><g transform="translate(75,86) scale(${scale})">
    ${tail}
    ${gliderMembrane}
    ${earShape}
    <ellipse cx="0" cy="8" rx="46" ry="42" fill="${c}" stroke="${shade}" stroke-width="4"/>
    <ellipse cx="0" cy="30" rx="30" ry="14" fill="${light}" opacity="0.55"/>
    ${eyesMarkup(eyeState, -16, 16, -2)}
    ${nose}
    ${whiskers}
    ${species==='hamster' ? `<ellipse cx="-24" cy="18" rx="9" ry="6" fill="${light}"/><ellipse cx="24" cy="18" rx="9" ry="6" fill="${light}"/>`:''}
  </g></svg>`;
}

/* ---------- DRAGON: shape grows more dragon-like with each stage ----------
   baby/child : round hatchling, stubby horns, no visible wings - cute blob
   teen       : snout starts to elongate, small wings appear, tail thickens, back spikes begin
   adult      : full snout, spread wings, long tail with spikes, clawed feet
   elder      : adult shape + a few extra flourishes (longer whiskers, bigger crest) */
function bodyDragon(species, stage, c, shade, light, eyeState, scale){
  const idx = stageIndex(stage); // baby=1, child=2, teen=3, adult=4, elder=5
  const mature = idx >= 3;   // teen and up
  const grand  = idx >= 4;   // adult and up
  const ancient = idx === 5; // elder only

  // --- wings: absent until teen, then grow. Attached low on the BACK/
  // shoulder (not beside the head) and shaped as angular bat-wings with
  // pointed tips and rib lines, spreading up and outward - not big round
  // droopy flaps at ear-height, which was reading as elephant ears. ---
  const wingSpan = grand ? 58 : 44;
  const wingTip = grand ? -34 : -24;
  const wings = mature ? `
    <path d="M -30 8
             L -${wingSpan*0.55} -${Math.abs(wingTip)*0.3}
             L -${wingSpan} ${wingTip}
             L -${wingSpan*0.72} -${Math.abs(wingTip)*0.05}
             L -${wingSpan*0.86} ${Math.abs(wingTip)*0.55}
             L -${wingSpan*0.5} ${Math.abs(wingTip)*0.4}
             L -32 24 Z"
          fill="${light}" stroke="${shade}" stroke-width="3" stroke-linejoin="round" opacity="0.94"/>
    <path d="M -30 8 L -${wingSpan*0.9} ${wingTip*0.7}" stroke="${shade}" stroke-width="1.6" opacity="0.5"/>
    <path d="M -30 8 L -${wingSpan*0.75} ${Math.abs(wingTip)*0.5}" stroke="${shade}" stroke-width="1.6" opacity="0.5"/>
    <path d="M 30 8
             L ${wingSpan*0.55} -${Math.abs(wingTip)*0.3}
             L ${wingSpan} ${wingTip}
             L ${wingSpan*0.72} -${Math.abs(wingTip)*0.05}
             L ${wingSpan*0.86} ${Math.abs(wingTip)*0.55}
             L ${wingSpan*0.5} ${Math.abs(wingTip)*0.4}
             L 32 24 Z"
          fill="${light}" stroke="${shade}" stroke-width="3" stroke-linejoin="round" opacity="0.94"/>
    <path d="M 30 8 L ${wingSpan*0.9} ${wingTip*0.7}" stroke="${shade}" stroke-width="1.6" opacity="0.5"/>
    <path d="M 30 8 L ${wingSpan*0.75} ${Math.abs(wingTip)*0.5}" stroke="${shade}" stroke-width="1.6" opacity="0.5"/>
  ` : '';

  // --- tail: short curl as baby, longer + spiked once mature. Grand-stage
  // values are kept inside the 150-wide viewBox (previous values reached
  // x~171 absolute against a 150 boundary and were clipped at the edge). ---
  const tail = mature
    ? `<path d="M 34 34 Q ${grand?56:60} ${grand?30:32} ${grand?62:64} ${grand?4:6}" stroke="${c}" stroke-width="${grand?12:11}" fill="none" stroke-linecap="round"/>
       <path d="M ${grand?60:60} ${grand?3:4} L ${grand?52:52} -${grand?7:8} M ${grand?60:60} ${grand?3:4} L ${grand?66:66} -${grand?8:10}" stroke="${shade}" stroke-width="4" fill="none" stroke-linecap="round"/>`
    : `<path d="M 30 32 Q 46 34 42 16" stroke="${c}" stroke-width="9" fill="none" stroke-linecap="round"/>`;

  // --- snout: rounder + small when young, a short forward-projecting
  // angular wedge once mature - NOT a long hanging trunk shape (that
  // read as an elephant). Kept close to the face, roughly as wide as
  // it is long, with a flat-ish underside and a pointed brow. ---
  const snoutW = grand ? 20 : 17;
  const snoutLen = grand ? 16 : 13;
  const jawY = grand ? 14 : 12;
  const snout = mature
    ? `<path d="M -${snoutW} ${jawY-4}
                Q -${snoutW*0.9} ${jawY+snoutLen*0.5} -${snoutW*0.45} ${jawY+snoutLen}
                L ${snoutW*0.45} ${jawY+snoutLen}
                Q ${snoutW*0.9} ${jawY+snoutLen*0.5} ${snoutW} ${jawY-4}
                Q ${snoutW*0.55} ${jawY-10} 0 ${jawY-11}
                Q -${snoutW*0.55} ${jawY-10} -${snoutW} ${jawY-4} Z"
          fill="${c}" stroke="${shade}" stroke-width="4" stroke-linejoin="round"/>
       <path d="M -${snoutW*0.5} ${jawY+snoutLen-2} L ${snoutW*0.5} ${jawY+snoutLen-2}"
             stroke="${shade}" stroke-width="2.2" fill="none" stroke-linecap="round"/>
       <path d="M -${snoutW*0.3} ${jawY+snoutLen-3} L -${snoutW*0.2} ${jawY+snoutLen+4} L -${snoutW*0.08} ${jawY+snoutLen-3} Z" fill="#F4EFE4"/>
       <path d="M ${snoutW*0.3} ${jawY+snoutLen-3} L ${snoutW*0.2} ${jawY+snoutLen+4} L ${snoutW*0.08} ${jawY+snoutLen-3} Z" fill="#F4EFE4"/>
       <path d="M -${snoutW*0.6} ${jawY+2} q -2.5 2.5 -1 5" stroke="#2B2620" stroke-width="1.8" fill="none" stroke-linecap="round"/>
       <path d="M ${snoutW*0.6} ${jawY+2} q 2.5 2.5 1 5" stroke="#2B2620" stroke-width="1.8" fill="none" stroke-linecap="round"/>`
    : `<ellipse cx="0" cy="30" rx="26" ry="12" fill="${light}" opacity="0.6"/>
       <path d="M -8 16 Q 0 22 8 16" stroke="${shade}" stroke-width="2.5" fill="none" stroke-linecap="round"/>`;

  // --- back spikes: small nubs when young, a full ridge line when mature ---
  const spikeCount = idx===1?0 : idx===2?2 : idx===3?4 : idx===4?5 : 6;
  let spikes = '';
  for(let i=0;i<spikeCount;i++){
    const t = spikeCount>1 ? i/(spikeCount-1) : 0.5;
    const x = -22 + t*44;
    const yBase = -4 - Math.sin(t*Math.PI)*6;
    const h = grand ? 16 : 11;
    spikes += `<path d="M ${x-5} ${yBase} L ${x} ${yBase-h} L ${x+5} ${yBase} Z" fill="${c}" stroke="${shade}" stroke-width="2"/>`;
  }

  // --- horns: stubby nubs baby/child, curved horns teen+, larger crest for elder ---
  const horns = mature
    ? `<path d="M -18 -32 Q -${grand?30:24} -${grand?56:48} -${grand?10:8} -${grand?52:44}" stroke="${c}" stroke-width="7" fill="none" stroke-linecap="round"/>
       <path d="M 18 -32 Q ${grand?30:24} -${grand?56:48} ${grand?10:8} -${grand?52:44}" stroke="${c}" stroke-width="7" fill="none" stroke-linecap="round"/>
       ${ancient ? `<path d="M 0 -40 L 0 -${58}" stroke="${light}" stroke-width="5" fill="none" stroke-linecap="round"/>` : ''}`
    : `<path d="M -20 -34 L -12 -52 L -4 -32 Z" fill="${c}" stroke="${shade}" stroke-width="3"/>
       <path d="M 4 -32 L 12 -54 L 20 -34 Z" fill="${c}" stroke="${shade}" stroke-width="3"/>
       <path d="M -8 -30 L 0 -44 L 8 -30 Z" fill="${light}" stroke="${shade}" stroke-width="2"/>`;

  // --- legs / claws: only visible once mature, subtle hint of stance ---
  const legs = grand
    ? `<ellipse cx="-22" cy="40" rx="9" ry="6" fill="${c}" stroke="${shade}" stroke-width="2.5"/>
       <ellipse cx="22" cy="40" rx="9" ry="6" fill="${c}" stroke="${shade}" stroke-width="2.5"/>
       <path d="M -27 43 L -30 47 M -22 44 L -22 48 M -17 43 L -15 47" stroke="${shade}" stroke-width="1.6" stroke-linecap="round"/>
       <path d="M 27 43 L 30 47 M 22 44 L 22 48 M 17 43 L 15 47" stroke="${shade}" stroke-width="1.6" stroke-linecap="round"/>`
    : '';

  const bodyRx = mature ? 42 : 44, bodyRy = mature ? 38 : 40;

  return `<svg viewBox="0 0 150 150"><g transform="translate(75,86) scale(${scale})">
    ${tail}
    ${wings}
    ${legs}
    <ellipse cx="0" cy="10" rx="${bodyRx}" ry="${bodyRy}" fill="${c}" stroke="${shade}" stroke-width="4"/>
    ${spikes}
    ${horns}
    ${snout}
    ${eyesMarkup(eyeState, -15, 15, -4)}
    <path d="M -30 6 L -40 2 M -30 -2 L -40 -8" stroke="${shade}" stroke-width="2" opacity="0.5"/>
    <path d="M 30 6 L 40 2 M 30 -2 L 40 -8" stroke="${shade}" stroke-width="2" opacity="0.5"/>
  </g></svg>`;
}

function bodyBird(species, stage, c, shade, light, eyeState, scale){
  return `<svg viewBox="0 0 150 150"><g transform="translate(75,90) scale(${scale})">
    <ellipse cx="18" cy="30" rx="10" ry="18" fill="${shade}" opacity="0.7" transform="rotate(20 18 30)"/>
    <ellipse cx="-18" cy="30" rx="10" ry="18" fill="${shade}" opacity="0.7" transform="rotate(-20 -18 30)"/>
    <ellipse cx="0" cy="6" rx="38" ry="42" fill="${c}" stroke="${shade}" stroke-width="4"/>
    <path d="M -14 -38 Q 0 -52 14 -38" stroke="${c}" stroke-width="8" fill="none" stroke-linecap="round"/>
    <ellipse cx="0" cy="26" rx="22" ry="20" fill="${light}" opacity="0.6"/>
    <path d="M -6 8 L 8 12 L -6 16 Z" fill="#E0A937" stroke="${shade}" stroke-width="1.5"/>
    ${eyesMarkup(eyeState, -12, 8, -8)}
  </g></svg>`;
}

function bodySnake(species, stage, c, shade, light, eyeState, scale){
  return `<svg viewBox="0 0 150 150"><g transform="translate(75,96) scale(${scale})">
    <path d="M -30 30 Q -40 0 -10 -4 Q 20 -8 10 -30" stroke="${c}" stroke-width="26" fill="none" stroke-linecap="round"/>
    <path d="M -30 30 Q -40 0 -10 -4 Q 20 -8 10 -30" stroke="${shade}" stroke-width="26" fill="none" stroke-linecap="round" opacity="0.15" stroke-dasharray="2 10"/>
    <ellipse cx="14" cy="-34" rx="20" ry="18" fill="${c}" stroke="${shade}" stroke-width="4"/>
    <ellipse cx="14" cy="-24" rx="12" ry="7" fill="${light}" opacity="0.6"/>
    ${eyesMarkup(eyeState, 6, 24, -38)}
    <path d="M 30 -30 L 42 -32 L 34 -26 L 44 -22" stroke="#D64550" stroke-width="2" fill="none" stroke-linecap="round"/>
  </g></svg>`;
}

/* ---------- AXOLOTL: round head, feathery external gills, wide grin, tiny legs ---------- */
function bodyAxolotl(species, stage, c, shade, light, eyeState, scale){
  const idx = stageIndex(stage, species);
  const grand = idx >= 3; // teen+ gets fuller gill fronds
  function gill(x, angle, big){
    const len = big ? 30 : 22;
    return `<g transform="translate(${x},-8) rotate(${angle})">
      <path d="M 0 0 Q ${len*0.5} -6 ${len} 2" stroke="${shade}" stroke-width="3.5" fill="none" stroke-linecap="round"/>
      <path d="M 0 0 Q ${len*0.5} 4 ${len*0.85} 14" stroke="${shade}" stroke-width="3" fill="none" stroke-linecap="round"/>
      <path d="M 0 0 Q ${len*0.45} 10 ${len*0.7} 20" stroke="${shade}" stroke-width="2.5" fill="none" stroke-linecap="round"/>
      <ellipse cx="${len}" cy="2" rx="5" ry="7" fill="${light}" stroke="${shade}" stroke-width="2" transform="rotate(20 ${len} 2)"/>
      <ellipse cx="${len*0.85}" cy="14" rx="4.5" ry="6" fill="${light}" stroke="${shade}" stroke-width="2" transform="rotate(50 ${len*0.85} 14)"/>
      <ellipse cx="${len*0.7}" cy="20" rx="4" ry="5.5" fill="${light}" stroke="${shade}" stroke-width="2" transform="rotate(75 ${len*0.7} 20)"/>
    </g>`;
  }
  return `<svg viewBox="0 0 150 150"><g transform="translate(75,88) scale(${scale})">
    <path d="M 30 36 Q 50 42 46 20" stroke="${c}" stroke-width="12" fill="none" stroke-linecap="round"/>
    ${gill(-40, grand?-125:-110, grand)}
    ${gill(40, grand?-55:-70, grand)}
    <ellipse cx="0" cy="6" rx="44" ry="38" fill="${c}" stroke="${shade}" stroke-width="4"/>
    <ellipse cx="-20" cy="34" rx="8" ry="5" fill="${c}" stroke="${shade}" stroke-width="2.5"/>
    <ellipse cx="18" cy="35" rx="8" ry="5" fill="${c}" stroke="${shade}" stroke-width="2.5"/>
    <path d="M -20 18 Q 0 30 20 18" stroke="${shade}" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    ${eyesMarkup(eyeState, -15, 15, -6)}
    <ellipse cx="-10" cy="4" rx="4" ry="2.5" fill="${light}" opacity="0.7"/>
    <ellipse cx="10" cy="4" rx="4" ry="2.5" fill="${light}" opacity="0.7"/>
  </g></svg>`;
}

/* ---------- TORTOISE: domed patterned shell, stubby legs, small head ---------- */
function bodyTortoise(species, stage, c, shade, light, eyeState, scale){
  const idx = stageIndex(stage, species);
  const grand = idx >= 3;
  const shellRx = grand ? 48 : 42, shellRy = grand ? 36 : 32;
  let plates = '';
  const cols = 3, rows = 2;
  for(let r=0;r<rows;r++){
    for(let col=0;col<cols;col++){
      const px = -shellRx*0.55 + col*(shellRx*0.55);
      const py = -shellRy*0.35 + r*(shellRy*0.65);
      plates += `<path d="M ${px-14} ${py} L ${px} ${py-11} L ${px+14} ${py} L ${px} ${py+11} Z" fill="${light}" stroke="${shade}" stroke-width="2" opacity="0.65"/>`;
    }
  }
  return `<svg viewBox="0 0 150 150"><g transform="translate(75,90) scale(${scale})">
    <ellipse cx="-30" cy="30" rx="9" ry="7" fill="${c}" stroke="${shade}" stroke-width="2.5"/>
    <ellipse cx="30" cy="30" rx="9" ry="7" fill="${c}" stroke="${shade}" stroke-width="2.5"/>
    <ellipse cx="-34" cy="10" rx="8" ry="6" fill="${c}" stroke="${shade}" stroke-width="2.5"/>
    <ellipse cx="34" cy="10" rx="8" ry="6" fill="${c}" stroke="${shade}" stroke-width="2.5"/>
    <ellipse cx="0" cy="34" rx="18" ry="10" fill="${c}" stroke="${shade}" stroke-width="3"/>
    <ellipse cx="0" cy="2" rx="${shellRx}" ry="${shellRy}" fill="${c}" stroke="${shade}" stroke-width="4"/>
    <ellipse cx="0" cy="2" rx="${shellRx-7}" ry="${shellRy-7}" fill="none" stroke="${shade}" stroke-width="2" opacity="0.4"/>
    ${plates}
    <ellipse cx="0" cy="20" rx="20" ry="16" fill="${light}" stroke="${shade}" stroke-width="3"/>
    ${eyesMarkup(eyeState, -9, 9, 16)}
    <path d="M -5 26 Q 0 29 5 26" stroke="${shade}" stroke-width="2" fill="none" stroke-linecap="round"/>
  </g></svg>`;
}

function miniSvg(key){
  return petSvg(key, 'child', 'open').replace('<svg viewBox="0 0 150 150">','<svg viewBox="0 0 150 150" style="width:64px;height:64px;">');
}

/* ---------- HUMAN: actual humanoid figure, proportions shift with age ----------
   baby    : big round head, tiny body, stubby limbs, tuft of hair, sitting pose
   toddler : head still large-ish, standing, short limbs, simple hair
   child   : more balanced proportions, visible hairstyle, standing straight
   teen    : taller/leaner proportions, more defined hair, arms at sides
   adult   : full adult proportions, confident stance
   elder   : adult proportions + a slight forward stoop, simple cane-free posture, grey hair */
function bodyHuman(species, stage, c, shade, light, eyeState, scale){
  const idx = stageIndex(stage, species); // 0=baby,1=toddler,2=child,3=teen,4=adult,5=elder
  const skin = c, skinShade = shade, skinLight = light;
  const hairColor = idx >= 5 ? '#C7C2B8' : '#7A5B3F';
  const hairShade = idx >= 5 ? '#A9A398' : '#5E4530';
  const outfit = '#6C9FD6', outfitShade = shadeColor('#6C9FD6', -22);

  // Head shrinks relative to body as the figure ages (classic "big head =
  // young" shorthand). bodyH/legLen grow instead. These are chosen so
  // 2*headR + bodyH + legLen + 2 (total figure height) stays comfortably
  // inside the 150-tall viewBox at every stage - the old version grew the
  // figure without bound and the feet ran off the bottom for teen+.
  const headR   = [24, 21, 19, 17, 16, 16][idx];
  const bodyW   = [22, 26, 29, 31, 33, 33][idx];
  const bodyH   = [12, 20, 26, 32, 34, 32][idx];
  const legLen  = [4,  22, 38, 48, 54, 50][idx];
  const armLen  = [10, 18, 26, 34, 36, 34][idx];
  const stoop   = idx === 5 ? 5 : 0; // elder leans forward slightly

  // Anchor every stage to the same "ground line" (GROUND) so the figure
  // visibly grows taller/upward with age, feet planted at a constant
  // level, rather than the whole figure just scaling in place.
  const GROUND = 46; // feet sit at local y=46 (translate handles the rest)
  const headCy = GROUND - legLen - bodyH - headR - 2;
  const bodyCy = headCy + headR + bodyH/2 - 2;

  const hair = idx === 0
    ? `<path d="M -14 ${headCy-headR+6} Q 0 ${headCy-headR-10} 14 ${headCy-headR+6}" stroke="${hairColor}" stroke-width="8" fill="none" stroke-linecap="round"/>`
    : idx === 1
    ? `<path d="M -${headR-2} ${headCy-2} Q -${headR-2} ${headCy-headR-6} 0 ${headCy-headR-10} Q ${headR-2} ${headCy-headR-6} ${headR-2} ${headCy-2}
                Q ${headR-2} ${headCy-headR+8} 0 ${headCy-headR+10} Q -${headR-2} ${headCy-headR+8} -${headR-2} ${headCy-2} Z"
         fill="${hairColor}" stroke="${hairShade}" stroke-width="2"/>`
    : `<path d="M -${headR-1} ${headCy+2} Q -${headR-1} ${headCy-headR-2} 0 ${headCy-headR-6} Q ${headR-1} ${headCy-headR-2} ${headR-1} ${headCy+2}
                Q ${headR-1} ${headCy-4} ${headR-6} ${headCy-2} Q 0 ${headCy-headR+4} -${headR-6} ${headCy-2} Q -${headR-1} ${headCy-4} -${headR-1} ${headCy+2} Z"
         fill="${hairColor}" stroke="${hairShade}" stroke-width="2"/>
       ${idx>=3 ? `<path d="M -${headR-2} ${headCy} Q -${headR+4} ${headCy+headR*0.6} -${headR-6} ${headCy+headR*0.9}" stroke="${hairColor}" stroke-width="6" fill="none" stroke-linecap="round"/>
                    <path d="M ${headR-2} ${headCy} Q ${headR+4} ${headCy+headR*0.6} ${headR-6} ${headCy+headR*0.9}" stroke="${hairColor}" stroke-width="6" fill="none" stroke-linecap="round"/>` : ''}`;

  const legs = idx === 0
    ? `<ellipse cx="-10" cy="${bodyCy+bodyH/2+4}" rx="9" ry="7" fill="${skin}" stroke="${skinShade}" stroke-width="3"/>
       <ellipse cx="10" cy="${bodyCy+bodyH/2+4}" rx="9" ry="7" fill="${skin}" stroke="${skinShade}" stroke-width="3"/>`
    : `<path d="M -${bodyW*0.32} ${bodyCy+bodyH/2} L -${bodyW*0.4} ${bodyCy+bodyH/2+legLen}" stroke="${outfit}" stroke-width="${idx<=1?11:13}" fill="none" stroke-linecap="round"/>
       <path d="M ${bodyW*0.32} ${bodyCy+bodyH/2} L ${bodyW*0.4} ${bodyCy+bodyH/2+legLen}" stroke="${outfit}" stroke-width="${idx<=1?11:13}" fill="none" stroke-linecap="round"/>
       <ellipse cx="-${bodyW*0.4}" cy="${bodyCy+bodyH/2+legLen+3}" rx="7" ry="4" fill="${skinShade}"/>
       <ellipse cx="${bodyW*0.4}" cy="${bodyCy+bodyH/2+legLen+3}" rx="7" ry="4" fill="${skinShade}"/>`;

  const arms = idx === 0
    ? `<ellipse cx="-${bodyW*0.62}" cy="${bodyCy-2}" rx="7" ry="10" fill="${skin}" stroke="${skinShade}" stroke-width="2.5"/>
       <ellipse cx="${bodyW*0.62}" cy="${bodyCy-2}" rx="7" ry="10" fill="${skin}" stroke="${skinShade}" stroke-width="2.5"/>`
    : `<path d="M -${bodyW*0.46} ${bodyCy-bodyH*0.32} Q -${bodyW*0.62+6} ${bodyCy-4} -${bodyW*0.5} ${bodyCy+armLen*0.7}" stroke="${outfit}" stroke-width="9" fill="none" stroke-linecap="round"/>
       <path d="M ${bodyW*0.46} ${bodyCy-bodyH*0.32} Q ${bodyW*0.62+6} ${bodyCy-4} ${bodyW*0.5} ${bodyCy+armLen*0.7}" stroke="${outfit}" stroke-width="9" fill="none" stroke-linecap="round"/>
       <circle cx="-${bodyW*0.5}" cy="${bodyCy+armLen*0.7}" r="5.5" fill="${skin}" stroke="${skinShade}" stroke-width="2"/>
       <circle cx="${bodyW*0.5}" cy="${bodyCy+armLen*0.7}" r="5.5" fill="${skin}" stroke="${skinShade}" stroke-width="2"/>`;

  const bodyShape = idx === 0
    ? `<ellipse cx="0" cy="${bodyCy}" rx="${bodyW*0.8}" ry="${bodyH*0.55}" fill="${outfit}" stroke="${outfitShade}" stroke-width="3"/>`
    : `<path d="M -${bodyW/2} ${bodyCy-bodyH/2} Q 0 ${bodyCy-bodyH/2-4} ${bodyW/2} ${bodyCy-bodyH/2}
                L ${bodyW/2-3} ${bodyCy+bodyH/2} Q 0 ${bodyCy+bodyH/2+4} -${bodyW/2-3} ${bodyCy+bodyH/2} Z"
         fill="${outfit}" stroke="${outfitShade}" stroke-width="3"/>`;

  // elder gets a simplified stoop by rotating the whole figure slightly forward
  const groupTransform = `translate(75,94) scale(${scale}) ${stoop ? `rotate(4)` : ''}`;

  return `<svg viewBox="0 0 150 150"><g transform="${groupTransform}">
    ${legs}
    ${bodyShape}
    ${arms}
    <circle cx="0" cy="${headCy}" r="${headR}" fill="${skin}" stroke="${skinShade}" stroke-width="4"/>
    ${idx <= 1 ? `<ellipse cx="0" cy="${headCy+headR*0.35}" rx="${headR*0.5}" ry="${headR*0.3}" fill="${skinLight}" opacity="0.5"/>` : ''}
    ${hair}
    ${eyesMarkup(eyeState, -headR*0.38, headR*0.38, headCy+2)}
    ${idx >= 2 ? `<path d="M -6 ${headCy+headR*0.42} Q 0 ${headCy+headR*0.52} 6 ${headCy+headR*0.42}" stroke="${skinShade}" stroke-width="2" fill="none" stroke-linecap="round"/>` : `<ellipse cx="0" cy="${headCy+headR*0.4}" rx="4" ry="3" fill="${skinShade}" opacity="0.6"/>`}
    ${idx===5 ? `<path d="M -${headR*0.6} ${headCy-headR*0.15} L -${headR*0.3} ${headCy-headR*0.15} M ${headR*0.3} ${headCy-headR*0.15} L ${headR*0.6} ${headCy-headR*0.15}" stroke="${skinShade}" stroke-width="1.5" opacity="0.5"/>` : ''}
  </g></svg>`;
}
