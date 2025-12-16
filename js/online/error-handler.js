// Error Handling Module
// Comprehensive error handling for network issues, validation failures, and edge cases

import { showPopup } from '../ui/modals.js';
import { reconnect, getIsConnected } from './sync.js';
import { processActionQueue } from './actions.js';

const errorHandlers = new Map();

export function registerErrorHandler(errorType, handler) {
  errorHandlers.set(errorType, handler);
}

export function handleError(error, context = {}) {
  console.error('Error:', error, context);

  // Determine error type
  let errorType = 'unknown';
  let userMessage = 'An error occurred.';

  if (error.code) {
    // Firebase error codes
    switch (error.code) {
      case 'unavailable':
        errorType = 'network';
        userMessage = 'Network unavailable. Attempting to reconnect...';
        handleNetworkError();
        break;
      case 'permission-denied':
        errorType = 'permission';
        userMessage = 'Permission denied. You may not have access to this game.';
        break;
      case 'unauthenticated':
        errorType = 'auth';
        userMessage = 'Authentication required. Please sign in.';
        setTimeout(() => {
          window.location.href = 'index.html';
        }, 2000);
        break;
      case 'not-found':
        errorType = 'not-found';
        userMessage = 'Game not found. It may have ended.';
        break;
      default:
        errorType = 'firebase';
        userMessage = `Firebase error: ${error.message || error.code}`;
    }
  } else if (error.message) {
    // Generic error messages
    if (error.message.includes('network') || error.message.includes('fetch')) {
      errorType = 'network';
      userMessage = 'Network error. Check your connection.';
      handleNetworkError();
    } else if (error.message.includes('timeout')) {
      errorType = 'timeout';
      userMessage = 'Request timed out. Please try again.';
    } else {
      userMessage = error.message;
    }
  }

  // Call registered handler if exists
  const handler = errorHandlers.get(errorType);
  if (handler) {
    handler(error, context);
  } else {
    // Default error handling
    showPopup(userMessage);
  }

  return { errorType, userMessage };
}

async function handleNetworkError() {
  if (!getIsConnected()) {
    // Attempt reconnection
    const success = await reconnect();
    if (success) {
      showPopup('Reconnected successfully');
      // Process any queued actions
      await processActionQueue();
    } else {
      showPopup('Failed to reconnect. Please refresh the page.');
    }
  }
}

export function handleValidationError(actionId, reason) {
  showPopup(`Action rejected: ${reason || 'Invalid action'}`);
  
  // Import and call rollback handler
  import('./validation.js').then(module => {
    if (module.handleActionRejection) {
      module.handleActionRejection(actionId, reason);
    }
  });
}

export function handleMatchNotFound() {
  showPopup('Match not found. Returning to lobby...');
  setTimeout(() => {
    window.location.href = 'online-battle.html';
  }, 2000);
}

export function handleOpponentDisconnected() {
  showPopup('Opponent disconnected. Waiting for reconnection...');
}

export function handleGameEnded(winner) {
  const user = getCurrentUser();
  if (user && winner === user.uid) {
    showPopup('You won!');
  } else {
    showPopup('You lost!');
  }
  
  setTimeout(() => {
    window.location.href = 'index.html';
  }, 5000);
}

// Register default handlers
registerErrorHandler('network', async (error) => {
  await handleNetworkError();
});

registerErrorHandler('auth', (error) => {
  showPopup('Please sign in to continue.');
  setTimeout(() => {
    window.location.href = 'index.html';
  }, 2000);
});

registerErrorHandler('permission', (error) => {
  showPopup('You do not have permission for this action.');
});

registerErrorHandler('not-found', (error) => {
  handleMatchNotFound();
});

