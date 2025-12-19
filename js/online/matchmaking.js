// Matchmaking Module
// Handles quick match queue and automatic pairing

import { getQueueRef, createQueueEntry, DB_PATHS } from './schema.js';
import { getCurrentUser, getUserProfile } from '../auth/auth.js';

let queueEntryRef = null;
let queueListeners = [];
let isInQueue = false;

export async function joinQueue(deck = null, energy = []) {
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

    const queueEntry = createQueueEntry(user.uid, skillLevel, deck, energy);
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
    // Get queue entries to retrieve decks
    const queueRef = getQueueRef();
    const player1Entry = (await queueRef.child(player1Id).once('value')).val();
    const player2Entry = (await queueRef.child(player2Id).once('value')).val();

    // Validate decks
    const player1Deck = player1Entry?.deck || [];
    const player2Deck = player2Entry?.deck || [];
    
    console.log('Creating match from queue:', {
      player1Id,
      player2Id,
      player1DeckLength: player1Deck.length,
      player2DeckLength: player2Deck.length,
      player1DeckFirstCard: player1Deck[0]?.name,
      player2DeckFirstCard: player2Deck[0]?.name,
      player1Energy: player1Entry?.energy || [],
      player2Energy: player2Entry?.energy || []
    });

    if (!player1Deck || player1Deck.length === 0) {
      throw new Error('Player 1 deck is missing or empty');
    }
    if (!player2Deck || player2Deck.length === 0) {
      throw new Error('Player 2 deck is missing or empty');
    }

    // Remove both players from queue
    await queueRef.child(player1Id).remove();
    await queueRef.child(player2Id).remove();

    // Create match with decks from queue entries
    const matchId = window.firebaseDatabase.ref(DB_PATHS.MATCHES).push().key;
    
    // Import createMatch from schema
    const { createMatch } = await import('./schema.js');
    const match = createMatch(
      matchId, 
      player1Id, 
      player2Id,
      null, // roomId
      player1Deck,
      player1Entry?.energy || [],
      player2Deck,
      player2Entry?.energy || []
    );
    
    // Validate expanded decks
    const expandedPlayer1Deck = match.gameState.player1.deck || [];
    const expandedPlayer2Deck = match.gameState.player2.deck || [];
    
    console.log('Match created with expanded decks:', {
      matchId,
      expandedPlayer1DeckLength: expandedPlayer1Deck.length,
      expandedPlayer2DeckLength: expandedPlayer2Deck.length,
      expandedPlayer1DeckFirstCard: expandedPlayer1Deck[0]?.name,
      expandedPlayer2DeckFirstCard: expandedPlayer2Deck[0]?.name
    });
    
    if (expandedPlayer1Deck.length < 20) {
      console.error('Player 1 deck expansion failed:', {
        originalLength: player1Deck.length,
        expandedLength: expandedPlayer1Deck.length,
        firstCard: player1Deck[0]
      });
    }
    if (expandedPlayer2Deck.length < 20) {
      console.error('Player 2 deck expansion failed:', {
        originalLength: player2Deck.length,
        expandedLength: expandedPlayer2Deck.length,
        firstCard: player2Deck[0]
      });
    }
    
    const matchRef = window.firebaseDatabase.ref(DB_PATHS.MATCH(matchId));
    await matchRef.set(match);

    // Update current user's active match (can only write to own activeMatch)
    const currentUser = getCurrentUser();
    if (currentUser) {
      const currentUserId = currentUser.uid;
      if (currentUserId === player1Id || currentUserId === player2Id) {
        await window.firebaseDatabase.ref(DB_PATHS.USER_ACTIVE_MATCH(currentUserId)).set(matchId);
      }
    }
    // The other player will set their own activeMatch when they receive the match notification

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
  queueEntryRef.on('value', async (snapshot) => {
    if (!snapshot.exists()) {
      // We were removed from queue, match was found
      isInQueue = false;
      queueEntryRef = null;
      
      // Find the match that was created for us
      const user = getCurrentUser();
      if (user && window.firebaseDatabase) {
        try {
          // Check activeMatch first
          const { DB_PATHS } = await import('./schema.js');
          const activeMatchRef = window.firebaseDatabase.ref(DB_PATHS.USER_ACTIVE_MATCH(user.uid));
          const activeMatchSnapshot = await activeMatchRef.once('value');
          const matchId = activeMatchSnapshot.val();
          
          if (matchId) {
            // Match found via activeMatch
            queueListeners.forEach(listener => {
              try {
                listener({ type: 'match_found', matchId });
              } catch (error) {
                console.error('Error in queue listener:', error);
              }
            });
          } else {
            // activeMatch not set yet, check all matches to find one with us as a player
            const matchesRef = window.firebaseDatabase.ref(DB_PATHS.MATCHES);
            const matchesSnapshot = await matchesRef.orderByChild('createdAt').limitToLast(10).once('value');
            const matches = matchesSnapshot.val();
            
            if (matches) {
              // Find the most recent match where we're a player
              for (const [id, match] of Object.entries(matches)) {
                if (match.player1Id === user.uid || match.player2Id === user.uid) {
                  // Found our match!
                  // Set our activeMatch
                  await activeMatchRef.set(id);
                  
                  // Notify listeners
                  queueListeners.forEach(listener => {
                    try {
                      listener({ type: 'match_found', matchId: id, player1Id: match.player1Id, player2Id: match.player2Id });
                    } catch (error) {
                      console.error('Error in queue listener:', error);
                    }
                  });
                  break;
                }
              }
            }
          }
        } catch (error) {
          console.error('Error finding match after queue removal:', error);
        }
      }
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

