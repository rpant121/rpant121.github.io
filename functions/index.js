// Firebase Cloud Functions for server-side validation

const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

const db = admin.database();

// Validate a game action
exports.validateAction = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { matchId, actionType, actionData } = data;
  
  if (!matchId || !actionType) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing required parameters');
  }

  try {
    const matchRef = db.ref(`matches/${matchId}`);
    const matchSnapshot = await matchRef.once('value');
    const match = matchSnapshot.val();

    if (!match) {
      throw new functions.https.HttpsError('not-found', 'Match not found');
    }

    if (match.player1Id !== context.auth.uid && match.player2Id !== context.auth.uid) {
      throw new functions.https.HttpsError('permission-denied', 'Not a player in this match');
    }

    const isPlayer1 = match.player1Id === context.auth.uid;
    const currentPlayerId = match.currentPlayer;

    // Validate turn order
    if (currentPlayerId !== context.auth.uid) {
      return {
        valid: false,
        reason: 'Not your turn'
      };
    }

    // Basic validation based on action type
    const validation = await validateActionType(actionType, actionData, match, isPlayer1);
    
    return validation;
  } catch (error) {
    console.error('Error validating action:', error);
    throw new functions.https.HttpsError('internal', 'Validation failed', error);
  }
});

async function validateActionType(actionType, actionData, match, isPlayer1) {
  const gameState = match.gameState || {};
  const playerState = isPlayer1 ? gameState.player1 : gameState.player2;

  switch (actionType) {
    case 'attack':
      // Validate attack action
      if (!actionData.attackName || !actionData.pokemonId) {
        return { valid: false, reason: 'Invalid attack data' };
      }
      // Additional attack validation can be added here
      return { valid: true };

    case 'attach_energy':
      // Validate energy attachment
      if (!actionData.energyType || !actionData.pokemonId) {
        return { valid: false, reason: 'Invalid energy data' };
      }
      // Check if energy already attached this turn
      if (actionData.hasAttachedEnergyThisTurn) {
        return { valid: false, reason: 'Already attached energy this turn' };
      }
      return { valid: true };

    case 'play_trainer':
      // Validate trainer card
      if (!actionData.trainerType || !actionData.cardId) {
        return { valid: false, reason: 'Invalid trainer data' };
      }
      // Check if supporter already played
      if (actionData.trainerType === 'supporter' && actionData.hasPlayedSupporterThisTurn) {
        return { valid: false, reason: 'Already played supporter this turn' };
      }
      return { valid: true };

    case 'end_turn':
      return { valid: true };

    default:
      return { valid: true }; // Allow other actions by default
  }
}

// Process turn transition
exports.processTurn = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { matchId } = data;
  
  if (!matchId) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing matchId');
  }

  try {
    const matchRef = db.ref(`matches/${matchId}`);
    const matchSnapshot = await matchRef.once('value');
    const match = matchSnapshot.val();

    if (!match) {
      throw new functions.https.HttpsError('not-found', 'Match not found');
    }

    if (match.currentPlayer !== context.auth.uid) {
      throw new functions.https.HttpsError('permission-denied', 'Not your turn');
    }

    // Switch turns
    const nextPlayer = match.currentPlayer === match.player1Id ? match.player2Id : match.player1Id;
    const newTurnNumber = match.turnNumber + 1;

    await matchRef.update({
      currentPlayer: nextPlayer,
      turnNumber: newTurnNumber
    });

    return { success: true, newTurn: newTurnNumber, currentPlayer: nextPlayer };
  } catch (error) {
    console.error('Error processing turn:', error);
    throw new functions.https.HttpsError('internal', 'Turn processing failed', error);
  }
});

// Calculate damage (server-side validation)
exports.calculateDamage = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { matchId, attackData, attackerId, defenderId } = data;
  
  if (!matchId || !attackData || !attackerId || !defenderId) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing required parameters');
  }

  try {
    const matchRef = db.ref(`matches/${matchId}`);
    const matchSnapshot = await matchRef.once('value');
    const match = matchSnapshot.val();

    if (!match) {
      throw new functions.https.HttpsError('not-found', 'Match not found');
    }

    // Basic damage calculation (can be expanded)
    let damage = attackData.baseDamage || 0;
    
    // Apply modifiers from actionData if provided
    if (attackData.modifiers) {
      damage += attackData.modifiers.damageBoost || 0;
      damage -= attackData.modifiers.damageReduction || 0;
    }

    // Ensure damage is non-negative
    damage = Math.max(0, damage);

    return { damage, validated: true };
  } catch (error) {
    console.error('Error calculating damage:', error);
    throw new functions.https.HttpsError('internal', 'Damage calculation failed', error);
  }
});

// Cleanup old rooms and matches (scheduled function)
exports.cleanupOldRooms = functions.pubsub.schedule('every 1 hours').onRun(async (context) => {
  const roomsRef = db.ref('rooms');
  const roomsSnapshot = await roomsRef.once('value');
  const rooms = roomsSnapshot.val();

  if (!rooms) return null;

  const now = Date.now();
  const maxAge = 24 * 60 * 60 * 1000; // 24 hours

  const updates = {};
  for (const [roomId, room] of Object.entries(rooms)) {
    const createdAt = room.createdAt || 0;
    if (now - createdAt > maxAge && room.status !== 'in-progress') {
      updates[roomId] = null; // Mark for deletion
    }
  }

  if (Object.keys(updates).length > 0) {
    await roomsRef.update(updates);
  }

  return null;
});

