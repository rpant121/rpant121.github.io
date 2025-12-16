// Authentication Module
// Handles user login, signup, and session management

let currentUser = null;
let authStateListeners = [];

export function initAuth() {
  if (!window.firebaseAuth) {
    console.error('Firebase Auth not initialized. Make sure firebase-config.js is loaded.');
    return;
  }

  // Listen for auth state changes
  window.firebaseAuth.onAuthStateChanged((user) => {
    currentUser = user;
    authStateListeners.forEach(listener => listener(user));
    
    if (user) {
      // Update user profile in database
      updateUserProfile(user);
    }
  });

  // Check for existing session
  const savedUser = localStorage.getItem('firebaseUser');
  if (savedUser) {
    try {
      const userData = JSON.parse(savedUser);
      // Session will be restored by onAuthStateChanged
    } catch (e) {
      localStorage.removeItem('firebaseUser');
    }
  }
}

export function onAuthStateChanged(callback) {
  authStateListeners.push(callback);
  // Immediately call with current user if available
  if (currentUser) {
    callback(currentUser);
  }
  // Return unsubscribe function
  return () => {
    const index = authStateListeners.indexOf(callback);
    if (index > -1) {
      authStateListeners.splice(index, 1);
    }
  };
}

export function getCurrentUser() {
  return currentUser;
}

export async function signUp(email, password, displayName = null) {
  if (!window.firebaseAuth) {
    throw new Error('Firebase Auth not initialized');
  }

  try {
    const userCredential = await window.firebaseAuth.createUserWithEmailAndPassword(email, password);
    const user = userCredential.user;

    // Update display name if provided
    if (displayName) {
      await user.updateProfile({ displayName });
    }

    // Create user profile in database
    await createUserProfile(user, displayName);

    // Save to localStorage
    localStorage.setItem('firebaseUser', JSON.stringify({
      uid: user.uid,
      email: user.email
    }));

    return user;
  } catch (error) {
    console.error('Sign up error:', error);
    throw error;
  }
}

export async function signIn(email, password) {
  if (!window.firebaseAuth) {
    throw new Error('Firebase Auth not initialized');
  }

  try {
    const userCredential = await window.firebaseAuth.signInWithEmailAndPassword(email, password);
    const user = userCredential.user;

    // Save to localStorage
    localStorage.setItem('firebaseUser', JSON.stringify({
      uid: user.uid,
      email: user.email
    }));

    return user;
  } catch (error) {
    console.error('Sign in error:', error);
    throw error;
  }
}

export async function signInAnonymously() {
  if (!window.firebaseAuth) {
    throw new Error('Firebase Auth not initialized');
  }

  try {
    const userCredential = await window.firebaseAuth.signInAnonymously();
    const user = userCredential.user;

    // Create user profile in database
    await createUserProfile(user);

    // Save to localStorage
    localStorage.setItem('firebaseUser', JSON.stringify({
      uid: user.uid,
      isAnonymous: true
    }));

    return user;
  } catch (error) {
    console.error('Anonymous sign in error:', error);
    throw error;
  }
}

export async function signOut() {
  if (!window.firebaseAuth) {
    throw new Error('Firebase Auth not initialized');
  }

  try {
    await window.firebaseAuth.signOut();
    currentUser = null;
    localStorage.removeItem('firebaseUser');
  } catch (error) {
    console.error('Sign out error:', error);
    throw error;
  }
}

export async function updateDisplayName(displayName) {
  if (!currentUser) {
    throw new Error('No user signed in');
  }

  try {
    await currentUser.updateProfile({ displayName });
    await updateUserProfile(currentUser);
    return currentUser;
  } catch (error) {
    console.error('Update display name error:', error);
    throw error;
  }
}

async function createUserProfile(user, displayName = null) {
  if (!window.firebaseDatabase) {
    console.warn('Firebase Database not initialized, skipping profile creation');
    return;
  }

  const userRef = window.firebaseDatabase.ref(`users/${user.uid}/profile`);
  const snapshot = await userRef.once('value');

  // Only create profile if it doesn't exist
  if (!snapshot.exists()) {
    const profile = {
      uid: user.uid,
      email: user.email || '',
      displayName: displayName || user.displayName || user.email?.split('@')[0] || 'Player',
      wins: 0,
      losses: 0,
      createdAt: (window.firebaseApp || firebase)?.database?.ServerValue?.TIMESTAMP || Date.now()
    };

    await userRef.set(profile);
  } else {
    // Update existing profile with latest info
    const updates = {
      email: user.email || snapshot.val().email || '',
    };
    
    if (displayName || user.displayName) {
      updates.displayName = displayName || user.displayName;
    }

    await userRef.update(updates);
  }
}

async function updateUserProfile(user) {
  if (!window.firebaseDatabase || !user) return;

  try {
    const userRef = window.firebaseDatabase.ref(`users/${user.uid}/profile`);
    const snapshot = await userRef.once('value');

    if (snapshot.exists()) {
      // Update email if changed
      const updates = {};
      if (user.email) {
        updates.email = user.email;
      }
      if (user.displayName) {
        updates.displayName = user.displayName;
      }
      
      if (Object.keys(updates).length > 0) {
        await userRef.update(updates);
      }
    } else {
      // Create profile if it doesn't exist
      await createUserProfile(user);
    }
  } catch (error) {
    console.error('Error updating user profile:', error);
  }
}

export function isAuthenticated() {
  return currentUser !== null;
}

export function getUserProfile() {
  return new Promise((resolve, reject) => {
    if (!currentUser) {
      reject(new Error('No user signed in'));
      return;
    }

    if (!window.firebaseDatabase) {
      reject(new Error('Firebase Database not initialized'));
      return;
    }

    const userRef = window.firebaseDatabase.ref(`users/${currentUser.uid}/profile`);
    userRef.once('value')
      .then(snapshot => {
        if (snapshot.exists()) {
          resolve(snapshot.val());
        } else {
          // Create profile if it doesn't exist
          createUserProfile(currentUser)
            .then(() => userRef.once('value'))
            .then(snapshot => resolve(snapshot.val()))
            .catch(reject);
        }
      })
      .catch(reject);
  });
}

