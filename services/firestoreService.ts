import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  Timestamp,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebase.config';
import type { User, UserProfile, GameEntry, DailyChallenge, GameMode } from '../types';

/**
 * Create or update a user profile in Firestore
 */
export async function createOrUpdateUserProfile(user: User): Promise<void> {
  const userRef = doc(db, 'users', user.uid);
  const userDoc = await getDoc(userRef);

  if (!userDoc.exists()) {
    // Create new profile
    await setDoc(userRef, {
      displayName: user.displayName || user.pseudo || 'Joueur Anonyme',
      email: user.email,
      photoURL: user.photoURL,
      isAnonymous: user.isAnonymous,
      createdAt: serverTimestamp(),
      stat: {
        totalGames: 0,
        avgTime: 0,
        bestTime: 0
      }
    });
  } else {
    // Update existing profile (displayName and photoURL might have changed)
    await updateDoc(userRef, {
      displayName: user.displayName || user.pseudo,
      photoURL: user.photoURL
    });
  }
}

/**
 * Get a user profile from Firestore
 */
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const userRef = doc(db, 'users', userId);
  const userDoc = await getDoc(userRef);

  if (!userDoc.exists()) {
    return null;
  }

  const data = userDoc.data();
  return {
    uid: userId,
    displayName: data.displayName,
    email: data.email,
    photoURL: data.photoURL,
    isAnonymous: data.isAnonymous,
    pseudo: data.isAnonymous ? data.displayName : undefined,
    stat: data.stat,
    createdAt: data.createdAt?.toMillis() || Date.now(),
    updatedAt: data.updatedAt?.toMillis() || Date.now()
  };
}

/**
 * Save a game to Firestore
 * Automatically updates user statistics
 */
export async function saveGame(userId: string, game: Omit<GameEntry, 'id'>): Promise<string> {
  const gamesRef = collection(db, 'games');

  // Prepare game data, omitting undefined fields
  const gameData: any = {
    userId,
    playerName: game.playerName,
    clicks: game.clicks,
    timeSeconds: game.timeSeconds,
    startPage: game.startPage,
    targetPage: game.targetPage,
    path: game.path,
    mode: game.mode,
    timestamp: Timestamp.fromMillis(game.timestamp),
    score: game.score
  };

  // Only add dailyChallengeId if it's defined
  if (game.dailyChallengeId) {
    gameData.dailyChallengeId = game.dailyChallengeId;
  }

  // Add game to global collection
  const gameDoc = await addDoc(gamesRef, gameData);

  // Update user stats
  await updateUserStats(userId, game);

  return gameDoc.id;
}

/**
 * Update user statistics after a game
 */
async function updateUserStats(userId: string, game: GameEntry | Omit<GameEntry, 'id'>): Promise<void> {
  const userRef = doc(db, 'users', userId);
  const userDoc = await getDoc(userRef);

  if (!userDoc.exists()) {
    console.warn('User profile does not exist, cannot update stats');
    return;
  }

  const currentStats = userDoc.data().stat || { totalGames: 0, avgTime: 0, bestTime: 0 };
  const newTotalGames = currentStats.totalGames + 1;
  const newAvgTime = ((currentStats.avgTime * currentStats.totalGames) + game.timeSeconds) / newTotalGames;
  const newBestTime = currentStats.bestTime === 0
    ? game.timeSeconds
    : Math.min(currentStats.bestTime, game.timeSeconds);

  await updateDoc(userRef, {
    stat: {
      totalGames: newTotalGames,
      avgTime: newAvgTime,
      bestTime: newBestTime
    }
  });
}

/**
 * Get global leaderboard
 * Returns top games sorted by score (ascending)
 */
export async function getGlobalLeaderboard(
  mode?: GameMode,
  limitCount: number = 100
): Promise<GameEntry[]> {
  const gamesRef = collection(db, 'games');

  let q;
  if (mode) {
    q = query(
      gamesRef,
      where('mode', '==', mode),
      orderBy('score', 'asc'),
      limit(limitCount)
    );
  } else {
    q = query(
      gamesRef,
      orderBy('score', 'asc'),
      limit(limitCount)
    );
  }

  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      userId: data.userId,
      playerName: data.playerName,
      clicks: data.clicks,
      timeSeconds: data.timeSeconds,
      startPage: data.startPage,
      targetPage: data.targetPage,
      path: data.path,
      mode: data.mode,
      dailyChallengeId: data.dailyChallengeId,
      timestamp: data.timestamp.toMillis(),
      score: data.score
    };
  });
}

/**
 * Get leaderboard for a specific route
 */
export async function getRouteLeaderboard(
  startPage: string,
  targetPage: string,
  mode?: GameMode,
  limitCount: number = 50
): Promise<GameEntry[]> {
  const gamesRef = collection(db, 'games');

  let q;
  if (mode) {
    q = query(
      gamesRef,
      where('startPage', '==', startPage),
      where('targetPage', '==', targetPage),
      where('mode', '==', mode),
      orderBy('score', 'asc'),
      limit(limitCount)
    );
  } else {
    q = query(
      gamesRef,
      where('startPage', '==', startPage),
      where('targetPage', '==', targetPage),
      orderBy('score', 'asc'),
      limit(limitCount)
    );
  }

  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      userId: data.userId,
      playerName: data.playerName,
      clicks: data.clicks,
      timeSeconds: data.timeSeconds,
      startPage: data.startPage,
      targetPage: data.targetPage,
      path: data.path,
      mode: data.mode,
      dailyChallengeId: data.dailyChallengeId,
      timestamp: data.timestamp.toMillis(),
      score: data.score
    };
  });
}

/**
 * Get a user's games
 */
export async function getUserGames(userId: string, limitCount: number = 50): Promise<GameEntry[]> {
  const gamesRef = collection(db, 'games');
  const q = query(
    gamesRef,
    where('userId', '==', userId),
    orderBy('timestamp', 'desc'),
    limit(limitCount)
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      userId: data.userId,
      playerName: data.playerName,
      clicks: data.clicks,
      timeSeconds: data.timeSeconds,
      startPage: data.startPage,
      targetPage: data.targetPage,
      path: data.path,
      mode: data.mode,
      dailyChallengeId: data.dailyChallengeId,
      timestamp: data.timestamp.toMillis(),
      score: data.score
    };
  });
}

/**
 * Get today's daily challenge
 */
export async function getTodayChallenge(): Promise<DailyChallenge | null> {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const challengeRef = doc(db, 'daily_challenges', today);
  const challengeDoc = await getDoc(challengeRef);

  if (!challengeDoc.exists()) {
    return null;
  }

  const data = challengeDoc.data();
  return {
    id: today,
    date: today,
    startPage: data.startPage,
    targetPage: data.targetPage,
    startPageData: data.startPageData,
    targetPageData: data.targetPageData
  };
}

/**
 * Create a daily challenge
 */
export async function createDailyChallenge(challenge: DailyChallenge): Promise<void> {
  const challengeRef = doc(db, 'daily_challenges', challenge.id);

  await setDoc(challengeRef, {
    startPage: challenge.startPage,
    targetPage: challenge.targetPage,
    active: true,
    startPageData: challenge.startPageData,
    targetPageData: challenge.targetPageData
  });
}
