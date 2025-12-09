import { LeaderboardEntry } from '../types';

const STORAGE_KEY = 'wikilink_race_leaderboard';
const MAX_ENTRIES = 50;

export const leaderboardService = {
  /**
   * Save a new game result to the leaderboard
   */
  saveScore(entry: Omit<LeaderboardEntry, 'id' | 'timestamp'>): LeaderboardEntry {
    const newEntry: LeaderboardEntry = {
      ...entry,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
    };

    const entries = this.getAllEntries();
    entries.push(newEntry);

    // Keep only the top entries
    const sortedEntries = this.sortEntries(entries).slice(0, MAX_ENTRIES);
    this.saveToStorage(sortedEntries);

    return newEntry;
  },

  /**
   * Get all leaderboard entries
   */
  getAllEntries(): LeaderboardEntry[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (!data) return [];
      return JSON.parse(data) as LeaderboardEntry[];
    } catch (error) {
      console.error('Failed to load leaderboard:', error);
      return [];
    }
  },

  /**
   * Get top N entries
   */
  getTopEntries(limit: number = 10): LeaderboardEntry[] {
    const entries = this.getAllEntries();
    return this.sortEntries(entries).slice(0, limit);
  },

  /**
   * Get entries for a specific route
   */
  getEntriesForRoute(startPage: string, targetPage: string): LeaderboardEntry[] {
    const entries = this.getAllEntries();
    return entries
      .filter(entry => entry.startPage === startPage && entry.targetPage === targetPage)
      .sort((a, b) => {
        // Sort by clicks first, then by time
        if (a.clicks !== b.clicks) return a.clicks - b.clicks;
        return a.timeSeconds - b.timeSeconds;
      });
  },

  /**
   * Calculate score (lower is better)
   * Score = clicks * 10 + timeSeconds
   */
  calculateScore(clicks: number, timeSeconds: number): number {
    return clicks * 10 + timeSeconds;
  },

  /**
   * Sort entries by score (best first)
   */
  sortEntries(entries: LeaderboardEntry[]): LeaderboardEntry[] {
    return entries.sort((a, b) => {
      const scoreA = this.calculateScore(a.clicks, a.timeSeconds);
      const scoreB = this.calculateScore(b.clicks, b.timeSeconds);
      return scoreA - scoreB;
    });
  },

  /**
   * Clear all leaderboard data
   */
  clearLeaderboard(): void {
    localStorage.removeItem(STORAGE_KEY);
  },

  /**
   * Save entries to storage
   */
  saveToStorage(entries: LeaderboardEntry[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    } catch (error) {
      console.error('Failed to save leaderboard:', error);
    }
  },

  /**
   * Get player's best scores
   */
  getPlayerBestScores(playerName: string, limit: number = 5): LeaderboardEntry[] {
    const entries = this.getAllEntries();
    return entries
      .filter(entry => entry.playerName === playerName)
      .sort((a, b) => {
        const scoreA = this.calculateScore(a.clicks, a.timeSeconds);
        const scoreB = this.calculateScore(b.clicks, b.timeSeconds);
        return scoreA - scoreB;
      })
      .slice(0, limit);
  },

  /**
   * Export leaderboard data as JSON
   */
  exportData(): string {
    const entries = this.getAllEntries();
    return JSON.stringify(entries, null, 2);
  },

  /**
   * Import leaderboard data from JSON
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
};
