/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
  signOut
} from 'firebase/auth';
import firebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase App
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Configure Google OAuth Provider with Calendar & Tasks Scopes
const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/calendar');
provider.addScope('https://www.googleapis.com/auth/tasks');
provider.addScope('https://www.googleapis.com/auth/userinfo.email');
provider.addScope('https://www.googleapis.com/auth/userinfo.profile');

// Local in-memory cache for access token
let cachedAccessToken: string | null = null;
let isSigningIn = false;

/**
 * Initialize auth listener and retrieve cached token if user is signed in
 */
export const initAuth = (
  onAuthSuccess: (user: User, token: string) => void,
  onAuthFailure: () => void
) => {
  // If we already have a cached token and the user is signed in, trigger success immediately
  if (auth.currentUser && cachedAccessToken) {
    onAuthSuccess(auth.currentUser, cachedAccessToken);
    return () => {};
  }

  return onAuthStateChanged(auth, async (user) => {
    if (user) {
      // In a real OAuth flow in iframe, if page refreshes, we might need to re-login to get a fresh token.
      // But if cachedAccessToken is already present in memory, we use it.
      if (cachedAccessToken) {
        onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        // Token is not in-memory but user is authenticated. We need to prompt signInWithPopup
        // or let the client-side handle showing a re-auth UI.
        onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      onAuthFailure();
    }
  });
};

/**
 * Handle popup sign-in with Google to obtain access token
 */
export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to obtain Google Access Token from Firebase Credential.');
    }
    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error) {
    console.error('Sign in failed:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

/**
 * Log out and clear local token cache
 */
export const googleSignOut = async (): Promise<void> => {
  await signOut(auth);
  cachedAccessToken = null;
};

/**
 * Get current access token
 */
export const getAccessToken = (): string | null => {
  return cachedAccessToken;
};
