import { showPopup } from '../ui/modals.js';

export async function applyAbilityEffect(abilityRow, ownerKey, sourceImg = null) {
  if (typeof globalThis.applyAbilityEffectFromCsv === 'function') {
    let pk;
    if (ownerKey === 'p1' || ownerKey === 'p2') {
      pk = ownerKey;
    } else {
      pk = ownerKey === 'player1' ? 'p1' : 'p2';
    }
    
    const effectState = {
      p1: typeof playerState !== 'undefined' ? playerState.player1 : {},
      p2: typeof playerState !== 'undefined' ? playerState.player2 : {},
      activeFor: typeof activeFor === 'function' ? activeFor : () => null,
      benchFor: typeof benchFor === 'function' ? benchFor : () => null,
      opponentOf: typeof opponentOf === 'function' ? opponentOf : (p) => p === 'player1' ? 'player2' : 'player1',
      fetchCardMeta: typeof fetchCardMeta === 'function' ? fetchCardMeta : async () => ({}),
      damageActiveOf: typeof damageActiveOf === 'function' ? damageActiveOf : () => ({ knocked: false }),
      beginPromotionFlow: typeof beginPromotionFlow === 'function' ? beginPromotionFlow : () => {},
      showPopup: showPopup,
      logEvent: typeof logEvent === 'function' ? logEvent : () => {},
      attachEnergyToSlot: typeof attachEnergyToSlot === 'function' ? attachEnergyToSlot : () => {},
      energyZoneDiv: typeof energyZoneDiv !== 'undefined' ? energyZoneDiv : null,
      renderEnergyZone: typeof renderEnergyZone === 'function' ? renderEnergyZone : () => {},
      getActiveImage: typeof getActiveImage === 'function' ? getActiveImage : () => null
    };
    
    try {
      const result = await globalThis.applyAbilityEffectFromCsv(effectState, pk, abilityRow, { sourceImg });
      showPopup(`Used ability: ${abilityRow.abilityName || 'Unknown'}`);
      if (globalThis.logEvent) {
        const owner = ownerKey === 'p1' || ownerKey === 'player1' ? 'player1' : 'player2';
        const abilityType = abilityRow.abilityType === 'passive' ? 'passive ability' : 'ability';
        globalThis.logEvent({
          player: owner,
          text: `Used ${abilityType}: ${abilityRow.abilityName || 'Unknown'}`,
          cardSet: sourceImg?.dataset?.set,
          cardNum: sourceImg?.dataset?.num
        });
      }
      
      if (typeof zoomBackdrop !== 'undefined' && zoomBackdrop.classList.contains('show')) {
        zoomBackdrop.classList.remove('show');
        if (typeof currentZoom !== 'undefined') {
          currentZoom = { img: null, meta: null };
        }
      }
      
      if (result && result.knocked) {
        const foe = pk === 'p1' ? 'player2' : 'player1';
        
        const foeImg = result.knockedImg || globalThis.getActiveImage?.(foe);
        
        if (foeImg && typeof handleKnockOut === 'function') {
          const foeActive = globalThis.getActiveImage?.(foe);
          const wasActive = (foeImg === foeActive);
          
          const ended = await handleKnockOut(foe, foeImg, wasActive);
          if (!ended && typeof beginPromotionFlow === 'function') {
            if (wasActive) {
              await beginPromotionFlow(foe);
            }
          }
        }
      }
    } catch (err) {
      console.error('[ability] Ability effect error:', err);
      showPopup('Ability failed.');
    }
  } else {
    showPopup(`Used ability: ${abilityRow.abilityName || 'Unknown'}`);
  }
}

export async function populateAbilityCache() {
  if (!window.ABILITY_EFFECT_ROWS) {
    return false;
  }
  
  globalThis.abilityCache = {};
  
  for (const row of window.ABILITY_EFFECT_ROWS) {
    const set = row.set;
    const num = row.number;
    
    const keyPadded = `${set}-${num}`;
    const keyUnpadded = `${set}-${parseInt(num, 10)}`;
    
    globalThis.abilityCache[keyPadded] = row;
    globalThis.abilityCache[keyUnpadded] = row;
  }
  return true;
}

export function hasArceusInPlay(pk) {
  const activeDivId = pk === 'p1' ? 'p1Active' : 'p2Active';
  const benchDivId = pk === 'p1' ? 'p1Bench' : 'p2Bench';
  const activeDiv = document.getElementById(activeDivId);
  const benchDiv = document.getElementById(benchDivId);
  
  const activeImg = activeDiv ? activeDiv.querySelector('img') : null;
  const benchImgs = benchDiv ? [...benchDiv.querySelectorAll('img')] : [];
  
  const allPokemon = [activeImg, ...benchImgs].filter(Boolean);
  
  const hasArceus = allPokemon.some(img => {
    const name = (img.alt || '').toLowerCase();
    return name.includes('arceus');
  });
  
  return hasArceus;
}

export async function getAbilityRow(set, num) {
  const key = `${set}-${num}`;
  if (globalThis.abilityCache && globalThis.abilityCache[key]) {
    return globalThis.abilityCache[key];
  }
  
  if (!window.ABILITY_EFFECT_ROWS) return null;
  
  const numPadded = String(num || '').padStart(3, '0');
  const row = window.ABILITY_EFFECT_ROWS.find(r =>
    r.set === set && String(r.number).padStart(3, '0') === numPadded
  );
  
  return row || null;
}

export function getPassiveDamageReduction(pk) {
  const img = globalThis.getActiveImg?.(pk);
  if (!img) return 0;
  
  const abilityRows = window.ABILITY_EFFECT_ROWS || [];
  const setId = img.dataset.set;
  const numId = String(img.dataset.num || '').padStart(3, '0');
  
  const row = abilityRows.find(r =>
    r.set === setId &&
    String(r.number).padStart(3, '0') === numId &&
    r.abilityType === 'passive' &&
    r.effect_type === 'reduce_incoming_damage'
  );
  
  if (row) {
    return parseInt(row.param1 || '0', 10);
  }
  
  return 0;
}

export function getPassiveAbility(pokemonImg, effectType) {
  if (!pokemonImg || !effectType) return null;
  
  const abilityRows = window.ABILITY_EFFECT_ROWS || [];
  const setId = pokemonImg.dataset.set;
  const numId = String(pokemonImg.dataset.num || '').padStart(3, '0');
  
  return abilityRows.find(r =>
    r.set === setId &&
    String(r.number).padStart(3, '0') === numId &&
    r.abilityType === 'passive' &&
    r.effect_type === effectType
  ) || null;
}

export function checkPassiveAbility(pokemonImg, effectType) {
  return !!getPassiveAbility(pokemonImg, effectType);
}

export function hasCrystalBody(defenderImg) {
  return checkPassiveAbility(defenderImg, 'block_attack_effects');
}

export function hasLevitateZeroRetreat(pokemonImg) {
  if (!pokemonImg) return false;
  
  const levitate = getPassiveAbility(pokemonImg, 'zero_retreat_if_energy');
  if (!levitate) return false;
  
  const slot = pokemonImg.closest('.card-slot');
  if (!slot) return false;
  
  const energyBox = slot.querySelector('.energy-pips');
  const hasEnergy = energyBox && energyBox.querySelectorAll('.energy-pip').length > 0;
  
  if (hasEnergy) {
    return true;
  }
  
  return false;
}

