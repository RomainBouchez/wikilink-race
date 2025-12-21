import { useEffect, useState } from 'react';
import type { GameEntry } from '../types';
import { leaderboardService } from '../services/leaderboardService';

interface StatsPanelProps {
  userId: string;
  onClose: () => void;
}

export function StatsPanel({ userId, onClose }: StatsPanelProps) {
  const [games, setGames] = useState<GameEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadGames();
  }, [userId]);

  const loadGames = async () => {
    try {
      const userGames = await leaderboardService.getUserGames(userId, 20);
      setGames(userGames);
    } catch (error) {
      console.error('Failed to load games:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[80vh] overflow-hidden flex flex-col">
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-2xl font-bold">Mes parties récentes</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center py-8">
              <p className="text-gray-600">Chargement...</p>
            </div>
          ) : games.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600">Aucune partie enregistrée</p>
            </div>
          ) : (
            <div className="space-y-4">
              {games.map((game) => (
                <div key={game.id} className="bg-gray-50 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <p className="font-medium">
                        {game.startPage} → {game.targetPage}
                      </p>
                      <p className="text-sm text-gray-600">
                        {game.mode === 'DAILY' ? 'Défi quotidien' : 'Entraînement'}
                      </p>
                    </div>
                    <span className="text-xs text-gray-500">
                      {new Date(game.timestamp).toLocaleDateString('fr-FR')}
                    </span>
                  </div>
                  <div className="flex gap-4 text-sm">
                    <span className="text-gray-700">
                      <strong>{game.clicks}</strong> clics
                    </span>
                    <span className="text-gray-700">
                      <strong>{game.timeSeconds}</strong>s
                    </span>
                    <span className="text-gray-700">
                      Score: <strong>{game.score}</strong>
                    </span>
                  </div>
                  {game.path && game.path.length > 0 && (
                    <details className="mt-2">
                      <summary className="text-sm text-blue-600 cursor-pointer hover:underline">
                        Voir le parcours ({game.path.length} pages)
                      </summary>
                      <div className="mt-2 text-sm text-gray-600">
                        {game.path.join(' → ')}
                      </div>
                    </details>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
