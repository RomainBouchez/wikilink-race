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