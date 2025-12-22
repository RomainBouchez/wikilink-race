export enum GameStatus {
  IDLE = 'IDLE',
  LOADING = 'LOADING',
  PLAYING = 'PLAYING',
  WON = 'WON',
  ERROR = 'ERROR'
}

export enum GameMode {
  DAILY = 'DAILY',
  TRAINING = 'TRAINING',
  MULTIPLAYER = 'MULTIPLAYER'
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
  lobbyCode?: string; // For multiplayer mode
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

// Multiplayer types
export enum LobbyStatus {
  WAITING = 'waiting',
  PLAYING = 'playing',
  FINISHED = 'finished'
}

export enum PlayerStatus {
  READY = 'ready',
  PLAYING = 'playing',
  FINISHED = 'finished',
  ABANDONED = 'abandoned'
}

export enum GameEndMode {
  FIRST_FINISH = 'first_finish',      // Le jeu s'arrête quand le premier joueur finit
  TURN_BASED_30S = 'turn_based_30s',  // Mode tour par tour avec 30s par tour
  TURN_BASED_45S = 'turn_based_45s',  // Mode tour par tour avec 45s par tour
  TURN_BASED_1M = 'turn_based_1m'     // Mode tour par tour avec 1min par tour
}

export enum ChallengeMode {
  RANDOM = 'random',              // L'app choisit aléatoirement
  SEMI_RANDOM = 'semi_random',    // L'app propose 3 défis, le chef choisit
  MANUAL = 'manual'               // Le chef entre manuellement start et target
}

export interface LobbyConfig {
  themes: string[];           // Liste des thèmes sélectionnés, ou ["all"] pour tous les thèmes
  numberOfRounds: number;     // Nombre de rounds à jouer
  gameEndMode: GameEndMode;   // Mode de fin de jeu
  challengeMode: ChallengeMode; // Mode de sélection des défis
}

export interface RoundScore {
  roundNumber: number;
  winnerId: string | null;
  winnerName: string | null;
  playerScores: Record<string, {
    clicks: number;
    finishTime: number | null;
    timeTaken: number | null; // Time in seconds
    position: number; // 1st, 2nd, 3rd, etc.
  }>;
}

export interface PlayerState {
  displayName: string;
  photoURL: string | null;
  status: PlayerStatus;
  currentPage: string | null;
  clicks: number;
  history: string[];
  finishTime: number | null;
  joinedAt: number;
  totalScore?: number; // Total score across all rounds (lower is better)
}

export interface LobbyState {
  roomCode: string;
  createdBy: string;
  createdByName: string;
  startPage: string;
  targetPage: string;
  startPageData?: WikiPageSummary;
  targetPageData?: WikiPageSummary;
  status: LobbyStatus;
  maxPlayers: number;
  createdAt: number;
  startedAt: number | null;
  winnerId: string | null;
  winnerName: string | null;
  players: Record<string, PlayerState>;
  config: LobbyConfig;        // Configuration du lobby
  currentRound?: number;      // Round actuel (pour mode multi-rounds)
  selectingChallenge?: boolean; // Indique si le chef est en train de sélectionner les pages
  roundHistory?: RoundScore[]; // Historique des scores de chaque round
}