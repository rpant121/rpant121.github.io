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
  // [TOOL-DUPLICATE-FIX] Remove any existing tool thumb first to prevent duplicates
  const existingTh = slot.querySelector('.tool-thumb');
  if (existingTh) {
    existingTh.remove();
  }
  // Create new tool thumb
  const th = document.createElement('img');
  th.className = 'tool-thumb';
  th.title = 'Tool';
  slot.appendChild(th);
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
  
  // Sync tool attachment to Firebase
  const getCurrentMatchIdFn = globalThis.getCurrentMatchId;
  const matchId = getCurrentMatchIdFn ? getCurrentMatchIdFn() : null;
  const isOnline = matchId && window.firebaseDatabase;
  if (isOnline && typeof globalThis.broadcastAction === 'function') {
    const isCurrentPlayer1Fn = globalThis.isCurrentPlayer1;
    const isP1 = (isCurrentPlayer1Fn && typeof isCurrentPlayer1Fn === 'function') ? isCurrentPlayer1Fn() : false;
    const matchOwner = (isP1 && owner === 'player1') || (!isP1 && owner === 'player2') 
      ? 'player1' 
      : 'player2';
    
    // Determine if this is active or bench, and get position
    const isActive = slot.closest('.active-slot') !== null;
    let position = 'active';
    let benchIndex = -1;
    
    if (!isActive) {
      const benchDiv = owner === 'player1' ? globalThis.p1Bench : globalThis.p2Bench;
      if (benchDiv) {
        const benchSlots = Array.from(benchDiv.querySelectorAll('.card-slot'));
        benchIndex = benchSlots.indexOf(slot);
        if (benchIndex >= 0) {
          position = `bench-${benchIndex}`;
        }
      }
    }
    
    try {
      // Fetch tool name if not provided
      let toolName = toolObj.name;
      if (!toolName && toolObj.set && toolObj.num && globalThis.fetchCardMeta) {
        try {
          const meta = await globalThis.fetchCardMeta(toolObj.set, toolObj.num);
          toolName = meta?.name || '';
        } catch (err) {
          console.warn('Could not fetch tool name:', err);
        }
      }
      
      // Build target object - only include benchIndex if it's valid
      const targetObj = {
        set: img.dataset.set,
        num: img.dataset.num,
        name: img.alt,
        instanceId: img.dataset.instanceId,
        position: position
      };
      
      // Only add benchIndex if it's a valid bench position
      if (benchIndex >= 0) {
        targetObj.benchIndex = benchIndex;
      }
      
      await globalThis.broadcastAction(globalThis.ACTION_TYPES?.PLAY_TRAINER || 'play_trainer', {
        owner: matchOwner,
        trainer: {
          set: toolObj.set,
          num: toolObj.num,
          name: toolName || '',
          type: 'tool'
        },
        target: targetObj,
        turnNumber: globalThis.turnNumber || 0
      });
      console.log('Synced tool attachment to Firebase:', {
        matchOwner,
        position,
        toolName: toolName || 'unknown'
      });
    } catch (error) {
      console.error('Error syncing tool attachment to Firebase:', error);
    }
  }
  
  showPopup('Tool attached');
}

export async function applyTrainerEffect(effect, owner, trainerCardImg = null, throwOnError = false) {
  try {
    // Normalize effect object to ensure it has all required fields
    if (effect && !effect.trainerName && effect.name) {
      effect.trainerName = effect.name;
    }
    if (effect && !effect.name && effect.trainerName) {
      effect.name = effect.trainerName;
    }
    
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

    // Get TRAINER_EFFECTS from multiple possible sources
    // Wait a bit if TRAINER_EFFECTS isn't loaded yet (effects.js might still be loading)
    let TRAINER_EFFECTS = globalThis.TRAINER_EFFECTS;
    if (!TRAINER_EFFECTS && typeof window !== 'undefined') {
      TRAINER_EFFECTS = window.TRAINER_EFFECTS;
    }
    
    // If still not found, wait a short time for effects.js to load
    if (!TRAINER_EFFECTS || Object.keys(TRAINER_EFFECTS).length === 0) {
      // Wait up to 1 second for TRAINER_EFFECTS to be available
      for (let i = 0; i < 10 && (!TRAINER_EFFECTS || Object.keys(TRAINER_EFFECTS).length === 0); i++) {
        await new Promise(resolve => setTimeout(resolve, 100));
        TRAINER_EFFECTS = globalThis.TRAINER_EFFECTS || (typeof window !== 'undefined' ? window.TRAINER_EFFECTS : null);
      }
    }
    
    if (!TRAINER_EFFECTS) {
      TRAINER_EFFECTS = {};
    }
    
    let handler = TRAINER_EFFECTS[effect.effect_type];

    if (!handler && effect.effect_name && TRAINER_EFFECTS[effect.effect_name]) {
      handler = TRAINER_EFFECTS[effect.effect_name];
    }
    
    // Debug logging to help diagnose missing effects
    if (!handler) {
      console.warn('[applyTrainerEffect] Handler not found:', {
        effectType: effect.effect_type,
        effectName: effect.effect_name,
        trainerName: effect.name || effect.trainerName,
        availableEffects: Object.keys(TRAINER_EFFECTS).slice(0, 20), // First 20 for debugging
        totalEffects: Object.keys(TRAINER_EFFECTS).length,
        hasGlobalThis: !!globalThis.TRAINER_EFFECTS,
        hasWindow: typeof window !== 'undefined' && !!window.TRAINER_EFFECTS,
        drawCardsExists: 'draw_cards' in TRAINER_EFFECTS,
        shuffleHandDrawExists: 'shuffle_hand_draw' in TRAINER_EFFECTS
      });
    }

    if (!handler) {
      const errorMsg = `"${effect.effect_type || 'Unknown'}" effect not implemented for ${effect.name || effect.trainerName || 'this card'}.`;
      console.error('Trainer effect error:', {
        effectType: effect.effect_type,
        effectName: effect.effect_name,
        trainerName: effect.name || effect.trainerName,
        errorMsg
      });
      if (throwOnError) {
        throw new Error(errorMsg);
      } else {
        showPopup(errorMsg);
      }
      return;
    }
    
    try {
      console.log('[applyTrainerEffect] Executing handler:', {
        effectType: effect.effect_type,
        trainerName: effect.name || effect.trainerName,
        param1: effect.param1,
        param2: effect.param2,
        handlerExists: !!handler
      });
      await handler(state, key, { param1: effect.param1, param2: effect.param2 });
      console.log('[applyTrainerEffect] Handler executed successfully');
    } catch (err) {
      console.error('Error executing trainer effect handler:', {
        effectType: effect.effect_type,
        trainerName: effect.name || effect.trainerName,
        error: err,
        stack: err.stack
      });
      if (throwOnError) {
        throw err;
      } else {
        showPopup(`Trainer effect error: ${err.message || 'Unknown error'}`);
      }
      return;
    }

    // Sync state changes back to playerState and Firebase
    // Reuse the playerState variable declared earlier
    if (state.p1.deck && Array.isArray(state.p1.deck)) {
      playerState.player1 = playerState.player1 || {};
      playerState.player1.deck = [...state.p1.deck];
    }
    if (state.p1.hand && Array.isArray(state.p1.hand)) {
      playerState.player1 = playerState.player1 || {};
      playerState.player1.hand = [...state.p1.hand];
    }
    if (state.p1.discard) {
      playerState.player1 = playerState.player1 || {};
      playerState.player1.discard = state.p1.discard;
    }
    
    if (state.p2.deck && Array.isArray(state.p2.deck)) {
      playerState.player2 = playerState.player2 || {};
      playerState.player2.deck = [...state.p2.deck];
    }
    if (state.p2.hand && Array.isArray(state.p2.hand)) {
      playerState.player2 = playerState.player2 || {};
      playerState.player2.hand = [...state.p2.hand];
    }
    if (state.p2.discard) {
      playerState.player2 = playerState.player2 || {};
      playerState.player2.discard = state.p2.discard;
    }
    
    // Sync to Firebase if in online mode
    const getCurrentMatchIdFn = globalThis.getCurrentMatchId;
    const matchId = getCurrentMatchIdFn ? getCurrentMatchIdFn() : null;
    const isOnline = matchId && window.firebaseDatabase;
    if (isOnline && globalThis.updateGameStatePartial) {
      const isCurrentPlayer1Fn = globalThis.isCurrentPlayer1;
      const isP1 = (isCurrentPlayer1Fn && typeof isCurrentPlayer1Fn === 'function') ? isCurrentPlayer1Fn() : false;
      
      const updateObj = {};
      
      // Sync player1 state
      if (state.p1.deck && Array.isArray(state.p1.deck)) {
        const matchPlayer1Key = isP1 ? 'player1' : 'player2';
        updateObj[`${matchPlayer1Key}/deck`] = [...state.p1.deck];
      }
      if (state.p1.hand && Array.isArray(state.p1.hand)) {
        const matchPlayer1Key = isP1 ? 'player1' : 'player2';
        updateObj[`${matchPlayer1Key}/hand`] = [...state.p1.hand];
      }
      if (state.p1.discard) {
        const matchPlayer1Key = isP1 ? 'player1' : 'player2';
        updateObj[`${matchPlayer1Key}/discard`] = state.p1.discard;
      }
      
      // Sync player2 state
      if (state.p2.deck && Array.isArray(state.p2.deck)) {
        const matchPlayer2Key = isP1 ? 'player2' : 'player1';
        updateObj[`${matchPlayer2Key}/deck`] = [...state.p2.deck];
      }
      if (state.p2.hand && Array.isArray(state.p2.hand)) {
        const matchPlayer2Key = isP1 ? 'player2' : 'player1';
        updateObj[`${matchPlayer2Key}/hand`] = [...state.p2.hand];
      }
      if (state.p2.discard) {
        const matchPlayer2Key = isP1 ? 'player2' : 'player1';
        updateObj[`${matchPlayer2Key}/discard`] = state.p2.discard;
      }
      
      if (Object.keys(updateObj).length > 0) {
        try {
          await globalThis.updateGameStatePartial(updateObj);
          console.log('Synced trainer effect state changes to Firebase:', Object.keys(updateObj));
        } catch (error) {
          console.error('Error syncing trainer effect state changes to Firebase:', error);
        }
      }
    }

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
  
  // Sync discard to Firebase (pushCardToDiscard already handles this, but ensure it's called)
  const getCurrentMatchIdFn = globalThis.getCurrentMatchId;
  const matchId = getCurrentMatchIdFn ? getCurrentMatchIdFn() : null;
  const isOnline = matchId && (typeof window !== 'undefined' && window.firebaseDatabase);
  if (isOnline && typeof globalThis.updateGameStatePartial === 'function') {
    const isCurrentPlayer1Fn = globalThis.isCurrentPlayer1;
    const isP1 = (isCurrentPlayer1Fn && typeof isCurrentPlayer1Fn === 'function') ? isCurrentPlayer1Fn() : false;
    const matchPlayer = (isP1 && owner === 'player1') || (!isP1 && owner === 'player2') 
      ? 'player1' 
      : 'player2';
    
    // pushCardToDiscard should already sync, but ensure playerState is updated
    const playerState = globalThis.playerState || {};
    if (playerState[owner] && playerState[owner].discard) {
      (async () => {
        try {
          await globalThis.updateGameStatePartial({
            [`${matchPlayer}/discard`]: {
              cards: [...(playerState[owner].discard.cards || [])],
              energyCounts: { ...(playerState[owner].discard.energyCounts || {}) }
            }
          });
        } catch (error) {
          console.error('Error syncing trainer discard to Firebase:', error);
        }
      })();
    }
  }
  
  // Always update discard drawer (even if not open) and discard bubbles
  const p1DiscardDrawer = globalThis.p1DiscardDrawer || document.getElementById('p1DiscardDrawer');
  const p2DiscardDrawer = globalThis.p2DiscardDrawer || document.getElementById('p2DiscardDrawer');
  const drawer = owner === 'player1' ? p1DiscardDrawer : p2DiscardDrawer;

  // Always render discard to keep drawer content in sync (even if not visible)
  if (drawer && typeof globalThis.renderDiscard === 'function') {
    globalThis.renderDiscard(owner);
  }
  
  // Always update discard bubbles to show correct count
  if (typeof globalThis.updateDiscardBubbles === 'function') {
    globalThis.updateDiscardBubbles();
  }
}

