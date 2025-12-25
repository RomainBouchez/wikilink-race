import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Calendar, Zap, Trophy, Users } from 'lucide-react';
import { GameEntry, GameMode } from '../types';

interface ProfileRecentGamesProps {
  games: GameEntry[];
}

export const ProfileRecentGames: React.FC<ProfileRecentGamesProps> = ({ games }) => {
  const [expandedGame, setExpandedGame] = useState<string | null>(null);
  const [modeFilter, setModeFilter] = useState<GameMode | 'all'>('all');

  const toggleExpand = (gameId: string) => {
    setExpandedGame(expandedGame === gameId ? null : gameId);
  };

  const getModeBadge = (mode: GameMode) => {
    const badges = {
      [GameMode.DAILY]: {
        label: 'Daily',
        icon: Calendar,
        className: 'bg-purple-100 text-purple-700 border-purple-300'
      },
      [GameMode.TRAINING]: {
        label: 'Training',
        icon: Zap,
        className: 'bg-blue-100 text-blue-700 border-blue-300'
      },
      [GameMode.MULTIPLAYER]: {
        label: 'Multiplayer',
        icon: Users,
        className: 'bg-green-100 text-green-700 border-green-300'
      }
    };

    return badges[mode] || badges[GameMode.TRAINING];
  };

  const getTimeAgo = (timestamp: number): string => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);

    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;

    return new Date(timestamp).toLocaleDateString();
  };

  const filteredGames = modeFilter === 'all'
    ? games
    : games.filter(game => game.mode === modeFilter);

  if (games.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-2xl p-12 text-center">
        <Trophy className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-2xl font-bold text-gray-700 mb-2">No games played yet!</h3>
        <p className="text-gray-500">Start playing to see your game history here.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-2xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Recent Games</h2>

        {/* Mode Filter */}
        <div className="flex gap-2">
          <button
            onClick={() => setModeFilter('all')}
            className={`px-3 py-1 rounded-lg text-sm font-medium transition ${
              modeFilter === 'all'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setModeFilter(GameMode.DAILY)}
            className={`px-3 py-1 rounded-lg text-sm font-medium transition ${
              modeFilter === GameMode.DAILY
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Daily
          </button>
          <button
            onClick={() => setModeFilter(GameMode.TRAINING)}
            className={`px-3 py-1 rounded-lg text-sm font-medium transition ${
              modeFilter === GameMode.TRAINING
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Training
          </button>
          <button
            onClick={() => setModeFilter(GameMode.MULTIPLAYER)}
            className={`px-3 py-1 rounded-lg text-sm font-medium transition ${
              modeFilter === GameMode.MULTIPLAYER
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Multiplayer
          </button>
        </div>
      </div>

      <div className="space-y-3 max-h-[600px] overflow-y-auto">
        {filteredGames.map((game) => {
          const badge = getModeBadge(game.mode);
          const Icon = badge.icon;
          const isExpanded = expandedGame === game.id;

          return (
            <div
              key={game.id}
              className="border border-gray-200 rounded-lg p-4 hover:border-purple-300 transition"
            >
              <div className="flex items-start gap-4">
                {/* Mode Badge */}
                <div className={`px-3 py-1 rounded-lg border flex items-center gap-1 ${badge.className}`}>
                  <Icon className="w-4 h-4" />
                  <span className="text-sm font-semibold">{badge.label}</span>
                </div>

                {/* Game Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-semibold text-gray-900">{game.startPage}</span>
                    <span className="text-gray-400">→</span>
                    <span className={`font-semibold ${game.completed === false ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                      {game.targetPage || 'Abandoned'}
                    </span>
                    {game.completed === false && (
                      <span className="text-xs px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full font-medium">
                        Abandoned
                      </span>
                    )}
                  </div>

                  <div className="flex gap-4 text-sm text-gray-600">
                    <span>Clicks: <span className="font-semibold">{game.clicks}</span></span>
                    <span>Time: <span className="font-semibold">{game.timeSeconds}s</span></span>
                    {game.completed !== false && (
                      <span>Score: <span className="font-semibold">{game.score}</span></span>
                    )}
                  </div>

                  <div className="text-xs text-gray-500 mt-1">
                    {getTimeAgo(game.timestamp)}
                  </div>
                </div>

                {/* Expand Button */}
                <button
                  onClick={() => toggleExpand(game.id)}
                  className="text-gray-400 hover:text-purple-600 transition"
                >
                  {isExpanded ? (
                    <ChevronUp className="w-5 h-5" />
                  ) : (
                    <ChevronDown className="w-5 h-5" />
                  )}
                </button>
              </div>

              {/* Expanded Path */}
              {isExpanded && game.path && game.path.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">
                    Path ({game.path.length} pages):
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {game.path.map((page, index) => (
                      <React.Fragment key={index}>
                        <a
                          href={`https://en.wikipedia.org/wiki/${encodeURIComponent(page)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm px-3 py-1 bg-gray-100 hover:bg-purple-100 rounded-lg text-gray-700 hover:text-purple-700 transition"
                        >
                          {page}
                        </a>
                        {index < game.path.length - 1 && (
                          <span className="text-gray-400 self-center">→</span>
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
