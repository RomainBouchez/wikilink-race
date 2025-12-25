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
  serverTimestamp,
  deleteDoc
} from 'firebase/firestore';
import { db } from '../firebase.config';
import type { User, UserProfile, GameEntry, DailyChallenge, GameMode, DailyProgressState, LobbyState } from '../types';
import { onSnapshot } from 'firebase/firestore';

/**
 * Create or update a user profile in Firestore
 */
export async function createOrUpdateUserProfile(user: User): Promise<void> {
  const userRef = doc(db, 'users', user.uid);
  const userDoc = await getDoc(userRef);

  if (!userDoc.exists()) {
    // Generate unique friend code for new user
    const { friendsService } = await import('./friendsService');
    const friendCode = await friendsService.generateUniqueFriendCode();

    // Create new profile
    await setDoc(userRef, {
      displayName: user.displayName || user.pseudo || 'Joueur Anonyme',
      email: user.email,
      photoURL: user.photoURL,
      isAnonymous: user.isAnonymous,
      friendCode: friendCode,
      createdAt: serverTimestamp(),
      stat: {
        totalGames: 0,
        avgTime: 0,
        bestTime: 0
      }
    });
  } else {
    // Update existing profile (displayName and photoURL might have changed)
    const updateData: any = {
      displayName: user.displayName || user.pseudo,
      photoURL: user.photoURL
    };

    // Generate friend code for existing users who don't have one yet
    const existingData = userDoc.data();
    if (!existingData.friendCode) {
      const { friendsService } = await import('./friendsService');
      const friendCode = await friendsService.generateUniqueFriendCode();
      updateData.friendCode = friendCode;
    }

    await updateDoc(userRef, updateData);
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
    friendCode: data.friendCode,
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
    score: game.score,
    completed: true // Mark as completed successfully
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
 * Save an abandoned game to Firestore
 * Does NOT update user statistics or leaderboard
 * Only for training mode
 */
export async function saveAbandonedGame(
  userId: string,
  playerName: string,
  gameState: {
    mode: GameMode;
    startPage: string;
    currentPage: string;
    history: string[];
    clicks: number;
    startTime: number;
  }
): Promise<string> {
  const gamesRef = collection(db, 'games');

  const timeSeconds = Math.floor((Date.now() - gameState.startTime) / 1000);
  const score = gameState.clicks * 10 + timeSeconds;

  const gameData = {
    userId,
    playerName,
    clicks: gameState.clicks,
    timeSeconds,
    startPage: gameState.startPage,
    targetPage: '', // No target reached
    path: gameState.history,
    mode: gameState.mode,
    timestamp: Timestamp.now(),
    score,
    completed: false // Mark as abandoned
  };

  // Add game to collection (for personal stats/graph only, not leaderboard)
  const gameDoc = await addDoc(gamesRef, gameData);

  return gameDoc.id;
}

/**
 * Update user statistics after a game
 */
async function updateUserStats(userId: string, game: GameEntry | Omit<GameEntry, 'id'>): Promise<void> {
  const userRef = doc(db, 'users', userId);
  const userDoc = await getDoc(userRef);

  if (!userDoc.exists()) {
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
 * Only includes completed games (completed: true or completed field not present for backward compatibility)
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
      limit(limitCount * 2) // Fetch more to account for filtering
    );
  } else {
    q = query(
      gamesRef,
      orderBy('score', 'asc'),
      limit(limitCount * 2) // Fetch more to account for filtering
    );
  }

  const snapshot = await getDocs(q);
  const allGames = snapshot.docs.map(doc => {
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
      score: data.score,
      completed: data.completed as boolean | undefined
    };
  });

  // Filter out abandoned games (completed: false)
  // Keep games with completed: true OR completed: undefined (backward compatibility)
  const completedGames = allGames.filter(game => game.completed !== false);

  // Return only the requested number
  return completedGames.slice(0, limitCount);
}

/**
 * Get leaderboard for a specific route
 * Uses client-side filtering to avoid complex Firestore indexes
 */
export async function getRouteLeaderboard(
  startPage: string,
  targetPage: string,
  mode?: GameMode,
  limitCount: number = 50
): Promise<GameEntry[]> {
  // Get all games and filter client-side to avoid index requirements
  const allGames = await getGlobalLeaderboard(mode, 500);

  return allGames
    .filter(game => game.startPage === startPage && game.targetPage === targetPage)
    .slice(0, limitCount);
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
      score: data.score,
      completed: data.completed as boolean | undefined
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

/**
 * Save daily challenge progress to Firestore
 */
export async function saveDailyProgress(
  userId: string,
  challengeId: string,
  progress: DailyProgressState
): Promise<void> {
  const progressRef = doc(db, 'users', userId, 'daily_progress', challengeId);

  await setDoc(progressRef, {
    currentPageTitle: progress.currentPageTitle,
    history: progress.history,
    clicks: progress.clicks,
    startTime: progress.startTime,
    lastSaved: serverTimestamp(),
    completed: progress.completed
  });
}

/**
 * Load daily challenge progress from Firestore
 */
export async function loadDailyProgress(
  userId: string,
  challengeId: string
): Promise<DailyProgressState | null> {
  const progressRef = doc(db, 'users', userId, 'daily_progress', challengeId);
  const progressDoc = await getDoc(progressRef);

  if (!progressDoc.exists()) {
    return null;
  }

  const data = progressDoc.data();
  return {
    dailyChallengeId: challengeId,
    userId,
    currentPageTitle: data.currentPageTitle,
    history: data.history,
    clicks: data.clicks,
    startTime: data.startTime,
    lastSaved: data.lastSaved?.toMillis() || Date.now(),
    completed: data.completed
  };
}

/**
 * Clear daily challenge progress from Firestore
 */
export async function clearDailyProgress(
  userId: string,
  challengeId: string
): Promise<void> {
  const progressRef = doc(db, 'users', userId, 'daily_progress', challengeId);
  await deleteDoc(progressRef);
}

/**
 * Create a multiplayer lobby
 */
export async function createMultiplayerLobby(lobbyData: LobbyState): Promise<void> {
  const lobbyRef = doc(db, 'lobbies', lobbyData.roomCode);
  await setDoc(lobbyRef, {
    ...lobbyData,
    createdAt: serverTimestamp(),
  });
}

/**
 * Get a lobby by room code
 */
export async function getLobby(roomCode: string): Promise<LobbyState | null> {
  const lobbyRef = doc(db, 'lobbies', roomCode);
  const lobbyDoc = await getDoc(lobbyRef);

  if (!lobbyDoc.exists()) {
    return null;
  }

  const data = lobbyDoc.data();
  return {
    ...data,
    createdAt: ensureMillis(data.createdAt) || Date.now(),
    startedAt: ensureMillis(data.startedAt),
  } as LobbyState;
}

/**
 * Update lobby state
 */
export async function updateLobby(
  roomCode: string,
  updates: Partial<LobbyState>
): Promise<void> {
  const lobbyRef = doc(db, 'lobbies', roomCode);
  await updateDoc(lobbyRef, updates);
}

/**
 * Subscribe to lobby changes (real-time)
 */
export function subscribeToLobby(
  roomCode: string,
  callback: (lobby: LobbyState | null) => void
): () => void {
  const lobbyRef = doc(db, 'lobbies', roomCode);

  return onSnapshot(lobbyRef, (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.data();
      callback({
        ...data,
        createdAt: ensureMillis(data.createdAt) || Date.now(),
        startedAt: ensureMillis(data.startedAt),
      } as LobbyState);
    } else {
      callback(null);
    }
  });
}

/**
 * Delete a lobby
 */
export async function deleteLobby(roomCode: string): Promise<void> {
  const lobbyRef = doc(db, 'lobbies', roomCode);
  await deleteDoc(lobbyRef);
}


/**
 * Utilitaire pour convertir en toute sécurité les timestamps Firestore ou nombres en millisecondes
 */
const ensureMillis = (date: any): number | null => {
  if (!date) return null;
  // Si c'est déjà un nombre (Date.now())
  if (typeof date === 'number') return date;
  // Si c'est un Timestamp Firestore
  if (date && typeof date.toMillis === 'function') return date.toMillis();
  // Repli sur Date
  return Date.now();
};