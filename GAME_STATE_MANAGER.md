# Game State Manager - Phase 1 Implementation

## Overview

The Game State Manager (`js/online/game-state.js`) is a centralized state management system for online battles. It serves as a single source of truth, eliminating the complex player mapping logic that was causing bugs.

## Key Benefits

1. **No Player Mapping**: Always use match player IDs ('player1' or 'player2') directly
2. **Single Source of Truth**: Firebase state drives everything
3. **Reactive Updates**: UI automatically updates when state changes
4. **Type-Safe**: Clear getter methods for all state properties

## API Reference

### Initialization

```javascript
import { gameState } from './js/online/game-state.js';

// Initialize for a match (called automatically by sync.js)
await gameState.init(matchId);
```

### Getting State

```javascript
// Get full state
const state = gameState.getState();

// Get player state
const player1State = gameState.getPlayerState('player1');
const player2State = gameState.getPlayerState('player2');

// Get specific data
const activePokemon = gameState.getActivePokemon('player1');
const bench = gameState.getBench('player1');
const hand = gameState.getHand('player1');
const deck = gameState.getDeck('player1');
const discard = gameState.getDiscard('player1');
const points = gameState.getPoints(); // { player1: 0, player2: 0 }
const turnInfo = gameState.getTurnInfo(); // { currentPlayer, turnNumber, firstPlayer }
```

### Updating State

```javascript
// Update specific player state
await gameState.updatePlayerState('player1', {
  hand: newHand,
  active: newActivePokemon
});

// Update points
await gameState.updatePoints('player1', 2);

// Update turn info
await gameState.updateTurnInfo({
  currentPlayer: 'player1',
  turnNumber: 3
});

// Update any state (Firebase path format)
await gameState.updateState({
  'player1.hand': newHand,
  'p1Points': 2
});
```

### Subscribing to Changes

```javascript
// Subscribe to state changes
const unsubscribe = gameState.subscribe((newState, oldState) => {
  console.log('State changed:', newState);
  // Update UI here
});

// Unsubscribe when done
unsubscribe();
```

## Migration Guide

### Old Way (Complex Player Mapping)

```javascript
// OLD: Complex mapping
const isP1 = isCurrentPlayer1();
const matchOwner = (isP1 && owner === 'player1') || (!isP1 && owner === 'player2') 
  ? 'player1' 
  : 'player2';

await updateGameStatePartial({
  [`${matchOwner}/hand`]: newHand
});
```

### New Way (Direct Match Player IDs)

```javascript
// NEW: Direct match player IDs
// Determine which match player you are
const myPlayerId = isCurrentPlayer1() ? 'player1' : 'player2';

// Use match player IDs directly
await gameState.updatePlayerState('player1', {
  hand: newHand
});
```

## Example Usage

### Example 1: Getting Active Pokemon

```javascript
// Get active Pokemon for player1 (match player)
const active = gameState.getActivePokemon('player1');
if (active) {
  console.log(`Active: ${active.name}, HP: ${active.chp}/${active.hp}`);
}
```

### Example 2: Updating Hand After Drawing

```javascript
// Draw a card
const deck = gameState.getDeck('player1');
const hand = gameState.getHand('player1');
const drawnCard = deck[0];
const newHand = [...hand, drawnCard];
const newDeck = deck.slice(1);

// Update state
await gameState.updatePlayerState('player1', {
  hand: newHand,
  deck: newDeck
});

// UI updates automatically via subscribers!
```

### Example 3: Retreat Operation

```javascript
// Get current state
const playerState = gameState.getPlayerState('player1');
const active = playerState.active;
const bench = playerState.bench;
const promotedPokemon = bench.find(p => p.instanceId === selectedInstanceId);

// Update state: swap active and bench
await gameState.updatePlayerState('player1', {
  active: promotedPokemon,
  bench: bench.map(p => 
    p.instanceId === promotedPokemon.instanceId ? active : p
  )
});

// Remove energy (update discard)
await gameState.updatePlayerState('player1', {
  discard: {
    ...playerState.discard,
    energyCounts: {
      ...playerState.discard.energyCounts,
      fire: (playerState.discard.energyCounts.fire || 0) + 1
    }
  }
});
```

## Integration Status

- ✅ Created `game-state.js` module
- ✅ Integrated into `sync.js` initialization
- ✅ Exported to `globalThis` for backward compatibility
- ⏳ Migrating features to use state manager (ongoing)

## Next Steps

1. Create example usage in `online-battle.html` for simple operations
2. Migrate one feature at a time (start with simple ones like drawing cards)
3. Test thoroughly before removing old code
4. Document any issues or improvements needed

