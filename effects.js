

"use strict";

const ENERGY_ICONS = globalThis.ENERGY_ICONS || Object.freeze({
  fire: 'https://archives.bulbagarden.net/media/upload/thumb/a/ad/Fire-attack.png/20px-Fire-attack.png',
  water: 'https://archives.bulbagarden.net/media/upload/thumb/1/11/Water-attack.png/20px-Water-attack.png',
  grass: 'https://archives.bulbagarden.net/media/upload/thumb/2/2e/Grass-attack.png/20px-Grass-attack.png',
  lightning: 'https://archives.bulbagarden.net/media/upload/thumb/0/04/Lightning-attack.png/20px-Lightning-attack.png',
  psychic: 'https://archives.bulbagarden.net/media/upload/thumb/e/ef/Psychic-attack.png/20px-Psychic-attack.png',
  fighting: 'https://archives.bulbagarden.net/media/upload/thumb/4/48/Fighting-attack.png/20px-Fighting-attack.png',
  darkness: 'https://archives.bulbagarden.net/media/upload/thumb/a/ab/Darkness-attack.png/20px-Darkness-attack.png',
  metal: 'https://archives.bulbagarden.net/media/upload/thumb/6/64/Metal-attack.png/20px-Metal-attack.png',
  colorless: 'https://archives.bulbagarden.net/media/upload/thumb/1/1d/Colorless-attack.png/30px-Colorless-attack.png'
});

const STATUS_TYPES = globalThis.STATUS_TYPES || new Set(['poison', 'poisoned', 'paralysis', 'paralyzed', 'sleep', 'asleep', 'burn', 'burned', 'confusion', 'confused']);

const pkToPlayer = pk => pk === 'p1' ? 'player1' : 'player2';
const oppPk = globalThis.oppPk || (pk => pk === 'p1' ? 'p2' : 'p1');
const parseInt10 = globalThis.parseInt10 || ((v, def = 0) => parseInt(v, 10) || def);
const normStr = globalThis.normStr || (s => String(s || '').trim().toLowerCase().replace(/['']/g, "'").replace(/\s+/g, ' '));

function shuffleDeckAndAnimate(state, pk) {
  const deck = state[pk]?.deck || [];
  if (deck.length > 0) {
    shuffleArray(deck);

    const owner = pk === 'p1' ? 'player1' : 'player2';
    if (globalThis.animateDeckShuffle) {
      globalThis.animateDeckShuffle(owner);
    }
  }
}

async function animateCardDrawFromSearch(pk, card = null) {
  const owner = pk === 'p1' ? 'player1' : 'player2';
  if (globalThis.animateCardDraw) {
    const handDiv = owner === 'player1' ? 
      (globalThis.p1HandDiv || document.getElementById('p1Hand')) : 
      (globalThis.p2HandDiv || document.getElementById('p2Hand'));
    if (handDiv) {

      const currentHandSize = globalThis.playerState?.[owner]?.hand?.length || 0;
      await globalThis.animateCardDraw(owner, handDiv, card, currentHandSize, 1);
    }
  }
}

async function animateMultipleCardDraws(pk, count, cards = null) {
  const owner = pk === 'p1' ? 'player1' : 'player2';
  if (globalThis.animateCardDraw) {
    const handDiv = owner === 'player1' ? 
      (globalThis.p1HandDiv || document.getElementById('p1Hand')) : 
      (globalThis.p2HandDiv || document.getElementById('p2Hand'));
    if (handDiv) {

      const animationPromises = [];
      const currentHandSize = globalThis.playerState?.[owner]?.hand?.length || 0;
      for (let i = 0; i < count; i++) {
        const delay = i * 200;
        animationPromises.push(
          new Promise(resolve => {
            setTimeout(async () => {
              const card = cards && cards[i] ? cards[i] : null;
              await globalThis.animateCardDraw(owner, handDiv, card, currentHandSize + i, count);
              resolve();
            }, delay);
          })
        );
      }
      await Promise.all(animationPromises);
    }
  }
}

function shuffleArray(arr) {
  if (!arr?.length) return;
  for (let i = arr.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

const getActiveDiv = pk => globalThis.activeFor?.(pkToPlayer(pk)) ?? document?.getElementById(pk === 'p1' ? 'p1Active' : 'p2Active');
const getBenchDiv = pk => globalThis.benchFor?.(pkToPlayer(pk)) ?? document?.getElementById(pk === 'p1' ? 'p1Bench' : 'p2Bench');
const getActiveImg = pk => getActiveDiv(pk)?.querySelector('img') ?? null;
const getBenchImgs = pk => Array.from(getBenchDiv(pk)?.querySelectorAll('img') ?? []);
const getAllPokemonImgs = pk => [getActiveImg(pk), ...getBenchImgs(pk)].filter(Boolean);

globalThis.getBenchImgs = getBenchImgs;
globalThis.getAllPokemonImgs = getAllPokemonImgs;

function getSlotFromImg(img) {
  return img?.closest('.card-slot') ?? null;
}

function getHpFromImg(img) {
  if (!img) return { base: 0, cur: 0 };
  

  const slot = img.closest('.card-slot');
  const modifiedMax = slot?.dataset.maxHp ? parseInt10(slot.dataset.maxHp) : null;
  
  const base = modifiedMax || parseInt10(img.dataset.hp);
  const cur = parseInt10(img.dataset.chp, base);
  return { base, cur };
}

function setHpOnImg(img, base, cur) {
  if (!img) return;
  
  const slot = getSlotFromImg(img);
  const hasModifiedMax = slot?.dataset.maxHp;
  

  if (!hasModifiedMax) {
    img.dataset.hp = base;
  }
  
  img.dataset.chp = cur;
  
  if (!slot) return;
  
  let hpDiv = slot.querySelector('.hp-overlay');
  if (!hpDiv) {
    hpDiv = document.createElement('div');
    hpDiv.className = 'hp-overlay';
    slot.appendChild(hpDiv);
  }
  

  const displayMax = hasModifiedMax ? parseInt(slot.dataset.maxHp, 10) : base;
  hpDiv.textContent = `${cur} / ${displayMax}`;
  

  if (hasModifiedMax) {
    hpDiv.style.background = 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)';
    hpDiv.style.fontWeight = '900';
  } else {
    hpDiv.style.background = 'rgba(0,0,0,.85)';
    hpDiv.style.fontWeight = '800';
  }
}

function healImg(img, amount) {
  if (!img || amount <= 0) return false;
  

  const allPokemon = typeof document !== 'undefined' ? 
    [...document.querySelectorAll('.card-img')] : [];
  
  for (const pokemon of allPokemon) {
    const cacheKey = `${pokemon.dataset.set}-${pokemon.dataset.num}`;
    const abilityRow = globalThis.abilityCache?.[cacheKey];
    
    if (abilityRow?.effect_type === 'prevent_all_healing') {
      if (typeof showPopup === 'function') {
        showPopup(`Heal Block: ${pokemon.alt} prevents all healing!`);
      }
      return false;
    }
  }
  
  const { base, cur } = getHpFromImg(img);
  if (cur >= base) return false;
  setHpOnImg(img, base, Math.min(base, cur + amount));
  return true;
}

function damageImg(img, amount, attackerImg = null) {
  if (!img || amount <= 0) return { knocked: false };
  

  if (attackerImg) {
    const defenderName = (img.alt || '').toLowerCase();
    const attackerName = (attackerImg.alt || '').toLowerCase();
    const isAttackerEx = attackerName.includes(' ex');
    const isDefenderOricorio = defenderName.includes('oricorio');
    
    if (isDefenderOricorio && isAttackerEx) {
      showPopup(`Safeguard: ${img.alt} takes no damage from ${attackerImg.alt}!`);
      return { knocked: false };
    }
  }
  
  const { base, cur } = getHpFromImg(img);
  const newHp = Math.max(0, cur - amount);
  setHpOnImg(img, base, newHp);
  return { knocked: newHp <= 0 };
}

function getEnergyBox(slot, create = false) {
  if (!slot) return null;
  let box = slot.querySelector('.energy-pips');
  if (!box && create) {
    box = document.createElement('div');
    box.className = 'energy-pips';
    slot.appendChild(box);
  }
  return box;
}

function attachEnergy(img, type) {
  const slot = getSlotFromImg(img);
  const box = getEnergyBox(slot, true);
  if (!box) return;
  
  const k = (type || 'colorless').toLowerCase();
  const pip = document.createElement('div');
  pip.className = 'energy-pip';
  pip.dataset.type = k;
  pip.style.backgroundImage = `url('${ENERGY_ICONS[k] || ENERGY_ICONS.colorless}')`;
  box.appendChild(pip);
  

  if (typeof globalThis.triggerElectromagneticWall === 'function') {
    globalThis.triggerElectromagneticWall(img);
  }
}

async function removeEnergy(img, type, count) {
  const slot = getSlotFromImg(img);
  if (!slot || count <= 0) return 0;
  

  const owner = img.closest('#player1') ? 'player1' : 'player2';
  
  const pips = Array.from(slot.querySelectorAll('.energy-pip'));
  const target = type?.toLowerCase() ?? null;
  let removed = 0;
  

  const energyTypesRemoved = {};
  
  for (const pip of pips) {
    if (removed >= count) break;

    const pipType = (pip.dataset.type || 'colorless').toLowerCase();
    if (!target || pipType === target) {
      energyTypesRemoved[pipType] = (energyTypesRemoved[pipType] || 0) + 1;
      pip.remove();
      removed++;
    }
  }
  

  if (removed > 0) {
    // Update local playerState if it exists
    if (typeof globalThis.playerState !== 'undefined' && globalThis.playerState[owner]) {
      if (!globalThis.playerState[owner].discard) {
        globalThis.playerState[owner].discard = { cards: [], energyCounts: {} };
      }
    if (!globalThis.playerState[owner].discard.energyCounts) {
      globalThis.playerState[owner].discard.energyCounts = {};
    }
    
    for (const [energyType, amount] of Object.entries(energyTypesRemoved)) {
      const current = globalThis.playerState[owner].discard.energyCounts[energyType] || 0;
      globalThis.playerState[owner].discard.energyCounts[energyType] = current + amount;
    }
    }
    
    // Also update playerState if it exists (for consistency)
    if (typeof playerState !== 'undefined' && playerState && playerState[owner]) {
      if (!playerState[owner].discard) {
        playerState[owner].discard = { cards: [], energyCounts: {} };
      }
      if (!playerState[owner].discard.energyCounts) {
        playerState[owner].discard.energyCounts = {};
      }
      
      for (const [energyType, amount] of Object.entries(energyTypesRemoved)) {
        const current = playerState[owner].discard.energyCounts[energyType] || 0;
        playerState[owner].discard.energyCounts[energyType] = current + amount;
      }
    }

    // Sync to Firebase if in online mode
    if (typeof globalThis.updateGameStatePartial === 'function') {
      const getCurrentMatchIdFn = globalThis.getCurrentMatchId;
      const matchId = getCurrentMatchIdFn ? getCurrentMatchIdFn() : null;
      const isOnline = matchId && window.firebaseDatabase;
      if (isOnline && globalThis.playerState?.[owner]?.discard) {
        const isCurrentPlayer1Fn = globalThis.isCurrentPlayer1;
        const isP1 = (isCurrentPlayer1Fn && typeof isCurrentPlayer1Fn === 'function') ? isCurrentPlayer1Fn() : false;
        const matchPlayer = (isP1 && owner === 'player1') || (!isP1 && owner === 'player2') 
          ? 'player1' 
          : 'player2';
        try {
          await globalThis.updateGameStatePartial({
            [`${matchPlayer}/discard`]: globalThis.playerState[owner].discard
          });
        } catch (error) {
          console.error('[removeEnergy] Error syncing energy discard to Firebase:', error);
        }
      }
    }

    // Update discard UI
    if (typeof globalThis.renderDiscard === 'function') {
      const drawer = owner === 'player1' ? 
        (globalThis.p1DiscardDrawer || document.getElementById('p1DiscardDrawer')) :
        (globalThis.p2DiscardDrawer || document.getElementById('p2DiscardDrawer'));
      if (drawer) {
        globalThis.renderDiscard(owner);
      }
    }
    
    // Update discard bubbles
    if (typeof globalThis.updateDiscardBubbles === 'function') {
      globalThis.updateDiscardBubbles();
    }
  }
  
  return removed;
}

function countEnergy(img, type = null) {
  const slot = getSlotFromImg(img);
  if (!slot) return 0;
  const pips = slot.querySelectorAll('.energy-pip');
  

  if (!type) {
    let total = 0;
    for (const pip of pips) {
      const pipType = pip.dataset.type;
      total += getEnergyValue(img, pipType);
    }
    return total;
  }
  

  const t = type.toLowerCase();
  let count = 0;
  for (const pip of pips) {
    if (pip.dataset.type === t) {
      count += getEnergyValue(img, t);
    }
  }
  return count;
}

async function countEnergyAsync(img, type = null) {
  const slot = getSlotFromImg(img);
  if (!slot) return 0;
  const pips = slot.querySelectorAll('.energy-pip');
  

  if (!img.dataset.pokemonTypes && img.dataset.set && img.dataset.num) {
    try {
      const meta = await globalThis.fetchCardMeta(img.dataset.set, img.dataset.num);
      if (meta.types) {
        img.dataset.pokemonTypes = meta.types.map(t => t.toLowerCase()).join(',');
      }
    } catch (e) {
      console.error('[countEnergyAsync] Failed to fetch meta:', e);
    }
  }
  

  if (!type) {
    let total = 0;
    for (const pip of pips) {
      const pipType = pip.dataset.type;
      total += getEnergyValue(img, pipType);
    }
    return total;
  }
  

  const t = type.toLowerCase();
  let count = 0;
  for (const pip of pips) {
    if (pip.dataset.type === t) {
      count += getEnergyValue(img, t);
    }
  }
  return count;
}

function getEnergyValue(img, energyType) {
  if (!img || !energyType) return 1;
  

  const p1Active = getActiveImg('p1');
  const p1Bench = getBenchImgs('p1');
  const p2Active = getActiveImg('p2');
  const p2Bench = getBenchImgs('p2');
  
  let owner = null;
  if (img === p1Active || p1Bench.includes(img)) owner = 'p1';
  else if (img === p2Active || p2Bench.includes(img)) owner = 'p2';
  
  if (!owner) return 1;
  

  let hasSerperior = false;
  const allMyPokemon = owner === 'p1' ? [p1Active, ...p1Bench] : [p2Active, ...p2Bench];
  
  for (const pokemon of allMyPokemon) {
    if (pokemon && pokemon.alt && pokemon.alt.toLowerCase().includes('serperior')) {
      hasSerperior = true;
      break;
    }
  }
  

  if (hasSerperior && energyType.toLowerCase() === 'grass') {

    if (img.dataset.pokemonTypes) {
      const types = img.dataset.pokemonTypes.toLowerCase().split(',');
      if (types.includes('grass')) {
        return 2;
      }
    }
  }
  

  const multiplier = globalThis.state?.energyMultiplier?.[owner];
  
  if (multiplier && multiplier.type === energyType.toLowerCase()) {

    if (img.dataset.pokemonTypes) {
      const types = img.dataset.pokemonTypes.toLowerCase().split(',');
      if (types.includes(multiplier.restriction)) {
        return multiplier.multiplier;
      }
    }
  }
  
  return 1;
}

function moveEnergy(from, to, type) {
  const fromSlot = getSlotFromImg(from);
  const toBox = getEnergyBox(getSlotFromImg(to), true);
  if (!fromSlot || !toBox) return 0;
  
  const t = (type || 'colorless').toLowerCase();
  let moved = 0;
  
  for (const pip of fromSlot.querySelectorAll('.energy-pip')) {
    if (pip.dataset.type === t) {
      toBox.appendChild(pip);
      moved++;
    }
  }
  return moved;
}

function hasArceusInPlay(pk) {
  const allPokemon = getAllPokemonImgs(pk);
  const hasArceus = allPokemon.some(img => {
    const name = (img.alt || '').toLowerCase();
    return name.includes('arceus');
  });
  
  
  return hasArceus;
}

let isSelectionActive = false;

function awaitSelection(candidates, glowClass = 'heal-glow') {
  return new Promise((resolve, reject) => {
    // [SELECTION-FIX] In online mode, only allow selection if it's the current user's turn
    // Exception: Sabrina (shuffle_opponent_hand) - opponent should be able to select
    const getCurrentMatchIdFn = globalThis.getCurrentMatchId;
    const matchId = getCurrentMatchIdFn ? getCurrentMatchIdFn() : null;
    const isOnline = matchId && (typeof window !== 'undefined' && window.firebaseDatabase);
    const isSabrinaSelection = globalThis.__silverSelectionActive; // Sabrina uses this flag
    if (isOnline && !isSabrinaSelection) {
      // [SELECTION-FIX] Use isCurrentPlayer1() to check if it's the current player's turn
      // This is more reliable than checking currentPlayer string
      const isCurrentPlayer1Fn = globalThis.isCurrentPlayer1;
      const isMyTurn = (isCurrentPlayer1Fn && typeof isCurrentPlayer1Fn === 'function') ? isCurrentPlayer1Fn() : false;
      
      if (!isMyTurn) {
        console.log('[SELECTION-FIX] Blocking selection - not current player\'s turn', {
          isMyTurn,
          currentPlayer: globalThis.currentPlayer
        });
        isSelectionActive = false;
        globalThis.__selectionActive = false;
        resolve(null);
        return;
      }
    }

    isSelectionActive = true;
    globalThis.__selectionActive = true;
    

    const allowHandCards = globalThis.__silverSelectionActive || globalThis.__darknessClawSelectionActive;
    

    const validCandidates = candidates.filter(img => {

      const inHand = img.closest('.hand');
      if (inHand && !allowHandCards) {
        return false;
      }

      if (inHand && allowHandCards) {
        return true;
      }

      const inActive = img.closest('.active');
      const inBench = img.closest('.bench');
      if (!inActive && !inBench) {
        return false;
      }
      return true;
    });
    
    if (validCandidates.length === 0) {
      isSelectionActive = false;
      globalThis.__selectionActive = false;
      resolve(null);
      return;
    }
    
    validCandidates.forEach(img => img.classList.add(glowClass));
    
    const cleanup = () => {
      document.removeEventListener('click', clickHandler, true);
      document.removeEventListener('keydown', escapeHandler);
      validCandidates.forEach(c => c.classList.remove(glowClass));
      isSelectionActive = false;
      globalThis.__selectionActive = false;
    };
    
    const clickHandler = e => {

      const clickedInHand = e.target.closest('.hand');
      if (clickedInHand && !allowHandCards) {
        e.stopPropagation();
        e.preventDefault();
        showPopup('Cannot select cards in hand. Please select a Pokémon in play.');
        return;
      }
      
      const img = e.target.closest('img');
      if (!img) {

        e.stopPropagation();
        e.preventDefault();
        cleanup();
        resolve(null);
        return;
      }
      

      if (!img.classList.contains(glowClass)) {

        e.stopPropagation();
        e.preventDefault();
        showPopup('Please select a highlighted Pokémon. Try again.');
        return;
      }
      

      if (!validCandidates.includes(img)) {

        e.stopPropagation();
        e.preventDefault();
        cleanup();
        resolve(null);
        return;
      }
      

      const inHand = img.closest('.hand');
      if (inHand) {
        e.stopPropagation();
        e.preventDefault();
        cleanup();
        resolve(null);
        return;
      }
      
      e.stopPropagation();
      e.preventDefault();
      cleanup();
      resolve(img);
    };
    
    const escapeHandler = e => {
      if (e.key === 'Escape') {
        e.preventDefault();
        cleanup();
        resolve(null);
      }
    };
    
    document.addEventListener('click', clickHandler, true);
    document.addEventListener('keydown', escapeHandler);
  });
}

function applyStatus(pk, status) {
  globalThis.setStatus?.(pk, status);
}

async function flipCoin(pk = null) {

  if (!pk) {

    if (typeof globalThis.currentPlayer !== 'undefined' && globalThis.currentPlayer) {
      pk = globalThis.currentPlayer === 'player1' ? 'p1' : 'p2';
    }
  }
  
  return globalThis.doCoinFlip?.(pk) ?? (Math.random() < 0.5 ? 'heads' : 'tails');
}

let moveEffectRows = null;
let moveEffectMap = null;
let abilityEffectRows = null;
let abilityEffectMap = null;

function parseCsv(text) {
  const rows = [];
  let field = '', row = [], inQuotes = false;
  
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') inQuotes = false;
      else field += c;
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ',') { row.push(field.trim()); field = ''; }
      else if (c === '\n' || c === '\r') {
        if (field || row.length) { row.push(field.trim()); rows.push(row); }
        field = ''; row = [];
        if (c === '\r' && text[i + 1] === '\n') i++;
      }
      else field += c;
    }
  }
  if (field || row.length) { row.push(field.trim()); rows.push(row); }
  
  const [header, ...body] = rows;
  if (!header) return [];
  
  return body.map(r => Object.fromEntries(header.map((k, i) => [k, r[i] ?? ''])));
}

async function loadMoveEffects() {
  if (moveEffectRows) return;
  try {
    const text = await fetch('move_effects.csv').then(r => r.text());
    moveEffectRows = parseCsv(text);
    

    moveEffectMap = new Map();
    for (const row of moveEffectRows) {
      const key = `${normStr(row.pokemonName)}|${normStr(row.attackName)}`;
      moveEffectMap.set(key, row);
    }
  } catch (e) {
    console.error('[move-effects] load failed:', e);
    moveEffectRows = [];
    moveEffectMap = new Map();
  }
}

async function loadAbilityEffects() {
  if (abilityEffectRows) return abilityEffectRows;
  try {
    const text = await fetch('ability_effects.csv').then(r => r.text());
    abilityEffectRows = parseCsv(text.replace(/^\uFEFF/, ''));
    

    abilityEffectMap = new Map();
    for (const row of abilityEffectRows) {

      const paddedNum = String(row.number).padStart(3, '0');
      const key = `${(row.set || '').toUpperCase()}-${paddedNum}`;
      abilityEffectMap.set(key, row);
      

      const nameKey = `${key}-${normStr(row.abilityName)}`;
      abilityEffectMap.set(nameKey, row);
    }
    

    globalThis.ABILITY_EFFECT_ROWS = abilityEffectRows;
    window.ABILITY_EFFECT_ROWS = abilityEffectRows;
    
    return abilityEffectRows;
  } catch (e) {
    console.error('[ability-effects] load failed:', e);
    abilityEffectRows = [];
    abilityEffectMap = new Map();
    globalThis.ABILITY_EFFECT_ROWS = [];
    window.ABILITY_EFFECT_ROWS = [];
    return [];
  }
}

function getMoveRow(pokeName, attackName) {
  if (!moveEffectMap) return null;
  return moveEffectMap.get(`${normStr(pokeName)}|${normStr(attackName)}`) ?? null;
}

function getAbilityRow(set, num, abilityName = null) {
  if (!abilityEffectMap || abilityEffectMap.size === 0) return null;
  

  const normalizedSet = String(set || '').toUpperCase();
  const normalizedNum = String(num || '').padStart(3, '0');
  const key = `${normalizedSet}-${normalizedNum}`;
  

  if (abilityName) {
    const nameKey = `${key}-${normStr(abilityName)}`;
    const exact = abilityEffectMap.get(nameKey);
    if (exact) return exact;
  }
  

  return abilityEffectMap.get(key) ?? null;
}

const TRAINER_EFFECTS = {
  heal: async (state, pk, { param1 }) => {
    const amount = parseInt10(param1);
    if (amount && healImg(getActiveImg(pk), amount)) {
      showPopup(`Healed ${amount} damage from your Active Pokémon.`);
    } else {
      showPopup('No damage to heal.');
    }
  },

  heal_type: async (state, pk, { param1, param2 }) => {
    const amount = parseInt10(param1);
    const type = (param2 || 'grass').toLowerCase();
    

    const targets = [];
    for (const img of getAllPokemonImgs(pk)) {
      try {
        const meta = await globalThis.fetchCardMeta(img.dataset.set, img.dataset.num);
        if (meta.types?.some(t => t.toLowerCase() === type)) {

          const slot = img.closest('.card-slot');
          const modifiedMaxHp = slot?.dataset.maxHp ? parseInt10(slot.dataset.maxHp) : null;
          const maxHp = modifiedMaxHp || parseInt10(img.dataset.hp);
          const curHp = parseInt10(img.dataset.chp, maxHp);
          
          if (curHp < maxHp) targets.push(img);
        }
      } catch {}
    }
    
    if (!targets.length) {
      throw new Error('No valid target');
    }
    
    showPopup(`Choose a ${type}-type Pokémon to heal ${amount} damage.`);
    const chosen = await awaitSelection(targets);
    
    if (!chosen) {
      throw new Error('SELECTION_CANCELLED');
    }
    
    if (chosen && healImg(chosen, amount)) {
      showPopup(`Healed ${amount} damage from ${chosen.alt}.`);
      globalThis.addLog?.(pk, `used Erika on ${chosen.alt}`, chosen.src, { name: chosen.alt });
    }
  },

  flip_attach_energy: async (state, pk, { param1 }) => {
    const type = param1 || 'water';
    const imgs = getAllPokemonImgs(pk);
    const targets = [];
    
    for (const img of imgs) {
      try {
        const meta = await globalThis.fetchCardMeta(img.dataset.set, img.dataset.num);
        if (meta.types?.some(t => t.toLowerCase() === type)) targets.push(img);
      } catch {}
    }
    
    if (!targets.length) { throw new Error('No valid target'); }
    
    showPopup(`Click a ${type} Pokémon to power up.`);
    const chosen = await awaitSelection(targets);
    if (!chosen) return;
    
    let heads = 0;
    while ((await flipCoin(pk)) === 'heads') {
      heads++;
      attachEnergy(chosen, type);
    }
    
    showPopup(heads ? `${chosen.alt} gained ${heads} ${type} Energy!` : 'First flip was tails.');
    globalThis.addLog?.(pk, `used Misty: ${heads} heads`, chosen.src, { name: chosen.alt });
  },

  boost_damage_type_targets: async (state, pk, { param1, param2 }) => {
    const amount = parseInt10(param1);
    const names = param2?.split(',').map(s => s.trim().toLowerCase()).filter(Boolean) ?? [];
    if (!amount || !names.length) return;
    
    globalThis.__trainerBoostByName ??= {};
    names.forEach(n => globalThis.__trainerBoostByName[n] = (globalThis.__trainerBoostByName[n] || 0) + amount);
    showPopup(`Attacks by ${names.join(', ')} get +${amount} damage this turn.`);
  },

  boost_all_damage: async (state, pk, { param1 }) => {
    const amount = parseInt10(param1);
    if (!amount) return;
    state.temp ??= {};
    state.temp[pk] ??= {};
    state.temp[pk].globalDamageBoost = (state.temp[pk].globalDamageBoost || 0) + amount;
    showPopup(`Giovanni: All your Pokémon do +${amount} damage this turn.`);
  },

  return_active_to_hand: async (state, pk, { param2 }) => {
    const allowed = param2?.split(',').map(s => s.trim().toLowerCase()).filter(Boolean) ?? [];
    const activeImg = getActiveImg(pk);
    if (!activeImg) { throw new Error('No valid target'); }
    
    const name = (activeImg.alt || '').toLowerCase();
    if (allowed.length && !allowed.includes(name)) { showPopup('Invalid target.'); return; }
    
    state[pk].hand.push({
      name: activeImg.alt,
      set: activeImg.dataset.set,
      number: activeImg.dataset.num,
      image: activeImg.src
    });
    
    const slot = getSlotFromImg(activeImg);
    if (slot) {
      slot.innerHTML = '<span class="slot-label">Empty</span>';
      slot.dataset.empty = '1';
    }
    
    showPopup('Returned Active to hand.');
    globalThis.beginPromotionFlow?.(pkToPlayer(pk));
  },

  attach_energy_to_targets: async (state, pk, { param1, param2 }) => {
    const count = parseInt10(param1);
    const names = param2?.split(',').map(s => s.trim().toLowerCase()).filter(Boolean) ?? [];
    const target = getAllPokemonImgs(pk).find(img => names.includes((img.alt || '').toLowerCase()));
    
    if (!target) { throw new Error('No valid target'); }
    for (let i = 0; i < count; i++) attachEnergy(target, 'fighting');
    showPopup(`Attached ${count} Fighting Energy to ${target.alt}.`);
  },

  force_opponent_switch: async (state, pk) => {
    globalThis.promoteFromBench?.(state, oppPk(pk), true);
    showPopup('Opponent must switch.');
  },

  move_all_energy_type: async (state, pk, { param1, param2 }) => {
    const type = param1?.toLowerCase() || 'lightning';
    const names = param2?.split(',').map(s => s.trim().toLowerCase()).filter(Boolean) ?? [];
    const active = getActiveImg(pk);
    
    if (!active || !names.includes((active.alt || '').toLowerCase())) {
      showPopup('Invalid target.'); return;
    }
    
    let total = 0;
    for (const bench of getBenchImgs(pk)) total += moveEnergy(bench, active, type);
    showPopup(total ? `Moved ${total} ${type} Energy to ${active.alt}.` : 'No energy to move.');
  },

  draw_cards: async (state, pk, { param1 }) => {
    const n = parseInt10(param1);
    if (n && globalThis.drawCards) {
      await globalThis.drawCards(state, pk, n);
      // Update state object after drawCards to ensure applyTrainerEffect can sync it
      const owner = pk === 'p1' ? 'player1' : 'player2';
      if (globalThis.playerState && globalThis.playerState[owner]) {
        state[pk].deck = [...(globalThis.playerState[owner].deck || [])];
        state[pk].hand = [...(globalThis.playerState[owner].hand || [])];
      }
      showPopup(`Drew ${n} card(s).`);
    }
  },

  reduce_retreat_cost: async (state, pk, { param1 }) => {
    globalThis.setTempRetreatFor?.(pk, parseInt10(param1, 1), 'reduce');
    showPopup('Retreat cost reduced this turn.');
  },

  reveal_opponent_hand: async (state, pk) => {
    const hand = state[oppPk(pk)].hand ?? [];
    showPopup(hand.length ? `Opponent's hand: ${hand.map(c => c.name).join(', ')}` : "Opponent's hand is empty.");
  },

  view_top_deck: async (state, pk, { param1 }) => {

    const deck = state[pk].deck ?? [];
    if (!deck.length) {
      showPopup('Deck is empty.');
      return;
    }
    

    let fightingCount = 0;
    try {
      const allPokemon = getAllPokemonImgs(pk);
      for (const img of allPokemon) {
        if (!img) continue;
        try {
          const meta = await globalThis.fetchCardMeta?.(img.dataset.set, img.dataset.num);
          if (meta?.types) {
            const types = meta.types.map(t => String(t || '').toLowerCase());
            if (types.includes('fighting') || types.includes('fight')) {
              fightingCount++;
            }
          }
        } catch (err) {
          console.error('[Hiker] Error checking Pokemon type:', err);
        }
      }
    } catch (err) {
      console.error('[Hiker] Error counting Fighting Pokemon:', err);
    }
    
    if (fightingCount === 0) {
      showPopup('You have no Fighting Pokémon in play.');
      return;
    }
    

    const n = Math.min(fightingCount, deck.length);
    const topCards = deck.slice(0, n);
    
    if (n === 0) {
      showPopup('Deck is empty.');
      return;
    }
    

    return new Promise((resolve) => {
      const backdrop = document.getElementById('hikerReorderBackdrop');
      const cardsContainer = document.getElementById('hikerReorderCards');
      const title = document.getElementById('hikerReorderTitle');
      const desc = document.getElementById('hikerReorderDesc');
      const doneBtn = document.getElementById('hikerReorderDone');
      
      if (!backdrop || !cardsContainer || !title || !desc || !doneBtn) {
        console.error('[Hiker] Modal elements not found');
        showPopup('Error: Could not open card reorder UI.');
        resolve();
        return;
      }
      

      cardsContainer.innerHTML = '';
      

      title.textContent = `Reorder Top ${n} Cards`;
      desc.textContent = `Drag cards to reorder them. The leftmost card will be on top of your deck.`;
      

      let reorderedCards = [...topCards];
      let draggedCard = null;
      let draggedIndex = -1;
      let dropIndex = -1;
      

      const renderCards = async () => {
        cardsContainer.innerHTML = '';
        
        for (let i = 0; i < reorderedCards.length; i++) {
          const card = reorderedCards[i];
          const cardDiv = document.createElement('div');
          cardDiv.draggable = true;
          cardDiv.dataset.index = i;
          cardDiv.dataset.cardId = `${card.set}-${card.number || card.num}`;
          cardDiv.style.cssText = `
            position: relative;
            width: calc(var(--card-w) * 1.5);
            height: calc(var(--card-h) * 1.5);
            cursor: grab;
            transition: transform 0.2s ease, box-shadow 0.2s ease, opacity 0.2s ease, border-color 0.2s ease;
            border-radius: 8px;
            overflow: hidden;
            border: 2px solid #6e4e9c;
            background: #1a1a2e;
            user-select: none;
          `;
          

          if (!document.getElementById('hiker-drag-styles')) {
            const style = document.createElement('style');
            style.id = 'hiker-drag-styles';
            style.textContent = `
              .hiker-drag-over {
                border-color: #9d7dd4 !important;
                box-shadow: 0 0 16px rgba(157, 125, 212, 0.6) !important;
                transform: scale(1.05) !important;
              }
            `;
            document.head.appendChild(style);
          }
          

          let cardImageUrl = card.imgUrl || '';
          if (!cardImageUrl && card.set && (card.number || card.num)) {
            try {
              const meta = await globalThis.fetchCardMeta?.(card.set, card.number || card.num);
              if (meta?.image) {
                cardImageUrl = meta.image + '/high.png';
              }
            } catch (err) {
              console.error('[Hiker] Error fetching card image:', err);
            }
          }
          
          const img = document.createElement('img');
          img.src = cardImageUrl || 'imgs/cardback.png';
          img.style.cssText = `
            width: 100%;
            height: 100%;
            object-fit: contain;
            display: block;
            pointer-events: none;
          `;
          img.alt = card.name || 'Card';
          img.draggable = false;
          

          const posLabel = document.createElement('div');
          posLabel.textContent = `${i + 1}`;
          posLabel.style.cssText = `
            position: absolute;
            top: 4px;
            left: 4px;
            background: rgba(110, 78, 156, 0.9);
            color: white;
            width: 24px;
            height: 24px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            font-size: 12px;
            z-index: 10;
            pointer-events: none;
          `;
          
          cardDiv.appendChild(img);
          cardDiv.appendChild(posLabel);
          

          cardDiv.addEventListener('dragstart', (e) => {
            draggedCard = card;
            draggedIndex = i;
            cardDiv.style.opacity = '0.5';
            cardDiv.style.cursor = 'grabbing';
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/html', cardDiv.outerHTML);

            const dragImg = cardDiv.cloneNode(true);
            dragImg.style.cssText = `
              position: fixed;
              width: calc(var(--card-w) * 1.5);
              height: calc(var(--card-h) * 1.5);
              pointer-events: none;
              z-index: 10000;
              opacity: 0.9;
            `;
            document.body.appendChild(dragImg);
            e.dataTransfer.setDragImage(dragImg, dragImg.offsetWidth / 2, dragImg.offsetHeight / 2);
            setTimeout(() => document.body.removeChild(dragImg), 0);
          });
          

          cardDiv.addEventListener('dragend', (e) => {
            cardDiv.style.opacity = '1';
            cardDiv.style.cursor = 'grab';

            document.querySelectorAll('.hiker-drop-indicator').forEach(el => el.remove());
            document.querySelectorAll('.hiker-drag-over').forEach(el => {
              el.classList.remove('hiker-drag-over');
            });
            draggedCard = null;
            draggedIndex = -1;
            dropIndex = -1;
          });
          

          cardDiv.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            
            const targetIndex = parseInt(cardDiv.dataset.index, 10);
            if (targetIndex === draggedIndex) return;
            

            document.querySelectorAll('.hiker-drop-indicator').forEach(el => el.remove());
            

            const rect = cardDiv.getBoundingClientRect();
            const containerRect = cardsContainer.getBoundingClientRect();
            const mouseX = e.clientX;
            const cardCenterX = rect.left + rect.width / 2;
            
            const indicator = document.createElement('div');
            indicator.className = 'hiker-drop-indicator';
            indicator.style.cssText = `
              position: absolute;
              width: 4px;
              height: calc(var(--card-h) * 1.5);
              background: #6e4e9c;
              border-radius: 2px;
              z-index: 1000;
              pointer-events: none;
              box-shadow: 0 0 8px rgba(110, 78, 156, 0.8);
            `;
            
            if (mouseX < cardCenterX) {

              indicator.style.left = `${rect.left - containerRect.left - 2}px`;
              dropIndex = targetIndex;
            } else {

              indicator.style.left = `${rect.right - containerRect.left - 2}px`;
              dropIndex = targetIndex + 1;
            }
            
            indicator.style.top = `${rect.top - containerRect.top}px`;
            cardsContainer.appendChild(indicator);
            
            cardDiv.classList.add('hiker-drag-over');
          });
          

          cardDiv.addEventListener('dragleave', (e) => {

            if (!cardDiv.contains(e.relatedTarget)) {
              cardDiv.classList.remove('hiker-drag-over');
            }
          });
          

          cardDiv.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            const targetIndex = parseInt(cardDiv.dataset.index, 10);
            let insertIndex = dropIndex;
            

            if (insertIndex === -1) {
              const rect = cardDiv.getBoundingClientRect();
              const cardCenterX = rect.left + rect.width / 2;
              insertIndex = e.clientX < cardCenterX ? targetIndex : targetIndex + 1;
            }
            

            if (draggedIndex < insertIndex) {
              insertIndex--;
            }
            

            if (draggedIndex === insertIndex || (draggedIndex === targetIndex && insertIndex === targetIndex + 1 && draggedIndex === targetIndex)) {
              return;
            }
            

            reorderedCards.splice(draggedIndex, 1);

            reorderedCards.splice(insertIndex, 0, draggedCard);
            

            renderCards();
          });
          

          cardDiv.addEventListener('mouseenter', () => {
            if (!draggedCard) {
              cardDiv.style.transform = 'scale(1.05)';
              cardDiv.style.boxShadow = '0 8px 24px rgba(110, 78, 156, 0.6)';
            }
          });
          cardDiv.addEventListener('mouseleave', () => {
            if (!draggedCard) {
              cardDiv.style.transform = 'scale(1)';
              cardDiv.style.boxShadow = 'none';
            }
          });
          
          cardsContainer.appendChild(cardDiv);
        }
      };
      

      renderCards();
      

      backdrop.classList.add('show');
      

      const handleDone = () => {

        deck.splice(0, n);

        deck.unshift(...reorderedCards);
        

        backdrop.classList.remove('show');
        

        doneBtn.removeEventListener('click', handleDone);
        if (escapeHandler) {
          document.removeEventListener('keydown', escapeHandler);
        }
        
        showPopup(`Reordered ${n} cards on top of deck.`);
        resolve();
      };
      
      doneBtn.addEventListener('click', handleDone);
      

      const escapeHandler = (e) => {
        if (e.key === 'Escape') {
          handleDone();
        }
      };
      document.addEventListener('keydown', escapeHandler);
    });
  },

  search_basic_pokemon: async (state, pk) => {
    const deck = state[pk].deck ?? [];
    if (!deck.length) { showPopup('Deck is empty.'); return; }
    

    const metaPromises = deck.map(async (card) => {
      try {
        const meta = await globalThis.fetchCardMeta?.(card.set, card.number || card.num) || 
                     await fetch(`https://api.tcgdex.net/v2/en/sets/${card.set}/${card.number || card.num}`).then(r => r.json());
        return { card, meta };
      } catch {
        return { card, meta: null };
      }
    });
    
    const results = await Promise.all(metaPromises);
    for (const { card, meta } of results) {
      if (meta && meta.category === 'Pokemon' && meta.stage?.toLowerCase() === 'basic') {

          const deckIndex = deck.findIndex(c => c.set === card.set && (c.number || c.num) === (card.number || card.num));
          if (deckIndex !== -1) {
            deck.splice(deckIndex, 1);
          }
        

          state[pk].hand.push(card);
        

        shuffleDeckAndAnimate(state, pk);
        

        if (globalThis.renderAllHands) {
          globalThis.renderAllHands();
        }
        if (globalThis.updateDeckBubbles) {
          globalThis.updateDeckBubbles();
        }
        
          showPopup(`Found ${card.name}!`);
          if (globalThis.logEvent) {
            const owner = pk === 'p1' ? 'player1' : 'player2';
            globalThis.logEvent({
              player: owner,
              text: `Found ${card.name} from deck search`,
              cardSet: card.set,
              cardNum: card.number || card.num
            });
          }
          return;
        }
    }
    showPopup('No Basic Pokémon found.');
  },

  shuffle_opponent_hand_draw: async (state, pk, { param1 }) => {
    const opp = oppPk(pk);
    const oppOwner = opp === 'p1' ? 'player1' : 'player2';
    
    // Get opponent's hand and deck from globalThis.playerState
    const oppHand = [...(globalThis.playerState?.[oppOwner]?.hand || [])];
    const oppDeck = globalThis.playerState?.[oppOwner]?.deck || [];
    
    if (oppHand.length === 0) {
      showPopup('Opponent has no cards in hand.');
      return;
    }
    
    // Shuffle hand into deck
    oppDeck.push(...oppHand);
    shuffleArray(oppDeck);
    
    // Draw cards
    const n = parseInt10(param1);
    const drawnCards = [];
    for (let i = 0; i < n && oppDeck.length > 0; i++) {
      const card = oppDeck.shift();
      if (card) {
        drawnCards.push(card);
      }
    }
    
    // Update all state objects
    globalThis.playerState[oppOwner].hand = drawnCards;
    globalThis.playerState[oppOwner].deck = oppDeck;
    state[opp].hand = [...drawnCards];
    state[opp].deck = [...oppDeck];
    
    // Also update playerState if it exists separately
    if (typeof playerState !== 'undefined' && playerState && playerState[oppOwner]) {
      playerState[oppOwner].hand = [...drawnCards];
      playerState[oppOwner].deck = [...oppDeck];
    }
    
    // Sync to Firebase if in online mode
    if (typeof globalThis.updateGameStatePartial === 'function') {
      const getCurrentMatchIdFn = globalThis.getCurrentMatchId;
      const matchId = getCurrentMatchIdFn ? getCurrentMatchIdFn() : null;
      const isOnline = matchId && typeof window !== 'undefined' && window.firebaseDatabase;
      if (isOnline) {
        const isCurrentPlayer1Fn = globalThis.isCurrentPlayer1;
        const isP1 = (isCurrentPlayer1Fn && typeof isCurrentPlayer1Fn === 'function') ? isCurrentPlayer1Fn() : false;
        const matchPlayer = (isP1 && oppOwner === 'player1') || (!isP1 && oppOwner === 'player2') 
          ? 'player1' 
          : 'player2';
        try {
          await globalThis.updateGameStatePartial({
            [`${matchPlayer}/hand`]: drawnCards,
            [`${matchPlayer}/deck`]: oppDeck
          });
        } catch (error) {
          console.error('[shuffle_opponent_hand_draw] Error syncing to Firebase:', error);
        }
      }
    }
    
    if (globalThis.renderAllHands) globalThis.renderAllHands();
    if (globalThis.updateDeckBubbles) globalThis.updateDeckBubbles();
    
    showPopup(`Opponent shuffled hand and drew ${drawnCards.length}.`);
  },

  summon_fossil_pokemon: async (state, pk, { param1, param2 }) => {

    const hp = parseInt10(param1, 40);
    const evolvesInto = param2 || '';
    

    const trainerCard = state.trainerCard;
    if (!trainerCard) {
      showPopup('Error: No trainer card found');
      throw new Error('No trainer card found');
    }
    
    const fossilSet = trainerCard.dataset.set;
    const fossilNum = trainerCard.dataset.num;
    const fossilName = trainerCard.alt || 'Fossil';
    
    

    const owner = pkToPlayer(pk);
    const activeDiv = getActiveDiv(pk);
    const benchDiv = getBenchDiv(pk);
    
    const activeSlot = activeDiv?.querySelector('.card-slot');
    const benchSlots = Array.from(benchDiv?.querySelectorAll('.card-slot') ?? []);
    

    const hasActiveEmpty = activeSlot && !activeSlot.querySelector('img');
    const benchFree = benchSlots.filter(s => !s.querySelector('img'));
    
    if (!hasActiveEmpty && benchFree.length === 0) {
      showPopup('No space to play fossil!');
      throw new Error('No space to play fossil');
    }
    

    const fossilImg = document.createElement('img');
    fossilImg.className = 'card-img';
    fossilImg.src = trainerCard.src;
    fossilImg.alt = fossilName;
    fossilImg.dataset.set = fossilSet;
    fossilImg.dataset.num = fossilNum;
    fossilImg.dataset.hp = String(hp);
    fossilImg.dataset.chp = String(hp);
    fossilImg.dataset.playedTurn = String(globalThis.turnNumber || 0);
    fossilImg.dataset.isFossil = 'true';
    fossilImg.dataset.evolvesInto = evolvesInto;
    

    if (globalThis.assignInstanceId) {
      globalThis.assignInstanceId(fossilImg);
    }
    

    let targetSlot;
    if (hasActiveEmpty) {
      targetSlot = activeSlot;
    } else {

      targetSlot = benchFree[0];
    }
    

    targetSlot.appendChild(fossilImg);
    

    if (globalThis.setHpOnImage) {
      globalThis.setHpOnImage(fossilImg, hp, hp);
    }
    

    if (globalThis.markSlot) {
      globalThis.markSlot(targetSlot, true);
    }
    
    showPopup(`Played ${fossilName} as a 40 HP Pokemon`);
  },

  peek_topdeck_type: async (state, pk, { param1, param2 }) => {

    const targetType = (param1 || '').toLowerCase();
    
    
    showPopup(`Look at top deck card. If ${targetType}, add to hand. Otherwise, put on bottom.`);
    

    if (globalThis.peekTopDeck && globalThis.moveTopToBottom) {
      const topCard = globalThis.peekTopDeck(state, pk);
      if (topCard) {
        const isPsychic = topCard.types?.some(t => t.toLowerCase() === targetType);
        if (isPsychic) {
          showPopup(`Found ${topCard.name} - added to hand!`);
          globalThis.drawCards?.(state, pk, 1);
        } else {
          showPopup(`${topCard.name} is not ${targetType} - moved to bottom`);
          globalThis.moveTopToBottom?.(state, pk);
        }
      }
    }
  },

  reduce_all_incoming_damage_next_turn: async (state, pk, { param1 }) => {
    const reduction = parseInt10(param1, 10);
    
    if (!globalThis.state) globalThis.state = {};
    if (!globalThis.state.damageReduction) globalThis.state.damageReduction = {};
    
    globalThis.state.damageReduction[pk] = {
      amount: reduction,
      target: 'all',
      duration: 'next_turn'
    };
    
    showPopup(`All your Pokemon will take -${reduction} damage next turn`);
  },

  revive_opponent_pokemon: async (state, pk, { param1 }) => {

    const opp = oppPk(pk);
    
    showPopup('Revive opponent Basic Pokemon from discard pile (not fully implemented)');
    

    if (globalThis.getDiscardBasicPokemon && globalThis.addToBench) {
      const discardBasics = globalThis.getDiscardBasicPokemon(state, opp);
      
      if (discardBasics.length === 0) {
        showPopup('No Basic Pokemon in opponent\'s discard pile');
        return;
      }
      

      showPopup('Choose a Basic Pokemon to revive to opponent\'s bench');
      const chosen = await awaitSelection(discardBasics);
      
      if (chosen) {
        globalThis.addToBench(state, opp, chosen);
        globalThis.removeFromDiscard(state, opp, chosen);
        showPopup(`Revived ${chosen.name} to opponent's bench`);
      }
    }
  },

  increase_max_hp: async (state, pk, { param1 }) => {

    const amount = parseInt10(param1, 20);
    

    let chosen = globalThis.toolAttachTarget;
    
    if (!chosen) {

      const imgs = getAllPokemonImgs(pk);
      if (!imgs.length) { showPopup('No Pokemon in play.'); return; }
      
      showPopup(`Choose a Pokemon to attach Giant Cape (+${amount} HP)`);
      const selected = await awaitSelection(imgs);
      if (!selected) return;
      chosen = selected;
    }
    
    const slot = getSlotFromImg(chosen);
    if (!slot) return;
    

    const { base, cur } = getHpFromImg(chosen);
    const newMax = base + amount;
    

    globalThis.setMaxHp?.(chosen, newMax);
    
    showPopup(`${chosen.alt} max HP: ${base} → ${newMax}`);
  },

  counter_on_hit_tool: async (state, pk, { param1 }) => {

    const damage = parseInt10(param1, 20);
    

    const chosen = globalThis.toolAttachTarget;
    
    if (!chosen) {

      const imgs = getAllPokemonImgs(pk);
      if (!imgs.length) { showPopup('No Pokemon in play.'); return; }
      
      showPopup(`Choose a Pokemon to attach Rocky Helmet (${damage} counter damage)`);
      const selected = await awaitSelection(imgs);
      if (!selected) return;
      chosen = selected;
    }
    
    showPopup(`${chosen.alt} will counter ${damage} damage when hit!`);
  },

  cure_status_end_of_turn: async (state, pk) => {
    
    

    const chosen = globalThis.toolAttachTarget;
    
    if (!chosen) {

      const imgs = getAllPokemonImgs(pk);
      if (!imgs.length) { showPopup('No Pokemon in play.'); return; }
      
      showPopup('Choose a Pokemon to attach Lum Berry (cures status at turn end)');
      const selected = await awaitSelection(imgs);
      if (!selected) return;
      chosen = selected;
    }
    
    showPopup(`${chosen.alt} will be cured of status at turn end!`);
  },

  switch_card_in_hand_with_deck: async (state, pk) => {

    const hand = state[pk].hand ?? [];
    const deck = state[pk].deck ?? [];
    
    if (!deck.length) {
      showPopup('Deck is empty.');
      throw new Error('NO_TARGET');
    }
    

    const pokemonInHand = [];
    for (const card of hand) {

      if (card.name === 'Pokémon Communication' || card.name === 'Pokemon Communication') {
        continue;
      }
      
      try {
        const meta = await globalThis.fetchCardMeta(card.set, card.number || card.num);
        if (meta.category === 'Pokemon') {
          pokemonInHand.push(card);
        }
      } catch {}
    }
    
    if (!pokemonInHand.length) {
      showPopup('No Pokemon in hand.');
      throw new Error('NO_TARGET');
    }
    

    const pokemonInDeck = [];
    for (const card of deck) {
      try {
        const meta = await globalThis.fetchCardMeta(card.set, card.number || card.num);
        if (meta.category === 'Pokemon') {
          pokemonInDeck.push(card);
        }
      } catch {}
    }
    
    if (!pokemonInDeck.length) {
      showPopup('No Pokemon in deck.');
      throw new Error('NO_TARGET');
    }
    

    globalThis.__pokemonCommSelection = {
      pk,
      hand,
      deck,
      pokemonInHand,
      pokemonInDeck
    };
    
    
    showPopup('Choose a Pokemon from your hand to exchange.');
    

    globalThis.__pokemonCommActive = true;
    

    if (globalThis.renderAllHands) {
      globalThis.renderAllHands();
    }
    

    const selected = await new Promise((resolve) => {
      globalThis.__pokemonCommResolve = resolve;
    });
    
    if (!selected) {
      showPopup('Selection cancelled.');
      throw new Error('NO_TARGET');
    }
    

    const randomFromDeck = pokemonInDeck[Math.floor(Math.random() * pokemonInDeck.length)];
    

    const handIdx = hand.indexOf(selected);

    const deckIdx = deck.findIndex(c => c.set === randomFromDeck.set && (c.number || c.num) === (randomFromDeck.number || randomFromDeck.num));
    
    if (handIdx >= 0 && deckIdx >= 0) {
      hand[handIdx] = randomFromDeck;
      deck[deckIdx] = selected;
      
      showPopup(`Exchanged ${selected.name} for ${randomFromDeck.name}!`);
    } else {
      showPopup('Error: Could not complete exchange.');
    }
  },

  force_switch_damaged_bench: async (state, pk) => {

    const opp = oppPk(pk);
    const benchImgs = getBenchImgs(opp);
    
    const damagedBench = benchImgs.filter(img => {
      const { base, cur } = getHpFromImg(img);
      return cur < base;
    });
    
    if (!damagedBench.length) {
      throw new Error('No valid target');
    }
    
    showPopup('Choose a damaged bench Pokemon to switch in');
    const chosen = await awaitSelection(damagedBench);
    if (!chosen) return;
    

    const oppPlayer = pkToPlayer(opp);
    const activeDiv = globalThis.activeFor?.(oppPlayer);
    const activeSlot = activeDiv?.querySelector('.card-slot');
    const activeImg = activeSlot?.querySelector('img');
    const benchSlot = chosen.closest('.card-slot');
    
    if (!activeSlot || !benchSlot) {
      showPopup('Error: Could not find slots');
      return;
    }
    

    if (activeImg) {

      const activePack = globalThis.detachAttachments?.(activeSlot) || {};
      const benchPack = globalThis.detachAttachments?.(benchSlot) || {};
      
      activeSlot.removeChild(activeImg);
      benchSlot.removeChild(chosen);
      
      activeSlot.appendChild(chosen);
      benchSlot.appendChild(activeImg);
      
      globalThis.attachAttachments?.(activeSlot, benchPack);
      globalThis.attachAttachments?.(benchSlot, activePack);
      
      globalThis.markSlot?.(activeSlot, true);
      globalThis.markSlot?.(benchSlot, true);
    } else {

      benchSlot.removeChild(chosen);
      activeSlot.appendChild(chosen);
      const benchPack = globalThis.detachAttachments?.(benchSlot) || {};
      globalThis.attachAttachments?.(activeSlot, benchPack);
      globalThis.markSlot?.(activeSlot, true);
      globalThis.markSlot?.(benchSlot, false);
    }
    
    showPopup(`Forced ${chosen.alt} to active spot!`);
  },

  search_named_random: async (state, pk, { param2 }) => {

    const names = param2?.split(',').map(s => s.trim().toLowerCase()).filter(Boolean) ?? [];
    const deck = state[pk].deck ?? [];
    
    if (!deck.length) { showPopup('Deck is empty.'); return; }
    

    for (const card of deck) {
      const cardName = (card.name || '').toLowerCase();
      if (names.some(n => cardName.includes(n))) {

        const deckIndex = deck.findIndex(c => c.set === card.set && (c.number || c.num) === (card.number || card.num));
        if (deckIndex !== -1) {
          deck.splice(deckIndex, 1);
        }
        state[pk].hand.push(card);
        showPopup(`Found ${card.name}!`);
        return;
      }
    }
    
    showPopup(`No ${names.join('/')} found in deck.`);
  },

  attach_from_discard_to_targets: async (state, pk, { param1, param2 }) => {

    const parts = param1?.split('|') ?? [];
    const count = parseInt10(parts[0], 2);
    const energyType = (parts[1] || 'lightning').toLowerCase();
    const names = param2?.split(',').map(s => s.trim().toLowerCase()).filter(Boolean) ?? [];
    

    const target = getAllPokemonImgs(pk).find(img => 
      names.includes((img.alt || '').toLowerCase())
    );
    
    if (!target) {
      showPopup('No valid target Pokemon in play.');
      return;
    }
    

    const owner = pkToPlayer(pk);
    const discardEnergy = globalThis.playerState?.[owner]?.discard?.energyCounts?.[energyType] ?? 0;
    
    if (discardEnergy < count) {
      showPopup(`Not enough ${energyType} energy in discard (need ${count}, have ${discardEnergy}).`);
      return;
    }
    

    for (let i = 0; i < count; i++) {
      attachEnergy(target, energyType);
    }
    

    if (globalThis.playerState?.[owner]?.discard?.energyCounts) {
      globalThis.playerState[owner].discard.energyCounts[energyType] -= count;
    }
    
    showPopup(`Attached ${count} ${energyType} energy from discard to ${target.alt}!`);
  },

  move_energy_bench_to_active: async (state, pk) => {

    const active = getActiveImg(pk);
    const bench = getBenchImgs(pk);
    
    if (!active) { throw new Error('No valid target'); }
    

    const benchWithEnergy = bench.filter(img => {
      const slot = getSlotFromImg(img);
      const energyBox = slot?.querySelector('.energy-pips');
      return energyBox && energyBox.children.length > 0;
    });
    
    if (!benchWithEnergy.length) {
      throw new Error('No valid target');
    }
    
    showPopup('Choose a bench Pokemon to move energy from');
    const chosen = await awaitSelection(benchWithEnergy);
    if (!chosen) return;
    

    const slot = getSlotFromImg(chosen);
    const energyBox = slot?.querySelector('.energy-pips');
    const pips = energyBox?.querySelectorAll('.energy-pip:not(.phantom-pip)');
    
    if (!pips?.length) {
      showPopup('No energy to move.');
      return;
    }
    
    const firstPip = pips[0];
    const energyType = firstPip.dataset.type || 'colorless';
    

    firstPip.remove();
    

    attachEnergy(active, energyType);
    
    showPopup(`Moved 1 ${energyType} energy from ${chosen.alt} to ${active.alt}!`);
  },

  shuffle_hand_draw_points: async (state, pk) => {

    const opp = oppPk(pk);
    const oppPlayer = pkToPlayer(opp);
    const oppOwner = opp === 'p1' ? 'player1' : 'player2';
    const oppDeck = state[opp].deck ?? [];
    const oppHand = state[opp].hand ?? [];
    

    const oppPoints = globalThis.getPoints?.(oppPlayer) ?? 0;
    const pointsNeeded = Math.max(0, 3 - oppPoints);
    
    
    if (pointsNeeded === 0) {
      showPopup('Opponent already has 3 points - no cards drawn.');
      return;
    }
    

    // Get hand and deck from globalThis.playerState
    const myHand = [...(globalThis.playerState?.[oppOwner]?.hand || [])];
    const myDeck = globalThis.playerState?.[oppOwner]?.deck || [];
    
    // Shuffle hand into deck
    myDeck.push(...myHand);
    shuffleArray(myDeck);
    
    // Draw cards
    const drawnCards = [];
    for (let i = 0; i < pointsNeeded && myDeck.length > 0; i++) {
      const card = myDeck.shift();
      if (card) {
        drawnCards.push(card);
      }
    }
    
    // Update all state objects
    globalThis.playerState[oppOwner].hand = drawnCards;
    globalThis.playerState[oppOwner].deck = myDeck;
    state[opp].hand = [...drawnCards];
    state[opp].deck = [...myDeck];
    
    // Also update playerState if it exists separately
    if (typeof playerState !== 'undefined' && playerState && playerState[oppOwner]) {
      playerState[oppOwner].hand = [...drawnCards];
      playerState[oppOwner].deck = [...myDeck];
    }
    
    // Sync to Firebase if in online mode
    if (typeof globalThis.updateGameStatePartial === 'function') {
      const getCurrentMatchIdFn = globalThis.getCurrentMatchId;
      const matchId = getCurrentMatchIdFn ? getCurrentMatchIdFn() : null;
      const isOnline = matchId && typeof window !== 'undefined' && window.firebaseDatabase;
      if (isOnline) {
        const isCurrentPlayer1Fn = globalThis.isCurrentPlayer1;
        const isP1 = (isCurrentPlayer1Fn && typeof isCurrentPlayer1Fn === 'function') ? isCurrentPlayer1Fn() : false;
        const matchPlayer = (isP1 && oppOwner === 'player1') || (!isP1 && oppOwner === 'player2') 
          ? 'player1' 
          : 'player2';
        try {
          await globalThis.updateGameStatePartial({
            [`${matchPlayer}/hand`]: drawnCards,
            [`${matchPlayer}/deck`]: myDeck
          });
        } catch (error) {
          console.error('[shuffle_hand_draw_points] Error syncing to Firebase:', error);
        }
      }
    }
    
    if (globalThis.renderAllHands) globalThis.renderAllHands();
    if (globalThis.updateDeckBubbles) globalThis.updateDeckBubbles();
    
    showPopup(`Opponent shuffled hand and drew ${drawnCards.length} card(s)!`);
  },

  heal_all_with_type_energy: async (state, pk, { param1, param2 }) => {

    const amount = parseInt10(param1, 40);
    const energyType = (param2 || 'water').toLowerCase();
    
    const imgs = getAllPokemonImgs(pk);
    let healed = 0;
    
    for (const img of imgs) {
      const slot = getSlotFromImg(img);
      const energyBox = slot?.querySelector('.energy-pips');
      const pips = Array.from(energyBox?.querySelectorAll('.energy-pip:not(.phantom-pip)') ?? []);
      

      const hasType = pips.some(pip => (pip.dataset.type || '').toLowerCase() === energyType);
      
      if (hasType) {
        const { base, cur } = getHpFromImg(img);
        if (cur < base) {
          healImg(img, amount);
          healed++;
        }
      }
    }
    
    showPopup(healed ? `Healed ${amount} damage from ${healed} Pokemon with ${energyType} energy!` : `No damaged Pokemon with ${energyType} energy.`);
  },

  revive_basic_to_hand: async (state, pk) => {

    const owner = pkToPlayer(pk);
    const discard = globalThis.playerState?.[owner]?.discard?.cards ?? [];
    
    if (!discard.length) {
      showPopup('No cards in discard pile.');
      return;
    }
    

    const basics = [];
    for (const card of discard) {
      try {
        const meta = await globalThis.fetchCardMeta(card.set, card.number || card.num);
        if (meta.category === 'Pokemon' && meta.stage?.toLowerCase() === 'basic') {
          basics.push(card);
        }
      } catch {}
    }
    
    if (!basics.length) {
      showPopup('No Basic Pokemon in discard pile.');
      return;
    }
    

    const chosen = basics[Math.floor(Math.random() * basics.length)];
    

    const discardIdx = discard.indexOf(chosen);
    if (discardIdx >= 0) {
      discard.splice(discardIdx, 1);
      

      state[pk].hand.push(chosen);
      
      showPopup(`Retrieved ${chosen.name} from discard!`);
      

      const drawer = owner === 'player1' ? globalThis.p1DiscardDrawer : globalThis.p2DiscardDrawer;
      if (drawer?.classList.contains('show')) {
        globalThis.renderDiscard?.(owner);
      }
    }
  },

  reduce_attack_cost_targets: async (state, pk, { param1, param2 }) => {

    const reduction = parseInt10(param1, 2);
    const names = param2?.split(',').map(s => s.trim().toLowerCase()).filter(Boolean) ?? [];
    
    if (!names.length) {
      showPopup('No target names specified.');
      return;
    }
    

    if (!globalThis.attackCostReduction) globalThis.attackCostReduction = {};
    
    names.forEach(name => {
      globalThis.attackCostReduction[name] = (globalThis.attackCostReduction[name] || 0) + reduction;
    });
    
    showPopup(`Attacks by ${names.join(', ')} cost ${reduction} less {C} this turn!`);
  },

  reduce_type_incoming_damage_next_turn: async (state, pk, { param1, param2 }) => {

    const reduction = parseInt10(param1, 20);
    const type = (param2 || 'metal').toLowerCase();
    
    if (!globalThis.state) globalThis.state = {};
    if (!globalThis.state.typeProtection) globalThis.state.typeProtection = {};
    
    globalThis.state.typeProtection[pk] = {
      type: type,
      reduction: reduction,
      duration: 'next_turn'
    };
    
    showPopup(`All ${type} Pokemon take -${reduction} damage next turn!`);
  },

  shuffle_both_hands_draw_same: async (state, pk) => {

    const p1Hand = state.p1.hand ?? [];
    const p2Hand = state.p2.hand ?? [];
    const p1Deck = state.p1.deck ?? [];
    const p2Deck = state.p2.deck ?? [];
    
    const p1HandSize = p1Hand.length;
    const p2HandSize = p2Hand.length;
    

    p1Deck.push(...p1Hand);
    p1Hand.length = 0;
    shuffleArray(p1Deck);
    

    p2Deck.push(...p2Hand);
    p2Hand.length = 0;
    shuffleArray(p2Deck);
    

    globalThis.drawCards?.(state, 'p1', p1HandSize);
    globalThis.drawCards?.(state, 'p2', p2HandSize);
    
    showPopup(`Both players shuffled hands and drew ${p1HandSize}/${p2HandSize} cards!`);
  },

  heal_and_cure_status: async (state, pk, { param1 }) => {

    const amount = parseInt10(param1, 30);
    const imgs = getAllPokemonImgs(pk);
    
    if (!imgs.length) {
      showPopup('No Pokemon in play.');
      return;
    }
    
    showPopup(`Choose a Pokemon to heal ${amount} and cure status.`);
    const chosen = await awaitSelection(imgs);
    if (!chosen) return;
    

    healImg(chosen, amount);
    

    const hadStatus = chosen.dataset.status;
    if (hadStatus) {
      if (typeof globalThis.clearStatusOnImg === 'function') {
        globalThis.clearStatusOnImg(chosen);
      } else {

        delete chosen.dataset.status;
        const slot = getSlotFromImg(chosen);
        const icon = slot?.querySelector('.status-icon');
        if (icon) icon.remove();
      }
      
      showPopup(`${chosen.alt} healed ${amount} and cured ${hadStatus}!`);
    } else {
      showPopup(`${chosen.alt} healed ${amount}!`);
    }
  },

  boost_damage_vs_ex: async (state, pk, { param1 }) => {

    const bonus = parseInt10(param1, 20);
    
    state.temp ??= {};
    state.temp[pk] ??= {};
    state.temp[pk].damageVsEx = (state.temp[pk].damageVsEx || 0) + bonus;
    
    showPopup(`Your Pokemon do +${bonus} damage to opponent's Pokemon ex this turn!`);
  },

  flip_discard_energy_until_tails: async (state, pk) => {

    const opp = oppPk(pk);
    const activeImg = getActiveImg(opp);
    
    if (!activeImg) {
      showPopup('No opponent Active Pokemon.');
      return;
    }
    
    const slot = getSlotFromImg(activeImg);
    const energyBox = slot?.querySelector('.energy-pips');
    const pips = energyBox?.querySelectorAll('.energy-pip:not(.phantom-pip)');
    
    if (!pips?.length) {
      showPopup('Opponent has no energy to discard.');
      return;
    }
    
    let heads = 0;
    while ((await flipCoin(pk)) === 'heads') {
      heads++;
    }
    
    if (heads === 0) {
      showPopup('First flip was tails - no energy discarded.');
      return;
    }
    

    const pipsArray = Array.from(pips);
    const toDiscard = Math.min(heads, pipsArray.length);
    
    for (let i = 0; i < toDiscard; i++) {
      const randomIdx = Math.floor(Math.random() * pipsArray.length);
      const pip = pipsArray.splice(randomIdx, 1)[0];
      pip.remove();
    }
    
    showPopup(`${heads} heads! Discarded ${toDiscard} energy from ${activeImg.alt}!`);
  },

  shuffle_hand_draw: async (state, pk, { param1 }) => {
    const owner = pk === 'p1' ? 'player1' : 'player2';
    const n = parseInt10(param1, 7);
    
    // Get hand and deck from globalThis.playerState
    const myHand = [...(globalThis.playerState?.[owner]?.hand || [])];
    const myDeck = globalThis.playerState?.[owner]?.deck || [];
    
    if (myHand.length === 0) {
      showPopup('No cards in hand to discard.');
      return;
    }
    
    // Move hand to discard
    if (!globalThis.playerState[owner].discard) {
      globalThis.playerState[owner].discard = { cards: [], energyCounts: {} };
    }
    if (!globalThis.playerState[owner].discard.cards) {
      globalThis.playerState[owner].discard.cards = [];
    }
    
    // Add all hand cards to discard
    for (const card of myHand) {
      globalThis.playerState[owner].discard.cards.push({
        set: card.set,
        num: card.number || card.num,
        src: card.src || card.image || `https://assets.tcgdx.net/en/tcgp/${card.set}/${String(card.number || card.num).padStart(3, '0')}/high.png`
      });
    }
    
    // Shuffle hand into deck
    myDeck.push(...myHand);
    shuffleArray(myDeck);
    
    // Draw cards
    const drawnCards = [];
    for (let i = 0; i < n && myDeck.length > 0; i++) {
      const card = myDeck.shift();
      if (card) {
        drawnCards.push(card);
      }
    }
    
    // Update all state objects
    globalThis.playerState[owner].hand = drawnCards;
    globalThis.playerState[owner].deck = myDeck;
    state[pk].hand = [...drawnCards];
    state[pk].deck = [...myDeck];
    
    // Also update playerState if it exists separately
    if (typeof playerState !== 'undefined' && playerState && playerState[owner]) {
      playerState[owner].hand = [...drawnCards];
      playerState[owner].deck = [...myDeck];
      if (!playerState[owner].discard) {
        playerState[owner].discard = { cards: [], energyCounts: {} };
      }
      playerState[owner].discard.cards = [...globalThis.playerState[owner].discard.cards];
    }
    
    // Sync to Firebase if in online mode
    if (typeof globalThis.updateGameStatePartial === 'function') {
      const getCurrentMatchIdFn = globalThis.getCurrentMatchId;
      const matchId = getCurrentMatchIdFn ? getCurrentMatchIdFn() : null;
      const isOnline = matchId && window.firebaseDatabase;
      if (isOnline) {
        const isCurrentPlayer1Fn = globalThis.isCurrentPlayer1;
        const isP1 = (isCurrentPlayer1Fn && typeof isCurrentPlayer1Fn === 'function') ? isCurrentPlayer1Fn() : false;
        const matchPlayer = (isP1 && owner === 'player1') || (!isP1 && owner === 'player2') 
          ? 'player1' 
          : 'player2';
        try {
          await globalThis.updateGameStatePartial({
            [`${matchPlayer}/hand`]: drawnCards,
            [`${matchPlayer}/deck`]: myDeck,
            [`${matchPlayer}/discard`]: globalThis.playerState[owner].discard
          });
        } catch (error) {
          console.error('[shuffle_hand_draw] Error syncing to Firebase:', error);
        }
      }
    }
    
    showPopup(`Shuffled hand into deck and drew ${drawnCards.length} card(s)!`);
    
    if (globalThis.renderAllHands) globalThis.renderAllHands();
    if (globalThis.updateDeckBubbles) globalThis.updateDeckBubbles();
    if (globalThis.renderDiscard) globalThis.renderDiscard(owner);
    if (globalThis.updateDiscardBubbles) globalThis.updateDiscardBubbles();
  },

  heal_active_and_cure_random_status: async (state, pk, { param1 }) => {
    const amount = parseInt10(param1, 10);
    const activeImg = getActiveImg(pk);
    
    if (!activeImg) {
      showPopup('No Active Pokémon.');
      return;
    }
    

    const healed = healImg(activeImg, amount);
    

    const currentStatus = activeImg.dataset.status;
    let curedStatus = null;
    
    if (currentStatus) {
      delete activeImg.dataset.status;
      const slot = getSlotFromImg(activeImg);
      const marker = slot?.querySelector('.status-marker');
      if (marker) marker.remove();
      curedStatus = currentStatus;
    }
    
    if (healed && curedStatus) {
      showPopup(`Healed ${amount} damage and cured ${curedStatus}!`);
    } else if (healed) {
      showPopup(`Healed ${amount} damage from ${activeImg.alt}.`);
    } else if (curedStatus) {
      showPopup(`Cured ${curedStatus} from ${activeImg.alt}.`);
    } else {
      showPopup('No damage or status to remove.');
    }
  },

  revive_type_to_hand: async (state, pk, { param1, param2 }) => {
    const stage = (param1 || 'basic').toLowerCase();
    const type = (param2 || 'water').toLowerCase();
    const player = pkToPlayer(pk);
    const discardPile = state[player]?.discardPile || [];
    
    if (!discardPile.length) {
      showPopup('Your discard pile is empty.');
      return;
    }
    

    const eligibleCards = [];
    for (const card of discardPile) {
      try {
        const meta = await globalThis.fetchCardMeta(card.set, card.number || card.num);
        const cardStage = (meta.stage || '').toLowerCase();
        const hasType = meta.types?.some(t => t.toLowerCase() === type);
        
        if (cardStage === stage && hasType) {
          eligibleCards.push(card);
        }
      } catch {}
    }
    
    if (!eligibleCards.length) {
      showPopup(`No ${stage} ${type}-type Pokémon in discard pile.`);
      return;
    }
    

    const randomCard = eligibleCards[Math.floor(Math.random() * eligibleCards.length)];
    

    const index = discardPile.indexOf(randomCard);
    if (index > -1) {
      discardPile.splice(index, 1);
    }
    

    state[pk].hand.push(randomCard);
    globalThis.renderAllHands?.();
    
    showPopup(`Retrieved ${randomCard.name} from discard pile!`);
  },

  evolve_basic_to_stage2: async (state, pk, { param1, param2 } = {}) => {
    console.log('[RARE-CANDY] ===== RARE CANDY EFFECT START =====');
    const owner = pkToPlayer(pk);
    console.log('[RARE-CANDY] Effect called:', {
      pk,
      owner,
      turnNumber: globalThis.turnNumber,
      toolAttachTarget: globalThis.toolAttachTarget
    });
    
    // In online mode, only allow the player who used the tool to apply the effect
    const getCurrentMatchIdFn = globalThis.getCurrentMatchId;
    const matchId = getCurrentMatchIdFn ? getCurrentMatchIdFn() : null;
    const isOnline = matchId && (typeof window !== 'undefined' && window.firebaseDatabase);
    console.log('[RARE-CANDY] Online mode check:', {
      isOnline,
      matchId,
      hasToolAttachTarget: !!globalThis.toolAttachTarget
    });
    
    if (isOnline) {
      // Check if this is being played as an item (not attached as a tool)
      const isItemPlay = globalThis.__rareCandyItemPlay === true;
      console.log('[RARE-CANDY] Handler check:', {
        isItemPlay,
        toolAttachTarget: globalThis.toolAttachTarget,
        hasItemPlayFlag: !!globalThis.__rareCandyItemPlay
      });
      
      // If it's an item play, always allow it (it's the current player playing it)
      // If it's a tool attachment, check toolAttachTarget to see if it's the opponent
      if (!isItemPlay) {
        // This is a tool attachment - check if it's from opponent's handler
        const isOpponentHandler = !globalThis.toolAttachTarget;
        if (isOpponentHandler) {
          // This is the opponent receiving the action - don't apply the effect, just return silently
          console.log('[RARE-CANDY] Skipping - opponent handler (tool attachment)');
          return;
        }
      } else {
        console.log('[RARE-CANDY] Allowing - item play by current player');
      }
    }
    
    if (globalThis.turnNumber <= 2) {
      const msg = "You can't use Rare Candy during the first two turns.";
      console.log('[RARE-CANDY] Turn restriction:', {
        turnNumber: globalThis.turnNumber,
        error: msg
      });
      throw new Error(msg);
    }
    
    
    

    const allPokemon = getAllPokemonImgs(pk);
    const eligibleBasics = [];
    
    
    
    const metaPromises = allPokemon.map(async (img) => {
      try {
        const playedTurn = parseInt(img.dataset.playedTurn || '0', 10);
        const isFossil = img.dataset.isFossil === 'true';
        
        if (isFossil) {
          return {
            img,
            meta: { name: img.alt, stage: 'Basic', hp: img.dataset.hp },
            isFossil: true,
            playedTurn,
            stage: 'basic'
          };
        } else {
          const meta = await globalThis.fetchCardMeta(img.dataset.set, img.dataset.num);
          return {
            img,
            meta,
            isFossil: false,
            playedTurn,
            stage: (meta.stage || '').toLowerCase()
          };
        }
      } catch (e) {
        return null;
      }
    });
    
    const metaResults = await Promise.all(metaPromises);
    
    for (const result of metaResults) {
      if (!result) continue;
      
      const { img, meta, isFossil, playedTurn, stage } = result;
      
      if (isFossil) {
      } else {
      }
      

      if (stage === 'basic' && playedTurn !== globalThis.turnNumber) {
        eligibleBasics.push({ img, meta, isFossil });
      } else if (stage === 'basic' && playedTurn === globalThis.turnNumber) {
      }
    }
    
    if (!eligibleBasics.length) {
      const msg = 'No eligible Basic Pokémon. (Basics cannot be evolved the turn they are played)';
      throw new Error(msg);
    }
    
    

    const hand = state[pk].hand || [];
    const stage2InHand = [];
    
    

    const handMetaPromises = hand.map(async (handCard) => {
      try {
        const cardMeta = await globalThis.fetchCardMeta(handCard.set, handCard.number || handCard.num);
        const cardStage = (cardMeta.stage || '').toLowerCase();
        
        if (cardStage === 'stage2') {
          return { handCard, cardMeta };
        }
        return null;
      } catch (e) {
        return null;
      }
    });
    
    const handMetaResults = await Promise.all(handMetaPromises);
    
    for (const result of handMetaResults) {
      if (result) {
        stage2InHand.push(result);
      }
    }
    
    console.log('[RARE-CANDY] Stage 2 in hand check:', {
      handSize: hand.length,
      stage2Count: stage2InHand.length,
      stage2Pokemon: stage2InHand.map(s => s.cardMeta?.name || s.handCard?.name)
    });
    
    if (!stage2InHand.length) {
      const msg = 'No Stage 2 Pokémon in hand.';
      console.log('[RARE-CANDY] No Stage 2 in hand:', msg);
      throw new Error(msg);
    }
    
    
    
    

    async function canRareCandyEvolve(basicImg, basicMeta, stage2Meta, isFossil = false) {
      let basicName = normStr(basicImg.alt || basicMeta.name);
      const stage2Name = normStr(stage2Meta.name);
      
      

      if (isFossil) {

        const evolvesInto = normStr(basicImg.dataset.evolvesInto || '');
        
        
        if (!evolvesInto) {
          return false;
        }
        

        const stage1Name = normStr(stage2Meta.evolveFrom || stage2Meta.evolvesFrom || '');
        
        
        if (!stage1Name) return false;
        

        const stage1Card = await findCardByName(stage1Name);
        if (!stage1Card) {
          return false;
        }
        
        const stage1Meta = await globalThis.fetchCardMeta(stage1Card.set, stage1Card.num);
        if (!stage1Meta) return false;
        
        const stage1EvolveFrom = normStr(stage1Meta.evolveFrom || stage1Meta.evolvesFrom || '');
        
        

        const matches = stage1EvolveFrom === basicName || 
                       stage1EvolveFrom.includes(basicName) ||
                       basicName.includes(stage1EvolveFrom);
        
        return matches;
      }
      

      const FOSSIL_MAP = {
        'helixfossil': 'omanyte',
        'domefossil': 'kabuto',
        'oldamber': 'aerodactyl',
        'skullfossil': 'cranidos',
        'armorfossil': 'shieldon'
      };
      

      const basicNameNormalized = basicName.replace(/\s/g, '');
      if (FOSSIL_MAP[basicNameNormalized]) {
        basicName = FOSSIL_MAP[basicNameNormalized];
      }
      

      const basicRoot = basicName.substring(0, 4);
      const stage2Root = stage2Name.substring(0, 4);
      
      if (basicRoot === stage2Root) {
        return true;
      }
      

      if (basicName.length >= 4 && stage2Name.length >= 4) {
        const basicEnd = basicName.substring(basicName.length - 4);
        const stage2End = stage2Name.substring(stage2Name.length - 4);
        if (basicEnd === stage2End && basicEnd.length >= 3) {
          return true;
        }
      }
      

      const stage1Name = normStr(stage2Meta.evolveFrom || stage2Meta.evolvesFrom || '');
      
      if (!stage1Name) return false;
      
      const stage1Card = await findCardByName(stage1Name);
      if (!stage1Card) return false;
      
      const stage1Meta = await globalThis.fetchCardMeta(stage1Card.set, stage1Card.num);
      if (!stage1Meta) return false;
      
      const stage1EvolveFrom = normStr(stage1Meta.evolveFrom || stage1Meta.evolvesFrom || '');
      
      return basicName === stage1EvolveFrom || 
             basicName.includes(stage1EvolveFrom) ||
             stage1EvolveFrom.includes(basicName);
    }
    

    async function findCardByName(cardName) {
      const normalizedName = normStr(cardName);
      const commonSets = ['A1', 'A1a', 'A2', 'A2a', 'A2b', 'A3', 'A3a', 'A3b', 'A4', 'A4a', 'B1'];
      
      for (const set of commonSets) {
        try {
          const setResponse = await fetch(`https://api.tcgdex.net/v2/en/sets/${set}`);
          if (!setResponse.ok) continue;
          
          const setData = await setResponse.json();
          for (const card of setData.cards || []) {
            if (normStr(card.name) === normalizedName) {
              return { set: set, num: card.localId };
            }
          }
        } catch (err) {
          continue;
        }
      }
      
      return null;
    }
    

    
    const validPairs = [];
    
    

    const pairChecks = [];
    for (const { img: basicImg, meta: basicMeta, isFossil } of eligibleBasics) {
      for (const { handCard, cardMeta: stage2Meta } of stage2InHand) {
        pairChecks.push(canRareCandyEvolve(basicImg, basicMeta, stage2Meta, isFossil).then(canEvolve => ({
          canEvolve,
          basicImg,
          basicMeta,
          handCard,
          stage2Meta
        })));
      }
    }
    
    const pairResults = await Promise.all(pairChecks);
    
    for (const { canEvolve, basicImg, basicMeta, handCard, stage2Meta } of pairResults) {
      if (canEvolve) {
        validPairs.push({ basicImg, basicMeta, handCard, stage2Meta });
      }
    }
    
    console.log('[RARE-CANDY] Valid pairs check:', {
      validPairsCount: validPairs.length,
      validPairs: validPairs.map(p => ({
        basic: p.basicMeta?.name || p.basicImg?.alt,
        stage2: p.stage2Meta?.name || p.handCard?.name
      }))
    });
    
    if (!validPairs.length) {
      const msg = 'No valid evolution combinations. (Stage 2 must evolve from a Basic in play)';
      console.log('[RARE-CANDY] No valid pairs:', msg);
      throw new Error(msg);
    }
    
    
    
    
    showPopup('Rare Candy: Choose a Basic Pokémon to evolve.');
    const uniqueBasics = [];
    const basicMap = new Map();
    
    for (const pair of validPairs) {
      if (!basicMap.has(pair.basicImg)) {
        basicMap.set(pair.basicImg, []);
        uniqueBasics.push(pair.basicImg);
      }
      basicMap.get(pair.basicImg).push(pair);
    }
    
    const chosenBasic = await awaitSelection(uniqueBasics);
    if (!chosenBasic) {
      throw new Error('Evolution cancelled.');
    }
    
    

    
    const pairsForBasic = basicMap.get(chosenBasic);
    
    if (pairsForBasic.length === 1) {
      const { handCard, stage2Meta } = pairsForBasic[0];
      
      // Double-check that the basic Pokemon belongs to the correct owner
      const basicOwner = chosenBasic.closest('#player1') ? 'player1' : 'player2';
      const finalOwner = basicOwner === owner ? owner : basicOwner;

      chosenBasic.dataset.evolvedViaRareCandy = 'true';
      
      await globalThis.evolveCard(
        chosenBasic, stage2Meta, handCard, finalOwner,
        handCard.set, handCard.number || handCard.num
      );
      
      showPopup(`Rare Candy: ${chosenBasic.alt} evolved into ${stage2Meta.name}!`);
      
    } else {
      
      showPopup(`Choose which Stage 2 to evolve ${chosenBasic.alt} into.`);
      

      globalThis.__rareCandySelection = {
        pk,
        owner,
        chosenBasic,
        pairsForBasic
      };
      globalThis.__rareCandyActive = true;
      

      if (globalThis.renderAllHands) {
        globalThis.renderAllHands();
      }
      

      const selectedPair = await new Promise((resolve) => {
        globalThis.__rareCandyResolve = resolve;
      });
      

      globalThis.__rareCandyActive = false;
      globalThis.__rareCandySelection = null;
      globalThis.__rareCandyResolve = null;
      
      if (!selectedPair) {
        throw new Error('Evolution cancelled.');
      }
      
      const { handCard, stage2Meta, actualOwner } = selectedPair;
      
      // Use the actual owner from the selected pair, or fall back to the effect owner
      const evolveOwner = actualOwner || owner;
      
      // Double-check that the basic Pokemon belongs to the correct owner
      const basicOwner = chosenBasic.closest('#player1') ? 'player1' : 'player2';
      const finalOwner = basicOwner === evolveOwner ? evolveOwner : basicOwner;

      chosenBasic.dataset.evolvedViaRareCandy = 'true';
      
      await globalThis.evolveCard(
        chosenBasic, stage2Meta, handCard, finalOwner,
        handCard.set, handCard.number || handCard.num
      );
      
      showPopup(`Rare Candy: ${chosenBasic.alt} evolved into ${stage2Meta.name}!`);
    }
  },

  peek_topdeck_optional_shuffle: async (state, pk, { param1 }) => {
    const count = parseInt10(param1, 1);
    const player = pkToPlayer(pk);
    const deck = state[player]?.deck || [];
    
    if (!deck.length) {
      showPopup('Your deck is empty.');
      return;
    }
    

    const topCard = deck[deck.length - 1];
    showPopup(`Top card: ${topCard.name}. Shuffle deck?`);
    
    
    

    const shouldShuffle = Math.random() < 0.5;
    if (shouldShuffle) {
      shuffleArray(deck);
      showPopup('Deck shuffled.');
    }
  },

  counter_inflict_status_tool: async (state, pk, { param1 }) => {

    showPopup('Poison Barb attached! Will poison attackers when this Pokémon is hit.');
  },

  increase_max_hp_type: async (state, pk, { param1, param2 }) => {
    const hpBonus = parseInt10(param1, 30);
    const requiredType = (param2 || 'grass').toLowerCase();
    

    const targetImg = globalThis.toolAttachTarget;
    if (!targetImg) {
      showPopup('Error: No target Pokemon found.');
      console.error('[Leaf Cape] No toolAttachTarget set');
      return;
    }
    

    try {
      const meta = await globalThis.fetchCardMeta(targetImg.dataset.set, targetImg.dataset.num);
      const hasType = meta.types?.some(t => t.toLowerCase() === requiredType);
      
      if (!hasType) {
        showPopup(`Leaf Cape can only be attached to ${param2}-type Pokémon!`);
        throw new Error(`Wrong type for Leaf Cape`);
      }
      

      const slot = getSlotFromImg(targetImg);
      if (!slot) {
        showPopup('Error: Could not find Pokemon slot.');
        return;
      }
      
      const baseHp = parseInt10(targetImg.dataset.hp);
      const curHp = parseInt10(targetImg.dataset.chp, baseHp);
      const newMaxHp = baseHp + hpBonus;
      

      slot.dataset.maxHp = String(newMaxHp);
      

      const newCurHp = curHp + hpBonus;
      
      setHpOnImg(targetImg, baseHp, newCurHp);
      
      showPopup(`Leaf Cape: ${targetImg.alt} gained +${hpBonus} HP!`);
      
    } catch (err) {
      console.error('[Leaf Cape] Error:', err);
      throw err;
    }
  },

  transfer_damage_named_to_opponent: async (state, pk, { param1, param2 }) => {
    const transferAmount = parseInt10(param1, 40);
    const allowedNames = (param2 || '').split(',').map(n => normStr(n));
    
    const myPokemon = getAllPokemonImgs(pk);
    const eligible = [];
    
    for (const img of myPokemon) {
      const name = normStr(img.alt);
      const { base, cur } = getHpFromImg(img);
      const hasDamage = cur < base;
      const isNamed = allowedNames.some(n => name.includes(n));
      
      if (hasDamage && isNamed) {
        eligible.push(img);
      }
    }
    
    if (!eligible.length) {
      throw new Error('No valid target');
    }
    
    showPopup(`Choose ${param2} with damage.`);
    const chosen = await awaitSelection(eligible);
    
    if (chosen) {
      const { base, cur } = getHpFromImg(chosen);
      const actualDamage = base - cur;
      const actualTransfer = Math.min(transferAmount, actualDamage);
      

      healImg(chosen, actualTransfer);
      

      const oppOwner = oppPk(pk) === 'p1' ? 'player1' : 'player2';
      
      if (globalThis.damageActiveOf) {
        const result = await globalThis.damageActiveOf(oppOwner, actualTransfer, { isDirectAttack: false });
        
        showPopup(`Moved ${actualTransfer} damage to opponent!`);
        

        if (result.knocked && typeof globalThis.handleKnockOut === 'function') {
          const oppImg = globalThis.getActiveImage(oppOwner);
          if (oppImg) {
            const gameEnded = await globalThis.handleKnockOut(oppOwner, oppImg, true);
            if (!gameEnded && typeof globalThis.beginPromotionFlow === 'function') {
              globalThis.beginPromotionFlow(oppOwner);
            }
          }
        }
      }
    }
  },

  return_damaged_type_to_hand: async (state, pk, { param1 }) => {
    const type = (param1 || 'colorless').toLowerCase();
    const allPokemon = getAllPokemonImgs(pk);
    const eligible = [];
    
    for (const img of allPokemon) {
      try {
        const meta = await globalThis.fetchCardMeta(img.dataset.set, img.dataset.num);
        const hasType = meta.types?.some(t => t.toLowerCase() === type);
        const { base, cur } = getHpFromImg(img);
        const hasDamage = cur < base;
        
        if (hasType && hasDamage) {
          eligible.push(img);
        }
      } catch {}
    }
    
    if (!eligible.length) {
      throw new Error('No valid target');
    }
    
    showPopup(`Choose a damaged ${type}-type Pokémon to return to hand.`);
    const chosen = await awaitSelection(eligible);
    
    if (chosen) {

      state[pk].hand.push({
        name: chosen.alt,
        set: chosen.dataset.set,
        number: chosen.dataset.num,
        image: chosen.src
      });
      

      const slot = getSlotFromImg(chosen);
      if (slot) {
        slot.innerHTML = '<span class="slot-label">Empty</span>';
        slot.dataset.empty = '1';
        delete slot.dataset.maxHp;
      }
      
      globalThis.renderAllHands?.();
      showPopup(`Returned ${chosen.alt} to hand.`);
      

      if (getActiveImg(pk) === null) {
        globalThis.beginPromotionFlow?.(pkToPlayer(pk));
      }
    }
  },

  attach_energy_to_targets_end_turn: async (state, pk, { param1, param2 }) => {
    const [countStr, type] = (param1 || '2|fire').split('|');
    const count = parseInt10(countStr, 2);
    const energyType = (type || 'fire').toLowerCase();
    const names = (param2 || '').split(',').map(n => normStr(n));
    
    const allPokemon = getAllPokemonImgs(pk);
    const eligible = allPokemon.filter(img => {
      const name = normStr(img.alt);
      return names.some(n => name.includes(n));
    });
    
    if (!eligible.length) {
      showPopup('No valid target Pokémon.');
      return;
    }
    
    showPopup(`Choose ${param2} to attach ${count} ${energyType} Energy.`);
    const chosen = await awaitSelection(eligible);
    
    if (chosen) {
      for (let i = 0; i < count; i++) {
        attachEnergy(chosen, energyType);
      }
      
      showPopup(`Attached ${count} ${energyType} Energy to ${chosen.alt}. Your turn ends.`);
      

      setTimeout(() => {
        if (globalThis.startTurn && globalThis.currentPlayer) {
          const nextPlayer = globalThis.currentPlayer === 'player1' ? 'player2' : 'player1';
          globalThis.startTurn(nextPlayer);
        } else {
          console.error('[Kiawe] Cannot end turn - startTurn or currentPlayer not available');
        }
      }, 1000);
    }
  },

  discard_all_opponent_tools: async (state, pk) => {
    const oppPk = pk === 'p1' ? 'p2' : 'p1';
    const oppOwner = oppPk === 'p1' ? 'player1' : 'player2';
    const oppPokemon = getAllPokemonImgs(oppPk);
    
    let toolsDiscarded = 0;
    const pokemonToKO = [];
    
    for (const img of oppPokemon) {
      const slot = getSlotFromImg(img);
      if (!slot) continue;
      
      const toolThumb = slot.querySelector('.tool-thumb');
      if (toolThumb) {
        toolThumb.remove();
        

        const toolData = globalThis.getToolDataFromSlot?.(slot);
        if (toolData) {
          globalThis.setToolDataOnSlot?.(slot, null);
          

          const isGiantCape = toolData.set === 'A2' && toolData.num === '147';
          const isLeafCape = toolData.set === 'A3' && toolData.num === '147';
          
          if (isGiantCape || isLeafCape) {
            const hpBonus = isGiantCape ? 20 : 30;
            
            const cardImg = slot.querySelector('img');
            if (cardImg) {

              const baseHp = parseInt10(cardImg.dataset.hp);
              const curHp = parseInt10(cardImg.dataset.chp);
              

              const newCurHp = curHp - hpBonus;
              

              delete slot.dataset.maxHp;
              
              if (newCurHp <= 0) {

                pokemonToKO.push({ img: cardImg, wasActive: getActiveImg(oppPk) === cardImg });
              } else {

                if (globalThis.setHpOnImage) {
                  globalThis.setHpOnImage(cardImg, baseHp, newCurHp);
                } else {
                setHpOnImg(cardImg, baseHp, newCurHp);
              }
              }
            } else {

              delete slot.dataset.maxHp;
            }
          }
          
          toolsDiscarded++;
        }
      }
    }
    
    showPopup(toolsDiscarded > 0
      ? `Discarded ${toolsDiscarded} Tool card${toolsDiscarded > 1 ? 's' : ''}!` 
      : 'No Tools to discard.');
    
    

    for (const { img, wasActive } of pokemonToKO) {
      showPopup(`${img.alt} was Knocked Out by losing its HP boost!`);
      
      if (globalThis.handleKnockOut) {
        const gameEnded = await globalThis.handleKnockOut(oppOwner, img, wasActive);
        

        if (!gameEnded && wasActive && typeof globalThis.beginPromotionFlow === 'function') {
          globalThis.beginPromotionFlow(oppOwner);
        }
      }
    }
  },

  force_opponent_switch_if_named: async (state, pk, { param2 }) => {
    const requiredName = normStr(param2 || 'araquanid');
    const myPokemon = getAllPokemonImgs(pk);
    
    const hasRequired = myPokemon.some(img => normStr(img.alt).includes(requiredName));
    
    if (!hasRequired) {
      showPopup(`You need ${param2} in play to use this card.`);
      return;
    }
    
    globalThis.promoteFromBench?.(state, oppPk(pk), true);
    showPopup(`Opponent must switch (you have ${param2}).`);
  },

  heal_full_discard_energy_named: async (state, pk, { param2 }) => {
    const names = (param2 || '').split(',').map(n => normStr(n));
    const allPokemon = getAllPokemonImgs(pk);
    
    const eligible = allPokemon.filter(img => {
      const name = normStr(img.alt);
      const { base, cur } = getHpFromImg(img);
      return names.some(n => name.includes(n)) && cur < base;
    });
    
    if (!eligible.length) {
      showPopup(`No damaged ${param2} in play.`);
      return;
    }
    
    showPopup(`Choose ${param2} to fully heal.`);
    const chosen = await awaitSelection(eligible);
    
    if (chosen) {
      const { base } = getHpFromImg(chosen);
      

      setHpOnImg(chosen, base, base);
      

      const slot = getSlotFromImg(chosen);
      const energyBox = slot?.querySelector('.energy-pips');
      if (energyBox) {
        const pipCount = energyBox.querySelectorAll('.energy-pip').length;
        energyBox.remove();
        showPopup(`Healed ${chosen.alt} to full HP! Discarded ${pipCount} Energy.`);
      } else {
        showPopup(`Healed ${chosen.alt} to full HP!`);
      }
    }
  },

  heal_stage: async (state, pk, { param1, param2 }) => {
    const amount = parseInt10(param1, 60);
    const stage = (param2 || 'stage2').toLowerCase();
    
    const allPokemon = getAllPokemonImgs(pk);
    const eligible = [];
    
    for (const img of allPokemon) {
      try {
        const meta = await globalThis.fetchCardMeta(img.dataset.set, img.dataset.num);
        const cardStage = (meta.stage || '').toLowerCase();
        const { base, cur } = getHpFromImg(img);
        
        if (cardStage === stage && cur < base) {
          eligible.push(img);
        }
      } catch {}
    }
    
    if (!eligible.length) {
      throw new Error('No valid target');
    }
    
    showPopup(`Choose a ${stage} Pokémon to heal ${amount} damage.`);
    const chosen = await awaitSelection(eligible);
    
    if (chosen && healImg(chosen, amount)) {
      showPopup(`Healed ${amount} damage from ${chosen.alt}.`);
    }
  },

  
  
  

  reduce_all_incoming_damage_next_turn_if_no_points: async (state, pk, { param1 }) => {
    const reduction = parseInt10(param1, 20);
    const opp = oppPk(pk);
    

    const oppPoints = (opp === 'p1' ? globalThis.p1Points : globalThis.p2Points) || 0;
    
    if (oppPoints > 0) {
      showPopup('Cannot use Beast Wall - opponent has already gotten points.');
      return;
    }
    

    if (!globalThis.state) globalThis.state = {};
    if (!globalThis.state.damageReduction) globalThis.state.damageReduction = {};
    
    globalThis.state.damageReduction[pk] = {
      amount: reduction,
      target: 'ultra_beast',
      duration: 'next_turn'
    };
    
    showPopup(`Your Ultra Beasts will take -${reduction} damage during opponent's next turn`);
  },
  

  force_opponent_switch_basic: async (state, pk) => {
    const opp = oppPk(pk);
    const activeImg = getActiveImg(opp);
    
    if (!activeImg) {
      showPopup('No opponent Active Pokemon.');
      return;
    }
    

    try {
      const meta = await globalThis.fetchCardMeta(activeImg.dataset.set, activeImg.dataset.num);
      const stage = (meta.stage || '').toLowerCase();
      
      if (stage !== 'basic') {
        showPopup('Opponent\'s Active Pokemon is not a Basic Pokemon.');
        return;
      }
    } catch {
      showPopup('Could not verify Pokemon stage.');
      return;
    }
    

    const oppPlayer = opp === 'p1' ? 'player1' : 'player2';
    if (typeof globalThis.beginPromotionFlow === 'function') {
      globalThis.beginPromotionFlow(oppPlayer);
      showPopup('Repel: Switched out opponent\'s Basic Pokemon!');
    }
  },
  

  search_named_random: async (state, pk, { param2 }) => {

    const names = (param2 || '').split(';').map(n => n.trim());
    
    showPopup(`Searching deck for ${names.join(' or ')}...`);
    

    const deck = state[pk]?.deck || [];
    
    if (deck.length === 0) {
      showPopup('Your deck is empty.');
      return;
    }
    

    const matches = [];
    for (const card of deck) {
      const cardName = (card.name || '').trim();
      const cardNameLower = cardName.toLowerCase();
      
      for (const searchName of names) {
        const searchLower = searchName.toLowerCase();

        if (cardName === searchName || 
            cardNameLower === searchLower ||
            cardNameLower.includes(searchLower) ||
            searchLower.includes(cardNameLower)) {
          matches.push(card);
          break;
        }
      }
    }
    
    if (matches.length === 0) {
      showPopup(`No ${names.join(' or ')} found in deck.`);
      return;
    }
    

    const chosen = matches[Math.floor(Math.random() * matches.length)];
    

    const deckIndex = deck.findIndex(c => c.set === chosen.set && (c.number || c.num) === (chosen.number || chosen.num));
    if (deckIndex !== -1) {
      deck.splice(deckIndex, 1);
      

      state[pk].hand = state[pk].hand || [];
      state[pk].hand.push(chosen);
      

      shuffleDeckAndAnimate(state, pk);
      

      if (globalThis.renderAllHands) {
        globalThis.renderAllHands();
      }
      if (globalThis.updateDeckBubbles) {
        globalThis.updateDeckBubbles();
      }
      
      showPopup(`Found ${chosen.name}! Added to hand.`);
      if (globalThis.logEvent) {
        const owner = pk === 'p1' ? 'player1' : 'player2';
        globalThis.logEvent({
          player: owner,
          text: `Found ${chosen.name} from deck search`,
          cardSet: chosen.set,
          cardNum: chosen.number || chosen.num
        });
      }
    }
  },
  

  reveal_opponent_supporters: async (state, pk) => {
    const opp = oppPk(pk);
    
    showPopup('Revealing opponent\'s Supporters...');
    

    const deck = state[opp]?.deck || [];
    
    if (deck.length === 0) {
      showPopup('Opponent\'s deck is empty.');
      return;
    }
    

    const supporters = [];
    for (const card of deck) {

      if (card.category === 'Trainer' && card.trainerType === 'Supporter') {
        supporters.push(card);
      }
    }
    
    if (supporters.length === 0) {
      showPopup('No Supporters found in opponent\'s deck.');
      return;
    }
    

    const supporterNames = supporters.map(c => c.name).join(', ');
    showPopup(`Revealed ${supporters.length} Supporter(s): ${supporterNames}`);
    

    if (globalThis.showCardReveal) {
      globalThis.showCardReveal('Opponent\'s Supporters', supporters);
    }
  },
  

  attach_from_discard_ultra_beast_if_points: async (state, pk, { param1 }) => {
    const count = parseInt10(param1, 2);
    const opp = oppPk(pk);
    

    const oppPoints = (opp === 'p1' ? globalThis.p1Points : globalThis.p2Points) || 0;
    
    if (oppPoints < 1) {
      showPopup('Cannot use Lusamine - opponent hasn\'t gotten any points yet.');
      return;
    }
    

    const ULTRA_BEASTS = [
      'nihilego', 'buzzwole', 'pheromosa', 'xurkitree', 'celesteela',
      'kartana', 'guzzlord', 'poipole', 'naganadel', 'stakataka', 'blacephalon'
    ];
    

    const allPokemon = getAllPokemonImgs(pk);
    const ultraBeasts = allPokemon.filter(img => {
      const name = (img.alt || '').toLowerCase();
      return ULTRA_BEASTS.some(ub => name.includes(ub));
    });
    
    if (!ultraBeasts.length) {
      showPopup('No Ultra Beasts in play.');
      return;
    }
    
    showPopup('Choose an Ultra Beast to attach Energy from discard.');
    const chosen = await awaitSelection(ultraBeasts);
    
    if (!chosen) return;
    

    const energyCounts = state[pk]?.discard?.energyCounts || {};
    
    

    const availableTypes = Object.keys(energyCounts).filter(type => 
      type !== 'total' && energyCounts[type] > 0
    );
    
    
    if (availableTypes.length === 0) {
      showPopup('No Energy in discard pile.');
      return;
    }
    

    const totalEnergy = availableTypes.reduce((sum, type) => sum + energyCounts[type], 0);
    const attachCount = Math.min(count, totalEnergy);
    
    
    if (attachCount === 0) {
      showPopup('No Energy in discard pile.');
      return;
    }
    

    for (let i = 0; i < attachCount; i++) {

      const availableNow = availableTypes.filter(type => energyCounts[type] > 0);
      if (availableNow.length === 0) break;
      
      const randomType = availableNow[Math.floor(Math.random() * availableNow.length)];
      

      if (typeof attachEnergy === 'function') {
        attachEnergy(chosen, randomType);
      }
      

      energyCounts[randomType]--;
    }
    
    showPopup(`Lusamine: Attached ${attachCount} Energy from discard to ${chosen.alt}!`);
    

    const owner = pk === 'p1' ? 'player1' : 'player2';
    if (typeof renderDiscard === 'function') {
      renderDiscard(owner);
    }
  },
  
  
  

  eevee_boost_or_heal: async (state, pk, { param1, param2 }) => {
    const boostAmount = parseInt10(param1, 10);
    const healAmount = parseInt10(param2, 20);
    

    const EEVEELUTIONS = [
      'vaporeon', 'jolteon', 'flareon', 'espeon', 'umbreon',
      'leafeon', 'glaceon', 'sylveon'
    ];
    

    const allPokemon = getAllPokemonImgs(pk);
    const eeveelutions = allPokemon.filter(img => {
      const name = (img.alt || '').toLowerCase();
      return EEVEELUTIONS.some(ee => name.includes(ee));
    });
    
    if (!eeveelutions.length) {
      showPopup('No Pokémon that evolve from Eevee in play.');
      return;
    }
    

    const choice = await new Promise((resolve) => {
      const backdrop = document.getElementById('choiceDialogBackdrop');
      const title = document.getElementById('choiceDialogTitle');
      const desc = document.getElementById('choiceDialogDesc');
      const buttonsContainer = document.getElementById('choiceDialogButtons');
      
      if (!backdrop || !title || !desc || !buttonsContainer) {
        console.error('[Eevee Bag] Choice dialog elements not found');
        resolve(null);
        return;
      }
      

      title.textContent = 'Eevee Bag';
      desc.textContent = `Choose 1 effect for your ${eeveelutions.length} Eeveelution${eeveelutions.length > 1 ? 's' : ''}:`;
      

      buttonsContainer.innerHTML = '';
      

      const boostBtn = document.createElement('button');
      boostBtn.textContent = `Boost: +${boostAmount} damage this turn`;
      boostBtn.style.cssText = 'padding:14px 24px;background:#00d4ff;color:#fff;border:none;border-radius:10px;font-size:15px;font-weight:700;cursor:pointer;transition:all 0.2s;min-width:200px;';
      boostBtn.onmouseover = () => boostBtn.style.background = '#00b8e6';
      boostBtn.onmouseout = () => boostBtn.style.background = '#00d4ff';
      boostBtn.onclick = () => {
        backdrop.classList.remove('show');
        resolve('boost');
      };
      

      const healBtn = document.createElement('button');
      healBtn.textContent = `Heal: ${healAmount} damage from each`;
      healBtn.style.cssText = 'padding:14px 24px;background:#22c55e;color:#fff;border:none;border-radius:10px;font-size:15px;font-weight:700;cursor:pointer;transition:all 0.2s;min-width:200px;';
      healBtn.onmouseover = () => healBtn.style.background = '#16a34a';
      healBtn.onmouseout = () => healBtn.style.background = '#22c55e';
      healBtn.onclick = () => {
        backdrop.classList.remove('show');
        resolve('heal');
      };
      

      buttonsContainer.appendChild(boostBtn);
      buttonsContainer.appendChild(healBtn);
      

      backdrop.classList.add('show');
      

      const backdropClickHandler = (e) => {
        if (e.target === backdrop) {
          backdrop.classList.remove('show');
          backdrop.removeEventListener('click', backdropClickHandler);
          resolve(null);
        }
      };
      backdrop.addEventListener('click', backdropClickHandler);
    });
    
    if (!choice) {
      return;
    }
    
    if (choice === 'boost') {

      if (!globalThis.state) globalThis.state = {};
      if (!globalThis.state.damageBoost) globalThis.state.damageBoost = {};
      
      globalThis.state.damageBoost[pk] = {
        amount: boostAmount,
        target: 'eeveelution',
        targetNames: EEVEELUTIONS,
        duration: 'this_turn'
      };
      
      showPopup(`Eevee Bag: Eeveelutions will do +${boostAmount} damage this turn!`);
    } else if (choice === 'heal') {

      for (const img of eeveelutions) {
        healImg(img, healAmount);
      }
      showPopup(`Eevee Bag: Healed ${healAmount} damage from ${eeveelutions.length} Eeveelution(s)!`);
    }
  },
  
  
  

  copy_random_opponent_supporter: async (state, pk) => {
    const opp = oppPk(pk);
    
    showPopup('Penny: Looking at opponent\'s Supporters...');
    

    const deck = state[opp]?.deck || [];
    
    if (deck.length === 0) {
      showPopup('Opponent\'s deck is empty.');
      return;
    }
    

    const supporters = [];
    for (const card of deck) {
      try {
        const meta = await globalThis.fetchCardMeta?.(card.set, card.number || card.num) || 
                     await fetch(`https://api.tcgdex.net/v2/en/sets/${card.set}/${card.number || card.num}`).then(r => r.json());
        
        if (meta.category === 'Trainer' && 
            meta.trainerType === 'Supporter' && 
            meta.name !== 'Penny') {
        supporters.push(card);
        }
      } catch (e) {

      }
    }
    
    if (supporters.length === 0) {
      showPopup('No valid Supporters found in opponent\'s deck (or only Penny found).');
      return;
    }
    

    const chosen = supporters[Math.floor(Math.random() * supporters.length)];
    

    let chosenMeta = null;
    let chosenName = chosen.name || 'Unknown';
    let chosenImage = chosen.image || '';
    
    try {
      chosenMeta = await globalThis.fetchCardMeta?.(chosen.set, chosen.number || chosen.num);
      if (chosenMeta) {
        chosenName = chosenMeta.name || chosenName;
        chosenImage = chosenMeta.image ? `${chosenMeta.image}/high.png` : chosenImage;
      }
    } catch {}
    

    const handBackdrop = document.getElementById('handBackdrop');
    const handImg = document.getElementById('handImg');
    const handTitle = document.getElementById('handTitle');
    const handType = document.getElementById('handType');
    const handEffect = document.getElementById('handEffect');
    
    if (handBackdrop && handImg && handTitle && handType && handEffect) {

      handImg.src = chosenImage || 'imgs/cardback.png';
      handTitle.textContent = chosenName;
      handType.textContent = 'Supporter';
      handType.style.background = '#8b5cf6';
      handEffect.textContent = chosenMeta?.effect || chosenMeta?.description || 'Penny copies this card\'s effect.';
      

      handBackdrop.classList.add('show');
      

      await new Promise(resolve => setTimeout(resolve, 1000));
      

      handBackdrop.classList.remove('show');
    }
    
    showPopup(`Penny copies: ${chosenName}!`);
    

    const cardId = `${chosen.set}-${String(chosen.number || chosen.num).padStart(3, '0')}`;
    const effectData = typeof globalThis.TRAINER_EFFECT_DATA !== 'undefined' ? 
      globalThis.TRAINER_EFFECT_DATA.find(x => x.id === cardId) : null;
    
    if (!effectData || !effectData.effect_type) {
      showPopup(`${chosenName} effect not found in database.`);
      return;
    }
    

    shuffleArray(deck);
    
    if (globalThis.shuffleDeckAndAnimate) {
      globalThis.shuffleDeckAndAnimate(state, opp);
    }
    

    const handler = TRAINER_EFFECTS[effectData.effect_type];
    
    if (handler) {
      try {
        await handler(state, pk, {
          param1: effectData.param1,
          param2: effectData.param2
        });
      } catch (err) {
        console.error(`[Penny] Failed to execute effect:`, err);
        showPopup(`Failed to execute ${chosenName} effect.`);
      }
    } else {
      showPopup(`${chosenName} effect (${effectData.effect_type}) not implemented.`);
    }
  },

  
  
  

  move_energy_on_knockout_tool: async (state, pk, { param1, param2 }) => {

    const energyType = (param1 || 'lightning').toLowerCase();
    const count = parseInt10(param2, 2);
    showPopup(`Electrical Cord attached! Will move ${count} ${energyType} Energy to bench on KO.`);
  },
  

  boost_damage_per_point: async (state, pk, { param1 }) => {

    const perPoint = parseInt10(param1, 10);
    showPopup(`Beastite attached! +${perPoint} damage per point you have.`);
  },
  

  heal_active_end_of_turn_tool: async (state, pk, { param1 }) => {

    const amount = parseInt10(param1, 10);
    showPopup(`Leftovers attached! Will heal ${amount} damage at end of turn if active.`);
  },
  
  
  

  discard_energy_type_from_opponent: async (state, pk, { param1, param2 }) => {
    const energyType = (param1 || '').toLowerCase();
    const count = parseInt10(param2, 1);
    const oppImg = getActiveImg(oppPk(pk));
    
    if (!oppImg) {
      showPopup('No opponent Active Pokémon.');
      return;
    }
    
    const removed = await removeEnergy(oppImg, energyType, count);
    if (removed > 0) {
      showPopup(`Discarded ${removed} ${energyType} Energy from opponent!`);
    } else {
      showPopup(`No ${energyType} Energy to discard.`);
    }
  },
  

  flip_revive_from_discard: async (state, pk, { param1 }) => {

    const target = (param1 || 'basic').toLowerCase();
    const owner = pk === 'p1' ? 'player1' : 'player2';
    

    const discard = state[pk]?.discard || [];
    const pokemonCards = [];
    
    for (const card of discard) {
      try {
        const meta = await globalThis.fetchCardMeta(card.set, card.number || card.num);
        if (meta.category === 'Pokemon') {
          if (target === 'basic' && meta.stage?.toLowerCase() === 'basic') {
            pokemonCards.push(card);
          } else if (target !== 'basic' && (card.name || '').toLowerCase().includes(target)) {
            pokemonCards.push(card);
          }
        }
      } catch {}
    }
    
    if (pokemonCards.length === 0) {
      showPopup('No valid Pokémon in discard pile.');
      return;
    }
    
    if ((await flipCoin(pk)) === 'heads') {

      showPopup('HEADS → Choose a Pokémon to revive.');

      const chosen = pokemonCards[0];
      

      const index = discard.indexOf(chosen);
      if (index !== -1) discard.splice(index, 1);
      

      state[pk].hand = state[pk].hand || [];
      state[pk].hand.push(chosen);
      
      if (globalThis.renderAllHands) {
        globalThis.renderAllHands();
      }
      
      showPopup(`Revived ${chosen.name || 'Pokémon'}!`);
    } else {
      showPopup('TAILS → No effect.');
    }
  },
  

  guarantee_coin_flip: async (state, pk, { param1 }) => {

    if (!globalThis.state) globalThis.state = {};
    if (!globalThis.state.guaranteedHeads) globalThis.state.guaranteedHeads = {};
    
    globalThis.state.guaranteedHeads[pk] = true;
    showPopup('Next coin flip will be heads!');
  },
  

  move_energy_type_multiple: async (state, pk, { param1, param2 }) => {

    const types = (param1 || '').split(/[,;]/).map(t => t.trim().toLowerCase()).filter(Boolean);
    const target = (param2 || 'active').toLowerCase();
    
    if (types.length === 0) {
      showPopup('No energy types specified.');
      return;
    }
    
    const targetImg = target === 'active' ? getActiveImg(pk) : null;
    if (!targetImg && target === 'active') {
      showPopup('No Active Pokémon.');
      return;
    }
    
    let totalMoved = 0;
    
    if (target === 'active') {

      const benchImgs = getBenchImgs(pk);
      if (benchImgs.length === 0) {
        showPopup('No benched Pokémon.');
        return;
      }
      

      const candidates = [];
      for (const img of benchImgs) {
        const slot = getSlotFromImg(img);
        if (!slot) continue;
        
        const energyPips = slot.querySelectorAll('.energy-pip');
        for (const pip of energyPips) {
          const pipType = pip.dataset.type?.toLowerCase();
          if (pipType && types.includes(pipType)) {
            candidates.push(img);
            break;
          }
        }
      }
      
      if (candidates.length === 0) {
        showPopup('No Energy to move.');
        return;
      }
      

      showPopup(`Choose a Benched Pokémon with ${types.join(', ')} Energy.`);
      const sourceImg = await awaitSelection(candidates);
      
      if (!sourceImg) {
        return;
      }
      

      const sourceSlot = getSlotFromImg(sourceImg);
      if (!sourceSlot) return;
      
      const energyPips = Array.from(sourceSlot.querySelectorAll('.energy-pip'));
      for (const pip of energyPips) {
        const pipType = pip.dataset.type?.toLowerCase();
        if (pipType && types.includes(pipType)) {

          const toBox = getEnergyBox(getSlotFromImg(targetImg), true);
          if (toBox) {
            toBox.appendChild(pip);
            totalMoved = 1;
            showPopup(`Moved 1 {${pipType.toUpperCase()}} Energy to ${targetImg.alt}!`);
          }
          break;
        }
      }
    } else {

      const activeImg = getActiveImg(pk);
      if (!activeImg) {
        showPopup('No Active Pokémon.');
        return;
      }
      
      const benchImgs = getBenchImgs(pk);
      if (benchImgs.length === 0) {
        showPopup('No benched Pokémon.');
        return;
      }
      
      showPopup('Choose a benched Pokémon to move Energy to.');
      const chosen = await awaitSelection(benchImgs);
      
      if (chosen) {
        for (const type of types) {
          const moved = moveEnergy(activeImg, chosen, type);
          totalMoved += moved;
        }
        
        if (totalMoved > 0) {
          showPopup(`Moved ${totalMoved} Energy (${types.join(', ')})!`);
        } else {
          showPopup('No Energy to move.');
        }
      }
    }
  },
  

  reduce_all_incoming_damage_next_turn: async (state, pk, { param1 }) => {
    const reduction = parseInt10(param1, 20);
    
    globalThis.__specialEffects ??= { p1: {}, p2: {} };
    if (!globalThis.__specialEffects[pk].damageReduction) {
      globalThis.__specialEffects[pk].damageReduction = 0;
    }
    
    globalThis.__specialEffects[pk].damageReduction += reduction;
    showPopup(`All incoming damage reduced by ${reduction} next turn!`);
  },
  

  reduce_incoming_damage: async (state, pk, { param1 }) => {
    const reduction = parseInt10(param1, 20);
    const activeImg = getActiveImg(pk);
    
    if (!activeImg) {
      showPopup('No Active Pokémon.');
      return;
    }
    

    activeImg.dataset.damageReduction = String(reduction);
    showPopup(`Incoming damage reduced by ${reduction}!`);
  },
  

  rescue_to_hand: async (state, pk, { param1 }) => {

    if (!globalThis.state) globalThis.state = {};
    if (!globalThis.state.rescueToHand) globalThis.state.rescueToHand = {};
    
    globalThis.state.rescueToHand[pk] = true;
    showPopup('If a Pokémon is Knocked Out, put it in your hand instead of discard!');
  },
  

  shuffle_opponent_hand: async (state, pk, { param1 }) => {

    const opp = oppPk(pk);
    const hand = state[opp]?.hand || [];
    const deck = state[opp]?.deck || [];
    
    if (hand.length === 0) {
      showPopup('Opponent has no cards in hand.');
      return;
    }
    

    const supporters = [];
    for (const card of hand) {
      try {
        const meta = await globalThis.fetchCardMeta?.(card.set, card.number || card.num) || 
                     await fetch(`https://api.tcgdex.net/v2/en/sets/${card.set}/${card.number || card.num}`).then(r => r.json());
        if (meta.category === 'Trainer' && meta.trainerType === 'Supporter') {
          supporters.push(card);
        }
      } catch (e) {

      }
    }
    
    if (supporters.length === 0) {
      showPopup('No Supporter cards in opponent\'s hand.');
      return;
    }
    

    const oppOwner = opp === 'p1' ? 'player1' : 'player2';
    const oppHandDivId = oppOwner === 'player1' ? 'p1Hand' : 'p2Hand';
    const oppHandDiv = document.getElementById(oppHandDivId);
    

    const originalHide = oppOwner === 'player1' ? 
      (typeof currentPlayer !== 'undefined' && currentPlayer === 'player2') :
      (typeof currentPlayer !== 'undefined' && currentPlayer === 'player1');
    

    if (oppHandDiv && globalThis.renderHand) {
      globalThis.renderHand(oppHandDiv, hand, false, false);

      oppHandDiv.classList.remove('disable-clicks');
    }
    

    const supporterNames = supporters.map(c => c.name).join(', ');
    showPopup(`Opponent's hand revealed. Choose a Supporter card.`);
    

    await new Promise(resolve => setTimeout(resolve, 300));
    

    const supporterElements = [];
    if (oppHandDiv) {
      const allCards = oppHandDiv.querySelectorAll('.card-img');
      for (const cardEl of allCards) {
        const cardSet = cardEl.dataset.set;
        const cardNum = cardEl.dataset.num;

        const isSupporter = supporters.some(c => 
          c.set === cardSet && String(c.number || c.num) === String(cardNum)
        );
        if (isSupporter) {
          supporterElements.push(cardEl);
          cardEl.classList.add('heal-glow');
        }
      }
    }
    
    
    if (supporterElements.length === 0) {

      if (globalThis.renderAllHands) {
        globalThis.renderAllHands();
        await new Promise(resolve => setTimeout(resolve, 200));
        const allCards = oppHandDiv?.querySelectorAll('.card-img') || [];
        for (const cardEl of allCards) {
          const cardSet = cardEl.dataset.set;
          const cardNum = cardEl.dataset.num;
          const isSupporter = supporters.some(c => 
            c.set === cardSet && String(c.number || c.num) === String(cardNum)
          );
          if (isSupporter) {
            supporterElements.push(cardEl);
            cardEl.classList.add('heal-glow');
          }
        }
      }
      
      if (supporterElements.length === 0) {
        showPopup(`No Supporter cards found in opponent's hand.`);

        if (oppHandDiv && globalThis.renderHand) {
          globalThis.renderHand(oppHandDiv, hand, originalHide, false);
        } else if (globalThis.renderAllHands) {
          globalThis.renderAllHands();
        }
        return;
      }
    }
    

    globalThis.__silverSelectionActive = true;
    

    const chosenEl = await awaitSelection(supporterElements, 'heal-glow');
    

    globalThis.__silverSelectionActive = false;
    

    if (oppHandDiv && globalThis.renderHand) {
      globalThis.renderHand(oppHandDiv, hand, originalHide, false);

      const shouldDisable = oppOwner === 'player1' ? 
        (typeof currentPlayer !== 'undefined' && currentPlayer === 'player2') :
        (typeof currentPlayer !== 'undefined' && currentPlayer === 'player1');
      if (shouldDisable) {
        oppHandDiv.classList.add('disable-clicks');
      }
    } else if (globalThis.renderAllHands) {
      globalThis.renderAllHands();
    }
    
    if (!chosenEl) {
      showPopup('No Supporter chosen.');
      return;
    }
    

    const chosenSet = chosenEl.dataset.set;
    const chosenNum = chosenEl.dataset.num;
    const handIndex = hand.findIndex(c => 
      c.set === chosenSet && String(c.number || c.num) === String(chosenNum)
    );
    
    if (handIndex === -1) {
      showPopup('Error: Could not find chosen card.');
      return;
    }
    

    const removed = hand.splice(handIndex, 1)[0];
    deck.push(removed);
    shuffleArray(deck);
    
    if (globalThis.shuffleDeckAndAnimate) {
      globalThis.shuffleDeckAndAnimate(state, opp);
    }
    

    if (globalThis.renderAllHands) {
      globalThis.renderAllHands();
    }
    if (globalThis.updateDeckBubbles) {
      globalThis.updateDeckBubbles();
    }
    
    showPopup(`Shuffled ${removed.name} into opponent's deck!`);
  },
  

  switch_active: async (state, pk, { param1 }, context = {}) => {

    const owner = pk === 'p1' ? 'player1' : 'player2';
    

    const activeImg = getActiveImg(pk);
    if (activeImg) {
      const maxHp = parseInt10(activeImg.dataset.hp);
      const curHp = parseInt10(activeImg.dataset.chp, maxHp);
      if (curHp >= maxHp) {
        throw new Error('Lyra can only be used when your Active Pokémon has damage on it.');
      }
    } else {
      throw new Error('No Active Pokémon.');
    }
    
    if (globalThis.beginPromotionFlow) {
      await globalThis.beginPromotionFlow(owner);
      showPopup('Switched Active Pokémon.');
    } else {
      throw new Error('Switch effect not available.');
    }
  },
  

  use_previous_evolution_attacks: async (state, pk, { param1, param2 }, context = {}) => {

    const targetImg = globalThis.toolAttachTarget;
    if (targetImg) {
      targetImg.dataset.usePreviousEvolutionAttacks = 'true';
      showPopup('Memory Light: This Pokémon can use attacks from previous evolutions!');
    }
  },

  heal_and_remove_status: async (state, pk, { param1 }, context = {}) => {
    const amount = parseInt10(param1, 60);
    

    const allPokemon = getAllPokemonImgs(pk);
    const miltanks = [];
    
    for (const img of allPokemon) {
      try {
        const meta = await globalThis.fetchCardMeta(img.dataset.set, img.dataset.num);
        const name = (meta.name || '').toLowerCase();
        if (name.includes('miltank')) {
          miltanks.push(img);
        }
      } catch {}
    }
    
    if (miltanks.length === 0) {
      showPopup('No Miltank in play.');
      return;
    }
    

    const selected = await awaitSelection(miltanks, 'Select a Miltank to heal:');
    if (!selected) return;
    

    healImg(selected, amount);
    

    selected.dataset.status = '';
    const statusIndicator = selected.closest('.card-slot')?.querySelector('.status-indicator');
    if (statusIndicator) statusIndicator.remove();
    
    showPopup(`Healed ${amount} damage and removed status from ${selected.alt || 'Miltank'}!`);
  },

  search_tools_into_hand: async (state, pk, { param1 }, context = {}) => {
    const numCards = parseInt10(param1, 4);
    const deck = state[pk].deck || [];
    
    if (deck.length === 0) {
      showPopup('Deck is empty!');
      return;
    }
    
    const topCards = deck.slice(0, Math.min(numCards, deck.length));
    const tools = [];
    

    for (const card of topCards) {
      try {
        const meta = await globalThis.fetchCardMeta(card.set, card.number || card.num);
        if (meta && String(meta.trainerType || '').toLowerCase() === 'tool') {
          tools.push(card);
        }
      } catch {}
    }
    

    for (const tool of tools) {
      const idx = deck.findIndex(c => c.set === tool.set && (c.number || c.num) === (tool.number || tool.num));
      if (idx >= 0) {
        deck.splice(idx, 1);
        state[pk].hand.push(tool);
      }
    }
    

    const remaining = topCards.filter(c => !tools.some(t => t.set === c.set && (t.number || t.num) === (c.number || c.num)));
    for (const card of remaining) {
      const idx = deck.findIndex(c => c.set === card.set && (c.number || c.num) === (card.number || card.num));
      if (idx >= 0) {
        deck.splice(idx, 1);
      }
    }
    

    shuffle(deck);
    

    deck.push(...remaining);
    
    renderAllHands();
    updateDeckBubbles();
    
    if (tools.length > 0) {
      showPopup(`Found ${tools.length} Tool card(s) and added to hand!`);
    } else {
      showPopup('No Tool cards found in top cards.');
    }
  },

  reorder_opponent_deck: async (state, pk, { param1, param2 }, context = {}) => {
    const oppPkKey = oppPk(pk);
    const oppDeck = state[oppPkKey].deck || [];
    

    const allPokemon = getAllPokemonImgs(pk);
    let psychicCount = 0;
    
    for (const img of allPokemon) {
      try {
        const meta = await globalThis.fetchCardMeta(img.dataset.set, img.dataset.num);
        const types = meta.types || [];
        if (types.some(t => String(t).toLowerCase() === 'psychic')) {
          psychicCount++;
        }
      } catch {}
    }
    
    if (psychicCount === 0) {
      showPopup('No Psychic Pokémon in play.');
      return;
    }
    
    const numCards = Math.min(psychicCount, oppDeck.length);
    
    if (numCards === 0) {
      showPopup('Opponent\'s deck is empty!');
      return;
    }
    

    const topCards = oppDeck.slice(0, numCards);
    

    const backdrop = document.getElementById('hikerReorderBackdrop');
    const cardsContainer = document.getElementById('hikerReorderCards');
    const title = document.getElementById('hikerReorderTitle');
    const desc = document.getElementById('hikerReorderDesc');
    const doneBtn = document.getElementById('hikerReorderDone');
    
    if (!backdrop || !cardsContainer) {
      showPopup('Reorder UI not available.');
      return;
    }
    
    title.textContent = 'Reorder Opponent\'s Deck';
    desc.textContent = `Reorder the top ${numCards} cards of your opponent's deck.`;
    cardsContainer.innerHTML = '';
    
    const reorderedCards = [...topCards];
    

    for (let i = 0; i < topCards.length; i++) {
      const card = topCards[i];
      const cardDiv = document.createElement('div');
      cardDiv.className = 'hiker-card-draggable';
      cardDiv.style.cssText = 'position:relative;cursor:grab;';
      cardDiv.dataset.index = String(i);
      
      try {
        const meta = await globalThis.fetchCardMeta(card.set, card.number || card.num);
        const img = document.createElement('img');
        img.src = meta.image || 'imgs/cardback.png';
        img.style.cssText = 'width:120px;height:168px;border-radius:8px;border:2px solid #334155;';
        cardDiv.appendChild(img);
        
        const label = document.createElement('div');
        label.textContent = `Position ${i + 1}`;
        label.style.cssText = 'text-align:center;margin-top:4px;font-size:12px;color:#cbd5e1;';
        cardDiv.appendChild(label);
      } catch {
        const placeholder = document.createElement('div');
        placeholder.textContent = card.name || 'Card';
        placeholder.style.cssText = 'width:120px;height:168px;border:2px solid #334155;border-radius:8px;display:flex;align-items:center;justify-content:center;background:#1e293b;color:#cbd5e1;';
        cardDiv.appendChild(placeholder);
      }
      
      cardsContainer.appendChild(cardDiv);
    }
    

    let draggedIndex = null;
    
    cardsContainer.querySelectorAll('.hiker-card-draggable').forEach((cardDiv, idx) => {
      cardDiv.addEventListener('dragstart', (e) => {
        draggedIndex = idx;
        cardDiv.style.opacity = '0.5';
      });
      
      cardDiv.addEventListener('dragover', (e) => {
        e.preventDefault();
        if (draggedIndex === null) return;
        
        const afterElement = getDragAfterElement(cardsContainer, e.clientX);
        const dragging = cardsContainer.children[draggedIndex];
        
        if (afterElement == null) {
          cardsContainer.appendChild(dragging);
        } else {
          cardsContainer.insertBefore(dragging, afterElement);
        }
      });
      
      cardDiv.addEventListener('dragend', () => {
        cardDiv.style.opacity = '1';
        draggedIndex = null;
        

        reorderedCards.length = 0;
        Array.from(cardsContainer.children).forEach((child, i) => {
          const origIdx = parseInt10(child.dataset.index);
          reorderedCards.push(topCards[origIdx]);
        });
      });
    });
    
    function getDragAfterElement(container, x) {
      const draggableElements = [...container.querySelectorAll('.hiker-card-draggable:not(.dragging)')];
      
      return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = x - box.left - box.width / 2;
        
        if (offset < 0 && offset > closest.offset) {
          return { offset: offset, element: child };
        } else {
          return closest;
        }
      }, { offset: Number.NEGATIVE_INFINITY }).element;
    }
    
    backdrop.classList.add('show');
    

    await new Promise(resolve => {
      const handler = () => {
        backdrop.classList.remove('show');
        doneBtn.removeEventListener('click', handler);
        resolve();
      };
      doneBtn.addEventListener('click', handler);
    });
    

    oppDeck.splice(0, numCards);
    oppDeck.unshift(...reorderedCards);
    
    updateDeckBubbles();
    showPopup(`Reordered top ${numCards} cards of opponent's deck!`);
  },

  attach_energy_to_named: async (state, pk, { param1, param2 }) => {
    const energyType = (param1 || 'psychic').toLowerCase();
    const count = parseInt10(param2, 1);
    const targetNames = (param2 || '').split(',').map(n => n.trim().toLowerCase());
    

    const allPokemon = getAllPokemonImgs(pk);
    const targets = [];
    
    for (const img of allPokemon) {
      const name = (img.alt || '').toLowerCase();
      if (targetNames.some(tn => name.includes(tn))) {
        targets.push(img);
      }
    }
    
    if (targets.length === 0) {
      showPopup(`No matching Pokémon found (${targetNames.join(', ')})`);
      return;
    }
    

    for (const target of targets) {
      for (let i = 0; i < count; i++) {
        attachEnergy(target, energyType);
      }
    }
    
    showPopup(`Attached ${count} ${energyType} Energy to ${targets.length} Pokémon!`);
  },

  attach_from_discard_to_active: async (state, pk, { param1, param2 }) => {
    const energyType = (param1 || 'fire').toLowerCase();
    const count = parseInt10(param2, 1);
    const activeImg = getActiveImg(pk);
    
    if (!activeImg) {
      showPopup('No Active Pokémon.');
      return;
    }
    

    try {
      const meta = await globalThis.fetchCardMeta(activeImg.dataset.set, activeImg.dataset.num);
      const hasType = meta.types?.some(t => t.toLowerCase() === energyType);
      
      if (!hasType) {
        showPopup(`Active Pokémon is not ${energyType} type.`);
        return;
      }
    } catch {
      showPopup('Could not verify Active Pokémon type.');
      return;
    }
    

    const owner = pk === 'p1' ? 'player1' : 'player2';
    const energyCounts = globalThis.playerState?.[owner]?.discard?.energyCounts || {};
    
    if (!energyCounts[energyType] || energyCounts[energyType] < count) {
      showPopup(`Not enough ${energyType} Energy in discard pile.`);
      return;
    }
    

    for (let i = 0; i < count; i++) {
      attachEnergy(activeImg, energyType);
      energyCounts[energyType]--;
    }
    

    if (globalThis.renderDiscard) {
      globalThis.renderDiscard(owner);
    }
    
    showPopup(`Flame Patch: Attached ${count} ${energyType} Energy from discard!`);
  },

  draw_on_ko_tool: async (state, pk, { param1 }, context = {}) => {

    const toolPokemon = context?.toolPokemon;
    if (toolPokemon) {
      toolPokemon.dataset.drawOnKo = 'true';
    }
  },

  flip_avoid_ko_named: async (state, pk, { param1, param2 }) => {
    const hpAmount = parseInt10(param1, 10);
    const targetNames = (param2 || '').split(',').map(n => n.trim().toLowerCase());
    

    const allPokemon = getAllPokemonImgs(pk);
    const targets = [];
    
    for (const img of allPokemon) {
      const name = (img.alt || '').toLowerCase();
      if (targetNames.some(tn => name.includes(tn))) {
        targets.push(img);
      }
    }
    
    if (targets.length === 0) {
      showPopup(`No matching Pokémon found (${targetNames.join(', ')})`);
      return;
    }
    

    for (const target of targets) {
      target.dataset.flipAvoidKo = String(hpAmount);
      target.dataset.flipAvoidKoNames = targetNames.join(',');
    }
    
    showPopup(`Hala: ${targets.length} Pokémon will flip to avoid KO (survive with ${hpAmount} HP)!`);
  },

  flip_discard_energy_double_heads: async (state, pk, { param1, param2 }) => {
    const oppActive = getActiveImg(oppPk(pk));
    if (!oppActive) {
      showPopup('No opponent Active Pokémon.');
      return;
    }
    
    const flip1 = await flipCoin(pk);
    const flip2 = await flipCoin(pk);
    
    if (flip1 === 'heads' && flip2 === 'heads') {
      const removed = await removeEnergy(oppActive, null, 1);
      if (removed > 0) {
        showPopup('Hitting Hammer: Both heads → Discarded Energy!');
      } else {
        showPopup('Hitting Hammer: Both heads → No Energy to discard.');
      }
    } else {
      showPopup(`Hitting Hammer: ${flip1}, ${flip2} → No effect.`);
    }
  },

  heal_named: async (state, pk, { param1, param2 }) => {
    const amount = parseInt10(param1, 70);
    const targetNames = (param2 || '').split(',').map(n => n.trim().toLowerCase());
    

    const allPokemon = getAllPokemonImgs(pk);
    const targets = [];
    
    for (const img of allPokemon) {
      const name = (img.alt || '').toLowerCase();
      if (targetNames.some(tn => name.includes(tn))) {
        targets.push(img);
      }
    }
    
    if (targets.length === 0) {
      showPopup(`No matching Pokémon found (${targetNames.join(', ')})`);
      return;
    }
    

    showPopup(`Marlon: Choose a Pokémon to heal ${amount} damage.`);
    const chosen = await awaitSelection(targets);
    
    if (chosen && healImg(chosen, amount)) {
      showPopup(`Healed ${amount} damage from ${chosen.alt}!`);
    } else if (chosen) {
      showPopup('No damage to heal on that Pokémon.');
    }
  },

  reduce_incoming_damage_if_high_retreat: async (state, pk, { param1 }, context = {}) => {
    const reduction = parseInt10(param1, 20);
    const toolPokemon = context?.toolPokemon;
    
    if (toolPokemon) {
      toolPokemon.dataset.reduceDamageIfHighRetreat = String(reduction);
    }
  },

  shuffle_random_from_both_hands: async (state, pk) => {
    const p1Hand = state.p1?.hand || [];
    const p2Hand = state.p2?.hand || [];
    
    if (p1Hand.length === 0 && p2Hand.length === 0) {
      showPopup('Both players have no cards in hand.');
      return;
    }
    

    const players = [];
    if (p1Hand.length > 0) players.push({ pk: 'p1', hand: p1Hand, owner: 'player1' });
    if (p2Hand.length > 0) players.push({ pk: 'p2', hand: p2Hand, owner: 'player2' });
    
    const chosenPlayer = players[Math.floor(Math.random() * players.length)];
    const randomIndex = Math.floor(Math.random() * chosenPlayer.hand.length);
    const card = chosenPlayer.hand.splice(randomIndex, 1)[0];
    

    const deck = state[chosenPlayer.pk]?.deck || [];
    deck.push(card);
    
    if (globalThis.shuffleDeckAndAnimate) {
      globalThis.shuffleDeckAndAnimate(state, chosenPlayer.pk);
    }
    
    showPopup(`Prank Spinner: Shuffled ${card.name || 'a card'} from ${chosenPlayer.owner}'s hand into their deck!`);
  },

  search_pokemon_then_shuffle: async (state, pk, { param1, param2 }) => {
    const count = parseInt10(param1, 2);
    const deck = state[pk]?.deck || [];
    const owner = pk === 'p1' ? 'player1' : 'player2';
    
    if (deck.length === 0) {
      showPopup('Deck is empty.');
      return;
    }
    

    const pokemonCards = [];
    for (const card of deck) {
      try {
        const meta = await globalThis.fetchCardMeta(card.set, card.number || card.num);
        if (meta.category === 'Pokemon') {
          pokemonCards.push(card);
        }
      } catch {}
    }
    
    if (pokemonCards.length === 0) {
      showPopup('No Pokémon in deck.');
      return;
    }
    

    const chosen = [];
    for (let i = 0; i < Math.min(count, pokemonCards.length); i++) {
      const randomIndex = Math.floor(Math.random() * pokemonCards.length);
      chosen.push(pokemonCards.splice(randomIndex, 1)[0]);
    }
    

    for (const card of chosen) {
      const deckIndex = deck.findIndex(c => c.set === card.set && (c.number || c.num) === (card.number || card.num));
      if (deckIndex !== -1) {
        deck.splice(deckIndex, 1);
        state[pk].hand = state[pk].hand || [];
        state[pk].hand.push(card);
      }
    }
    

    if (globalThis.playerState?.[owner]) {
      globalThis.playerState[owner].hand = state[pk].hand;
      globalThis.playerState[owner].deck = deck;
    }
    

    if (globalThis.renderAllHands) globalThis.renderAllHands();
    if (globalThis.updateDeckBubbles) globalThis.updateDeckBubbles();
    
    showPopup(`May: Added ${chosen.length} Pokémon to hand!`);
    if (globalThis.logEvent && chosen.length > 0) {
      const owner = pk === 'p1' ? 'player1' : 'player2';
      for (const card of chosen) {
        globalThis.logEvent({
          player: owner,
          text: `Found ${card.name} from deck search`,
          cardSet: card.set,
          cardNum: card.number || card.num
        });
      }
    }
    

    await new Promise(resolve => setTimeout(resolve, 300));
    

    const hand = state[pk]?.hand || [];
    
    if (hand.length < count) {

      showPopup(`May: Not enough cards in hand to shuffle back.`);
      return;
    }
    

    const pokemonInHand = [];
    for (const card of hand) {
      try {
        const meta = await globalThis.fetchCardMeta(card.set, card.number || card.num);
        if (meta.category === 'Pokemon') {
          pokemonInHand.push(card);
        }
      } catch {}
    }
    
    if (pokemonInHand.length < count) {
      showPopup(`May: Not enough Pokémon in hand to shuffle back.`);
      return;
    }
    
    showPopup(`May: Choose ${count} Pokémon from hand to shuffle back into deck.`);
    

    globalThis.__maySelectionActive = true;
    globalThis.__maySelection = {
      pk,
      owner,
      hand,
      pokemonInHand,
      count,
      selected: []
    };
    

    if (globalThis.renderAllHands) {
      globalThis.renderAllHands();
    }
    

    const selectedCards = await new Promise((resolve) => {
      globalThis.__mayResolve = resolve;
    });
    

    globalThis.__maySelectionActive = false;
    globalThis.__maySelection = null;
    globalThis.__mayResolve = null;
    
    if (!selectedCards || selectedCards.length !== count) {
      showPopup(`May: Selection cancelled or incomplete.`);

      if (globalThis.renderAllHands) globalThis.renderAllHands();
      return;
    }
    

    for (const card of selectedCards) {
      const handIndex = hand.findIndex(c => 
        c.set === card.set && (c.number || c.num) === (card.number || card.num)
      );
      if (handIndex !== -1) {
        const cardToShuffle = hand.splice(handIndex, 1)[0];
        deck.push(cardToShuffle);
      }
    }
    

    if (globalThis.playerState?.[owner]) {
      globalThis.playerState[owner].hand = hand;
      globalThis.playerState[owner].deck = deck;
    }
    
    shuffleDeckAndAnimate(state, pk);
    if (globalThis.renderAllHands) globalThis.renderAllHands();
    if (globalThis.updateDeckBubbles) globalThis.updateDeckBubbles();
    
    showPopup(`May: Shuffled ${selectedCards.length} Pokémon back into deck!`);
  },

  search_basic_pokemon_hp_limit: async (state, pk, { param1, param2 }) => {
    const count = parseInt10(param1, 2);
    const maxHp = parseInt10(param2, 50);
    const deck = state[pk]?.deck || [];
    
    if (deck.length === 0) {
      showPopup('Deck is empty.');
      return;
    }
    

    const eligibleCards = [];
    for (const card of deck) {
      try {
        const meta = await globalThis.fetchCardMeta(card.set, card.number || card.num);
        if (meta.category === 'Pokemon' && 
            meta.stage?.toLowerCase() === 'basic' &&
            meta.hp && parseInt10(meta.hp) <= maxHp) {
          eligibleCards.push(card);
        }
      } catch {}
    }
    
    if (eligibleCards.length === 0) {
      showPopup(`No Basic Pokémon with ${maxHp} HP or less in deck.`);
      return;
    }
    

    const chosen = [];
    for (let i = 0; i < Math.min(count, eligibleCards.length); i++) {
      const randomIndex = Math.floor(Math.random() * eligibleCards.length);
      chosen.push(eligibleCards.splice(randomIndex, 1)[0]);
    }
    

    for (const card of chosen) {
      const deckIndex = deck.findIndex(c => c.set === card.set && (c.number || c.num) === (card.number || card.num));
      if (deckIndex !== -1) {
        deck.splice(deckIndex, 1);
        state[pk].hand = state[pk].hand || [];
        state[pk].hand.push(card);
      }
    }
    
    shuffleDeckAndAnimate(state, pk);
    if (globalThis.renderAllHands) globalThis.renderAllHands();
    if (globalThis.updateDeckBubbles) globalThis.updateDeckBubbles();
    
    showPopup(`Lisia: Added ${chosen.length} Basic Pokémon (≤${maxHp} HP) to hand!`);
  },

  heal_if_half_hp_tool: async (state, pk, { param1 }, context = {}) => {
    const amount = parseInt10(param1, 30);
    const toolPokemon = context?.toolPokemon;
    
    if (toolPokemon) {
      toolPokemon.dataset.healIfHalfHp = String(amount);
    }
  },

  shuffle_hand_draw_match_opponent: async (state, pk, { param1, param2 }) => {
    const opp = oppPk(pk);
    const owner = pk === 'p1' ? 'player1' : 'player2';
    const oppOwner = opp === 'p1' ? 'player1' : 'player2';
    

    // Get opponent's hand size - try multiple sources
    // [COPYCAT-FIX] Get opponent's hand size BEFORE shuffling our hand to ensure accurate count
    let oppHandSize = 0;
    
    // First, try from playerState (correct structure)
    if (globalThis.playerState && globalThis.playerState[oppOwner] && globalThis.playerState[oppOwner].hand) {
      oppHandSize = globalThis.playerState[oppOwner].hand.length;
    }
    
    // If still 0, try from state object
    if (oppHandSize === 0 && state[opp] && state[opp].hand) {
      oppHandSize = state[opp].hand.length;
    }
    
    // If still 0, try to get it from the UI directly (for online mode)
    if (oppHandSize === 0 && typeof document !== 'undefined') {
      const oppHandDiv = oppOwner === 'player1' ? document.querySelector('#p1Hand') : document.querySelector('#p2Hand');
      if (oppHandDiv) {
        const oppHandCards = oppHandDiv.querySelectorAll('img');
        oppHandSize = oppHandCards.length;
      }
    }
    
    console.log('[Copycat] Opponent hand size:', {
      oppOwner,
      oppHandSize,
      fromPlayerState: globalThis.playerState?.[oppOwner]?.hand?.length,
      fromState: state[opp]?.hand?.length
    });
    
    // [COPYCAT-FIX] Ensure we have a valid hand size
    if (oppHandSize === 0) {
      console.warn('[Copycat] Could not determine opponent hand size, defaulting to 0');
    }
    
    

    const myHand = [...(globalThis.playerState?.[owner]?.hand || [])];
    const myDeck = globalThis.playerState?.[owner]?.deck || [];
    
    if (myHand.length === 0) {
      showPopup('No cards in hand to shuffle.');
      return;
    }
    

    for (const card of myHand) {
      myDeck.push(card);
    }
    

    // Clear hand
    globalThis.playerState[owner].hand = [];
    

    // Shuffle deck
    shuffleArray(myDeck);
    
    // Update playerState deck
    globalThis.playerState[owner].deck = myDeck;
    

    if (globalThis.animateDeckShuffle) {
      globalThis.animateDeckShuffle(owner);
    }
    

    // Update state objects
    state[pk].hand = [];
    state[pk].deck = [...myDeck];
    

    // Draw cards - use the shuffled deck directly
      const drawnCards = [];
      for (let i = 0; i < oppHandSize && myDeck.length > 0; i++) {
        const card = myDeck.shift();
        if (card) {
          drawnCards.push(card);
        }
      }
    
    // Update all state objects with the drawn cards and remaining deck
      globalThis.playerState[owner].hand = drawnCards;
      globalThis.playerState[owner].deck = myDeck;
      state[pk].hand = [...drawnCards];
      state[pk].deck = [...myDeck];
    
    // Also update playerState if it exists separately
    if (typeof playerState !== 'undefined' && playerState && playerState[owner]) {
      playerState[owner].hand = [...drawnCards];
      playerState[owner].deck = [...myDeck];
    }
    state[opp].hand = globalThis.playerState[oppOwner].hand;
    
    const actualDrawn = globalThis.playerState[owner].hand.length;
    showPopup(`Copycat: Shuffled hand into deck, drew ${actualDrawn} card(s) (opponent has ${oppHandSize} cards)!`);
    
    // Sync to Firebase if in online mode
    if (typeof globalThis.updateGameStatePartial === 'function') {
      const getCurrentMatchIdFn = globalThis.getCurrentMatchId;
      const matchId = getCurrentMatchIdFn ? getCurrentMatchIdFn() : null;
      const isOnline = matchId && typeof window !== 'undefined' && window.firebaseDatabase;
      if (isOnline) {
        const isCurrentPlayer1Fn = globalThis.isCurrentPlayer1;
        const isP1 = (isCurrentPlayer1Fn && typeof isCurrentPlayer1Fn === 'function') ? isCurrentPlayer1Fn() : false;
        const matchPlayer = (isP1 && owner === 'player1') || (!isP1 && owner === 'player2') 
          ? 'player1' 
          : 'player2';
        try {
          await globalThis.updateGameStatePartial({
            [`${matchPlayer}/hand`]: drawnCards,
            [`${matchPlayer}/deck`]: myDeck
          });
        } catch (error) {
          console.error('[shuffle_hand_draw_match_opponent] Error syncing to Firebase:', error);
        }
      }
    }

    if (globalThis.renderAllHands) globalThis.renderAllHands();
    if (globalThis.updateDeckBubbles) globalThis.updateDeckBubbles();
  },
};

globalThis.TRAINER_EFFECTS = TRAINER_EFFECTS;
if (typeof window !== 'undefined') {
  window.TRAINER_EFFECTS = TRAINER_EFFECTS;
}

const MOVE_HANDLERS = {

  inflict_status: async (s, pk, { param1 }, ctx) => {
    if (!ctx.isFinal) return;
    applyStatus(oppPk(pk), param1);
    showPopup(`Inflicted ${param1}!`);
  },
  
  inflict_paralysis: async (s, pk, p, ctx) => { if (ctx.isFinal) { applyStatus(oppPk(pk), 'paralysis'); showPopup('Paralyzed!'); } },
  inflict_sleep: async (s, pk, p, ctx) => { if (ctx.isFinal) { applyStatus(oppPk(pk), 'sleep'); showPopup('Asleep!'); } },
  inflict_poison: async (s, pk, p, ctx) => { if (ctx.isFinal) { applyStatus(oppPk(pk), 'poison'); showPopup('Poisoned!'); } },
  inflict_burn: async (s, pk, p, ctx) => { if (ctx.isFinal) { applyStatus(oppPk(pk), 'burn'); showPopup('Burned!'); } },
  inflict_confusion: async (s, pk, p, ctx) => { if (ctx.isFinal) { applyStatus(oppPk(pk), 'confusion'); showPopup('Confused!'); } },
  
  flip_inflict_status_if_heads: async (s, pk, { param1 }, ctx) => {
    if (!ctx.isFinal) return;
    if ((await flipCoin(pk)) === 'heads') { applyStatus(oppPk(pk), param1); showPopup(`HEADS → ${param1}!`); }
    else showPopup('TAILS → no effect.');
  },
  
  flip_inflict_effect_if_heads: async (s, pk, { param1, param2 }, ctx) => {
    if (!ctx.isFinal) return;
    
    const effect = param1?.toLowerCase();
    const opp = oppPk(pk);
    

    globalThis.__specialEffects ??= { p1: {}, p2: {} };
    

    const effectText = ctx.moveRowText || '';
    const isFlipUntilTails = /flip.*until.*tails/i.test(effectText) || /for each heads/i.test(effectText);
    
    if (isFlipUntilTails && effect === 'discard_energy') {

      let headsCount = 0;
      let flipResult = await flipCoin(pk);
      
      while (flipResult === 'heads') {
        headsCount++;
        const oppImg = getActiveImg(opp);
        if (oppImg) {
          const count = parseInt10(param2, 1);
          const removed = await removeEnergy(oppImg, null, count);
          if (removed > 0) {
            showPopup(`HEADS (${headsCount}) → Discarded ${removed} Energy!`);
          } else {
            showPopup(`HEADS (${headsCount}) → No Energy to discard.`);
            break;
          }
        } else {
          showPopup(`HEADS (${headsCount}) → No opponent Active Pokémon.`);
          break;
        }
        

        flipResult = await flipCoin(pk);
      }
      
      if (headsCount === 0) {
        showPopup('TAILS → No effect.');
      } else if (flipResult === 'tails') {
        showPopup(`TAILS after ${headsCount} heads.`);
      }
      return;
    }
    

    if ((await flipCoin(pk)) === 'tails') {
      showPopup('TAILS → no effect.');
      return;
    }
    
    switch (effect) {
      case 'attack_lock':
        globalThis.__specialEffects[opp].attackLock = true;
        showPopup("HEADS → Opponent can't attack next turn!");
        break;
        
      case 'prevent_damage_next_turn':
        globalThis.__specialEffects[pk].preventDamage = true;
        showPopup("HEADS → This Pokémon will take no damage next turn!");
        break;
        
      case 'discard_energy':

        const oppImg = getActiveImg(opp);
        if (oppImg) {
          const count = parseInt10(param2, 1);
          const removed = await removeEnergy(oppImg, null, count);
          if (removed > 0) {
            showPopup(`HEADS → Discarded ${removed} Energy from opponent!`);
          } else {
            showPopup('HEADS → No Energy to discard.');
          }
        } else {
          showPopup('HEADS → No opponent Active Pokémon.');
        }
        break;
        
      default:

        if (STATUS_TYPES.has(effect)) {
          applyStatus(opp, param1);
          showPopup(`HEADS → ${param1}!`);
        } else {
          showPopup(`HEADS → ${param1}!`);
        }
    }
  },
  

  cant_attack_next_turn: async (s, pk, { param1, param2 }, ctx) => {
    if (!ctx.isFinal) return;
    

    globalThis.__specialEffects ??= { p1: {}, p2: {} };
    if (!globalThis.__specialEffects[pk]) globalThis.__specialEffects[pk] = {};
    

    const currentTurn = globalThis.turnNumber || 0;
    globalThis.__specialEffects[pk].attackLock = {
      locked: true,
      lockedOnTurn: currentTurn
    };
    showPopup("During your next turn, this Pokémon can't attack.");
  },
  
  inflict_effect: async (s, pk, { param1, param2 }, ctx) => {
    if (!ctx.isFinal) return;
    
    const effect = param1?.toLowerCase();
    const opp = oppPk(pk);
    

    globalThis.__specialEffects ??= { p1: {}, p2: {} };
    

    if (effect === 'cant_attack_next_turn' && ctx.moveName) {
      ctx.moveName = ctx.moveName;
    }
    
    switch (effect) {
      case 'attack_lock':
        globalThis.__specialEffects[opp].attackLock = true;
        showPopup("Opponent can't attack next turn!");
        break;
        
      case 'block_supporter':
        globalThis.__specialEffects[opp].supporterBlock = true;
        showPopup("Opponent can't use Supporters next turn!");
        break;
        
      case 'block_items':
        globalThis.__specialEffects[opp].itemBlock = true;
        showPopup("Opponent can't use Item cards next turn!");
        break;
        
      case 'retreat_lock':
        globalThis.__specialEffects[opp].retreatLock = true;
        showPopup("Opponent can't retreat next turn!");
        break;
        
      case 'prevent_damage_next_turn':
        globalThis.__specialEffects[pk].preventDamage = true;
        showPopup("This Pokémon will take no damage next turn!");
        break;
        
      case 'reduce_damage_next_turn':
        const reduction = parseInt10(param2, 20);
        globalThis.__specialEffects[pk].damageReduction = reduction;
        showPopup(`This Pokémon will take ${reduction} less damage next turn!`);
        break;
        
      case 'cant_attack_next_turn':

        const attackerImg = getActiveImg(pk);
        if (attackerImg) {
          const instanceId = attackerImg.dataset.instanceId;

          const moveName = ctx?.moveName || ctx?.rawCtx?.moveName || '';
          

          let isMoveSpecific = false;
          if (moveName) {

            let text = ctx?.moveRowText || '';
            

            if (!text) {
              try {

                await loadMoveEffects();

                const moveRow = getMoveRow(attackerImg.alt, moveName);

                text = moveRow?.effect_text || moveRow?.text || '';
              } catch (e) {

              }
            }
            
            if (text) {
              const textLower = text.toLowerCase();
              const moveNameLower = moveName.toLowerCase();

              isMoveSpecific = textLower.includes(`can't use ${moveNameLower}`) || 
                              textLower.includes(`cannot use ${moveNameLower}`) ||
                              textLower.includes(`can't use this ${moveNameLower}`) ||
                              textLower.includes(`cannot use this ${moveNameLower}`);
            }

          }

          
          if (instanceId && moveName && isMoveSpecific) {

            if (!globalThis.__moveLocks) globalThis.__moveLocks = { p1: {}, p2: {} };
            if (!globalThis.__moveLocks[pk]) globalThis.__moveLocks[pk] = {};
            if (!globalThis.__moveLocks[pk][instanceId]) globalThis.__moveLocks[pk][instanceId] = {};
            

            const moveNameLower = moveName.toLowerCase();
            const currentTurn = globalThis.turnNumber || 0;
            globalThis.__moveLocks[pk][instanceId][moveNameLower] = {
              locked: true,
              lockedOnTurn: currentTurn
            };
            showPopup(`During your next turn, this Pokémon can't use ${moveName}.`);
          } else {

            if (!globalThis.__specialEffects) globalThis.__specialEffects = { p1: {}, p2: {} };
            if (!globalThis.__specialEffects[pk]) globalThis.__specialEffects[pk] = {};
            globalThis.__specialEffects[pk].attackLock = true;
            showPopup("During your next turn, this Pokémon can't attack.");
          }
        } else {

          if (!globalThis.__specialEffects) globalThis.__specialEffects = { p1: {}, p2: {} };
          if (!globalThis.__specialEffects[pk]) globalThis.__specialEffects[pk] = {};
          globalThis.__specialEffects[pk].attackLock = true;
          showPopup("During your next turn, this Pokémon can't attack.");
        }
        break;
        
      default:

        if (STATUS_TYPES.has(effect)) {
          applyStatus(opp, param1);
        } else {
          showPopup(`Applied ${param1}.`);
        }
    }
  },

  heal_self: async (s, pk, { param1 }, ctx) => {
    if (!ctx.isFinal) return;
    const amt = parseInt10(param1);
    healImg(getActiveImg(pk), amt);
    showPopup(`Healed ${amt} damage.`);
  },
  
  heal_equal_to_damage_done: async (s, pk, p, ctx) => {
    if (!ctx.isFinal || !ctx.rawCtx?.damageDealt) return;
    healImg(getActiveImg(pk), ctx.rawCtx.damageDealt);
    showPopup(`Healed ${ctx.rawCtx.damageDealt} damage.`);
  },

  bonus_damage_if_opponent_damaged: async (s, pk, { param1 }, ctx) => {
    const { base, cur } = getHpFromImg(getActiveImg(oppPk(pk)));
    if (cur < base) ctx.addBonus(parseInt10(param1));
  },
  
  bonus_damage_if_self_damaged: async (s, pk, { param1 }, ctx) => {
    const { base, cur } = getHpFromImg(getActiveImg(pk));
    if (cur < base) ctx.addBonus(parseInt10(param1));
  },
  
  bonus_damage_for_each_energy_on_opponent: async (s, pk, { param1 }, ctx) => {
    ctx.addBonus(countEnergy(getActiveImg(oppPk(pk))) * parseInt10(param1));
  },
  
  bonus_damage_for_each_bench: async (s, pk, { param1 }, ctx) => {

    const img = getActiveImg(pk);
    let moveRow = null;
    if (img && ctx?.moveName) {
      await loadMoveEffects();
      moveRow = getMoveRow(img.alt, ctx.moveName);
    }
    const effectText = (moveRow?.effect_text || moveRow?.text || ctx?.moveRowText || '').toLowerCase();
    const attackName = (ctx?.moveName || '').toLowerCase();
    
    const countBoth = effectText.includes('both') || attackName === 'crystal waltz';
    
    const filterValidBench = (benchImgs) => {
      return benchImgs.filter(img => 
        img && 
        img.alt && 
        img.dataset.set && 
        img.dataset.num
      );
    };
    
    if (countBoth) {

      const ownBenchImgs = filterValidBench(getBenchImgs(pk));
      const oppBenchImgs = filterValidBench(getBenchImgs(oppPk(pk)));
      const ownBench = ownBenchImgs.length;
      const oppBench = oppBenchImgs.length;
      const totalBench = ownBench + oppBench;
      ctx.addBonus(totalBench * parseInt10(param1));
    } else {

      const benchImgs = filterValidBench(getBenchImgs(pk));
      const ownBench = benchImgs.length;
      const bonus = ownBench * parseInt10(param1);
      ctx.addBonus(bonus);
    }
  },
  
  bonus_damage_for_each_typed_bench: async (s, pk, { param1, param2 }, ctx) => {
    const type = param1?.toLowerCase();
    const per = parseInt10(param2);
    let count = 0;
    
    for (const img of getBenchImgs(pk)) {
      try {
        const meta = await globalThis.fetchCardMeta(img.dataset.set, img.dataset.num);
        if (meta.types?.some(t => t.toLowerCase() === type)) count++;
      } catch {}
    }
    ctx.addBonus(count * per);
  },
  
  bonus_damage_for_each_named_bench: async (s, pk, { param1, param2 }, ctx) => {
    const name = param1?.toLowerCase();
    const count = getBenchImgs(pk).filter(img => (img.alt || '').toLowerCase() === name).length;
    ctx.addBonus(count * parseInt10(param2));
  },
  
  bonus_damage_if_opponent_poisoned: async (s, pk, { param1 }, ctx) => {
    if (getActiveImg(oppPk(pk))?.dataset.status?.toLowerCase() === 'poisoned') {
      ctx.addBonus(parseInt10(param1));
    }
  },
  

  bonus_damage_if_damaged_last_turn: async (s, pk, { param1 }, ctx) => {
    const activeImg = getActiveImg(pk);
    if (!activeImg) return;
    

    if (!globalThis.state) globalThis.state = {};
    if (!globalThis.state.damagedLastTurn) globalThis.state.damagedLastTurn = {};
    
    const instanceId = activeImg.dataset.instanceId;
    const wasDamaged = instanceId && globalThis.state.damagedLastTurn[instanceId];
    
    if (wasDamaged) {
      ctx.addBonus(parseInt10(param1));
      showPopup(`Reply Strongly: +${param1} damage (was damaged last turn)!`);
    }
  },
  

  bonus_damage_if_evolution: async (s, pk, { param1 }, ctx) => {
    const oppImg = getActiveImg(oppPk(pk));
    if (!oppImg) return;
    
    try {
      const meta = await globalThis.fetchCardMeta(oppImg.dataset.set, oppImg.dataset.num);
      const stage = meta.stage?.toLowerCase();
      if (stage === 'stage1' || stage === 'stage2' || stage === 'vmax' || stage === 'vstar') {
        ctx.addBonus(parseInt10(param1));
        showPopup(`Cross-Cut: +${param1} damage (opponent is Evolution)!`);
      }
    } catch {}
  },
  

  bonus_damage_if_no_damage_self: async (s, pk, { param1 }, ctx) => {
    const activeImg = getActiveImg(pk);
    if (!activeImg) return;
    
    const { base, cur } = getHpFromImg(activeImg);
    if (cur >= base) {
      ctx.addBonus(parseInt10(param1));
      showPopup(`Single Lunge: +${param1} damage (no damage on this Pokémon)!`);
    }
  },
  

  bonus_damage_if_opponent_burned: async (s, pk, { param1 }, ctx) => {
    const oppImg = getActiveImg(oppPk(pk));
    if (oppImg?.dataset.status?.toLowerCase() === 'burned') {
      ctx.addBonus(parseInt10(param1));
      showPopup(`+${param1} damage (opponent is Burned)!`);
    }
  },
  

  bonus_damage_if_switched_in: async (s, pk, { param1 }, ctx) => {
    const activeImg = getActiveImg(pk);
    if (!activeImg) return;
    
    const playedTurn = parseInt(activeImg.dataset.playedTurn || '0', 10);
    if (playedTurn === globalThis.turnNumber) {
      ctx.addBonus(parseInt10(param1));
      showPopup(`+${param1} damage (switched in this turn)!`);
    }
  },
  

  bonus_damage_if_tool: async (s, pk, { param1 }, ctx) => {
    const activeImg = getActiveImg(pk);
    if (!activeImg) return;
    
    const slot = getSlotFromImg(activeImg);
    const hasTool = slot?.querySelector('.tool-attachment') !== null;
    
    if (hasTool) {
      ctx.addBonus(parseInt10(param1));
      showPopup(`+${param1} damage (Tool attached)!`);
    }
  },
  

  bonus_damage_if_type: async (s, pk, { param1, param2 }, ctx) => {
    const oppImg = getActiveImg(oppPk(pk));
    if (!oppImg) return;
    
    const targetType = (param1 || '').toLowerCase();
    try {
      const meta = await globalThis.fetchCardMeta(oppImg.dataset.set, oppImg.dataset.num);
      if (meta.types?.some(t => t.toLowerCase() === targetType)) {
        ctx.addBonus(parseInt10(param2));
        showPopup(`+${param2} damage (opponent is ${targetType}-type)!`);
      }
    } catch {}
  },
  

  boost_next_attack: async (s, pk, { param1 }, ctx) => {
    if (!ctx.isFinal) return;
    
    if (!globalThis.state) globalThis.state = {};
    if (!globalThis.state.damageBoost) globalThis.state.damageBoost = {};
    if (!globalThis.state.damageBoost[pk]) globalThis.state.damageBoost[pk] = {};
    
    const activeImg = getActiveImg(pk);
    const instanceId = activeImg?.dataset.instanceId;
    if (instanceId) {
      globalThis.state.damageBoost[pk][instanceId] = {
        amount: parseInt10(param1),
        duration: 'next_attack'
      };
      showPopup(`Next attack does +${param1} damage!`);
    }
  },
  

  discard_bench_for_bonus_damage: async (s, pk, { param1, param2 }, ctx) => {
    if (!ctx.isFinal) return;
    
    const benchImgs = getBenchImgs(pk);
    if (benchImgs.length === 0) {
      showPopup('No benched Pokémon to discard.');
      return;
    }
    
    showPopup(`Choose a benched Pokémon to discard for +${param2} damage.`);
    const chosen = await awaitSelection(benchImgs);
    
    if (chosen) {

      if (globalThis.pushCardToDiscard) {
        const owner = pk === 'p1' ? 'player1' : 'player2';
        globalThis.pushCardToDiscard(owner, chosen);
      }
      

      const slot = chosen.closest('.card-slot');
      if (slot) {
        slot.remove();
      }
      
      ctx.addBonus(parseInt10(param2));
      showPopup(`Discarded ${chosen.alt} for +${param2} damage!`);
    }
  },
  
  extra_damage_if_extra_energy_attached: async (s, pk, { param1, param2 }, ctx) => {
    const img = getActiveImg(pk);
    if (!img) return;
    
    let energyType, needed, bonus;
    

    if (param1 && param1.includes('|')) {

      const parts = param1.split('|').map(v => parseInt10(v));
      needed = parts[0] || 2;
      bonus = parts[1] || 60;
      energyType = 'fighting';
    } else {

      energyType = (param1 || 'fighting').toLowerCase();
      const parts = (param2 || '').split('|').map(v => parseInt10(v));
      needed = parts[0] || 2;
      bonus = parts[1] || 50;
    }
    

    const totalEnergy = countEnergy(img, energyType);
    

    let attackCost = 0;
    

    if (ctx.rawCtx?.attackCost && Array.isArray(ctx.rawCtx.attackCost)) {

      attackCost = ctx.rawCtx.attackCost.filter(c => {
        const costType = String(c || '').toLowerCase();

        if (energyType === 'fighting') {
          return costType === 'fighting' || costType === 'fight';
        }
        return costType === energyType;
      }).length;
    } else {

      try {
        if (ctx.moveName && img.dataset.set && img.dataset.num) {
          const meta = await globalThis.fetchCardMeta?.(img.dataset.set, img.dataset.num);
          if (meta?.attacks) {
            const attack = meta.attacks.find(a => normStr(a.name) === normStr(ctx.moveName));
            if (attack?.cost) {

              attackCost = (attack.cost || []).filter(c => {
                const costType = String(c || '').toLowerCase();

                if (energyType === 'fighting') {
                  return costType === 'fighting' || costType === 'fight';
                }
                return costType === energyType;
              }).length;
            } else {
              attackCost = 1;
            }
          } else {
            attackCost = 1;
          }
        } else {
          attackCost = 1;
        }
      } catch (err) {
        console.error('[extra_damage_if_extra_energy] Error fetching attack cost:', err);

        attackCost = 1;
      }
    }
    

    const extraEnergy = Math.max(0, totalEnergy - attackCost);
    
    if (extraEnergy >= needed) {
      const beforeDamage = ctx.damage;
      ctx.addBonus(bonus);
      if (ctx.isFinal) {
        showPopup(`Extra ${energyType} Energy: +${bonus} damage! (${extraEnergy} extra, need ${needed})`);
      }
    } else {
    }
  },

  flip_bonus_damage_if_heads: async (s, pk, { param2 }, ctx) => {
    if (!ctx.isFinal) return;
    if ((await flipCoin(pk)) === 'heads') ctx.addBonus(parseInt10(param2));
  },
  
  flip_bonus_damage_with_self_damage: async (s, pk, { param1, param2 }, ctx) => {
    if (!ctx.isFinal) return;
    if ((await flipCoin(pk)) === 'heads') ctx.addBonus(parseInt10(param1));
    else damageImg(getActiveImg(pk), parseInt10(param2));
  },
  
  flip_bonus_if_double_heads: async (s, pk, { param1 }, ctx) => {
    if (!ctx.isFinal) return;
    if ((await flipCoin(pk)) === 'heads' && (await flipCoin(pk)) === 'heads') {
      ctx.addBonus(parseInt10(param1));
    }
  },
  
  flip_multiplier: async (s, pk, { param1, param2 }, ctx) => {
    if (!ctx.isFinal) return;
    let heads = 0;
    for (let i = 0; i < parseInt10(param1); i++) {
      if ((await flipCoin(pk)) === 'heads') heads++;
    }
    ctx.setOverride(heads * parseInt10(param2));
  },
  
  flip_until_tails_multiplier: async (s, pk, { param1 }, ctx) => {
    if (!ctx.isFinal) return;
    let heads = 0;
    while ((await flipCoin(pk)) === 'heads') heads++;
    ctx.setOverride(heads * parseInt10(param1));
  },
  
  flip_do_nothing_if_tails: async (s, pk, { param1 }, ctx) => {
    if (!ctx.isFinal) return;
    

    const effectText = ctx.moveRowText || '';
    const isBonusDamage = /if heads.*does.*more damage/i.test(effectText) || /if heads.*\+/i.test(effectText);
    
    if (isBonusDamage && param1) {

      const bonus = parseInt10(param1, 20);
      if ((await flipCoin(pk)) === 'heads') {
        ctx.addBonus(bonus);
        showPopup(`HEADS → +${bonus} damage!`);
      } else {
        showPopup('TAILS → no bonus damage.');
      }
    } else {

      if ((await flipCoin(pk)) === 'tails') {
        ctx.setOverride(0);
        showPopup('TAILS → Attack does nothing.');
      } else {
        showPopup('HEADS → Attack proceeds.');
      }
    }
  },
  

  flip_block_attack: async (s, pk, { param1 }, ctx) => {
    if (!ctx.isFinal) return;
    
    if ((await flipCoin(pk)) === 'heads') {
      const opp = oppPk(pk);
      globalThis.__specialEffects ??= { p1: {}, p2: {} };
      globalThis.__specialEffects[opp].attackLock = true;
      showPopup('HEADS → Opponent cannot attack next turn!');
    } else {
      showPopup('TAILS → No effect.');
    }
  },
  

  flip_multiplier_bonus: async (s, pk, { param1, param2 }, ctx) => {
    if (!ctx.isFinal) return;
    
    const flips = parseInt10(param1, 2);
    const baseDamage = parseInt10(param2, 0);
    const bonusPerHead = parseInt10(ctx.moveRowText?.match(/\+(\d+)/)?.[1] || '0', 0);
    
    let heads = 0;
    for (let i = 0; i < flips; i++) {
      if ((await flipCoin(pk)) === 'heads') heads++;
    }
    
    const totalDamage = (heads * baseDamage) + (heads * bonusPerHead);
    ctx.setOverride(totalDamage);
    showPopup(`${heads} heads → ${totalDamage} damage!`);
  },
  

  flip_multiplier_self_confuse: async (s, pk, { param1, param2 }, ctx) => {
    if (!ctx.isFinal) return;
    
    const flips = parseInt10(param1, 2);
    const damagePerHead = parseInt10(param2, 0);
    
    let heads = 0;
    for (let i = 0; i < flips; i++) {
      if ((await flipCoin(pk)) === 'heads') heads++;
    }
    
    ctx.setOverride(heads * damagePerHead);
    

    const activeImg = getActiveImg(pk);
    if (activeImg) {
      applyStatus(pk, 'confusion');
      showPopup(`${heads} heads → ${heads * damagePerHead} damage, but ${activeImg.alt} is now Confused!`);
    }
  },
  

  flip_prevent_damage_next_turn: async (s, pk, { param1 }, ctx) => {
    if (!ctx.isFinal) return;
    
    if ((await flipCoin(pk)) === 'heads') {
      globalThis.__specialEffects ??= { p1: {}, p2: {} };
      globalThis.__specialEffects[pk].preventDamage = true;
      showPopup('HEADS → This Pokémon will take no damage next turn!');
    } else {
      showPopup('TAILS → No effect.');
    }
  },
  

  flip_set_hp: async (s, pk, { param1, param2 }, ctx) => {
    if (!ctx.isFinal) return;
    
    const targetHp = parseInt10(param1, 10);
    
    if ((await flipCoin(pk)) === 'heads') {
      const oppImg = getActiveImg(oppPk(pk));
      if (oppImg) {
        const slot = oppImg.closest('.card-slot');
        const maxHp = parseInt10(oppImg.dataset.hp, 0);
        const newHp = Math.min(targetHp, maxHp);
        
        oppImg.dataset.chp = String(newHp);
        if (globalThis.setHpOnImage) {
          globalThis.setHpOnImage(oppImg, maxHp, newHp);
        }
        
        showPopup(`HEADS → Set opponent's HP to ${newHp}!`);
      }
    } else {
      showPopup('TAILS → No effect.');
    }
  },
  

  flip_shuffle_random_from_hand: async (s, pk, { param1 }, ctx) => {
    if (!ctx.isFinal) return;
    
    if ((await flipCoin(pk)) === 'heads') {
      const opp = oppPk(pk);
      const hand = s[opp]?.hand || [];
      
      if (hand.length === 0) {
        showPopup('HEADS → Opponent has no cards in hand.');
        return;
      }
      
      const randomIndex = Math.floor(Math.random() * hand.length);
      const card = hand.splice(randomIndex, 1)[0];
      

      const deck = s[opp]?.deck || [];
      deck.push(card);
      
      if (globalThis.shuffleDeckAndAnimate) {
        globalThis.shuffleDeckAndAnimate(s, opp);
      }
      
      showPopup(`HEADS → Shuffled ${card.name || 'a card'} from opponent's hand into their deck!`);
    } else {
      showPopup('TAILS → No effect.');
    }
  },

  discard_energy_specific: async (s, pk, { param1, param2 }, ctx) => {
    if (!ctx.isFinal) return;
    const removed = await removeEnergy(getActiveImg(pk), param1, parseInt10(param2, 1));
    showPopup(`Discarded ${removed} ${param1} Energy.`);
  },
  
  discard_energy_all: async (s, pk, p, ctx) => {
    if (!ctx.isFinal) return;
    await removeEnergy(getActiveImg(pk), null, 999);
    showPopup('Discarded all Energy.');
  },
  
  discard_random_energy_from_opponent: async (s, pk, p, ctx) => {
    if (!ctx.isFinal) return;
    await removeEnergy(getActiveImg(oppPk(pk)), null, 1);
    showPopup('Discarded opponent Energy.');
  },
  
  flip_discard_random_from_opponent: async (s, pk, p, ctx) => {
    if (!ctx.isFinal) return;
    if ((await flipCoin(pk)) === 'heads') {
      removeEnergy(getActiveImg(oppPk(pk)), null, 1);
      showPopup('HEADS → discarded opponent Energy.');
    } else showPopup('TAILS.');
  },

  bench_damage_one: async (s, pk, { param1, param2 }, ctx) => {
    if (!ctx.isFinal) return;
    const mode = (param1 || 'opponent').toLowerCase();
    const dmg = parseInt10(param2 || param1);
    if (!dmg) return;
    
    const candidates = [];
    const opp = oppPk(pk);
    

    const moveRow = ctx?.moveRow;
    const effectText = (moveRow?.effect_text || moveRow?.text || ctx?.moveRowText || '').toLowerCase();
    const isBenchOnly = effectText.includes('benched') || effectText.includes('bench');
    

    if (mode === 'opponent') {
      if (isBenchOnly) {

        candidates.push(...getBenchImgs(opp));
      } else {

        const activeImg = getActiveImg(opp);
        if (activeImg) candidates.push(activeImg);

        candidates.push(...getBenchImgs(opp));
      }
    } else if (mode === 'active') {

      const img = getActiveImg(opp);
      if (img) candidates.push(img);
    } else if (mode === 'bench') {

      candidates.push(...getBenchImgs(opp));
    } else if (mode === 'self') {

      candidates.push(...getBenchImgs(pk));
    }
    
    if (!candidates.length) { showPopup('No valid targets.'); return; }
    

    const attackerImg = ctx?.attackerImg || getActiveImg(pk);
    
    showPopup('Choose a Pokemon for bench damage.');
    const chosen = await awaitSelection(candidates);
    if (chosen) {

      const result = damageImg(chosen, dmg, attackerImg);
      showPopup(`Dealt ${dmg} to ${chosen.alt}.`);
      

      if (result.knocked) {

        const owner = chosen.closest('#player1') ? 'player1' : 'player2';
        const oppOwner = owner === 'player1' ? 'player2' : 'player1';
        const oppPkStr = oppOwner === 'player1' ? 'p1' : 'p2';

        const wasActive = chosen.closest('.active');
        

        setTimeout(async () => {
          if (typeof globalThis.handleKnockOut === 'function') {
            const gameEnded = await globalThis.handleKnockOut(oppPkStr, chosen, wasActive);

            if (!gameEnded && wasActive && typeof globalThis.beginPromotionFlow === 'function') {
              globalThis.beginPromotionFlow(oppOwner);
            }
          }
        }, 500);
      }
    }
  },
  
  bench_damage_all_opponent: async (s, pk, { param1 }, ctx) => {
    if (!ctx.isFinal) return;
    const dmg = parseInt10(param1);
    const benchImgs = getBenchImgs(oppPk(pk));
    const knockedPokemon = [];
    

    const attackerImg = ctx?.attackerImg || getActiveImg(pk);
    
    for (const img of benchImgs) {
      const result = damageImg(img, dmg, attackerImg);
      if (result.knocked) {
        const owner = img.closest('#player1') ? 'player1' : 'player2';
        knockedPokemon.push({ img, owner });
      }
    }
    
    showPopup(`Dealt ${dmg} to all opponent bench.`);
    

    if (knockedPokemon.length > 0) {
      setTimeout(async () => {
        for (const { img, owner } of knockedPokemon) {
          if (typeof handleKnockOut === 'function') {
            await handleKnockOut(owner, img, false);
          }
        }
      }, 500);
    }
  },

  bonus_damage_for_each_opponent_bench: async (s, pk, { param1 }, ctx) => {
    const bonusPerBench = parseInt10(param1, 20);
    const oppBenchCount = getBenchImgs(oppPk(pk)).length;
    const bonus = bonusPerBench * oppBenchCount;
    
    if (bonus > 0) {
      ctx.addBonus(bonus);
    }
  },

  bonus_damage_if_opponent_ex: async (s, pk, { param1 }, ctx) => {
    const bonus = parseInt10(param1, 80);
    const oppImg = getActiveImg(oppPk(pk));
    
    if (oppImg) {

      let isEx = false;
      try {
        const meta = await globalThis.fetchCardMeta(oppImg.dataset.set, oppImg.dataset.num);
        isEx = meta.suffix?.toUpperCase() === 'EX';
      } catch (e) {

        const name = (oppImg.alt || '').toLowerCase();
        isEx = name.includes(' ex');
      }
      
      if (isEx) {
        ctx.addBonus(bonus);
        if (ctx.isFinal) {
          showPopup(`+${bonus} damage (opponent is Pokémon ex)!`);
        }
      }
    }
  },

  bonus_damage_if_pokemon_ko_last_turn: async (s, pk, { param1 }, ctx) => {
    const bonus = parseInt10(param1, 60);
    

    if (!globalThis.state) globalThis.state = {};
    if (!globalThis.state.koLastTurn) globalThis.state.koLastTurn = {};
    
    const hadKO = globalThis.state.koLastTurn[pk];
    
    if (hadKO) {
      ctx.addBonus(bonus);
    }
  },

  discard_energy_then_bench_damage: async (s, pk, { param1, param2 }, ctx) => {
    if (!ctx.isFinal) return;
    

    const [energyType, discardCount] = (param1 || '|').split('|');
    const [target, damage] = (param2 || '|').split('|');
    
    const activeImg = getActiveImg(pk);
    

    const discarded = await removeEnergy(activeImg, energyType?.toLowerCase(), parseInt10(discardCount));
    
    if (!discarded) {
      showPopup('Not enough Energy to discard');
      return;
    }
    
    showPopup(`Discarded ${discardCount} ${energyType} Energy`);
    

    const targetPk = target === 'opponent' ? oppPk(pk) : pk;
    const benchPokemon = getBenchImgs(targetPk);
    
    if (benchPokemon.length === 0) {
      showPopup('No bench targets');
      return;
    }
    
    showPopup(`Choose target for ${damage} damage`);
    const chosen = await awaitSelection(benchPokemon);
    
    if (chosen) {
      const result = damageImg(chosen, parseInt10(damage));
      showPopup(`Dealt ${damage} to ${chosen.alt}`);
      

      if (result.knocked) {
        const owner = chosen.closest('#player1') ? 'player1' : 'player2';
        setTimeout(() => {
          if (typeof handleKnockOut === 'function') {
            handleKnockOut(owner, chosen, false);
          }
        }, 500);
      }
    }
  },

  discard_random_energy_all_pokemon: async (s, pk, { param1 }, ctx) => {
    if (!ctx.isFinal) return;
    
    const count = parseInt10(param1, 1);
    

    const allPokemon = [
      ...getAllPokemonImgs('p1'),
      ...getAllPokemonImgs('p2')
    ].filter(img => {
      const slot = getSlotFromImg(img);
      const energyBox = slot?.querySelector('.energy-pips');
      return energyBox && energyBox.children.length > 0;
    });
    
    if (allPokemon.length === 0) {
      showPopup('No Pokemon have Energy attached');
      return;
    }
    
    for (let i = 0; i < count; i++) {

      const randomPokemon = allPokemon[Math.floor(Math.random() * allPokemon.length)];
      

      const slot = getSlotFromImg(randomPokemon);
      const energyBox = slot?.querySelector('.energy-pips');
      const energies = Array.from(energyBox?.children ?? []);
      
      if (energies.length > 0) {
        const randomEnergy = energies[Math.floor(Math.random() * energies.length)];
        randomEnergy.remove();
        showPopup(`Discarded Energy from ${randomPokemon.alt}`);
      }
    }
  },

  flip_multiplier_energy_count: async (s, pk, { param1 }, ctx) => {
    if (!ctx.isFinal) return;
    
    const dmgPerHeads = parseInt10(param1, 50);
    const activeImg = getActiveImg(pk);
    const energyCount = countEnergy(activeImg);
    
    if (energyCount === 0) {
      showPopup('No Energy attached to flip for!');
      ctx.setOverride(0);
      return;
    }
    
    let heads = 0;
    for (let i = 0; i < energyCount; i++) {
      if ((await flipCoin(pk)) === 'heads') heads++;
    }
    
    const totalDmg = heads * dmgPerHeads;
    showPopup(`Flipped ${energyCount} coins: ${heads} heads for ${totalDmg} damage!`);
    ctx.setOverride(totalDmg);
  },

  heal_all: async (s, pk, { param1 }, ctx) => {
    if (!ctx.isFinal) return;
    
    const healAmount = parseInt10(param1, 20);
    const allMyPokemon = getAllPokemonImgs(pk);
    
    let healedCount = 0;
    allMyPokemon.forEach(img => {
      const { base, cur } = getHpFromImg(img);
      if (cur < base) {
        const newHp = Math.min(base, cur + healAmount);
        setHpOnImg(img, base, newHp);
        healedCount++;
      }
    });
    
    if (healedCount > 0) {
      showPopup(`Healed ${healAmount} damage from ${healedCount} Pokemon`);
    } else {
      showPopup('No Pokemon needed healing');
    }
  },

  shuffle_hand_draw_match_opponent: async (s, pk, p, ctx) => {
    if (!ctx.isFinal) return;
    

    const oppHand = s[oppPk(pk)]?.hand ?? [];
    const oppHandSize = oppHand.length;
    
    showPopup(`Shuffle your hand and draw ${oppHandSize} cards`);
    

    if (globalThis.shuffleHandIntoDeck && globalThis.drawCards) {
      globalThis.shuffleHandIntoDeck(s, pk);
      globalThis.drawCards(s, pk, oppHandSize);
    }
  },

  self_damage_fixed_amount: async (s, pk, { param1 }, ctx) => {
    if (!ctx.isFinal) return;
    damageImg(getActiveImg(pk), parseInt10(param1));
  },

  reduce_incoming_damage_next_turn: async (s, pk, { param1 }, ctx) => {
    if (!ctx.isFinal) return;
    globalThis.__reduceIncomingNextTurn ??= {};
    globalThis.__reduceIncomingNextTurn[pk] = parseInt10(param1);
    showPopup(`Will take ${param1} less damage next turn.`);
  },

  attach_energy_from_zone: async (s, pk, { param1, param2 }, ctx) => {
    if (!ctx.isFinal) return;

    const energyTypeMap = {
      'w': 'water',
      'f': 'fire',
      'g': 'grass',
      'l': 'lightning',
      'p': 'psychic',
      'r': 'fighting',
      'd': 'darkness',
      'm': 'metal',
      'n': 'dragon',
      'c': 'colorless'
    };
    let type = (param1 || 'colorless').toLowerCase();

    if (energyTypeMap[type]) {
      type = energyTypeMap[type];
    }
    
    if (param2 === 'count_heads') {
      let heads = 0;
      for (let i = 0; i < 3; i++) if ((await flipCoin(pk)) === 'heads') heads++;
      
      const targets = [];
      for (const img of getBenchImgs(pk)) {
        try {
          const meta = await globalThis.fetchCardMeta(img.dataset.set, img.dataset.num);
          if (meta.types?.some(t => t.toLowerCase() === type)) targets.push(img);
        } catch {}
      }
      
      if (!targets.length) { showPopup('No valid target.'); return; }
      
      showPopup(`${heads} heads. Choose target.`);
      const chosen = await awaitSelection(targets);
      if (chosen) {
        for (let i = 0; i < heads; i++) attachEnergy(chosen, type);
        showPopup(`Attached ${heads} ${type} Energy to ${chosen.alt}.`);
      }
      return;
    }
    
    if (param2 === 'self') {
      attachEnergy(getActiveImg(pk), type);
      showPopup(`Attached ${type} Energy.`);
      return;
    }
    
    if (param2 === 'to_bench' || !param2 || param2 === '') {

      const benchImgs = getBenchImgs(pk);
      const basicTargets = [];
      
      for (const img of benchImgs) {
        try {

          const set = img.dataset.set;
          const num = img.dataset.num;
          if (!set || !num || set === 'undefined' || num === 'undefined') {
            continue;
          }
          const meta = await globalThis.fetchCardMeta(set, num);
          if (meta && meta.category === 'Pokemon' && meta.stage?.toLowerCase() === 'basic') {
            basicTargets.push(img);
          }
        } catch (err) {
          console.error('[attach_energy_from_zone] Error checking Pokemon:', img.alt, err);

        }
      }
      
      if (!basicTargets.length) {
        showPopup('No Benched Basic Pokémon.');
        return;
      }
      
      showPopup('Choose a Benched Basic Pokémon.');
      const chosen = await awaitSelection(basicTargets);
      if (chosen) {
        attachEnergy(chosen, type);
        showPopup(`Attached ${type} Energy to ${chosen.alt}.`);
      }
    }
  },
  

  attach_multiple_energy_from_zone: async (s, pk, { param1, param2 }, ctx) => {
    if (!ctx.isFinal) return;
    

    const types = (param1 || '').split(/[,;]/).map(t => t.trim().toLowerCase()).filter(Boolean);
    const counts = (param2 || '1').split(',').map(c => parseInt10(c.trim(), 1));
    

    if (param2 === 'to_bench') {
      const benchImgs = getBenchImgs(pk);
      const basicPokemon = [];
      

      for (const img of benchImgs) {
        try {
          const meta = await globalThis.fetchCardMeta(img.dataset.set, img.dataset.num);
          if (meta.stage?.toLowerCase() === 'basic') {
            basicPokemon.push(img);
          }
        } catch {}
      }
      
      if (basicPokemon.length === 0) {
        showPopup('No Basic Pokémon on your Bench.');
        return;
      }
      

      let totalAttached = 0;
      for (let i = 0; i < types.length; i++) {
        const type = types[i];
        
        showPopup(`Choose a Basic Pokémon to attach {${type.toUpperCase()}} Energy to.`);
        const chosen = await awaitSelection(basicPokemon);
        
        if (chosen) {
          attachEnergy(chosen, type);
          totalAttached++;
          showPopup(`Attached {${type.toUpperCase()}} Energy to ${chosen.alt}!`);
        } else {
          showPopup(`Skipped {${type.toUpperCase()}} Energy.`);
        }
      }
      
      if (totalAttached > 0) {
        showPopup(`Phoenix Turbo: Attached ${totalAttached} Energy to Basic Pokémon!`);
      }
      return;
    }
    

    const activeImg = getActiveImg(pk);
    if (!activeImg) return;
    
    let totalAttached = 0;
    for (let i = 0; i < types.length; i++) {
      const type = types[i];
      const count = counts[i] || counts[0] || 1;
      
      for (let j = 0; j < count; j++) {
        attachEnergy(activeImg, type);
        totalAttached++;
      }
    }
    
    showPopup(`Attached ${totalAttached} Energy (${types.join(', ')})!`);
  },
  

  change_energy_type: async (s, pk, { param1, param2 }, ctx) => {
    if (!ctx.isFinal) return;
    

    const fromType = (param1 || '').toLowerCase();
    const toType = (param2 || '').toLowerCase();
    
    const oppImg = getActiveImg(oppPk(pk));
    if (!oppImg) return;
    
    const slot = getSlotFromImg(oppImg);
    const energyBox = slot?.querySelector('.energy-pips');
    if (!energyBox) return;
    
    const pips = Array.from(energyBox.querySelectorAll('.energy-pip'));
    const typePips = pips.filter(p => p.dataset.type === fromType);
    
    if (typePips.length === 0) {
      showPopup(`No ${fromType} Energy to change.`);
      return;
    }
    

    for (const pip of typePips) {
      pip.dataset.type = toType;
      pip.style.backgroundImage = `url('${ENERGY_ICONS[toType] || ''}')`;
    }
    
    showPopup(`Changed ${typePips.length} ${fromType} Energy to ${toType}!`);
  },
  

  move_all_energy_to_bench: async (s, pk, { param1 }, ctx) => {
    if (!ctx.isFinal) return;
    
    const activeImg = getActiveImg(pk);
    if (!activeImg) return;
    
    const activeSlot = getSlotFromImg(activeImg);
    const activeEnergyBox = activeSlot?.querySelector('.energy-pips');
    if (!activeEnergyBox || activeEnergyBox.children.length === 0) {
      showPopup('No Energy to move.');
      return;
    }
    
    const benchImgs = getBenchImgs(pk);
    if (benchImgs.length === 0) {
      showPopup('No benched Pokémon to move Energy to.');
      return;
    }
    
    showPopup('Choose a benched Pokémon to move all Energy to.');
    const chosen = await awaitSelection(benchImgs);
    
    if (chosen) {
      const benchSlot = getSlotFromImg(chosen);
      let benchEnergyBox = benchSlot?.querySelector('.energy-pips');
      if (!benchEnergyBox) {
        benchEnergyBox = document.createElement('div');
        benchEnergyBox.className = 'energy-pips';
        benchSlot.appendChild(benchEnergyBox);
      }
      

      const pips = Array.from(activeEnergyBox.children);
      for (const pip of pips) {
        benchEnergyBox.appendChild(pip);
      }
      
      showPopup(`Moved all Energy to ${chosen.alt}!`);
    }
  },
  

  discard_random_from_opponent_hand: async (s, pk, { param1 }, ctx) => {
    if (!ctx.isFinal) return;
    
    const opp = oppPk(pk);
    const hand = s[opp]?.hand || [];
    
    if (hand.length === 0) {
      showPopup('Opponent has no cards in hand.');
      return;
    }
    
    const randomIndex = Math.floor(Math.random() * hand.length);
    const card = hand.splice(randomIndex, 1)[0];
    
    if (globalThis.pushCardToDiscard) {
      const owner = opp === 'p1' ? 'player1' : 'player2';
      const fakeImg = document.createElement('img');
      fakeImg.dataset.set = card.set;
      fakeImg.dataset.num = card.num;
      globalThis.pushCardToDiscard(owner, fakeImg);
    }
    
    showPopup(`Discarded ${card.name || 'a card'} from opponent's hand!`);
    

    if (globalThis.renderAllHands) {
      globalThis.renderAllHands();
    }
  },
  

  draw_until_equal_hand: async (s, pk, { param1 }, ctx) => {
    if (!ctx.isFinal) return;
    
    const opp = oppPk(pk);
    const myHand = s[pk]?.hand || [];
    const oppHand = s[opp]?.hand || [];
    const deck = s[pk]?.deck || [];
    
    const targetSize = oppHand.length;
    const currentSize = myHand.length;
    const needed = Math.max(0, targetSize - currentSize);
    
    if (needed === 0) {
      showPopup('Your hand size already matches opponent.');
      return;
    }
    
    if (deck.length < needed) {
      showPopup(`Only ${deck.length} cards in deck (need ${needed}).`);
      return;
    }
    

    const drawn = deck.splice(0, needed);
    myHand.push(...drawn);
    
    if (globalThis.drawCards) {
      globalThis.drawCards(s, pk, needed);
    }
    
    showPopup(`Drew ${needed} card(s) to match opponent's hand size!`);
  },
  

  increase_energy_cost: async (s, pk, { param1 }, ctx) => {
    if (!ctx.isFinal) return;
    
    const increase = parseInt10(param1, 1);
    const opp = oppPk(pk);
    
    globalThis.__specialEffects ??= { p1: {}, p2: {} };
    if (!globalThis.__specialEffects[opp].energyCostIncrease) {
      globalThis.__specialEffects[opp].energyCostIncrease = 0;
    }
    
    globalThis.__specialEffects[opp].energyCostIncrease += increase;
    showPopup(`Opponent's attacks cost +${increase} Energy!`);
  },

  switch_self_with_bench: async (s, pk, p, ctx) => {
    if (!ctx.isFinal) return;
    globalThis.promoteFromBench?.(s, pk, false);
    showPopup('Switched with bench.');
  },
  
  force_opponent_switch: async (s, pk, p, ctx) => {
    if (!ctx.isFinal) return;
    globalThis.promoteFromBench?.(s, oppPk(pk), true);
    showPopup('Forced opponent switch.');
  },

  search_pokemon_type_random: async (s, pk, { param1 }, ctx) => {
    if (!ctx.isFinal) return;
    const deck = s[pk].deck ?? [];
    if (!deck.length) { showPopup('Deck empty.'); return; }
    

    const pokemonCards = [];
    const requiredType = (param1 || '').toLowerCase().trim();
    

    const metaPromises = deck.map(async (card) => {
      try {
        const meta = await globalThis.fetchCardMeta(card.set, card.number || card.num);
        return { card, meta };
      } catch (e) {
        return { card, meta: null };
      }
    });
    
    const results = await Promise.all(metaPromises);
    for (const { card, meta } of results) {
      if (meta && meta.category === 'Pokemon') {

        if (requiredType) {
          const hasType = meta.types?.some(t => t.toLowerCase() === requiredType);
          if (hasType) {
            pokemonCards.push(card);
          }
        } else {

          pokemonCards.push(card);
        }
      }
    }
    
    if (pokemonCards.length === 0) {
      showPopup(requiredType ? `No ${requiredType}-type Pokémon in deck.` : 'No Pokémon in deck.');
      return;
    }
    

    const idx = Math.floor(Math.random() * pokemonCards.length);
    const chosen = pokemonCards[idx];
    

    const deckIndex = deck.findIndex(c => c.set === chosen.set && (c.number || c.num) === (chosen.number || chosen.num));
    if (deckIndex !== -1) {
      deck.splice(deckIndex, 1);
      (s[pk].hand ||= []).push(chosen);
      

      shuffleDeckAndAnimate(s, pk);
      

      if (globalThis.renderAllHands) {
        globalThis.renderAllHands();
      }
      if (globalThis.updateDeckBubbles) {
        globalThis.updateDeckBubbles();
      }
      
      showPopup(`Found ${chosen.name}.`);
      if (globalThis.logEvent) {
        const owner = pk === 'p1' ? 'player1' : 'player2';
        globalThis.logEvent({
          player: owner,
          text: `Found ${chosen.name} from deck search`,
          cardSet: chosen.set,
          cardNum: chosen.number || chosen.num
        });
      }
    }
  },
  
  search_specific_into_bench: async (s, pk, { param1 }, ctx) => {
    if (!ctx.isFinal) return;
    const name = param1?.toLowerCase();
    const deck = s[pk].deck ?? [];
    const idx = deck.findIndex(c => (c.name || '').toLowerCase() === name);
    
    if (idx === -1) { showPopup(`No ${param1} in deck.`); return; }
    
    const card = deck.splice(idx, 1)[0];
    (s[pk].bench ??= []).push(card);
    showPopup(`Put ${card.name} on bench.`);
    if (globalThis.logEvent) {
      const owner = pk === 'p1' ? 'player1' : 'player2';
      globalThis.logEvent({
        player: owner,
        text: `Found ${card.name} from deck search and put on bench`,
        cardSet: card.set,
        cardNum: card.number || card.num
      });
    }
  },
  
  reveal_opponent_hand: async (s, pk, p, ctx) => {
    if (!ctx.isFinal) return;
    const hand = s[oppPk(pk)].hand ?? [];
    showPopup(hand.length ? `Hand: ${hand.map(c => c.name).join(', ')}` : 'Empty hand.');
  },
  
  draw_cards: async (s, pk, { param1 }, ctx) => {
    if (!ctx.isFinal) return;
    globalThis.drawCards?.(s, pk, parseInt10(param1));
    showPopup(`Drew ${param1} card(s).`);
  },
  
  copy_opponent_attack: async (s, pk, p, ctx) => {
    if (!ctx.isFinal) return;
    const oppImg = getActiveImg(oppPk(pk));
    if (!oppImg) return;
    
    try {
      const meta = await globalThis.fetchCardMeta(oppImg.dataset.set, oppImg.dataset.num);
      const attacks = meta?.attacks ?? [];
      if (!attacks.length) { showPopup('No attacks to copy.'); return; }
      
      let atk;
      if (attacks.length === 1) {
        atk = attacks[0];
        showPopup(`Copying ${atk.name}...`);
      } else {

        const choice = await new Promise(resolve => {
          const attackList = attacks.map((a, idx) => {
            const dmgText = a.damage ? ` (${a.damage})` : ' (Effect)';
            return `${idx + 1}. ${a.name}${dmgText}`;
          }).join('\n');
          
          showPopup(`Choose attack to copy:\n${attackList}`);
          

          const container = document.createElement('div');
          container.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:10000;background:white;padding:20px;border-radius:10px;box-shadow:0 4px 6px rgba(0,0,0,0.3);';
          
          attacks.forEach((a, idx) => {
            const btn = document.createElement('button');
            const dmgText = a.damage ? ` (${a.damage})` : ' (Effect)';
            btn.textContent = `${a.name}${dmgText}`;
            btn.style.cssText = 'display:block;margin:10px 0;padding:10px 20px;font-size:16px;cursor:pointer;width:100%;';
            btn.onclick = () => {
              document.body.removeChild(container);
              resolve(idx);
            };
            container.appendChild(btn);
          });
          
          document.body.appendChild(container);
        });
        
        atk = attacks[choice];
      }
      

      const originalPk = pk;
      

      const mewImg = getActiveImg(pk);
      if (mewImg) {

        const mewName = mewImg.alt;
        

        mewImg.alt = oppImg.alt;
        

        const baseDmg = parseInt10(atk.damage, 0);
        const finalDmg = await applyMoveEffect(s, pk, atk.name, baseDmg, { ...ctx.rawCtx, isFinal: true });
        

        mewImg.alt = mewName;
        
        ctx.setOverride(finalDmg);
        showPopup(`Copied ${atk.name}!`);
      }
    } catch (err) { 
      console.error('[Mew ex] Copy failed:', err);
      showPopup('Copy failed.');
    }
  },

  random_multi_target_damage: async (s, pk, { param1, param2 }, ctx) => {
    if (!ctx.isFinal) return;
    
    const times = parseInt10(param1, 4);
    const dmg = parseInt10(param2, 50);
    

    const attackerImg = ctx?.attackerImg || getActiveImg(pk);
    

    const moveRow = getMoveRow(attackerImg?.alt || '', ctx.moveName || '');
    const canTargetOwn = moveRow?.text?.toLowerCase().includes('either yours or your opponent') || 
                         moveRow?.effect_text?.toLowerCase().includes('either yours or your opponent');
    

    let initialTargets = [];
    if (canTargetOwn) {

      const myPokemon = getAllPokemonImgs(pk).filter(img => img && img !== attackerImg && img.tagName === 'IMG');
      const oppPokemon = getAllPokemonImgs(oppPk(pk)).filter(img => img && img.tagName === 'IMG');
      initialTargets = [...myPokemon, ...oppPokemon];
    } else {

      initialTargets = getAllPokemonImgs(oppPk(pk)).filter(img => img && img.tagName === 'IMG');
    }
    
    if (!initialTargets.length) {
      showPopup('No targets available.');

      ctx.setOverride(0);
      return;
    }
    
    const hitLog = {};
    const koedPokemon = new Set();
    
    

    for (let i = 0; i < times; i++) {

      const availableTargets = initialTargets.filter(img => {

        if (!img || img.tagName !== 'IMG' || !img.parentElement) {
          return false;
        }

        if (koedPokemon.has(img)) {
          return false;
        }

        const { cur } = getHpFromImg(img);
        return cur > 0;
      });
      
      

      if (availableTargets.length === 0) {
        break;
      }
      

      const chosen = availableTargets[Math.floor(Math.random() * availableTargets.length)];
      

      if (!chosen || chosen.tagName !== 'IMG') {
        continue;
      }
      

      const beforeHp = getHpFromImg(chosen).cur;
      const expectedAfterHp = Math.max(0, beforeHp - dmg);
      const chosenName = chosen.alt || 'Unknown';
      const chosenSet = chosen.dataset.set;
      const chosenNum = chosen.dataset.num;
      

      if (!chosen || chosen.tagName !== 'IMG' || !chosen.parentElement) {
        continue;
      }
      

      const result = damageImg(chosen, dmg, attackerImg);
      

      await new Promise(resolve => setTimeout(resolve, 10));
      

      if (!chosen || chosen.tagName !== 'IMG' || !chosen.parentElement) {

        const afterHp = expectedAfterHp;
      } else {

        const currentName = chosen.alt || 'Unknown';
        const currentSet = chosen.dataset.set;
        const currentNum = chosen.dataset.num;
        
        if (currentName !== chosenName || currentSet !== chosenSet || currentNum !== chosenNum) {
        }
        
        const actualHp = getHpFromImg(chosen).cur;
        

        if (actualHp > expectedAfterHp + 1) {
          console.error(`[random_multi_target_damage] ⚠️ Damage not applied correctly! Expected: ${expectedAfterHp}, Got: ${actualHp}`);
        }
      }
      

      const slot = getSlotFromImg(chosen);
      if (slot) {
        slot.classList.add('damage-flash');
        setTimeout(() => slot.classList.remove('damage-flash'), 400);
      }
      

      if (result.knocked) {
        koedPokemon.add(chosen);
      }
      
      const name = chosen.alt || 'Unknown';
      hitLog[name] = (hitLog[name] || 0) + 1;
    }
    

    for (const koedImg of koedPokemon) {

      if (koedImg && koedImg.parentElement && koedImg.tagName === 'IMG') {
        const owner = koedImg.closest('#player1') ? 'player1' : 'player2';
        const ownerPk = owner === 'player1' ? 'p1' : 'p2';
        const wasActive = koedImg.closest('.active') !== null;
        

        setTimeout(async () => {
          if (typeof globalThis.handleKnockOut === 'function' && koedImg.parentElement) {
            const gameEnded = await globalThis.handleKnockOut(owner, koedImg, wasActive);

            if (!gameEnded && wasActive && typeof globalThis.beginPromotionFlow === 'function') {
              await globalThis.beginPromotionFlow(owner);
            }
          }
        }, 100 * (koedPokemon.size > 1 ? Array.from(koedPokemon).indexOf(koedImg) : 0));
      }
    }
    
    
    const summary = Object.entries(hitLog)
      .map(([name, count]) => `${name} (${count}×${dmg})`)
      .join(', ');
    
    const moveName = ctx.moveName || 'Attack';
    showPopup(`${moveName} hit: ${summary}`);
    

    const csvBaseDamage = parseInt(moveRow?.damageBase || moveRow?.damage || '0', 10);
    if (csvBaseDamage === 0) {

      ctx.setOverride(0);
    } else {

    }
  },
  

  flip_force_shuffle_opponent_pokemon_into_deck: async (s, pk, p, ctx) => {
    if (!ctx.isFinal) return;
    
    if ((await flipCoin(pk)) === 'tails') {
      showPopup('TAILS → no effect.');
      return;
    }
    
    const oppImg = getActiveImg(oppPk(pk));
    if (!oppImg) {
      showPopup('No opponent Active Pokémon.');
      return;
    }
    
    const opp = oppPk(pk);
    const oppDeck = s[opp].deck ?? [];
    

    oppDeck.push({
      name: oppImg.alt,
      set: oppImg.dataset.set,
      number: oppImg.dataset.num,
      image: oppImg.src
    });
    
    shuffleArray(oppDeck);
    

    const slot = getSlotFromImg(oppImg);
    if (slot) {
      slot.innerHTML = '<span class="slot-label">Empty</span>';
      slot.dataset.empty = '1';
    }
    
    showPopup(`HEADS → Shuffled ${oppImg.alt} back into deck!`);
    

    setTimeout(() => {
      globalThis.beginPromotionFlow?.(pkToPlayer(opp));
    }, 500);
  },
  

  flip_discard_random_from_opponent_hand: async (s, pk, p, ctx) => {
    if (!ctx.isFinal) return;
    
    if ((await flipCoin(pk)) === 'tails') {
      showPopup('TAILS → no effect.');
      return;
    }
    
    const oppHand = s[oppPk(pk)].hand ?? [];
    
    if (!oppHand.length) {
      showPopup("HEADS → but opponent's hand is empty.");
      return;
    }
    
    const idx = Math.floor(Math.random() * oppHand.length);
    const discarded = oppHand.splice(idx, 1)[0];
    
    showPopup(`HEADS → Discarded ${discarded.name} from opponent's hand!`);
    globalThis.addLog?.(pk, `discarded <b>${discarded.name}</b> from opponent's hand`, discarded.image, discarded);
  },

  self_lock_next_turn: async (s, pk, p, ctx) => {
    if (!ctx.isFinal) return;
    globalThis.__specialEffects ??= { p1: {}, p2: {} };
    globalThis.__specialEffects[pk].attackLock = true;
    showPopup("This Pokémon can't attack next turn!");
  },

  self_lock_specific_attack: async (s, pk, { param1 }, ctx) => {
    if (!ctx.isFinal) return;
    const img = getActiveImg(pk);
    if (!img) return;
    

    const attackName = param1 || ctx.rawCtx?.attackName || '';
    if (!attackName) return;
    

    img.dataset.lockedAttack = attackName;
    
    showPopup(`This Pokémon can't use ${attackName} next turn!`);
  },

  discard_random_energy_self: async (s, pk, { param1 }, ctx) => {
    if (!ctx.isFinal) return;
    const count = parseInt10(param1, 1);
    const img = getActiveImg(pk);
    if (!img) return;
    
    const slot = img.closest('.card-slot');
    if (!slot) return;
    
    const pips = Array.from(slot.querySelectorAll('.energy-pip'));
    if (pips.length === 0) {
      showPopup('No energy to discard.');
      return;
    }
    
    let discarded = 0;
    for (let i = 0; i < count && pips.length > 0; i++) {
      const idx = Math.floor(Math.random() * pips.length);
      const pip = pips.splice(idx, 1)[0];
      pip.remove();
      discarded++;
    }
    
    showPopup(`Discarded ${discarded} Energy from this Pokémon.`);
  },

  bonus_damage_if_opponent_type: async (s, pk, { param1, param2 }, ctx) => {
    const oppImg = getActiveImg(oppPk(pk));
    if (!oppImg) return;
    
    const targetType = (param1 || '').toLowerCase();
    const bonus = parseInt10(param2, 30);
    

    let oppType = oppImg.dataset.cachedType;
    
    if (!oppType) {

      try {
        const meta = await globalThis.fetchCardMeta(oppImg.dataset.set, oppImg.dataset.num);
        oppType = meta.types?.[0]?.toLowerCase();
        if (oppType) {
          oppImg.dataset.cachedType = oppType;
        }
      } catch (err) {
        console.error('[bonus_damage_if_opponent_type] Failed to fetch type:', err);
        return;
      }
    }
    
    if (oppType === targetType) {
      ctx.addBonus(bonus);
    }
  },

  search_basic_to_bench: async (s, pk, p, ctx) => {
    if (!ctx.isFinal) return;
    
    const owner = pkToPlayer(pk);
    const deck = s[pk]?.deck || [];
    
    if (deck.length === 0) {
      showPopup('Deck is empty.');
      return;
    }
    

    shuffleDeckAndAnimate(s, pk);
    

    const basics = [];
    const metaPromises = deck.map(async (card) => {
      try {
        const meta = await globalThis.fetchCardMeta(card.set, card.num);
        return { card, meta };
      } catch (err) {
        console.error('[search_basic_to_bench] Failed to check card:', err);
        return { card, meta: null };
      }
    });
    
    const results = await Promise.all(metaPromises);
    for (const { card, meta } of results) {
      if (meta && meta.category?.toLowerCase() === 'pokemon' && meta.stage?.toLowerCase() === 'basic') {
        basics.push(card);
      }
    }
    
    if (basics.length === 0) {
      showPopup('No Basic Pokémon in deck.');
      return;
    }
    

    const chosen = basics[Math.floor(Math.random() * basics.length)];
    

    const idx = deck.findIndex(c => c.set === chosen.set && c.num === chosen.num);
    if (idx !== -1) {
      deck.splice(idx, 1);
    }
    

    const benchDiv = owner === 'player1' ? globalThis.p1Bench : globalThis.p2Bench;
    const benchSlots = Array.from(benchDiv?.querySelectorAll('.card-slot') ?? []);
    const emptySlot = benchSlots.find(slot => !slot.querySelector('img'));
    
    if (!emptySlot) {
      showPopup('Bench is full!');

      deck.push(chosen);
      return;
    }
    

    const img = document.createElement('img');
    img.className = 'card-img';
    img.src = chosen.image;
    img.alt = chosen.name;
    img.dataset.set = chosen.set;
    img.dataset.num = chosen.num;
    

    try {
      const meta = await globalThis.fetchCardMeta(chosen.set, chosen.num);
      const hp = parseInt10(meta.hp, 0);
      img.dataset.hp = String(hp);
      img.dataset.chp = String(hp);
      img.dataset.playedTurn = String(globalThis.turnNumber || 0);
      

      if (globalThis.assignInstanceId) {
        globalThis.assignInstanceId(img);
      }
      

      emptySlot.innerHTML = '';
      emptySlot.appendChild(img);
      

      if (globalThis.setHpOnImage) {
        globalThis.setHpOnImage(img, hp, hp);
      }
      

      if (globalThis.markSlot) {
        globalThis.markSlot(emptySlot, true);
      }
      
      showPopup(`Put ${chosen.name} onto the Bench!`);
      globalThis.addLog?.(pk, `put <b>${chosen.name}</b> onto the Bench`, chosen.image, chosen);
      if (globalThis.logEvent) {
        const owner = pk === 'p1' ? 'player1' : 'player2';
        globalThis.logEvent({
          player: owner,
          text: `Found ${chosen.name} from deck search and put on bench`,
          cardSet: chosen.set,
          cardNum: chosen.num
        });
      }
    } catch (err) {
      console.error('[search_basic_to_bench] Failed to place:', err);
      showPopup('Failed to place Pokémon.');

      deck.push(chosen);
    }
  },

  
  
  

  discard_energy_and_bench_damage: async (s, pk, { param1, param2 }, ctx) => {
    if (!ctx.isFinal) return;
    

    const [countStr, damageStr] = (param2 || '|').split('|');
    const count = parseInt10(countStr, 3);
    const damage = parseInt10(damageStr, 20);
    
    const energyType = param1?.toLowerCase();
    const img = getActiveImg(pk);
    if (!img) return;
    
    const slot = img.closest('.card-slot');
    if (!slot) return;
    

    const pips = Array.from(slot.querySelectorAll('.energy-pip'));
    const typedPips = pips.filter(p => 
      p.dataset.type?.toLowerCase() === energyType
    );
    
    let discarded = 0;
    for (let i = 0; i < count && typedPips.length > 0; i++) {
      const pip = typedPips.shift();
      pip?.remove();
      discarded++;
    }
    
    showPopup(`Discarded ${discarded} ${energyType} Energy.`);
    

    const oppBench = getBenchImgs(oppPk(pk));
    const knockedPokemon = [];
    
    for (const benchImg of oppBench) {
      const result = damageImg(benchImg, damage);
      if (result.knocked) {
        const owner = benchImg.closest('#player1') ? 'player1' : 'player2';
        knockedPokemon.push({ img: benchImg, owner });
      }
    }
    
    if (oppBench.length > 0) {
      showPopup(`${damage} damage to each opponent Benched Pokémon!`);
    }
    

    if (knockedPokemon.length > 0) {
      setTimeout(async () => {
        for (const { img, owner } of knockedPokemon) {
          if (typeof handleKnockOut === 'function') {
            await handleKnockOut(owner, img, false);
          }
        }
      }, 500);
    }
  },

  attach_energy_to_multiple_bench: async (s, pk, { param1, param2 }, ctx) => {
    if (!ctx.isFinal) return;
    
    const energyType = param1?.toLowerCase() || 'colorless';
    const count = parseInt10(param2, 2);
    const owner = pk === 'p1' ? 'player1' : 'player2';
    
    const bench = getBenchImgs(pk);
    if (bench.length === 0) {
      showPopup('No Benched Pokémon.');
      return;
    }
    

    const actualCount = Math.min(count, bench.length);
    
    showPopup(`Choose ${actualCount} Benched Pokémon for ${energyType} Energy`);
    
    const selected = [];
    for (let i = 0; i < actualCount; i++) {
      const available = bench.filter(b => !selected.includes(b));
      if (available.length === 0) break;
      
      const target = await awaitSelection(available, 'heal-glow');
      if (!target) break;
      
      selected.push(target);
      

      const slot = target.closest('.card-slot');
      if (slot && typeof globalThis.attachEnergyToSlot === 'function') {
        globalThis.attachEnergyToSlot(owner, slot, energyType);
      }
    }
    
    showPopup(`Attached ${selected.length} ${energyType} Energy to bench!`);
  },

  self_damage_if_ko: async (s, pk, { param1 }, ctx) => {
    if (!ctx.isFinal) return;

    ctx.checkKoForRecoil = parseInt10(param1, 50);
  },

  discard_energy_and_snipe: async (s, pk, { param1, param2 }, ctx) => {
    if (!ctx.isFinal) return;
    
    const energyType = param1?.toLowerCase();
    const damage = parseInt10(param2, 120);
    
    const img = getActiveImg(pk);
    if (!img) return;
    
    const slot = img.closest('.card-slot');
    if (!slot) return;
    

    const pips = Array.from(slot.querySelectorAll('.energy-pip'));
    const typedPips = pips.filter(p => 
      p.dataset.type?.toLowerCase() === energyType
    );
    
    typedPips.forEach(pip => pip.remove());
    showPopup(`Discarded ${typedPips.length} ${energyType} Energy.`);
    

    const allOppPokemon = [
      getActiveImg(oppPk(pk)),
      ...getBenchImgs(oppPk(pk))
    ].filter(Boolean);
    
    if (allOppPokemon.length === 0) {
      showPopup('No opponent Pokémon to damage.');
      return;
    }
    

    const target = allOppPokemon[0];
    damageImg(target, damage);
    showPopup(`${damage} damage to ${target.alt}!`);
  },

  attach_multiple_energy_to_bench_one: async (s, pk, { param1, param2 }, ctx) => {
    if (!ctx.isFinal) return;
    
    const energyType = param1?.toLowerCase() || 'metal';
    const count = parseInt10(param2, 2);
    const owner = pk === 'p1' ? 'player1' : 'player2';
    
    const bench = getBenchImgs(pk);
    if (bench.length === 0) {
      showPopup('No Benched Pokémon.');
      return;
    }
    
    showPopup(`Choose a Benched Pokémon for ${count} ${energyType} Energy`);
    

    const target = await awaitSelection(bench, 'heal-glow');
    if (!target) return;
    
    const slot = target.closest('.card-slot');
    if (!slot) return;
    

    for (let i = 0; i < count; i++) {
      if (typeof globalThis.attachEnergyToSlot === 'function') {
        globalThis.attachEnergyToSlot(owner, slot, energyType);
      }
    }
    
    showPopup(`Attached ${count} ${energyType} Energy to ${target.alt}!`);
  },

  attach_energy_to_specific_names: async (s, pk, { param1, param2 }, ctx) => {
    if (!ctx.isFinal) return;
    
    const energyType = param1?.toLowerCase() || 'psychic';
    const names = (param2 || '').split('|').map(n => n.trim().toLowerCase());
    const owner = pk === 'p1' ? 'player1' : 'player2';
    
    const bench = getBenchImgs(pk);
    const validTargets = bench.filter(img => 
      names.some(name => img.alt.toLowerCase().includes(name))
    );
    
    if (validTargets.length === 0) {
      showPopup(`No ${names.join(' or ')} on Bench.`);
      return;
    }
    
    if (validTargets.length === 1) {

      const target = validTargets[0];
      const slot = target.closest('.card-slot');
      if (slot && typeof globalThis.attachEnergyToSlot === 'function') {
        globalThis.attachEnergyToSlot(owner, slot, energyType);
        showPopup(`Attached ${energyType} Energy to ${target.alt}!`);
      }
    } else {

      showPopup(`Choose ${names.join(' or ')} for ${energyType} Energy`);
      const target = await awaitSelection(validTargets, 'heal-glow');
      if (!target) return;
      
      const slot = target.closest('.card-slot');
      if (slot && typeof globalThis.attachEnergyToSlot === 'function') {
        globalThis.attachEnergyToSlot(owner, slot, energyType);
        showPopup(`Attached ${energyType} Energy to ${target.alt}!`);
      }
    }
  },

  discard_top_deck: async (s, pk, { param1 }, ctx) => {
    if (!ctx.isFinal) return;
    
    const count = parseInt10(param1, 3);
    const deck = s[pk]?.deck || [];
    
    let discarded = 0;
    for (let i = 0; i < count && deck.length > 0; i++) {
      deck.shift();
      discarded++;
    }
    
    showPopup(`Discarded ${discarded} cards from deck.`);
  },

  damage_all_opponent_pokemon: async (s, pk, { param1 }, ctx) => {
    if (!ctx.isFinal) return;
    
    const damage = parseInt10(param1, 10);
    

    const allOppPokemon = [
      getActiveImg(oppPk(pk)),
      ...getBenchImgs(oppPk(pk))
    ].filter(Boolean);
    
    for (const oppImg of allOppPokemon) {
      damageImg(oppImg, damage);
    }
    
    showPopup(`${damage} damage to each opponent's Pokémon!`);
  },

  flip_multiplier_conditional_poison: async (s, pk, { param1, param2 }, ctx) => {
    const flipCount = parseInt10(param1, 4);
    const [damageStr, thresholdStr] = (param2 || '|').split('|');
    const damagePerHeads = parseInt10(damageStr, 40);
    const threshold = parseInt10(thresholdStr, 2);
    
    let heads = 0;
    for (let i = 0; i < flipCount; i++) {
      if ((await flipCoin(pk)) === 'heads') heads++;
    }
    
    const damage = heads * damagePerHeads;
    ctx.addBonus(damage);
    
    if (ctx.isFinal) {
      showPopup(`Flipped ${heads} heads: +${damage} damage!`);
      
      if (heads >= threshold) {
        applyStatus(oppPk(pk), 'poison');
        showPopup('Opponent is now Poisoned!');
      }
    }
  },

  flip_multiplier_pokemon_in_play: async (s, pk, { param1 }, ctx) => {
    const damagePerHeads = parseInt10(param1, 20);
    

    const allPokemon = [getActiveImg(pk), ...getBenchImgs(pk)].filter(Boolean);
    const flipCount = allPokemon.length;
    
    let heads = 0;
    for (let i = 0; i < flipCount; i++) {
      if ((await flipCoin(pk)) === 'heads') heads++;
    }
    
    const damage = heads * damagePerHeads;
    ctx.setOverride(damage);
    
    if (ctx.isFinal) {
      showPopup(`Flipped ${heads}/${flipCount} heads: ${damage} damage!`);
    }
  },

  flip_until_tails_bonus_damage: async (s, pk, { param1 }, ctx) => {
    const bonusPerHeads = parseInt10(param1, 30);
    
    let heads = 0;
    while ((await flipCoin(pk)) === 'heads') {
      heads++;
    }
    
    const bonus = heads * bonusPerHeads;
    ctx.addBonus(bonus);
    
    if (ctx.isFinal) {
      showPopup(`Flipped ${heads} heads: +${bonus} damage!`);
    }
  },

  bonus_damage_if_tool_attached: async (s, pk, { param1, param2 }, ctx) => {
    const target = param1?.toLowerCase();
    const bonus = parseInt10(param2, 30);
    
    let checkImg;
    if (target === 'opponent') {
      checkImg = getActiveImg(oppPk(pk));
    } else {
      checkImg = getActiveImg(pk);
    }
    
    if (!checkImg) return;
    

    const slot = checkImg.closest('.card-slot');
    const hasTool = slot && (slot.dataset.toolSet || slot.dataset.tool);
    
    if (hasTool) {
      ctx.addBonus(bonus);
      if (ctx.isFinal) {
        showPopup(`Tool attached: +${bonus} damage!`);
      }
    }
  },

  self_boost_next_turn: async (s, pk, { param1, param2 }, ctx) => {
    if (!ctx.isFinal) return;
    
    const boost = parseInt10(param1, 60);
    const attackName = param2 || 'Overdrive Smash';
    
    const img = getActiveImg(pk);
    if (!img) return;
    

    img.dataset.nextTurnBoost = boost;
    img.dataset.boostedAttack = attackName;
    
    showPopup(`Next turn: ${attackName} does +${boost} damage!`);
  },

  change_opponent_energy_type: async (s, pk, p, ctx) => {
    if (!ctx.isFinal) return;
    
    const types = ['grass', 'fire', 'water', 'lightning', 'psychic', 'fighting', 'darkness', 'metal'];
    const randomType = types[Math.floor(Math.random() * types.length)];
    

    globalThis.__energyOverride = globalThis.__energyOverride || {};
    globalThis.__energyOverride[oppPk(pk)] = randomType;
    
    showPopup(`Opponent's next Energy will be ${randomType}!`);
  },

  discard_opponent_tools_before_damage: async (s, pk, p, ctx) => {
    if (!ctx.isFinal) return;
    
    const oppImg = getActiveImg(oppPk(pk));
    if (!oppImg) return;
    

    if (oppImg.dataset.tool) {
      showPopup(`Discarded ${oppImg.dataset.tool}!`);
      delete oppImg.dataset.tool;
    }
    
    const toolCard = oppImg.closest('.card-slot')?.querySelector('.tool-card');
    if (toolCard) {
      toolCard.remove();
      showPopup('Discarded Pokémon Tool!');
    }
  },

  halve_opponent_hp: async (s, pk, p, ctx) => {
    const oppImg = getActiveImg(oppPk(pk));
    if (!oppImg) return;
    
    const { cur } = getHpFromImg(oppImg);
    const halfDamage = Math.floor(cur / 2);
    
    ctx.setOverride(halfDamage);
    
    if (ctx.isFinal) {
      showPopup(`Half of ${cur} HP = ${halfDamage} damage!`);
    }
  },

  reveal_hand_shuffle_card: async (s, pk, p, ctx) => {
    if (!ctx.isFinal) return;
    
    const oppHand = s[oppPk(pk)]?.hand || [];
    
    if (oppHand.length === 0) {
      showPopup("Opponent's hand is empty.");
      return;
    }
    

    const idx = Math.floor(Math.random() * oppHand.length);
    const card = oppHand.splice(idx, 1)[0];
    

    const oppDeck = s[oppPk(pk)]?.deck || [];
    oppDeck.push(card);
    

    for (let i = oppDeck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [oppDeck[i], oppDeck[j]] = [oppDeck[j], oppDeck[i]];
    }
    
    showPopup(`Shuffled ${card.name} into opponent's deck!`);
  },

  return_opponent_active_to_hand: async (s, pk, p, ctx) => {
    if (!ctx.isFinal) return;
    
    if ((await flipCoin(pk)) === 'tails') {
      showPopup('TAILS → no effect.');
      return;
    }
    
    const oppImg = getActiveImg(oppPk(pk));
    if (!oppImg) return;
    
    showPopup('HEADS → Returning active to hand!');
    

    const oppHand = s[oppPk(pk)]?.hand || [];
    oppHand.push({
      set: oppImg.dataset.set,
      num: oppImg.dataset.num,
      name: oppImg.alt,
      image: oppImg.src
    });
    

    const slot = oppImg.closest('.card-slot');
    if (slot) {
      slot.innerHTML = '';
      if (typeof globalThis.markSlot === 'function') {
        globalThis.markSlot(slot, false);
      }
    }
    

    showPopup('Opponent must promote from Bench!');
  },

  bonus_damage_equal_to_self_damage: async (s, pk, p, ctx) => {
    const img = getActiveImg(pk);
    if (!img) return;
    
    const { base, cur } = getHpFromImg(img);
    const damageOnSelf = base - cur;
    
    if (damageOnSelf > 0) {
      ctx.addBonus(damageOnSelf);
      if (ctx.isFinal) {
        showPopup(`+${damageOnSelf} damage (damage on self)!`);
      }
    }
  },

  flip_prevent_damage_and_effects: async (s, pk, p, ctx) => {
    if (!ctx.isFinal) return;
    
    if ((await flipCoin(pk)) === 'heads') {
      globalThis.__specialEffects ??= { p1: {}, p2: {} };
      globalThis.__specialEffects[pk].preventDamage = true;
      showPopup('HEADS → This Pokémon will take no damage next turn!');
    } else {
      showPopup('TAILS → no effect.');
    }
  },

  attack_lock_flip: async (s, pk, p, ctx) => {
    if (!ctx.isFinal) return;
    
    const opp = oppPk(pk);
    globalThis.__specialEffects ??= { p1: {}, p2: {} };
    globalThis.__specialEffects[opp].attackLockFlip = true;
    
    showPopup("Opponent must flip before attacking - tails means attack fails!");
  },

  flip_reveal_shuffle_opponent_card: async (s, pk, p, ctx) => {
    if (!ctx.isFinal) return;
    
    if ((await flipCoin(pk)) === 'tails') {
      showPopup('TAILS → no effect.');
      return;
    }
    
    const opp = oppPk(pk);
    const oppHand = s[opp]?.hand || [];
    
    if (!oppHand.length) {
      showPopup("HEADS → but opponent's hand is empty!");
      return;
    }
    

    const randomIdx = Math.floor(Math.random() * oppHand.length);
    const card = oppHand.splice(randomIdx, 1)[0];
    

    const oppDeck = s[opp]?.deck || [];
    oppDeck.push(card);
    shuffleArray(oppDeck);
    
    showPopup(`HEADS → Revealed ${card.name} and shuffled it into deck!`);
  },

  bonus_damage_if_opponent_ex: async (s, pk, { param1 }, ctx) => {
    const oppImg = getActiveImg(oppPk(pk));
    if (!oppImg) return;
    

    let isEx = false;
    try {
      const meta = await globalThis.fetchCardMeta(oppImg.dataset.set, oppImg.dataset.num);
      isEx = meta.suffix?.toUpperCase() === 'EX';
    } catch (e) {

      const name = (oppImg.alt || '').toLowerCase();
      isEx = name.includes(' ex');
    }
    
    if (isEx) {
      const bonus = parseInt10(param1, 30);
      ctx.addBonus(bonus);
      if (ctx.isFinal) {
        showPopup(`+${bonus} damage (opponent is Pokémon ex)!`);
      }
    }
  },

  increase_self_damage_next_turn: async (s, pk, { param1, param2 }, ctx) => {
    if (!ctx.isFinal) return;
    
    const attackName = param1;
    const bonus = parseInt10(param2, 60);
    
    const img = getActiveImg(pk);
    if (!img) return;
    

    globalThis.__attackBonuses ??= {};
    const key = `${img.dataset.instanceId || img.alt}_${attackName}`;
    globalThis.__attackBonuses[key] = bonus;
    
    showPopup(`Next turn, ${attackName} will do +${bonus} damage!`);
  },

  inflict_status_heavy: async (s, pk, { param1, param2 }, ctx) => {
    if (!ctx.isFinal) return;
    
    const status = (param1 || 'poison').toLowerCase();
    const damage = parseInt10(param2, 20);
    
    applyStatus(oppPk(pk), status);
    

    const oppImg = getActiveImg(oppPk(pk));
    if (oppImg) {
      oppImg.dataset.heavyPoison = damage;
    }
    
    showPopup(`Inflicted heavy ${status} (${damage} damage per checkup)!`);
  },

  bonus_damage_if_opponent_type: async (s, pk, { param1, param2 }, ctx) => {
    const oppImg = getActiveImg(oppPk(pk));
    if (!oppImg) return;
    
    const targetType = (param1 || 'metal').toLowerCase();
    const bonus = parseInt10(param2, 30);
    
    try {
      const meta = await globalThis.fetchCardMeta(oppImg.dataset.set, oppImg.dataset.num);
      const hasType = meta.types?.some(t => t.toLowerCase() === targetType);
      
      if (hasType) {
        ctx.addBonus(bonus);
        if (ctx.isFinal) {
          showPopup(`+${bonus} damage (opponent is ${targetType}-type)!`);
        }
      }
    } catch {}
  },

  flip_inflict_effect_self_if_tails: async (s, pk, { param1 }, ctx) => {
    if (!ctx.isFinal) return;
    
    if ((await flipCoin(pk)) === 'heads') {
      showPopup('HEADS → no additional effect.');
      return;
    }
    
    const effect = (param1 || '').toLowerCase();
    
    if (effect === 'attack_lock_self') {
      const img = getActiveImg(pk);
      if (img) {
        globalThis.__specialEffects ??= { p1: {}, p2: {} };
        globalThis.__specialEffects[pk].attackLockSelf = true;
        showPopup("TAILS → This Pokémon can't attack next turn!");
      }
    }
  },

  discard_random_energy_self: async (s, pk, { param1 }, ctx) => {
    if (!ctx.isFinal) return;
    
    const count = parseInt10(param1, 1);
    const img = getActiveImg(pk);
    if (!img) return;
    
    const slot = getSlotFromImg(img);
    const energyBox = slot?.querySelector('.energy-pips');
    const pips = Array.from(energyBox?.querySelectorAll('.energy-pip:not(.phantom-pip)') || []);
    
    if (!pips.length) {
      showPopup('No energy to discard.');
      return;
    }
    
    const toDiscard = Math.min(count, pips.length);
    for (let i = 0; i < toDiscard; i++) {
      const randomIdx = Math.floor(Math.random() * pips.length);
      pips.splice(randomIdx, 1)[0].remove();
    }
    
    showPopup(`Discarded ${toDiscard} random energy from this Pokémon!`);
  },

  inflict_status_self: async (s, pk, { param1 }, ctx) => {
    if (!ctx.isFinal) return;
    
    const status = (param1 || 'asleep').toLowerCase();
    applyStatus(pk, status);
    showPopup(`This Pokémon is now ${status}!`);
  },

  reveal_opponent_hand: async (s, pk, p, ctx) => {
    if (!ctx.isFinal) return;
    
    const opp = oppPk(pk);
    const oppHand = s[opp]?.hand || [];
    
    if (!oppHand.length) {
      showPopup("Opponent's hand is empty!");
      return;
    }
    
    const names = oppHand.map(c => c.name).join(', ');
    showPopup(`Opponent's hand: ${names}`);
  },

  flip_until_tails_bonus_damage: async (s, pk, { param1 }, ctx) => {
    const bonusPerHeads = parseInt10(param1, 40);
    let heads = 0;
    
    while ((await flipCoin(pk)) === 'heads') {
      heads++;
    }
    
    if (heads > 0) {
      const totalBonus = heads * bonusPerHeads;
      ctx.addBonus(totalBonus);
      if (ctx.isFinal) {
        showPopup(`${heads} heads → +${totalBonus} damage!`);
      }
    } else if (ctx.isFinal) {
      showPopup('First flip was tails.');
    }
  },

  attach_multiple_energy_from_zone_self: async (s, pk, { param1, param2 }, ctx) => {
    if (!ctx.isFinal) return;
    
    const energyType = (param1 || 'fire').toLowerCase();
    const count = parseInt10(param2, 3);
    
    const img = getActiveImg(pk);
    if (!img) return;
    
    for (let i = 0; i < count; i++) {
      attachEnergy(img, energyType);
    }
    
    showPopup(`Attached ${count} ${energyType} Energy to this Pokémon!`);
  },

  random_single_target_damage: async (s, pk, { param1 }, ctx) => {
    if (!ctx.isFinal) return;
    
    const damage = parseInt10(param1, 30);
    const oppImgs = getAllPokemonImgs(oppPk(pk));
    
    if (!oppImgs.length) {
      showPopup('No opponent Pokémon to damage.');
      return;
    }
    

    const target = oppImgs[Math.floor(Math.random() * oppImgs.length)];
    damageImg(target, damage);
    
    showPopup(`Random target: ${target.alt} took ${damage} damage!`);
  },

  bench_damage_opponent_with_energy: async (s, pk, { param1 }, ctx) => {
    if (!ctx.isFinal) return;
    
    const damage = parseInt10(param1, 20);
    const benchImgs = getBenchImgs(oppPk(pk));
    const knockedPokemon = [];
    

    const attackerImg = ctx?.attackerImg || getActiveImg(pk);
    
    let count = 0;
    for (const img of benchImgs) {
      const slot = getSlotFromImg(img);
      const energyBox = slot?.querySelector('.energy-pips');
      const pips = energyBox?.querySelectorAll('.energy-pip:not(.phantom-pip)');
      
      if (pips && pips.length > 0) {
        const result = damageImg(img, damage, attackerImg);
        if (result.knocked) {
          const owner = img.closest('#player1') ? 'player1' : 'player2';
          knockedPokemon.push({ img, owner });
        }
        count++;
      }
    }
    
    if (count > 0) {
      showPopup(`${damage} damage to ${count} benched Pokémon with energy!`);
    }
    

    if (knockedPokemon.length > 0) {
      setTimeout(async () => {
        for (const { img, owner } of knockedPokemon) {
          if (typeof handleKnockOut === 'function') {
            await handleKnockOut(owner, img, false);
          }
        }
      }, 500);
    }
  },

  flip_multiplier_per_energy: async (s, pk, { param1, param2 }, ctx) => {
    const energyType = (param1 || 'metal').toLowerCase();
    const damagePerHeads = parseInt10(param2, 50);
    
    const img = getActiveImg(pk);
    if (!img) return;
    

    const slot = getSlotFromImg(img);
    const energyBox = slot?.querySelector('.energy-pips');
    const pips = Array.from(energyBox?.querySelectorAll('.energy-pip:not(.phantom-pip)') || []);
    const typeCount = pips.filter(pip => (pip.dataset.type || '').toLowerCase() === energyType).length;
    
    if (typeCount === 0) {
      if (ctx.isFinal) showPopup(`No ${energyType} Energy attached!`);
      return;
    }
    

    let heads = 0;
    for (let i = 0; i < typeCount; i++) {
      if ((await flipCoin(pk)) === 'heads') heads++;
    }
    
    const totalDamage = heads * damagePerHeads;
    ctx.setOverride(totalDamage);
    
    if (ctx.isFinal) {
      showPopup(`${heads}/${typeCount} heads → ${totalDamage} damage!`);
    }
  },

  
  
  

  

  bonus_damage_conditional: async (s, pk, { param1, param2 }, ctx) => {
    const amount = parseInt10(param1, 0);
    const condition = (param2 || '').toLowerCase();
    
    
    const attacker = getActiveImg(pk);
    const defender = getActiveImg(oppPk(pk));
    
    let conditionMet = false;
    
    switch (condition) {
      case 'opponent_basic':
        if (defender) {
          const meta = await globalThis.fetchCardMeta(defender.dataset.set, defender.dataset.num);
          conditionMet = (meta.stage || '').toLowerCase() === 'basic';
        }
        break;
        
      case 'opponent_has_ability':
        if (defender) {
          const abilityRow = await globalThis.getAbilityRowForCard?.(defender.dataset.set, defender.dataset.num);
          conditionMet = !!abilityRow;
        }
        break;
        
      case 'opponent_has_more_hp':
        if (attacker && defender) {
          const attackerMaxHp = parseInt10(attacker.dataset.hp);
          const defenderMaxHp = parseInt10(defender.dataset.hp);
          conditionMet = defenderMaxHp > attackerMaxHp;
        }
        break;
        
      case 'opponent_has_status':
        if (defender) {
          conditionMet = !!(defender.dataset.status);
        }
        break;
        
      case 'own_bench_damaged':
        const benchPokemon = getBenchImgs(pk);
        conditionMet = benchPokemon.some(img => {
          const maxHp = parseInt10(img.dataset.hp);
          const curHp = parseInt10(img.dataset.chp);
          return curHp < maxHp;
        });
        break;
        
      case 'switched_in':
        const playedTurn = parseInt10(attacker?.dataset.playedTurn, 0);
        const currentTurn = globalThis.turnNumber || 0;
        conditionMet = playedTurn === currentTurn;
        break;
        
      case 'supporter_played_this_turn':

        if (!globalThis.__supporterPlayedThisTurn) globalThis.__supporterPlayedThisTurn = { p1: false, p2: false };
        conditionMet = globalThis.__supporterPlayedThisTurn[pk] === true;
        break;
    }
    
    if (conditionMet) {
      ctx.addBonus(amount);

      if (typeof showPopup === 'function') {
        const conditionName = condition === 'supporter_played_this_turn' ? 'Supporter played this turn' :
                             condition === 'opponent_basic' ? 'Opponent is Basic' :
                             condition === 'opponent_has_ability' ? 'Opponent has Ability' :
                             condition === 'opponent_has_more_hp' ? 'Opponent has more HP' :
                             condition === 'opponent_has_status' ? 'Opponent has Status' :
                             condition === 'own_bench_damaged' ? 'Own Bench damaged' :
                             condition === 'switched_in' ? 'Switched in this turn' : condition;
        showPopup(`Brave Buddies: +${amount} damage (${conditionName})!`);
      }
    } else {
    }
  },
  

  bench_damage_per_energy_on_target: async (s, pk, { param1 }, ctx) => {
    if (!ctx.isFinal) return;
    
    const damagePerEnergy = parseInt10(param1, 20);
    const oppPlayer = oppPk(pk);
    

    const candidates = [
      getActiveImg(oppPlayer),
      ...getBenchImgs(oppPlayer)
    ].filter(Boolean);
    
    if (!candidates.length) {
      showPopup('No Pokemon to damage.');
      return;
    }
    

    const attackerImg = ctx?.attackerImg || getActiveImg(pk);
    
    showPopup('Energy Arrow: Choose a Pokemon to damage.');
    const target = await awaitSelection(candidates);
    if (!target) {
      showPopup('Damage cancelled.');
      return;
    }
    
    const energyCount = countPipsOn(target.closest('.card-slot')).total;
    const totalDamage = energyCount * damagePerEnergy;
    
    if (totalDamage > 0) {
      damageImg(target, totalDamage, attackerImg);
      showPopup(`${target.alt} took ${totalDamage} damage (${energyCount} energy × ${damagePerEnergy})!`);
    } else {
      showPopup(`${target.alt} has no energy attached.`);
    }
  },
  

  bench_damage_to_damaged_only: async (s, pk, { param1 }, ctx) => {
    if (!ctx.isFinal) return;
    
    const damage = parseInt10(param1, 100);
    const oppPlayer = oppPk(pk);
    

    const allOpponentPokemon = [
      getActiveImg(oppPlayer),
      ...getBenchImgs(oppPlayer)
    ].filter(Boolean);
    

    const damagedPokemon = [];
    for (const img of allOpponentPokemon) {
      const slot = img.closest('.card-slot');
      const modifiedMaxHp = slot?.dataset.maxHp ? parseInt10(slot.dataset.maxHp) : null;
      const maxHp = modifiedMaxHp || parseInt10(img.dataset.hp);
      const curHp = parseInt10(img.dataset.chp, maxHp);
      
      if (curHp < maxHp) {
        damagedPokemon.push(img);
      }
    }
    
    if (damagedPokemon.length === 0) {
      showPopup('No damaged Pokemon to target.');
      return;
    }
    

    showPopup('Pierce the Pain: Select a damaged Pokemon to deal 100 damage.');
    const selected = await awaitSelection(damagedPokemon);
    
    if (!selected) {
      showPopup('No Pokemon selected.');
      return;
    }
    

    const attackerImg = ctx?.attackerImg || getActiveImg(pk);
    

    const result = damageImg(selected, damage, attackerImg);
    showPopup(`Pierce the Pain: Dealt ${damage} damage to ${selected.alt}!`);
    

    if (result.knocked) {

      const owner = selected.closest('#player1') ? 'player1' : 'player2';

      const wasActive = selected.closest('.active');
      

      setTimeout(async () => {
        if (typeof globalThis.handleKnockOut === 'function') {
          const gameEnded = await globalThis.handleKnockOut(owner, selected, wasActive);

          if (!gameEnded && wasActive && typeof globalThis.beginPromotionFlow === 'function') {
            globalThis.beginPromotionFlow(owner);
          }
        }
      }, 500);
    }
  },
  

  discard_random_energy_from_both: async (s, pk, p, ctx) => {
    if (!ctx.isFinal) return;
    

    for (const player of [pk, oppPk(pk)]) {
      const activeImg = getActiveImg(player);
      if (!activeImg) continue;
      
      const slot = activeImg.closest('.card-slot');
      const pips = Array.from(slot.querySelectorAll('.energy-pip:not(.phantom-pip)'));
      
      if (pips.length === 0) continue;
      

      const randomPip = pips[Math.floor(Math.random() * pips.length)];
      const energyType = randomPip.dataset.type || 'colorless';
      
      randomPip.remove();
      
      const owner = player === 'p1' ? 'player1' : 'player2';
      showPopup(`${owner === pkToPlayer(pk) ? 'You' : 'Opponent'} discarded 1 ${energyType} energy!`);
    }
    
    if (globalThis.updateAllEnergyVisuals) {
      globalThis.updateAllEnergyVisuals();
    }
  },
  

  discard_random_item_from_opponent_hand: async (s, pk, p, ctx) => {
    if (!ctx.isFinal) return;
    
    const oppHand = s[oppPk(pk)].hand || [];
    const items = [];
    
    for (const card of oppHand) {
      try {
        const meta = await globalThis.fetchCardMeta(card.set, card.number || card.num);
        if ((meta.category || '').toLowerCase() === 'trainer' && 
            (meta.trainerType || '').toLowerCase() === 'item') {
          items.push(card);
        }
      } catch (e) {}
    }
    
    if (items.length === 0) {
      showPopup('Opponent has no Item cards to discard.');
      return;
    }
    
    const randomItem = items[Math.floor(Math.random() * items.length)];
    const idx = oppHand.indexOf(randomItem);
    if (idx >= 0) {
      oppHand.splice(idx, 1);
      showPopup(`Opponent discarded ${randomItem.name}!`);
      
      if (globalThis.renderAllHands) {
        globalThis.renderAllHands();
      }
    }
  },
  

  inflict_random_status: async (s, pk, p, ctx) => {
    if (!ctx.isFinal) return;
    
    const statuses = ['burned', 'poisoned', 'confused', 'paralyzed', 'asleep'];
    const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
    
    applyStatus(oppPk(pk), randomStatus);
    showPopup(`Opponent is now ${randomStatus}!`);
  },

  

  bonus_damage_during_next_turn: async (s, pk, { param1 }, ctx) => {
    if (!ctx.isFinal) return;
    
    const bonusAmount = parseInt10(param1, 0);
    

    if (!globalThis.state) globalThis.state = {};
    if (!globalThis.state.temp) globalThis.state.temp = { p1: {}, p2: {} };
    if (!globalThis.state.temp[pkToPlayer(pk)]) globalThis.state.temp[pkToPlayer(pk)] = {};
    
    globalThis.state.temp[pkToPlayer(pk)].nextTurnDamageBonus = bonusAmount;
    
    showPopup(`Next turn's attack will deal +${bonusAmount} damage!`);
  },

  increase_incoming_damage_next_turn: async (s, pk, { param1 }, ctx) => {
    if (!ctx.isFinal) return;
    
    const increaseAmount = parseInt10(param1, 30);
    const oppPlayer = oppPk(pk);
    const oppImg = getActiveImg(oppPlayer);
    
    if (!oppImg) return;
    

    oppImg.dataset.incomingDamageIncrease = increaseAmount;
    
    showPopup(`Opponent will take +${increaseAmount} damage next turn!`);
  },
  

  increase_opponent_costs_next_turn: async (s, pk, { param1 }, ctx) => {
    if (!ctx.isFinal) return;
    
    const costIncrease = parseInt10(param1, 2);
    
    if (!globalThis.__specialEffects) globalThis.__specialEffects = { p1: {}, p2: {} };
    if (!globalThis.__specialEffects[oppPk(pk)]) globalThis.__specialEffects[oppPk(pk)] = {};
    
    globalThis.__specialEffects[oppPk(pk)].attackCostIncrease = costIncrease;
    
    showPopup(`Opponent's attacks cost +${costIncrease} energy next turn!`);
  },
  

  inflict_effect_counter_next_turn: async (s, pk, { param1 }, ctx) => {
    if (!ctx.isFinal) return;
    
    const counterDamage = parseInt10(param1, 60);
    const selfImg = getActiveImg(pk);
    
    if (!selfImg) return;
    

    selfImg.dataset.counterDamageNextTurn = counterDamage;
    
    showPopup(`If attacked next turn, will deal ${counterDamage} damage back!`);
  },
  

  attach_energy_from_zone_to_self: async (s, pk, { param1 }, ctx) => {
    if (!ctx.isFinal) return;
    
    const energyType = (param1 || 'colorless').toLowerCase();
    const selfImg = getActiveImg(pk);
    
    if (!selfImg) {
      showPopup('No active Pokemon to attach energy to.');
      return;
    }
    
    const slot = selfImg.closest('.card-slot');
    const owner = pkToPlayer(pk);
    

    if (globalThis.attachEnergyToSlot) {
      globalThis.attachEnergyToSlot(owner, slot, energyType);
      showPopup(`Attached 1 ${energyType} energy to ${selfImg.alt}!`);
    }
  },
  
  
  

  flip_conditional_burn: async (s, pk, { param1 }, ctx) => {
    if (!ctx.isFinal) return;
    
    const flipCount = parseInt10(param1, 2);
    let headsCount = 0;
    
    for (let i = 0; i < flipCount; i++) {
      const result = await flipCoin(pk);
      if (result === 'heads') headsCount++;
    }
    
    showPopup(`Flipped ${headsCount}/${flipCount} heads!`);
    

    if (headsCount === flipCount) {
      applyStatus(oppPk(pk), 'burned');
      showPopup('Opponent is now burned!');
    }
  },
  

  flip_discard_energy_if_heads: async (s, pk, p, ctx) => {
    if (!ctx.isFinal) return;
    
    const result = await flipCoin(pk);
    
    if (result === 'heads') {
      const oppImg = getActiveImg(oppPk(pk));
      if (!oppImg) return;
      
      const slot = oppImg.closest('.card-slot');
      const pips = Array.from(slot.querySelectorAll('.energy-pip:not(.phantom-pip)'));
      
      if (pips.length === 0) {
        showPopup('Heads! But opponent has no energy to discard.');
        return;
      }
      

      const randomPip = pips[Math.floor(Math.random() * pips.length)];
      const energyType = randomPip.dataset.type || 'colorless';
      randomPip.remove();
      
      showPopup(`Heads! Discarded 1 ${energyType} energy!`);
      
      if (globalThis.updateAllEnergyVisuals) {
        globalThis.updateAllEnergyVisuals();
      }
    } else {
      showPopup('Tails! No energy discarded.');
    }
  },
  

  flip_self_damage_if_tails: async (s, pk, { param1 }, ctx) => {
    if (!ctx.isFinal) return;
    
    const selfDamage = parseInt10(param1, 20);
    const result = await flipCoin(pk);
    
    if (result === 'tails') {
      const selfImg = getActiveImg(pk);
      if (selfImg) {
        damageImg(selfImg, selfDamage);
        showPopup(`Tails! ${selfImg.alt} took ${selfDamage} damage!`);
      }
    } else {
      showPopup('Heads! No self-damage.');
    }
  },
  

  flip_multiplier_until_tails: async (s, pk, { param1 }, ctx) => {
    const baseDamage = parseInt10(param1, 10);
    let headsCount = 0;
    

    while (true) {
      const result = await flipCoin(pk);
      if (result === 'heads') {
        headsCount++;
      } else {
        break;
      }
    }
    
    const totalDamage = headsCount * baseDamage;
    ctx.bonusDamage = (ctx.bonusDamage || 0) + totalDamage;
    
    if (ctx.isFinal) {
      showPopup(`Flipped ${headsCount} heads before tails! Total: ${totalDamage} damage!`);
    }
  },
  

  flip_prevent_damage_and_effects_next_turn: async (s, pk, p, ctx) => {
    if (!ctx.isFinal) return;
    
    const result = await flipCoin(pk);
    
    if (result === 'heads') {
      const selfImg = getActiveImg(pk);
      if (selfImg) {

        selfImg.dataset.preventAllNextTurn = 'true';
        showPopup('Heads! This Pokemon prevents all damage and effects next turn!');
      }
    } else {
      showPopup('Tails! No effect.');
    }
  },
  

  flip_reveal_and_shuffle: async (s, pk, p, ctx) => {
    if (!ctx.isFinal) return;
    
    const result = await flipCoin(pk);
    
    if (result === 'heads') {
      const oppDeck = s[oppPk(pk)].deck || [];
      const oppHand = s[oppPk(pk)].hand || [];
      
      if (oppHand.length === 0) {
        showPopup('Heads! But opponent has no cards in hand.');
        return;
      }
      

      const handNames = oppHand.map(c => c.name).join(', ');
      showPopup(`Heads! Opponent's hand: ${handNames}`);
      

      oppDeck.push(...oppHand);
      oppHand.length = 0;
      

      for (let i = oppDeck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [oppDeck[i], oppDeck[j]] = [oppDeck[j], oppDeck[i]];
      }
      
      showPopup('Shuffled hand into deck!');
      
      if (globalThis.renderAllHands) {
        globalThis.renderAllHands();
      }
      if (globalThis.updateDeckBubbles) {
        globalThis.updateDeckBubbles();
      }
    } else {
      showPopup('Tails! No effect.');
    }
  },

  

  search_evolution_of_self: async (s, pk, p, ctx) => {
    if (!ctx.isFinal) return;
    
    const selfImg = getActiveImg(pk);
    if (!selfImg) return;
    
    const selfMeta = await globalThis.fetchCardMeta(selfImg.dataset.set, selfImg.dataset.num);
    const selfName = (selfMeta.name || '').toLowerCase();
    
    const deck = s[pk].deck || [];
    const evolutions = [];
    

    for (const card of deck) {
      try {
        const meta = await globalThis.fetchCardMeta(card.set, card.number || card.num);
        const evolvesFrom = (meta.evolveFrom || '').toLowerCase();
        
        if (evolvesFrom === selfName) {
          evolutions.push({ card, meta });
        }
      } catch (e) {}
    }
    
    if (evolutions.length === 0) {
      showPopup(`No evolution of ${selfMeta.name} found in deck.`);
      return;
    }
    

    let chosen;
    if (evolutions.length === 1) {
      chosen = evolutions[0];
    } else {
      showPopup(`Choose evolution: ${evolutions.map(e => e.meta.name).join(', ')}`);

      chosen = evolutions[0];
    }
    

    const idx = deck.findIndex(c => c.set === chosen.card.set && (c.number || c.num) === (chosen.card.number || chosen.card.num));
    if (idx >= 0) {
      deck.splice(idx, 1);
      (s[pk].hand ||= []).push(chosen.card);
      showPopup(`Added ${chosen.meta.name} to hand!`);
      
      if (globalThis.renderAllHands) {
        globalThis.renderAllHands();
      }
      if (globalThis.updateDeckBubbles) {
        globalThis.updateDeckBubbles();
      }
      if (globalThis.logEvent) {
        const owner = pk === 'p1' ? 'player1' : 'player2';
        globalThis.logEvent({
          player: owner,
          text: `Found ${chosen.meta.name} from deck search`,
          cardSet: chosen.card.set,
          cardNum: chosen.card.number || chosen.card.num
        });
      }
    }
  },
  

  search_named_to_bench: async (s, pk, { param1 }, ctx) => {
    if (!ctx.isFinal) return;
    
    const targetName = (param1 || '').toLowerCase();
    const deck = s[pk].deck || [];
    const bench = getBenchImgs(pk);
    

    if (bench.filter(img => img).length >= 3) {
      showPopup('Bench is full!');
      return;
    }
    

    const matches = deck.filter(card => 
      (card.name || '').toLowerCase().includes(targetName)
    );
    
    if (matches.length === 0) {
      showPopup(`No ${param1} found in deck.`);
      return;
    }
    

    const card = matches[0];

    const idx = deck.findIndex(c => c.set === card.set && (c.number || c.num) === (card.number || card.num));
    if (idx !== -1) {
    deck.splice(idx, 1);
    }
    

    if (globalThis.putCardOnBench) {
      globalThis.putCardOnBench(pkToPlayer(pk), card.set, card.number || card.num);
      showPopup(`Put ${card.name} on bench!`);
    }
    
    if (globalThis.updateDeckBubbles) {
      globalThis.updateDeckBubbles();
    }
  },
  

  switch_self_with_bench_type: async (s, pk, { param1 }, ctx) => {
    if (!ctx.isFinal) return;
    
    const requiredType = (param1 || '').toLowerCase();
    const benchPokemon = getBenchImgs(pk);
    

    const validTargets = [];
    for (const img of benchPokemon) {
      const types = await globalThis.getTypesForPokemon?.(img);
      if (types && types.some(t => t.toLowerCase() === requiredType)) {
        validTargets.push(img);
      }
    }
    
    if (validTargets.length === 0) {
      showPopup(`No ${param1}-type Pokemon on bench to switch with.`);
      return;
    }
    
    showPopup(`Choose ${param1}-type Pokemon to switch with.`);
    const chosen = await awaitSelection(validTargets);
    
    if (!chosen) {
      showPopup('Switch cancelled.');
      return;
    }
    

    if (globalThis.forceSwitchSpecific) {
      globalThis.forceSwitchSpecific(s, pk, chosen);
      showPopup(`Switched with ${chosen.alt}!`);
    }
  },
  
  
  

  self_inflict_effect: async (s, pk, { param1 }, ctx) => {
    if (!ctx.isFinal) return;
    
    const effect = (param1 || '').toLowerCase();
    

    if (effect === 'cant_attack_next_turn' || effect === 'attack_lock') {
      if (!globalThis.__specialEffects) globalThis.__specialEffects = { p1: {}, p2: {} };
      if (!globalThis.__specialEffects[pk]) globalThis.__specialEffects[pk] = {};
      
      globalThis.__specialEffects[pk].attackLock = true;
      showPopup('This Pokemon cannot attack next turn!');
    }
  },
  

  self_inflict_status: async (s, pk, { param1 }, ctx) => {
    if (!ctx.isFinal) return;
    
    const status = (param1 || '').toLowerCase();
    applyStatus(pk, status);
    showPopup(`${getActiveImg(pk)?.alt || 'This Pokemon'} is now ${status}!`);
  },
  

  inflict_double_status: async (s, pk, { param1, param2 }, ctx) => {
    if (!ctx.isFinal) return;
    
    const status1 = (param1 || '').toLowerCase();
    const status2 = (param2 || '').toLowerCase();
    

    if (status1) {
      applyStatus(oppPk(pk), status1);
    }
    

    if (status2) {
      setTimeout(() => {
        applyStatus(oppPk(pk), status2);
        showPopup(`Opponent is now ${status1} and ${status2}!`);
      }, 500);
    }
  },
  

  inflict_effect_retreat_lock: async (s, pk, p, ctx) => {
    if (!ctx.isFinal) return;
    
    if (!globalThis.__specialEffects) globalThis.__specialEffects = { p1: {}, p2: {} };
    if (!globalThis.__specialEffects[oppPk(pk)]) globalThis.__specialEffects[oppPk(pk)] = {};
    
    globalThis.__specialEffects[oppPk(pk)].retreatLock = true;
    showPopup('Opponent cannot retreat next turn!');
  },

  
  
  

  bonus_damage_per_energy_on_opponent_all: async (s, pk, { param1 }, ctx) => {
    const perEnergy = parseInt10(param1, 20);
    let totalEnergy = 0;
    

    const opp = oppPk(pk);
    const attackerOwner = pk === 'p1' ? 'player1' : 'player2';
    const oppOwner = opp === 'p1' ? 'player1' : 'player2';
    
    

    const oppActiveDiv = opp === 'p1' ? 
      (globalThis.p1Active || document.getElementById('p1Active')) : 
      (globalThis.p2Active || document.getElementById('p2Active'));
    const oppBenchDiv = opp === 'p1' ? 
      (globalThis.p1Bench || document.getElementById('p1Bench')) : 
      (globalThis.p2Bench || document.getElementById('p2Bench'));
    
    const oppActive = oppActiveDiv?.querySelector('img');
    const oppBenchImgs = Array.from(oppBenchDiv?.querySelectorAll('img') ?? []);
    const oppPokemon = [oppActive, ...oppBenchImgs].filter(Boolean);
    
    

    for (const img of oppPokemon) {
      if (!img) continue;
      

      const imgOwner = img.closest('#player1') ? 'player1' : (img.closest('#player2') ? 'player2' : null);
      if (imgOwner !== oppOwner) {
        continue;
      }
      
      const energyCount = countEnergy(img);
      totalEnergy += energyCount;
    }
    
    const bonus = totalEnergy * perEnergy;
    ctx.addBonus(bonus);
    if (ctx.isFinal) {
      showPopup(`Energy Crush: +${bonus} damage (${totalEnergy} energy on opponent's Pokemon)`);
    }
  },
  

  bonus_damage_for_each_energy_on_all_opponent_pokemon: async (s, pk, p, ctx) => {

    return MOVE_HANDLERS.bonus_damage_per_energy_on_opponent_all(s, pk, { param1: p.param1 }, ctx);
  }
  

  ,bonus_damage_for_each_energy_type: async (s, pk, p, ctx) => {
    if (ctx.isFinal) return;
    
    const energyType = (p.param1 || '').toLowerCase();
    const perEnergy = parseInt10(p.param2, 10);
    
    const activeImg = getActiveImg(pk);
    if (!activeImg) return;
    
    const slot = getSlotFromImg(activeImg);
    const energyBox = slot?.querySelector('.energy-pips');
    if (!energyBox) return;
    
    const pips = energyBox.querySelectorAll('.energy-pip');
    const typeCount = Array.from(pips).filter(p => p.dataset.type === energyType).length;
    
    const bonus = typeCount * perEnergy;
    ctx.damage += bonus;
  }
  

  ,bonus_damage_for_each_evolution_bench: async (s, pk, p, ctx) => {
    if (ctx.isFinal) return;
    
    const perEvo = parseInt10(p.param1, 30);
    const benchImgs = getBenchImgs(pk);
    
    let evoCount = 0;
    for (const img of benchImgs) {
      try {
        const meta = await fetchCardMeta(img.dataset.set, img.dataset.num);

        if (meta.stage && meta.stage.toLowerCase() !== 'basic') {
          evoCount++;
        }
      } catch (e) {

      }
    }
    
    const bonus = evoCount * perEvo;
    ctx.damage += bonus;
  }
  

  ,bonus_damage_if_evolved_this_turn: async (s, pk, p, ctx) => {
    if (ctx.isFinal) return;
    
    const bonus = parseInt10(p.param1, 20);
    const activeImg = getActiveImg(pk);
    if (!activeImg) return;
    
    const playedTurn = parseInt(activeImg.dataset.playedTurn || '0', 10);
    if (playedTurn === globalThis.turnNumber) {
      ctx.damage += bonus;
      showPopup(`Beginning Bolt: +${bonus} damage (evolved this turn)!`);
    }
  }
  

  ,bonus_damage_if_last_move_name_used: async (s, pk, p, ctx) => {

    if (!ctx.isFinal) {

      if (!globalThis.__moveHistory) globalThis.__moveHistory = { p1: [], p2: [] };
      if (!globalThis.__moveHistory[pk]) globalThis.__moveHistory[pk] = [];

      return;
    }
    
    const moveName = p.param1 || 'Sweets Relay';
    const bonus = parseInt10(p.param2, 20);
    

    if (!globalThis.__moveHistory) globalThis.__moveHistory = { p1: [], p2: [] };
    
    const lastTurnMoves = globalThis.__moveHistory[pk] || [];
    const usedLastTurn = lastTurnMoves.some(move => 
      move.name && move.name.toLowerCase() === moveName.toLowerCase()
    );
    
    if (usedLastTurn) {
      ctx.addBonus(bonus);
      showPopup(`${moveName}: +${bonus} damage (used last turn)!`);
    }
    

      if (!globalThis.__moveHistory[pk]) globalThis.__moveHistory[pk] = [];
    globalThis.__moveHistory[pk].push({ name: ctx.moveName || moveName, turn: globalThis.turnNumber });
      

      globalThis.__moveHistory[pk] = globalThis.__moveHistory[pk].filter(m => 
        m.turn >= globalThis.turnNumber - 1
      );
  }
  

  ,damage_times_move_name_used: async (s, pk, p, ctx) => {
    if (ctx.isFinal) return;
    
    const moveName = ctx.moveName || '';
    

    if (!globalThis.__moveUseCount) globalThis.__moveUseCount = { p1: {}, p2: {} };
    if (!globalThis.__moveUseCount[pk]) globalThis.__moveUseCount[pk] = {};
    
    const count = globalThis.__moveUseCount[pk][moveName] || 0;
    

    const multiplier = Math.max(1, count);
    ctx.damage = ctx.damage * multiplier;
    
    

    if (ctx.isFinal) {
      if (!globalThis.__moveUseCount) globalThis.__moveUseCount = { p1: {}, p2: {} };
      if (!globalThis.__moveUseCount[pk]) globalThis.__moveUseCount[pk] = {};
      globalThis.__moveUseCount[pk][moveName] = (globalThis.__moveUseCount[pk][moveName] || 0) + 1;
    }
  }
  

  ,damage_per_other_move_used: async (s, pk, p, ctx) => {
    if (ctx.isFinal) return;
    
    const moveNameToCount = (p.param1 || '').trim();
    const damagePerUse = parseInt10(p.param2, 40);
    
    if (!moveNameToCount) {
      return;
    }
    

    if (!globalThis.__moveUseCount) globalThis.__moveUseCount = { p1: {}, p2: {} };
    if (!globalThis.__moveUseCount[pk]) globalThis.__moveUseCount[pk] = {};
    

    const count = globalThis.__moveUseCount[pk][moveNameToCount] || 0;
    

    const bonusDamage = count * damagePerUse;
    ctx.addBonus(bonusDamage);
    
    
    if (bonusDamage > 0) {
      showPopup(`Sweets Overload: +${bonusDamage} damage (${moveNameToCount} used ${count} time${count !== 1 ? 's' : ''})!`);
    }
  }
  

  ,flip_bonus_damage_until_tails: async (s, pk, p, ctx) => {
    if (ctx.isFinal) return;
    
    const bonusPerHeads = parseInt10(p.param1, 20);
    
    let headsCount = 0;
    let result;
    
    do {
      result = await coinFlip();
      if (result === 'heads') {
        headsCount++;
      }
    } while (result === 'heads');
    
    const bonus = headsCount * bonusPerHeads;
    ctx.damage += bonus;
    
    showPopup(`Flipped ${headsCount} heads, +${bonus} damage!`);
  }
  

  ,flip_two_stage: async (s, pk, p, ctx) => {
    if (ctx.isFinal) return;
    

    const ttDamage = parseInt10(p.param1, 0);
    const mixedDamage = parseInt10(p.param2, 40);
    const hhDamage = parseInt10(p.param3, 80);
    
    const flip1 = await coinFlip();
    const flip2 = await coinFlip();
    
    const headsCount = (flip1 === 'heads' ? 1 : 0) + (flip2 === 'heads' ? 1 : 0);
    
    if (headsCount === 0) {
      ctx.damage = ttDamage;
      showPopup(`Both tails! ${ttDamage} damage.`);
    } else if (headsCount === 1) {
      ctx.damage = mixedDamage;
      showPopup(`One heads! ${mixedDamage} damage.`);
    } else {
      ctx.damage = hhDamage;
      showPopup(`Both heads! ${hhDamage} damage.`);
    }
    
  }
  

  ,inflict_effect_if_basic: async (s, pk, p, ctx) => {
    if (!ctx.isFinal) return;
    
    const effect = p.param1 || '';
    
    const oppActive = getActiveImg(oppPk(pk));
    if (!oppActive) return;
    
    try {
      const meta = await fetchCardMeta(oppActive.dataset.set, oppActive.dataset.num);
      const isBasic = (meta.stage || '').toLowerCase() === 'basic';
      
      if (isBasic) {

        if (effect === 'attack_lock') {
          if (!globalThis.__specialEffects) globalThis.__specialEffects = { p1: {}, p2: {} };
          globalThis.__specialEffects[oppPk(pk)].attackLock = true;
          showPopup('Opponent Basic Pokemon cannot attack next turn!');
        } else if (effect === 'cant_attack_next_turn') {
          if (!globalThis.__specialEffects) globalThis.__specialEffects = { p1: {}, p2: {} };
          globalThis.__specialEffects[oppPk(pk)].cantAttackNextTurn = true;
          showPopup('Opponent Basic Pokemon cannot attack next turn!');
        }
      } else {
        showPopup('Opponent is not a Basic Pokemon - no effect.');
      }
    } catch (e) {
      console.error('[inflict_effect_if_basic] Failed to check stage:', e);
    }
  }
  

  ,bonus_damage_for_each_benched: async (s, pk, p, ctx) => {
    if (ctx.isFinal) return;
    
    const target = p.param1 || 'self';
    const perBench = parseInt10(p.param2, 10);
    
    const targetPk = target === 'opponent' ? oppPk(pk) : pk;
    const benchImgs = getBenchImgs(targetPk);
    
    const bonus = benchImgs.length * perBench;
    ctx.damage += bonus;
  }
  

  ,bench_damage_all_self: async (s, pk, p, ctx) => {
    if (!ctx.isFinal) return;
    
    const damage = parseInt10(p.param1, 10);
    const benchImgs = getBenchImgs(pk);
    
    for (const img of benchImgs) {
      await damageImg(img, damage);
    }
    
    if (benchImgs.length > 0) {
      showPopup(`Damaged all ${benchImgs.length} benched Pokemon for ${damage} each!`);
    }
  }

  ,flip_both_heads_bonus: async (s, pk, { param1 }, ctx) => {
    if (!ctx.isFinal) return;
    
    const bonus = parseInt10(param1, 80);
    const coin1 = await flipCoin(pk);
    const coin2 = await flipCoin(pk);
    
    if (coin1 === 'heads' && coin2 === 'heads') {
      ctx.addBonus(bonus);
      showPopup(`HEADS + HEADS → +${bonus} damage!`);
    } else {
      showPopup(`Coin flips: ${coin1.toUpperCase()} + ${coin2.toUpperCase()} → No bonus.`);
    }
  },

  stacking_damage_boost: async (s, pk, { param1 }, ctx) => {
    const boost = parseInt10(param1, 30);
    const img = getActiveImg(pk);
    if (!img) return;
    

    const currentStacks = parseInt10(img.dataset.stackingDamageBoost || '0', 0);
    const newStacks = currentStacks + 1;
    img.dataset.stackingDamageBoost = String(newStacks);
    
    const totalBoost = boost * newStacks;
    ctx.addBonus(totalBoost);
    
    if (ctx.isFinal) {
      showPopup(`Rolling Frenzy: +${totalBoost} damage (${newStacks} stack${newStacks > 1 ? 's' : ''})!`);
    }
  },

  reduce_energy_cost_if_damaged: async (s, pk, { param1 }, ctx) => {

    const img = getActiveImg(pk);
    if (!img) return;
    
    const { base, cur } = getHpFromImg(img);
    const hasDamage = cur < base;
    
    if (hasDamage && param1) {
      const [costReduction, energyType] = param1.split('|');
      img.dataset.reducedEnergyCostIfDamaged = param1;
      if (ctx.isFinal) {
        showPopup(`Defiant Spark: Attack cost reduced to ${costReduction} ${energyType.toUpperCase()} Energy!`);
      }
    }
  },

  bonus_damage_if_named_bench: async (s, pk, { param1, param2 }, ctx) => {
    const pokemonName = (param1 || '').toLowerCase();
    const bonus = parseInt10(param2, 20);
    
    if (!pokemonName) return;
    
    const benchImgs = getBenchImgs(pk);
    let found = false;
    
    for (const benchImg of benchImgs) {
      try {
        const meta = await globalThis.fetchCardMeta(benchImg.dataset.set, benchImg.dataset.num);
        const name = (meta.name || '').toLowerCase();
        if (name.includes(pokemonName) || pokemonName.includes(name)) {
          found = true;
          break;
        }
      } catch {}
    }
    
    if (found) {
      ctx.addBonus(bonus);
      if (ctx.isFinal) {
        showPopup(`+${bonus} damage (${param1} on bench)!`);
      }
    }
  },

  bonus_damage_if_multiple_energy_types: async (s, pk, { param1 }, ctx) => {
    const bonus = parseInt10(param1, 60);
    const img = getActiveImg(pk);
    if (!img) return;
    
    const slot = img.closest('.card-slot');
    if (!slot) return;
    
    const energyPips = Array.from(slot.querySelectorAll('.energy-pip'));
    const energyTypes = new Set();
    
    energyPips.forEach(pip => {
      const type = pip.dataset.type?.toLowerCase();
      if (type) energyTypes.add(type);
    });
    
    if (energyTypes.size >= 2) {
      ctx.addBonus(bonus);
      if (ctx.isFinal) {
        showPopup(`+${bonus} damage (${energyTypes.size} different energy types)!`);
      }
    }
  },

  damage_end_of_opponent_turn: async (s, pk, { param1 }, ctx) => {
    if (!ctx.isFinal) return;
    
    const damage = parseInt10(param1, 90);
    const oppPkKey = oppPk(pk);
    

    if (!globalThis.__endOfTurnDamage) globalThis.__endOfTurnDamage = {};
    if (!globalThis.__endOfTurnDamage[oppPkKey]) globalThis.__endOfTurnDamage[oppPkKey] = [];
    
    globalThis.__endOfTurnDamage[oppPkKey].push({
      damage,
      source: pk,
      turn: globalThis.turnNumber || 0
    });
    
    showPopup(`Cursed Prose: ${damage} damage will be dealt at end of opponent's next turn!`);
  },

  discard_tools_for_damage: async (s, pk, { param1 }, ctx) => {
    if (!ctx.isFinal) return;
    
    const maxTools = parseInt10(param1, 2);
    const hand = s[pk].hand || [];
    

    const tools = [];
    for (const card of hand) {
      try {
        const meta = await globalThis.fetchCardMeta(card.set, card.number || card.num);
        if (meta && String(meta.trainerType || '').toLowerCase() === 'tool') {
          tools.push(card);
        }
      } catch {}
    }
    
    if (tools.length === 0) {
      showPopup('No Tool cards in hand to discard.');
      return;
    }
    

    const selectedTools = await new Promise(resolve => {
      if (tools.length <= maxTools) {
        resolve(tools);
        return;
      }
      

      resolve(tools.slice(0, maxTools));
    });
    
    const damagePerTool = 50;
    const totalDamage = selectedTools.length * damagePerTool;
    

    for (const tool of selectedTools) {
      const idx = hand.findIndex(c => c.set === tool.set && (c.number || c.num) === (tool.number || tool.num));
      if (idx >= 0) {
        hand.splice(idx, 1);
        pushCardToDiscard(pkToPlayer(pk), tool);
      }
    }
    
    renderAllHands();
    ctx.addBonus(totalDamage);
    showPopup(`Discarded ${selectedTools.length} Tool card(s) → +${totalDamage} damage!`);
  },

  flip_inflict_status_both: async (s, pk, { param1 }, ctx) => {
    if (!ctx.isFinal) return;
    
    const statuses = (param1 || 'poisoned_paralyzed').split('_');
    
    if ((await flipCoin(pk)) === 'heads') {
      const oppImg = getActiveImg(oppPk(pk));
      if (oppImg) {

        for (const status of statuses) {
          if (status) {
            applyStatus(oppPk(pk), status);
          }
        }
        showPopup(`HEADS → Opponent is now ${statuses.join(' and ')}!`);
      }
    } else {
      showPopup('TAILS → No status effect.');
    }
  },

  devolve_opponent: async (s, pk, p, ctx) => {
    if (!ctx.isFinal) return;
    
    const oppImg = getActiveImg(oppPk(pk));
    if (!oppImg) return;
    
    try {
      const meta = await globalThis.fetchCardMeta(oppImg.dataset.set, oppImg.dataset.num);
      const stage = (meta.stage || '').toLowerCase();
      
      if (stage === 'basic') {
        showPopup('Opponent\'s Pokémon is already Basic.');
        return;
      }
      

      const evolveFrom = meta.evolveFrom || '';
      if (!evolveFrom) {
        showPopup('Cannot devolve: No evolution data found.');
        return;
      }
      
      
      showPopup(`Devolved opponent's ${meta.name} to ${evolveFrom}!`);
      

      const owner = oppImg.closest('#player1') ? 'player1' : 'player2';
      const slot = oppImg.closest('.card-slot');
      

      const evolutionCard = {
        set: oppImg.dataset.set,
        num: oppImg.dataset.num,
        name: evolveFrom
      };
      

      slot.innerHTML = '';
      markSlot(slot, false);
      

      playerState[owner].hand.push(evolutionCard);
      renderAllHands();
      
    } catch (err) {
      console.error('[devolve] Error:', err);
      showPopup('Error devolving opponent.');
    }
  },

  prevent_supporter_next_turn: async (s, pk, p, ctx) => {
    if (!ctx.isFinal) return;
    
    const oppPkKey = oppPk(pk);
    if (!globalThis.__specialEffects) globalThis.__specialEffects = {};
    if (!globalThis.__specialEffects[oppPkKey]) globalThis.__specialEffects[oppPkKey] = {};
    
    globalThis.__specialEffects[oppPkKey].preventSupporter = true;
    showPopup('Opponent cannot use Supporter cards next turn!');
  },

  discard_top_own_deck_bonus_if_type: async (s, pk, { param1, param2 }, ctx) => {
    if (!ctx.isFinal) return;
    
    const requiredType = (param1 || '').toLowerCase();
    const bonus = parseInt10(param2, 60);
    const deck = s[pk].deck || [];
    
    if (deck.length === 0) {
      showPopup('Deck is empty!');
      return;
    }
    
    const topCard = deck[0];
    deck.shift();
    
    try {
      const meta = await globalThis.fetchCardMeta(topCard.set, topCard.number || topCard.num);
      const cardType = (meta.types || [])[0]?.toLowerCase() || '';
      const category = (meta.category || '').toLowerCase();
      
      if (category === 'pokemon' && cardType === requiredType) {
        ctx.addBonus(bonus);
        showPopup(`Discarded ${meta.name} (${requiredType}) → +${bonus} damage!`);
      } else {
        showPopup(`Discarded ${meta.name || 'card'} (not ${requiredType} Pokémon).`);
      }
    } catch (err) {
      console.error('[discard_top_bonus] Error:', err);
      showPopup('Discarded top card (error checking type).');
    }
  },

  damage_equal_to_self_damage: async (s, pk, p, ctx) => {

    return MOVE_HANDLERS.bonus_damage_equal_to_self_damage(s, pk, p, ctx);
  },

  attach_multiple_energy_from_zone_self: async (s, pk, { param1, param2 }, ctx) => {
    if (!ctx.isFinal) return;
    
    const energyType = (param1 || 'darkness').toLowerCase();
    const count = parseInt10(param2, 2);
    const selfDamage = parseInt10(ctx?.selfDamage || 30, 30);
    const activeImg = getActiveImg(pk);
    
    if (!activeImg) return;
    

    for (let i = 0; i < count; i++) {
      attachEnergy(activeImg, energyType);
    }
    

    if (selfDamage > 0) {
      damageImg(activeImg, selfDamage);
    }
    
    showPopup(`Attached ${count} ${energyType} Energy, took ${selfDamage} damage!`);
  },

  attach_multiple_energy_to_bench_one: async (s, pk, { param1, param2 }, ctx) => {
    if (!ctx.isFinal) return;
    
    const energyType = (param1 || 'water').toLowerCase();
    const count = parseInt10(param2, 2);
    const benchImgs = getBenchImgs(pk);
    
    if (benchImgs.length === 0) {
      showPopup('No benched Pokémon.');
      return;
    }
    
    showPopup(`Choose a benched Pokémon to attach ${count} ${energyType} Energy.`);
    const chosen = await awaitSelection(benchImgs);
    
    if (chosen) {
      for (let i = 0; i < count; i++) {
        attachEnergy(chosen, energyType);
      }
      showPopup(`Attached ${count} ${energyType} Energy to ${chosen.alt}!`);
    }
  },

  auto_evolve_random: async (s, pk, { param1 }, ctx) => {
    if (!ctx.isFinal) return;
    
    const activeImg = getActiveImg(pk);
    if (!activeImg) return;
    
    const owner = pk === 'p1' ? 'player1' : 'player2';
    

    const deck = s[pk]?.deck || [];
    const evolutionCards = [];
    
    for (const card of deck) {
      try {
        const meta = await globalThis.fetchCardMeta(card.set, card.number || card.num);

        const evolveFrom = (meta.evolveFrom || meta.evolvesFrom || '').toLowerCase();
        if (meta.category === 'Pokemon' && evolveFrom) {
          const currentName = (activeImg.alt || '').toLowerCase();

          if (evolveFrom === currentName || currentName.includes(evolveFrom) || evolveFrom.includes(currentName)) {
            evolutionCards.push({ card, meta });
          }
        }
      } catch {}
    }
    
    if (evolutionCards.length === 0) {
      showPopup('No evolution available.');
      return;
    }
    

    const chosen = evolutionCards[Math.floor(Math.random() * evolutionCards.length)];
    const chosenCard = chosen.card;
    const chosenMeta = chosen.meta;
    

    const index = deck.findIndex(c => c.set === chosenCard.set && (c.number || c.num) === (chosenCard.number || chosenCard.num));
    if (index !== -1) deck.splice(index, 1);
    

    if (s[pk]) {
      s[pk].deck = deck;
    }
    if (globalThis.playerState?.[owner]) {
      globalThis.playerState[owner].deck = deck;
    }
    

    if (globalThis.evolveCard) {
      await globalThis.evolveCard(
        activeImg,
        chosenMeta,
        chosenCard,
        owner,
        chosenCard.set,
        chosenCard.number || chosenCard.num
      );
      showPopup(`Auto-evolved into ${chosenMeta.name}!`);
    } else {
      showPopup('Evolution function not available.');
    }
  },

  bench_damage_all_self: async (s, pk, { param1 }, ctx) => {
    if (!ctx.isFinal) return;
    
    const dmg = parseInt10(param1);
    const benchImgs = getBenchImgs(pk);
    
    for (const img of benchImgs) {
      damageImg(img, dmg);
    }
    
    showPopup(`Dealt ${dmg} to all your benched Pokémon.`);
  },

  bench_damage_opponent_with_energy: async (s, pk, { param1, param2 }, ctx) => {
    if (!ctx.isFinal) return;
    
    const dmg = parseInt10(param1);
    const energyType = (param2 || '').toLowerCase();
    const oppBench = getBenchImgs(oppPk(pk));
    

    const targets = [];
    for (const img of oppBench) {
      if (countEnergy(img, energyType) > 0) {
        targets.push(img);
      }
    }
    
    if (targets.length === 0) {
      showPopup(`No opponent benched Pokémon with ${energyType} Energy.`);
      return;
    }
    
    for (const img of targets) {
      damageImg(img, dmg);
    }
    
    showPopup(`Dealt ${dmg} to ${targets.length} opponent benched Pokémon with ${energyType} Energy.`);
  },

  bench_damage_per_energy_on_target: async (s, pk, { param1, param2 }, ctx) => {
    if (!ctx.isFinal) return;
    
    const dmgPerEnergy = parseInt10(param1);
    const oppActive = getActiveImg(oppPk(pk));
    
    if (!oppActive) return;
    
    const energyCount = countEnergy(oppActive);
    const totalDmg = energyCount * dmgPerEnergy;
    
    if (totalDmg > 0) {
      damageImg(oppActive, totalDmg);
      showPopup(`Dealt ${totalDmg} damage (${energyCount} Energy × ${dmgPerEnergy})!`);
    }
  },

  bench_damage_to_damaged_only: async (s, pk, { param1 }, ctx) => {
    if (!ctx.isFinal) return;
    
    const dmg = parseInt10(param1);
    const oppBench = getBenchImgs(oppPk(pk));
    

    const targets = [];
    for (const img of oppBench) {
      const { base, cur } = getHpFromImg(img);
      if (cur < base) {
        targets.push(img);
      }
    }
    
    if (targets.length === 0) {
      showPopup('No damaged benched Pokémon.');
      return;
    }
    
    for (const img of targets) {
      damageImg(img, dmg);
    }
    
    showPopup(`Dealt ${dmg} to ${targets.length} damaged benched Pokémon.`);
  },

  bonus_damage_during_next_turn: async (s, pk, { param1 }, ctx) => {
    if (!ctx.isFinal) return;
    
    const bonus = parseInt10(param1);
    const activeImg = getActiveImg(pk);
    const instanceId = activeImg?.dataset.instanceId;
    
    if (instanceId) {
      if (!globalThis.state) globalThis.state = {};
      if (!globalThis.state.damageBoost) globalThis.state.damageBoost = {};
      if (!globalThis.state.damageBoost[pk]) globalThis.state.damageBoost[pk] = {};
      
      globalThis.state.damageBoost[pk][instanceId] = {
        amount: bonus,
        duration: 'next_turn'
      };
      showPopup(`Next turn: +${bonus} damage!`);
    }
  },

  bonus_damage_if_benched: async (s, pk, { param1 }, ctx) => {
    const bonus = parseInt10(param1);
    const activeImg = getActiveImg(pk);
    const isBench = activeImg?.closest('.bench');
    
    if (isBench) {
      ctx.addBonus(bonus);
      showPopup(`+${bonus} damage (benched)!`);
    }
  },

  bonus_damage_if_evolved_this_turn: async (s, pk, { param1 }, ctx) => {
    const bonus = parseInt10(param1);
    const activeImg = getActiveImg(pk);
    
    if (!activeImg) return;
    
    const evolvedTurn = parseInt(activeImg.dataset.evolvedTurn || '0', 10);
    if (evolvedTurn === globalThis.turnNumber) {
      ctx.addBonus(bonus);
      showPopup(`+${bonus} damage (evolved this turn)!`);
    }
  },

  bonus_damage_if_hand_count: async (s, pk, { param1, param2 }, ctx) => {
    const bonus = parseInt10(param1);
    const condition = param2?.toLowerCase() || 'more';
    const handSize = s[pk]?.hand?.length || 0;
    
    let conditionMet = false;
    if (condition === 'more') {
      conditionMet = handSize > 4;
    } else if (condition === 'less') {
      conditionMet = handSize < 4;
    } else if (condition.includes('>')) {
      const threshold = parseInt10(condition.replace('>', ''), 4);
      conditionMet = handSize > threshold;
    } else if (condition.includes('<')) {
      const threshold = parseInt10(condition.replace('<', ''), 4);
      conditionMet = handSize < threshold;
    }
    
    if (conditionMet) {
      ctx.addBonus(bonus);
      showPopup(`+${bonus} damage (hand size: ${handSize})!`);
    }
  },

  bonus_damage_if_last_move_name_used: async (s, pk, { param1, param2 }, ctx) => {
    const bonus = parseInt10(param1);
    const moveName = (param2 || '').toLowerCase();
    const lastMove = globalThis.lastMoveUsed?.[pk];
    
    if (lastMove && lastMove.toLowerCase() === moveName) {
      ctx.addBonus(bonus);
      showPopup(`+${bonus} damage (last move was ${moveName})!`);
    }
  },

  bonus_damage_if_low_hp: async (s, pk, { param1, param2 }, ctx) => {
    const bonus = parseInt10(param1);
    const threshold = parseInt10(param2, 50);
    const activeImg = getActiveImg(pk);
    
    if (!activeImg) return;
    
    const { cur } = getHpFromImg(activeImg);
    if (cur <= threshold) {
      ctx.addBonus(bonus);
      showPopup(`+${bonus} damage (HP ≤ ${threshold})!`);
    }
  },

  bonus_damage_if_multiple_energy_types: async (s, pk, { param1 }, ctx) => {
    const bonus = parseInt10(param1);
    const activeImg = getActiveImg(pk);
    
    if (!activeImg) return;
    
    const slot = getSlotFromImg(activeImg);
    const pips = slot?.querySelectorAll('.energy-pip') || [];
    const types = new Set();
    
    for (const pip of pips) {
      types.add(pip.dataset.type);
    }
    
    if (types.size >= 2) {
      ctx.addBonus(bonus);
      showPopup(`+${bonus} damage (${types.size} energy types)!`);
    }
  },

  bonus_damage_if_named_bench: async (s, pk, { param1, param2 }, ctx) => {
    const bonus = parseInt10(param1);
    const name = (param2 || '').toLowerCase();
    const benchImgs = getBenchImgs(pk);
    
    const hasNamed = benchImgs.some(img => (img.alt || '').toLowerCase().includes(name));
    if (hasNamed) {
      ctx.addBonus(bonus);
      showPopup(`+${bonus} damage (${name} on bench)!`);
    }
  },

  bonus_damage_if_named_opponent: async (s, pk, { param1, param2 }, ctx) => {
    const bonus = parseInt10(param1);
    const name = (param2 || '').toLowerCase();
    const oppActive = getActiveImg(oppPk(pk));
    
    if (oppActive && (oppActive.alt || '').toLowerCase().includes(name)) {
      ctx.addBonus(bonus);
      showPopup(`+${bonus} damage (opponent is ${name})!`);
    }
  },

  bonus_damage_if_opponent_has_ability: async (s, pk, { param1 }, ctx) => {
    const bonus = parseInt10(param1);
    const oppActive = getActiveImg(oppPk(pk));
    
    if (!oppActive) return;
    
    try {
      const abilityRow = await globalThis.getAbilityRowForCard?.(oppActive.dataset.set, oppActive.dataset.num);
      if (abilityRow) {
        ctx.addBonus(bonus);
        showPopup(`+${bonus} damage (opponent has ability)!`);
      }
    } catch {}
  },

  bonus_damage_if_opponent_has_more_hp: async (s, pk, { param1 }, ctx) => {
    const bonus = parseInt10(param1);
    const activeImg = getActiveImg(pk);
    const oppActive = getActiveImg(oppPk(pk));
    
    if (!activeImg || !oppActive) return;
    
    const { base: myHp } = getHpFromImg(activeImg);
    const { base: oppHp } = getHpFromImg(oppActive);
    
    if (oppHp > myHp) {
      ctx.addBonus(bonus);
      showPopup(`+${bonus} damage (opponent has more HP)!`);
    }
  },

  bonus_damage_if_opponent_has_status: async (s, pk, { param1 }, ctx) => {
    const bonus = parseInt10(param1);
    const oppActive = getActiveImg(oppPk(pk));
    
    if (oppActive?.dataset.status) {
      ctx.addBonus(bonus);
      showPopup(`+${bonus} damage (opponent has status)!`);
    }
  },

  bonus_damage_if_opponent_type: async (s, pk, { param1, param2 }, ctx) => {
    const bonus = parseInt10(param1);
    const targetType = (param2 || '').toLowerCase();
    const oppActive = getActiveImg(oppPk(pk));
    
    if (!oppActive) return;
    
    try {
      const meta = await globalThis.fetchCardMeta(oppActive.dataset.set, oppActive.dataset.num);
      if (meta.types?.some(t => t.toLowerCase() === targetType)) {
        ctx.addBonus(bonus);
        showPopup(`+${bonus} damage (opponent is ${targetType}-type)!`);
      }
    } catch {}
  },

  bonus_damage_if_own_bench_damaged: async (s, pk, { param1 }, ctx) => {
    const bonus = parseInt10(param1);
    const benchImgs = getBenchImgs(pk);
    
    const hasDamaged = benchImgs.some(img => {
      const { base, cur } = getHpFromImg(img);
      return cur < base;
    });
    
    if (hasDamaged) {
      ctx.addBonus(bonus);
      showPopup(`+${bonus} damage (own bench damaged)!`);
    }
  },

  bonus_damage_per_ability_opponent: async (s, pk, { param1 }, ctx) => {
    const bonusPerAbility = parseInt10(param1);
    const oppActive = getActiveImg(oppPk(pk));
    
    if (!oppActive) return;
    
    try {
      const abilityRow = await globalThis.getAbilityRowForCard?.(oppActive.dataset.set, oppActive.dataset.num);
      if (abilityRow) {
        ctx.addBonus(bonusPerAbility);
        showPopup(`+${bonusPerAbility} damage (opponent has ability)!`);
      }
    } catch {}
  },

  bonus_damage_per_energy_attached: async (s, pk, { param1 }, ctx) => {
    const bonusPerEnergy = parseInt10(param1);
    const activeImg = getActiveImg(pk);
    
    if (!activeImg) return;
    
    const energyCount = countEnergy(activeImg);
    const bonus = energyCount * bonusPerEnergy;
    
    if (bonus > 0) {
      ctx.addBonus(bonus);
      showPopup(`+${bonus} damage (${energyCount} Energy × ${bonusPerEnergy})!`);
    }
  },

  bonus_damage_per_energy_on_opponent_all: async (s, pk, { param1 }, ctx) => {
    const bonusPerEnergy = parseInt10(param1);
    const allOpponent = getAllPokemonImgs(oppPk(pk));
    
    let totalEnergy = 0;
    for (const img of allOpponent) {
      totalEnergy += countEnergy(img);
    }
    
    const bonus = totalEnergy * bonusPerEnergy;
    if (bonus > 0) {
      ctx.addBonus(bonus);
      showPopup(`+${bonus} damage (${totalEnergy} total Energy × ${bonusPerEnergy})!`);
    }
  },

  bonus_damage_per_evolution_bench: async (s, pk, { param1 }, ctx) => {
    const bonusPerEvolution = parseInt10(param1);
    const benchImgs = getBenchImgs(pk);
    
    let evolutionCount = 0;
    for (const img of benchImgs) {
      try {
        const meta = await globalThis.fetchCardMeta(img.dataset.set, img.dataset.num);
        const stage = meta.stage?.toLowerCase();
        if (stage === 'stage1' || stage === 'stage2' || stage === 'vmax' || stage === 'vstar') {
          evolutionCount++;
        }
      } catch {}
    }
    
    const bonus = evolutionCount * bonusPerEvolution;
    if (bonus > 0) {
      ctx.addBonus(bonus);
      showPopup(`+${bonus} damage (${evolutionCount} evolutions × ${bonusPerEvolution})!`);
    }
  },

  bonus_damage_per_retreat_cost: async (s, pk, { param1 }, ctx) => {
    const bonusPerRetreat = parseInt10(param1);
    const oppActive = getActiveImg(oppPk(pk));
    
    if (!oppActive) return;
    
    try {
      const meta = await globalThis.fetchCardMeta(oppActive.dataset.set, oppActive.dataset.num);
      const retreatCost = parseInt10(meta.retreatCost, 0);
      const bonus = retreatCost * bonusPerRetreat;
      
      if (bonus > 0) {
        ctx.addBonus(bonus);
        showPopup(`+${bonus} damage (retreat cost: ${retreatCost} × ${bonusPerRetreat})!`);
      }
    } catch {}
  },

  bonus_damage_per_retreat_cost_reveal: async (s, pk, { param1 }, ctx) => {
    const bonusPerRetreat = parseInt10(param1);
    const oppActive = getActiveImg(oppPk(pk));
    
    if (!oppActive) return;
    
    try {
      const meta = await globalThis.fetchCardMeta(oppActive.dataset.set, oppActive.dataset.num);
      const retreatCost = parseInt10(meta.retreatCost, 0);
      const bonus = retreatCost * bonusPerRetreat;
      
      if (bonus > 0) {
        ctx.addBonus(bonus);
        showPopup(`+${bonus} damage (retreat cost: ${retreatCost} × ${bonusPerRetreat})!`);
      }
    } catch {}
  },

  change_opponent_energy_type: async (s, pk, { param1, param2 }, ctx) => {
    if (!ctx.isFinal) return;
    
    const fromType = (param1 || '').toLowerCase();
    const toType = (param2 || '').toLowerCase();
    const oppActive = getActiveImg(oppPk(pk));
    
    if (!oppActive) return;
    
    const slot = getSlotFromImg(oppActive);
    const pips = slot?.querySelectorAll('.energy-pip') || [];
    let changed = 0;
    
    for (const pip of pips) {
      if (pip.dataset.type === fromType) {
        pip.dataset.type = toType;
        pip.style.backgroundImage = `url('${ENERGY_ICONS[toType] || ENERGY_ICONS.colorless}')`;
        changed++;
      }
    }
    
    if (changed > 0) {
      showPopup(`Changed ${changed} ${fromType} Energy to ${toType}!`);
    }
  },

  counter_on_hit_next_turn: async (s, pk, { param1 }, ctx) => {
    if (!ctx.isFinal) return;
    
    const damage = parseInt10(param1, 20);
    const activeImg = getActiveImg(pk);
    
    if (activeImg) {
      activeImg.dataset.counterOnHitNextTurn = String(damage);
      showPopup(`Counter on hit next turn: ${damage} damage!`);
    }
  },

  damage_all_opponent_stack: async (s, pk, { param1 }, ctx) => {
    if (!ctx.isFinal) return;
    
    const dmg = parseInt10(param1);
    const allOpponent = getAllPokemonImgs(oppPk(pk));
    
    for (const img of allOpponent) {
      damageImg(img, dmg);
    }
    
    showPopup(`Dealt ${dmg} to all opponent Pokémon!`);
  },

  damage_per_other_move_used: async (s, pk, { param1 }, ctx) => {
    const dmgPerMove = parseInt10(param1);
    const moveCount = globalThis.movesUsedThisTurn?.[pk] || 0;
    const bonus = (moveCount - 1) * dmgPerMove;
    
    if (bonus > 0) {
      ctx.addBonus(bonus);
      showPopup(`+${bonus} damage (${moveCount - 1} other moves used)!`);
    }
  },

  devolve_opponent: async (s, pk, { param1 }, ctx) => {
    if (!ctx.isFinal) return;
    
    const oppActive = getActiveImg(oppPk(pk));
    if (!oppActive) return;
    
    try {
      const meta = await globalThis.fetchCardMeta(oppActive.dataset.set, oppActive.dataset.num);
      const stage = meta.stage?.toLowerCase();
      
      if (stage === 'basic') {
        showPopup('Opponent is already Basic.');
        return;
      }
      

      const owner = oppPk(pk) === 'p1' ? 'player1' : 'player2';
      const discard = globalThis.playerState?.[owner]?.discard?.cards || [];
      const evolvesFrom = meta.evolvesFrom?.toLowerCase();
      
      const preEvo = discard.find(c => {
        try {
          const cMeta = globalThis.fetchCardMeta?.(c.set, c.number || c.num);
          return cMeta && (cMeta.name || '').toLowerCase() === evolvesFrom;
        } catch {
          return false;
        }
      });
      
      if (!preEvo) {
        showPopup('Pre-evolution not found in discard.');
        return;
      }
      

      if (globalThis.devolvePokemon) {
        globalThis.devolvePokemon(oppActive, preEvo);
        showPopup(`Devolved ${oppActive.alt} to ${preEvo.name}!`);
      }
    } catch (e) {
      console.error('[devolve_opponent] Error:', e);
      showPopup('Devolve failed.');
    }
  },

  discard_energy_and_snipe: async (s, pk, { param1, param2 }, ctx) => {
    if (!ctx.isFinal) return;
    
    const energyType = (param1 || 'lightning').toLowerCase();
    const damage = parseInt10(param2, 120);
    const activeImg = getActiveImg(pk);
    

    const removed = await removeEnergy(activeImg, energyType, 999);
    
    if (removed === 0) {
      showPopup('No energy to discard.');
      return;
    }
    

    const targets = getAllPokemonImgs(oppPk(pk));
    if (targets.length === 0) {
      showPopup('No targets.');
      return;
    }
    
    showPopup(`Choose target for ${damage} damage.`);
    const chosen = await awaitSelection(targets);
    
    if (chosen) {
      const result = damageImg(chosen, damage);
      showPopup(`Volt Bolt: Dealt ${damage} to ${chosen.alt}!`);
      

      if (result.knocked) {
        setTimeout(async () => {
          const owner = chosen.closest('#player1') ? 'player1' : 'player2';
          const oppPkStr = owner === 'player1' ? 'p2' : 'p1';
          const wasActive = chosen.closest('.active');
          
          if (typeof globalThis.handleKnockOut === 'function') {
            const gameEnded = await globalThis.handleKnockOut(oppPkStr, chosen, wasActive);
            if (!gameEnded && wasActive && typeof globalThis.beginPromotionFlow === 'function') {
              globalThis.beginPromotionFlow(owner);
            }
          }
        }, 500);
      }
    }
  },

  discard_energy_specific_inflict_status: async (s, pk, { param1, param2 }, ctx) => {
    if (!ctx.isFinal) return;
    
    const energyType = (param1 || 'fire').toLowerCase();
    const count = parseInt10(param2, 1);
    const status = ctx?.status || 'burned';
    const activeImg = getActiveImg(pk);
    
    const removed = removeEnergy(activeImg, energyType, count);
    if (removed > 0) {
      applyStatus(oppPk(pk), status);
      showPopup(`Discarded ${removed} ${energyType} Energy, opponent is ${status}!`);
    }
  },

  discard_energy_specific_reduce_damage: async (s, pk, { param1, param2 }, ctx) => {
    if (!ctx.isFinal) return;
    
    const energyType = (param1 || 'fire').toLowerCase();
    const count = parseInt10(param2, 1);
    const reduction = parseInt10(ctx?.reduction || 20, 20);
    const activeImg = getActiveImg(pk);
    
    const removed = removeEnergy(activeImg, energyType, count);
    if (removed > 0) {
      globalThis.__specialEffects ??= { p1: {}, p2: {} };
      globalThis.__specialEffects[pk].damageReduction = reduction;
      showPopup(`Discarded ${removed} ${energyType} Energy, -${reduction} damage next turn!`);
    }
  },

  discard_from_hand_required: async (s, pk, { param1 }, ctx) => {
    if (!ctx.isFinal) return;
    
    const count = parseInt10(param1, 1);
    const hand = s[pk]?.hand || [];
    
    if (hand.length < count) {
      showPopup(`Not enough cards in hand (need ${count}).`);
      ctx.setOverride(0);
      return;
    }
    
    showPopup(`Discard ${count} card(s) from hand to use this attack.`);
    

    const owner = pk === 'p1' ? 'player1' : 'player2';
    if (globalThis.beginHandCardDiscard) {
      await globalThis.beginHandCardDiscard(owner, count);
    } else {

      for (let i = 0; i < count && hand.length > 0; i++) {
        const randomIndex = Math.floor(Math.random() * hand.length);
        const discarded = hand.splice(randomIndex, 1)[0];
        
        if (globalThis.pushCardToDiscard && discarded) {
          const fakeImg = document.createElement('img');
          fakeImg.dataset.set = discarded.set;
          fakeImg.dataset.num = discarded.num;
          globalThis.pushCardToDiscard(owner, fakeImg);
        }
      }
      showPopup(`Discarded ${count} card(s).`);
    }
  },

  discard_opponent_tools_before_damage: async (s, pk, { param1 }, ctx) => {
    if (!ctx.isFinal) return;
    
    const oppActive = getActiveImg(oppPk(pk));
    if (!oppActive) return;
    
    const oppSlot = getSlotFromImg(oppActive);
    const tools = oppSlot?.querySelectorAll('.tool-attachment') || [];
    
    for (const tool of tools) {
      tool.remove();
    }
    
    if (tools.length > 0) {
      showPopup(`Discarded ${tools.length} tool(s) from opponent!`);
    }
  },

  discard_random_energy_from_both: async (s, pk, { param1 }, ctx) => {
    if (!ctx.isFinal) return;
    
    const count = parseInt10(param1, 1);
    

    const allPokemon = [
      ...getAllPokemonImgs('p1'),
      ...getAllPokemonImgs('p2')
    ].filter(img => {
      const slot = getSlotFromImg(img);
      const energyBox = slot?.querySelector('.energy-pips');
      return energyBox && energyBox.children.length > 0;
    });
    
    if (allPokemon.length === 0) {
      showPopup('No Pokemon have Energy attached.');
      return;
    }
    

    for (let i = 0; i < count && allPokemon.length > 0; i++) {
      const randomPokemon = allPokemon[Math.floor(Math.random() * allPokemon.length)];
      await removeEnergy(randomPokemon, null, 1);
      

      const slot = getSlotFromImg(randomPokemon);
      const energyBox = slot?.querySelector('.energy-pips');
      if (!energyBox || energyBox.children.length === 0) {
        const index = allPokemon.indexOf(randomPokemon);
        if (index !== -1) allPokemon.splice(index, 1);
      }
    }
    
    showPopup(`Discarded ${count} random Energy from both players!`);
  },

  discard_random_energy_self: async (s, pk, { param1 }, ctx) => {
    if (!ctx.isFinal) return;
    
    const count = parseInt10(param1, 1);
    const activeImg = getActiveImg(pk);
    
    if (!activeImg) return;
    
    const removed = await removeEnergy(activeImg, null, count);
    if (removed > 0) {
      showPopup(`Discarded ${removed} random Energy!`);
    }
  },

  discard_random_item_from_opponent_hand: async (s, pk, { param1 }, ctx) => {
    if (!ctx.isFinal) return;
    
    const opp = oppPk(pk);
    const hand = s[opp]?.hand || [];
    
    if (hand.length === 0) {
      showPopup('Opponent has no cards in hand.');
      return;
    }
    

    const items = [];
    for (const card of hand) {
      try {
        const meta = await globalThis.fetchCardMeta(card.set, card.number || card.num);
        if (meta.category === 'Trainer' && meta.trainerType === 'Item') {
          items.push(card);
        }
      } catch {}
    }
    
    if (items.length === 0) {
      showPopup('No Item cards in opponent hand.');
      return;
    }
    

    const chosen = items[Math.floor(Math.random() * items.length)];
    const index = hand.indexOf(chosen);
    if (index !== -1) {
      hand.splice(index, 1);
      

      const owner = opp === 'p1' ? 'player1' : 'player2';
      if (globalThis.pushCardToDiscard) {
        const fakeImg = document.createElement('img');
        fakeImg.dataset.set = chosen.set;
        fakeImg.dataset.num = chosen.num;
        globalThis.pushCardToDiscard(owner, fakeImg);
      }
      
      showPopup(`Discarded ${chosen.name || 'Item'} from opponent's hand!`);
    }
  },

  discard_tools_before_damage: async (s, pk, { param1 }, ctx) => {
    if (!ctx.isFinal) return;
    
    const oppActive = getActiveImg(oppPk(pk));
    if (!oppActive) return;
    
    const oppSlot = getSlotFromImg(oppActive);
    const tools = oppSlot?.querySelectorAll('.tool-attachment') || [];
    
    for (const tool of tools) {
      tool.remove();
    }
    
    if (tools.length > 0) {
      showPopup(`Discarded ${tools.length} tool(s)!`);
    }
  },

  discard_tools_for_damage: async (s, pk, { param1, param2 }, ctx) => {
    if (!ctx.isFinal) return;
    
    const dmgPerTool = parseInt10(param1);
    const activeImg = getActiveImg(pk);
    
    if (!activeImg) return;
    
    const slot = getSlotFromImg(activeImg);
    const tools = slot?.querySelectorAll('.tool-attachment') || [];
    

    for (const tool of tools) {
      tool.remove();
    }
    

    const bonus = tools.length * dmgPerTool;
    if (bonus > 0) {
      ctx.addBonus(bonus);
      showPopup(`Discarded ${tools.length} tool(s), +${bonus} damage!`);
    }
  },

  discard_tools_from_opponent: async (s, pk, { param1 }, ctx) => {
    if (!ctx.isFinal) return;
    
    const allOpponent = getAllPokemonImgs(oppPk(pk));
    let totalDiscarded = 0;
    
    for (const img of allOpponent) {
      const slot = getSlotFromImg(img);
      const tools = slot?.querySelectorAll('.tool-attachment') || [];
      
      for (const tool of tools) {
        tool.remove();
        totalDiscarded++;
      }
    }
    
    if (totalDiscarded > 0) {
      showPopup(`Discarded ${totalDiscarded} tool(s) from opponent!`);
    }
  },

  discard_top_deck: async (s, pk, { param1 }, ctx) => {
    if (!ctx.isFinal) return;
    
    const count = parseInt10(param1, 1);
    const deck = s[pk]?.deck || [];
    
    if (deck.length === 0) {
      showPopup('Deck is empty.');
      return;
    }
    
    const discarded = deck.splice(0, count);
    showPopup(`Discarded ${discarded.length} card(s) from deck!`);
  },

  discard_top_opponent_deck: async (s, pk, { param1 }, ctx) => {
    if (!ctx.isFinal) return;
    
    const count = parseInt10(param1, 1);
    const opp = oppPk(pk);
    const oppOwner = opp === 'p1' ? 'player1' : 'player2';
    const deck = s[opp]?.deck || [];
    
    if (deck.length === 0) {
      showPopup('Opponent deck is empty.');
      return;
    }
    
    const discarded = deck.splice(0, count);
    

    for (const card of discarded) {

      let cardName = card.name;
      let cardSrc = card.src;
      try {
        const meta = await globalThis.fetchCardMeta(card.set, card.number || card.num);
        if (!cardName) cardName = meta.name || 'Unknown';
        if (!cardSrc) {
          const padded = String(card.number || card.num).padStart(3, '0');
          cardSrc = `https://assets.tcgdex.net/en/tcgp/${card.set}/${padded}/high.png`;
        }
      } catch (e) {
        console.error('[discard_top_opponent_deck] Error fetching meta for discarded card:', e);
        if (!cardName) cardName = 'Unknown';
        if (!cardSrc) {
          const padded = String(card.number || card.num).padStart(3, '0');
          cardSrc = `https://assets.tcgdex.net/en/tcgp/${card.set}/${padded}/high.png`;
        }
      }
      

      const discardCard = {
        set: card.set,
        num: card.number || card.num,
        number: card.number || card.num,
        name: cardName,
        src: cardSrc
      };
      

      if (s[opp]) {
        if (!s[opp].discard) s[opp].discard = { cards: [] };
        if (!s[opp].discard.cards) s[opp].discard.cards = [];
        s[opp].discard.cards.push(discardCard);
      }
      
      if (globalThis.playerState?.[oppOwner]) {
        if (!globalThis.playerState[oppOwner].discard) {
          globalThis.playerState[oppOwner].discard = { cards: [], energyCounts: {} };
        }
        if (!globalThis.playerState[oppOwner].discard.cards) {
          globalThis.playerState[oppOwner].discard.cards = [];
        }
        globalThis.playerState[oppOwner].discard.cards.push(discardCard);
      }
    }
    

    if (globalThis.renderDiscard) {
      globalThis.renderDiscard(oppOwner);
    }
    if (globalThis.updateDeckBubbles) {
      globalThis.updateDeckBubbles();
    }
    
    showPopup(`Discarded ${discarded.length} card(s) from opponent's deck!`);
  },

  flip_block_attack_next_turn: async (s, pk, { param1 }, ctx) => {
    if (!ctx.isFinal) return;
    
    if ((await flipCoin(pk)) === 'heads') {
      const opp = oppPk(pk);
      globalThis.__specialEffects ??= { p1: {}, p2: {} };
      globalThis.__specialEffects[opp].attackLock = true;
      showPopup('HEADS → Opponent cannot attack next turn!');
    } else {
      showPopup('TAILS → No effect.');
    }
  },

  flip_copy_opponent_attack: async (s, pk, { param1 }, ctx) => {
    if (!ctx.isFinal) return;
    
    if ((await flipCoin(pk)) === 'heads') {
      return MOVE_HANDLERS.copy_opponent_attack(s, pk, {}, ctx);
    } else {
      showPopup('TAILS → Attack does nothing.');
      ctx.setOverride(0);
    }
  },

  flip_discard_energy_if_heads: async (s, pk, { param1, param2 }, ctx) => {
    if (!ctx.isFinal) return;
    
    if ((await flipCoin(pk)) === 'heads') {
      const energyType = (param1 || '').toLowerCase();
      const count = parseInt10(param2, 1);
      const activeImg = getActiveImg(pk);
      
      if (activeImg) {
        const removed = await removeEnergy(activeImg, energyType, count);
        if (removed > 0) {
          showPopup(`HEADS → Discarded ${removed} ${energyType} Energy!`);
        } else {
          showPopup('HEADS → No Energy to discard.');
        }
      }
    } else {
      showPopup('TAILS → No effect.');
    }
  },

  flip_discard_energy_multiple: async (s, pk, { param1, param2 }, ctx) => {
    if (!ctx.isFinal) return;
    
    const flips = parseInt10(param1, 2);
    const energyType = (param2 || '').toLowerCase();
    const activeImg = getActiveImg(pk);
    
    if (!activeImg) return;
    
    let headsCount = 0;
    for (let i = 0; i < flips; i++) {
      if ((await flipCoin(pk)) === 'heads') {
        headsCount++;
      }
    }
    
    if (headsCount > 0) {
      const removed = await removeEnergy(activeImg, energyType, headsCount);
      if (removed > 0) {
        showPopup(`${headsCount} heads → Discarded ${removed} ${energyType} Energy!`);
      }
    } else {
      showPopup('All tails → No effect.');
    }
  },

  flip_discard_energy_until_tails: async (s, pk, { param1, param2 }, ctx) => {
    if (!ctx.isFinal) return;
    
    const energyType = (param1 || '').toLowerCase();
    const countPerHead = parseInt10(param2, 1);
    const activeImg = getActiveImg(pk);
    
    if (!activeImg) return;
    
    let headsCount = 0;
    let result;
    
    do {
      result = await flipCoin(pk);
      if (result === 'heads') {
        headsCount++;
        const removed = await removeEnergy(activeImg, energyType, countPerHead);
        if (removed === 0) break;
      }
    } while (result === 'heads');
    
    if (headsCount > 0) {
      showPopup(`Flipped ${headsCount} heads, discarded ${headsCount * countPerHead} Energy!`);
    } else {
      showPopup('TAILS → No effect.');
    }
  },

  flip_discard_random_from_opponent_hand: async (s, pk, { param1 }, ctx) => {
    if (!ctx.isFinal) return;
    
    if ((await flipCoin(pk)) === 'heads') {
      const opp = oppPk(pk);
      const hand = s[opp]?.hand || [];
      
      if (hand.length === 0) {
        showPopup('HEADS → Opponent has no cards in hand.');
        return;
      }
      
      const randomIndex = Math.floor(Math.random() * hand.length);
      const card = hand.splice(randomIndex, 1)[0];
      

      const owner = opp === 'p1' ? 'player1' : 'player2';
      if (globalThis.pushCardToDiscard) {
        const fakeImg = document.createElement('img');
        fakeImg.dataset.set = card.set;
        fakeImg.dataset.num = card.num;
        globalThis.pushCardToDiscard(owner, fakeImg);
      }
      
      showPopup(`HEADS → Discarded ${card.name || 'a card'} from opponent's hand!`);
    } else {
      showPopup('TAILS → No effect.');
    }
  },

  flip_do_nothing_if_double_tails: async (s, pk, { param1 }, ctx) => {
    if (!ctx.isFinal) return;
    
    const flip1 = await flipCoin(pk);
    const flip2 = await flipCoin(pk);
    
    if (flip1 === 'tails' && flip2 === 'tails') {
      ctx.setOverride(0);
      showPopup('Both tails → Attack does nothing.');
    } else {
      showPopup(`${flip1}, ${flip2} → Attack proceeds.`);
    }
  },

  flip_force_shuffle_opponent_pokemon_into_deck: async (s, pk, { param1 }, ctx) => {
    if (!ctx.isFinal) return;
    
    if ((await flipCoin(pk)) === 'heads') {
      const oppActive = getActiveImg(oppPk(pk));
      if (!oppActive) {
        showPopup('HEADS → No opponent Active Pokémon.');
        return;
      }
      

      const cardData = {
        set: oppActive.dataset.set,
        number: oppActive.dataset.num,
        name: oppActive.alt
      };
      

      const opp = oppPk(pk);
      const deck = s[opp]?.deck || [];
      deck.push(cardData);
      

      shuffleDeckAndAnimate(s, opp);
      

      const slot = oppActive.closest('.card-slot');
      if (slot) {
        slot.remove();
      }
      
      showPopup(`HEADS → Shuffled ${oppActive.alt} into opponent's deck!`);
      

      const owner = opp === 'p1' ? 'player1' : 'player2';
      if (typeof globalThis.beginPromotionFlow === 'function') {
        globalThis.beginPromotionFlow(owner);
      }
    } else {
      showPopup('TAILS → No effect.');
    }
  },

  flip_inflict_effect_self_if_tails: async (s, pk, { param1 }, ctx) => {
    if (!ctx.isFinal) return;
    
    if ((await flipCoin(pk)) === 'tails') {
      const effect = param1?.toLowerCase();
      const activeImg = getActiveImg(pk);
      
      if (effect === 'confusion' && activeImg) {
        applyStatus(pk, 'confusion');
        showPopup('TAILS → This Pokémon is now Confused!');
      } else if (effect === 'self_damage') {
        const damage = parseInt10(ctx?.damage || 20, 20);
        damageImg(activeImg, damage);
        showPopup(`TAILS → This Pokémon took ${damage} damage!`);
      }
    } else {
      showPopup('HEADS → No negative effect.');
    }
  },

  flip_inflict_status_both: async (s, pk, { param1 }, ctx) => {
    if (!ctx.isFinal) return;
    
    if ((await flipCoin(pk)) === 'heads') {
      const status = (param1 || 'poisoned').toLowerCase();
      applyStatus(oppPk(pk), status);
      applyStatus(pk, status);
      showPopup(`HEADS → Both Pokémon are now ${status}!`);
    } else {
      showPopup('TAILS → No effect.');
    }
  },

  flip_lock_self_if_tails: async (s, pk, { param1 }, ctx) => {
    if (!ctx.isFinal) return;
    
    if ((await flipCoin(pk)) === 'tails') {
      globalThis.__specialEffects ??= { p1: {}, p2: {} };
      globalThis.__specialEffects[pk].attackLock = true;
      showPopup('TAILS → This Pokémon cannot attack next turn!');
    } else {
      showPopup('HEADS → No negative effect.');
    }
  },

  flip_multiplier_conditional_poison: async (s, pk, { param1, param2 }, ctx) => {
    if (!ctx.isFinal) return;
    
    const flips = parseInt10(param1, 2);
    const dmgPerHead = parseInt10(param2);
    const oppActive = getActiveImg(oppPk(pk));
    
    let heads = 0;
    for (let i = 0; i < flips; i++) {
      if ((await flipCoin(pk)) === 'heads') heads++;
    }
    
    const damage = heads * dmgPerHead;
    ctx.setOverride(damage);
    

    if (heads === flips && oppActive) {
      applyStatus(oppPk(pk), 'poisoned');
      showPopup(`${heads} heads → ${damage} damage and Poisoned!`);
    } else {
      showPopup(`${heads} heads → ${damage} damage!`);
    }
  },

  flip_multiplier_per_energy: async (s, pk, { param1, param2 }, ctx) => {
    if (!ctx.isFinal) return;
    
    const dmgPerHead = parseInt10(param1);
    const activeImg = getActiveImg(pk);
    
    if (!activeImg) return;
    
    const energyCount = countEnergy(activeImg);
    let heads = 0;
    
    for (let i = 0; i < energyCount; i++) {
      if ((await flipCoin(pk)) === 'heads') heads++;
    }
    
    const damage = heads * dmgPerHead;
    ctx.setOverride(damage);
    showPopup(`${heads} heads (${energyCount} flips) → ${damage} damage!`);
  },

  flip_multiplier_pokemon_in_play: async (s, pk, { param1, param2 }, ctx) => {
    if (!ctx.isFinal) return;
    
    const dmgPerHead = parseInt10(param1);
    const allPokemon = getAllPokemonImgs(pk);
    const flips = allPokemon.length;
    
    let heads = 0;
    for (let i = 0; i < flips; i++) {
      if ((await flipCoin(pk)) === 'heads') heads++;
    }
    
    const damage = heads * dmgPerHead;
    ctx.setOverride(damage);
    showPopup(`${heads} heads (${flips} flips) → ${damage} damage!`);
  },

  flip_multiplier_tool_bonus: async (s, pk, { param1, param2 }, ctx) => {
    if (!ctx.isFinal) return;
    
    const flips = parseInt10(param1, 2);
    const baseDmg = parseInt10(param2);
    const activeImg = getActiveImg(pk);
    
    if (!activeImg) return;
    
    const slot = getSlotFromImg(activeImg);
    const hasTool = slot?.querySelector('.tool-attachment') !== null;
    const toolBonus = hasTool ? parseInt10(ctx?.toolBonus || 20, 20) : 0;
    
    let heads = 0;
    for (let i = 0; i < flips; i++) {
      if ((await flipCoin(pk)) === 'heads') heads++;
    }
    
    const damage = (heads * baseDmg) + (hasTool ? toolBonus : 0);
    ctx.setOverride(damage);
    showPopup(`${heads} heads → ${damage} damage${hasTool ? ` (+${toolBonus} tool bonus)` : ''}!`);
  },

  flip_multiplier_until_tails: async (s, pk, { param1 }, ctx) => {
    if (!ctx.isFinal) return;
    
    const dmgPerHead = parseInt10(param1);
    let heads = 0;
    let result;
    
    do {
      result = await flipCoin(pk);
      if (result === 'heads') heads++;
    } while (result === 'heads');
    
    const damage = heads * dmgPerHead;
    ctx.setOverride(damage);
    showPopup(`Flipped ${heads} heads → ${damage} damage!`);
  },

  flip_prevent_damage_and_effects: async (s, pk, { param1 }, ctx) => {
    if (!ctx.isFinal) return;
    
    if ((await flipCoin(pk)) === 'heads') {
      globalThis.__specialEffects ??= { p1: {}, p2: {} };
      globalThis.__specialEffects[pk].preventDamage = true;
      showPopup('HEADS → This Pokémon takes no damage or effects this turn!');
    } else {
      showPopup('TAILS → No effect.');
    }
  },

  flip_prevent_damage_and_effects_next_turn: async (s, pk, { param1 }, ctx) => {
    if (!ctx.isFinal) return;
    
    if ((await flipCoin(pk)) === 'heads') {
      globalThis.__specialEffects ??= { p1: {}, p2: {} };
      globalThis.__specialEffects[pk].preventDamage = true;
      showPopup('HEADS → This Pokémon takes no damage or effects next turn!');
    } else {
      showPopup('TAILS → No effect.');
    }
  },

  flip_reveal_and_shuffle: async (s, pk, { param1 }, ctx) => {
    if (!ctx.isFinal) return;
    
    if ((await flipCoin(pk)) === 'heads') {
      const deck = s[pk]?.deck || [];
      if (deck.length === 0) {
        showPopup('HEADS → Deck is empty.');
        return;
      }
      
      const topCard = deck[0];
      showPopup(`HEADS → Top card: ${topCard.name}`);
      

      shuffleDeckAndAnimate(s, pk);
      showPopup('Deck shuffled!');
    } else {
      showPopup('TAILS → No effect.');
    }
  },

  flip_reveal_discard_supporter: async (s, pk, { param1 }, ctx) => {
    if (!ctx.isFinal) return;
    
    if ((await flipCoin(pk)) === 'heads') {
      const opp = oppPk(pk);
      const hand = s[opp]?.hand || [];
      

      const supporters = [];
      for (const card of hand) {
        try {
          const meta = await globalThis.fetchCardMeta(card.set, card.number || card.num);
          if (meta.category === 'Trainer' && meta.trainerType === 'Supporter') {
            supporters.push(card);
          }
        } catch {}
      }
      
      if (supporters.length === 0) {
        showPopup('HEADS → No Supporter cards in opponent hand.');
        return;
      }
      

      const chosen = supporters[Math.floor(Math.random() * supporters.length)];
      showPopup(`HEADS → Revealed ${chosen.name} from opponent hand!`);
      

      const index = hand.indexOf(chosen);
      if (index !== -1) {
        hand.splice(index, 1);
        const owner = opp === 'p1' ? 'player1' : 'player2';
        if (globalThis.pushCardToDiscard) {
          const fakeImg = document.createElement('img');
          fakeImg.dataset.set = chosen.set;
          fakeImg.dataset.num = chosen.num;
          globalThis.pushCardToDiscard(owner, fakeImg);
        }
        showPopup(`Discarded ${chosen.name}!`);
      }
    } else {
      showPopup('TAILS → No effect.');
    }
  },

  flip_reveal_shuffle_opponent_card: async (s, pk, { param1 }, ctx) => {
    if (!ctx.isFinal) return;
    
    if ((await flipCoin(pk)) === 'heads') {
      const opp = oppPk(pk);
      const hand = s[opp]?.hand || [];
      
      if (hand.length === 0) {
        showPopup('HEADS → Opponent has no cards in hand.');
        return;
      }
      

      const randomIndex = Math.floor(Math.random() * hand.length);
      const card = hand[randomIndex];
      
      showPopup(`HEADS → Revealed ${card.name || 'a card'} from opponent hand!`);
      

      const index = hand.indexOf(card);
      if (index !== -1) {
        hand.splice(index, 1);
        const deck = s[opp]?.deck || [];
        deck.push(card);
        shuffleDeckAndAnimate(s, opp);
        showPopup(`Shuffled ${card.name || 'card'} into opponent's deck!`);
      }
    } else {
      showPopup('TAILS → No effect.');
    }
  },

  flip_self_damage_if_tails: async (s, pk, { param1 }, ctx) => {
    if (!ctx.isFinal) return;
    
    if ((await flipCoin(pk)) === 'tails') {
      const damage = parseInt10(param1, 20);
      const activeImg = getActiveImg(pk);
      
      if (activeImg) {
        damageImg(activeImg, damage);
        showPopup(`TAILS → This Pokémon took ${damage} damage!`);
      }
    } else {
      showPopup('HEADS → No self damage.');
    }
  },

  flip_until_tails_bonus_damage: async (s, pk, { param1 }, ctx) => {
    if (!ctx.isFinal) return;
    
    const bonusPerHead = parseInt10(param1);
    let heads = 0;
    let result;
    
    do {
      result = await flipCoin(pk);
      if (result === 'heads') heads++;
    } while (result === 'heads');
    
    const bonus = heads * bonusPerHead;
    if (bonus > 0) {
      ctx.addBonus(bonus);
      showPopup(`Flipped ${heads} heads → +${bonus} damage!`);
    } else {
      showPopup('TAILS → No bonus damage.');
    }
  },

  halve_opponent_hp: async (s, pk, { param1 }, ctx) => {
    if (!ctx.isFinal) return;
    
    const oppActive = getActiveImg(oppPk(pk));
    if (!oppActive) return;
    
    const { base, cur } = getHpFromImg(oppActive);
    const newHp = Math.floor(cur / 2);
    
    setHpOnImg(oppActive, base, newHp);
    showPopup(`Halved opponent's HP to ${newHp}!`);
  },

  heal_bench_one: async (s, pk, { param1 }, ctx) => {
    if (!ctx.isFinal) return;
    
    const amount = parseInt10(param1);
    const benchImgs = getBenchImgs(pk);
    
    if (benchImgs.length === 0) {
      showPopup('No benched Pokémon.');
      return;
    }
    
    showPopup(`Choose a benched Pokémon to heal ${amount} damage.`);
    const chosen = await awaitSelection(benchImgs);
    
    if (chosen && healImg(chosen, amount)) {
      showPopup(`Healed ${amount} damage from ${chosen.alt}!`);
    }
  },

  heal_type_pokemon: async (s, pk, { param1, param2 }, ctx) => {
    if (!ctx.isFinal) return;
    
    const amount = parseInt10(param1);
    const type = (param2 || '').toLowerCase();
    const allPokemon = getAllPokemonImgs(pk);
    let healed = 0;
    
    for (const img of allPokemon) {
      try {
        const meta = await globalThis.fetchCardMeta(img.dataset.set, img.dataset.num);
        if (meta.types?.some(t => t.toLowerCase() === type)) {
          if (healImg(img, amount)) healed++;
        }
      } catch {}
    }
    
    if (healed > 0) {
      showPopup(`Healed ${amount} from ${healed} ${type}-type Pokémon!`);
    }
  },

  ignore_effects: async (s, pk, { param1 }, ctx) => {

    const activeImg = getActiveImg(pk);
    if (activeImg) {
      activeImg.dataset.ignoreEffects = 'true';
    }
  },

  ignore_weakness: async (s, pk, { param1 }, ctx) => {

    const activeImg = getActiveImg(pk);
    if (activeImg) {
      activeImg.dataset.ignoreWeakness = 'true';
    }
  },

  increase_incoming_damage_next_turn: async (s, pk, { param1 }, ctx) => {
    if (!ctx.isFinal) return;
    
    const increase = parseInt10(param1, 20);
    globalThis.__specialEffects ??= { p1: {}, p2: {} };
    globalThis.__specialEffects[pk].damageIncrease = increase;
    showPopup(`This Pokémon will take +${increase} damage next turn!`);
  },

  increase_opponent_costs_next_turn: async (s, pk, { param1 }, ctx) => {
    if (!ctx.isFinal) return;
    
    const increase = parseInt10(param1, 1);
    const opp = oppPk(pk);
    if (!globalThis.state) globalThis.state = {};
    if (!globalThis.state.opponentCostIncrease) globalThis.state.opponentCostIncrease = {};
    globalThis.state.opponentCostIncrease[opp] = increase;
    showPopup(`Opponent's attacks cost +${increase} Energy next turn!`);
  },

  increase_self_damage_next_turn: async (s, pk, { param1 }, ctx) => {
    if (!ctx.isFinal) return;
    
    const increase = parseInt10(param1, 20);
    const activeImg = getActiveImg(pk);
    if (activeImg) {
      activeImg.dataset.increaseSelfDamageNextTurn = String(increase);
      showPopup(`This Pokémon will take +${increase} self damage next turn!`);
    }
  },

  inflict_double_status: async (s, pk, { param1, param2 }, ctx) => {
    if (!ctx.isFinal) return;
    
    const status1 = (param1 || 'poisoned').toLowerCase();
    const status2 = (param2 || 'burned').toLowerCase();
    const oppActive = getActiveImg(oppPk(pk));
    
    if (oppActive) {
      applyStatus(oppPk(pk), status1);
      applyStatus(oppPk(pk), status2);
      showPopup(`Inflicted ${status1} and ${status2}!`);
    }
  },

  inflict_effect_counter_next_turn: async (s, pk, { param1 }, ctx) => {
    if (!ctx.isFinal) return;
    
    const opp = oppPk(pk);
    globalThis.__specialEffects ??= { p1: {}, p2: {} };
    globalThis.__specialEffects[opp].counterOnHit = parseInt10(param1, 20);
    showPopup(`Opponent will take ${param1} counter damage next turn!`);
  },

  inflict_effect_retreat_lock: async (s, pk, { param1 }, ctx) => {
    if (!ctx.isFinal) return;
    
    const opp = oppPk(pk);
    globalThis.__specialEffects ??= { p1: {}, p2: {} };
    globalThis.__specialEffects[opp].retreatLock = true;
    showPopup('Opponent cannot retreat next turn!');
  },

  inflict_random_status: async (s, pk, { param1 }, ctx) => {
    if (!ctx.isFinal) return;
    
    const statuses = ['poisoned', 'burned', 'paralyzed', 'asleep', 'confused'];
    const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
    applyStatus(oppPk(pk), randomStatus);
    showPopup(`Inflicted random status: ${randomStatus}!`);
  },

  inflict_status_both: async (s, pk, { param1 }, ctx) => {
    if (!ctx.isFinal) return;
    
    const status = (param1 || 'poisoned').toLowerCase();
    applyStatus(oppPk(pk), status);
    applyStatus(pk, status);
    showPopup(`Both Pokémon are now ${status}!`);
  },

  inflict_status_choice: async (s, pk, { param1 }, ctx) => {
    if (!ctx.isFinal) return;
    
    const statuses = (param1 || 'poisoned,burned').split(',').map(s => s.trim().toLowerCase());
    showPopup(`Choose status: ${statuses.join(' or ')}?`);
    

    const chosen = statuses[0];
    applyStatus(oppPk(pk), chosen);
    showPopup(`Inflicted ${chosen}!`);
  },

  inflict_status_heavy: async (s, pk, { param1 }, ctx) => {
    if (!ctx.isFinal) return;
    
    const status = (param1 || 'poisoned').toLowerCase();
    applyStatus(oppPk(pk), status);
    

    const oppActive = getActiveImg(oppPk(pk));
    if (oppActive) {
      oppActive.dataset.statusHeavy = 'true';
    }
    
    showPopup(`Inflicted heavy ${status}!`);
  },

  inflict_status_on_energy_attach: async (s, pk, { param1 }, ctx) => {

    const status = (param1 || 'asleep').toLowerCase();
    const activeImg = getActiveImg(pk);
    if (activeImg) {
      activeImg.dataset.inflictStatusOnEnergyAttach = status;
    }
  },

  inflict_status_self: async (s, pk, { param1 }, ctx) => {
    if (!ctx.isFinal) return;
    
    const status = (param1 || 'confused').toLowerCase();
    applyStatus(pk, status);
    showPopup(`This Pokémon is now ${status}!`);
  },

  prevent_damage_from_basic_next_turn: async (s, pk, { param1 }, ctx) => {
    if (!ctx.isFinal) return;
    
    globalThis.__specialEffects ??= { p1: {}, p2: {} };
    globalThis.__specialEffects[pk].preventDamageFromBasic = true;
    showPopup('This Pokémon takes no damage from Basic Pokémon next turn!');
  },

  prevent_damage_if_under_threshold: async (s, pk, { param1 }, ctx) => {

    const threshold = parseInt10(param1, 30);
    const activeImg = getActiveImg(pk);
    if (activeImg) {
      activeImg.dataset.preventDamageIfUnderThreshold = String(threshold);
    }
  },

  prevent_retreat_next_turn: async (s, pk, { param1 }, ctx) => {
    if (!ctx.isFinal) return;
    
    const opp = oppPk(pk);
    globalThis.__specialEffects ??= { p1: {}, p2: {} };
    globalThis.__specialEffects[opp].retreatLock = true;
    showPopup('Opponent cannot retreat next turn!');
  },

  prevent_supporter_next_turn: async (s, pk, { param1 }, ctx) => {
    if (!ctx.isFinal) return;
    
    const opp = oppPk(pk);
    globalThis.__specialEffects ??= { p1: {}, p2: {} };
    globalThis.__specialEffects[opp].supporterBlock = true;
    showPopup('Opponent cannot use Supporters next turn!');
  },

  random_single_target_damage: async (s, pk, { param1, param2 }, ctx) => {
    if (!ctx.isFinal) return;
    
    const count = parseInt10(param1, 1);
    const damage = parseInt10(param2, 50);
    const allOpponent = getAllPokemonImgs(oppPk(pk));
    
    if (allOpponent.length === 0) {
      showPopup('No opponent Pokémon.');
      return;
    }
    

    for (let i = 0; i < count; i++) {
      const randomTarget = allOpponent[Math.floor(Math.random() * allOpponent.length)];
      damageImg(randomTarget, damage);
    }
    
    showPopup(`Random target: ${count}× ${damage} damage!`);
  },

  reduce_damage_next_turn: async (s, pk, { param1 }, ctx) => {
    if (!ctx.isFinal) return;
    
    const reduction = parseInt10(param1, 20);
    globalThis.__specialEffects ??= { p1: {}, p2: {} };
    globalThis.__specialEffects[pk].damageReduction = reduction;
    showPopup(`This Pokémon takes -${reduction} damage next turn!`);
  },

  reduce_energy_cost_if_damaged: async (s, pk, { param1 }, ctx) => {

    const reduction = parseInt10(param1, 1);
    const activeImg = getActiveImg(pk);
    
    if (activeImg) {
      const { base, cur } = getHpFromImg(activeImg);
      if (cur < base) {
        activeImg.dataset.energyCostReductionIfDamaged = String(reduction);
      }
    }
  },

  return_opponent_active_to_hand: async (s, pk, { param1 }, ctx) => {
    if (!ctx.isFinal) return;
    
    const oppActive = getActiveImg(oppPk(pk));
    if (!oppActive) {
      showPopup('No opponent Active Pokémon.');
      return;
    }
    

    const cardData = {
      set: oppActive.dataset.set,
      number: oppActive.dataset.num,
      name: oppActive.alt
    };
    

    const opp = oppPk(pk);
    s[opp].hand = s[opp].hand || [];
    s[opp].hand.push(cardData);
    

    const slot = oppActive.closest('.card-slot');
    if (slot) {
      slot.remove();
    }
    
    showPopup(`Returned ${oppActive.alt} to opponent's hand!`);
    

    const owner = opp === 'p1' ? 'player1' : 'player2';
    if (typeof globalThis.beginPromotionFlow === 'function') {
      globalThis.beginPromotionFlow(owner);
    }
  },

  reveal_discard_supporter: async (s, pk, { param1 }, ctx) => {
    if (!ctx.isFinal) return;
    

    const opp = oppPk(pk);
    const oppOwner = opp === 'p1' ? 'player1' : 'player2';
    

    let hand = s[opp]?.hand || globalThis.playerState?.[oppOwner]?.hand || [];
    
    
    if (hand.length === 0) {
      showPopup('Opponent has no cards in hand.');
      return;
    }
    

    const supporters = [];
    for (const card of hand) {
      try {
        const meta = await globalThis.fetchCardMeta(card.set, card.number || card.num);
        if (meta.category === 'Trainer' && meta.trainerType === 'Supporter') {
          supporters.push(card);
        }
      } catch (e) {
        console.error('[reveal_discard_supporter] Error fetching meta for card:', card, e);
      }
    }
    
    if (supporters.length === 0) {
      showPopup('Opponent has no Supporter cards in hand.');
      return;
    }
    

    const oppHandDivId = oppOwner === 'player1' ? 'p1Hand' : 'p2Hand';
    const oppHandDiv = document.getElementById(oppHandDivId);
    

    const originalHide = oppOwner === 'player1' ? 
      (typeof currentPlayer !== 'undefined' && currentPlayer === 'player2') :
      (typeof currentPlayer !== 'undefined' && currentPlayer === 'player1');
    

    if (oppHandDiv && globalThis.renderHand) {
      globalThis.renderHand(oppHandDiv, hand, false, false);

      oppHandDiv.classList.remove('disable-clicks');
    }
    
    
    showPopup(`Opponent's hand revealed. Choose a Supporter card to discard.`);
    

    await new Promise(resolve => setTimeout(resolve, 300));
    

    const supporterElements = [];
    if (oppHandDiv) {
      const allCards = oppHandDiv.querySelectorAll('.card-img');
      for (const cardEl of allCards) {
        const cardSet = cardEl.dataset.set;
        const cardNum = cardEl.dataset.num;

        const isSupporter = supporters.some(c => 
          c.set === cardSet && String(c.number || c.num) === String(cardNum)
        );
        if (isSupporter) {
          supporterElements.push(cardEl);
          cardEl.classList.add('heal-glow');
        }
      }
    }
    
    
    if (supporterElements.length === 0) {

      if (globalThis.renderAllHands) {
        globalThis.renderAllHands();
        await new Promise(resolve => setTimeout(resolve, 200));
        const allCards = oppHandDiv?.querySelectorAll('.card-img') || [];
        for (const cardEl of allCards) {
          const cardSet = cardEl.dataset.set;
          const cardNum = cardEl.dataset.num;
          const isSupporter = supporters.some(c => 
            c.set === cardSet && String(c.number || c.num) === String(cardNum)
          );
          if (isSupporter) {
            supporterElements.push(cardEl);
            cardEl.classList.add('heal-glow');
          }
        }
      }
      
      if (supporterElements.length === 0) {
        showPopup(`No Supporter cards found in opponent's hand.`);

        if (oppHandDiv && globalThis.renderHand) {
          globalThis.renderHand(oppHandDiv, hand, originalHide, false);
        } else if (globalThis.renderAllHands) {
          globalThis.renderAllHands();
        }
        return;
      }
    }
    

    globalThis.__darknessClawSelectionActive = true;
    

    const chosenEl = await awaitSelection(supporterElements, 'heal-glow');
    

    globalThis.__darknessClawSelectionActive = false;
    

    if (oppHandDiv && globalThis.renderHand) {
      globalThis.renderHand(oppHandDiv, hand, originalHide, false);

      const shouldDisable = oppOwner === 'player1' ? 
        (typeof currentPlayer !== 'undefined' && currentPlayer === 'player2') :
        (typeof currentPlayer !== 'undefined' && currentPlayer === 'player1');
      if (shouldDisable) {
        oppHandDiv.classList.add('disable-clicks');
      }
    } else if (globalThis.renderAllHands) {
      globalThis.renderAllHands();
    }
    
    if (!chosenEl) {
      showPopup('No Supporter chosen.');
      return;
    }
    

    const chosenSet = chosenEl.dataset.set;
    const chosenNum = chosenEl.dataset.num;
    const handIndex = hand.findIndex(c => 
      c.set === chosenSet && String(c.number || c.num) === String(chosenNum)
    );
    
    if (handIndex === -1) {
      showPopup('Error: Could not find chosen card.');
      return;
    }
    

    const removed = hand.splice(handIndex, 1)[0];
    

    let cardName = removed.name;
    let cardSrc = removed.src;
    try {
      const meta = await globalThis.fetchCardMeta(removed.set, removed.number || removed.num);
      if (!cardName) cardName = meta.name || 'Unknown';
      if (!cardSrc) {
        const padded = String(removed.number || removed.num).padStart(3, '0');
        cardSrc = `https://assets.tcgdex.net/en/tcgp/${removed.set}/${padded}/high.png`;
      }
    } catch (e) {
      console.error('[reveal_discard_supporter] Error fetching meta for discarded card:', e);
      if (!cardName) cardName = 'Unknown';
      if (!cardSrc) {
        const padded = String(removed.number || removed.num).padStart(3, '0');
        cardSrc = `https://assets.tcgdex.net/en/tcgp/${removed.set}/${padded}/high.png`;
      }
    }
    

    const discardCard = {
      set: removed.set,
      num: removed.number || removed.num,
      number: removed.number || removed.num,
      name: cardName,
      src: cardSrc
    };
    

    if (s[opp]) {
      s[opp].hand = hand;
      if (!s[opp].discard) s[opp].discard = { cards: [] };
      if (!s[opp].discard.cards) s[opp].discard.cards = [];
      s[opp].discard.cards.push(discardCard);
    }
    
    if (globalThis.playerState?.[oppOwner]) {
      globalThis.playerState[oppOwner].hand = hand;

      if (!globalThis.playerState[oppOwner].discard) {
        globalThis.playerState[oppOwner].discard = { cards: [], energyCounts: {} };
      }
      if (!globalThis.playerState[oppOwner].discard.cards) {
        globalThis.playerState[oppOwner].discard.cards = [];
      }
      globalThis.playerState[oppOwner].discard.cards.push(discardCard);
    }
    

    if (globalThis.renderAllHands) {
      globalThis.renderAllHands();
    }
    if (globalThis.renderDiscard) {
      globalThis.renderDiscard(oppOwner);
    }
    if (globalThis.updateDeckBubbles) {
      globalThis.updateDeckBubbles();
    }
    
    showPopup(`Discarded ${cardName} from opponent's hand!`);
  },

  reveal_hand_shuffle_card: async (s, pk, { param1 }, ctx) => {
    if (!ctx.isFinal) return;
    
    const hand = s[pk]?.hand || [];
    
    if (hand.length === 0) {
      showPopup('No cards in hand.');
      return;
    }
    

    const randomIndex = Math.floor(Math.random() * hand.length);
    const card = hand[randomIndex];
    
    showPopup(`Revealed ${card.name || 'a card'} from hand!`);
    

    hand.splice(randomIndex, 1);
    const deck = s[pk]?.deck || [];
    deck.push(card);
    shuffleDeckAndAnimate(s, pk);
    
    // Update globalThis.playerState
    const owner = pk === 'p1' ? 'player1' : 'player2';
    if (globalThis.playerState && globalThis.playerState[owner]) {
      globalThis.playerState[owner].hand = [...hand];
      globalThis.playerState[owner].deck = [...deck];
    }
    
    // Update local playerState if it exists
    if (typeof playerState !== 'undefined' && playerState && playerState[owner]) {
      playerState[owner].hand = [...hand];
      playerState[owner].deck = [...deck];
    }
    
    // Sync to Firebase if in online mode
    if (typeof globalThis.updateGameStatePartial === 'function') {
      const getCurrentMatchIdFn = globalThis.getCurrentMatchId;
      const matchId = getCurrentMatchIdFn ? getCurrentMatchIdFn() : null;
      const isOnline = matchId && typeof window !== 'undefined' && window.firebaseDatabase;
      if (isOnline) {
        const isCurrentPlayer1Fn = globalThis.isCurrentPlayer1;
        const isP1 = (isCurrentPlayer1Fn && typeof isCurrentPlayer1Fn === 'function') ? isCurrentPlayer1Fn() : false;
        const matchPlayer = (isP1 && owner === 'player1') || (!isP1 && owner === 'player2') 
          ? 'player1' 
          : 'player2';
        try {
          await globalThis.updateGameStatePartial({
            [`${matchPlayer}/hand`]: globalThis.playerState[owner].hand,
            [`${matchPlayer}/deck`]: globalThis.playerState[owner].deck
          });
        } catch (error) {
          console.error('[reveal_hand_shuffle_card] Error syncing to Firebase:', error);
        }
      }
    }
    
    showPopup(`Shuffled ${card.name || 'card'} into deck!`);
  },

  reveal_opponent_hand: async (s, pk, { param1 }, ctx) => {
    if (!ctx.isFinal) return;
    
    const opp = oppPk(pk);
    const hand = s[opp]?.hand || [];
    
    if (hand.length === 0) {
      showPopup('Opponent has no cards in hand.');
      return;
    }
    
    const cardNames = hand.map(c => c.name || 'Unknown').join(', ');
    showPopup(`Opponent's hand: ${cardNames}`);
  },

  search_basic_to_bench: async (s, pk, { param1 }, ctx) => {
    if (!ctx.isFinal) return;
    
    const deck = s[pk]?.deck || [];
    
    if (deck.length === 0) {
      showPopup('Deck is empty.');
      return;
    }
    

    const basicCards = [];
    for (const card of deck) {
      try {
        const meta = await globalThis.fetchCardMeta(card.set, card.number || card.num);
        if (meta.category === 'Pokemon' && meta.stage?.toLowerCase() === 'basic') {
          basicCards.push(card);
        }
      } catch {}
    }
    
    if (basicCards.length === 0) {
      showPopup('No Basic Pokémon in deck.');
      return;
    }
    

    const chosen = basicCards[Math.floor(Math.random() * basicCards.length)];
    

    const index = deck.indexOf(chosen);
    if (index !== -1) {
      deck.splice(index, 1);
    }
    
    // Update globalThis.playerState
    const owner = pk === 'p1' ? 'player1' : 'player2';
    if (globalThis.playerState && globalThis.playerState[owner]) {
      globalThis.playerState[owner].deck = [...deck];
    }
    
    // Update local playerState if it exists
    if (typeof playerState !== 'undefined' && playerState && playerState[owner]) {
      playerState[owner].deck = [...deck];
    }
    
    // Sync to Firebase if in online mode
    if (typeof globalThis.updateGameStatePartial === 'function') {
      const getCurrentMatchIdFn = globalThis.getCurrentMatchId;
      const matchId = getCurrentMatchIdFn ? getCurrentMatchIdFn() : null;
      const isOnline = matchId && typeof window !== 'undefined' && window.firebaseDatabase;
      if (isOnline) {
        const isCurrentPlayer1Fn = globalThis.isCurrentPlayer1;
        const isP1 = (isCurrentPlayer1Fn && typeof isCurrentPlayer1Fn === 'function') ? isCurrentPlayer1Fn() : false;
        const matchPlayer = (isP1 && owner === 'player1') || (!isP1 && owner === 'player2') 
          ? 'player1' 
          : 'player2';
        try {
          await globalThis.updateGameStatePartial({
            [`${matchPlayer}/deck`]: globalThis.playerState[owner].deck
          });
        } catch (error) {
          console.error('[search_basic_to_bench] Error syncing to Firebase:', error);
        }
      }
    }

    showPopup(`Call for Family: Found ${chosen.name}!`);

  },

  search_evolution_of_self: async (s, pk, { param1 }, ctx) => {
    if (!ctx.isFinal) return;
    
    const activeImg = getActiveImg(pk);
    if (!activeImg) return;
    
    const deck = s[pk]?.deck || [];
    const currentName = (activeImg.alt || '').toLowerCase();
    

    const evolutionCards = [];
    for (const card of deck) {
      try {
        const meta = await globalThis.fetchCardMeta(card.set, card.number || card.num);
        if (meta.category === 'Pokemon' && meta.evolvesFrom) {
          const evolvesFrom = meta.evolvesFrom.toLowerCase();
          if (evolvesFrom === currentName || currentName.includes(evolvesFrom)) {
            evolutionCards.push(card);
          }
        }
      } catch {}
    }
    
    if (evolutionCards.length === 0) {
      showPopup('No evolution available.');
      return;
    }
    

    const chosen = evolutionCards[Math.floor(Math.random() * evolutionCards.length)];
    

    const index = deck.indexOf(chosen);
    if (index !== -1) {
      deck.splice(index, 1);
      s[pk].hand = s[pk].hand || [];
      s[pk].hand.push(chosen);
      
      if (globalThis.renderAllHands) globalThis.renderAllHands();
      if (globalThis.updateDeckBubbles) globalThis.updateDeckBubbles();
      
      showPopup(`Found ${chosen.name}!`);
    }
  },

  search_named_to_bench: async (s, pk, { param1, param2 }, ctx) => {
    if (!ctx.isFinal) return;
    
    const name = (param1 || '').toLowerCase();
    const deck = s[pk]?.deck || [];
    
    if (deck.length === 0) {
      showPopup('Deck is empty.');
      return;
    }
    

    const matchingCards = [];
    for (const card of deck) {
      const cardName = (card.name || '').toLowerCase();
      if (cardName.includes(name)) {
        matchingCards.push(card);
      }
    }
    
    if (matchingCards.length === 0) {
      showPopup(`No ${name} in deck.`);
      return;
    }
    

    const chosen = matchingCards[Math.floor(Math.random() * matchingCards.length)];
    

    const index = deck.indexOf(chosen);
    if (index !== -1) {
      deck.splice(index, 1);
    }
    
    showPopup(`Found ${chosen.name}!`);

  },

  self_boost_next_turn: async (s, pk, { param1 }, ctx) => {
    if (!ctx.isFinal) return;
    
    const boost = parseInt10(param1);
    const activeImg = getActiveImg(pk);
    const instanceId = activeImg?.dataset.instanceId;
    
    if (instanceId) {
      if (!globalThis.state) globalThis.state = {};
      if (!globalThis.state.damageBoost) globalThis.state.damageBoost = {};
      if (!globalThis.state.damageBoost[pk]) globalThis.state.damageBoost[pk] = {};
      
      globalThis.state.damageBoost[pk][instanceId] = {
        amount: boost,
        duration: 'next_turn'
      };
      showPopup(`Next turn: +${boost} damage!`);
    }
  },

  self_damage_if_ko: async (s, pk, { param1 }, ctx) => {

    const damage = parseInt10(param1, 20);
    const activeImg = getActiveImg(pk);
    
    if (activeImg) {
      activeImg.dataset.selfDamageIfKo = String(damage);
    }
  },

  self_inflict_effect: async (s, pk, { param1 }, ctx) => {
    if (!ctx.isFinal) return;
    
    const effect = param1?.toLowerCase();
    const activeImg = getActiveImg(pk);
    
    if (effect === 'confusion' && activeImg) {
      applyStatus(pk, 'confusion');
      showPopup('This Pokémon is now Confused!');
    }
  },

  self_inflict_status: async (s, pk, { param1 }, ctx) => {
    if (!ctx.isFinal) return;
    
    const status = (param1 || 'confused').toLowerCase();
    applyStatus(pk, status);
    showPopup(`This Pokémon is now ${status}!`);
  },

  self_lock_next_turn: async (s, pk, { param1 }, ctx) => {
    if (!ctx.isFinal) return;
    
    globalThis.__specialEffects ??= { p1: {}, p2: {} };
    globalThis.__specialEffects[pk].attackLock = true;
    showPopup('This Pokémon cannot attack next turn!');
  },

  self_lock_specific_attack: async (s, pk, { param1 }, ctx) => {
    if (!ctx.isFinal) return;
    
    const moveName = ctx?.moveName || param1;
    const activeImg = getActiveImg(pk);
    const instanceId = activeImg?.dataset.instanceId;
    
    if (instanceId && moveName) {
      if (!globalThis.__moveLocks) globalThis.__moveLocks = { p1: {}, p2: {} };
      if (!globalThis.__moveLocks[pk]) globalThis.__moveLocks[pk] = {};
      if (!globalThis.__moveLocks[pk][instanceId]) globalThis.__moveLocks[pk][instanceId] = {};
      
      const moveNameLower = moveName.toLowerCase();
      const currentTurn = globalThis.turnNumber || 0;
      globalThis.__moveLocks[pk][instanceId][moveNameLower] = {
        locked: true,
        lockedOnTurn: currentTurn
      };
      showPopup(`During your next turn, this Pokémon can't use ${moveName}.`);
    }
  },

  stacking_damage_boost: async (s, pk, { param1 }, ctx) => {
    const boost = parseInt10(param1, 10);
    const activeImg = getActiveImg(pk);
    const instanceId = activeImg?.dataset.instanceId;
    
    if (instanceId) {
      if (!globalThis.state) globalThis.state = {};
      if (!globalThis.state.stackingDamageBoost) globalThis.state.stackingDamageBoost = {};
      if (!globalThis.state.stackingDamageBoost[pk]) globalThis.state.stackingDamageBoost[pk] = {};
      if (!globalThis.state.stackingDamageBoost[pk][instanceId]) {
        globalThis.state.stackingDamageBoost[pk][instanceId] = 0;
      }
      
      globalThis.state.stackingDamageBoost[pk][instanceId] += boost;
      const total = globalThis.state.stackingDamageBoost[pk][instanceId];
      showPopup(`Stacking boost: +${total} damage (added +${boost})!`);
    }
  },

  switch_self_with_bench_type: async (s, pk, { param1 }, ctx) => {
    if (!ctx.isFinal) return;
    
    const type = (param1 || '').toLowerCase();
    const activeImg = getActiveImg(pk);
    
    if (!activeImg) return;
    

    try {
      const meta = await globalThis.fetchCardMeta(activeImg.dataset.set, activeImg.dataset.num);
      const hasType = meta.types?.some(t => t.toLowerCase() === type);
      
      if (!hasType) {
        showPopup(`Active Pokémon is not ${type} type.`);
        return;
      }
    } catch {
      showPopup('Could not verify Active Pokémon type.');
      return;
    }
    

    const benchImgs = getBenchImgs(pk);
    const eligible = [];
    
    for (const img of benchImgs) {
      try {
        const meta = await globalThis.fetchCardMeta(img.dataset.set, img.dataset.num);
        if (meta.types?.some(t => t.toLowerCase() === type)) {
          eligible.push(img);
        }
      } catch {}
    }
    
    if (eligible.length === 0) {
      showPopup(`No benched ${type}-type Pokémon.`);
      return;
    }
    
    showPopup(`Choose a benched ${type}-type Pokémon to switch with.`);
    const chosen = await awaitSelection(eligible);
    
    if (chosen) {

      try {
        const owner = pk === 'p1' ? 'player1' : 'player2';
        const activeDiv = globalThis.activeFor(owner);
        const activeSlot = activeDiv?.querySelector('.card-slot');
        const benchSlot = chosen.closest('.card-slot');
        
        if (!activeSlot || !benchSlot) {
          showPopup('Error: Could not find slots');
          return;
        }
        
        const activePack = globalThis.detachAttachments(activeSlot);
        const benchPack = globalThis.detachAttachments(benchSlot);
        
        activeSlot.removeChild(activeImg);
        benchSlot.removeChild(chosen);
        
        activeSlot.appendChild(chosen);
        benchSlot.appendChild(activeImg);
        
        globalThis.attachAttachments(activeSlot, benchPack);
        globalThis.attachAttachments(benchSlot, activePack);
        
        if (typeof globalThis.markSlot === 'function') {
          globalThis.markSlot(activeSlot, true);
          globalThis.markSlot(benchSlot, true);
        }
        
        showPopup(`Switched ${activeImg.alt} with ${chosen.alt}!`);
      } catch (err) {
        console.error('[switch_self_with_bench_type] Swap failed:', err);
        showPopup('Switch failed.');
      }
    }
  },

};

globalThis.MOVE_EFFECT_HANDLERS = MOVE_HANDLERS;

async function selectBenchPokemon(pk, count, filterFn = null) {
  const bench = getBenchImgs(pk);
  const available = filterFn ? bench.filter(filterFn) : bench;
  
  if (available.length === 0) {
    return [];
  }
  
  if (available.length <= count) {
    return available;
  }
  

  showPopup(`Selected ${count} Benched Pokemon (auto-selection)`);
  return available.slice(0, count);
}

async function selectPokemon(pk, options, message) {
  if (options.length === 0) return null;
  if (options.length === 1) return options[0];
  

  showPopup(message || 'Auto-selected first available Pokemon');
  return options[0];
}

const previewCache = { p1: null, p2: null };

async function applyMoveEffect(state, pk, attackName, baseDamage, ctx = {}) {
  await loadMoveEffects();
  
  const img = getActiveImg(pk);
  if (!img) return baseDamage;
  
  const isFinal = ctx.isFinal ?? true;
  

  const row = getMoveRow(img.alt, attackName);
  const isMultiplicative = ctx.isMultiplicative || row?.damageNotation?.includes('×') || row?.damageNotation?.toLowerCase().includes('x');
  const multiplier = ctx.multiplier || 1;
  let totalBonuses = 0;
  

  if (row?.effect_type === 'bonus_damage_for_each_bench') {
      baseDamage = 0;
  }
  

  if (row?.effect_type === 'bonus_damage_per_energy_on_opponent_all') {
    baseDamage = 0;
  }
  

  if (row?.effect_type === 'random_multi_target_damage') {
    const csvBaseDamage = parseInt(row?.damageBase || row?.damage || '0', 10);
    if (csvBaseDamage === 0) {
      baseDamage = 0;
    } else {

      baseDamage = csvBaseDamage;
    }
  }
  
  let damage = baseDamage;
  

  
  if (img && isFinal && img.dataset.set && img.dataset.num) {
    try {

      const cacheKey = `${img.dataset.set}-${img.dataset.num}`;
      const abilityRow = globalThis.abilityCache?.[cacheKey];
      
      
      if (abilityRow?.effect_type === 'boost_damage_if_arceus') {
        if (hasArceusInPlay(pk)) {
          const arceusDamageBoost = parseInt10(abilityRow.param1, 30);
          if (isMultiplicative) {
            totalBonuses += arceusDamageBoost;
          } else {
          damage += arceusDamageBoost;
          }
        } else {
        }
      }
    } catch (e) {
      console.error('[arceus-damage-debug] Error checking Arceus boost:', e);

    }
  } else {
  }
  
  if (!row?.effect_type) {

    if (isMultiplicative) {
      return { damage: totalBonuses, totalBonuses: totalBonuses };
    }
    return damage;
  }
  

  if (isMultiplicative) {
    baseDamage = 0;
    damage = 0;
  } else if (row.damageNotation?.includes('×')) {
    baseDamage = 0;
    damage = 0;
  }
  

  
  const handler = MOVE_HANDLERS[row.effect_type];
  if (!handler) {
    if (isMultiplicative) {
      return { damage: totalBonuses, totalBonuses: totalBonuses };
    }
    return baseDamage;
  }
  
  const context = {
    damage,
    moveName: attackName,
    moveRowText: row?.effect_text || row?.text || '',
    moveRow: row,
    isFinal,
    rawCtx: ctx,
    isMultiplicative: isMultiplicative,
    multiplier: multiplier,
    addBonus: amt => { 
      if (isMultiplicative) {

        totalBonuses += amt;
        context.totalBonuses = totalBonuses;
      } else {

        damage += amt;
        context.damage = damage;
      }
    },
    setOverride: v => { 
      damage = v;
      context.damage = damage;
    },
    totalBonuses: 0
  };
  
  
  await handler(state, pk, { param1: row.param1, param2: row.param2 }, context);
  

    damage = context.damage;
  

  if (isMultiplicative) {
    totalBonuses = context.totalBonuses || totalBonuses;
    damage = totalBonuses;
  }
  

  if (isFinal && attackName) {
    if (!globalThis.__moveUseCount) globalThis.__moveUseCount = { p1: {}, p2: {} };
    if (!globalThis.__moveUseCount[pk]) globalThis.__moveUseCount[pk] = {};

    const moveKey = attackName.trim();
    globalThis.__moveUseCount[pk][moveKey] = (globalThis.__moveUseCount[pk][moveKey] || 0) + 1;
  }
  

  const delta = damage - baseDamage;
  const isEnergyCrush = row.effect_type === 'bonus_damage_per_energy_on_opponent_all';
  const isCrystalWaltz = row.effect_type === 'bonus_damage_for_each_bench';
  if (!isFinal) {
    previewCache[pk] = { attack: normStr(attackName), delta };
  } else {
    const prev = previewCache[pk];
    if (prev?.attack === normStr(attackName) && !isEnergyCrush && !isCrystalWaltz) {

      if (delta === prev.delta) {

      } else {

      damage = baseDamage + (delta - prev.delta);
      }

      previewCache[pk] = null;
    } else if (prev?.attack === normStr(attackName) && (isEnergyCrush || isCrystalWaltz)) {

      previewCache[pk] = null;
    }
  }
  

  if (!isMultiplicative) {
  const boost = state.temp?.[pk]?.globalDamageBoost || 0;
  if (boost) damage += boost;
  }
  
  if (isFinal) {
    globalThis.addLog?.(pk, `used <b>${attackName}</b>`, img.src, { name: img.alt });
  }
  

  if (isFinal && context.checkKoForRecoil) {
    return { damage, context };
  }
  

  if (isMultiplicative) {
    return { damage: totalBonuses, totalBonuses: totalBonuses };
  }
  
  return damage;
}

globalThis.applyMoveEffectFromCsv = applyMoveEffect;
globalThis.runMoveEffect = applyMoveEffect;
globalThis.loadMoveEffects = loadMoveEffects;
globalThis.getMoveRow = getMoveRow;
globalThis.normStr = normStr;

const ABILITY_HANDLERS = {
  heal_all: async (s, pk, { param1 }) => {
    const amt = parseInt10(param1, 20);
    let healed = 0;
    for (const img of getAllPokemonImgs(pk)) if (healImg(img, amt)) healed++;
    showPopup(healed ? `Healed ${amt} from ${healed} Pokémon.` : 'Nothing to heal.');
  },

  force_switch_opponent_basic: async (s, pk) => {
    const opp = oppPk(pk);
    const basics = [];
    
    for (const img of getBenchImgs(opp)) {
      try {
        const meta = await globalThis.fetchCardMeta(img.dataset.set, img.dataset.num);
        if (meta.stage?.toLowerCase() === 'basic') basics.push(img);
      } catch {}
    }
    
    if (!basics.length) { showPopup('No Basic Pokémon on opponent bench.'); return; }
    
    showPopup('Opponent: choose Basic to switch in.');
    const chosen = await awaitSelection(basics, 'promote-glow');
    if (chosen) globalThis.beginPromotionFlow?.(pkToPlayer(opp));
  },

  deal_damage_any: async (s, pk, { param1 }) => {
    const dmg = parseInt10(param1, 20);
    const targets = getAllPokemonImgs(oppPk(pk));
    if (!targets.length) { showPopup('No targets.'); return; }
    

    if (typeof globalThis.zoomBackdrop !== 'undefined' && globalThis.zoomBackdrop.classList.contains('show')) {
      globalThis.zoomBackdrop.classList.remove('show');
      if (typeof globalThis.currentZoom !== 'undefined') {
        globalThis.currentZoom = { img: null, meta: null };
      }
    }
    
    showPopup(`Choose target for ${dmg} damage.`);
    const chosen = await awaitSelection(targets);
    if (chosen) {
      const result = damageImg(chosen, dmg);
      showPopup(`Dealt ${dmg} to ${chosen.alt}.`);
      

      return { 
        knocked: result.knocked,
        knockedImg: result.knocked ? chosen : null
      };
    }
    
    return { knocked: false, knockedImg: null };
  },

  attach_energy_from_zone: async (s, pk, { param1, param2 }, ctx) => {

    const type = (param1 || 'lightning').toLowerCase();
    const count = parseInt10(param2, 1);
    

    let targetImg = ctx?.sourceImg || ctx?.abilityPokemon;
    
    
    if (!targetImg) { 
      showPopup('Could not identify which Pokemon to attach energy to.');
      console.error('[Volt Charge] No sourceImg or abilityPokemon in context');
      return; 
    }
    

    for (let i = 0; i < count; i++) {
      attachEnergy(targetImg, type);
    }
    
    const location = getActiveImg(pk) === targetImg ? 'active' : 'bench';
    showPopup(`${targetImg.alt} (${location}): Attached ${count} ${type} Energy to itself.`);
  },

  attach_energy_from_zone_to_active: async (s, pk, { param1 }) => {
    const type = (param1 || 'psychic').toLowerCase();
    const active = getActiveImg(pk);
    if (!active) { showPopup('No Active.'); return; }
    
    try {
      const meta = await globalThis.fetchCardMeta(active.dataset.set, active.dataset.num);
      if (!meta.types?.some(t => t.toLowerCase() === type)) {
        showPopup(`Active is not ${type}-type.`); return;
      }
    } catch { showPopup('Type check failed.'); return; }
    
    attachEnergy(active, type);
    
    showPopup(`Attached ${type} Energy.`);
  },

  flip_inflict_status: async (s, pk, { param1 }) => {
    const status = param1 || 'asleep';
    if ((await flipCoin(pk)) === 'heads') {
      applyStatus(oppPk(pk), status);
      showPopup(`HEADS → ${status}!`);
    } else showPopup('TAILS → no effect.');
  },

  flip_draw_cards: async (s, pk, { param1 }) => {
    const count = parseInt10(param1, 1);
    if ((await flipCoin(pk)) === 'heads') {
      if (globalThis.drawCards) {
        globalThis.drawCards(s, pk, count);
        showPopup(`HEADS → Drew ${count} card(s)!`);
      } else {
        showPopup('HEADS → Draw effect not available.');
      }
    } else {
      showPopup('TAILS → no effect.');
    }
  },

  flip_deal_damage: async (s, pk, { param1, param2 }) => {
    const damage = parseInt10(param1, 20);
    const target = param2?.toLowerCase() || 'opponent_active';
    
    if ((await flipCoin(pk)) === 'heads') {
      if (target === 'opponent_active' || target === 'any') {

        if (target === 'any') {
          const allOpponent = getAllPokemonImgs(oppPk(pk));
          if (allOpponent.length === 0) {
            showPopup('No opponent Pokémon to damage.');
            return;
          }
          showPopup('Select target Pokémon.');
          const targetImg = await awaitSelection(allOpponent);
          if (targetImg) {
            damageImg(targetImg, damage);
            showPopup(`HEADS → Dealt ${damage} damage to ${targetImg.alt}!`);
          }
        } else {
          const oppImg = getActiveImg(oppPk(pk));
          if (oppImg) {
            damageImg(oppImg, damage);
            showPopup(`HEADS → Dealt ${damage} damage!`);
          } else {
            showPopup('No opponent Active Pokémon.');
          }
        }
      } else if (target === 'self') {
        const selfImg = getActiveImg(pk);
        if (selfImg) {
          damageImg(selfImg, damage);
          showPopup(`HEADS → Dealt ${damage} damage to self!`);
        }
      }
    } else {
      showPopup('TAILS → no effect.');
    }
  },

  flip_inflict_effect: async (s, pk, { param1, param2 }) => {

    const effectType = param1?.toLowerCase();
    const effectParam = param2;
    
    if ((await flipCoin(pk)) === 'heads') {
      if (effectType === 'discard_energy') {
        const count = parseInt10(effectParam, 1);
        const oppImg = getActiveImg(oppPk(pk));
        if (oppImg) {
          const removed = await removeEnergy(oppImg, null, count);
          showPopup(`HEADS → Discarded ${removed} Energy from opponent!`);
        } else {
          showPopup('No opponent Active Pokémon.');
        }
      } else if (effectType === 'draw_cards') {
        const count = parseInt10(effectParam, 1);
        if (globalThis.drawCards) {
          globalThis.drawCards(s, pk, count);
          showPopup(`HEADS → Drew ${count} card(s)!`);
        }
      } else if (effectType === 'damage') {
        const damage = parseInt10(effectParam, 20);
        const oppImg = getActiveImg(oppPk(pk));
        if (oppImg) {
          damageImg(oppImg, damage);
          showPopup(`HEADS → Dealt ${damage} damage!`);
        }
      } else {
        showPopup(`HEADS → Effect type "${effectType}" not implemented.`);
      }
    } else {
      showPopup('TAILS → no effect.');
    }
  },

  inflict_status: async (s, pk, { param1 }) => {
    applyStatus(oppPk(pk), param1 || 'poisoned');
    showPopup(`Opponent is ${param1 || 'poisoned'}.`);
  },

  force_opponent_switch: async (s, pk) => {
    globalThis.beginPromotionFlow?.(pkToPlayer(oppPk(pk)));
    showPopup('Opponent must switch.');
  },

  peek_topdeck: async (s, pk, { param1 }) => {
    const deck = s[pk].deck ?? [];
    const n = Math.min(parseInt10(param1, 1), deck.length);
    showPopup(n ? `Top: ${deck.slice(0, n).map(c => c.name).join(', ')}` : 'Deck empty.');
  },

  heal_active: async (s, pk, { param1 }) => {
    const img = getActiveImg(pk);
    if (img && healImg(img, parseInt10(param1))) showPopup(`Healed ${param1}.`);
    else showPopup('Nothing to heal.');
  },

  draw_cards: async (s, pk, { param1 }) => {
    globalThis.drawCards?.(s, pk, parseInt10(param1, 1));
    showPopup(`Drew ${param1 || 1} card(s).`);
  },

  move_energy: async (s, pk, { param1 }) => {
    const type = param1?.toLowerCase() || null;
    const all = getAllPokemonImgs(pk);
    if (all.length < 2) { showPopup('Need 2+ Pokémon.'); return; }
    
    showPopup('Select source.');
    const source = await awaitSelection(all);
    if (!source || !countEnergy(source, type)) { showPopup('No energy to move.'); return; }
    
    const targets = all.filter(img => img !== source);
    showPopup('Select target.');
    const target = await awaitSelection(targets);
    
    if (target && await removeEnergy(source, type, 1)) {
      attachEnergy(target, type || 'colorless');
      showPopup(`Moved energy to ${target.alt}.`);
    }
  },

  block_evolution: async (s, pk, { param1 }) => {

    if (!globalThis.state) globalThis.state = {};
    if (!globalThis.state.evolutionBlocked) globalThis.state.evolutionBlocked = {};
    
    const target = param1 === 'opponent' ? oppPk(pk) : pk;
    globalThis.state.evolutionBlocked[target] = true;
    
    showPopup('Opponent cannot evolve their Active Pokemon!');
  },

  double_energy_type: async (s, pk, { param1 }) => {

    if (!globalThis.state) globalThis.state = {};
    if (!globalThis.state.energyMultiplier) globalThis.state.energyMultiplier = {};
    
    globalThis.state.energyMultiplier[pk] = {
      type: param1?.toLowerCase(),
      multiplier: 2,
      restriction: param1?.toLowerCase()
    };
    

    const allPokemon = getAllPokemonImgs(pk);
    for (const img of allPokemon) {
      try {
        const meta = await globalThis.fetchCardMeta(img.dataset.set, img.dataset.num);
        if (meta.types) {
          img.dataset.pokemonTypes = meta.types.map(t => t.toLowerCase()).join(',');
        }
      } catch (e) {
        console.error('[double_energy] Failed to cache type for', img.alt);
      }
    }
    
    showPopup(`${param1} Energy provides 2 ${param1} for your ${param1} Pokemon!`);
  },

  move_energy_type_to_active: async (s, pk, { param1, param2 }) => {

    const energyType = (param1 || 'water').toLowerCase();
    

    const benchWithEnergy = [];
    for (const img of getBenchImgs(pk)) {
      try {
        const meta = await globalThis.fetchCardMeta(img.dataset.set, img.dataset.num);
        const hasType = meta.types?.some(t => t.toLowerCase() === energyType);
        const hasEnergy = countEnergy(img, energyType) > 0;
        
        if (hasType && hasEnergy) {
          benchWithEnergy.push(img);
        }
      } catch {}
    }
    
    if (benchWithEnergy.length === 0) {
      showPopup(`No benched ${energyType} Pokemon with ${energyType} Energy`);
      return;
    }
    

    const activeImg = getActiveImg(pk);
    if (!activeImg) {
      showPopup('No Active Pokemon');
      return;
    }
    

    try {
      const activeMeta = await globalThis.fetchCardMeta(activeImg.dataset.set, activeImg.dataset.num);
      const activeHasType = activeMeta.types?.some(t => t.toLowerCase() === energyType);
      
      if (!activeHasType) {
        showPopup(`Active Pokemon is not ${energyType} type`);
        return;
      }
    } catch {
      showPopup('Could not verify Active Pokemon type');
      return;
    }
    
    showPopup(`Choose benched ${energyType} Pokemon to move ${energyType} Energy from`);
    const source = await awaitSelection(benchWithEnergy);
    
    if (source) {

      if (await removeEnergy(source, energyType, 1)) {
        attachEnergy(activeImg, energyType);
        showPopup(`Moved ${energyType} Energy to Active Pokemon`);
      }
    }
  },

  reduce_damage_from_types: async () => {

  },

  block_attack_effects: async () => {

  },

  move_all_damage: async (s, pk, params, ctx) => {
    const targets = getAllPokemonImgs(pk).filter(img => {
      const slot = img.closest('.card-slot');
      const modifiedMaxHp = slot?.dataset.maxHp ? parseInt10(slot.dataset.maxHp) : null;
      const hp = modifiedMaxHp || parseInt10(img.dataset.hp, 0);
      const chp = parseInt10(img.dataset.chp, hp);
      return chp < hp;
    });
    
    if (!targets.length) {
      showPopup('No Pokémon with damage.');
      return;
    }
    
    showPopup('Shadow Void: Choose Pokémon to move damage from.');
    const chosen = await awaitSelection(targets);
    if (!chosen) return;
    

    const dusknoir = ctx?.sourceImg || ctx?.abilityPokemon;
    
    if (!dusknoir) {
      showPopup('Could not identify which Dusknoir to move damage to.');
      console.error('[Shadow Void] No sourceImg or abilityPokemon in context');
      return;
    }
    

    const chosenSlot = chosen.closest('.card-slot');
    const chosenModifiedHp = chosenSlot?.dataset.maxHp ? parseInt10(chosenSlot.dataset.maxHp) : null;
    const chosenHp = chosenModifiedHp || parseInt10(chosen.dataset.hp, 0);
    const chosenChp = parseInt10(chosen.dataset.chp, 0);
    const damage = chosenHp - chosenChp;
    
    if (damage <= 0) {
      showPopup('No damage to move.');
      return;
    }
    

    chosen.dataset.chp = String(chosenHp);
    if (globalThis.setHpOnImage) {
      globalThis.setHpOnImage(chosen, chosenHp, chosenHp);
    }
    

    const result = damageImg(dusknoir, damage);
    showPopup(`Moved ${damage} damage to ${dusknoir.alt}.`);
    

    return { 
      knocked: result.knocked,
      knockedImg: result.knocked ? dusknoir : null
    };
  },

  zero_retreat_if_energy: async () => {

  },

  boost_type_damage: async () => {

  },

  damage_on_energy_attach: async () => {

  },

  flip_reduce_damage: async () => {

  },

  discard_to_draw: async (s, pk) => {
    const owner = pkToPlayer(pk);
    const hand = s[pk]?.hand || [];
    
    if (hand.length === 0) {
      showPopup('No cards in hand to discard.');
      return;
    }
    
    
    showPopup('Choose a card from your hand to discard.');
    

    if (globalThis.beginHandCardDiscard) {
      await globalThis.beginHandCardDiscard(owner, 1);
    } else {

      const randomIndex = Math.floor(Math.random() * hand.length);
      const discarded = hand.splice(randomIndex, 1)[0];
      
      if (globalThis.pushCardToDiscard && discarded) {
        const fakeImg = document.createElement('img');
        fakeImg.dataset.set = discarded.set;
        fakeImg.dataset.num = discarded.num;
        globalThis.pushCardToDiscard(owner, fakeImg);
      }
      
      showPopup(`Discarded ${discarded?.name || 'a card'}.`);
    }
    

    if (globalThis.drawCard) {
      globalThis.drawCard(owner);
      showPopup('Drew 1 card.');
    }
  },

  boost_damage_if_arceus: async () => {

  },

  deal_damage_if_arceus: async (s, pk, { param1 }) => {

    const damage = parseInt10(param1, 30);
    

    const allPokemon = getAllPokemonImgs(pk);
    const hasArceus = allPokemon.some(img => {
      const name = (img.alt || '').toLowerCase();
      return name.includes('arceus');
    });
    
    if (!hasArceus) {
      showPopup('No Arceus in play - ability cannot be used.');
      return { knocked: false, knockedImg: null };
    }
    

    const targets = getAllPokemonImgs(oppPk(pk));
    if (!targets.length) {
      showPopup('No targets.');
      return { knocked: false, knockedImg: null };
    }
    

    if (typeof globalThis.zoomBackdrop !== 'undefined' && globalThis.zoomBackdrop.classList.contains('show')) {
      globalThis.zoomBackdrop.classList.remove('show');
      if (typeof globalThis.currentZoom !== 'undefined') {
        globalThis.currentZoom = { img: null, meta: null };
      }
    }
    
    showPopup(`Choose opponent's Active Pokemon for ${damage} damage.`);
    const chosen = await awaitSelection([getActiveImg(oppPk(pk))].filter(Boolean));
    
    if (chosen) {
      const result = damageImg(chosen, damage);
      showPopup(`Dealt ${damage} to ${chosen.alt}!`);
      

      return {
        knocked: result.knocked,
        knockedImg: result.knocked ? chosen : null
      };
    }
    
    return { knocked: false, knockedImg: null };
  },

  zero_retreat_if_arceus: async () => {

  },

  reduce_attack_cost_if_arceus: async () => {

  },

  damage_during_checkup: async () => {

  },

  reduce_damage_if_arceus: async () => {

  },

  peek_topdeck_either_player: async (s, pk) => {
    
    showPopup('Choose: Look at your deck or opponent\'s deck?');
    

    const choices = ['My Deck', 'Opponent Deck'];
    let chosenPlayer = null;
    

    chosenPlayer = await new Promise(resolve => {
      const choice1 = confirm('Look at YOUR deck? (OK = Your deck, Cancel = Opponent deck)');
      resolve(choice1 ? pk : oppPk(pk));
    });
    
    const deck = s[chosenPlayer]?.deck || [];
    if (deck.length === 0) {
      showPopup('Deck is empty!');
      return;
    }
    
    const topCard = deck[0];
    const deckOwner = chosenPlayer === pk ? 'Your' : 'Opponent\'s';
    showPopup(`${deckOwner} top card: ${topCard.name}`);
  },

  attach_energy_from_zone_to_type: async (s, pk, { param1, param2 }) => {

    const energyType = (param1 || 'grass').toLowerCase();
    const targetType = (param2 || 'grass').toLowerCase();
    

    const active = getActiveImg(pk);
    let sourceImg = null;
    

    const allPokemon = getAllPokemonImgs(pk);
    for (const img of allPokemon) {
      if ((img.alt || '').toLowerCase().includes('leafeon')) {
        sourceImg = img;
        break;
      }
    }
    
    if (!sourceImg || getActiveImg(pk) !== sourceImg) {
      showPopup('Leafeon ex must be in the Active Spot to use this ability.');
      return;
    }
    

    const targets = [];
    for (const img of getAllPokemonImgs(pk)) {
      try {
        const meta = await globalThis.fetchCardMeta(img.dataset.set, img.dataset.num);
        if (meta.types?.some(t => t.toLowerCase() === targetType)) {
          targets.push(img);
        }
      } catch {}
    }
    
    if (!targets.length) {
      showPopup(`No ${targetType}-type Pokemon in play.`);
      return;
    }
    

    if (typeof globalThis.zoomBackdrop !== 'undefined' && globalThis.zoomBackdrop.classList.contains('show')) {
      globalThis.zoomBackdrop.classList.remove('show');
      if (typeof globalThis.currentZoom !== 'undefined') {
        globalThis.currentZoom = { img: null, meta: null };
      }
    }
    
    showPopup(`Choose a ${targetType}-type Pokemon to attach ${energyType} Energy.`);
    const chosen = await awaitSelection(targets);
    
    if (chosen) {
      attachEnergy(chosen, energyType);
      showPopup(`Attached ${energyType} Energy to ${chosen.alt}!`);
    }
  },

  reduce_active_basic_retreat_cost: async () => {

  },

  immune_to_special_conditions: async () => {

  },

  zero_retreat_named: async () => {

  },

  attach_energy_end_turn: async (s, pk, { param1, param2 }) => {

    const energyType = (param1 || 'psychic').toLowerCase();
    const count = parseInt10(param2, 1);
    

    let targetImg = null;
    const allPokemon = getAllPokemonImgs(pk);
    for (const img of allPokemon) {
      if ((img.alt || '').toLowerCase().includes('giratina')) {
        targetImg = img;
        break;
      }
    }
    
    if (!targetImg) {
      showPopup('Could not find Giratina ex.');
      return;
    }
    

    for (let i = 0; i < count; i++) {
      attachEnergy(targetImg, energyType);
    }
    
    showPopup(`Attached ${count} ${energyType} Energy to Giratina ex. Turn ending...`);
    

    setTimeout(() => {
      const mainButton = document.getElementById('mainButton');
      if (mainButton && mainButton.textContent === 'End Turn') {
        mainButton.click();
      } else {
        showPopup('⚠️ Could not end turn automatically');
      }
    }, 800);
  },

  heal_active: async (s, pk, { param1 }) => {

    const amount = parseInt10(param1, 20);
    const active = getActiveImg(pk);
    
    if (!active) {
      showPopup('No Active Pokemon.');
      return;
    }
    
    const { base, cur } = getHpFromImg(active);
    if (cur >= base) {
      showPopup('Active Pokemon has no damage to heal.');
      return;
    }
    
    healImg(active, amount);
    showPopup(`Healed ${amount} damage from ${active.alt}!`);
  },

  zero_retreat_first_turn: async (s, pk, { param1 }, ctx) => {

    if (globalThis.turnNumber && globalThis.turnNumber <= 2) {
      return -999;
    }
    return 0;
  },

  prevent_damage_from_ex: async (s, pk, { param1 }, ctx) => {

    const attackerImg = ctx?.attackerImg;
    if (!attackerImg) return 0;
    
    const attackerName = (attackerImg.alt || '').toLowerCase();
    const isEx = attackerName.includes(' ex');
    
    if (isEx) {
      showPopup(`Safeguard: No damage from ${attackerImg.alt}!`);
      return -999;
    }
    return 0;
  },

  cure_and_prevent_status_with_energy: async (s, pk, { param1 }, ctx) => {
    const requiredType = (param1 || 'psychic').toLowerCase();
    

    
    const allPokemon = getAllPokemonImgs(pk);
    let protectedCount = 0;
    
    for (const img of allPokemon) {
      const slot = getSlotFromImg(img);
      const energyBox = slot?.querySelector('.energy-pips');
      if (!energyBox) {
        delete img.dataset.statusProtected;
        continue;
      }
      
      const pips = energyBox.querySelectorAll('.energy-pip');
      const hasType = Array.from(pips).some(p => p.dataset.type === requiredType);
      
      if (hasType) {

        if (img.dataset.status) {
          delete img.dataset.status;
          const marker = slot.querySelector('.status-marker');
          if (marker) marker.remove();
        }
        

        img.dataset.statusProtected = 'comfey';
        protectedCount++;
      } else {

        if (img.dataset.statusProtected === 'comfey') {
          delete img.dataset.statusProtected;
        }
      }
    }
    
    if (protectedCount > 0) {
    }
  },

  inflict_status_on_energy_attach: async (s, pk, { param1 }, ctx) => {
    const status = param1 || 'asleep';
    const abilityPokemon = ctx?.targetImg || ctx?.abilityPokemon;
    
    if (!abilityPokemon) return;
    

    const isActive = abilityPokemon.closest('.active');
    if (!isActive) return;
    

    if (globalThis.setStatus) {
      setTimeout(() => {
        globalThis.setStatus(abilityPokemon, status);
        showPopup(`Comatose: ${abilityPokemon.alt} is now ${status}!`);
      }, 100);
    }
  },

  heal_type_pokemon: async (s, pk, { param1, param2 }) => {
    const amount = parseInt10(param1, 30);
    const type = (param2 || 'water').toLowerCase();
    
    const allPokemon = getAllPokemonImgs(pk);
    let healed = 0;
    
    for (const img of allPokemon) {
      try {
        const meta = await globalThis.fetchCardMeta(img.dataset.set, img.dataset.num);
        if (meta.types?.some(t => t.toLowerCase() === type)) {
          if (healImg(img, amount)) healed++;
        }
      } catch {}
    }
    
    if (healed > 0) {
      showPopup(`Melodious Healing: Healed ${amount} from ${healed} ${type}-type Pokémon!`);
    } else {
      showPopup(`No damaged ${type}-type Pokémon to heal.`);
    }
  },

  move_all_energy_type: async (s, pk, { param1 }) => {
    const type = (param1 || 'psychic').toLowerCase();
    

    const benchImgs = getBenchImgs(pk);
    const eligible = [];
    
    for (const img of benchImgs) {
      const slot = getSlotFromImg(img);
      const energyBox = slot?.querySelector('.energy-pips');
      if (!energyBox) continue;
      
      const pips = energyBox.querySelectorAll('.energy-pip');
      const hasType = Array.from(pips).some(p => p.dataset.type === type);
      if (hasType) eligible.push(img);
    }
    
    if (!eligible.length) {
      showPopup(`No benched Pokémon with ${type} energy.`);
      return;
    }
    
    showPopup(`Psychic Connect: Choose a benched Pokémon to move ALL ${type} energy from.`);
    const chosen = await awaitSelection(eligible);
    if (!chosen) return;
    

    const activeImg = getActiveImg(pk);
    if (!activeImg) return;
    
    const srcSlot = getSlotFromImg(chosen);
    const srcBox = srcSlot?.querySelector('.energy-pips');
    if (!srcBox) return;
    
    const pips = Array.from(srcBox.querySelectorAll('.energy-pip'));
    const typePips = pips.filter(p => p.dataset.type === type);
    

    for (const pip of typePips) {
      pip.remove();
    }
    

    const destSlot = getSlotFromImg(activeImg);
    let destBox = destSlot?.querySelector('.energy-pips');
    if (!destBox) {
      destBox = document.createElement('div');
      destBox.className = 'energy-pips';
      destSlot.appendChild(destBox);
    }
    
    for (let i = 0; i < typePips.length; i++) {
      const pip = document.createElement('div');
      pip.className = 'energy-pip';
      pip.dataset.type = type;
      pip.style.backgroundImage = `url('${ENERGY_ICONS[type] || ''}')`;
      destBox.appendChild(pip);
    }
    
    showPopup(`Psychic Connect: Moved ${typePips.length} ${type} energy to ${activeImg.alt}!`);
  },

  switch_from_bench: async (s, pk, { param1 }, ctx) => {
    const abilityPokemon = ctx?.abilityPokemon;
    if (!abilityPokemon) return;
    

    const isBench = abilityPokemon.closest('.bench');
    if (!isBench) {
      showPopup('Rising Road can only be used from the Bench.');
      return;
    }
    

    const activeImg = getActiveImg(pk);
    if (!activeImg) {
      showPopup('No Active Pokémon to switch with.');
      return;
    }
    

    if (globalThis.forceSwitchSpecific) {
      globalThis.forceSwitchSpecific(s, pk, abilityPokemon);
      showPopup(`Rising Road: ${abilityPokemon.alt} switched to Active!`);
    }
  },

  counter_on_knockout: async (s, pk, { param1 }, ctx) => {

    const damage = parseInt10(param1, 50);
    const attacker = ctx?.attacker;
    
    if (attacker && globalThis.damageActiveOf) {
      showPopup(`Innards Out: ${damage} damage to attacker!`);
      setTimeout(async () => {
        const result = await globalThis.damageActiveOf(attacker, damage, { isDirectAttack: false });
        

        if (result.knocked && typeof globalThis.handleKnockOut === 'function') {
          const attackerImg = globalThis.getActiveImage(attacker);
          if (attackerImg) {
            const gameEnded = await globalThis.handleKnockOut(attacker, attackerImg, true);
            if (!gameEnded && typeof globalThis.beginPromotionFlow === 'function') {
              globalThis.beginPromotionFlow(attacker);
            }
          }
        }
      }, 500);
    }
  },

  flip_avoid_knockout: async (s, pk, { param1 }, ctx) => {

    
    const flip = await flipCoin(pk);
    
    if (flip === 'heads') {

      const img = ctx?.targetImg;
      if (img) {
        const { base } = getHpFromImg(img);
        setHpOnImg(img, base, 10);
        showPopup(`Guts: ${img.alt} survived with 10 HP!`);
        return { avoided: true };
      }
    } else {
      showPopup(`Guts: Coin flip was tails. ${ctx?.targetImg?.alt} was Knocked Out.`);
    }
    
    return { avoided: false };
  },

  move_energy_on_knockout: async (s, pk, { param1 }, ctx) => {

    const type = (param1 || 'fighting').toLowerCase();
    const knockedPokemon = ctx?.knockedPokemon;
    
    if (!knockedPokemon) return;
    

    const slot = getSlotFromImg(knockedPokemon);
    const energyBox = slot?.querySelector('.energy-pips');
    if (!energyBox) return;
    
    const pips = Array.from(energyBox.querySelectorAll('.energy-pip'));
    const typePips = pips.filter(p => p.dataset.type === type);
    
    if (!typePips.length) {
      return;
    }
    

    const benchImgs = getBenchImgs(pk);
    if (!benchImgs.length) {
      return;
    }
    
    showPopup(`Offload Pass: Choose a benched Pokémon to receive ${typePips.length} ${type} energy.`);
    const chosen = await awaitSelection(benchImgs);
    if (!chosen) return;
    

    for (const pip of typePips) {
      pip.remove();
    }
    
    const destSlot = getSlotFromImg(chosen);
    let destBox = destSlot?.querySelector('.energy-pips');
    if (!destBox) {
      destBox = document.createElement('div');
      destBox.className = 'energy-pips';
      destSlot.appendChild(destBox);
    }
    
    for (let i = 0; i < typePips.length; i++) {
      const pip = document.createElement('div');
      pip.className = 'energy-pip';
      pip.dataset.type = type;
      pip.style.backgroundImage = `url('${ENERGY_ICONS[type] || ''}')`;
      destBox.appendChild(pip);
    }
    
    showPopup(`Offload Pass: Moved ${typePips.length} ${type} energy to ${chosen.alt}!`);
  }


  
  

  ,  search_pokemon_random: async (state, pk) => {
    const deck = state[pk]?.deck || [];
    
    if (deck.length === 0) {
      showPopup('Your deck is empty.');
      return;
    }
    

    const pokemonCards = [];
    const metaPromises = deck.map(async (card) => {
      try {
        const meta = await globalThis.fetchCardMeta(card.set, card.number || card.num);
        return { card, meta };
      } catch (e) {
        return { card, meta: null };
      }
    });
    
    const results = await Promise.all(metaPromises);
    for (const { card, meta } of results) {
      if (meta && meta.category === 'Pokemon') {
        pokemonCards.push(card);
      }
    }
    
    if (pokemonCards.length === 0) {
      showPopup('No Pokémon in deck.');
      return;
    }
    

    const chosen = pokemonCards[Math.floor(Math.random() * pokemonCards.length)];
    

    const deckIndex = deck.findIndex(c => c.set === chosen.set && (c.number || c.num) === (chosen.number || chosen.num));
    if (deckIndex !== -1) {
      deck.splice(deckIndex, 1);
      

      state[pk].hand = state[pk].hand || [];
      state[pk].hand.push(chosen);
      

      shuffleDeckAndAnimate(state, pk);
      

      if (globalThis.renderAllHands) {
        globalThis.renderAllHands();
      }
      if (globalThis.updateDeckBubbles) {
        globalThis.updateDeckBubbles();
      }
      
      showPopup(`Illuminate: Found ${chosen.name}!`);
      if (globalThis.logEvent) {
        const owner = pk === 'p1' ? 'player1' : 'player2';
        globalThis.logEvent({
          player: owner,
          text: `Found ${chosen.name} from deck search`,
          cardSet: chosen.set,
          cardNum: chosen.number || chosen.num
        });
      }
    }
  }
  

  ,switch_ultra_beast: async (state, pk) => {
    const ULTRA_BEASTS = [
      'nihilego', 'buzzwole', 'pheromosa', 'xurkitree', 'celesteela',
      'kartana', 'guzzlord', 'poipole', 'naganadel', 'stakataka', 'blacephalon'
    ];
    
    const activeImg = getActiveImg(pk);
    if (!activeImg) {
      showPopup('No active Pokémon.');
      return;
    }
    

    const activeName = (activeImg.alt || '').toLowerCase();
    const isActiveUB = ULTRA_BEASTS.some(ub => activeName.includes(ub));
    
    if (!isActiveUB) {
      showPopup('Active Pokémon is not an Ultra Beast.');
      return;
    }
    

    const benchImgs = getBenchImgs(pk);
    const benchedUBs = benchImgs.filter(img => {
      const name = (img.alt || '').toLowerCase();
      return ULTRA_BEASTS.some(ub => name.includes(ub));
    });
    
    if (benchedUBs.length === 0) {
      showPopup('No benched Ultra Beasts.');
      return;
    }
    
    showPopup('Ultra Thrusters: Choose a benched Ultra Beast to switch with.');
    const chosen = await awaitSelection(benchedUBs);
    
    if (!chosen) return;
    

    try {
      const owner = pk === 'p1' ? 'player1' : 'player2';
      const activeDiv = globalThis.activeFor(owner);
      const activeSlot = activeDiv?.querySelector('.card-slot');
      const benchSlot = chosen.closest('.card-slot');
      
      if (!activeSlot || !benchSlot) {
        showPopup('Error: Could not find slots');
        console.error('[Ultra Thrusters] Missing slots:', { activeSlot, benchSlot });
        return;
      }
      

      const activeInstanceId = activeImg.dataset.instanceId;
      if (activeInstanceId && globalThis.__moveLocks?.[pk]?.[activeInstanceId]) {
        delete globalThis.__moveLocks[pk][activeInstanceId];
      }
      

      const activePack = globalThis.detachAttachments(activeSlot);
      const benchPack = globalThis.detachAttachments(benchSlot);
      

      activeSlot.removeChild(activeImg);
      benchSlot.removeChild(chosen);
      
      activeSlot.appendChild(chosen);
      benchSlot.appendChild(activeImg);
      

      globalThis.attachAttachments(activeSlot, benchPack);
      globalThis.attachAttachments(benchSlot, activePack);
      

      if (typeof globalThis.markSlot === 'function') {
        globalThis.markSlot(activeSlot, true);
        globalThis.markSlot(benchSlot, true);
      }
      
      showPopup(`Ultra Thrusters: Switched ${activeName} with ${chosen.alt}!`);
      

      if (typeof globalThis.updatePlayerTypeBackground === 'function') {
        const playerNum = activeDiv === globalThis.p1Active ? 1 : 2;
        globalThis.updatePlayerTypeBackground(playerNum);
      }
    } catch (err) {
      console.error('[Ultra Thrusters] Swap failed:', err);
      showPopup('Switch failed. Please try again.');
    }
  }
  

  ,deal_damage_any: async (state, pk, { param1 }) => {
    const damage = parseInt10(param1, 20);
    const oppPkKey = oppPk(pk);
    

    const oppPokemon = getAllPokemonImgs(oppPkKey);
    
    if (oppPokemon.length === 0) {
      showPopup('No opponent Pokémon to damage.');
      return;
    }
    
    showPopup(`Water Shuriken: Choose an opponent's Pokémon to damage.`);
    const target = await awaitSelection(oppPokemon);
    
    if (!target) return;
    

    if (typeof damageImg === 'function') {
      const result = await damageImg(target, damage);
      showPopup(`Water Shuriken: Dealt ${damage} damage to ${target.alt}!`);
      return result;
    }
  }
  

  ,force_opponent_switch: async (state, pk) => {
    const oppPk = oppPk(pk);
    

    const oppBench = getBenchImgs(oppPk);
    if (oppBench.length === 0) {
      showPopup('Opponent has no benched Pokémon to switch to.');
      return;
    }
    
    showPopup('Drive Off: Opponent must choose a new Active Pokémon.');
    

    if (typeof beginPromotionFlow === 'function') {
      const oppOwner = oppPk === 'p1' ? 'player1' : 'player2';
      await beginPromotionFlow(oppOwner);
    }
  }
  

  ,attach_from_discard_self_damage: async (state, pk, { param1, param2 }) => {
    const energyType = (param1 || 'fire').toLowerCase();
    const selfDamage = parseInt10(param2, 20);
    
    const abilityPokemon = getActiveImg(pk);
    if (!abilityPokemon) {
      showPopup('No active Pokémon.');
      return;
    }
    

    const owner = pk === 'p1' ? 'player1' : 'player2';
    const energyCounts = state[pk]?.discard?.energyCounts || {};
    
    if (!energyCounts[energyType] || energyCounts[energyType] <= 0) {
      showPopup(`No ${energyType} Energy in discard pile.`);
      return;
    }
    

    if (typeof attachEnergy === 'function') {
      attachEnergy(abilityPokemon, energyType);
      energyCounts[energyType]--;
      

      if (typeof damageImg === 'function') {
        await damageImg(abilityPokemon, selfDamage);
      }
      
      showPopup(`Combust: Attached ${energyType} Energy and took ${selfDamage} damage.`);
      

      if (typeof renderDiscard === 'function') {
        renderDiscard(owner);
      }
    }
  }
  

  ,search_tool_random: async (state, pk) => {
    const deck = state[pk]?.deck || [];
    
    if (deck.length === 0) {
      showPopup('Your deck is empty.');
      return;
    }
    

    const toolCards = [];
    for (const card of deck) {
      try {
        const meta = await globalThis.fetchCardMeta(card.set, card.number || card.num);
        if (meta.category === 'Trainer' && meta.trainerType === 'Tool') {
          toolCards.push(card);
        }
      } catch (e) {

      }
    }
    
    if (toolCards.length === 0) {
      showPopup('No Tool cards in deck.');
      return;
    }
    

    const chosen = toolCards[Math.floor(Math.random() * toolCards.length)];
    

    const deckIndex = deck.findIndex(c => c.set === chosen.set && (c.number || c.num) === (chosen.number || chosen.num));
    if (deckIndex !== -1) {
      deck.splice(deckIndex, 1);
      

      state[pk].hand = state[pk].hand || [];
      state[pk].hand.push(chosen);
      

      shuffleDeckAndAnimate(state, pk);
      

      if (globalThis.renderAllHands) {
        globalThis.renderAllHands();
      }
      if (globalThis.updateDeckBubbles) {
        globalThis.updateDeckBubbles();
      }
      
      showPopup(`Catching Tail: Found ${chosen.name}!`);
    }
  }
  

  ,attach_energy_from_zone_to_active: async (state, pk, { param1, param2 }) => {
    const energyType = (param1 || 'psychic').toLowerCase();
    const count = parseInt10(param2, 1);
    
    const activeImg = getActiveImg(pk);
    if (!activeImg) {
      showPopup('No active Pokémon.');
      return;
    }
    

    try {
      const meta = await globalThis.fetchCardMeta(activeImg.dataset.set, activeImg.dataset.num);
      const types = meta.types || [];
      const hasCorrectType = types.some(t => t.toLowerCase() === energyType);
      
      if (!hasCorrectType) {
        showPopup(`Active Pokémon is not ${energyType} type.`);
        return;
      }
    } catch (e) {
    }
    

    for (let i = 0; i < count; i++) {
      if (typeof attachEnergy === 'function') {
        attachEnergy(activeImg, energyType);
      }
    }
    
    showPopup(`Psy Shadow: Attached ${count} ${energyType} Energy!`);
  }
  
  
  

  ,reduce_opponent_damage: async (state, pk, { param1 }) => {

  }
  

  
  ,attach_energy_end_of_first_turn: async (state, pk, { param1 }, context = {}) => {
    const energyType = (param1 || 'lightning').toLowerCase();
    const abilityPokemon = context.abilityPokemon;
    
    if (!abilityPokemon) {
      return;
    }
    

    
    if (globalThis.turnNumber !== 1 && globalThis.turnNumber !== 2) {
      return;
    }
    
    

    const playerData = state?.[pk];
    if (!playerData || !playerData.energyTypes) {
      showPopup(`Thunderclap Flash: Error accessing Energy Zone!`);
      return;
    }
    

    const energyTypes = playerData.energyTypes;
    const hasEnergyType = energyTypes.some(e => e.toLowerCase() === energyType);
    
    if (!hasEnergyType) {
      showPopup(`Thunderclap Flash: No ${energyType} Energy in Energy Zone!`);
      return;
    }
    
    
    

    if (!abilityPokemon || !abilityPokemon.parentElement) {
      console.error('[Thunderclap Flash] abilityPokemon is not in DOM!');
      showPopup(`Thunderclap Flash: Error - Pokemon not found!`);
      return;
    }
    
    const slot = abilityPokemon.closest('.card-slot');
    
    if (typeof attachEnergy === 'function') {
      try {
      attachEnergy(abilityPokemon, energyType);

        const energyBox = slot?.querySelector('.energy-pips');
        const energyPips = energyBox?.querySelectorAll('.energy-pip');
        const hasEnergy = Array.from(energyPips || []).some(pip => pip.dataset.type === energyType);
        
        if (hasEnergy) {
      showPopup(`Thunderclap Flash: Attached ${energyType} Energy!`);
        } else {

          const owner = pk === 'p1' ? 'player1' : 'player2';
          if (slot && typeof globalThis.attachEnergyToSlot === 'function') {
            globalThis.attachEnergyToSlot(owner, slot, energyType);
            showPopup(`Thunderclap Flash: Attached ${energyType} Energy!`);
          }
        }
      } catch (err) {
        console.error('[Thunderclap Flash] Error calling attachEnergy:', err);

        const owner = pk === 'p1' ? 'player1' : 'player2';
        if (slot && typeof globalThis.attachEnergyToSlot === 'function') {
          try {
            globalThis.attachEnergyToSlot(owner, slot, energyType);
            showPopup(`Thunderclap Flash: Attached ${energyType} Energy!`);
          } catch (fallbackErr) {
            console.error('[Thunderclap Flash] Error with attachEnergyToSlot fallback:', fallbackErr);
            showPopup(`Thunderclap Flash: Error attaching energy!`);
          }
        } else {
          showPopup(`Thunderclap Flash: Error attaching energy!`);
        }
      }
    } else {
      console.error('[Thunderclap Flash] attachEnergy function is not available');

      const owner = pk === 'p1' ? 'player1' : 'player2';
      if (slot && typeof globalThis.attachEnergyToSlot === 'function') {
        try {
          globalThis.attachEnergyToSlot(owner, slot, energyType);
          showPopup(`Thunderclap Flash: Attached ${energyType} Energy!`);
        } catch (err) {
          console.error('[Thunderclap Flash] Error with attachEnergyToSlot fallback:', err);
        }
      } else {
        console.error('[Thunderclap Flash] No fallback available - slot:', !!slot, 'attachEnergyToSlot:', typeof globalThis.attachEnergyToSlot);
      }
    }
  }

  ,prevent_all_healing: async () => {

  }
  

  ,increase_poison_damage: async (state, pk, { param1 }) => {

  }
  
  
  

  ,increase_opponent_cost: async (state, pk, { param1 }) => {

  }
  

  ,block_evolution: async (state, pk, { param1 }) => {

  }
  

  ,draw_on_evolution: async (state, pk, { param1 }, context = {}) => {
    // Use globalThis.drawCards which handles all state syncing and Firebase
    const count = parseInt10(param1, 2);
    if (globalThis.drawCards) {
      await globalThis.drawCards(state, pk, count);
      showPopup(`Happy Ribbon: Drew ${count} card(s)!`);
      return;
    }
    
    // Fallback if drawCards is not available
    const deck = state[pk]?.deck || [];
    
    if (deck.length === 0) {
      showPopup('Deck is empty.');
      return;
    }
    

    const drawn = [];
    for (let i = 0; i < count && deck.length > 0; i++) {
      const card = deck.shift();
      drawn.push(card);
    }
    
    if (drawn.length > 0) {

      state[pk].hand = state[pk].hand || [];
      state[pk].hand.push(...drawn);
      
      // Update globalThis.playerState
      const owner = pk === 'p1' ? 'player1' : 'player2';
      if (globalThis.playerState && globalThis.playerState[owner]) {
        globalThis.playerState[owner].deck = [...deck];
        globalThis.playerState[owner].hand = [...state[pk].hand];
      }
      
      // Update local playerState if it exists
      if (typeof playerState !== 'undefined' && playerState && playerState[owner]) {
        playerState[owner].deck = [...deck];
        playerState[owner].hand = [...state[pk].hand];
      }
      
      // Sync to Firebase if in online mode
      if (typeof globalThis.updateGameStatePartial === 'function') {
        const getCurrentMatchIdFn = globalThis.getCurrentMatchId;
        const matchId = getCurrentMatchIdFn ? getCurrentMatchIdFn() : null;
        const isOnline = matchId && typeof window !== 'undefined' && window.firebaseDatabase;
        if (isOnline) {
          const isCurrentPlayer1Fn = globalThis.isCurrentPlayer1;
          const isP1 = (isCurrentPlayer1Fn && typeof isCurrentPlayer1Fn === 'function') ? isCurrentPlayer1Fn() : false;
          const matchPlayer = (isP1 && owner === 'player1') || (!isP1 && owner === 'player2') 
            ? 'player1' 
            : 'player2';
          try {
            await globalThis.updateGameStatePartial({
              [`${matchPlayer}/hand`]: globalThis.playerState[owner].hand,
              [`${matchPlayer}/deck`]: globalThis.playerState[owner].deck
            });
          } catch (error) {
            console.error('[draw_on_evolution] Error syncing to Firebase:', error);
          }
        }
      }
      
      showPopup(`Happy Ribbon: Drew ${drawn.length} card(s)!`);
      

      if (typeof globalThis.renderAllHands === 'function') {
        globalThis.renderAllHands();
      } else if (typeof renderAllHands === 'function') {
        renderAllHands();
      }
      
      if (typeof globalThis.updateDeckBubbles === 'function') {
        globalThis.updateDeckBubbles();
      } else if (typeof updateDeckBubbles === 'function') {
        updateDeckBubbles();
      }
    }
  }
  

  ,eevee_evolution_rule: async () => {

  }
  

  ,heal_active_end_of_turn: async (state, pk, { param1 }, context = {}) => {
    const healAmount = parseInt10(param1, 20);
    const abilityPokemon = context.abilityPokemon;
    
    if (!abilityPokemon) {
      return;
    }
    

    const activeImg = getActiveImg(pk);
    if (activeImg !== abilityPokemon) {
      return;
    }
    

    const maxHp = parseInt(abilityPokemon.dataset.hp, 10);
    const currentHp = parseInt(abilityPokemon.dataset.chp, 10);
    
    if (currentHp >= maxHp) {
      return;
    }
    

    if (typeof healImg === 'function') {
      healImg(abilityPokemon, healAmount);
      showPopup(`Full-Mouth Manner: Healed ${healAmount} damage!`);
    }
  },



  move_all_energy_type_to_self: async (s, pk, { param1, param2 }, ctx) => {
    const energyType = (param1 || 'dark').toLowerCase();
    const sourceImg = ctx?.sourceImg || ctx?.abilityPokemon || getActiveImg(pk);
    
    if (!sourceImg) {
      showPopup('Could not identify which Pokemon to move energy to.');
      return;
    }
    

    const allPokemon = getAllPokemonImgs(pk).filter(img => img !== sourceImg);
    const sourceSlot = getSlotFromImg(sourceImg);
    let targetEnergyBox = sourceSlot?.querySelector('.energy-pips');
    
    if (!targetEnergyBox) {
      targetEnergyBox = document.createElement('div');
      targetEnergyBox.className = 'energy-pips';
      sourceSlot.appendChild(targetEnergyBox);
    }
    
    let totalMoved = 0;
    

    for (const img of allPokemon) {
      const slot = getSlotFromImg(img);
      const energyBox = slot?.querySelector('.energy-pips');
      if (!energyBox) continue;
      
      const pips = Array.from(energyBox.querySelectorAll('.energy-pip'));
      const typePips = pips.filter(p => p.dataset.type === energyType);
      
      for (const pip of typePips) {
        pip.remove();
        const newPip = document.createElement('div');
        newPip.className = 'energy-pip';
        newPip.dataset.type = energyType;
        newPip.style.backgroundImage = `url('${ENERGY_ICONS[energyType] || ''}')`;
        targetEnergyBox.appendChild(newPip);
        totalMoved++;
      }
    }
    
    if (totalMoved > 0) {
      showPopup(`Energy Plunder: Moved ${totalMoved} ${energyType} Energy to ${sourceImg.alt}!`);
    } else {
      showPopup(`No ${energyType} Energy to move.`);
    }
  },
  

  boost_damage: async (s, pk, { param1, param2 }, ctx) => {

    const boost = parseInt10(param1, 20);
    const target = (param2 || 'active').toLowerCase();
    
    if (!globalThis.state) globalThis.state = {};
    if (!globalThis.state.damageBoost) globalThis.state.damageBoost = {};
    if (!globalThis.state.damageBoost[pk]) globalThis.state.damageBoost[pk] = {};
    
    if (target === 'active') {
      const activeImg = getActiveImg(pk);
      const instanceId = activeImg?.dataset.instanceId;
      if (instanceId) {
        globalThis.state.damageBoost[pk][instanceId] = {
          amount: boost,
          duration: 'ongoing'
        };
        showPopup(`Lordly Cheering: Active Pokémon's attacks do +${boost} damage!`);
      }
    } else if (target === 'bench') {

      const benchImgs = getBenchImgs(pk);
      for (const img of benchImgs) {
        const instanceId = img.dataset.instanceId;
        if (instanceId) {
          globalThis.state.damageBoost[pk][instanceId] = {
            amount: boost,
            duration: 'ongoing'
          };
        }
      }
      showPopup(`Lordly Cheering: Benched Pokémon's attacks do +${boost} damage!`);
    }
  },
  

  heal: async (s, pk, { param1 }, ctx) => {
    const amount = parseInt10(param1, 30);
    const sourceImg = ctx?.sourceImg || ctx?.abilityPokemon || getActiveImg(pk);
    
    if (!sourceImg) {
      showPopup('Could not identify which Pokemon to heal.');
      return;
    }
    

    const activeImg = getActiveImg(pk);
    if (sourceImg !== activeImg) {
      showPopup('This ability can only be used when in the Active Spot.');
      return;
    }
    

    const allPokemon = getAllPokemonImgs(pk);
    const healablePokemon = [];
    
    for (const img of allPokemon) {
      const { base, cur } = getHpFromImg(img);

      const slot = img.closest('.card-slot');
      const modifiedMaxHp = slot?.dataset.maxHp ? parseInt10(slot.dataset.maxHp) : null;
      const maxHp = modifiedMaxHp || base;
      
      if (cur < maxHp) {
        healablePokemon.push(img);
      }
    }
    
    if (healablePokemon.length === 0) {
      showPopup('No damaged Pokémon to heal.');
      return;
    }
    

    showPopup(`Choose a Pokémon to heal ${amount} damage.`);
    const chosen = await awaitSelection(healablePokemon);
    
    if (chosen && healImg(chosen, amount)) {
      showPopup(`Psychic Healing: Healed ${amount} damage from ${chosen.alt}!`);
    } else if (chosen) {
      showPopup('No damage to heal on that Pokémon.');
    }
  },
  

  prevent_status: async (s, pk, { param1 }, ctx) => {

    const status = (param1 || 'sleep').toLowerCase();
    const sourceImg = ctx?.sourceImg || ctx?.abilityPokemon || getActiveImg(pk);
    
    if (!sourceImg) return;
    

    if (!sourceImg.dataset.statusProtected) {
      sourceImg.dataset.statusProtected = status;
    }
  },
  

  auto_evolve_on_energy_attach: async (s, pk, { param1 }, ctx) => {

    const sourceImg = ctx?.sourceImg || ctx?.abilityPokemon;
    
    if (!sourceImg) return;
    

    const deck = s[pk]?.deck || [];
    const pokemonCards = [];
    
    for (const card of deck) {
      try {
        const meta = await globalThis.fetchCardMeta(card.set, card.number || card.num);
        if (meta.category === 'Pokemon' && meta.evolvesFrom) {
          const evolvesFrom = meta.evolvesFrom.toLowerCase();
          const currentName = (sourceImg.alt || '').toLowerCase();
          if (evolvesFrom === currentName || currentName.includes(evolvesFrom)) {
            pokemonCards.push(card);
          }
        }
      } catch {}
    }
    
    if (pokemonCards.length === 0) {
      return;
    }
    

    const chosen = param1 === 'random' 
      ? pokemonCards[Math.floor(Math.random() * pokemonCards.length)]
      : pokemonCards.find(c => (c.name || '').toLowerCase().includes((param1 || '').toLowerCase())) || pokemonCards[0];
    
    if (chosen) {

      const index = deck.findIndex(c => c.set === chosen.set && (c.number || c.num) === (chosen.number || chosen.num));
      if (index !== -1) deck.splice(index, 1);
      

      if (globalThis.evolvePokemon) {
        globalThis.evolvePokemon(sourceImg, chosen);
        showPopup(`Buggy Evolution: Evolved into ${chosen.name}!`);
      }
    }
  },
  

  discard_energy_on_evolution: async (s, pk, { param1 }, ctx) => {

    const sourceImg = ctx?.sourceImg || ctx?.abilityPokemon;
    
    if (!sourceImg) return;
    
    const count = parseInt10(param1, 1);
    const removed = await removeEnergy(sourceImg, null, count);
    
    if (removed > 0) {
      showPopup(`Unruly Claw: Discarded ${removed} Energy on evolution!`);
    }
  },
  

  flip_prevent_damage: async (s, pk, { param1 }, ctx) => {

    const sourceImg = ctx?.sourceImg || ctx?.abilityPokemon || getActiveImg(pk);
    if (sourceImg) {
      sourceImg.dataset.flipPreventDamage = 'true';
    }
  },
  

  reduce_all_damage: async (s, pk, { param1 }, ctx) => {

    const reduction = parseInt10(param1, 20);
    const sourceImg = ctx?.sourceImg || ctx?.abilityPokemon || getActiveImg(pk);
    
    if (!sourceImg) return;
    

    sourceImg.dataset.damageReduction = String(reduction);
  },
  

  reduce_energy_cost: async (s, pk, { param1 }, ctx) => {

    const reduction = parseInt10(param1, 1);
    const sourceImg = ctx?.sourceImg || ctx?.abilityPokemon || getActiveImg(pk);
    
    if (!sourceImg) return;
    

    sourceImg.dataset.energyCostReduction = String(reduction);
  },
  

  remove_retreat_cost: async (s, pk, { param1 }, ctx) => {

    const sourceImg = ctx?.sourceImg || ctx?.abilityPokemon || getActiveImg(pk);
    
    if (!sourceImg) return;
    

    sourceImg.dataset.noRetreatCost = 'true';
  },
  

  draw_card_end_of_turn: async (s, pk, p, context = {}) => {

    const abilityPokemon = context?.abilityPokemon || getActiveImg(pk);
    

    const currentActive = getActiveImg(pk);
    if (abilityPokemon !== currentActive) {
      return;
    }
    

    // Use globalThis.drawCards which handles all state syncing and Firebase
      if (globalThis.drawCards) {
        await globalThis.drawCards(s, pk, 1);
        showPopup('Legendary Pulse: Drew 1 card.');
        return;
      }
    
    // Fallback if drawCards is not available
    const ownerKey = pk === 'p1' ? 'p1' : 'p2';
    const owner = pk === 'p1' ? 'player1' : 'player2';
    const ownerState = s?.[ownerKey];
    
    if (!ownerState || !ownerState.deck) {
      showPopup('Legendary Pulse: Unable to draw card.');
      return;
    }
    
    if (ownerState.deck.length > 0) {
      const drawnCard = ownerState.deck.shift();
      if (!ownerState.hand) ownerState.hand = [];
      ownerState.hand.push(drawnCard);
      
      // Update globalThis.playerState
      if (globalThis.playerState && globalThis.playerState[owner]) {
        globalThis.playerState[owner].deck = [...ownerState.deck];
        globalThis.playerState[owner].hand = [...ownerState.hand];
      }
      
      // Update local playerState if it exists
      if (typeof playerState !== 'undefined' && playerState && playerState[owner]) {
        playerState[owner].deck = [...ownerState.deck];
        playerState[owner].hand = [...ownerState.hand];
      }
      
      // Sync to Firebase if in online mode
      const getCurrentMatchIdFn = globalThis.getCurrentMatchId;
      const matchId = getCurrentMatchIdFn ? getCurrentMatchIdFn() : null;
      const isOnline = matchId && typeof window !== 'undefined' && window.firebaseDatabase;
      if (isOnline && typeof globalThis.updateGameStatePartial === 'function') {
        const isCurrentPlayer1Fn = globalThis.isCurrentPlayer1;
        const isP1 = (isCurrentPlayer1Fn && typeof isCurrentPlayer1Fn === 'function') ? isCurrentPlayer1Fn() : false;
        const matchOwner = (isP1 && owner === 'player1') || (!isP1 && owner === 'player2') 
          ? 'player1' 
          : 'player2';
        
        try {
          await globalThis.updateGameStatePartial({
            [`${matchOwner}/deck`]: globalThis.playerState[owner].deck,
            [`${matchOwner}/hand`]: globalThis.playerState[owner].hand
          });
        } catch (error) {
          console.error('[draw_card_end_of_turn] Error syncing to Firebase:', error);
        }
      }
      
      if (globalThis.updateDeckBubbles) globalThis.updateDeckBubbles();
      if (globalThis.renderAllHands) globalThis.renderAllHands();
      
      showPopup('Legendary Pulse: Drew 1 card.');
      if (globalThis.logEvent) {
        globalThis.logEvent({
          player: owner,
          text: `Drew ${drawnCard.name} (Legendary Pulse)`,
          cardSet: drawnCard.set,
          cardNum: drawnCard.number || drawnCard.num
        });
      }
    } else {
      showPopup('Legendary Pulse: No cards in deck.');
    }
  },

  flip_ko_attacker_on_ko: async (s, pk, p, context = {}) => {

    const img = getActiveImg(pk);
    if (img) {
      img.dataset.flipKoAttackerOnKo = 'true';
    }
  },

  prevent_damage_and_effects_next_turn: async (s, pk, p, context = {}) => {

    const img = getActiveImg(pk);
    if (img) {
      img.dataset.preventDamageAndEffectsNextTurn = 'true';
    }
  },

  attach_energy_to_bench_on_hit: async (s, pk, { param1, param2 }, ctx) => {

    const energyType = (param1 || 'water').toLowerCase();
    const count = parseInt10(param2, 1);
    const abilityPokemon = ctx?.abilityPokemon || getActiveImg(pk);
    
    if (!abilityPokemon) return;
    
    const benchImgs = getBenchImgs(pk);
    if (benchImgs.length === 0) {
      showPopup('No benched Pokémon to attach energy to.');
      return;
    }
    
    showPopup(`Bouncy Body: Choose a benched Pokémon to attach ${count} ${energyType} Energy.`);
    const chosen = await awaitSelection(benchImgs);
    
    if (chosen) {
      for (let i = 0; i < count; i++) {
        attachEnergy(chosen, energyType);
      }
      showPopup(`Attached ${count} ${energyType} Energy to ${chosen.alt}!`);
    }
  },

  attach_energy_from_zone_self_damage: async (s, pk, { param1, param2 }, ctx) => {
    const energyType = (param1 || 'darkness').toLowerCase();

    const abilityRow = ctx?.abilityRow;
    const abilityText = (abilityRow?.effect_text || abilityRow?.text || ctx?.abilityText || '').toLowerCase();
    

    let count = 2;
    const countMatch = abilityText.match(/take\s+(\d+)\s+/i) || abilityText.match(/(\d+)\s+energy/i);
    if (countMatch) {
      count = parseInt10(countMatch[1], 2);
    }
    

    const selfDamage = parseInt10(param2 || ctx?.selfDamage || 30, 30);
    const abilityPokemon = ctx?.sourceImg || ctx?.abilityPokemon || getActiveImg(pk);
    
    if (!abilityPokemon) {
      showPopup('Could not identify which Pokemon to attach energy to.');
      return;
    }
    

    for (let i = 0; i < count; i++) {
      attachEnergy(abilityPokemon, energyType);
    }
    

    if (selfDamage > 0) {
      damageImg(abilityPokemon, selfDamage);
    }
    
    showPopup(`Roar in Unison: Attached ${count} ${energyType} Energy, took ${selfDamage} damage!`);
  },

  counter_inflict_status: async (s, pk, { param1 }, ctx) => {

    const status = (param1 || 'poisoned').toLowerCase();
    const attacker = ctx?.attacker || getActiveImg(oppPk(pk));
    
    if (attacker) {
      applyStatus(oppPk(pk), status);
      showPopup(`Poison Point: ${attacker.alt} is now ${status}!`);
    }
  },

  counter_on_ko: async (s, pk, { param1 }, ctx) => {
    return ABILITY_HANDLERS.counter_on_knockout(s, pk, { param1 }, ctx);
  },

  discard_tools_opponent_self: async (s, pk, { param1, param2 }, ctx) => {
    const abilityPokemon = ctx?.sourceImg || ctx?.abilityPokemon;
    if (!abilityPokemon) return;
    

    const isBench = abilityPokemon.closest('.bench');
    if (!isBench) {
      showPopup('This ability can only be used from the Bench.');
      return;
    }
    

    const oppActive = getActiveImg(oppPk(pk));
    if (!oppActive) {
      showPopup('No opponent Active Pokémon.');
      return;
    }
    

    const oppSlot = getSlotFromImg(oppActive);
    const tools = oppSlot?.querySelectorAll('.tool-attachment') || [];
    let discarded = 0;
    
    for (const tool of tools) {
      tool.remove();
      discarded++;
    }
    
    if (discarded > 0) {

      const owner = pk === 'p1' ? 'player1' : 'player2';
      if (globalThis.pushCardToDiscard) {
        globalThis.pushCardToDiscard(owner, abilityPokemon);
      }
      const slot = getSlotFromImg(abilityPokemon);
      if (slot) slot.remove();
      
      showPopup(`Dismantling Keys: Discarded ${discarded} tool(s) and this Pokémon!`);
    } else {
      showPopup('No tools to discard.');
    }
  },

  discard_top_opponent_deck: async (s, pk, { param1 }, ctx) => {
    const count = parseInt10(param1, 1);
    const opp = oppPk(pk);
    const oppOwner = opp === 'p1' ? 'player1' : 'player2';
    const deck = s[opp]?.deck || [];
    
    if (deck.length === 0) {
      showPopup('Opponent deck is empty.');
      return;
    }
    
    const discarded = deck.splice(0, count);
    

    for (const card of discarded) {

      let cardName = card.name;
      let cardSrc = card.src;
      try {
        const meta = await globalThis.fetchCardMeta(card.set, card.number || card.num);
        if (!cardName) cardName = meta.name || 'Unknown';
        if (!cardSrc) {
          const padded = String(card.number || card.num).padStart(3, '0');
          cardSrc = `https://assets.tcgdex.net/en/tcgp/${card.set}/${padded}/high.png`;
        }
      } catch (e) {
        console.error('[Slow Sear] Error fetching meta for discarded card:', e);
        if (!cardName) cardName = 'Unknown';
        if (!cardSrc) {
          const padded = String(card.number || card.num).padStart(3, '0');
          cardSrc = `https://assets.tcgdex.net/en/tcgp/${card.set}/${padded}/high.png`;
        }
      }
      

      const discardCard = {
        set: card.set,
        num: card.number || card.num,
        number: card.number || card.num,
        name: cardName,
        src: cardSrc
      };
      

      if (s[opp]) {
        if (!s[opp].discard) s[opp].discard = { cards: [] };
        if (!s[opp].discard.cards) s[opp].discard.cards = [];
        s[opp].discard.cards.push(discardCard);
      }
      
      if (globalThis.playerState?.[oppOwner]) {
        if (!globalThis.playerState[oppOwner].discard) {
          globalThis.playerState[oppOwner].discard = { cards: [], energyCounts: {} };
        }
        if (!globalThis.playerState[oppOwner].discard.cards) {
          globalThis.playerState[oppOwner].discard.cards = [];
        }
        globalThis.playerState[oppOwner].discard.cards.push(discardCard);
      }
    }
    

    if (globalThis.renderDiscard) {
      globalThis.renderDiscard(oppOwner);
    }
    if (globalThis.updateDeckBubbles) {
      globalThis.updateDeckBubbles();
    }
    
    showPopup(`Slow Sear: Discarded ${discarded.length} card(s) from opponent's deck!`);
  },

  flip_force_switch_opponent_basic: async (s, pk) => {
    if ((await flipCoin(pk)) === 'heads') {
      return ABILITY_HANDLERS.force_switch_opponent_basic(s, pk);
    } else {
      showPopup('TAILS → No effect.');
    }
  },

  flip_ko_attacker_on_ko: async (s, pk, p, ctx) => {

    const img = getActiveImg(pk);
    if (img) {
      img.dataset.flipKoAttackerOnKo = 'true';
    }
  },

  flip_no_points_on_ko: async (s, pk, p, ctx) => {

    const img = getActiveImg(pk);
    if (img) {
      img.dataset.flipNoPointsOnKo = 'true';
    }
  },

  increase_max_hp_type: async (s, pk, { param1, param2 }, ctx) => {
    const amount = parseInt10(param1, 20);
    const type = (param2 || 'grass').toLowerCase();
    

    const allPokemon = getAllPokemonImgs(pk);
    let updated = 0;
    
    for (const img of allPokemon) {
      try {
        const meta = await globalThis.fetchCardMeta(img.dataset.set, img.dataset.num);
        if (meta.types?.some(t => t.toLowerCase() === type)) {
          const slot = getSlotFromImg(img);
          if (slot) {
            const baseHp = parseInt10(img.dataset.hp);
            const newMaxHp = baseHp + amount;
            slot.dataset.maxHp = String(newMaxHp);
            

            const { cur } = getHpFromImg(img);
            setHpOnImg(img, baseHp, cur);
            updated++;
          }
        }
      } catch {}
    }
    
    if (updated > 0) {
      showPopup(`Toughness Aroma: ${updated} ${type}-type Pokémon got +${amount} HP!`);
    }
  },

  increase_opponent_cost: async (s, pk, { param1 }, ctx) => {

    const amount = parseInt10(param1, 1);
    if (!globalThis.state) globalThis.state = {};
    if (!globalThis.state.opponentCostIncrease) globalThis.state.opponentCostIncrease = {};
    globalThis.state.opponentCostIncrease[pk] = amount;
  },

  inflict_status_on_energy_attach: async (s, pk, { param1 }, ctx) => {
    const status = (param1 || 'asleep').toLowerCase();
    const abilityPokemon = ctx?.targetImg || ctx?.abilityPokemon;
    
    if (!abilityPokemon) return;
    

    const isActive = abilityPokemon.closest('.active');
    if (!isActive) return;
    

    if (globalThis.setStatus) {
      setTimeout(() => {
        globalThis.setStatus(abilityPokemon, status);
        showPopup(`Comatose: ${abilityPokemon.alt} is now ${status}!`);
      }, 100);
    }
  },

  move_all_energy_type: async (s, pk, { param1 }, ctx) => {
    const type = (param1 || 'psychic').toLowerCase();
    const abilityPokemon = ctx?.sourceImg || ctx?.abilityPokemon || getActiveImg(pk);
    
    if (!abilityPokemon) {
      showPopup('Could not identify which Pokemon to move energy to.');
      return;
    }
    

    const benchImgs = getBenchImgs(pk);
    const eligible = [];
    
    for (const img of benchImgs) {
      const slot = getSlotFromImg(img);
      const energyBox = slot?.querySelector('.energy-pips');
      if (!energyBox) continue;
      
      const pips = energyBox.querySelectorAll('.energy-pip');
      const hasType = Array.from(pips).some(p => p.dataset.type === type);
      if (hasType) eligible.push(img);
    }
    
    if (!eligible.length) {
      showPopup(`No benched Pokémon with ${type} energy.`);
      return;
    }
    
    showPopup(`Psychic Connect: Choose a benched Pokémon to move ALL ${type} energy from.`);
    const chosen = await awaitSelection(eligible);
    if (!chosen) return;
    

    const activeImg = getActiveImg(pk);
    if (!activeImg) return;
    
    const srcSlot = getSlotFromImg(chosen);
    const srcBox = srcSlot?.querySelector('.energy-pips');
    if (!srcBox) return;
    
    const pips = Array.from(srcBox.querySelectorAll('.energy-pip'));
    const typePips = pips.filter(p => p.dataset.type === type);
    

    for (const pip of typePips) {
      pip.remove();
    }
    

    const destSlot = getSlotFromImg(activeImg);
    let destBox = destSlot?.querySelector('.energy-pips');
    if (!destBox) {
      destBox = document.createElement('div');
      destBox.className = 'energy-pips';
      destSlot.appendChild(destBox);
    }
    
    for (let i = 0; i < typePips.length; i++) {
      const pip = document.createElement('div');
      pip.className = 'energy-pip';
      pip.dataset.type = type;
      pip.style.backgroundImage = `url('${ENERGY_ICONS[type] || ''}')`;
      destBox.appendChild(pip);
    }
    
    showPopup(`Psychic Connect: Moved ${typePips.length} ${type} energy to ${activeImg.alt}!`);
  },

  prevent_damage_and_effects_next_turn: async (s, pk, p, ctx) => {

    const img = getActiveImg(pk);
    if (img) {
      img.dataset.preventDamageAndEffectsNextTurn = 'true';
    }
  },

  prevent_damage_from_ex: async (s, pk, { param1 }, ctx) => {

    const abilityPokemon = ctx?.sourceImg || ctx?.abilityPokemon || getActiveImg(pk);
    if (abilityPokemon) {
      abilityPokemon.dataset.preventDamageFromEx = 'true';
    }
  },

  prevent_status: async (s, pk, { param1 }, ctx) => {
    const status = (param1 || 'sleep').toLowerCase();
    const sourceImg = ctx?.sourceImg || ctx?.abilityPokemon || getActiveImg(pk);
    
    if (!sourceImg) return;
    

    if (!sourceImg.dataset.statusProtected) {
      sourceImg.dataset.statusProtected = status;
    }
  },

  reduce_all_damage: async (s, pk, { param1 }, ctx) => {
    const reduction = parseInt10(param1, 10);
    const sourceImg = ctx?.sourceImg || ctx?.abilityPokemon || getActiveImg(pk);
    
    if (!sourceImg) return;
    

    sourceImg.dataset.damageReduction = String(reduction);
  },

  reduce_incoming_damage_if_full_hp: async (s, pk, { param1 }, ctx) => {
    const reduction = parseInt10(param1, 40);
    const sourceImg = ctx?.sourceImg || ctx?.abilityPokemon || getActiveImg(pk);
    
    if (!sourceImg) return;
    

    sourceImg.dataset.damageReductionIfFullHp = String(reduction);
  },

  reduce_opponent_damage: async (s, pk, { param1 }, ctx) => {

    const reduction = parseInt10(param1, 20);
    if (!globalThis.state) globalThis.state = {};
    if (!globalThis.state.opponentDamageReduction) globalThis.state.opponentDamageReduction = {};
    globalThis.state.opponentDamageReduction[pk] = reduction;
  },

  remove_retreat_cost_if_named: async (s, pk, { param1 }, ctx) => {

    const namedPokemon = (param1 || '').toLowerCase();
    if (!globalThis.state) globalThis.state = {};
    if (!globalThis.state.zeroRetreatNamed) globalThis.state.zeroRetreatNamed = {};
    globalThis.state.zeroRetreatNamed[pk] = namedPokemon;
  },

  reveal_opponent_hand: async (s, pk) => {
    const opp = oppPk(pk);
    const hand = s[opp]?.hand || [];
    
    if (hand.length === 0) {
      showPopup('Opponent has no cards in hand.');
      return;
    }
    
    const cardNames = hand.map(c => c.name || 'Unknown').join(', ');
    showPopup(`Infiltrating Inspection: Opponent's hand: ${cardNames}`);
  },

  search_supporter_from_discard_on_evolution: async (s, pk, p, ctx) => {
    const abilityPokemon = ctx?.sourceImg || ctx?.abilityPokemon;
    if (!abilityPokemon) return;
    

    const owner = pk === 'p1' ? 'player1' : 'player2';
    const discard = globalThis.playerState?.[owner]?.discard?.cards || [];
    

    const supporters = [];
    for (const card of discard) {
      try {
        const meta = await globalThis.fetchCardMeta(card.set, card.number || card.num);
        if (meta.category === 'Trainer' && meta.trainerType === 'Supporter') {
          supporters.push(card);
        }
      } catch {}
    }
    
    if (supporters.length === 0) {
      showPopup('No Supporter cards in discard pile.');
      return;
    }
    

    const chosen = supporters[Math.floor(Math.random() * supporters.length)];
    

    const index = discard.findIndex(c => c.set === chosen.set && (c.number || c.num) === (chosen.number || chosen.num));
    if (index !== -1) {
      discard.splice(index, 1);
      s[pk].hand = s[pk].hand || [];
      s[pk].hand.push(chosen);
      
      if (globalThis.renderAllHands) globalThis.renderAllHands();
      
      showPopup(`Search for Friends: Found ${chosen.name}!`);
    }
  },

  switch_type_with_bench: async (s, pk, { param1 }, ctx) => {
    const type = (param1 || 'water').toLowerCase();
    const activeImg = getActiveImg(pk);
    
    if (!activeImg) {
      showPopup('No Active Pokémon.');
      return;
    }
    

    try {
      const meta = await globalThis.fetchCardMeta(activeImg.dataset.set, activeImg.dataset.num);
      const hasType = meta.types?.some(t => t.toLowerCase() === type);
      
      if (!hasType) {
        showPopup(`Active Pokémon is not ${type} type.`);
        return;
      }
    } catch {
      showPopup('Could not verify Active Pokémon type.');
      return;
    }
    

    const benchImgs = getBenchImgs(pk);
    if (benchImgs.length === 0) {
      showPopup('No benched Pokémon to switch with.');
      return;
    }
    
    showPopup(`Shifting Stream: Choose a benched Pokémon to switch with.`);
    const chosen = await awaitSelection(benchImgs);
    
    if (chosen) {

      try {
        const owner = pk === 'p1' ? 'player1' : 'player2';
        const activeDiv = globalThis.activeFor(owner);
        const activeSlot = activeDiv?.querySelector('.card-slot');
        const benchSlot = chosen.closest('.card-slot');
        
        if (!activeSlot || !benchSlot) {
          showPopup('Error: Could not find slots');
          return;
        }
        

        const activePack = globalThis.detachAttachments(activeSlot);
        const benchPack = globalThis.detachAttachments(benchSlot);
        

        activeSlot.removeChild(activeImg);
        benchSlot.removeChild(chosen);
        
        activeSlot.appendChild(chosen);
        benchSlot.appendChild(activeImg);
        

        globalThis.attachAttachments(activeSlot, benchPack);
        globalThis.attachAttachments(benchSlot, activePack);
        

        if (typeof globalThis.markSlot === 'function') {
          globalThis.markSlot(activeSlot, true);
          globalThis.markSlot(benchSlot, true);
        }
        
        showPopup(`Shifting Stream: Switched ${activeImg.alt} with ${chosen.alt}!`);
      } catch (err) {
        console.error('[Shifting Stream] Swap failed:', err);
        showPopup('Switch failed. Please try again.');
      }
    }
  },

  zero_retreat_first_turn: async (s, pk, { param1 }, ctx) => {

    if (globalThis.turnNumber && globalThis.turnNumber <= 2) {
      return -999;
    }
    return 0;
  },

  allow_evolution_first_turn: async (s, pk, { param1 }, ctx) => {

    const abilityPokemon = ctx?.sourceImg || ctx?.abilityPokemon || getActiveImg(pk);
    if (abilityPokemon) {
      abilityPokemon.dataset.allowEvolutionFirstTurn = 'true';
    }
  },

  boost_type_damage_multiple: async (s, pk, { param1, param2 }, ctx) => {

    const boost = parseInt10(param1, 30);
    const types = (param2 || '').split(';').map(t => t.trim().toLowerCase());
    
    if (!globalThis.state) globalThis.state = {};
    if (!globalThis.state.typeDamageBoost) globalThis.state.typeDamageBoost = {};
    if (!globalThis.state.typeDamageBoost[pk]) globalThis.state.typeDamageBoost[pk] = {};
    
    for (const type of types) {
      globalThis.state.typeDamageBoost[pk][type] = boost;
    }
    
  },

  damage_on_opponent_energy_attach: async (s, pk, { param1 }, ctx) => {

    const damage = parseInt10(param1, 20);
    if (!globalThis.state) globalThis.state = {};
    if (!globalThis.state.damageOnOpponentEnergyAttach) globalThis.state.damageOnOpponentEnergyAttach = {};
    globalThis.state.damageOnOpponentEnergyAttach[pk] = damage;
  },

  counter_on_hit: async () => {},
  block_supporters: async () => {}
};

globalThis.ABILITY_HANDLERS = ABILITY_HANDLERS;

globalThis.abilityUsedThisTurn = { p1: {}, p2: {} };
globalThis.resetAbilityUsage = pk => { globalThis.abilityUsedThisTurn[pk] = {}; };

async function applyAbilityEffect(state, pk, row, context = {}) {
  await loadAbilityEffects();
  
  if (!row?.effect_type) { showPopup('Ability not implemented.'); return; }
  
  const handler = ABILITY_HANDLERS[row.effect_type];
  if (!handler) { showPopup(`"${row.abilityName}" not implemented.`); return; }
  
  try {

    const handlerContext = { ...context, abilityRow: row, abilityText: row.effect_text || row.text || '' };
    const result = await handler(state, pk, { param1: row.param1, param2: row.param2 }, handlerContext);
    const img = context.abilityPokemon || getActiveImg(pk);
    globalThis.addLog?.(pk, `used <b>${row.abilityName}</b>`, img?.src, { name: img?.alt });
    return result;
  } catch (e) {
    console.error('[ability] Error:', e);
    showPopup('Ability failed.');
    return { knocked: false };
  }
}

globalThis.applyAbilityEffectFromCsv = applyAbilityEffect;
globalThis.damageImg = damageImg;
globalThis.ensureAbilityEffectsLoaded = loadAbilityEffects;
globalThis.getAbilityRowForCard = getAbilityRow;
globalThis.ABILITY_EFFECT_ROWS = abilityEffectRows;

globalThis.findAbilityRow = function(set, num, abilityName) {
  if (!abilityEffectRows?.length) return null;
  
  const normalizedSet = String(set || '').toUpperCase();
  const normalizedNum = String(num || '').padStart(3, '0');
  const normalizedAbility = normStr(abilityName);
  
  return abilityEffectRows.find(r => {
    const rowSet = String(r.set || '').toUpperCase();
    const rowNum = String(r.number || '').padStart(3, '0');
    const rowAbility = normStr(r.abilityName);
    
    return rowSet === normalizedSet && 
           rowNum === normalizedNum && 
           rowAbility === normalizedAbility;
  }) ?? null;
};

globalThis.activateAbility = async function(state, pk, abilityName, cardKey) {
  await loadAbilityEffects();
  
  const img = getActiveImg(pk);
  if (!img) { showPopup('No Active Pokémon.'); return; }
  
  const row = getAbilityRow(img.dataset.set, img.dataset.num, abilityName);
  if (!row) { showPopup('No ability data.'); return; }
  if (row.abilityType === 'passive') { showPopup('Passive ability.'); return; }
  if (globalThis.abilityUsedThisTurn[pk]?.[cardKey]) { showPopup('Already used this turn.'); return; }
  
  globalThis.abilityUsedThisTurn[pk] ??= {};
  globalThis.abilityUsedThisTurn[pk][cardKey] = true;
  
  await applyAbilityEffect(state, pk, row);
};

globalThis.__reduceIncomingNextTurn = {};

globalThis.__specialEffects = { p1: {}, p2: {} };

globalThis.clearSpecialEffects = function(pk) {
  if (globalThis.__specialEffects?.[pk]) {
    globalThis.__specialEffects[pk] = {};
  }
};

globalThis.clearTurnEffects = function(state, pk) {
  

  if (state?.temp?.[pk]) {
    delete state.temp[pk].globalDamageBoost;
  }
  

  if (globalThis.clearTempRetreatFor) {
    globalThis.clearTempRetreatFor(pk);
  }
  

  const oppPk = pk === 'p1' ? 'p2' : 'p1';
  const attackLock = globalThis.__specialEffects?.[oppPk]?.attackLock;
  const itemBlock = globalThis.__specialEffects?.[oppPk]?.itemBlock;
  const supporterBlock = globalThis.__specialEffects?.[oppPk]?.supporterBlock;
  const retreatLock = globalThis.__specialEffects?.[oppPk]?.retreatLock;
  

  if (itemBlock || supporterBlock || retreatLock) {
  }
  
  globalThis.clearSpecialEffects(oppPk);
  

  if (globalThis.__specialEffects?.[oppPk]) {
    if (attackLock) {
      globalThis.__specialEffects[oppPk].attackLock = attackLock;
    }

    if (itemBlock) {
      globalThis.__specialEffects[oppPk].itemBlock = itemBlock;
    }
    if (supporterBlock) {
      globalThis.__specialEffects[oppPk].supporterBlock = supporterBlock;
    }
    if (retreatLock) {
      globalThis.__specialEffects[oppPk].retreatLock = retreatLock;
    }
  }
  

  const currentItemBlock = globalThis.__specialEffects?.[pk]?.itemBlock;
  const currentSupporterBlock = globalThis.__specialEffects?.[pk]?.supporterBlock;
  const currentRetreatLock = globalThis.__specialEffects?.[pk]?.retreatLock;
  
  if (currentItemBlock || currentSupporterBlock || currentRetreatLock) {
    if (globalThis.__specialEffects?.[pk]) {
      delete globalThis.__specialEffects[pk].itemBlock;
      delete globalThis.__specialEffects[pk].supporterBlock;
      delete globalThis.__specialEffects[pk].retreatLock;
    }
  }
  

  if (globalThis.state?.damageReduction?.[oppPk]) {
    delete globalThis.state.damageReduction[oppPk];
  }
  
};

globalThis.canAttack = function(pk) {
  return !globalThis.__specialEffects?.[pk]?.attackLock;
};

globalThis.canUseSupporter = function(pk) {
  return !globalThis.__specialEffects?.[pk]?.supporterBlock;
};

globalThis.canRetreat = function(pk) {
  return !globalThis.__specialEffects?.[pk]?.retreatLock;
};

globalThis.shouldPreventDamage = function(pk) {
  return globalThis.__specialEffects?.[pk]?.preventDamage ?? false;
};

globalThis.getDamageReduction = function(pk) {
  return globalThis.__specialEffects?.[pk]?.damageReduction ?? 0;
};

globalThis.applyDamageModifiers = function(pk, baseDamage) {

  if (globalThis.shouldPreventDamage(pk)) {
    showPopup('Damage prevented!');
    return 0;
  }
  

  const reduction = globalThis.getDamageReduction(pk);
  if (reduction > 0) {
    const finalDamage = Math.max(0, baseDamage - reduction);
    if (finalDamage < baseDamage) {
      showPopup(`Damage reduced by ${reduction}!`);
    }
    return finalDamage;
  }
  
  return baseDamage;
};

loadAbilityEffects().then(() => {
});

globalThis.countEnergy = countEnergy;
globalThis.countEnergyAsync = countEnergyAsync;
globalThis.getEnergyValue = getEnergyValue;

globalThis.cachePokemonTypes = async function(img) {
  if (!img || !img.dataset) return;
  

  if (img.dataset.pokemonTypes) {
    return;
  }
  
  try {
    const meta = await globalThis.fetchCardMeta(img.dataset.set, img.dataset.num);
    if (meta.types) {
      img.dataset.pokemonTypes = meta.types.map(t => t.toLowerCase()).join(',');
    }
  } catch (e) {
    console.error('[cache-types] Failed to cache types:', e);
  }
};

globalThis.cacheAllPokemonTypes = async function() {
  const allPokemon = [
    ...getAllPokemonImgs('p1'),
    ...getAllPokemonImgs('p2')
  ];
  
  for (const img of allPokemon) {
    await globalThis.cachePokemonTypes(img);
  }
  
};

if (typeof MutationObserver !== 'undefined') {
  const pokemonObserver = new MutationObserver(async (mutations) => {
    for (const mutation of mutations) {

      for (const node of mutation.addedNodes) {
        if (node.tagName === 'IMG' && node.dataset?.set && node.dataset?.num) {

          await globalThis.cachePokemonTypes(node);
        }
        

        if (node.querySelectorAll) {
          const pokemonImgs = node.querySelectorAll('img[data-set][data-num]');
          for (const img of pokemonImgs) {
            await globalThis.cachePokemonTypes(img);
          }
        }
      }
    }
    

    let serperiorAdded = false;
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.tagName === 'IMG' && node.alt && node.alt.toLowerCase().includes('serperior')) {
          serperiorAdded = true;
          break;
        }
        if (node.querySelectorAll) {
          const serperiors = node.querySelectorAll('img[alt*="Serperior" i], img[alt*="serperior" i]');
          if (serperiors.length > 0) {
            serperiorAdded = true;
            break;
          }
        }
      }
      if (serperiorAdded) break;
    }
    
    if (serperiorAdded && typeof globalThis.updateAllEnergyVisuals === 'function') {
      globalThis.updateAllEnergyVisuals();
    }
  });
  

  globalThis.pokemonTypeObserver = pokemonObserver;
  

  if (document.body) {
    pokemonObserver.observe(document.body, {
      childList: true,
      subtree: true
    });
  } else {

    document.addEventListener('DOMContentLoaded', () => {
      pokemonObserver.observe(document.body, {
        childList: true,
        subtree: true
      });
    });
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', async () => {
    await globalThis.cacheAllPokemonTypes();
    

    if (typeof globalThis.updateAllEnergyVisuals === 'function') {
      globalThis.updateAllEnergyVisuals();
    }
  });
} else {

  (async () => {
    await globalThis.cacheAllPokemonTypes();
    

    if (typeof globalThis.updateAllEnergyVisuals === 'function') {
      globalThis.updateAllEnergyVisuals();
    }
  })();
}