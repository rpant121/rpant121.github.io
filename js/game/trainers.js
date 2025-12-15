import { showPopup } from '../ui/modals.js';
import { renderAllHands, updateDeckBubbles, renderDiscard } from '../ui/render.js';
import { csvIdFor } from '../core/utils.js';

export function canUseSupporter(pk) {
  if (globalThis.__specialEffects?.[pk]?.supporterBlock) {
    return false;
  }
  return true;
}

export function trainerColor(type) {
  const t = String(type || '').toLowerCase();
  if (t.includes('supporter')) return '#e45803';
  if (t.includes('item')) return '#0167b6';
  if (t.includes('tool')) return '#6e4e9c';
  return '#3b3f46';
}

export function isGengarBlocking(player) {
  const opp = player === 'player1' ? 'player2' : 'player1';
  const oppActiveImg = globalThis.getActiveImage?.(opp) || globalThis.getActiveImg?.(opp);
  
  if (!oppActiveImg) return false;
  
  const abilityRows = window.ABILITY_EFFECT_ROWS || [];
  const setId = oppActiveImg.dataset.set;
  const numId = String(oppActiveImg.dataset.num || '').padStart(3, '0');
  
  const row = abilityRows.find(r =>
    r.set === setId &&
    String(r.number).padStart(3, '0') === numId &&
    r.abilityType === 'passive' &&
    r.effect_type === 'block_supporters'
  );
  
  return !!row;
}

export function setToolDataOnSlot(slot, tool) {
  if (tool) {
    slot.dataset.toolSet = tool.set;
    slot.dataset.toolNum = tool.num;
    slot.dataset.toolSrc = tool.src;
  } else {
    delete slot.dataset.toolSet;
    delete slot.dataset.toolNum;
    delete slot.dataset.toolSrc;
  }
}

export function ensureToolThumb(slot) {
  let th = slot.querySelector('.tool-thumb');
  if (!th) {
    th = document.createElement('img');
    th.className = 'tool-thumb';
    th.title = 'Tool';
    slot.appendChild(th);
  }
  return th;
}

export function removeToolThumb(slot) {
  const th = slot.querySelector('.tool-thumb');
  if (th) th.remove();
}

export async function attachToolToSlot(owner, slot, toolObj) {
  if (!slot || !toolObj) return;
  const img = slot.querySelector('img');
  if (!img) {
    showPopup('Attach to a Pokémon in play.');
    return;
  }
  if (globalThis.getToolDataFromSlot?.(slot)) {
    showPopup('This Pokémon already has a Tool attached.');
    return;
  }
  try {
    const metaP = await globalThis.fetchCardMeta?.(img.dataset.set, img.dataset.num);
    if (String(metaP?.category || '').toLowerCase() !== 'pokemon') {
      showPopup('Attach only to Pokémon.');
      return;
    }
  } catch {
    showPopup('Error verifying Pokémon.');
    return;
  }
  setToolDataOnSlot(slot, toolObj);
  const th = ensureToolThumb(slot);
  th.src = toolObj.src;
  th.onerror = () => {
    th.src = 'imgs/cardback.png';
  };
  th.onclick = async (ev) => {
    ev.stopPropagation();
    if (globalThis.openToolModal) {
      await globalThis.openToolModal(toolObj.set, toolObj.num, toolObj.src);
    }
  };
  showPopup('Tool attached');
}

export async function applyTrainerEffect(effect, owner, trainerCardImg = null, throwOnError = false) {
  try {
    const key = owner === 'player1' ? 'p1' : 'p2';
    
    const state = globalThis.state || {};
    
    if (!state.temp) {
      state.temp = { p1: {}, p2: {} };
    } else {
      state.temp.p1 = state.temp.p1 || {};
      state.temp.p2 = state.temp.p2 || {};
    }
    
    state.p1 = state.p1 || {};
    state.p2 = state.p2 || {};

    const playerState = globalThis.playerState || {};
    state.p1.deck = playerState.player1?.deck || [];
    state.p1.hand = playerState.player1?.hand || [];
    state.p1.discard = playerState.player1?.discard || {};

    state.p2.deck = playerState.player2?.deck || [];
    state.p2.hand = playerState.player2?.hand || [];
    state.p2.discard = playerState.player2?.discard || {};
    
    state.trainerCard = trainerCardImg;

    const TRAINER_EFFECTS = globalThis.TRAINER_EFFECTS || window.TRAINER_EFFECTS || {};
    let handler = TRAINER_EFFECTS[effect.effect_type];

    if (!handler && effect.effect_name && TRAINER_EFFECTS[effect.effect_name]) {
      handler = TRAINER_EFFECTS[effect.effect_name];
    }

    if (!handler) {
      const errorMsg = `"${effect.effect_type || 'Unknown'}" effect not implemented for ${effect.name || effect.trainerName || 'this card'}.`;
      if (throwOnError) {
        throw new Error(errorMsg);
      } else {
        showPopup(errorMsg);
      }
      return;
    }
    
    await handler(state, key, { param1: effect.param1, param2: effect.param2 });

    renderAllHands();
    updateDeckBubbles();

  } catch (err) {
    if (throwOnError) {
      throw err;
    } else {
      showPopup('Trainer effect failed.');
    }
  }
}

export function addTrainerToDiscard(owner, img) {
  if (globalThis.pushCardToDiscard) {
    globalThis.pushCardToDiscard(owner, img);
  }
  const p1DiscardDrawer = globalThis.p1DiscardDrawer || document.getElementById('p1DiscardDrawer');
  const p2DiscardDrawer = globalThis.p2DiscardDrawer || document.getElementById('p2DiscardDrawer');
  const drawer = owner === 'player1' ? p1DiscardDrawer : p2DiscardDrawer;

  if (drawer && drawer.classList.contains('show')) {
    renderDiscard(owner);
  }
}

