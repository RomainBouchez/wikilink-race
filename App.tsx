import React, { useState, useCallback } from 'react';
import { GameStatus, GameState, WikiPageSummary } from './types';
import { fetchRandomPage, fetchPageSummary } from './services/wikiService';
import { leaderboardService } from './services/leaderboardService';
import { WikiViewer } from './components/WikiViewer';
import { GameSidebar } from './components/GameSidebar';
import { Button } from './components/Button';
import { Leaderboard } from './components/Leaderboard';
import { Trophy, ArrowRight, BookOpen, RotateCcw, Globe, Search } from 'lucide-react';

const INITIAL_STATE: GameState = {
  status: GameStatus.IDLE,
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

  const initGame = async () => {
    setGameState(prev => ({ ...prev, status: GameStatus.LOADING, error: null }));

    try {
      // Fetch two truly random pages from French Wikipedia
      const [start, target] = await Promise.all([
        fetchRandomPage(),
        fetchRandomPage()
      ]);

      // Ensure start and target are not the same (unlikely but possible)
      if (start.title === target.title) {
         // lazy retry
         const newTarget = await fetchRandomPage();
         setGameState({
            ...INITIAL_STATE,
            status: GameStatus.PLAYING,
            startPage: start,
            targetPage: newTarget,
            currentPage: start,
            history: [start.title],
            startTime: Date.now(),
         });
         return;
      }

      setGameState({
        ...INITIAL_STATE,
        status: GameStatus.PLAYING,
        startPage: start,
        targetPage: target,
        currentPage: start,
        history: [start.title],
        startTime: Date.now(),
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
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center p-6 font-sans">
          <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-10 text-center">
                <Globe className="w-16 h-16 text-white mx-auto mb-4 opacity-90" />
                <h1 className="text-4xl font-extrabold text-white tracking-tight mb-2">WikiLink Race</h1>
                <p className="text-blue-100 text-lg">The 6 degrees of Wikipedia separation game.</p>
            </div>
            
            <div className="p-10">
                <div className="prose prose-blue mx-auto text-gray-600 mb-8">
                    <p className="lead text-center">
                        Navigate from a <strong>random starting page</strong> to a <strong>target page</strong> using only hyperlinks.
                    </p>
                    <ul className="grid grid-cols-1 md:grid-cols-2 gap-4 list-none pl-0">
                         <li className="flex items-start">
                             <div className="bg-blue-100 p-2 rounded-full mr-3 text-blue-600">
                                 <BookOpen size={18} />
                             </div>
                             <span>Start at a random article.</span>
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
                    <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-6 flex items-center">
                        <span className="mr-2">⚠️</span> {gameState.error}
                    </div>
                )}

                <div className="flex flex-col sm:flex-row justify-center gap-3">
                    <Button
                        onClick={initGame}
                        className="w-full md:w-auto text-lg px-8 py-4 shadow-lg transform transition hover:-translate-y-1"
                    >
                        Start New Race
                    </Button>
                    <Button
                        variant="secondary"
                        onClick={() => setShowLeaderboard(true)}
                        className="w-full md:w-auto text-lg px-8 py-4 shadow-lg transform transition hover:-translate-y-1 flex items-center justify-center"
                    >
                        <Trophy className="w-5 h-5 mr-2" /> Leaderboard
                    </Button>
                </div>
            </div>
             <div className="bg-gray-50 p-4 text-center text-xs text-gray-400 border-t">
                Powered by Wikipedia API
            </div>
          </div>
        </div>
        {showLeaderboard && (
          <Leaderboard
            onClose={() => setShowLeaderboard(false)}
            highlightEntryId={lastSavedEntryId || undefined}
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

      const handleSaveScore = () => {
        const playerName = prompt('Enter your name for the leaderboard:');
        if (!playerName || playerName.trim() === '') return;

        const entry = leaderboardService.saveScore({
          playerName: playerName.trim(),
          clicks: gameState.clicks,
          timeSeconds: timeTaken,
          startPage: gameState.startPage!.title,
          targetPage: gameState.targetPage!.title,
          path: gameState.history,
        });

        setLastSavedEntryId(entry.id);
        setShowLeaderboard(true);
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
                          <Button onClick={initGame} className="flex items-center justify-center">
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