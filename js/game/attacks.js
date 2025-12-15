import { pkToPlayer } from '../core/utils.js';
import { closeAttackMenu, getToolDataFromSlot } from '../ui/modals.js';
import { showPopup } from '../ui/modals.js';

export function canAttack(pk) {
  if (globalThis.__specialEffects?.[pk]?.attackLock) {
    return false;
  }
  return true;
}

export function isActiveBlockedFromAttacking(pk) {
  const img = globalThis.getActiveImg?.(pk);
  if (!img) return false;
  const st = (img.dataset.status || '').toLowerCase();
  return st === 'asleep' || st === 'paralyzed';
}

function getPassiveAbility(pokemonImg, effectType) {
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

export function getFightingCoachBoost(attackerPk, attackerType) {
  if (!attackerType) return 0;
  
  const allAllies = [globalThis.getActiveImg?.(attackerPk), ...(globalThis.getBenchImgs?.(attackerPk) || [])].filter(Boolean);
  let totalBoost = 0;
  
  for (const ally of allAllies) {
    const coachAbility = getPassiveAbility(ally, 'boost_type_damage');
    if (coachAbility) {
      const boostedType = (coachAbility.param1 || '').toLowerCase();
      const boost = parseInt(coachAbility.param2 || '0', 10);
      
      if (attackerType.toLowerCase() === boostedType) {
        totalBoost += boost;
      }
    }
  }
  
  return totalBoost;
}

export function getThickFatReduction(defenderImg, attackerType) {
  if (!defenderImg || !attackerType) return 0;
  
  const thickFat = getPassiveAbility(defenderImg, 'reduce_damage_from_types');
  if (!thickFat) return 0;
  
  const reducedTypes = (thickFat.param1 || '').split(';');
  const reduction = parseInt(thickFat.param2 || '0', 10);
  
  if (reducedTypes.includes(attackerType.toLowerCase())) {
    return reduction;
  }
  
  return 0;
}

export function applyGuardedGrill(defenderImg, baseDamage) {
  if (!defenderImg || baseDamage <= 0) return baseDamage;
  
  const grill = getPassiveAbility(defenderImg, 'flip_reduce_damage');
  if (!grill) return baseDamage;
  
  const reduction = parseInt(grill.param1 || '0', 10);
  const flip = Math.random() < 0.5;
  
  if (flip) {
    const newDamage = Math.max(0, baseDamage - reduction);
    showPopup(`Guarded Grill: Heads! Reduced ${reduction} damage.`);
    return newDamage;
  } else {
    showPopup(`Guarded Grill: Tails! No reduction.`);
    return baseDamage;
  }
}

export function shouldBlockDamageFromEx(pk, attackerImg) {
  if (!attackerImg) return false;
  
  const img = globalThis.getActiveImg?.(pk);
  if (!img) return false;
  
  const abilityRows = window.ABILITY_EFFECT_ROWS || [];
  const setId = img.dataset.set;
  const numId = String(img.dataset.num || '').padStart(3, '0');
  
  const row = abilityRows.find(r =>
    r.set === setId &&
    String(r.number).padStart(3, '0') === numId &&
    r.abilityType === 'passive' &&
    r.effect_type === 'prevent_damage_from_ex'
  );
  
  if (row) {
    const attackerName = (attackerImg.alt || '').toLowerCase();
    const isEx = attackerName.includes(' ex');
    
    if (isEx) {
      return true;
    }
  }
  
  return false;
}

export function getCounterattackDamage(pk) {
  const img = globalThis.getActiveImg?.(pk);
  if (!img) return 0;
  
  const abilityRows = window.ABILITY_EFFECT_ROWS || [];
  const setId = img.dataset.set;
  const numId = String(img.dataset.num || '').padStart(3, '0');
  
  const row = abilityRows.find(r =>
    r.set === setId &&
    String(r.number).padStart(3, '0') === numId &&
    r.abilityType === 'passive' &&
    r.effect_type === 'counter_on_hit'
  );
  
  if (row) {
    return parseInt(row.param1 || '0', 10);
  }
  
  return 0;
}

export function applyTypesToAttackMenu(type) {
  if (!type) return;
  
  const typeLower = type.toLowerCase();
  
  const abilityRows = document.querySelectorAll('.attack-ability-row');
  abilityRows.forEach(row => {
    row.setAttribute('data-type', typeLower);
  });
  
  const abilityWrappers = document.querySelectorAll('.attack-ability-wrapper');
  abilityWrappers.forEach(wrapper => {
    wrapper.setAttribute('data-type', typeLower);
  });
  
  const attackItems = document.querySelectorAll('.attack-item');
  attackItems.forEach(item => {
    item.setAttribute('data-type', typeLower);
  });
}

