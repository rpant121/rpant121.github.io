// Game State Manager - Single Source of Truth
// Centralized state management for online battles

import { getMatchRef } from './schema.js';

class GameStateManager {
  constructor() {
    this.state = null; // Current game state from Firebase
    this.listeners = []; // UI update listeners
    this.matchRef = null;
    this.stateRef = null;
    this.isInitialized = false;
  }

  /**
   * Initialize state manager for a match
   * @param {string} matchId - The match ID
   */
  async init(matchId) {
    if (this.isInitialized && this.matchRef) {
      // Already initialized for this match
      return;
    }

    this.matchRef = getMatchRef(matchId);
    this.stateRef = this.matchRef.child('gameState');
    
    // Listen for state changes
    this.stateRef.on('value', (snapshot) => {
      const newState = snapshot.val();
      if (newState) {
        const oldState = this.state;
        
        // Check if we're in the middle of updating specific paths
        // If so, preserve our local updates instead of overwriting with remote state
        if (globalThis.__updatingState && globalThis.__updatingState.size > 0 && oldState) {
          // Merge updates: preserve local updates for paths we're currently updating
          const mergedState = JSON.parse(JSON.stringify(newState)); // Deep clone
          for (const path of globalThis.__updatingState) {
            const [playerId, key] = path.split('/');
            if (oldState[playerId] && oldState[playerId][key] !== undefined) {
              // Preserve the old state value (our local update) instead of using remote
              if (!mergedState[playerId]) {
                mergedState[playerId] = {};
              }
              // Deep clone the value to avoid reference issues
              if (Array.isArray(oldState[playerId][key])) {
                mergedState[playerId][key] = [...oldState[playerId][key]];
              } else if (typeof oldState[playerId][key] === 'object' && oldState[playerId][key] !== null) {
                mergedState[playerId][key] = JSON.parse(JSON.stringify(oldState[playerId][key]));
              } else {
                mergedState[playerId][key] = oldState[playerId][key];
              }
              console.log('[GAME-STATE] Preserving local update for:', path, {
                oldValue: Array.isArray(oldState[playerId][key]) ? oldState[playerId][key].length : oldState[playerId][key],
                newValue: Array.isArray(newState[playerId]?.[key]) ? newState[playerId][key].length : newState[playerId]?.[key]
              });
            }
          }
          this.state = mergedState;
        } else {
          this.state = newState;
        }
        
        // Notify listeners of state change
        this.notifyListeners(this.state, oldState);
      }
    });
    
    this.isInitialized = true;
  }

  /**
   * Get current state (always use match player IDs: 'player1' or 'player2')
   * @returns {Object|null} Current game state
   */
  getState() {
    return this.state;
  }

  /**
   * Get state for a specific player (match player ID)
   * @param {string} playerId - Match player ID ('player1' or 'player2')
   * @returns {Object|null} Player state
   */
  getPlayerState(playerId) {
    return this.state?.[playerId] || null;
  }

  /**
   * Get active Pokemon for a player
   * @param {string} playerId - Match player ID
   * @returns {Object|null} Active Pokemon data
   */
  getActivePokemon(playerId) {
    return this.getPlayerState(playerId)?.active || null;
  }

  /**
   * Get bench for a player
   * @param {string} playerId - Match player ID
   * @returns {Array} Bench array
   */
  getBench(playerId) {
    const bench = this.getPlayerState(playerId)?.bench;
    return Array.isArray(bench) ? bench : [];
  }

  /**
   * Get hand for a player
   * @param {string} playerId - Match player ID
   * @returns {Array} Hand array
   */
  getHand(playerId) {
    const hand = this.getPlayerState(playerId)?.hand;
    return Array.isArray(hand) ? hand : [];
  }

  /**
   * Get deck for a player
   * @param {string} playerId - Match player ID
   * @returns {Array} Deck array
   */
  getDeck(playerId) {
    const deck = this.getPlayerState(playerId)?.deck;
    return Array.isArray(deck) ? deck : [];
  }

  /**
   * Get discard for a player
   * @param {string} playerId - Match player ID
   * @returns {Object} Discard object with cards and energyCounts
   */
  getDiscard(playerId) {
    const discard = this.getPlayerState(playerId)?.discard;
    return discard || { cards: [], energyCounts: {} };
  }

  /**
   * Get points for both players
   * @returns {Object} Points object with player1 and player2
   */
  getPoints() {
    return {
      player1: this.state?.p1Points || 0,
      player2: this.state?.p2Points || 0
    };
  }

  /**
   * Get current turn info
   * @returns {Object} Turn info with currentPlayer, turnNumber, firstPlayer
   */
  getTurnInfo() {
    return {
      currentPlayer: this.state?.currentPlayer || null,
      turnNumber: this.state?.turnNumber || 1,
      firstPlayer: this.state?.firstPlayer || null
    };
  }

  /**
   * Get energy types for a player
   * @param {string} playerId - Match player ID
   * @returns {Array} Energy types array
   */
  getEnergyTypes(playerId) {
    return this.getPlayerState(playerId)?.energyTypes || [];
  }

  /**
   * Subscribe to state changes
   * @param {Function} listener - Callback function(state, oldState)
   * @returns {Function} Unsubscribe function
   */
  subscribe(listener) {
    this.listeners.push(listener);
    
    // Immediately call with current state if available
    if (this.state) {
      try {
        listener(this.state, null);
      } catch (error) {
        console.error('Error in initial state listener call:', error);
      }
    }
    
    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  /**
   * Notify all listeners of state change
   * @param {Object} newState - New state
   * @param {Object|null} oldState - Previous state
   */
  notifyListeners(newState, oldState) {
    this.listeners.forEach(listener => {
      try {
        listener(newState, oldState);
      } catch (error) {
        console.error('Error in state listener:', error);
      }
    });
  }

  /**
   * Update state in Firebase (returns promise)
   * @param {Object} updates - Updates object with Firebase paths
   * @returns {Promise} Update promise
   */
  async updateState(updates) {
    if (!this.stateRef) {
      throw new Error('State manager not initialized');
    }
    
    // Use Firebase update for atomic updates
    await this.stateRef.update(updates);
    // State will automatically update via listener
  }

  /**
   * Update player-specific state
   * @param {string} playerId - Match player ID
   * @param {Object} updates - Updates object (keys are state properties)
   * @returns {Promise} Update promise
   */
  async updatePlayerState(playerId, updates) {
    if (!this.stateRef) {
      throw new Error('State manager not initialized');
    }
    
    // Get current player state to merge with updates
    const currentPlayerState = this.getPlayerState(playerId) || {};
    const mergedUpdates = {
      ...currentPlayerState,
      ...updates
    };
    
    // Use nested object structure for Firebase update()
    // Firebase update() does a shallow merge at top level, so we merge first
    const playerUpdates = {
      [playerId]: mergedUpdates
    };
    
    // Use Firebase update for atomic updates
    await this.stateRef.update(playerUpdates);
    // State will automatically update via listener
  }

  /**
   * Update points for a player
   * @param {string} playerId - Match player ID ('player1' or 'player2')
   * @param {number} points - New points value
   * @returns {Promise} Update promise
   */
  async updatePoints(playerId, points) {
    const pointsKey = playerId === 'player1' ? 'p1Points' : 'p2Points';
    return this.updateState({ [pointsKey]: points });
  }

  /**
   * Update turn information
   * @param {Object} turnInfo - Turn info object
   * @returns {Promise} Update promise
   */
  async updateTurnInfo(turnInfo) {
    const updates = {};
    if (turnInfo.currentPlayer !== undefined) {
      updates.currentPlayer = turnInfo.currentPlayer;
    }
    if (turnInfo.turnNumber !== undefined) {
      updates.turnNumber = turnInfo.turnNumber;
    }
    if (turnInfo.firstPlayer !== undefined) {
      updates.firstPlayer = turnInfo.firstPlayer;
    }
    return this.updateState(updates);
  }

  /**
   * Cleanup - remove listeners
   */
  cleanup() {
    if (this.stateRef) {
      this.stateRef.off();
    }
    this.listeners = [];
    this.state = null;
    this.matchRef = null;
    this.stateRef = null;
    this.isInitialized = false;
  }
}

// Singleton instance
export const gameState = new GameStateManager();

