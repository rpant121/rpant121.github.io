# Online Battle V2 - Proof of Concept

## Overview

This is a **proof-of-concept** implementation of a clean, state-first architecture for online battles. It demonstrates how the game can be rebuilt from scratch using:

1. **State Manager** - Single source of truth (already created)
2. **Clean Action Handlers** - No player mapping complexity
3. **Reactive UI** - Automatically updates when state changes
4. **Simple Architecture** - Easy to understand and maintain

## Key Features Demonstrated

### 1. Clean Retreat System

The retreat handler is **~80 lines** vs **200+ lines** in the original:

```javascript
async function handleRetreat(playerId, benchIndex) {
  // Get state directly (no mapping!)
  const state = gameState.getState();
  const player = state[playerId];
  
  // Validate
  if (!player.active || !player.bench[benchIndex]) return;
  
  // Calculate retreat cost
  const retreatCost = player.active.retreatCost || 0;
  const energy = player.active.energy || [];
  if (energy.length < retreatCost) return;
  
  // Update state (ONE call!)
  await gameState.updatePlayerState(playerId, {
    active: newActive,
    bench: newBench,
    discard: newDiscard
  });
  
  // UI updates automatically via subscribers!
}
```

**No player mapping needed!** Just use match player IDs directly.

### 2. Reactive UI Rendering

UI automatically updates when state changes:

```javascript
// Subscribe once
gameState.subscribe((newState, oldState) => {
  renderAll(newState); // UI updates automatically!
});

// No manual UI updates needed after state changes!
```

### 3. Simple Opponent Action Handling

Opponent actions are handled cleanly:

```javascript
onAction((action) => {
  if (action.actionType === ACTION_TYPES.RETREAT) {
    handleOpponentRetreat(action.actionData);
    // State already synced via Firebase, just ensure UI is updated
  }
});
```

## Architecture Comparison

### Old System (online-battle.html)
```
User Action
  ↓
Local State Update (playerState)
  ↓
Calculate Match Player Mapping (200+ lines)
  ↓
Firebase Sync (updateGameStatePartial)
  ↓
onStateChange Callback
  ↓
More Player Mapping (200+ lines)
  ↓
Update UI Manually
```

### New System (online-battle-v2.html)
```
User Action
  ↓
Action Handler (uses state manager directly)
  ↓
Update State (gameState.updatePlayerState)
  ↓
Firebase Sync (automatic via state manager)
  ↓
State Subscribers Notified
  ↓
UI Updates Automatically (reactive renderer)
```

## What's Included

- ✅ State manager integration
- ✅ Clean retreat handler
- ✅ Reactive UI renderer
- ✅ Opponent action handling
- ✅ Basic game structure

## What's NOT Included (for POC)

- Full game features (attacks, abilities, trainers, etc.)
- Complete UI (just basic rendering)
- All validation (basic validation only)
- Turn management (basic structure)

## How to Test

1. **Start a match** in the original `online-battle.html`
2. **Get the match ID** from the URL or Firebase
3. **Open `online-battle-v2.html?matchId=YOUR_MATCH_ID`**
4. **Test retreat functionality**:
   - Click a bench Pokemon to select it
   - Click "Retreat" button
   - Watch UI update automatically!

## Next Steps

To build the full version:

1. **Add more action handlers** (attack, evolve, attach energy, etc.)
2. **Complete UI renderer** (use existing render.js functions)
3. **Add game logic** (reuse effects.js, abilities.js, etc.)
4. **Add validation** (reuse validation.js)
5. **Add turn management** (reuse turn-manager.js)

## Benefits

1. **No Player Mapping** - Eliminates 200+ lines of complex mapping code
2. **Single Source of Truth** - State manager is the only state
3. **Reactive UI** - No manual UI updates needed
4. **Cleaner Code** - Easy to read and maintain
5. **Fewer Bugs** - Less complexity = fewer bugs

## Code Size Comparison

- **Old Retreat Handler**: ~200 lines (with mapping)
- **New Retreat Handler**: ~80 lines (no mapping)
- **Old State Sync**: ~400 lines (onStateChange callback)
- **New State Sync**: ~50 lines (subscriber)

**Total reduction: ~470 lines** for just the retreat system!

## Migration Path

1. Keep `online-battle.html` working
2. Build `online-battle-v2.html` feature by feature
3. Test side-by-side
4. Switch when ready

This POC demonstrates the architecture - the full version would reuse most of your existing game logic modules!

