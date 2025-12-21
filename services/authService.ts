import {
  signInWithPopup,
  GoogleAuthProvider,
  signInAnonymously as firebaseSignInAnonymously,
  signOut as firebaseSignOut,
  onAuthStateChanged as firebaseOnAuthStateChanged,
  User as FirebaseUser,
  updateProfile
} from 'firebase/auth';
import { auth } from '../firebase.config';
import type { User } from '../types';

/**
 * Sign in with Google OAuth
 * Opens a popup for Google authentication
 */
export async function signInWithGoogle(): Promise<FirebaseUser> {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  const result = await signInWithPopup(auth, provider);
  return result.user;
}

/**
 * Sign in anonymously with a custom pseudo
 * The pseudo is stored in the user's displayName
 */
export async function signInAnonymously(pseudo: string): Promise<FirebaseUser> {
  const result = await firebaseSignInAnonymously(auth);
  // Store the pseudo in displayName for easy access
  await updateProfile(result.user, { displayName: pseudo });
  return result.user;
}

/**
 * Sign out the current user
 */
export async function signOut(): Promise<void> {
  await firebaseSignOut(auth);
}

/**
 * Listen to authentication state changes
 * Returns an unsubscribe function
 */
export function onAuthStateChanged(callback: (user: FirebaseUser | null) => void): () => void {
  return firebaseOnAuthStateChanged(auth, callback);
}

/**
 * Get the currently signed-in user
 */
export function getCurrentUser(): FirebaseUser | null {
  return auth.currentUser;
}

/**
 * Convert Firebase User to our custom User type
 */
export function mapFirebaseUser(fbUser: FirebaseUser): User {
  return {
    uid: fbUser.uid,
    email: fbUser.email,
    displayName: fbUser.displayName,
    photoURL: fbUser.photoURL,
    isAnonymous: fbUser.isAnonymous,
    pseudo: fbUser.isAnonymous ? fbUser.displayName || undefined : undefined
  };
}

/**
 * Update the pseudo of an anonymous user
 */
export async function updateUserPseudo(pseudo: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('No user is currently signed in');
  }
  if (!user.isAnonymous) {
    throw new Error('Only anonymous users can update their pseudo');
  }
  await updateProfile(user, { displayName: pseudo });
}
