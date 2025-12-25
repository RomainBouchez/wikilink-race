import { getUserGames, getUserProfile } from './firestoreService';
import { dailyStreaksService } from './dailyStreaksService';
import { EnhancedUserStats, GameMode, GameEntry } from '../types';

/**
 * Stats Service
 * Calculates advanced user statistics
 */
class StatsService {

  /**
   * Calculate number of games played in the current week
   * Week starts on Sunday at 00:00
   */
  private getStartOfWeek(): Date {
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - dayOfWeek);
    startOfWeek.setHours(0, 0, 0, 0);
    return startOfWeek;
  }

  /**
   * Calculate start of current month
   */
  private getStartOfMonth(): Date {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    return startOfMonth;
  }

  /**
   * Calculate games played this week and this month
   */
  async calculatePeriodGames(userId: string): Promise<{
    gamesThisWeek: number;
    gamesThisMonth: number;
  }> {
    // Fetch recent games (200 should cover at least a month for most users)
    const games = await getUserGames(userId, 200);

    const startOfWeek = this.getStartOfWeek().getTime();
    const startOfMonth = this.getStartOfMonth().getTime();

    const gamesThisWeek = games.filter(game => game.timestamp >= startOfWeek).length;
    const gamesThisMonth = games.filter(game => game.timestamp >= startOfMonth).length;

    return {
      gamesThisWeek,
      gamesThisMonth
    };
  }

  /**
   * Calculate favorite game mode (most played)
   * Returns null if no games played
   * If there's a tie, returns the first alphabetically
   */
  async calculateFavoriteMode(userId: string): Promise<GameMode | null> {
    // Fetch all games (up to 1000)
    const games = await getUserGames(userId, 1000);

    if (games.length === 0) {
      return null;
    }

    // Count games by mode
    const modeCounts: Record<string, number> = {
      [GameMode.DAILY]: 0,
      [GameMode.TRAINING]: 0,
      [GameMode.MULTIPLAYER]: 0
    };

    games.forEach(game => {
      if (game.mode && modeCounts[game.mode] !== undefined) {
        modeCounts[game.mode]++;
      }
    });

    // Find mode with highest count
    let maxCount = 0;
    let favoriteMode: GameMode | null = null;

    // Sort modes alphabetically to ensure consistent tie-breaking
    const modes = [GameMode.DAILY, GameMode.MULTIPLAYER, GameMode.TRAINING];

    for (const mode of modes) {
      if (modeCounts[mode] > maxCount) {
        maxCount = modeCounts[mode];
        favoriteMode = mode;
      }
    }

    return favoriteMode;
  }

  /**
   * Get enhanced user statistics
   * Combines existing stats with new calculated stats
   */
  async getEnhancedStats(userId: string): Promise<EnhancedUserStats | null> {
    // Get base user profile with existing stats
    const profile = await getUserProfile(userId);

    if (!profile) {
      return null;
    }

    // Calculate period games
    const periodGames = await this.calculatePeriodGames(userId);

    // Calculate favorite mode
    const favoriteGameMode = await this.calculateFavoriteMode(userId);

    // Get daily streak
    const dailyStreak = await dailyStreaksService.calculateStreaks(userId);

    // Combine all stats
    const enhancedStats: EnhancedUserStats = {
      // Base stats from UserStats
      totalGames: profile.stat.totalGames,
      avgTime: profile.stat.avgTime,
      bestTime: profile.stat.bestTime,
      totalClicks: profile.stat.totalClicks,
      averageClicks: profile.stat.averageClicks,
      bestScore: profile.stat.bestScore,

      // Enhanced stats
      gamesThisMonth: periodGames.gamesThisMonth,
      gamesThisWeek: periodGames.gamesThisWeek,
      favoriteGameMode,
      dailyStreak
    };

    return enhancedStats;
  }

  /**
   * Get quick stats summary without heavy calculations
   * Useful for initial loading
   */
  async getQuickStats(userId: string): Promise<{
    totalGames: number;
    bestTime: number;
    avgTime: number;
  } | null> {
    const profile = await getUserProfile(userId);

    if (!profile) {
      return null;
    }

    return {
      totalGames: profile.stat.totalGames,
      bestTime: profile.stat.bestTime,
      avgTime: profile.stat.avgTime
    };
  }
}

export const statsService = new StatsService();
