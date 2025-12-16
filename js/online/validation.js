// Client-Side Validation with Rollback Support
// Integrates with online sync and handles server rejections

import { broadcastAction, ACTION_TYPES } from './actions.js';
import { updateGameStatePartial, getCurrentMatchId, getCurrentPlayerId, isCurrentPlayer1 } from './sync.js';
import { showPopup } from '../ui/modals.js';

let actionHistory = [];
let pendingActions = new Map();

// Store state snapshot before action
function saveStateSnapshot() {
  const matchId = getCurrentMatchId();
  if (!matchId) return null;

  return {
    playerState: JSON.parse(JSON.stringify(globalThis.playerState)),
    p1Points: globalThis.p1Points,
    p2Points: globalThis.p2Points,
    turnNumber: globalThis.turnNumber,
    currentPlayer: globalThis.currentPlayer,
    hasAttachedEnergyThisTurn: globalThis.hasAttachedEnergyThisTurn
  };
}

// Restore state from snapshot
function restoreStateSnapshot(snapshot) {
  if (!snapshot) return;

  globalThis.playerState = snapshot.playerState;
  globalThis.p1Points = snapshot.p1Points;
  globalThis.p2Points = snapshot.p2Points;
  globalThis.turnNumber = snapshot.turnNumber;
  globalThis.currentPlayer = snapshot.currentPlayer;
  globalThis.hasAttachedEnergyThisTurn = snapshot.hasAttachedEnergyThisTurn;

  // Re-render UI
  if (globalThis.renderAllHands) globalThis.renderAllHands();
  if (globalThis.updateDeckBubbles) globalThis.updateDeckBubbles();
  if (globalThis.updatePointsUI) globalThis.updatePointsUI();
  if (globalThis.updateTurnBox) globalThis.updateTurnBox();
}

// Execute action with optimistic update and rollback support
export async function executeActionWithValidation(actionType, actionData, localExecuteFn) {
  const matchId = getCurrentMatchId();
  const playerId = getCurrentPlayerId();

  if (!matchId || !playerId) {
    // Not in online mode, execute locally only
    if (localExecuteFn) {
      await localExecuteFn();
    }
    return;
  }

  // Save state before action
  const stateSnapshot = saveStateSnapshot();
  const actionId = `${Date.now()}-${Math.random()}`;
  
  // Store snapshot for potential rollback
  pendingActions.set(actionId, {
    snapshot: stateSnapshot,
    actionType,
    actionData,
    timestamp: Date.now()
  });

  // Execute locally (optimistic update)
  let localError = null;
  try {
    if (localExecuteFn) {
      await localExecuteFn();
    }
  } catch (error) {
    localError = error;
    console.error('Local execution error:', error);
  }

  // Broadcast action to server
  try {
    await broadcastAction(actionType, {
      ...actionData,
      actionId,
      localExecuted: !localError
    });
  } catch (error) {
    console.error('Error broadcasting action:', error);
    // If broadcast fails, rollback local changes
    if (stateSnapshot) {
      restoreStateSnapshot(stateSnapshot);
      showPopup('Network error. Action not saved.');
    }
    pendingActions.delete(actionId);
    throw error;
  }

  // Clean up old pending actions (older than 5 seconds)
  const now = Date.now();
  for (const [id, action] of pendingActions.entries()) {
    if (now - action.timestamp > 5000) {
      pendingActions.delete(id);
    }
  }
}

// Handle server rejection
export function handleActionRejection(actionId, reason) {
  const pendingAction = pendingActions.get(actionId);
  if (pendingAction) {
    // Rollback to saved state
    restoreStateSnapshot(pendingAction.snapshot);
    showPopup(`Action rejected: ${reason || 'Invalid action'}`);
    pendingActions.delete(actionId);
  }
}

// Handle server validation success
export function handleActionValidated(actionId) {
  pendingActions.delete(actionId);
}

// Check if action is pending validation
export function isActionPending(actionId) {
  return pendingActions.has(actionId);
}

// Wrapper for turn-based actions that need server validation
export async function executeTurnAction(actionType, actionData, localExecuteFn) {
  const matchId = getCurrentMatchId();
  if (!matchId) {
    // Local mode
    if (localExecuteFn) await localExecuteFn();
    return;
  }

  // Validate turn order client-side first
  if (window.firebaseDatabase) {
    try {
      const matchRef = window.firebaseDatabase.ref(`matches/${matchId}`);
      const matchSnapshot = await matchRef.once('value');
      const match = matchSnapshot.val();
      const user = getCurrentUser();
      
      if (match && user && match.currentPlayer !== user.uid) {
        showPopup('Not your turn!');
        return;
      }
    } catch (error) {
      console.error('Error checking turn order:', error);
    }
  }

  // Execute with validation
  await executeActionWithValidation(actionType, actionData, localExecuteFn);
}

