import React, { useState, useCallback, useEffect, useRef } from 'react';
import { GameStatus, GameState, WikiPageSummary, GameMode, User, LobbyState, LobbyStatus, PlayerStatus, ChallengeMode } from './types';
import { fetchRandomPage, fetchPageSummary, fetchHybridPage, arePageTitlesEqual } from './services/wikiService';
import { leaderboardService } from './services/leaderboardService';
import { dailyChallengeService } from './services/dailyChallengeService';
import { dailyProgressService } from './services/dailyProgressService';
import { dailyStreaksService } from './services/dailyStreaksService';
import { multiplayerService } from './services/multiplayerService';
import { onAuthStateChanged, mapFirebaseUser } from './services/authService';
import { createOrUpdateUserProfile, saveAbandonedGame } from './services/firestoreService';
import { hasLocalData, migrateLocalDataToFirestore, clearLocalDataAfterMigration } from './services/migrationService';
import { WikiViewer } from './components/WikiViewer';
import { GameSidebar } from './components/GameSidebar';
import { Button } from './components/Button';
import { Leaderboard } from './components/Leaderboard';
import { ModeSelection } from './components/ModeSelection';
import { AuthButton } from './components/AuthButton';
import { AuthModal } from './components/AuthModal';
import { FriendsModal } from './components/FriendsModal';
import { ProfilePage } from './components/ProfilePage';
import { MultiplayerLobbyModal } from './components/MultiplayerLobbyModal';
import { LobbyWaitingRoom } from './components/LobbyWaitingRoom';
import { LobbyConfigPage } from './components/LobbyConfigPage';
import { MultiplayerRoundEnd } from './components/MultiplayerRoundEnd';
import { MultiplayerFinalRecap } from './components/MultiplayerFinalRecap';
import { ShareDiscordButton } from './components/ShareDiscordButton';
import { Trophy, ArrowRight, BookOpen, RotateCcw, Globe, Search, Map, ChevronRight, Home } from 'lucide-react';
const INITIAL_STATE: GameState = {
  status: GameStatus.IDLE,
  mode: null,
  startPage: null,
  targetPage: null,
  currentPage: null,
  history: [],
  clicks: 0,
  startTime: null,
  endTime: null,
  error: null,
};

function App() {
  const [gameState, setGameState] = useState<GameState>(INITIAL_STATE);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [lastSavedEntryId, setLastSavedEntryId] = useState<string | null>(null);

  // Authentication state
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showFriendsModal, setShowFriendsModal] = useState(false);
  const [showProfilePage, setShowProfilePage] = useState(false);

  // Multiplayer state
  const [lobbyState, setLobbyState] = useState<LobbyState | null>(null);
  const [showLobbyModal, setShowLobbyModal] = useState(false);
  const [multiplayerAction, setMultiplayerAction] = useState<'create' | 'join' | null>(null);
  const [showLobbyConfigPage, setShowLobbyConfigPage] = useState(false);

  // Ref to prevent saving abandoned game multiple times
  const isSavingAbandoned = useRef(false);

  // Listen to authentication state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser) {
        const mappedUser = mapFirebaseUser(firebaseUser);
        setUser(mappedUser);

        // Create/update user profile in Firestore
        try {
          await createOrUpdateUserProfile(mappedUser);
        } catch (error) {
          console.error('Failed to create user profile:', error);
        }

        // Configure leaderboard service for Firestore mode
        leaderboardService.configure(true, firebaseUser.uid);

        // Auto-migrate local data if it exists
        if (hasLocalData()) {
          migrateLocalDataToFirestore(firebaseUser.uid)
            .then(result => {
              if (result.success) {
                // Clear local data after successful migration to prevent duplicates
                clearLocalDataAfterMigration();
              } else {
                // Even with errors, clear local data if some games were migrated
                if (result.entriesMigrated > 0) {
                  clearLocalDataAfterMigration();
                }
              }
            })
            .catch(error => {
              console.error('Migration failed:', error);
            });
        }
      } else {
        setUser(null);
        // Configure leaderboard service for localStorage mode (guest)
        leaderboardService.configure(false, null);
      }
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Save abandoned game when page is refreshed or closed
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Try to save abandoned game on page unload
      // Note: Async operations may not complete reliably during unload
      if (
        gameState.status === GameStatus.PLAYING &&
        gameState.mode === GameMode.TRAINING &&
        user &&
        gameState.clicks > 0 &&
        gameState.startTime &&
        gameState.startPage &&
        gameState.currentPage &&
        !gameState.savedAsAbandoned &&
        !isSavingAbandoned.current
      ) {
        // Attempt to save (may not complete if page closes too quickly)
        saveCurrentGameIfAbandoned().catch(err => {
          console.error('Failed to save on unload:', err);
        });
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [gameState, user]);

  // Check for saved daily progress (but don't auto-restore)
  const [hasSavedDailyProgress, setHasSavedDailyProgress] = useState(false);

  useEffect(() => {
    async function checkSavedProgress() {
      if (authLoading) return;

      const todayId = dailyChallengeService.getTodayId();

      // Check if already completed
      if (dailyChallengeService.hasCompletedToday()) {
        await dailyProgressService.clearProgress(todayId, user);
        setHasSavedDailyProgress(false);
        return;
      }

      // Check if there's saved progress
      const progress = await dailyProgressService.loadProgress(todayId, user);
      if (progress && progress.dailyChallengeId === todayId) {
        setHasSavedDailyProgress(true);
      } else {
        setHasSavedDailyProgress(false);
      }
    }

    if (!authLoading) {
      checkSavedProgress();
    }
  }, [authLoading, user]);

  // Function to restore daily progress when user chooses to
  const restoreDailyProgress = async () => {
    const todayId = dailyChallengeService.getTodayId();
    const progress = await dailyProgressService.loadProgress(todayId, user);

    if (!progress) return;

    try {
      const challenge = await dailyChallengeService.getTodayChallenge();
      const currentPage = await fetchPageSummary(progress.currentPageTitle);

      setGameState({
        status: GameStatus.PLAYING,
        mode: GameMode.DAILY,
        startPage: challenge.startPageData || await fetchPageSummary(challenge.startPage),
        targetPage: challenge.targetPageData || await fetchPageSummary(challenge.targetPage),
        currentPage: currentPage,
        history: progress.history,
        clicks: progress.clicks,
        startTime: progress.startTime,
        endTime: null,
        error: null,
        dailyChallengeId: todayId,
      });

      setHasSavedDailyProgress(false);
    } catch (error) {
      console.error('[DailyProgress] Failed to restore progress:', error);
      await dailyProgressService.clearProgress(todayId, user);
      setHasSavedDailyProgress(false);
    }
  };

  // Auto-save daily progress on every click
  useEffect(() => {
    if (
      gameState.mode === GameMode.DAILY &&
      gameState.status === GameStatus.PLAYING &&
      gameState.dailyChallengeId &&
      gameState.currentPage
    ) {
      dailyProgressService.saveProgress(gameState, user);
    }
  }, [gameState.clicks, gameState.currentPage?.title, user]);

  // Auto-save score when game is won
  useEffect(() => {
    const autoSaveScore = async () => {
      // Only auto-save when game is won
      if (gameState.status !== GameStatus.WON) {
        return;
      }

      // Skip if already saved
      if (lastSavedEntryId) {
        return;
      }

      // For multiplayer: only save if current user is the winner
      if (gameState.mode === GameMode.MULTIPLAYER && lobbyState) {
        if (!user || lobbyState.winnerId !== user.uid) {
          return;
        }
      }

      const timeTaken = gameState.startTime && gameState.endTime
        ? Math.floor((gameState.endTime - gameState.startTime) / 1000)
        : 0;

      // Determine player name
      let playerName: string;

      if (user) {
        // Authenticated user - use their display name or pseudo
        playerName = user.displayName || user.pseudo || 'Joueur Anonyme';
      } else {
        // Guest mode - ask for name
        const name = prompt('Entrez votre nom pour le leaderboard:');
        if (!name || name.trim() === '') return;
        playerName = name.trim();
      }

      try {
        const entry = await leaderboardService.saveScore({
          playerName,
          clicks: gameState.clicks,
          timeSeconds: timeTaken,
          startPage: gameState.startPage!.title,
          targetPage: gameState.targetPage!.title,
          path: gameState.history,
          mode: gameState.mode!,
          dailyChallengeId: gameState.dailyChallengeId,
        });

        // Mark daily challenge as completed and clear progress
        if (gameState.mode === GameMode.DAILY && gameState.dailyChallengeId) {
          dailyChallengeService.markTodayCompleted();

          // Record daily completion for streak tracking
          if (user) {
            const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
            await dailyStreaksService.recordDailyCompletion(
              user.uid,
              today,
              gameState.dailyChallengeId
            );
          }

          await dailyProgressService.clearProgress(gameState.dailyChallengeId, user);
        }

        setLastSavedEntryId(entry.id);
      } catch (error) {
        console.error('Failed to auto-save score:', error);
      }
    };

    autoSaveScore();
  }, [gameState.status, gameState.mode, gameState.startTime, gameState.endTime, gameState.clicks, gameState.startPage, gameState.targetPage, gameState.history, gameState.dailyChallengeId, user, lastSavedEntryId, lobbyState]);

  // Subscribe to lobby updates
  useEffect(() => {
    if (!lobbyState || !lobbyState.roomCode) return;

    const unsubscribe = multiplayerService.subscribeToLobby(
      lobbyState.roomCode,
      (lobby) => {
        if (!lobby) {
          // Lobby deleted
          setLobbyState(null);
          setGameState(INITIAL_STATE);
          return;
        }

        setLobbyState(lobby);

        // If the game starts or restarts (new round)
        if (lobby.status === LobbyStatus.PLAYING && gameState.status === GameStatus.IDLE) {
          initMultiplayerGame(lobby);
        }

        // If lobby went back to WAITING while we were on win screen (next round setup)
        if (lobby.status === LobbyStatus.WAITING && gameState.status === GameStatus.WON) {
          setGameState(INITIAL_STATE);
        }

        // If a new round started while we were on win screen
        if (lobby.status === LobbyStatus.PLAYING && gameState.status === GameStatus.WON) {
          initMultiplayerGame(lobby);
        }

        // If someone won
        if (lobby.winnerId && gameState.status === GameStatus.PLAYING) {
          setGameState(prev => ({
            ...prev,
            status: GameStatus.WON,
            endTime: Date.now()
          }));
        }
      }
    );

    return () => unsubscribe();
  }, [lobbyState?.roomCode, gameState.status]);

  // Return to home screen
  const goHome = useCallback(() => {
    // Leave lobby if in one
    if (lobbyState && user) {
      multiplayerService.leaveLobby(lobbyState.roomCode, user.uid);
    }
    setLobbyState(null);
    setGameState(INITIAL_STATE);
  }, [lobbyState, user]);

  // Initialize multiplayer game
  const initMultiplayerGame = async (lobby: LobbyState) => {
    if (!lobby.startPageData || !lobby.targetPageData) return;

    setGameState({
      status: GameStatus.PLAYING,
      mode: GameMode.MULTIPLAYER,
      startPage: lobby.startPageData,
      targetPage: lobby.targetPageData,
      currentPage: lobby.startPageData,
      history: [lobby.startPageData.title],
      clicks: 0,
      startTime: Date.now(),
      endTime: null,
      error: null,
      lobbyCode: lobby.roomCode,
    });
  };

  /**
   * Save current game if it's in progress and abandoned
   * Only for training mode
   */
  const saveCurrentGameIfAbandoned = async () => {
    // Prevent multiple simultaneous saves
    if (isSavingAbandoned.current) {
      return;
    }

    // Only save if:
    // 1. Game is currently playing
    // 2. In training mode
    // 3. User is authenticated
    // 4. Has made at least one click
    // 5. Not already saved as abandoned
    if (
      gameState.status === GameStatus.PLAYING &&
      gameState.mode === GameMode.TRAINING &&
      user &&
      gameState.clicks > 0 &&
      gameState.startTime &&
      gameState.startPage &&
      gameState.currentPage &&
      !gameState.savedAsAbandoned
    ) {
      try {
        isSavingAbandoned.current = true; // Lock

        await saveAbandonedGame(
          user.uid,
          user.displayName || user.pseudo || 'Anonymous',
          {
            mode: gameState.mode,
            startPage: gameState.startPage.title,
            currentPage: gameState.currentPage.title,
            history: gameState.history,
            clicks: gameState.clicks,
            startTime: gameState.startTime,
          }
        );

        // Mark as saved to prevent duplicate saves
        setGameState(prev => ({ ...prev, savedAsAbandoned: true }));
      } catch (error) {
        console.error('Failed to save abandoned game:', error);
      } finally {
        isSavingAbandoned.current = false; // Unlock
      }
    }
  };

  const initGame = async (mode: GameMode, action?: 'create' | 'join') => {
    // Save current game if being abandoned
    await saveCurrentGameIfAbandoned();
    // Handle multiplayer mode
    if (mode === GameMode.MULTIPLAYER && action) {
      setMultiplayerAction(action);
      // Show config page for create, modal for join
      if (action === 'create') {
        setShowLobbyConfigPage(true);
      } else {
        setShowLobbyModal(true);
      }
      return;
    }

    setGameState(prev => ({ ...prev, status: GameStatus.LOADING, error: null, mode }));

    try {
      let start: WikiPageSummary;
      let target: WikiPageSummary;
      let dailyChallengeId: string | undefined;

      if (mode === GameMode.DAILY) {
        // Get today's daily challenge
        const dailyChallenge = await dailyChallengeService.getTodayChallenge();
        dailyChallengeId = dailyChallenge.id;

        // Clear any existing progress (starting fresh)
        await dailyProgressService.clearProgress(dailyChallengeId, user);

        // Use the challenge's pages
        if (dailyChallenge.startPageData && dailyChallenge.targetPageData) {
          start = dailyChallenge.startPageData;
          target = dailyChallenge.targetPageData;
        } else {
          // Fallback: fetch the summaries
          [start, target] = await Promise.all([
            fetchPageSummary(dailyChallenge.startPage),
            fetchPageSummary(dailyChallenge.targetPage),
          ]);
        }
      } else {
        // Training mode: Use hybrid selection (80% popular, 20% random) for both pages
        [start, target] = await Promise.all([
          fetchHybridPage(),
          fetchHybridPage()
        ]);

        // Ensure start and target are not the same
        let retries = 0;
        const maxRetries = 5;

        while (start.title === target.title && retries < maxRetries) {
          target = await fetchHybridPage();
          retries++;
        }

        // If still the same after retries (extremely unlikely), force random
        if (start.title === target.title) {
          target = await fetchRandomPage();
        }
      }

      setGameState({
        ...INITIAL_STATE,
        status: GameStatus.PLAYING,
        mode,
        startPage: start,
        targetPage: target,
        currentPage: start,
        history: [start.title],
        startTime: Date.now(),
        dailyChallengeId,
      });

    } catch (err) {
      setGameState(prev => ({
        ...prev,
        status: GameStatus.ERROR,
        error: 'Failed to initialize game. Please check your connection to Wikipedia.'
      }));
    }
  };

  const handleNavigate = useCallback(async (title: string) => {
    if (gameState.status !== GameStatus.PLAYING) return;

    // We update state optimistically for the navigation, but we need to fetch the summary for the sidebar
    // Note: WikiViewer handles the HTML fetching independently based on the title prop.

    let pageSummary: WikiPageSummary = { title: title, displaytitle: title };
    try {
         pageSummary = await fetchPageSummary(title);
    } catch (e) {
        // If summary fetch fails, we just use the title, not a game breaker
    }

    // Check Win Condition
    // Compare canonical titles (after Wikipedia API resolves redirects)
    // This accepts variants like "USB" vs "Universal Serial Bus" and homonymies like "USB (homonymie)"
    const isWin = arePageTitlesEqual(pageSummary.title, gameState.targetPage?.title || '');

    setGameState(prev => {
        const newHistory = [...prev.history, title];
        const newClicks = prev.clicks + 1;

        // Sync with Firestore if multiplayer
        if (prev.mode === GameMode.MULTIPLAYER && prev.lobbyCode && user) {
          multiplayerService.updatePlayerProgress(
            prev.lobbyCode,
            user.uid,
            title,
            newClicks,
            newHistory
          );

          // If victory
          if (isWin) {
            multiplayerService.finishPlayer(
              prev.lobbyCode,
              user.uid,
              Date.now()
            );
          }
        }

        if (isWin) {
            return {
                ...prev,
                status: GameStatus.WON,
                currentPage: pageSummary,
                history: newHistory,
                clicks: newClicks,
                endTime: Date.now(),
            };
        }

        return {
            ...prev,
            currentPage: pageSummary,
            history: newHistory,
            clicks: newClicks,
        };
    });

  }, [gameState.status, gameState.targetPage, gameState.mode, gameState.lobbyCode, user]);

  const handleNavigateToHistoryPage = useCallback(async (title: string, historyIndex: number) => {
    if (gameState.status !== GameStatus.PLAYING) return;

    // Fetch the page summary for the historical page
    let pageSummary: WikiPageSummary = { title: title, displaytitle: title };
    try {
         pageSummary = await fetchPageSummary(title);
    } catch (e) {
        // If summary fetch fails, we just use the title
    }

    // Navigate back to this point in history by truncating the history array
    // and incrementing clicks (going back costs 1 click)
    setGameState(prev => ({
        ...prev,
        currentPage: pageSummary,
        history: prev.history.slice(0, historyIndex + 1),
        clicks: prev.clicks + 1,
    }));
  }, [gameState.status]);

  // View: Welcome Screen
  if (gameState.status === GameStatus.IDLE || gameState.status === GameStatus.ERROR) {
    return (
      <>
        {/* Auth Modal */}
        {showAuthModal && (
          <AuthModal
            onClose={() => setShowAuthModal(false)}
            onSuccess={() => setShowAuthModal(false)}
          />
        )}

        <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center p-6 font-sans">
          {/* Auth Button in top right */}
          <div className="fixed top-4 right-4 z-10">
            <AuthButton
              user={user}
              onSignInClick={() => setShowAuthModal(true)}
              onFriendsClick={() => setShowFriendsModal(true)}
              onProfileClick={() => setShowProfilePage(true)}
            />
          </div>

          <div className="max-w-4xl w-full">
            {/* Header */}
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden mb-6">
              <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-10 text-center">
                  <Globe className="w-16 h-16 text-white mx-auto mb-4 opacity-90" />
                  <h1 className="text-4xl font-extrabold text-white tracking-tight mb-2">WikiLink Race</h1>
                  <p className="text-blue-100 text-lg">The 6 degrees of Wikipedia separation game.</p>
              </div>

              <div className="p-8">
                  <div className="prose prose-blue mx-auto text-gray-600">
                      <p className="lead text-center mb-6">
                          Navigate from a <strong>starting page</strong> to a <strong>target page</strong> using only hyperlinks.
                      </p>
                      <ul className="grid grid-cols-1 md:grid-cols-2 gap-4 list-none pl-0">
                           <li className="flex items-start">
                               <div className="bg-blue-100 p-2 rounded-full mr-3 text-blue-600">
                                   <BookOpen size={18} />
                               </div>
                               <span>Start at a given article.</span>
                           </li>
                           <li className="flex items-start">
                               <div className="bg-blue-100 p-2 rounded-full mr-3 text-blue-600">
                                   <Search size={18} />
                               </div>
                               <span>Find the target article.</span>
                           </li>
                           <li className="flex items-start">
                               <div className="bg-blue-100 p-2 rounded-full mr-3 text-blue-600">
                                   <ArrowRight size={18} />
                               </div>
                               <span>Click blue links only.</span>
                           </li>
                           <li className="flex items-start">
                               <div className="bg-blue-100 p-2 rounded-full mr-3 text-blue-600">
                                   <Trophy size={18} />
                               </div>
                               <span>Lowest clicks & time wins.</span>
                           </li>
                      </ul>
                  </div>

                  {gameState.error && (
                      <div className="bg-red-50 text-red-700 p-4 rounded-lg mt-6 flex items-center">
                          <span className="mr-2">⚠️</span> {gameState.error}
                      </div>
                  )}

                  {/* Saved Daily Progress Alert */}
                  {hasSavedDailyProgress && (
                      <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mt-6">
                          <div className="flex items-start justify-between">
                              <div className="flex-1">
                                  <h3 className="font-bold text-blue-900 mb-1">Partie daily challenge en cours</h3>
                                  <p className="text-sm text-blue-700">Vous avez une partie daily challenge non terminée. Voulez-vous la reprendre ?</p>
                              </div>
                              <Button
                                  onClick={restoreDailyProgress}
                                  className="ml-4"
                              >
                                  Reprendre
                              </Button>
                          </div>
                      </div>
                  )}
              </div>
            </div>

            {/* Mode Selection */}
            <ModeSelection
              onSelectMode={initGame}
              onViewLeaderboard={() => setShowLeaderboard(true)}
              user={user}
              onShowAuthModal={() => setShowAuthModal(true)}
            />

            <div className="text-center text-xs text-gray-400 mt-4">
                Powered by Wikipedia API
            </div>
          </div>
        </div>
        {showLeaderboard && (
          <Leaderboard
            onClose={() => setShowLeaderboard(false)}
            highlightEntryId={lastSavedEntryId || undefined}
            user={user}
          />
        )}

        {/* Friends Modal */}
        {showFriendsModal && user && (
          <FriendsModal
            user={user}
            onClose={() => setShowFriendsModal(false)}
            onInviteToGame={(friendId) => {
              // TODO: Implement multiplayer invitation
            }}
          />
        )}

        {/* Profile Page */}
        {showProfilePage && user && (
          <ProfilePage
            user={user}
            onClose={() => setShowProfilePage(false)}
          />
        )}

        {/* Lobby Config Page */}
        {showLobbyConfigPage && (
          <LobbyConfigPage
            user={user}
            onClose={() => {
              setShowLobbyConfigPage(false);
              setMultiplayerAction(null);
            }}
            onCreateLobby={async (config, startPage, targetPage) => {
              if (!user) return;

              try {
                const lobby = await multiplayerService.createLobby(
                  user.uid,
                  user.displayName || user.pseudo || 'Player',
                  user.photoURL,
                  startPage,
                  targetPage,
                  config
                );
                setLobbyState(lobby);
                setShowLobbyConfigPage(false);
              } catch (error) {
                console.error('Failed to create lobby:', error);
                alert('Erreur lors de la création du lobby');
              }
            }}
          />
        )}

        {/* Multiplayer Lobby Modal */}
        {showLobbyModal && (
          <MultiplayerLobbyModal
            action={multiplayerAction}
            user={user}
            onClose={() => {
              setShowLobbyModal(false);
              setMultiplayerAction(null);
            }}
            onLobbyCreated={(lobby) => {
              setLobbyState(lobby);
              setShowLobbyModal(false);
            }}
            onLobbyJoined={(lobby) => {
              setLobbyState(lobby);
              setShowLobbyModal(false);
            }}
          />
        )}

        {/* Lobby Waiting Room */}
        {lobbyState && lobbyState.status === LobbyStatus.WAITING && (
          <LobbyWaitingRoom
            lobby={lobbyState}
            currentUser={user}
            onStartGame={async (startPage, targetPage) => {
              if (lobbyState.createdBy === user?.uid) {
                // Update lobby with selected pages if provided (for semi-random or manual modes)
                if (startPage && targetPage) {
                  await multiplayerService.updateLobbyPages(
                    lobbyState.roomCode,
                    startPage,
                    targetPage
                  );
                }

                // Check if this is the first round or a subsequent round
                // If there's round history, it means we've already played at least one round
                const hasRoundHistory = lobbyState.roundHistory && lobbyState.roundHistory.length > 0;
                if (hasRoundHistory) {
                  // Subsequent rounds: use startNextRound (doesn't increment, just starts)
                  multiplayerService.startNextRound(lobbyState.roomCode);
                } else {
                  // First round: use startGame
                  multiplayerService.startGame(lobbyState.roomCode);
                }
              }
            }}
            onLeave={() => {
              if (user) {
                multiplayerService.leaveLobby(lobbyState.roomCode, user.uid);
              }
              setLobbyState(null);
            }}
          />
        )}
      </>
    );
  }

  // View: Loading
  if (gameState.status === GameStatus.LOADING) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <button
          onClick={goHome}
          className="fixed top-4 right-4 bg-white hover:bg-gray-100 text-gray-700 font-semibold py-2 px-4 rounded-lg border border-gray-300 transition-colors flex items-center gap-2 shadow-sm"
        >
          <Home className="w-4 h-4" />
          Home
        </button>
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-600 mb-4"></div>
        <h2 className="text-xl font-semibold text-gray-700">Setting up the race course...</h2>
        <p className="text-gray-500 mt-2">Selecting random articles</p>
      </div>
    );
  }

  // View: Win Screen
  if (gameState.status === GameStatus.WON) {
      // Show multiplayer round end screen for multiplayer mode
      if (gameState.mode === GameMode.MULTIPLAYER && lobbyState) {
        const currentRound = lobbyState.currentRound || 1;
        const totalRounds = lobbyState.config?.numberOfRounds || 1;
        const isLastRound = currentRound >= totalRounds;

        // If it's the last round, save scores and show final recap
        if (isLastRound) {
          // Save final round scores if not already saved
          const savedRounds = lobbyState.roundHistory?.length || 0;
          if (savedRounds < currentRound && lobbyState.createdBy === user?.uid) {
            multiplayerService.saveRoundScore(lobbyState.roomCode);
          }

          return (
            <MultiplayerFinalRecap
              lobby={lobbyState}
              currentUser={user}
              onLeave={() => {
                if (user) {
                  multiplayerService.leaveLobby(lobbyState.roomCode, user.uid);
                }
                setLobbyState(null);
                setGameState(INITIAL_STATE);
              }}
            />
          );
        }

        // Otherwise show round end screen with next round button
        const handleNextRound = async () => {
          if (lobbyState.createdBy !== user?.uid) return;

          // Save current round scores to history first
          await multiplayerService.saveRoundScore(lobbyState.roomCode);

          const needsChallengeSelection = lobbyState.config &&
            (lobbyState.config.challengeMode === ChallengeMode.SEMI_RANDOM ||
             lobbyState.config.challengeMode === ChallengeMode.MANUAL);

          if (needsChallengeSelection) {
            // Increment round counter and go to challenge selection
            await multiplayerService.incrementRound(lobbyState.roomCode);
            // Set selecting challenge flag WITHOUT starting the round yet
            // The round will be started after challenge selection in LobbyWaitingRoom
            await multiplayerService.setSelectingChallenge(lobbyState.roomCode, true);
            // Change lobby status back to WAITING so it shows the waiting room
            await multiplayerService.updateLobbyStatus(lobbyState.roomCode, LobbyStatus.WAITING);
            setGameState(INITIAL_STATE);
          } else {
            // For random mode: generate new challenge and start next round
            await multiplayerService.startNextRoundWithRandomChallenge(lobbyState.roomCode, lobbyState.config?.themes || ['all']);
            setGameState(INITIAL_STATE);
          }
        };

        return (
          <MultiplayerRoundEnd
            lobby={lobbyState}
            currentUser={user}
            onNextRound={handleNextRound}
            onLeave={() => {
              if (user) {
                multiplayerService.leaveLobby(lobbyState.roomCode, user.uid);
              }
              setLobbyState(null);
              setGameState(INITIAL_STATE);
            }}
          />
        );
      }

      const timeTaken = gameState.startTime && gameState.endTime
        ? Math.floor((gameState.endTime - gameState.startTime) / 1000)
        : 0;
      const playerName = user?.displayName || user?.pseudo || 'Anonyme';

      return (
        <>
          <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
              <div className="max-w-xl w-full bg-white rounded-2xl shadow-xl overflow-hidden text-center">
                  <div className="bg-green-500 p-8">
                       <Trophy className="w-20 h-20 text-white mx-auto drop-shadow-md" />
                       <h1 className="text-3xl font-bold text-white mt-4">Mission Accomplished!</h1>
                  </div>

                  <div className="p-8">
                      <p className="text-gray-600 mb-6">
                          You successfully navigated from
                          <strong className="text-gray-900 mx-1">{gameState.startPage?.title}</strong>
                          to
                          <strong className="text-gray-900 mx-1">{gameState.targetPage?.title}</strong>.
                      </p>

                      <div className="grid grid-cols-2 gap-4 mb-8">
                          <div className="bg-gray-100 p-4 rounded-xl">
                              <div className="text-sm text-gray-500 uppercase font-bold">Clicks</div>
                              <div className="text-3xl font-mono text-gray-800">{gameState.clicks}</div>
                          </div>
                           <div className="bg-gray-100 p-4 rounded-xl">
                              <div className="text-sm text-gray-500 uppercase font-bold">Time</div>
                              <div className="text-3xl font-mono text-gray-800">{timeTaken}s</div>
                          </div>
                      </div>

                      <div className="bg-blue-50 p-4 rounded-lg mb-8 text-left max-h-48 overflow-y-auto border border-blue-100">
                          <h3 className="text-xs font-bold text-blue-800 uppercase mb-2">Your Path</h3>
                          <div className="flex flex-wrap items-center text-sm text-gray-700">
                               {gameState.history.map((step, i) => (
                                   <React.Fragment key={i}>
                                       <span className={i === 0 || i === gameState.history.length - 1 ? "font-bold text-blue-700" : ""}>
                                           {step.replace(/_/g, ' ')}
                                       </span>
                                       {i < gameState.history.length - 1 && (
                                           <ArrowRight className="w-3 h-3 mx-2 text-gray-400" />
                                       )}
                                   </React.Fragment>
                               ))}
                          </div>
                      </div>

                      <div className="flex flex-col sm:flex-row justify-center gap-3">
                          <Button variant="secondary" onClick={() => setShowLeaderboard(true)} className="flex items-center justify-center">
                              View Leaderboard
                          </Button>
                          <Button variant="secondary" onClick={() => window.open(`https://twitter.com/intent/tweet?text=I%20reached%20${gameState.targetPage?.title}%20from%20${gameState.startPage?.title}%20in%20${gameState.clicks}%20clicks!%20#WikiLinkRaceyoooo`, '_blank')}>
                              Share Result
                          </Button>
                          {gameState.mode === GameMode.DAILY && (
                            <ShareDiscordButton
                              playerName={playerName}
                              startPage={gameState.startPage?.title ?? ''}
                              targetPage={gameState.targetPage?.title ?? ''}
                              timeSeconds={timeTaken}
                              clicks={gameState.clicks}
                              mode="DAILY"
                              userId={user?.uid}
                            />
                          )}
                          {gameState.mode !== GameMode.DAILY && (
                            <Button onClick={() => initGame(gameState.mode!)} className="flex items-center justify-center">
                                <RotateCcw className="w-4 h-4 mr-2" /> Play Again
                            </Button>
                          )}
                          <Button variant="secondary" onClick={goHome} className="flex items-center justify-center">
                              <Home className="w-4 h-4 mr-2" /> Home
                          </Button>
                      </div>
                  </div>
              </div>
          </div>
          {showLeaderboard && (
            <Leaderboard
              onClose={() => setShowLeaderboard(false)}
              highlightEntryId={lastSavedEntryId || undefined}
              user={user}
            />
          )}
        </>
      );
  }

  // Dans App.tsx, remplace le bloc de rendu "Playing" (à la fin du fichier) :

  // View: Playing
  // Dans App.tsx, remplacez le bloc "Playing" :

  return (
    <div className="flex flex-col lg:flex-row h-screen overflow-hidden bg-gray-100">
      <main className="flex-1 flex flex-col h-full relative z-10 order-2 lg:order-1 overflow-hidden">
        {/* Mobile Header: Avec description et bouton propre */}
        <header className="bg-white border-b border-gray-200 p-3 flex justify-between items-center lg:hidden shadow-sm shrink-0">
          <button
            onClick={goHome}
            className="bg-gray-100 p-2 rounded-lg text-gray-700 hover:bg-gray-200 active:scale-95 transition-all mr-2"
            title="Retour à l'accueil"
          >
            <Home className="w-5 h-5" />
          </button>

          <div className="flex flex-col min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-[9px] uppercase font-bold text-blue-600 tracking-wider">Cible</span>
            </div>
            <span className="font-bold text-sm truncate leading-tight">
              {gameState.targetPage?.title}
            </span>
            {/* Description ultra-légère : une seule ligne discrète */}
            {gameState.targetPage?.description && (
              <span className="text-[10px] text-gray-400 truncate block italic">
                {gameState.targetPage.description}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 ml-2">
            <div className="text-right">
              <div className="text-[9px] text-gray-400 uppercase font-bold">Clics</div>
              <div className="font-mono text-sm font-bold text-gray-800">{gameState.clicks}</div>
            </div>
            <button
              onClick={() => {
                document.getElementById('mobile-sidebar')?.classList.remove('translate-x-full');
                document.getElementById('sidebar-overlay')?.classList.remove('hidden');
              }}
              className="bg-blue-600 p-2 rounded-lg text-white shadow-md active:scale-95 transition-transform"
            >
              <Map className="w-5 h-5" />
            </button>
          </div>
        </header>
        
        <div className="flex-1 overflow-hidden relative">
          {gameState.currentPage && (
            <WikiViewer 
              title={gameState.currentPage.title} 
              onNavigate={handleNavigate} 
            />
          )}
        </div>
      </main>

      {/* Sidebar / Drawer */}
      <aside 
        id="mobile-sidebar"
        className="fixed inset-y-0 right-0 w-[85%] sm:w-80 bg-white z-50 shadow-2xl transform translate-x-full transition-transform duration-300 lg:relative lg:translate-x-0 lg:flex lg:flex-col lg:h-full lg:w-80 shrink-0"
      >
        {/* Header de fermeture dédié à l'intérieur de la sidebar (Mobile seulement) */}
        <div className="lg:hidden flex items-center justify-between p-4 border-b bg-gray-50">
            <span className="font-bold text-gray-700">Votre progression</span>
            <button 
                onClick={() => document.getElementById('mobile-sidebar')?.classList.add('translate-x-full')}
                className="p-2 hover:bg-gray-200 rounded-full transition-colors"
            >
                <ChevronRight className="w-6 h-6 text-gray-600" />
            </button>
        </div>

        {gameState.targetPage && gameState.startPage && (
          <GameSidebar
            targetPage={gameState.targetPage}
            startPage={gameState.startPage}
            history={gameState.history}
            clicks={gameState.clicks}
            startTime={gameState.startTime}
            isPlaying={gameState.status === GameStatus.PLAYING}
            onNavigateToHistoryPage={handleNavigateToHistoryPage}
            onGoHome={goHome}
            mode={gameState.mode}
            lobbyState={lobbyState}
            currentUserId={user?.uid}
          />
        )}
      </aside>
      
      {/* Overlay pour fermer en cliquant à côté (Optionnel mais recommandé) */}
      <div
        id="sidebar-overlay"
        className="fixed inset-0 bg-black/20 z-40 lg:hidden hidden"
        onClick={() => {
            document.getElementById('mobile-sidebar')?.classList.add('translate-x-full');
            document.getElementById('sidebar-overlay')?.classList.add('hidden');
        }}
      />
    </div>
  );
}

export default App;