/* ==========================================================
   FOOD & ITEM CATALOG
   Each item: icon, i18n key, effect deltas, and optional
   species affinity (bonus effect for pets who "like" it).
   ========================================================== */

const ITEMS = {
  apple:     { icon:'🍎', labelKey:'item_apple',     hunger:22, happy:0,  health:0,  energy:0,  price:8,  category:'food' },
  berry:     { icon:'🍓', labelKey:'item_berry',      hunger:10, happy:6,  health:2,  energy:0,  price:6,  category:'food' },
  fish:      { icon:'🐟', labelKey:'item_fish',       hunger:26, happy:2,  health:4,  energy:0,  price:14, category:'food', affinity:['cat'] },
  meat:      { icon:'🍗', labelKey:'item_meat',       hunger:32, happy:2,  health:2,  energy:0,  price:16, category:'food', affinity:['dog','dragon'] },
  seed:      { icon:'🌾', labelKey:'item_seed',       hunger:14, happy:4,  health:0,  energy:0,  price:5,  category:'food', affinity:['bird','hamster'] },
  nectar:    { icon:'🍯', labelKey:'item_nectar',     hunger:18, happy:10, health:0,  energy:4,  price:12, category:'food', affinity:['glider'] },
  egg_food:  { icon:'🥚', labelKey:'item_egg_food',   hunger:20, happy:0,  health:6,  energy:0,  price:10, category:'food', affinity:['snake'] },
  treat:     { icon:'🍬', labelKey:'item_treat',      hunger:8,  happy:18, health:0,  energy:0,  price:10, category:'food' },
  cake:      { icon:'🍰', labelKey:'item_cake',       hunger:20, happy:24, health:-2, energy:0,  price:22, category:'food' },
  medicine:  { icon:'💊', labelKey:'item_medicine',   hunger:0,  happy:0,  health:40, energy:0,  price:18, category:'care' },
  vitamin:   { icon:'🧪', labelKey:'item_vitamin',    hunger:0,  happy:2,  health:16, energy:8,  price:14, category:'care' },
  toy:       { icon:'🧸', labelKey:'item_toy',        hunger:0,  happy:22, health:0,  energy:-6, price:15, category:'toy' },
  ball:      { icon:'⚽', labelKey:'item_ball',       hunger:0,  happy:16, health:0,  energy:-8, price:9,  category:'toy' },
};

const STARTING_INVENTORY = { apple:2, treat:1, medicine:1, berry:1, seed:1 };

function itemLabel(key){
  return t(ITEMS[key].labelKey);
}
