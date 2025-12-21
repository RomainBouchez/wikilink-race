import React, { useEffect, useState } from 'react';
import { WikiPageSummary, GameMode, LobbyState, PlayerStatus } from '../types';
import { Flag, MousePointer2, Clock, Map, ChevronRight, Home, Users, Trophy } from 'lucide-react';

interface GameSidebarProps {
  targetPage: WikiPageSummary;
  startPage: WikiPageSummary;
  history: string[];
  clicks: number;
  startTime: number | null;
  isPlaying: boolean;
  onNavigateToHistoryPage?: (title: string, index: number) => void;
  onGoHome?: () => void;
  mode?: GameMode | null;
  lobbyState?: LobbyState | null;
  currentUserId?: string | null;
}

export const GameSidebar: React.FC<GameSidebarProps> = ({
  targetPage,
  startPage,
  history,
  clicks,
  startTime,
  isPlaying,
  onNavigateToHistoryPage,
  onGoHome,
  mode,
  lobbyState,
  currentUserId,
}) => {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isPlaying && startTime) {
      interval = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPlaying, startTime]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col h-full bg-white lg:bg-slate-50 border-l border-gray-200 w-full flex-shrink-0">
      {/* Target Header Restauré avec Description */}
      <div className="p-4 bg-white border-b border-gray-200 shadow-sm">
        <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2">
          Objectif Final
        </div>
        <div className="flex items-start space-x-3">
            <div className="flex-1 min-w-0">
                <h2 className="text-lg font-bold text-blue-900 leading-tight">
                    {targetPage.title}
                </h2>
                {targetPage.description && (
                    <p className="text-xs text-gray-600 mt-1 line-clamp-3 leading-snug italic">
                        {targetPage.description}
                    </p>
                )}
            </div>
             {targetPage.thumbnail && (
                <img 
                    src={targetPage.thumbnail.source} 
                    alt="Target" 
                    className="w-14 h-14 rounded-lg object-cover border border-gray-100 shadow-sm shrink-0"
                />
            )}
        </div>
      </div>

      {/* Stats - Horizontal sur mobile dans la sidebar */}
      <div className="flex border-b border-gray-100 bg-gray-50/50">
        <div className="flex-1 p-3 text-center border-r border-gray-100">
          <div className="text-[10px] uppercase font-bold text-gray-400">Clics</div>
          <div className="text-xl font-mono font-bold text-blue-600">{clicks}</div>
        </div>
        <div className="flex-1 p-3 text-center">
          <div className="text-[10px] uppercase font-bold text-gray-400">Temps</div>
          <div className="text-xl font-mono font-bold text-blue-600">{formatTime(elapsed)}</div>
        </div>
      </div>

      {/* Multiplayer Players List */}
      {mode === GameMode.MULTIPLAYER && lobbyState && (
        <div className="border-b border-gray-200 p-4 bg-purple-50/30">
          <div className="flex items-center text-purple-600 mb-3">
            <Users className="w-4 h-4 mr-2" />
            <span className="text-xs uppercase font-bold tracking-wider">Players</span>
          </div>
          <div className="space-y-2">
            {Object.entries(lobbyState.players)
              .sort(([, a], [, b]) => {
                // Sort by finish time (winners first), then by clicks
                if (a.status === PlayerStatus.FINISHED && b.status !== PlayerStatus.FINISHED) return -1;
                if (a.status !== PlayerStatus.FINISHED && b.status === PlayerStatus.FINISHED) return 1;
                if (a.status === PlayerStatus.FINISHED && b.status === PlayerStatus.FINISHED) {
                  return (a.finishTime || 0) - (b.finishTime || 0);
                }
                return a.clicks - b.clicks;
              })
              .map(([uid, player]) => (
                <div
                  key={uid}
                  className={`flex items-center justify-between text-sm p-2 rounded ${
                    uid === currentUserId ? 'bg-purple-100 border border-purple-200' : 'bg-white'
                  }`}
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {player.photoURL ? (
                      <img src={player.photoURL} className="w-6 h-6 rounded-full shrink-0" alt="" />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-purple-200 flex items-center justify-center text-purple-700 text-xs font-bold shrink-0">
                        {player.displayName.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span className={`truncate ${uid === currentUserId ? 'font-bold text-purple-900' : 'text-gray-700'}`}>
                      {player.displayName}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-gray-500">{player.clicks}</span>
                    {player.status === PlayerStatus.FINISHED && (
                      <Trophy className="w-4 h-4 text-yellow-500" />
                    )}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Path - Prend tout l'espace restant */}
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        <div className="flex items-center text-gray-400 mb-4">
          <Map className="w-4 h-4 mr-2" />
          <span className="text-xs uppercase font-bold tracking-wider">Ton Parcours</span>
        </div>
        
        <div className="space-y-3">
             {/* Start Node */}
            <div
                className={`flex items-start group ${onNavigateToHistoryPage ? 'cursor-pointer hover:bg-gray-100 rounded-lg p-2 -m-2 transition-colors' : ''}`}
                onClick={() => onNavigateToHistoryPage?.(startPage.title, 0)}
            >
                <div className="flex flex-col items-center mr-3">
                    <div className="w-2.5 h-2.5 rounded-full bg-green-500 ring-4 ring-green-100"></div>
                    <div className="w-0.5 h-full bg-gray-200 my-1"></div>
                </div>
                <div className="text-sm font-medium text-gray-600 pb-4">
                    {startPage.title}
                </div>
            </div>

            {/* History Nodes */}
            {history.slice(1).map((title, index) => {
                const isLastItem = index === history.length - 2;
                const actualIndex = index + 1; // +1 because we're slicing from index 1

                return (
                    <div
                        key={index}
                        className={`flex items-start animate-fade-in-up ${
                            !isLastItem && onNavigateToHistoryPage
                                ? 'cursor-pointer hover:bg-gray-100 rounded-lg p-2 -m-2 transition-colors'
                                : ''
                        }`}
                        onClick={() => !isLastItem && onNavigateToHistoryPage?.(title, actualIndex)}
                    >
                        <div className="flex flex-col items-center mr-3">
                            <div className={`w-2.5 h-2.5 rounded-full ${isLastItem ? 'bg-blue-500 ring-4 ring-blue-100' : 'bg-gray-300'}`}></div>
                            {!isLastItem && (
                                 <div className="w-0.5 h-full bg-gray-200 my-1"></div>
                            )}
                        </div>
                         <div className="text-sm text-gray-600 pb-3 truncate max-w-[180px]">
                            {title.replace(/_/g, ' ')}
                        </div>
                    </div>
                );
            })}
        </div>
      </div>

      <div className="p-4 bg-gray-50 border-t border-gray-200">
        {onGoHome && (
          <button
            onClick={onGoHome}
            className="w-full bg-white hover:bg-gray-100 text-gray-700 font-semibold py-2.5 px-4 rounded-lg border border-gray-300 transition-colors flex items-center justify-center gap-2 mb-3"
          >
            <Home className="w-4 h-4" />
            Retour à l'accueil
          </button>
        )}
        <p className="text-xs text-gray-400 text-center">
            Wikipedia Link Race
        </p>
      </div>
    </div>
  );
};