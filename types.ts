export enum GameStatus {
  IDLE = 'IDLE',
  LOADING = 'LOADING',
  PLAYING = 'PLAYING',
  WON = 'WON',
  ERROR = 'ERROR'
}

export enum GameMode {
  DAILY = 'DAILY',
  TRAINING = 'TRAINING'
}

export interface WikiPageSummary {
  title: string;
  displaytitle: string;
  thumbnail?: {
    source: string;
    width: number;
    height: number;
  };
  description?: string;
  extract?: string;
}

export interface GameState {
  status: GameStatus;
  mode: GameMode | null;
  startPage: WikiPageSummary | null;
  targetPage: WikiPageSummary | null;
  currentPage: WikiPageSummary | null;
  history: string[]; // List of titles
  clicks: number;
  startTime: number | null;
  endTime: number | null;
  error: string | null;
  dailyChallengeId?: string; // For daily mode
}

export interface HistoryItem {
  title: string;
  timestamp: number;
}

export interface LeaderboardEntry {
  id: string;
  userId?: string; // Firebase user ID (optional for backward compatibility)
  playerName: string;
  clicks: number;
  timeSeconds: number;
  startPage: string;
  targetPage: string;
  path: string[];
  timestamp: number;
  mode: GameMode;
  dailyChallengeId?: string;
}

export interface DailyChallenge {
  id: string;
  date: string; // YYYY-MM-DD format
  startPage: string;
  targetPage: string;
  startPageData?: WikiPageSummary;
  targetPageData?: WikiPageSummary;
}

export interface DailyProgressState {
  dailyChallengeId: string;      // YYYY-MM-DD format
  userId?: string;                // For authenticated users
  currentPageTitle: string;
  history: string[];
  clicks: number;
  startTime: number;
  lastSaved: number;
  completed: boolean;
}

// User authentication types
export interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  isAnonymous: boolean;
  pseudo?: string; // For anonymous users
}

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string | null;
  photoURL: string | null;
  isAnonymous: boolean;
  pseudo?: string;
  stat: UserStats; // Note: "stat" singular to match Firestore structure
  createdAt: number;
  updatedAt: number;
}

export interface UserStats {
  totalGames: number;
  avgTime: number;
  bestTime: number;
  totalClicks?: number;
  averageClicks?: number;
  bestScore?: number;
}

// Extended game entry with score calculation for Firestore
export interface GameEntry extends LeaderboardEntry {
  score: number; // Calculated: clicks * 10 + timeSeconds
}