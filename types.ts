export enum GameStatus {
  IDLE = 'IDLE',
  LOADING = 'LOADING',
  PLAYING = 'PLAYING',
  WON = 'WON',
  ERROR = 'ERROR'
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
  startPage: WikiPageSummary | null;
  targetPage: WikiPageSummary | null;
  currentPage: WikiPageSummary | null;
  history: string[]; // List of titles
  clicks: number;
  startTime: number | null;
  endTime: number | null;
  error: string | null;
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
}