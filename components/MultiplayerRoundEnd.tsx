import React, { useState, useEffect } from 'react';
import { Trophy, Home, ArrowRight } from 'lucide-react';
import { Button } from './Button';
import { LobbyState, User } from '../types';

interface MultiplayerRoundEndProps {
  lobby: LobbyState;
  currentUser: User | null;
  onNextRound: () => void;
  onLeave: () => void;
}

export const MultiplayerRoundEnd: React.FC<MultiplayerRoundEndProps> = ({
  lobby,
  currentUser,
  onNextRound,
  onLeave,
}) => {
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [countdown, setCountdown] = useState(30);

  const isCreator = currentUser?.uid === lobby.createdBy;
  const currentRound = lobby.currentRound || 1;
  const totalRounds = lobby.config?.numberOfRounds || 1;
  const hasMoreRounds = currentRound < totalRounds;

  // Winner information
  const winner = lobby.winnerId ? lobby.players[lobby.winnerId] : null;
  const winnerName = lobby.winnerName || winner?.displayName || 'Unknown';

  // Countdown timer for auto-start next round (only for creator)
  useEffect(() => {
    if (!isCreator || !hasMoreRounds) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onNextRound();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isCreator, hasMoreRounds, onNextRound]);

  const handleLeaveClick = () => {
    setShowLeaveModal(true);
  };

  const confirmLeave = () => {
    setShowLeaveModal(false);
    onLeave();
  };

  const cancelLeave = () => {
    setShowLeaveModal(false);
  };

  return (
    <>
      <div className="fixed inset-0 bg-gradient-to-br from-green-600 via-green-700 to-emerald-800 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-8">
          {/* Header with Trophy */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-4">
              <Trophy className="w-16 h-16 text-yellow-500" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {winnerName} a gagné !
            </h1>
            <p className="text-gray-600">
              Round {currentRound} / {totalRounds}
            </p>
          </div>

          {/* Winner Stats */}
          {winner && (
            <div className="mb-6">
              <div className="bg-gradient-to-r from-yellow-50 to-amber-50 border-2 border-yellow-300 rounded-lg p-6">
                <div className="flex items-center gap-4 mb-4">
                  {winner.photoURL ? (
                    <img
                      src={winner.photoURL}
                      alt={winner.displayName}
                      className="w-16 h-16 rounded-full border-4 border-yellow-400"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-yellow-400 flex items-center justify-center text-white font-bold text-2xl border-4 border-yellow-500">
                      {winner.displayName.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold text-gray-900">{winner.displayName}</h2>
                    <p className="text-sm text-gray-600">Vainqueur du round</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="bg-white rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-purple-600">{winner.clicks}</div>
                    <div className="text-xs text-gray-600">Clics</div>
                  </div>
                  <div className="bg-white rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {winner.finishTime && lobby.startedAt
                        ? Math.floor((winner.finishTime - lobby.startedAt) / 1000) + 's'
                        : '-'}
                    </div>
                    <div className="text-xs text-gray-600">Temps</div>
                  </div>
                </div>

                {/* Winner's Path */}
                {winner.history && winner.history.length > 0 && (
                  <div className="bg-white rounded-lg p-3">
                    <div className="text-xs font-semibold text-gray-700 mb-2">PARCOURS</div>
                    <div className="flex flex-wrap gap-2">
                      {winner.history.map((page, index) => (
                        <React.Fragment key={index}>
                          <span className="text-sm text-gray-800 bg-gray-100 px-2 py-1 rounded">
                            {page}
                          </span>
                          {index < winner.history.length - 1 && (
                            <ArrowRight className="w-4 h-4 text-gray-400 self-center" />
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* All Players Ranking */}
          <div className="mb-6">
            <h3 className="text-lg font-bold text-gray-900 mb-3">Classement</h3>
            <div className="space-y-2">
              {Object.entries(lobby.players)
                .sort(([, a], [, b]) => {
                  // Sort by finish time (winners first), then by clicks
                  if (a.finishTime && b.finishTime) {
                    return a.finishTime - b.finishTime;
                  }
                  if (a.finishTime) return -1;
                  if (b.finishTime) return 1;
                  return a.clicks - b.clicks;
                })
                .map(([playerId, player], index) => (
                  <div
                    key={playerId}
                    className={`flex items-center gap-3 p-3 rounded-lg ${
                      playerId === lobby.winnerId
                        ? 'bg-yellow-50 border-2 border-yellow-300'
                        : 'bg-gray-50 border border-gray-200'
                    }`}
                  >
                    <div className="text-lg font-bold text-gray-600 w-6">#{index + 1}</div>
                    {player.photoURL ? (
                      <img
                        src={player.photoURL}
                        alt={player.displayName}
                        className="w-10 h-10 rounded-full"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-purple-200 flex items-center justify-center text-purple-700 font-bold">
                        {player.displayName.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900">{player.displayName}</div>
                      <div className="text-xs text-gray-600">
                        {player.clicks} clics
                        {player.finishTime && lobby.startedAt && (
                          <> • {Math.floor((player.finishTime - lobby.startedAt) / 1000)}s</>
                        )}
                      </div>
                    </div>
                    {playerId === lobby.winnerId && (
                      <Trophy className="w-5 h-5 text-yellow-500" />
                    )}
                  </div>
                ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              onClick={handleLeaveClick}
              variant="ghost"
              className="flex items-center justify-center gap-2"
            >
              <Home className="w-5 h-5" />
              Quitter
            </Button>

            {isCreator && hasMoreRounds && (
              <Button
                onClick={onNextRound}
                className="flex-1 flex items-center justify-center gap-2"
              >
                Round suivant ({countdown}s)
              </Button>
            )}

            {!hasMoreRounds && (
              <div className="flex-1 text-center py-3 bg-gray-100 rounded-lg">
                <p className="text-gray-600 font-medium">Partie terminée</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Leave Confirmation Modal */}
      {showLeaveModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              Voulez-vous vraiment quitter le lobby ?
            </h3>
            <p className="text-gray-600 mb-6">
              Si vous quittez maintenant, vous ne pourrez pas continuer cette partie.
            </p>
            <div className="flex gap-3">
              <Button
                onClick={cancelLeave}
                variant="ghost"
                className="flex-1"
              >
                Annuler
              </Button>
              <Button
                onClick={confirmLeave}
                variant="danger"
                className="flex-1"
              >
                Quitter
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
