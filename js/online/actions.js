// Action Broadcasting Module
// Wraps game actions and broadcasts them to Firebase

import { getMatchRef, createAction, DB_PATHS } from './schema.js';
import { getCurrentMatchId, getCurrentPlayerId, isCurrentPlayer1 } from './sync.js';

let actionQueue = [];
let isProcessingQueue = false;

export async function broadcastAction(actionType, actionData) {
  const matchId = getCurrentMatchId();
  const playerId = getCurrentPlayerId();
  
  console.log('[BROADCAST] Broadcasting action:', { actionType, actionData, matchId, playerId });
  
  if (!matchId || !playerId) {
    console.warn('[BROADCAST] Cannot broadcast action: not in a match', { matchId, playerId });
    return;
  }

  if (!window.firebaseDatabase) {
    console.warn('[BROADCAST] Cannot broadcast action: Firebase not initialized');
    // Queue action for later
    actionQueue.push({ actionType, actionData });
    return;
  }

  try {
    const action = createAction(matchId, playerId, actionType, actionData);
    console.log('[BROADCAST] Created action object:', action);
    const actionsRef = getMatchRef(matchId).child('actions');
    
    // Push action to Firebase
    console.log('[BROADCAST] Pushing action to Firebase...');
    await actionsRef.push(action);
    console.log('[BROADCAST] Action pushed successfully');
    
    // Clear queue if we successfully sent
    if (actionQueue.length > 0) {
      actionQueue = [];
    }
  } catch (error) {
    console.error('[BROADCAST] Error broadcasting action:', error);
    console.error('[BROADCAST] Error stack:', error.stack);
    // Queue action for retry
    actionQueue.push({ actionType, actionData });
  }
}

export async function processActionQueue() {
  if (isProcessingQueue || actionQueue.length === 0) {
    return;
  }

  isProcessingQueue = true;

  while (actionQueue.length > 0) {
    const { actionType, actionData } = actionQueue.shift();
    try {
      await broadcastAction(actionType, actionData);
    } catch (error) {
      console.error('Error processing queued action:', error);
      // Put it back at the front of the queue
      actionQueue.unshift({ actionType, actionData });
      break;
    }
  }

  isProcessingQueue = false;
}

// Action type constants
export const ACTION_TYPES = {
  ATTACK: 'attack',
  ATTACH_ENERGY: 'attach_energy',
  PLAY_TRAINER: 'play_trainer',
  PLAY_POKEMON: 'play_pokemon',
  USE_ABILITY: 'use_ability',
  EVOLVE: 'evolve',
  RETREAT: 'retreat',
  PROMOTE: 'promote',
  DRAW_CARDS: 'draw_cards',
  END_TURN: 'end_turn',
  START_TURN: 'start_turn',
  KNOCK_OUT: 'knock_out',
  STATUS_EFFECT: 'status_effect',
  HEAL: 'heal',
  DAMAGE: 'damage',
  SHUFFLE_DECK: 'shuffle_deck',
  SEARCH_DECK: 'search_deck',
  DISCARD: 'discard',
  FORCE_SWITCH_SELECTION: 'force_switch_selection',
  FORCE_SWITCH_SELECTED: 'force_switch_selected',
  RESET_REQUEST: 'reset_request',
  RESET_ACCEPTED: 'reset_accepted',
  RESET_DECLINED: 'reset_declined'
};

// Helper functions for common actions
export function broadcastAttack(attackData) {
  return broadcastAction(ACTION_TYPES.ATTACK, attackData);
}

export function broadcastAttachEnergy(energyData) {
  return broadcastAction(ACTION_TYPES.ATTACH_ENERGY, energyData);
}

export function broadcastPlayTrainer(trainerData) {
  return broadcastAction(ACTION_TYPES.PLAY_TRAINER, trainerData);
}

export function broadcastUseAbility(abilityData) {
  return broadcastAction(ACTION_TYPES.USE_ABILITY, abilityData);
}

export function broadcastEvolve(evolveData) {
  return broadcastAction(ACTION_TYPES.EVOLVE, evolveData);
}

export function broadcastRetreat(retreatData) {
  return broadcastAction(ACTION_TYPES.RETREAT, retreatData);
}

export function broadcastPromote(promoteData) {
  return broadcastAction(ACTION_TYPES.PROMOTE, promoteData);
}

export function broadcastDrawCards(drawData) {
  return broadcastAction(ACTION_TYPES.DRAW_CARDS, drawData);
}

export function broadcastEndTurn() {
  return broadcastAction(ACTION_TYPES.END_TURN, {});
}

export function broadcastStartTurn() {
  return broadcastAction(ACTION_TYPES.START_TURN, {});
}

export function broadcastKnockOut(knockOutData) {
  return broadcastAction(ACTION_TYPES.KNOCK_OUT, knockOutData);
}

export function broadcastStatusEffect(statusData) {
  return broadcastAction(ACTION_TYPES.STATUS_EFFECT, statusData);
}

export function broadcastHeal(healData) {
  return broadcastAction(ACTION_TYPES.HEAL, healData);
}

export function broadcastDamage(damageData) {
  return broadcastAction(ACTION_TYPES.DAMAGE, damageData);
}

export function broadcastShuffleDeck(shuffleData) {
  return broadcastAction(ACTION_TYPES.SHUFFLE_DECK, shuffleData);
}

export function broadcastSearchDeck(searchData) {
  return broadcastAction(ACTION_TYPES.SEARCH_DECK, searchData);
}

export function broadcastDiscard(discardData) {
  return broadcastAction(ACTION_TYPES.DISCARD, discardData);
}

// Start processing queue when connection is restored
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    processActionQueue();
  });
}

