import { leaderboardService } from './leaderboardService';
import * as firestoreService from './firestoreService';
import type { GameEntry } from '../types';

export interface MigrationResult {
  success: boolean;
  entriesMigrated: number;
  errors: string[];
}

/**
 * Check if there is local data to migrate
 */
export function hasLocalData(): boolean {
  const entries = leaderboardService['getEntriesFromLocalStorage']();
  return entries.length > 0;
}

/**
 * Get the number of local entries
 */
export function getLocalDataCount(): number {
  const entries = leaderboardService['getEntriesFromLocalStorage']();
  return entries.length;
}

/**
 * Migrate all localStorage data to Firestore for a user
 * This preserves all local game history when a user creates an account
 */
export async function migrateLocalDataToFirestore(userId: string): Promise<MigrationResult> {
  const errors: string[] = [];
  let migratedCount = 0;

  try {
    const localEntries = leaderboardService['getEntriesFromLocalStorage']();

    if (localEntries.length === 0) {
      return {
        success: true,
        entriesMigrated: 0,
        errors: []
      };
    }

    // Migrate each entry
    for (const entry of localEntries) {
      try {
        const score = leaderboardService.calculateScore(entry.clicks, entry.timeSeconds);
        const gameEntry: Omit<GameEntry, 'id'> = {
          ...entry,
          userId,
          score
        };

        await firestoreService.saveGame(userId, gameEntry);
        migratedCount++;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        errors.push(`Erreur pour l'entrée ${entry.id}: ${errorMessage}`);
        console.error('Failed to migrate entry:', entry.id, error);
      }
    }

    return {
      success: errors.length === 0,
      entriesMigrated: migratedCount,
      errors
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      entriesMigrated: migratedCount,
      errors: [`Erreur globale: ${errorMessage}`]
    };
  }
}

/**
 * Clear local data after successful migration (optional, use with caution)
 * It's recommended to keep local data as backup
 */
export function clearLocalDataAfterMigration(): void {
  console.warn('Clearing local leaderboard data after migration');
  leaderboardService.clearLeaderboard();
}
