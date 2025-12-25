import { LeaderboardEntry, GameMode, GameEntry } from '../types';
import * as firestoreService from './firestoreService';

const STORAGE_KEY = 'wikilink_race_leaderboard';
const MAX_ENTRIES = 50;

interface ServiceConfig {
  useFirestore: boolean;
  userId: string | null;
}

class LeaderboardService {
  private config: ServiceConfig = {
    useFirestore: false,
    userId: null
  };

  /**
   * Configure the service to use Firestore or localStorage
   */
  configure(useFirestore: boolean, userId: string | null): void {
    this.config = { useFirestore, userId };
  }

  /**
   * Save a new game result to the leaderboard
   * Routes to Firestore if authenticated, localStorage otherwise
   */
  async saveScore(entry: Omit<LeaderboardEntry, 'id' | 'timestamp'>): Promise<LeaderboardEntry> {
    const timestamp = Date.now();

    if (this.config.useFirestore && this.config.userId) {
      // Firestore mode
      const score = this.calculateScore(entry.clicks, entry.timeSeconds);
      const gameEntry: Omit<GameEntry, 'id'> = {
        ...entry,
        userId: this.config.userId,
        timestamp,
        score
      };

      const gameId = await firestoreService.saveGame(this.config.userId, gameEntry);

      return {
        ...entry,
        id: gameId,
        userId: this.config.userId,
        timestamp
      };
    } else {
      // localStorage mode (guest)
      return this.saveScoreToLocalStorage(entry);
    }
  }

  /**
   * Save a score to localStorage (guest mode)
   */
  private saveScoreToLocalStorage(entry: Omit<LeaderboardEntry, 'id' | 'timestamp'>): LeaderboardEntry {
    const newEntry: LeaderboardEntry = {
      ...entry,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
    };

    const entries = this.getEntriesFromLocalStorage();
    entries.push(newEntry);

    // Keep only the top entries
    const sortedEntries = this.sortEntries(entries).slice(0, MAX_ENTRIES);
    this.saveToStorage(sortedEntries);

    return newEntry;
  }

  /**
   * Get all leaderboard entries, optionally filtered by mode
   * Routes to Firestore if authenticated, localStorage otherwise
   */
  async getAllEntries(mode?: GameMode): Promise<LeaderboardEntry[]> {
    if (this.config.useFirestore) {
      return await firestoreService.getGlobalLeaderboard(mode);
    } else {
      return this.getEntriesFromLocalStorage(mode);
    }
  }

  /**
   * Get entries from localStorage
   */
  private getEntriesFromLocalStorage(mode?: GameMode): LeaderboardEntry[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (!data) return [];
      const entries = JSON.parse(data) as LeaderboardEntry[];

      if (mode) {
        return entries.filter(entry => entry.mode === mode);
      }

      return entries;
    } catch (error) {
      console.error('Failed to load leaderboard:', error);
      return [];
    }
  }

  /**
   * Get top N entries, optionally filtered by mode
   */
  async getTopEntries(limit: number = 10, mode?: GameMode): Promise<LeaderboardEntry[]> {
    const entries = await this.getAllEntries(mode);
    return this.sortEntries(entries).slice(0, limit);
  }

  /**
   * Get entries for a specific route
   */
  async getEntriesForRoute(startPage: string, targetPage: string, mode?: GameMode): Promise<LeaderboardEntry[]> {
    if (this.config.useFirestore) {
      return await firestoreService.getRouteLeaderboard(startPage, targetPage, mode);
    } else {
      const entries = this.getEntriesFromLocalStorage(mode);
      return entries
        .filter(entry => entry.startPage === startPage && entry.targetPage === targetPage)
        .sort((a, b) => {
          // Sort by clicks first, then by time
          if (a.clicks !== b.clicks) return a.clicks - b.clicks;
          return a.timeSeconds - b.timeSeconds;
        });
    }
  }

  /**
   * Get entries for today's daily challenge
   */
  async getDailyChallengeEntries(dailyChallengeId: string): Promise<LeaderboardEntry[]> {
    const entries = await this.getAllEntries(GameMode.DAILY);
    return entries
      .filter(entry => entry.dailyChallengeId === dailyChallengeId)
      .sort((a, b) => {
        // Sort by clicks first, then by time
        if (a.clicks !== b.clicks) return a.clicks - b.clicks;
        return a.timeSeconds - b.timeSeconds;
      });
  }

  /**
   * Get a user's games (only works in Firestore mode)
   */
  async getUserGames(userId: string, limit: number = 50): Promise<GameEntry[]> {
    if (!this.config.useFirestore) {
      return [];
    }
    return await firestoreService.getUserGames(userId, limit);
  }

  /**
   * Calculate score (lower is better)
   * Score = clicks * 10 + timeSeconds
   */
  calculateScore(clicks: number, timeSeconds: number): number {
    return clicks * 10 + timeSeconds;
  }

  /**
   * Sort entries by score (best first)
   */
  sortEntries(entries: LeaderboardEntry[]): LeaderboardEntry[] {
    return entries.sort((a, b) => {
      const scoreA = this.calculateScore(a.clicks, a.timeSeconds);
      const scoreB = this.calculateScore(b.clicks, b.timeSeconds);
      return scoreA - scoreB;
    });
  }

  /**
   * Clear all leaderboard data (localStorage only, for guest mode)
   */
  clearLeaderboard(): void {
    if (!this.config.useFirestore) {
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  /**
   * Save entries to storage (localStorage only)
   */
  private saveToStorage(entries: LeaderboardEntry[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    } catch (error) {
      console.error('Failed to save leaderboard:', error);
    }
  }

  /**
   * Get player's best scores
   */
  async getPlayerBestScores(playerName: string, limit: number = 5): Promise<LeaderboardEntry[]> {
    const entries = await this.getAllEntries();
    return entries
      .filter(entry => entry.playerName === playerName)
      .sort((a, b) => {
        const scoreA = this.calculateScore(a.clicks, a.timeSeconds);
        const scoreB = this.calculateScore(b.clicks, b.timeSeconds);
        return scoreA - scoreB;
      })
      .slice(0, limit);
  }

  /**
   * Export leaderboard data as JSON (localStorage only)
   */
  exportData(): string {
    const entries = this.getEntriesFromLocalStorage();
    return JSON.stringify(entries, null, 2);
  }

  /**
   * Import leaderboard data from JSON (localStorage only)
   */
  importData(jsonData: string): boolean {
    try {
      const entries = JSON.parse(jsonData) as LeaderboardEntry[];
      if (!Array.isArray(entries)) return false;

      // Validate entries
      const validEntries = entries.filter(entry =>
        entry.id &&
        entry.playerName &&
        typeof entry.clicks === 'number' &&
        typeof entry.timeSeconds === 'number'
      );

      this.saveToStorage(validEntries);
      return true;
    } catch (error) {
      console.error('Failed to import leaderboard:', error);
      return false;
    }
  }
}

// Export singleton instance
export const leaderboardService = new LeaderboardService();
