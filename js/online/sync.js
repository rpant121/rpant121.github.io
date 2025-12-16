// Game State Synchronization Module
// Handles real-time synchronization of game state between players

import { getMatchRef, DB_PATHS } from './schema.js';

let currentMatchId = null;
let currentPlayerId = null;
let isPlayer1 = false;
let syncListeners = [];
let stateListeners = [];
let actionListeners = [];
let connectionListeners = [];
let isConnected = false;
let matchRef = null;
let stateRef = null;
let actionsRef = null;
let presenceRef = null;

export function initSync(matchId, playerId) {
  if (!window.firebaseDatabase) {
    throw new Error('Firebase Database not initialized');
  }

  currentMatchId = matchId;
  currentPlayerId = playerId;
  
  // Determine if this player is player1 or player2
  matchRef = getMatchRef(matchId);
  
  matchRef.once('value').then(snapshot => {
    const match = snapshot.val();
    if (!match) {
      throw new Error('Match not found');
    }
    
    isPlayer1 = match.player1Id === playerId;
    
    // Set up listeners
    setupStateListener();
    setupActionsListener();
    setupPresenceListener();
    setupConnectionListener();
    
    isConnected = true;
    notifyConnectionListeners(true);
  }).catch(error => {
    console.error('Error initializing sync:', error);
    isConnected = false;
    notifyConnectionListeners(false);
  });
}

function setupStateListener() {
  stateRef = matchRef.child('gameState');
  
  stateRef.on('value', (snapshot) => {
    const gameState = snapshot.val();
    if (gameState) {
      // Notify all state listeners
      stateListeners.forEach(listener => {
        try {
          listener(gameState, isPlayer1);
        } catch (error) {
          console.error('Error in state listener:', error);
        }
      });
    }
  });
}

function setupActionsListener() {
  actionsRef = matchRef.child('actions');
  
  // Listen for new actions (only from opponent)
  actionsRef.orderByChild('timestamp').limitToLast(1).on('child_added', (snapshot) => {
    const action = snapshot.val();
    if (action && action.playerId !== currentPlayerId) {
      // This is an action from the opponent
      actionListeners.forEach(listener => {
        try {
          listener(action);
        } catch (error) {
          console.error('Error in action listener:', error);
        }
      });
    }
  });
}

function setupPresenceListener() {
  if (!currentPlayerId) return;
  
  // Set up presence tracking
  presenceRef = window.firebaseDatabase.ref(DB_PATHS.PRESENCE(currentPlayerId));
  
  // Mark as online
  presenceRef.set({
    online: true,
    lastSeen: (window.firebaseApp || firebase)?.database?.ServerValue?.TIMESTAMP || Date.now(),
    matchId: currentMatchId
  });
  
  // Mark as offline when disconnected
  presenceRef.onDisconnect().set({
    online: false,
    lastSeen: (window.firebaseApp || firebase)?.database?.ServerValue?.TIMESTAMP || Date.now()
  });
  
  // Listen for opponent presence
  matchRef.once('value').then(snapshot => {
    const match = snapshot.val();
    const opponentId = isPlayer1 ? match.player2Id : match.player1Id;
    
    if (opponentId) {
      const opponentPresenceRef = window.firebaseDatabase.ref(DB_PATHS.PRESENCE(opponentId));
      opponentPresenceRef.on('value', (snapshot) => {
        const presence = snapshot.val();
        if (presence) {
          const isOpponentOnline = presence.online === true;
          // Notify presence listeners
          syncListeners.forEach(listener => {
            try {
              listener({ type: 'presence', online: isOpponentOnline, opponentId });
            } catch (error) {
              console.error('Error in sync listener:', error);
            }
          });
        }
      });
    }
  });
}

export function onPresenceChange(callback) {
  return onSync((update) => {
    if (update.type === 'presence') {
      callback(update);
    }
  });
}

function setupConnectionListener() {
  if (!matchRef) return;
  
  const connectedRef = window.firebaseDatabase.ref('.info/connected');
  connectedRef.on('value', (snapshot) => {
    const connected = snapshot.val() === true;
    isConnected = connected;
    notifyConnectionListeners(connected);
    
    if (connected && presenceRef) {
      // Update presence when reconnected
      presenceRef.update({
        online: true,
        lastSeen: (window.firebaseApp || firebase)?.database?.ServerValue?.TIMESTAMP || Date.now()
      });
    }
  });
}

export function onStateChange(callback) {
  stateListeners.push(callback);
  return () => {
    const index = stateListeners.indexOf(callback);
    if (index > -1) {
      stateListeners.splice(index, 1);
    }
  };
}

export function onAction(callback) {
  actionListeners.push(callback);
  return () => {
    const index = actionListeners.indexOf(callback);
    if (index > -1) {
      actionListeners.splice(index, 1);
    }
  };
}

export function onSync(callback) {
  syncListeners.push(callback);
  return () => {
    const index = syncListeners.indexOf(callback);
    if (index > -1) {
      syncListeners.splice(index, 1);
    }
  };
}

export function onConnectionChange(callback) {
  connectionListeners.push(callback);
  return () => {
    const index = connectionListeners.indexOf(callback);
    if (index > -1) {
      connectionListeners.splice(index, 1);
    }
  };
}

function notifyConnectionListeners(connected) {
  connectionListeners.forEach(listener => {
    try {
      listener(connected);
    } catch (error) {
      console.error('Error in connection listener:', error);
    }
  });
}

export async function updateGameState(gameState) {
  if (!stateRef || !isConnected) {
    console.warn('Cannot update game state: not connected');
    return;
  }

  try {
    await stateRef.set(gameState);
  } catch (error) {
    console.error('Error updating game state:', error);
    throw error;
  }
}

export async function updateGameStatePartial(updates) {
  if (!stateRef || !isConnected) {
    console.warn('Cannot update game state: not connected');
    return;
  }

  try {
    await stateRef.update(updates);
  } catch (error) {
    console.error('Error updating game state:', error);
    throw error;
  }
}

export function getCurrentMatchId() {
  return currentMatchId;
}

export function getCurrentPlayerId() {
  return currentPlayerId;
}

export function isCurrentPlayer1() {
  return isPlayer1;
}

export function getIsConnected() {
  return isConnected;
}

export async function reconnect() {
  if (!currentMatchId || !currentPlayerId) {
    return false;
  }

  try {
    // Re-initialize sync
    await initSync(currentMatchId, currentPlayerId);
    return true;
  } catch (error) {
    console.error('Error reconnecting:', error);
    return false;
  }
}

export function cleanup() {
  // Remove all listeners
  if (stateRef) {
    stateRef.off();
    stateRef = null;
  }
  
  if (actionsRef) {
    actionsRef.off();
    actionsRef = null;
  }
  
  if (presenceRef) {
    presenceRef.onDisconnect().cancel();
    presenceRef.set({
      online: false,
      lastSeen: (window.firebaseApp || firebase)?.database?.ServerValue?.TIMESTAMP || Date.now()
    });
    presenceRef = null;
  }
  
  if (matchRef) {
    matchRef.off();
    matchRef = null;
  }
  
  // Clear listeners
  syncListeners = [];
  stateListeners = [];
  actionListeners = [];
  connectionListeners = [];
  
  currentMatchId = null;
  currentPlayerId = null;
  isPlayer1 = false;
  isConnected = false;
}

// Handle disconnection and attempt reconnection
export function setupReconnectionHandler() {
  if (typeof window === 'undefined') return;

  let reconnectTimeout = null;
  let reconnectAttempts = 0;
  const maxReconnectAttempts = 5;

  onConnectionChange((connected) => {
    if (!connected) {
      // Disconnected - attempt to reconnect
      if (reconnectAttempts < maxReconnectAttempts) {
        reconnectTimeout = setTimeout(async () => {
          reconnectAttempts++;
          const success = await reconnect();
          if (success) {
            reconnectAttempts = 0;
            showPopup('Reconnected to game');
          } else if (reconnectAttempts < maxReconnectAttempts) {
            // Try again
            setupReconnectionHandler();
          } else {
            showPopup('Connection lost. Please refresh the page.');
          }
        }, 2000 * reconnectAttempts); // Exponential backoff
      }
    } else {
      // Connected - clear any pending reconnection
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
        reconnectTimeout = null;
      }
      reconnectAttempts = 0;
    }
  });

  // Also listen for browser online/offline events
  window.addEventListener('online', async () => {
    const success = await reconnect();
    if (success) {
      showPopup('Reconnected to game');
    }
  });
}

