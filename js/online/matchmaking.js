// Matchmaking Module
// Handles quick match queue and automatic pairing

import { getQueueRef, createQueueEntry, DB_PATHS } from './schema.js';
import { getCurrentUser, getUserProfile } from '../auth/auth.js';

let queueEntryRef = null;
let queueListeners = [];
let isInQueue = false;

export async function joinQueue() {
  const user = getCurrentUser();
  if (!user) {
    throw new Error('Must be signed in to join matchmaking queue');
  }

  if (!window.firebaseDatabase) {
    throw new Error('Firebase Database not initialized');
  }

  if (isInQueue) {
    throw new Error('Already in matchmaking queue');
  }

  try {
    // Get user profile for skill level (default to 0)
    let skillLevel = 0;
    try {
      const profile = await getUserProfile();
      // Simple skill calculation: wins - losses
      skillLevel = (profile.wins || 0) - (profile.losses || 0);
    } catch (error) {
      console.warn('Could not get user profile for skill level:', error);
    }

    const queueEntry = createQueueEntry(user.uid, skillLevel);
    queueEntryRef = getQueueRef().child(user.uid);
    
    await queueEntryRef.set(queueEntry);
    
    isInQueue = true;
    
    // Set up listener for match found
    setupQueueListener();
    
    // Try to find a match immediately
    await tryFindMatch(user.uid, skillLevel);
    
    return true;
  } catch (error) {
    console.error('Error joining queue:', error);
    isInQueue = false;
    throw error;
  }
}

async function tryFindMatch(userId, skillLevel) {
  if (!window.firebaseDatabase) return;

  try {
    const queueRef = getQueueRef();
    const snapshot = await queueRef.once('value');
    const queue = snapshot.val();

    if (!queue) return;

    // Find best match (closest skill level, or first available)
    let bestMatch = null;
    let bestSkillDiff = Infinity;

    for (const [otherUserId, otherEntry] of Object.entries(queue)) {
      if (otherUserId === userId) continue;
      if (otherEntry.status !== 'waiting') continue;

      const skillDiff = Math.abs(otherEntry.skillLevel - skillLevel);
      if (skillDiff < bestSkillDiff) {
        bestSkillDiff = skillDiff;
        bestMatch = { userId: otherUserId, entry: otherEntry };
      }
    }

    if (bestMatch) {
      // Found a match!
      await createMatchFromQueue(userId, bestMatch.userId);
    }
  } catch (error) {
    console.error('Error finding match:', error);
  }
}

async function createMatchFromQueue(player1Id, player2Id) {
  if (!window.firebaseDatabase) return;

  try {
    // Remove both players from queue
    await getQueueRef().child(player1Id).remove();
    await getQueueRef().child(player2Id).remove();

    // Create match
    const matchId = window.firebaseDatabase.ref(DB_PATHS.MATCHES).push().key;
    
    // Import createMatch from schema
    const { createMatch } = await import('./schema.js');
    const match = createMatch(matchId, player1Id, player2Id);
    
    const matchRef = window.firebaseDatabase.ref(DB_PATHS.MATCH(matchId));
    await matchRef.set(match);

    // Update user active matches
    await window.firebaseDatabase.ref(DB_PATHS.USER_ACTIVE_MATCH(player1Id)).set(matchId);
    await window.firebaseDatabase.ref(DB_PATHS.USER_ACTIVE_MATCH(player2Id)).set(matchId);

    // Notify listeners
    queueListeners.forEach(listener => {
      try {
        listener({ type: 'match_found', matchId, player1Id, player2Id });
      } catch (error) {
        console.error('Error in queue listener:', error);
      }
    });

    isInQueue = false;
    queueEntryRef = null;

    return matchId;
  } catch (error) {
    console.error('Error creating match from queue:', error);
    throw error;
  }
}

function setupQueueListener() {
  if (!queueEntryRef) return;

  // Listen for when we're removed from queue (match found)
  queueEntryRef.on('value', (snapshot) => {
    if (!snapshot.exists()) {
      // We were removed from queue, match was found
      isInQueue = false;
      queueEntryRef = null;
    }
  });

  // Also listen to the whole queue for new entries
  const queueRef = getQueueRef();
  queueRef.on('child_added', (snapshot) => {
    const user = getCurrentUser();
    if (!user || !isInQueue) return;

    const otherUserId = snapshot.key;
    if (otherUserId === user.uid) return;

    const otherEntry = snapshot.val();
    if (otherEntry && otherEntry.status === 'waiting') {
      // Try to match with this new entry
      getUserProfile().then(profile => {
        const skillLevel = (profile.wins || 0) - (profile.losses || 0);
        tryFindMatch(user.uid, skillLevel);
      }).catch(() => {
        tryFindMatch(user.uid, 0);
      });
    }
  });
}

export async function leaveQueue() {
  if (!isInQueue || !queueEntryRef) return;

  try {
    await queueEntryRef.remove();
  } catch (error) {
    console.error('Error leaving queue:', error);
  } finally {
    isInQueue = false;
    queueEntryRef = null;
    queueListeners = [];
  }
}

export function onQueueUpdate(callback) {
  queueListeners.push(callback);
  return () => {
    const index = queueListeners.indexOf(callback);
    if (index > -1) {
      queueListeners.splice(index, 1);
    }
  };
}

export function getIsInQueue() {
  return isInQueue;
}

export function cleanup() {
  if (queueEntryRef) {
    queueEntryRef.off();
    queueEntryRef = null;
  }
  queueListeners = [];
  isInQueue = false;
}

