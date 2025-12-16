// Lobby Module
// Handles room creation, joining via code, and room state management

import { getRoomRef, createRoom as createRoomData, DB_PATHS } from './schema.js';
import { getCurrentUser } from '../auth/auth.js';

let currentRoomId = null;
let currentRoomCode = null;
let roomListeners = [];

// Generate a random room code (6-8 characters, alphanumeric)
function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude confusing characters
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Check if room code is available
async function isRoomCodeAvailable(code) {
  if (!window.firebaseDatabase) return false;
  
  try {
    const roomsRef = window.firebaseDatabase.ref(DB_PATHS.ROOMS);
    const snapshot = await roomsRef.orderByChild('roomCode').equalTo(code).once('value');
    return !snapshot.exists();
  } catch (error) {
    // If permission denied, assume code is available (will fail later if duplicate)
    if (error.code === 'PERMISSION_DENIED' || error.message?.includes('permission')) {
      console.warn('Permission denied checking room code, assuming available');
      return true; // Allow creation, will fail if duplicate
    }
    console.error('Error checking room code availability:', error);
    return false;
  }
}

// Generate a unique room code
async function generateUniqueRoomCode() {
  let code = generateRoomCode();
  let attempts = 0;
  const maxAttempts = 10;
  
  while (!(await isRoomCodeAvailable(code)) && attempts < maxAttempts) {
    code = generateRoomCode();
    attempts++;
  }
  
  if (attempts >= maxAttempts) {
    throw new Error('Failed to generate unique room code');
  }
  
  return code;
}

export async function createRoom(player1Deck = null, player1Energy = []) {
  const user = getCurrentUser();
  if (!user) {
    throw new Error('Must be signed in to create a room');
  }

  if (!window.firebaseDatabase) {
    throw new Error('Firebase Database not initialized');
  }

  try {
    const roomCode = await generateUniqueRoomCode();
    const roomId = window.firebaseDatabase.ref(DB_PATHS.ROOMS).push().key;
    
    const room = createRoomData(roomId, user.uid, roomCode, player1Deck, player1Energy);
    
    const roomRef = getRoomRef(roomId);
    await roomRef.set(room);
    
    currentRoomId = roomId;
    currentRoomCode = roomCode;
    
    // Set up listener for room changes
    setupRoomListener(roomId);
    
    return { roomId, roomCode, room };
  } catch (error) {
    console.error('Error creating room:', error);
    throw error;
  }
}

export async function joinRoomByCode(roomCode, player2Deck = null, player2Energy = []) {
  const user = getCurrentUser();
  if (!user) {
    throw new Error('Must be signed in to join a room');
  }

  if (!window.firebaseDatabase) {
    throw new Error('Firebase Database not initialized');
  }

  try {
    const roomsRef = window.firebaseDatabase.ref(DB_PATHS.ROOMS);
    const snapshot = await roomsRef.orderByChild('roomCode').equalTo(roomCode).once('value');
    
    if (!snapshot.exists()) {
      throw new Error('Room not found');
    }

    const roomData = snapshot.val();
    const roomId = Object.keys(roomData)[0];
    const room = roomData[roomId];

    if (room.status !== 'waiting') {
      throw new Error('Room is not available');
    }

    if (room.player1Id === user.uid) {
      throw new Error('You are already in this room');
    }

    if (room.player2Id) {
      throw new Error('Room is full');
    }

    // Join the room
    const roomRef = getRoomRef(roomId);
    await roomRef.update({
      player2Id: user.uid,
      player2Deck: player2Deck,
      player2Energy: player2Energy,
      status: 'ready' // Both players are ready
    });

    currentRoomId = roomId;
    currentRoomCode = roomCode;

    // Set up listener for room changes
    setupRoomListener(roomId);

    return { roomId, roomCode, room: { ...room, player2Id: user.uid, player2Deck, player2Energy, status: 'ready' } };
  } catch (error) {
    console.error('Error joining room:', error);
    throw error;
  }
}

function setupRoomListener(roomId) {
  const roomRef = getRoomRef(roomId);
  
  roomRef.on('value', (snapshot) => {
    const room = snapshot.val();
    if (room) {
      roomListeners.forEach(listener => {
        try {
          listener(room);
        } catch (error) {
          console.error('Error in room listener:', error);
        }
      });
    }
  });
}

export function onRoomChange(callback) {
  roomListeners.push(callback);
  return () => {
    const index = roomListeners.indexOf(callback);
    if (index > -1) {
      roomListeners.splice(index, 1);
    }
  };
}

export function getCurrentRoomId() {
  return currentRoomId;
}

export function getCurrentRoomCode() {
  return currentRoomCode;
}

export async function leaveRoom() {
  if (!currentRoomId) return;

  const user = getCurrentUser();
  if (!user) return;

  try {
    const roomRef = getRoomRef(currentRoomId);
    const snapshot = await roomRef.once('value');
    const room = snapshot.val();

    if (room) {
      if (room.player1Id === user.uid) {
        // Host is leaving, delete the room
        await roomRef.remove();
      } else if (room.player2Id === user.uid) {
        // Player 2 is leaving, remove them
        await roomRef.update({
          player2Id: null,
          status: 'waiting'
        });
      }
    }
  } catch (error) {
    console.error('Error leaving room:', error);
  } finally {
    currentRoomId = null;
    currentRoomCode = null;
    roomListeners = [];
  }
}

export async function startGameFromRoom() {
  if (!currentRoomId) {
    throw new Error('Not in a room');
  }

  const user = getCurrentUser();
  if (!user) {
    throw new Error('Must be signed in');
  }

  if (!window.firebaseDatabase) {
    throw new Error('Firebase Database not initialized');
  }

  try {
    const roomRef = getRoomRef(currentRoomId);
    const snapshot = await roomRef.once('value');
    const room = snapshot.val();

    if (!room) {
      throw new Error('Room not found');
    }

    if (room.status !== 'ready') {
      throw new Error('Room is not ready');
    }

    if (room.player1Id !== user.uid && room.player2Id !== user.uid) {
      throw new Error('You are not in this room');
    }

    // Create a match from the room
    const matchId = window.firebaseDatabase.ref(DB_PATHS.MATCHES).push().key;
    
    // Import createMatch from schema
    const { createMatch } = await import('./schema.js');
    const match = createMatch(
      matchId, 
      room.player1Id, 
      room.player2Id, 
      currentRoomId,
      room.player1Deck || [],
      room.player1Energy || [],
      room.player2Deck || [],
      room.player2Energy || []
    );
    
    const matchRef = window.firebaseDatabase.ref(DB_PATHS.MATCH(matchId));
    await matchRef.set(match);

    // Update room to reference the match
    await roomRef.update({
      status: 'in-progress',
      matchId: matchId
    });

    // Update user active matches (only set for current user to avoid permission issues)
    if (user.uid === room.player1Id || user.uid === room.player2Id) {
      await window.firebaseDatabase.ref(DB_PATHS.USER_ACTIVE_MATCH(user.uid)).set(matchId);
    }

    return matchId;
  } catch (error) {
    console.error('Error starting game from room:', error);
    throw error;
  }
}

export function cleanup() {
  roomListeners = [];
  currentRoomId = null;
  currentRoomCode = null;
}

