import {
  LobbyState,
  LobbyStatus,
  PlayerState,
  PlayerStatus,
  WikiPageSummary,
  LobbyConfig,
  GameEndMode,
  ChallengeMode,
  RoundScore,
} from '../types';
import {
  createMultiplayerLobby,
  getLobby,
  updateLobby,
  subscribeToLobby as firestoreSubscribeToLobby,
  deleteLobby,
} from './firestoreService';
import { fetchHybridPage } from './wikiService';

class MultiplayerService {
  /**
   * Generate a 6-character room code
   * Avoids confusing characters like 0/O, 1/I, etc.
   */
  private generateRoomCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No 0, O, 1, I
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
  }

  /**
   * Check if a room code already exists
   */
  async roomCodeExists(roomCode: string): Promise<boolean> {
    const lobby = await getLobby(roomCode);
    return lobby !== null;
  }

  /**
   * Generate a unique room code
   */
  async generateUniqueRoomCode(): Promise<string> {
    let code: string;
    let attempts = 0;
    const maxAttempts = 10;

    do {
      code = this.generateRoomCode();
      attempts++;

      if (attempts >= maxAttempts) {
        throw new Error('Failed to generate unique room code');
      }
    } while (await this.roomCodeExists(code));

    return code;
  }

  /**
   * Create a new multiplayer lobby
   */
  async createLobby(
    userId: string,
    displayName: string,
    photoURL: string | null,
    startPage: WikiPageSummary,
    targetPage: WikiPageSummary,
    config?: LobbyConfig
  ): Promise<LobbyState> {
    const roomCode = await this.generateUniqueRoomCode();

    const playerState: PlayerState = {
      displayName,
      photoURL,
      status: PlayerStatus.READY,
      currentPage: null,
      clicks: 0,
      history: [],
      finishTime: null,
      joinedAt: Date.now(),
    };

    // Default config if not provided
    const lobbyConfig: LobbyConfig = config || {
      themes: ['all'],
      numberOfRounds: 1,
      gameEndMode: GameEndMode.FIRST_FINISH,
      challengeMode: ChallengeMode.RANDOM,
    };

    const lobby: LobbyState = {
      roomCode,
      createdBy: userId,
      createdByName: displayName,
      startPage: startPage.title,
      targetPage: targetPage.title,
      startPageData: startPage,
      targetPageData: targetPage,
      status: LobbyStatus.WAITING,
      maxPlayers: 10,
      createdAt: Date.now(),
      startedAt: null,
      winnerId: null,
      winnerName: null,
      players: {
        [userId]: playerState,
      },
      config: lobbyConfig,
      currentRound: 1,
    };

    await createMultiplayerLobby(lobby);
    return lobby;
  }

  /**
   * Join an existing lobby
   */
  async joinLobby(
    roomCode: string,
    userId: string,
    displayName: string,
    photoURL: string | null
  ): Promise<LobbyState> {
    const lobby = await getLobby(roomCode);

    if (!lobby) {
      throw new Error('Lobby not found');
    }

    if (lobby.status !== LobbyStatus.WAITING) {
      throw new Error('Game has already started');
    }

    const playerCount = Object.keys(lobby.players).length;
    if (playerCount >= lobby.maxPlayers) {
      throw new Error('Lobby is full');
    }

    // Check if player already in lobby
    if (lobby.players[userId]) {
      return lobby; // Already in lobby
    }

    const playerState: PlayerState = {
      displayName,
      photoURL,
      status: PlayerStatus.READY,
      currentPage: null,
      clicks: 0,
      history: [],
      finishTime: null,
      joinedAt: Date.now(),
    };

    const updatedPlayers = {
      ...lobby.players,
      [userId]: playerState,
    };

    await updateLobby(roomCode, { players: updatedPlayers });

    return {
      ...lobby,
      players: updatedPlayers,
    };
  }

  /**
   * Leave a lobby
   */
  async leaveLobby(roomCode: string, userId: string): Promise<void> {
    const lobby = await getLobby(roomCode);

    if (!lobby) {
      return; // Lobby doesn't exist anymore
    }

    const updatedPlayers = { ...lobby.players };
    delete updatedPlayers[userId];

    // If lobby is empty, delete it
    if (Object.keys(updatedPlayers).length === 0) {
      await deleteLobby(roomCode);
      return;
    }

    // If creator left, transfer ownership to next player
    let updates: Partial<LobbyState> = { players: updatedPlayers };
    if (lobby.createdBy === userId) {
      const newCreatorId = Object.keys(updatedPlayers)[0];
      const newCreator = updatedPlayers[newCreatorId];
      updates = {
        ...updates,
        createdBy: newCreatorId,
        createdByName: newCreator.displayName,
      };
    }

    await updateLobby(roomCode, updates);
  }

  /**
   * Set challenge selection status
   */
  async setSelectingChallenge(roomCode: string, selecting: boolean): Promise<void> {
    await updateLobby(roomCode, {
      selectingChallenge: selecting,
    });
  }

  /**
   * Update lobby status
   */
  async updateLobbyStatus(roomCode: string, status: LobbyStatus): Promise<void> {
    await updateLobby(roomCode, {
      status: status,
    });
  }

  /**
   * Increment the current round counter
   */
  async incrementRound(roomCode: string): Promise<void> {
    const lobby = await getLobby(roomCode);

    if (!lobby) {
      throw new Error('Lobby not found');
    }

    const currentRound = lobby.currentRound || 1;
    const totalRounds = lobby.config?.numberOfRounds || 1;

    if (currentRound >= totalRounds) {
      throw new Error('No more rounds to play');
    }

    await updateLobby(roomCode, {
      currentRound: currentRound + 1,
    });
  }

  /**
   * Save round scores to history before starting next round
   */
  async saveRoundScore(roomCode: string): Promise<void> {
    const lobby = await getLobby(roomCode);

    if (!lobby) {
      throw new Error('Lobby not found');
    }

    const currentRound = lobby.currentRound || 1;

    // Calculate positions and scores for all players
    const playerScores: Record<string, {
      clicks: number;
      finishTime: number | null;
      timeTaken: number | null;
      position: number;
    }> = {};

    // Sort players by finish time (winners first), then by clicks
    const sortedPlayers = Object.entries(lobby.players)
      .map(([playerId, player]) => ({
        playerId,
        player,
        timeTaken: player.finishTime && lobby.startedAt
          ? Math.floor((player.finishTime - lobby.startedAt) / 1000)
          : null,
      }))
      .sort((a, b) => {
        if (a.player.finishTime && b.player.finishTime) {
          return a.player.finishTime - b.player.finishTime;
        }
        if (a.player.finishTime) return -1;
        if (b.player.finishTime) return 1;
        return a.player.clicks - b.player.clicks;
      });

    // Assign positions and create score records
    sortedPlayers.forEach(({ playerId, player, timeTaken }, index) => {
      playerScores[playerId] = {
        clicks: player.clicks,
        finishTime: player.finishTime,
        timeTaken,
        position: index + 1,
      };
    });

    // Create round score entry
    const roundScore: RoundScore = {
      roundNumber: currentRound,
      winnerId: lobby.winnerId,
      winnerName: lobby.winnerName,
      playerScores,
    };

    // Add to round history
    const roundHistory = lobby.roundHistory || [];
    roundHistory.push(roundScore);

    // Calculate total scores for each player
    const updatedPlayers = { ...lobby.players };
    Object.keys(updatedPlayers).forEach((playerId) => {
      let totalScore = 0;
      roundHistory.forEach((round) => {
        const playerRoundScore = round.playerScores[playerId];
        if (playerRoundScore) {
          // Score = clicks * 10 + time (lower is better)
          const roundScore = playerRoundScore.clicks * 10 + (playerRoundScore.timeTaken || 999);
          totalScore += roundScore;
        }
      });
      updatedPlayers[playerId].totalScore = totalScore;
    });

    // Update lobby with round history and total scores
    await updateLobby(roomCode, {
      roundHistory,
      players: updatedPlayers,
    });
  }

  /**
   * Update lobby pages (for semi-random and manual challenge modes)
   */
  async updateLobbyPages(
    roomCode: string,
    startPage: WikiPageSummary,
    targetPage: WikiPageSummary
  ): Promise<void> {
    await updateLobby(roomCode, {
      startPage: startPage.title,
      targetPage: targetPage.title,
      startPageData: startPage,
      targetPageData: targetPage,
    });
  }

  /**
   * Start the game
   */
  async startGame(roomCode: string): Promise<void> {
    const lobby = await getLobby(roomCode);

    if (!lobby) {
      throw new Error('Lobby not found');
    }

    const playerCount = Object.keys(lobby.players).length;
    if (playerCount < 2) {
      throw new Error('Need at least 2 players to start');
    }

    // Set all players to PLAYING status and reset their progress
    const updatedPlayers = { ...lobby.players };
    Object.keys(updatedPlayers).forEach((playerId) => {
      updatedPlayers[playerId] = {
        ...updatedPlayers[playerId],
        status: PlayerStatus.PLAYING,
        currentPage: null,
        clicks: 0,
        history: [],
        finishTime: null,
      };
    });

    await updateLobby(roomCode, {
      status: LobbyStatus.PLAYING,
      startedAt: Date.now(),
      players: updatedPlayers,
      winnerId: null,
      winnerName: null,
    });
  }

  /**
   * Start next round (reset players, does NOT increment round counter - use incrementRound() first)
   */
  async startNextRound(roomCode: string): Promise<void> {
    const lobby = await getLobby(roomCode);

    if (!lobby) {
      throw new Error('Lobby not found');
    }

    // Reset all players for next round
    const updatedPlayers = { ...lobby.players };
    Object.keys(updatedPlayers).forEach((playerId) => {
      updatedPlayers[playerId] = {
        ...updatedPlayers[playerId],
        status: PlayerStatus.PLAYING,
        currentPage: null,
        clicks: 0,
        history: [],
        finishTime: null,
      };
    });

    await updateLobby(roomCode, {
      status: LobbyStatus.PLAYING,
      startedAt: Date.now(),
      players: updatedPlayers,
      winnerId: null,
      winnerName: null,
      selectingChallenge: false,
    });
  }

  /**
   * Start next round with random challenge (for random mode)
   */
  async startNextRoundWithRandomChallenge(roomCode: string, themes: string[]): Promise<void> {
    const lobby = await getLobby(roomCode);

    if (!lobby) {
      throw new Error('Lobby not found');
    }

    const currentRound = lobby.currentRound || 1;
    const totalRounds = lobby.config?.numberOfRounds || 1;

    if (currentRound >= totalRounds) {
      throw new Error('No more rounds to play');
    }

    // Generate new random pages
    const startPage = await fetchHybridPage();
    const targetPage = await fetchHybridPage();

    // Reset all players for next round
    const updatedPlayers = { ...lobby.players };
    Object.keys(updatedPlayers).forEach((playerId) => {
      updatedPlayers[playerId] = {
        ...updatedPlayers[playerId],
        status: PlayerStatus.PLAYING,
        currentPage: null,
        clicks: 0,
        history: [],
        finishTime: null,
      };
    });

    await updateLobby(roomCode, {
      status: LobbyStatus.PLAYING,
      currentRound: currentRound + 1,
      startedAt: Date.now(),
      startPage: startPage.title,
      targetPage: targetPage.title,
      startPageData: startPage,
      targetPageData: targetPage,
      players: updatedPlayers,
      winnerId: null,
      winnerName: null,
      selectingChallenge: false,
    });
  }

  /**
   * Update player progress during the game
   */
  async updatePlayerProgress(
    roomCode: string,
    userId: string,
    currentPage: string,
    clicks: number,
    history: string[]
  ): Promise<void> {
    const lobby = await getLobby(roomCode);

    if (!lobby || !lobby.players[userId]) {
      return;
    }

    const updatedPlayers = {
      ...lobby.players,
      [userId]: {
        ...lobby.players[userId],
        currentPage,
        clicks,
        history,
      },
    };

    await updateLobby(roomCode, { players: updatedPlayers });
  }

  /**
   * Mark a player as finished
   */
  async finishPlayer(
    roomCode: string,
    userId: string,
    finishTime: number
  ): Promise<void> {
    const lobby = await getLobby(roomCode);

    if (!lobby || !lobby.players[userId]) {
      return;
    }

    const updatedPlayers = {
      ...lobby.players,
      [userId]: {
        ...lobby.players[userId],
        status: PlayerStatus.FINISHED,
        finishTime,
      },
    };

    // Check if this is the first player to finish
    let updates: Partial<LobbyState> = { players: updatedPlayers };
    if (!lobby.winnerId) {
      const player = lobby.players[userId];
      updates = {
        ...updates,
        status: LobbyStatus.FINISHED,
        winnerId: userId,
        winnerName: player.displayName,
      };
    }

    await updateLobby(roomCode, updates);
  }

  /**
   * Subscribe to lobby changes (real-time)
   */
  subscribeToLobby(
    roomCode: string,
    callback: (lobby: LobbyState | null) => void
  ): () => void {
    return firestoreSubscribeToLobby(roomCode, callback);
  }

  /**
   * Cleanup old lobbies (utility function)
   * Can be called periodically or on app init
   */
  async cleanupOldLobbies(): Promise<void> {
    // This would require a Cloud Function or admin SDK
    // For now, lobbies will be cleaned up manually or via Firebase TTL policies
  }
}

export const multiplayerService = new MultiplayerService();
