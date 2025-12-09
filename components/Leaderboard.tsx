import React, { useState, useEffect } from 'react';
import { LeaderboardEntry } from '../types';
import { leaderboardService } from '../services/leaderboardService';
import { Trophy, Clock, MousePointerClick, Calendar, User, Download, Upload, Trash2 } from 'lucide-react';
import { Button } from './Button';

interface LeaderboardProps {
  onClose?: () => void;
  highlightEntryId?: string;
}

type ViewMode = 'all' | 'route';

export const Leaderboard: React.FC<LeaderboardProps> = ({ onClose, highlightEntryId }) => {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('all');
  const [selectedRoute, setSelectedRoute] = useState<{ start: string; target: string } | null>(null);

  useEffect(() => {
    loadEntries();
  }, [viewMode, selectedRoute]);

  const loadEntries = () => {
    if (viewMode === 'route' && selectedRoute) {
      setEntries(leaderboardService.getEntriesForRoute(selectedRoute.start, selectedRoute.target));
    } else {
      setEntries(leaderboardService.getTopEntries(50));
    }
  };

  const handleExport = () => {
    const data = leaderboardService.exportData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `wikilink-race-leaderboard-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (leaderboardService.importData(content)) {
        loadEntries();
        alert('Leaderboard imported successfully!');
      } else {
        alert('Failed to import leaderboard. Invalid file format.');
      }
    };
    reader.readAsText(file);
  };

  const handleClear = () => {
    if (confirm('Are you sure you want to clear all leaderboard data? This cannot be undone.')) {
      leaderboardService.clearLeaderboard();
      loadEntries();
    }
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  const getUniqueRoutes = () => {
    const allEntries = leaderboardService.getAllEntries();
    const routes = new Map<string, { start: string; target: string; count: number }>();

    allEntries.forEach(entry => {
      const key = `${entry.startPage}|${entry.targetPage}`;
      if (routes.has(key)) {
        routes.get(key)!.count++;
      } else {
        routes.set(key, { start: entry.startPage, target: entry.targetPage, count: 1 });
      }
    });

    return Array.from(routes.values()).sort((a, b) => b.count - a.count);
  };

  const getRankBadgeColor = (rank: number): string => {
    if (rank === 1) return 'bg-yellow-400 text-yellow-900';
    if (rank === 2) return 'bg-gray-300 text-gray-800';
    if (rank === 3) return 'bg-orange-400 text-orange-900';
    return 'bg-blue-100 text-blue-800';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-6 text-white">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <Trophy className="w-8 h-8 mr-3" />
              <div>
                <h2 className="text-2xl font-bold">Leaderboard</h2>
                <p className="text-blue-100 text-sm">Top WikiLink Race Champions</p>
              </div>
            </div>
            {onClose && (
              <button
                onClick={onClose}
                className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="p-4 border-b bg-gray-50 flex flex-wrap gap-2 items-center justify-between">
          <div className="flex gap-2">
            <Button
              variant={viewMode === 'all' ? 'primary' : 'secondary'}
              onClick={() => {
                setViewMode('all');
                setSelectedRoute(null);
              }}
              className="text-sm py-2"
            >
              All Scores
            </Button>
            <Button
              variant={viewMode === 'route' ? 'primary' : 'secondary'}
              onClick={() => setViewMode('route')}
              className="text-sm py-2"
            >
              By Route
            </Button>
          </div>

          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={handleExport}
              className="text-sm py-2 flex items-center"
            >
              <Download className="w-4 h-4 mr-1" /> Export
            </Button>
            <label className="cursor-pointer">
              <Button
                variant="secondary"
                className="text-sm py-2 flex items-center"
                as="span"
              >
                <Upload className="w-4 h-4 mr-1" /> Import
              </Button>
              <input
                type="file"
                accept=".json"
                onChange={handleImport}
                className="hidden"
              />
            </label>
            <Button
              variant="secondary"
              onClick={handleClear}
              className="text-sm py-2 flex items-center text-red-600 hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4 mr-1" /> Clear
            </Button>
          </div>
        </div>

        {/* Route Selection */}
        {viewMode === 'route' && (
          <div className="p-4 bg-blue-50 border-b">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Select a route:
            </label>
            <select
              className="w-full p-2 border rounded-lg"
              onChange={(e) => {
                const [start, target] = e.target.value.split('|');
                setSelectedRoute(start && target ? { start, target } : null);
              }}
              value={selectedRoute ? `${selectedRoute.start}|${selectedRoute.target}` : ''}
            >
              <option value="">-- Select a route --</option>
              {getUniqueRoutes().map((route, idx) => (
                <option key={idx} value={`${route.start}|${route.target}`}>
                  {route.start} → {route.target} ({route.count} attempts)
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Leaderboard Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {entries.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Trophy className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-semibold">No scores yet!</p>
              <p className="text-sm">Be the first to complete a race and claim the top spot.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {entries.map((entry, index) => {
                const rank = index + 1;
                const score = leaderboardService.calculateScore(entry.clicks, entry.timeSeconds);
                const isHighlighted = entry.id === highlightEntryId;

                return (
                  <div
                    key={entry.id}
                    className={`border rounded-lg p-4 transition-all ${
                      isHighlighted
                        ? 'bg-green-50 border-green-400 shadow-lg'
                        : 'bg-white hover:shadow-md'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      {/* Rank Badge */}
                      <div
                        className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${getRankBadgeColor(
                          rank
                        )}`}
                      >
                        {rank}
                      </div>

                      {/* Entry Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <User className="w-4 h-4 text-gray-500" />
                          <span className="font-bold text-gray-900">{entry.playerName}</span>
                          <span className="text-xs text-gray-500">
                            Score: {score}
                          </span>
                        </div>

                        <div className="text-sm text-gray-600 mb-2">
                          <strong>{entry.startPage}</strong> → <strong>{entry.targetPage}</strong>
                        </div>

                        <div className="flex flex-wrap gap-3 text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <MousePointerClick className="w-4 h-4" />
                            <span>{entry.clicks} clicks</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            <span>{entry.timeSeconds}s</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            <span>{formatDate(entry.timestamp)}</span>
                          </div>
                        </div>

                        {/* Path Preview */}
                        <details className="mt-2">
                          <summary className="cursor-pointer text-xs text-blue-600 hover:underline">
                            View path ({entry.path.length} steps)
                          </summary>
                          <div className="mt-2 text-xs text-gray-600 bg-gray-50 p-2 rounded">
                            {entry.path.join(' → ')}
                          </div>
                        </details>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer Stats */}
        <div className="border-t bg-gray-50 p-4 text-center text-sm text-gray-600">
          Total entries: {leaderboardService.getAllEntries().length}
        </div>
      </div>
    </div>
  );
};
