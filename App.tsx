import React, { useState, useCallback, useEffect } from 'react';
import { GameStatus, GameState, WikiPageSummary, GameMode, User } from './types';
import { fetchRandomPage, fetchPageSummary, fetchHybridPage } from './services/wikiService';
import { leaderboardService } from './services/leaderboardService';
import { dailyChallengeService } from './services/dailyChallengeService';
import { onAuthStateChanged, mapFirebaseUser } from './services/authService';
import { createOrUpdateUserProfile } from './services/firestoreService';
import { hasLocalData } from './services/migrationService';
import { WikiViewer } from './components/WikiViewer';
import { GameSidebar } from './components/GameSidebar';
import { Button } from './components/Button';
import { Leaderboard } from './components/Leaderboard';
import { ModeSelection } from './components/ModeSelection';
import { AuthButton } from './components/AuthButton';
import { AuthModal } from './components/AuthModal';
import { MigrationPrompt } from './components/MigrationPrompt';
import { Trophy, ArrowRight, BookOpen, RotateCcw, Globe, Search } from 'lucide-react';

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
  const [showMigrationPrompt, setShowMigrationPrompt] = useState(false);

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

        // Check if there's local data to migrate
        if (hasLocalData()) {
          setShowMigrationPrompt(true);
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

  const initGame = async (mode: GameMode) => {
    setGameState(prev => ({ ...prev, status: GameStatus.LOADING, error: null, mode }));

    try {
      let start: WikiPageSummary;
      let target: WikiPageSummary;
      let dailyChallengeId: string | undefined;

      if (mode === GameMode.DAILY) {
        // Get today's daily challenge
        const dailyChallenge = await dailyChallengeService.getTodayChallenge();
        dailyChallengeId = dailyChallenge.id;

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

    // Normalizing titles (Wiki titles are case sensitive on the first letter usually, but spaces become underscores)
    const normalizedTarget = gameState.targetPage?.title.replace(/ /g, '_');
    const normalizedCurrent = title.replace(/ /g, '_');

    // We update state optimistically for the navigation, but we need to fetch the summary for the sidebar
    // Note: WikiViewer handles the HTML fetching independently based on the title prop.

    // Check Win Condition
    // We decodeURIComponent because title from href might be encoded, but target title from API is usually clean text.
    // However, API titles have spaces, hrefs have underscores.
    const isWin = normalizedCurrent === normalizedTarget?.replace(/ /g, '_');

    let pageSummary: WikiPageSummary = { title: title, displaytitle: title };
    try {
         pageSummary = await fetchPageSummary(title);
    } catch (e) {
        // If summary fetch fails, we just use the title, not a game breaker
        console.warn("Could not fetch summary for", title);
    }

    setGameState(prev => {
        const newHistory = [...prev.history, title];

        if (isWin) {
            return {
                ...prev,
                status: GameStatus.WON,
                currentPage: pageSummary,
                history: newHistory,
                clicks: prev.clicks + 1,
                endTime: Date.now(),
            };
        }

        return {
            ...prev,
            currentPage: pageSummary,
            history: newHistory,
            clicks: prev.clicks + 1,
        };
    });

  }, [gameState.status, gameState.targetPage]);

  const handleNavigateToHistoryPage = useCallback(async (title: string, historyIndex: number) => {
    if (gameState.status !== GameStatus.PLAYING) return;

    // Fetch the page summary for the historical page
    let pageSummary: WikiPageSummary = { title: title, displaytitle: title };
    try {
         pageSummary = await fetchPageSummary(title);
    } catch (e) {
        console.warn("Could not fetch summary for", title);
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
            onSuccess={() => {
              console.log('Authentication successful!');
            }}
          />
        )}

        {/* Migration Prompt */}
        {showMigrationPrompt && user && (
          <MigrationPrompt
            userId={user.uid}
            onClose={() => setShowMigrationPrompt(false)}
          />
        )}

        <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center p-6 font-sans">
          {/* Auth Button in top right */}
          <div className="fixed top-4 right-4 z-10">
            <AuthButton user={user} onSignInClick={() => setShowAuthModal(true)} />
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
              </div>
            </div>

            {/* Mode Selection */}
            <ModeSelection
              onSelectMode={initGame}
              onViewLeaderboard={() => setShowLeaderboard(true)}
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
      </>
    );
  }

  // View: Loading
  if (gameState.status === GameStatus.LOADING) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-600 mb-4"></div>
        <h2 className="text-xl font-semibold text-gray-700">Setting up the race course...</h2>
        <p className="text-gray-500 mt-2">Selecting random articles</p>
      </div>
    );
  }

  // View: Win Screen
  if (gameState.status === GameStatus.WON) {
      const timeTaken = gameState.startTime && gameState.endTime
        ? Math.floor((gameState.endTime - gameState.startTime) / 1000)
        : 0;

      const handleSaveScore = async () => {
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

          // Mark daily challenge as completed
          if (gameState.mode === GameMode.DAILY) {
            dailyChallengeService.markTodayCompleted();
          }

          setLastSavedEntryId(entry.id);
          setShowLeaderboard(true);

          // Show success message for authenticated users
          if (user) {
            console.log('Score sauvegardé dans le cloud!');
          }
        } catch (error) {
          console.error('Failed to save score:', error);
          alert('Erreur lors de la sauvegarde du score. Veuillez réessayer.');
        }
      };

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
                          <Button variant="secondary" onClick={handleSaveScore} className="flex items-center justify-center">
                              <Trophy className="w-4 h-4 mr-2" /> Save to Leaderboard
                          </Button>
                          <Button variant="secondary" onClick={() => setShowLeaderboard(true)} className="flex items-center justify-center">
                              View Leaderboard
                          </Button>
                          <Button variant="secondary" onClick={() => window.open(`https://twitter.com/intent/tweet?text=I%20reached%20${gameState.targetPage?.title}%20from%20${gameState.startPage?.title}%20in%20${gameState.clicks}%20clicks!%20#WikiLinkRace`, '_blank')}>
                              Share Result
                          </Button>
                          <Button onClick={() => initGame(gameState.mode!)} className="flex items-center justify-center">
                              <RotateCcw className="w-4 h-4 mr-2" /> Play Again
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

  // View: Playing
  return (
    <div className="flex flex-col lg:flex-row h-screen overflow-hidden bg-gray-100">
      {/* Main Content Area (The Wiki) */}
      <main className="flex-1 flex flex-col h-[60vh] lg:h-full relative z-10 order-2 lg:order-1">
        <header className="bg-white border-b border-gray-200 p-3 flex justify-between items-center lg:hidden shadow-sm">
             <div className="flex flex-col">
                 <span className="text-xs text-gray-500">Target</span>
                 <span className="font-bold text-sm truncate w-40">{gameState.targetPage?.title}</span>
             </div>
             <div className="text-xs bg-gray-100 px-2 py-1 rounded">
                 Clicks: {gameState.clicks}
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

      {/* Sidebar (Controls & Stats) */}
      <aside className="order-1 lg:order-2 h-[40vh] lg:h-auto shadow-xl z-20">
         {gameState.targetPage && gameState.startPage && (
            <GameSidebar
                targetPage={gameState.targetPage}
                startPage={gameState.startPage}
                history={gameState.history}
                clicks={gameState.clicks}
                startTime={gameState.startTime}
                isPlaying={gameState.status === GameStatus.PLAYING}
                onNavigateToHistoryPage={handleNavigateToHistoryPage}
            />
         )}
      </aside>
    </div>
  );
}

export default App;