import type { GameState, DailyProgressState, User, GameMode, GameStatus } from '../types';
import * as firestoreService from './firestoreService';
import { dailyChallengeService } from './dailyChallengeService';

const PROGRESS_KEY_PREFIX = 'wikilink-daily-progress-';

class DailyProgressService {
  /**
   * Get the localStorage key for a specific daily challenge
   */
  private getLocalStorageKey(dailyChallengeId: string): string {
    return `${PROGRESS_KEY_PREFIX}${dailyChallengeId}`;
  }

  /**
   * Check if we should save progress for this game state
   */
  private shouldSaveProgress(gameState: GameState): boolean {
    // Only save for DAILY mode
    if (gameState.mode !== 'DAILY') {
      return false;
    }

    // Only save if PLAYING
    if (gameState.status !== 'PLAYING') {
      return false;
    }

    // Must have a dailyChallengeId
    if (!gameState.dailyChallengeId) {
      return false;
    }

    // Must have a current page
    if (!gameState.currentPage) {
      return false;
    }

    return true;
  }

  /**
   * Map GameState to DailyProgressState
   */
  private mapGameStateToProgress(gameState: GameState, userId?: string): DailyProgressState {
    return {
      dailyChallengeId: gameState.dailyChallengeId!,
      userId,
      currentPageTitle: gameState.currentPage!.title,
      history: gameState.history,
      clicks: gameState.clicks,
      startTime: gameState.startTime!,
      lastSaved: Date.now(),
      completed: false
    };
  }

  /**
   * Save progress to localStorage
   */
  private saveToLocalStorage(progress: DailyProgressState): void {
    try {
      const key = this.getLocalStorageKey(progress.dailyChallengeId);
      localStorage.setItem(key, JSON.stringify(progress));
    } catch (error) {
      console.error('[DailyProgress] Failed to save to localStorage:', error);
      // Continue silently - game can proceed in memory only
    }
  }

  /**
   * Load progress from localStorage
   */
  private loadFromLocalStorage(challengeId: string): DailyProgressState | null {
    try {
      const key = this.getLocalStorageKey(challengeId);
      const stored = localStorage.getItem(key);
      if (!stored) {
        return null;
      }
      return JSON.parse(stored);
    } catch (error) {
      console.error('[DailyProgress] Failed to load from localStorage:', error);
      return null;
    }
  }

  /**
   * Clear progress from localStorage
   */
  private clearFromLocalStorage(challengeId: string): void {
    try {
      const key = this.getLocalStorageKey(challengeId);
      localStorage.removeItem(key);
    } catch (error) {
      console.error('[DailyProgress] Failed to clear from localStorage:', error);
    }
  }

  /**
   * Save progress to Firestore (fire-and-forget)
   */
  private async saveToFirestore(progress: DailyProgressState): Promise<void> {
    if (!progress.userId) {
      return;
    }

    try {
      await firestoreService.saveDailyProgress(
        progress.userId,
        progress.dailyChallengeId,
        progress
      );
    } catch (error) {
      console.error('[DailyProgress] Failed to save to Firestore:', error);
      // Continue silently - localStorage still works
    }
  }

  /**
   * Load progress from Firestore
   */
  private async loadFromFirestore(
    userId: string,
    challengeId: string
  ): Promise<DailyProgressState | null> {
    try {
      return await firestoreService.loadDailyProgress(userId, challengeId);
    } catch (error) {
      console.error('[DailyProgress] Failed to load from Firestore:', error);
      return null;
    }
  }

  /**
   * Clear progress from Firestore
   */
  private async clearFromFirestore(userId: string, challengeId: string): Promise<void> {
    try {
      await firestoreService.clearDailyProgress(userId, challengeId);
    } catch (error) {
      console.error('[DailyProgress] Failed to clear from Firestore:', error);
    }
  }

  /**
   * Save game progress
   * - Saves to localStorage immediately (synchronous)
   * - Saves to Firestore if authenticated (async, fire-and-forget)
   */
  async saveProgress(gameState: GameState, user: User | null): Promise<void> {
    // Check if we should save
    if (!this.shouldSaveProgress(gameState)) {
      return;
    }

    // Check if already completed
    if (dailyChallengeService.hasCompletedToday()) {
      return;
    }

    // Map to progress state
    const progress = this.mapGameStateToProgress(gameState, user?.uid);

    // Save to localStorage (synchronous)
    this.saveToLocalStorage(progress);

    // Save to Firestore if authenticated (fire-and-forget)
    if (user && !user.isAnonymous) {
      this.saveToFirestore(progress);
    }
  }

  /**
   * Load game progress
   * - For authenticated users: Try Firestore first, fallback to localStorage
   * - For guests: Use localStorage only
   * - Returns null if no progress or if challenge is completed
   */
  async loadProgress(challengeId: string, user: User | null): Promise<DailyProgressState | null> {
    // Don't load if already completed
    if (dailyChallengeService.hasCompletedToday()) {
      return null;
    }

    let progress: DailyProgressState | null = null;

    // Try Firestore first for authenticated users
    if (user && !user.isAnonymous) {
      progress = await this.loadFromFirestore(user.uid, challengeId);
    }

    // Fallback to localStorage
    if (!progress) {
      progress = this.loadFromLocalStorage(challengeId);
    }

    // Validate that progress is for the correct challenge
    if (progress && progress.dailyChallengeId !== challengeId) {
      console.warn('[DailyProgress] Progress is for a different challenge, ignoring');
      return null;
    }

    // Don't restore if marked as completed
    if (progress && progress.completed) {
      return null;
    }

    return progress;
  }

  /**
   * Clear game progress
   * - Removes from localStorage
   * - Removes from Firestore if authenticated
   */
  async clearProgress(challengeId: string, user: User | null): Promise<void> {
    // Clear from localStorage
    this.clearFromLocalStorage(challengeId);

    // Clear from Firestore if authenticated
    if (user && !user.isAnonymous) {
      await this.clearFromFirestore(user.uid, challengeId);
    }
  }
}

export const dailyProgressService = new DailyProgressService();
