import { DailyChallenge, WikiPageSummary } from '../types';
import { fetchRandomPage, fetchPageSummary, fetchHybridPage, fetchGuaranteedPopularPage } from './wikiService';
import * as firestoreService from './firestoreService';

const STORAGE_KEY = 'wikilink-daily-challenges';

class DailyChallengeService {
  private generateChallengeId(date: Date): string {
    return date.toISOString().split('T')[0]; // YYYY-MM-DD
  }

  getTodayId(): string {
    return this.generateChallengeId(new Date());
  }

  private loadChallenges(): Record<string, DailyChallenge> {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  }

  private saveChallenges(challenges: Record<string, DailyChallenge>): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(challenges));
    } catch (e) {
      console.error('Failed to save daily challenges:', e);
    }
  }

  /**
   * Generate a pair of pages for a given date's daily challenge
   * Start page: Hybrid (80% popular, 20% random) for variety
   * Target page: Guaranteed popular (100%) for discoverability
   */
  private async generateChallengeForDate(dateId: string): Promise<DailyChallenge> {
    // Start page: Hybrid (80% popular, 20% random) for variety
    // Target page: MUST be popular (100%) for discoverability
    const [start, target] = await Promise.all([
      fetchHybridPage(),
      fetchGuaranteedPopularPage()
    ]);

    // Ensure start and target are different
    let finalTarget = target;
    let retries = 0;
    const maxRetries = 5;

    while (start.title === finalTarget.title && retries < maxRetries) {
      finalTarget = await fetchGuaranteedPopularPage();
      retries++;
    }

    // If after retries they're still the same (extremely unlikely),
    // use random as fallback
    if (start.title === finalTarget.title) {
      console.warn('Unable to generate different pages, using random for target');
      finalTarget = await fetchRandomPage();
    }

    return {
      id: dateId,
      date: dateId,
      startPage: start.title,
      targetPage: finalTarget.title,
      startPageData: start,
      targetPageData: finalTarget,
    };
  }

  async getTodayChallenge(): Promise<DailyChallenge> {
    const todayId = this.getTodayId();

    // 1. Try Firestore first (global challenge for all players)
    try {
      console.log('[DailyChallenge] Checking Firestore for today\'s challenge:', todayId);
      const firestoreChallenge = await firestoreService.getTodayChallenge();
      if (firestoreChallenge) {
        console.log('[DailyChallenge] Found challenge in Firestore:', firestoreChallenge);
        // Cache locally for offline access
        this.saveChallengeLocally(firestoreChallenge);
        return firestoreChallenge;
      }
      console.log('[DailyChallenge] No challenge found in Firestore, will generate new one');
    } catch (error) {
      console.warn('Firestore unavailable, using local challenge:', error);
    }

    // 2. Fallback to localStorage
    const challenges = this.loadChallenges();
    if (challenges[todayId]) {
      // Fetch the full page data if not already stored
      const challenge = challenges[todayId];
      if (!challenge.startPageData || !challenge.targetPageData) {
        try {
          const [startData, targetData] = await Promise.all([
            fetchPageSummary(challenge.startPage),
            fetchPageSummary(challenge.targetPage),
          ]);
          challenge.startPageData = startData;
          challenge.targetPageData = targetData;
          challenges[todayId] = challenge;
          this.saveChallenges(challenges);
        } catch (e) {
          console.warn('Failed to fetch page summaries for daily challenge:', e);
        }
      }
      return challenge;
    }

    // 3. Generate new challenge
    console.log('[DailyChallenge] Generating new challenge for:', todayId);
    const newChallenge = await this.generateChallengeForDate(todayId);
    console.log('[DailyChallenge] Generated challenge:', newChallenge);

    // 4. Try to save to Firestore (best effort, for global sync)
    try {
      console.log('[DailyChallenge] Saving to Firestore...');
      await firestoreService.createDailyChallenge(newChallenge);
      console.log('[DailyChallenge] Successfully saved to Firestore');
    } catch (error) {
      console.warn('Could not save challenge to Firestore:', error);
    }

    // 5. Always save locally
    this.saveChallengeLocally(newChallenge);

    return newChallenge;
  }

  /**
   * Save a challenge to localStorage
   */
  private saveChallengeLocally(challenge: DailyChallenge): void {
    const challenges = this.loadChallenges();
    challenges[challenge.id] = challenge;
    this.saveChallenges(challenges);
  }

  /**
   * Check if user has already completed today's challenge
   */
  hasCompletedToday(): boolean {
    const todayId = this.getTodayId();
    const completionKey = `daily-completed-${todayId}`;
    return localStorage.getItem(completionKey) === 'true';
  }

  /**
   * Mark today's challenge as completed
   */
  markTodayCompleted(): void {
    const todayId = this.getTodayId();
    const completionKey = `daily-completed-${todayId}`;
    localStorage.setItem(completionKey, 'true');
  }

  /**
   * Get time remaining until next challenge (midnight)
   */
  getTimeUntilNextChallenge(): { hours: number; minutes: number; seconds: number } {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const diff = tomorrow.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    return { hours, minutes, seconds };
  }
}

export const dailyChallengeService = new DailyChallengeService();
