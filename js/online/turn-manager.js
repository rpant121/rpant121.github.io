// Turn Management Module
// Enforces server-authoritative turn order

import { getCurrentMatchId, getCurrentPlayerId, isCurrentPlayer1 } from './sync.js';
import { broadcastEndTurn, broadcastStartTurn } from './actions.js';
import { showPopup } from '../ui/modals.js';

let turnListeners = [];

export function isMyTurn() {
  const matchId = getCurrentMatchId();
  const playerId = getCurrentPlayerId();
  
  if (!matchId || !playerId || !window.firebaseDatabase) {
    return true; // Local mode, always allow
  }

  // Check turn order from Firebase
  return new Promise((resolve) => {
    const matchRef = window.firebaseDatabase.ref(`matches/${matchId}`);
    matchRef.once('value').then(snapshot => {
      const match = snapshot.val();
      if (match) {
        resolve(match.currentPlayer === playerId);
      } else {
        resolve(false);
      }
    }).catch(() => resolve(false));
  });
}

export async function checkTurnBeforeAction() {
  const myTurn = await isMyTurn();
  if (!myTurn) {
    showPopup('Not your turn!');
    return false;
  }
  return true;
}

export function onTurnChange(callback) {
  turnListeners.push(callback);
  return () => {
    const index = turnListeners.indexOf(callback);
    if (index > -1) {
      turnListeners.splice(index, 1);
    }
  };
}

export function setupTurnListener() {
  const matchId = getCurrentMatchId();
  if (!matchId || !window.firebaseDatabase) return;

  const matchRef = window.firebaseDatabase.ref(`matches/${matchId}`);
  matchRef.child('currentPlayer').on('value', (snapshot) => {
    const currentPlayerId = snapshot.val();
    const myId = getCurrentPlayerId();
    
    if (currentPlayerId === myId) {
      // It's my turn
      turnListeners.forEach(listener => {
        try {
          listener({ isMyTurn: true });
        } catch (error) {
          console.error('Error in turn listener:', error);
        }
      });
    } else {
      // Not my turn
      turnListeners.forEach(listener => {
        try {
          listener({ isMyTurn: false });
        } catch (error) {
          console.error('Error in turn listener:', error);
        }
      });
    }
  });
}

export async function endTurn() {
  const matchId = getCurrentMatchId();
  if (!matchId) {
    // Local mode - handle locally
    return;
  }

  const myTurn = await isMyTurn();
  if (!myTurn) {
    showPopup('Not your turn!');
    return;
  }

  // Broadcast end turn action
  await broadcastEndTurn();
  
  // Server will update currentPlayer via Cloud Function or client-side logic
  // The turn change listener will pick up the change
}

export async function startTurn() {
  const matchId = getCurrentMatchId();
  if (!matchId) {
    // Local mode
    return;
  }

  // Broadcast start turn action
  await broadcastStartTurn();
}

// Prevent actions when not your turn
export function wrapActionWithTurnCheck(actionFn) {
  return async (...args) => {
    const canProceed = await checkTurnBeforeAction();
    if (!canProceed) {
      return;
    }
    return actionFn(...args);
  };
}

