import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  query,
  orderBy,
  where,
  Timestamp
} from 'firebase/firestore';
import { db } from '../firebase.config';
import { DailyStreak } from '../types';

/**
 * Daily Streaks Service
 * Manages the daily challenge streak system
 */
class DailyStreaksService {

  /**
   * Record a daily challenge completion
   * @param userId - User ID
   * @param date - Date in YYYY-MM-DD format
   * @param challengeId - Optional challenge ID
   */
  async recordDailyCompletion(
    userId: string,
    date: string,
    challengeId?: string
  ): Promise<void> {
    const streakRef = doc(db, 'users', userId, 'daily_streaks', date);

    await setDoc(streakRef, {
      completed: true,
      completedAt: Timestamp.now(),
      challengeId: challengeId || date
    });
  }

  /**
   * Check if a specific date is completed
   * @param userId - User ID
   * @param date - Date in YYYY-MM-DD format
   */
  async isDateCompleted(userId: string, date: string): Promise<boolean> {
    const streakRef = doc(db, 'users', userId, 'daily_streaks', date);
    const streakDoc = await getDoc(streakRef);

    return streakDoc.exists() && streakDoc.data()?.completed === true;
  }

  /**
   * Get completion dates within a range
   * @param userId - User ID
   * @param startDate - Start date in YYYY-MM-DD format (optional)
   * @param endDate - End date in YYYY-MM-DD format (optional)
   */
  async getCompletionDates(
    userId: string,
    startDate?: string,
    endDate?: string
  ): Promise<string[]> {
    const streaksRef = collection(db, 'users', userId, 'daily_streaks');
    let q = query(streaksRef, where('completed', '==', true));

    if (startDate && endDate) {
      // Note: Firestore queries on document IDs require special handling
      // For simplicity, we'll fetch all and filter in memory
    }

    const snapshot = await getDocs(q);
    const dates = snapshot.docs.map(doc => doc.id);

    // Filter by date range if provided
    let filteredDates = dates;
    if (startDate) {
      filteredDates = filteredDates.filter(date => date >= startDate);
    }
    if (endDate) {
      filteredDates = filteredDates.filter(date => date <= endDate);
    }

    return filteredDates.sort();
  }

  /**
   * Calculate current and best streaks for a user
   * @param userId - User ID
   * @returns DailyStreak object with current streak, best streak, and completion dates
   */
  async calculateStreaks(userId: string): Promise<DailyStreak> {
    // Get all completion dates
    const completionDates = await this.getCompletionDates(userId);

    if (completionDates.length === 0) {
      return {
        currentStreak: 0,
        bestStreak: 0,
        lastCompletionDate: '',
        completionDates: []
      };
    }

    // Sort dates in descending order (most recent first)
    const sortedDates = [...completionDates].sort().reverse();

    // Get today's date in YYYY-MM-DD format (UTC)
    const today = new Date().toISOString().split('T')[0];

    // Calculate current streak
    let currentStreak = 0;
    let checkDate = today;

    // Check if today or yesterday was completed (streak is still active)
    const yesterday = this.getDateDaysAgo(1);
    const lastCompletionDate = sortedDates[0];

    if (lastCompletionDate === today || lastCompletionDate === yesterday) {
      // Start counting from the most recent completion
      checkDate = lastCompletionDate;

      for (const date of sortedDates) {
        if (date === checkDate) {
          currentStreak++;
          checkDate = this.getPreviousDay(checkDate);
        } else if (date < checkDate) {
          // Found a gap, streak is broken
          break;
        }
      }
    }
    // If last completion is older than yesterday, current streak is 0

    // Calculate best streak (scan all dates)
    let bestStreak = 0;
    let tempStreak = 0;
    const sortedDatesAsc = [...completionDates].sort();

    for (let i = 0; i < sortedDatesAsc.length; i++) {
      if (i === 0) {
        tempStreak = 1;
      } else {
        const currentDate = sortedDatesAsc[i];
        const previousDate = sortedDatesAsc[i - 1];

        // Check if dates are consecutive
        if (this.areConsecutiveDays(previousDate, currentDate)) {
          tempStreak++;
        } else {
          // Streak broken, start new streak
          bestStreak = Math.max(bestStreak, tempStreak);
          tempStreak = 1;
        }
      }
    }

    // Don't forget to check the last streak
    bestStreak = Math.max(bestStreak, tempStreak);

    // Best streak should be at least as good as current streak
    bestStreak = Math.max(bestStreak, currentStreak);

    return {
      currentStreak,
      bestStreak,
      lastCompletionDate: sortedDates[0],
      completionDates
    };
  }

  /**
   * Check if two dates (YYYY-MM-DD) are consecutive days
   */
  private areConsecutiveDays(date1: string, date2: string): boolean {
    const d1 = new Date(date1 + 'T00:00:00Z');
    const d2 = new Date(date2 + 'T00:00:00Z');

    const diffTime = d2.getTime() - d1.getTime();
    const diffDays = diffTime / (1000 * 60 * 60 * 24);

    return diffDays === 1;
  }

  /**
   * Get the previous day in YYYY-MM-DD format
   */
  private getPreviousDay(dateStr: string): string {
    const date = new Date(dateStr + 'T00:00:00Z');
    date.setUTCDate(date.getUTCDate() - 1);
    return date.toISOString().split('T')[0];
  }

  /**
   * Get date N days ago in YYYY-MM-DD format
   */
  private getDateDaysAgo(days: number): string {
    const date = new Date();
    date.setUTCDate(date.getUTCDate() - days);
    return date.toISOString().split('T')[0];
  }

  /**
   * Get user's streak information (convenience method)
   * @param userId - User ID
   */
  async getUserStreak(userId: string): Promise<DailyStreak> {
    return this.calculateStreaks(userId);
  }

  /**
   * Check if user has completed today's challenge
   * @param userId - User ID
   */
  async hasCompletedToday(userId: string): Promise<boolean> {
    const today = new Date().toISOString().split('T')[0];
    return this.isDateCompleted(userId, today);
  }
}

export const dailyStreaksService = new DailyStreaksService();
