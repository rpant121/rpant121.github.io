// Database Schema Documentation and Helper Functions
// Firebase Realtime Database structure

export const DB_PATHS = {
  // User profiles
  USER: (userId) => `users/${userId}`,
  USER_PROFILE: (userId) => `users/${userId}/profile`,
  USER_ACTIVE_MATCH: (userId) => `users/${userId}/activeMatch`,
  
  // Rooms (for direct invites)
  ROOM: (roomId) => `rooms/${roomId}`,
  ROOMS: 'rooms',
  
  // Matches (active games)
  MATCH: (matchId) => `matches/${matchId}`,
  MATCHES: 'matches',
  MATCH_STATE: (matchId) => `matches/${matchId}/gameState`,
  MATCH_ACTIONS: (matchId) => `matches/${matchId}/actions`,
  
  // Matchmaking queue
  QUEUE: 'matchmaking/queue',
  QUEUE_USER: (userId) => `matchmaking/queue/${userId}`,
  
  // Presence tracking
  PRESENCE: (userId) => `presence/${userId}`,
};

// User Profile Schema
export const createUserProfile = (user, additionalData = {}) => ({
  uid: user.uid,
  email: user.email || '',
  displayName: user.displayName || user.email?.split('@')[0] || 'Player',
  wins: 0,
  losses: 0,
  createdAt: (window.firebaseApp || firebase)?.database?.ServerValue?.TIMESTAMP || Date.now(),
  ...additionalData
});

// Room Schema (for direct invites)
export const createRoom = (roomId, hostId, roomCode, player1Deck = null, player1Energy = []) => ({
  roomId,
  hostId,
  player1Id: hostId,
  player2Id: null,
  status: 'waiting',
  roomCode,
  player1Deck,
  player1Energy,
  player2Deck: null,
  player2Energy: [],
  createdAt: (window.firebaseApp || firebase)?.database?.ServerValue?.TIMESTAMP || Date.now(),
  gameState: null
});

// Match Schema (active game)
export const createMatch = (matchId, player1Id, player2Id, roomId = null, player1Deck = [], player1Energy = [], player2Deck = [], player2Energy = []) => {
  // Expand deck (convert quantity-based to individual cards)
  function expandDeck(raw) {
    if (!raw || !Array.isArray(raw)) return [];
    
    // Check if deck is already expanded (has 20+ cards with quantity 1)
    const totalCards = raw.reduce((sum, c) => sum + (Number(c.quantity) || 1), 0);
    const isAlreadyExpanded = raw.length >= 20 && raw.every(c => (Number(c.quantity) || 1) === 1);
    
    if (isAlreadyExpanded && totalCards >= 20) {
      // Deck is already expanded, just ensure all cards have the right structure
      return raw.map(c => {
        const cardNum = c.number ?? c.num ?? null;
        return {
          ...c,
          quantity: 1,
          number: cardNum,
          num: cardNum
        };
      });
    }
    
    // Deck needs to be expanded
    const out = [];
    raw.forEach(c => {
      if (!c) return;
      
      // Handle different card formats
      const cardNum = c.number ?? c.num ?? null;
      if (!c.name || !c.set || cardNum == null) {
        console.warn('Skipping invalid card in expandDeck:', c);
        return;
      }
      
      const n = Number(c.quantity) || 1;
      for (let i = 0; i < n; i++) {
        out.push({ 
          ...c, 
          quantity: 1,
          number: cardNum,
          num: cardNum // Ensure both fields are set
        });
      }
    });
    
    if (out.length < 20) {
      console.error('Deck expansion resulted in less than 20 cards:', {
        originalLength: raw.length,
        expandedLength: out.length,
        originalCards: raw.map(c => ({ name: c.name, quantity: c.quantity }))
      });
    }
    
    return out;
  }

  return {
    matchId,
    player1Id,
    player2Id,
    roomId,
    status: 'in-progress',
    currentPlayer: player1Id,
    turnNumber: 1,
    createdAt: (window.firebaseApp || firebase)?.database?.ServerValue?.TIMESTAMP || Date.now(),
    finishedAt: null,
    winner: null,
    gameState: {
      player1: {
        deck: expandDeck(player1Deck),
        hand: [],
        discard: { cards: [], energyCounts: {} },
        energyTypes: player1Energy || [],
        currentTurnEnergy: null,
        nextTurnEnergy: null
      },
      player2: {
        deck: expandDeck(player2Deck),
        hand: [],
        discard: { cards: [], energyCounts: {} },
        energyTypes: player2Energy || [],
        currentTurnEnergy: null,
        nextTurnEnergy: null
      },
      p1Points: 0,
      p2Points: 0,
      firstPlayer: null,
      turnNumber: 1
    },
    actions: []
  };
};

// Matchmaking Queue Entry Schema
export const createQueueEntry = (userId, skillLevel = 0, deck = null, energy = []) => ({
  userId,
  skillLevel,
  deck,
  energy,
  joinedAt: (window.firebaseApp || firebase)?.database?.ServerValue?.TIMESTAMP || Date.now(),
  status: 'waiting'
});

// Action Schema (for game actions)
export const createAction = (matchId, playerId, actionType, actionData, timestamp = null) => ({
  matchId,
  playerId,
  actionType,
  actionData,
  timestamp: timestamp || (window.firebaseApp || firebase)?.database?.ServerValue?.TIMESTAMP || Date.now(),
  validated: false,
  rejected: false,
  rejectionReason: null
});

// Helper functions to get database references
export function getUserRef(userId) {
  if (!window.firebaseDatabase) throw new Error('Firebase database not initialized');
  return window.firebaseDatabase.ref(DB_PATHS.USER(userId));
}

export function getRoomRef(roomId) {
  if (!window.firebaseDatabase) throw new Error('Firebase database not initialized');
  return window.firebaseDatabase.ref(DB_PATHS.ROOM(roomId));
}

export function getMatchRef(matchId) {
  if (!window.firebaseDatabase) throw new Error('Firebase database not initialized');
  return window.firebaseDatabase.ref(DB_PATHS.MATCH(matchId));
}

export function getQueueRef() {
  if (!window.firebaseDatabase) throw new Error('Firebase database not initialized');
  return window.firebaseDatabase.ref(DB_PATHS.QUEUE);
}

export function getPresenceRef(userId) {
  if (!window.firebaseDatabase) throw new Error('Firebase database not initialized');
  return window.firebaseDatabase.ref(DB_PATHS.PRESENCE(userId));
}

